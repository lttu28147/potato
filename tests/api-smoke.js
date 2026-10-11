'use strict';
// Run with `npm test` while server is NOT already running on port 34017.
// Uses built-in Node assert/fetch, no npm dependencies.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const BASE='http://127.0.0.1:34017';
async function sleep(n){await new Promise(r=>setTimeout(r,n));}
async function call(p,{method='GET',token,body}={}){
  const res=await fetch(BASE+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const json=await res.json();return {status:res.status,...json};
}
async function main(){
  const server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:'34017',HOST:'127.0.0.1',GEMINI_API_KEY:'',OPENAI_API_KEY:''},stdio:'ignore'});
  let a,b;
  try{
    for(let i=0;i<45;i++){try{if((await call('/api/health')).ok)break;}catch{}await sleep(100);}
    a=await call('/api/guest',{method:'POST',body:{nickname:'Người thử A'}});
    b=await call('/api/guest',{method:'POST',body:{nickname:'Người thử B'}});
    assert.equal(a.status,201);assert.equal(b.status,201);
    const A=a.token,B=b.token;
    assert.equal((await call('/api/me',{token:A})).user.nickname,'Người thử A');
    const coach=await call('/api/coach',{method:'POST',token:A,body:{topic:'Có nên dùng AI khi học?',response:'Mình nghĩ rằng nên dùng AI để hiểu bài sâu hơn nhưng cần tự thử sức trước.'}});
    assert.equal(coach.mode,'guided');assert.equal(coach.questions.length,3);
    const ent=await call('/api/entries',{method:'POST',token:A,body:{type:'thought',topic:'Tự nghĩ trước',original:'Tôi nghĩ mình nên thử tự tìm câu trả lời đầu tiên rồi mới hỏi AI.',revised:'Tôi sẽ luyện cách kiểm chứng thông tin, đưa lý do và ví dụ rõ hơn.',lesson:'Tự suy nghĩ trước khi mở AI là một thói quen tốt.'}});
    assert.equal(ent.status,201);
    const reviewBody={topic:ent.entry.topic,original:ent.entry.original,revised:ent.entry.revised,lesson:ent.entry.lesson,entryId:ent.entry.id};
    const review=await call('/api/thought-review',{method:'POST',token:A,body:reviewBody});
    assert.equal(review.status,200);assert.equal(review.review.mode,'guided');
    assert.ok(review.review.improvements.length>=2);assert.ok(review.review.nextTry);
    const persisted=(await call('/api/me',{token:A})).entries.find(x=>x.id===ent.entry.id);
    assert.deepEqual(persisted.review,review.review,'Final review should persist in journal');
    const denied=await call('/api/thought-review',{method:'POST',token:B,body:reviewBody});
    assert.equal(denied.status,404,'Another user cannot overwrite the review');
    const invalid=await call('/api/thought-review',{method:'POST',token:A,body:{topic:reviewBody.topic,original:'too short',revised:reviewBody.revised}});
    assert.equal(invalid.status,400);
    const rec=await call(`/api/entries/${ent.entry.id}/recall`,{method:'POST',token:A,body:{answer:'Mình đã suy nghĩ trước khi hỏi AI.',rating:2}});
    assert.equal(rec.entry.recall.count,1);
    const focus=await call('/api/focus',{method:'POST',token:A,body:{minutes:1,intention:'Tự ôn lại bài vừa học'}});
    assert.equal(focus.status,201);
    const quest=await call('/api/quest-logs',{method:'POST',token:A,body:{questId:'quest-2',reflection:'Tôi thử tự giải bài và tìm được hai cách tiếp cận khác nhau.'}});
    assert.equal(quest.status,201);
    const room=await call('/api/rooms',{method:'POST',token:A,body:{topic:'Làm thế nào để học tập hiệu quả và tư duy độc lập?'}});
    assert.equal(room.status,201);const code=room.room.code;
    assert.equal((await call('/api/rooms/join',{method:'POST',token:B,body:{code}})).room.members.length,2);
    const eventResponse=await fetch(`${BASE}/api/rooms/${code}/events?token=${encodeURIComponent(B)}`);
    assert.equal(eventResponse.status,200);
    const reader=eventResponse.body.getReader();
    const welcome=await reader.read();assert.ok(new TextDecoder().decode(welcome.value).includes('event: connected'));
    assert.equal((await call(`/api/rooms/${code}/start`,{method:'POST',token:A,body:{seconds:30}})).room.stage,'prep');
    const changed=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('SSE timed out')),2000))]);
    assert.ok(new TextDecoder().decode(changed.value).includes('event: change'),'Room SSE broadcasts should work');
    await reader.cancel();
    assert.equal((await call(`/api/rooms/${code}/position`,{method:'POST',token:A,body:{text:'Mình nghĩ cần tự giải quyết bài học ít nhất 15 phút trước khi dùng AI.'}})).status,200);
    const hidden=await call(`/api/rooms/${code}`,{token:B});
    assert.ok(!hidden.room.positions[a.user.id],'Position must remain hidden before reveal');
    await call(`/api/rooms/${code}/position`,{method:'POST',token:B,body:{text:'Mình nghĩ AI hữu ích nếu ta có khả năng kiểm chứng và hỏi lại.'}});
    const revealed=await call(`/api/rooms/${code}/reveal`,{method:'POST',token:A});
    assert.equal(Object.keys(revealed.room.positions).length,2);
    const msg=await call(`/api/rooms/${code}/messages`,{method:'POST',token:B,body:{kind:'question',text:'Làm sao để phân biệt trợ giúp và lệ thuộc AI?'}});
    const mid=msg.room.messages[0].id;
    assert.equal((await call(`/api/rooms/${code}/vote`,{method:'POST',token:A,body:{messageId:mid,tag:'insight'}})).room.scores[0].score,1);
    const repeatVote=await call(`/api/rooms/${code}/vote`,{method:'POST',token:A,body:{messageId:mid,tag:'listen'}});
    assert.equal(repeatVote.status,409);
    assert.equal((await call(`/api/rooms/${code}/end`,{method:'POST',token:A})).room.stage,'ended');
    const exported=await call('/api/export',{token:A});assert.equal(exported.stats.quests,1);assert.equal(exported.stats.thoughts,1);
    assert.equal((await call('/api/me',{method:'DELETE',token:A})).ok,true);
    assert.equal((await call('/api/me',{method:'DELETE',token:B})).ok,true);
    assert.equal((await call('/api/me',{token:A})).status,401);
    console.log('✓ 25+ kiểm tra API (có tổng kết AI, lưu lịch sử và phân quyền): đăng nhập khách, phản biện, nhật ký, ôn tập, thử thách, focus, room, riêng tư, điểm, xuất/xóa dữ liệu.');
  }finally{
    try{if(a?.token)await call('/api/me',{method:'DELETE',token:a.token});}catch{}
    try{if(b?.token)await call('/api/me',{method:'DELETE',token:b.token});}catch{}
    server.kill('SIGTERM');
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
