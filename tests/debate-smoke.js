'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const PORT=34019,BASE=`http://127.0.0.1:${PORT}`;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function api(pathname,token='',body,method=body?'POST':'GET'){
  const response=await fetch(BASE+pathname,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,...(await response.json())};
}
async function main(){
  const server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(PORT),HOST:'127.0.0.1',GEMINI_API_KEY:'',OPENAI_API_KEY:''},stdio:'ignore'});
  const users=[];
  try{
    let ready=false;
    for(let i=0;i<40;i++){try{ready=(await api('/api/health')).ok;if(ready)break;}catch{}await pause(100);}
    assert.ok(ready,'Server must start');
    for(let i=0;i<7;i++){const user=await api('/api/guest','',{nickname:'Debater '+(i+1)});assert.equal(user.status,201);users.push(user);}
    const [a,b,c,d,e,f,g]=users.map(x=>x.token);
    const cr=await api('/api/rooms',a,{topic:'Có nên cho phép sử dụng AI trong giờ học?',mode:'debate'});
    assert.equal(cr.status,201);const code=cr.room.code;
    assert.equal(cr.room.mode,'debate');assert.equal(cr.room.teamCounts.for,1);
    assert.equal((await api(`/api/rooms/${code}/start`,a,{seconds:15})).status,409);
    for(const [token,team] of [[b,'for'],[c,'for'],[d,'against'],[e,'against'],[f,'against']]){
      assert.equal((await api('/api/rooms/join',token,{code,team})).status,200);
    }
    assert.equal((await api('/api/rooms/join',g,{code})).status,409,'max 6 members');
    let data=await api(`/api/rooms/${code}`,a);
    assert.equal(data.room.members.length,6);assert.equal(data.room.teamCounts.for,3);assert.equal(data.room.teamCounts.against,3);
    assert.equal((await api(`/api/rooms/${code}/team`,b,{team:'against'})).status,409,'cannot overfill team');
    const start=await api(`/api/rooms/${code}/start`,a,{seconds:15,turnSeconds:45});
    assert.equal(start.room.stage,'prep');assert.equal(start.room.turnSeconds,45);
    assert.equal((await api(`/api/rooms/${code}/reveal`,a,{})).status,409,'all six need to present original argument');
    for(const token of [a,b,c,d,e,f])assert.equal((await api(`/api/rooms/${code}/position`,token,{text:'Quan điểm riêng của mình về AI: cần phải tự học và có dẫn chứng.'})).status,200);
    const hidden=await api(`/api/rooms/${code}`,b);
    assert.deepEqual(Object.keys(hidden.room.positions),[users[1].user.id],'preparation drafts private');
    data=await api(`/api/rooms/${code}/reveal`,a,{});
    assert.equal(data.status,200);assert.equal(data.room.stage,'discussion');assert.equal(data.room.turnTotal,6);
    const order=[users[0],users[3],users[1],users[4],users[2],users[5]].map(x=>x.user.id);
    assert.equal(data.room.activeSpeakerId,order[0]);
    assert.equal((await api(`/api/rooms/${code}/messages`,d,{kind:'argument',text:'Tôi nghĩ nên giới hạn AI'})).status,403);
    assert.equal((await api(`/api/rooms/${code}/messages`,a,{kind:'argument',text:'Tôi nghĩ cần sử dụng AI có trách nhiệm'})).status,200);
    const offer={type:'offer',sdp:'v=0\r\nmock=1'};
    assert.equal((await api(`/api/rooms/${code}/signal`,a,{to:users[3].user.id,type:'offer',payload:offer})).status,200);
    const received=await api(`/api/rooms/${code}/signals?after=0`,d);
    assert.equal(received.signals.length,1);assert.equal(received.signals[0].from,users[0].user.id);
    assert.equal((await api(`/api/rooms/${code}/signals?after=0`,b)).signals.length,0);
    assert.equal((await api(`/api/rooms/${code}/signals?after=0`,g)).status,403,'outsider cannot intercept WebRTC signaling');
    assert.equal((await api(`/api/rooms/${code}/signal`,a,{to:users[6].user.id,type:'offer',payload:offer})).status,403,'outsider cannot receive signal');
    for(let i=1;i<6;i++){
      data=await api(`/api/rooms/${code}/next`,a,{});
      assert.equal(data.room.activeSpeakerId,order[i],`turn ${i+1} follows speaker order`);
      assert.equal(data.room.turnNumber,i);
    }
    data=await api(`/api/rooms/${code}/next`,a,{});
    assert.equal(data.room.stage,'ended','after sixth turn final summary');
    console.log('✓ Debate 3v3: 6 seats, strict teams, private prep, 6 rotating turns, signal auth, finished room.');
  }finally{
    for(const u of users)try{await api('/api/me',u.token,undefined,'DELETE');}catch{}
    server.kill('SIGTERM');
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
