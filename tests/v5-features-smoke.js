'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const PORT=34145,BASE=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(p,token='',body,method=body?'POST':'GET'){
 const res=await fetch(BASE+p,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:res.status,...await res.json()};
}
async function main(){
 const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(PORT),HOST:'127.0.0.1',GEMINI_API_KEY:'',OPENAI_API_KEY:''},stdio:'ignore'});
 const tokens=[];
 try{
  let ready=false;for(let i=0;i<70;i++){try{ready=(await api('/api/health')).ok;if(ready)break;}catch{}await sleep(75);}assert.ok(ready);
  for(const name of ['Người quản trò','Khách thử']){const x=await api('/api/guest','',{nickname:name});tokens.push(x.token);}
  const [host,guest]=tokens;
  const cr=await api('/api/rooms',host,{topic:'AI nên được dùng để học tập như thế nào?',mode:'debate'});
  assert.equal(cr.status,201);const code=cr.room.code;
  assert.equal((await api(`/api/rooms/${code}/bots`,guest,{count:5})).status,403,'only host can add bots');
  let r=await api(`/api/rooms/${code}/bots`,host,{count:5});
  assert.equal(r.status,200);assert.equal(r.room.members.length,6);assert.equal(r.room.members.filter(m=>m.isBot).length,5);
  assert.equal(r.room.teamCounts.for,3);assert.equal(r.room.teamCounts.against,3);
  assert.equal((await api(`/api/rooms/${code}/bots`,host,{count:1})).room.members.length,6,'cap at 6');
  const bot=r.room.members.find(m=>m.isBot);r=await api(`/api/rooms/${code}/bots-remove`,host,{botId:bot.id});assert.equal(r.room.members.length,5);
  r=await api(`/api/rooms/${code}/bots`,host,{count:1});assert.equal(r.room.members.length,6);
  r=await api(`/api/rooms/${code}/start`,host,{seconds:15,turnSeconds:45});assert.equal(r.room.stage,'prep');
  assert.equal(r.room.members.filter(m=>m.isBot&&m.submitted).length,5,'bots auto prepare');
  assert.deepEqual(Object.keys(r.room.positions),[],'bot positions hidden before reveal');
  await api(`/api/rooms/${code}/position`,host,{text:'Tôi tin rằng AI có thể giúp nếu chúng ta tự thử giải quyết bài tập trước khi dùng AI.'});
  r=await api(`/api/rooms/${code}/reveal`,host,{});assert.equal(r.room.stage,'discussion');
  assert.equal(r.room.activeSpeakerId,r.room.viewerId,'human hosts begins');
  r=await api(`/api/rooms/${code}/messages`,host,{kind:'argument',text:'Theo tôi cần chủ động học và kiểm tra kết quả AI thay vì sao chép.'});
  assert.equal(r.room.messages.filter(m=>m.isBot&&m.kind==='question').length,1,'practice bot asks question');
  r=await api(`/api/rooms/${code}/next`,host,{});
  assert.equal(r.room.turnNumber,1);assert.ok(r.room.messages.some(m=>m.isBot&&m.kind==='argument'),'bot speaks on its turn');
  r=await api(`/api/rooms/${code}/messages`,host,{kind:'question',text:'Các bạn sẽ kiểm chứng chất lượng học tập bằng thước đo nào?'});
  assert.ok(r.room.messages.some(m=>m.isBot&&m.kind==='reply'),'bot responds when user asks a question');
  const botMessage=r.room.messages.find(m=>m.isBot);
  assert.equal((await api(`/api/rooms/${code}/vote`,host,{messageId:botMessage.id,tag:'insight'})).status,409,'bots cannot get votes');
  for(let i=2;i<=6;i++)r=await api(`/api/rooms/${code}/next`,host,{});
  assert.equal(r.room.stage,'ended');
  const roomReview=await api(`/api/rooms/${code}/review`,host,{});
  assert.equal(roomReview.status,200);assert.equal(roomReview.review.mode,'guided');assert.ok(roomReview.review.improvements.length>=2);
  const perspective=await api('/api/activity-review',host,{type:'perspective',topic:'Góc nhìn về AI',original:'Tôi cho rằng AI hỗ trợ việc học nếu được dùng đúng cách và có kiểm chứng.',revised:'Phe kia lo ngại rằng AI sẽ làm sinh viên phụ thuộc nếu sao chép thụ động.',lesson:'Mình thấy cần quy định cân bằng.'});
  assert.equal(perspective.status,200);assert.equal(perspective.review.mode,'guided');
  const speech=await api('/api/activity-review',host,{type:'speech',topic:'Luyện diễn thuyết',original:'Xin chào các bạn. Hôm nay tôi muốn nêu ba lý do sử dụng trí tuệ nhân tạo trong học tập.',revised:''});
  assert.equal(speech.status,200);assert.equal(speech.review.mode,'guided');
  const recall=await api('/api/activity-review',host,{type:'recall',topic:'Dùng AI để học như thế nào?',original:'Tôi nhớ bài nói cần tự suy nghĩ và kiểm chứng nguồn.',revised:'Bài ghi nói về việc tự suy nghĩ trước khi dùng AI, đưa bằng chứng và thảo luận với bạn học.'});
  assert.equal(recall.status,200);assert.equal(recall.review.mode,'guided');
  const quest=await api('/api/activity-review',host,{type:'quest',topic:'Thử thách nói chuyện trực tiếp',original:'Tôi đã thử nói chuyện với bạn bè và thấy dễ lắng nghe hơn.',revised:'Trò chuyện trực tiếp không dùng điện thoại.'});
  assert.equal(quest.status,200);assert.equal(quest.review.mode,'guided');
  const game=await api('/api/activity-review',host,{type:'game',topic:'Tam sao thất bản',original:'Lúc chơi tôi nhận thấy lời truyền có thêm chi tiết không xuất hiện ban đầu.',revised:'Câu gốc và nhiều bản truyền đã được lưu.'});
  assert.equal(game.status,200);assert.equal(game.review.mode,'guided');
  assert.equal((await api('/api/activity-review',guest,{type:'wrong',topic:'bad',original:'something'})).status,400);
  console.log('✓ POTATO V5: debate 1 human + 5 bots, host authorization, bot turn, synthetic question, review room/perspective/speech/recall/quest/game.');
 }finally{for(const token of tokens){try{await api('/api/me',token,undefined,'DELETE');}catch{}}child.kill('SIGTERM');}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
