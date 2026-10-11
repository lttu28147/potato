'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const store=require('./lib/store');
const {coach,reviewThought,reviewActivity}=require('./lib/ai');

// Dependency-free Node HTTP server. Persistent data stays in data/store.json.
// Set HOST=0.0.0.0 only on a trusted network; add auth, TLS and database before public hosting.
const envFile=path.join(__dirname,'.env');
if(fs.existsSync(envFile)){
  for(const raw of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const idx=line.indexOf('=');if(idx<1)continue;
    const k=line.slice(0,idx).trim(),v=line.slice(idx+1).trim().replace(/^(['"])(.*)\1$/,'$2');
    if(!process.env[k])process.env[k]=v;
  }
}
const PORT=Number(process.env.PORT)||3000,HOST=process.env.HOST||'127.0.0.1';
const PUBLIC=path.join(__dirname,'public');
const ALLOWED_STATIC=new Map([
  ['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],
  ['/js/app.js','js/app.js'],['/js/catalog.js','js/catalog.js'],['/js/room-voice.js','js/room-voice.js'],['/js/file-reader.js','js/file-reader.js'],
  ['/favicon.svg','favicon.svg'],['/manifest.webmanifest','manifest.webmanifest']
]);
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const streams=new Map();const recentRequests=new Map();
// Short-lived WebRTC signaling is memory-only; audio itself is peer-to-peer, never stored here.
const roomSignals=new Map();
const now=()=>new Date().toISOString();
function send(res,status,obj,headers={}){
  if(res.writableEnded)return;
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(JSON.stringify(obj));
}
function fail(status,message){const err=new Error(message);err.status=status;throw err;}
function requireUser(req){
  const auth=req.headers.authorization||'';
  const user=store.findUser(auth.startsWith('Bearer ')?auth.slice(7):'');
  if(!user) fail(401,'Phiên đăng nhập chưa tồn tại. Hãy tạo hồ sơ mới.');return user;
}
function str(value,max=4000){return typeof value==='string'?value.trim().slice(0,max):'';}
function asArray(x,max=5){return Array.isArray(x)?x.filter(v=>typeof v==='string').slice(0,max).map(v=>str(v,80)):[];}
function parseBody(req){
  return new Promise((resolve,reject)=>{
    let buf='',length=0;
    req.on('data',b=>{
      length+=b.length;if(length>60000){reject(Object.assign(new Error('Dữ liệu vượt quá giới hạn 60 KB.'),{status:413}));req.destroy();return;}
      buf+=b;
    });
    req.on('end',()=>{try{resolve(buf?JSON.parse(buf):{});}catch{reject(Object.assign(new Error('JSON không hợp lệ.'),{status:400}));}});
    req.on('error',reject);
  });
}
function checkRate(req){
  const ip=req.socket.remoteAddress||'local',n=Date.now(),key=ip+':'+req.method;
  const entry=recentRequests.get(key)||{start:n,count:0};
  if(n-entry.start>60000){entry.start=n;entry.count=0;}
  entry.count++;recentRequests.set(key,entry);
  if(entry.count>180)fail(429,'Thao tác quá nhanh, vui lòng chờ một chút.');
  if(recentRequests.size>5000)for(const [k,v] of recentRequests)if(n-v.start>60000)recentRequests.delete(k);
}
function viewMe(user){return {user,entries:store.userEntries(user.id),questLogs:store.userQuests(user.id),focusLogs:store.userFocus(user.id),stats:store.stats(user.id)};}
function memberLabel(uid,room){return room?.bots?.[uid]?.nickname||store.db.users[uid]?.nickname||'Người chơi';}
const isBot=(room,uid)=>Boolean(room.bots?.[uid]);
const roomMode=room=>room.mode==='debate'?'debate':'circle';
const memberTeam=(room,id)=>room.teams?.[id]||null;
// Bot thực hành: các câu trả lời theo quy tắc, KHÔNG phải người dùng thật hoặc giọng nói AI.
const BOT_NAMES=['Khoai Mơ','Khoai Lý','Khoai Nâu','Khoai Sáng','Khoai Bình','Khoai Xanh','Khoai Vui','Khoai Mộc','Khoai Nếp','Khoai An','Khoai Đố'];
function addPracticeBots(room,count){
  room.bots||={};room.teams||={};
  const max=roomMode(room)==='debate'?6:12;
  for(let i=0;i<count&&room.members.length<max;i++){
    const uid='bot-'+crypto.randomUUID();
    const sequence=Object.keys(room.bots).length;
    const used=new Set(Object.values(room.bots).map(b=>b.nickname));
    const nickname=BOT_NAMES.find(x=>!used.has(x))||`Khoai Bot ${sequence+1}`;
    let team=null;
    if(roomMode(room)==='debate'){
      const support=room.members.filter(id=>room.teams[id]==='for').length;
      const oppose=room.members.filter(id=>room.teams[id]==='against').length;
      team=support<=oppose?'for':'against';
      if(support>=3)team='against';if(oppose>=3)team='for';
      room.teams[uid]=team;
    }
    room.bots[uid]={nickname,team,ordinal:sequence};room.members.push(uid);
  }
}
function botPosition(room,uid){
  const info=room.bots[uid],support=room.teams?.[uid]==='for';
  const angle=support?'ủng hộ':'phản đối';
  const reason=support?'có thể mở ra cơ hội phát triển và khuyến khích chủ động':
    'có thể tạo rủi ro nếu thiếu giới hạn hoặc không xét đến từng hoàn cảnh';
  return `Tôi tạm đứng ở phía ${angle} với chủ đề “${room.topic}”. Theo tôi, vấn đề này ${reason}. Chúng ta nên đưa ví dụ cụ thể, xác định ai chịu tác động và thử xét một ngoại lệ trước khi kết luận.`;
}
function botArgument(room,uid){
  const bot=room.bots[uid],idx=room.speakerIndex||0,pro=room.teams?.[uid]==='for';
  const reason=pro?[
    'Điểm có lợi là nó có thể giúp người học chủ động thử những giải pháp mới.',
    'Tôi muốn nhấn mạnh một tình huống: khi có sự hướng dẫn, lợi ích có thể đến từ việc người tham gia tự thử và tự đánh giá.',
    'Tôi nghiêng về ủng hộ có điều kiện, miễn là chúng ta có tiêu chí đánh giá và không bỏ qua rủi ro.'
  ]:[
    'Tôi lo rằng nếu làm theo một cách máy móc, chúng ta có thể bỏ qua nhu cầu của từng người.',
    'Một phản ví dụ cần cân nhắc là khi người tham gia không có đủ điều kiện hoặc sự hỗ trợ để lựa chọn.',
    'Tôi nghiêng về phản đối nếu chưa có biện pháp kiểm chứng hiệu quả và giới hạn các hệ quả ngoài ý muốn.'
  ];
  const point=reason[Math.min(2,Math.floor(idx/2))];
  return `Về chủ đề “${room.topic}”, tôi đại diện cho phe ${pro?'ủng hộ':'phản đối'}. ${point} Phía còn lại có thể trả lời: chúng ta sẽ đo kết quả như thế nào?`;
}
function botSpeak(room){
  if(room.stage!=='discussion')return;
  const order=roomMode(room)==='debate'?debateOrder(room):room.members;
  const uid=order[room.speakerIndex||0];
  const key=`${room.speakerIndex||0}:${uid}`;
  room.botTurnsDone||={};
  if(!uid||!isBot(room,uid)||room.botTurnsDone[key])return;
  room.botTurnsDone[key]=true;
  room.messages.push({id:store.id(),userId:uid,kind:'argument',text:botArgument(room,uid),createdAt:now(),votes:[]});
}
function botAnswer(room,fromUid,question){
  if(room.stage!=='discussion'||room.messages.length>=245)return;
  const botId=room.members.find(id=>isBot(room,id)&&id!==fromUid);
  if(!botId)return;
  const line=str(question,160).replace(/[?!。]+$/,'');
  const side=room.teams?.[botId]==='for'?'ủng hộ':room.teams?.[botId]==='against'?'phản đối':'xem xét';
  const text=`Mình hiểu câu hỏi của bạn về “${line}”. Là bot thử nghiệm ở góc nhìn ${side}, mình cho rằng cần có một ví dụ cụ thể, kiểm tra lợi ích và rủi ro của giải pháp. Bạn muốn kiểm chứng điểm nào trước?`;
  room.messages.push({id:store.id(),userId:botId,kind:'reply',text,createdAt:now(),votes:[]});
}
function botQuestion(room,fromUid){
  // One follow-up for each human argument, without pretending that a bot assessed truth.
  if(room.stage!=='discussion'||room.messages.length>=245||!room.members.some(uid=>isBot(room,uid)))return;
  const botId=room.members.find(id=>isBot(room,id)&&id!==fromUid);
  if(!botId)return;
  const messages=room.messages.filter(m=>m.userId===fromUid&&!isBot(room,m.userId));
  if(!messages.length)return;
  const choices=[
    'Bạn có thể cho một ví dụ thực tế để người nghe dễ hình dung không?',
    'Điều kiện nào sẽ khiến lập luận này không còn đúng?',
    'Bạn dựa vào dấu hiệu nào để kiểm chứng kết luận đó?',
    'Bạn có thể nhắc lại ý mạnh nhất của phía đối lập trước khi phản bác không?'
  ];
  room.messages.push({id:store.id(),userId:botId,kind:'question',text:choices[(messages.length-1)%choices.length],createdAt:now(),votes:[]});
}
const debateOrder=room=>{
  const supporters=room.members.filter(id=>memberTeam(room,id)==='for');
  const opposers=room.members.filter(id=>memberTeam(room,id)==='against');
  return supporters.flatMap((id,i)=>[id,opposers[i]].filter(Boolean));
};
function roomView(room,viewerId){
  const isDebate=roomMode(room)==='debate';
  const order=isDebate?debateOrder(room):room.members;
  const speaker=room.stage==='discussion'?order[room.speakerIndex||0]:null;
  const teamCounts=isDebate?{for:room.members.filter(id=>memberTeam(room,id)==='for').length,against:room.members.filter(id=>memberTeam(room,id)==='against').length}:null;
  return {code:room.code,topic:room.topic,mode:roomMode(room),teams:room.teams||{},teamCounts,stage:room.stage,hostId:room.hostId,viewerId,createdAt:room.createdAt,deadline:room.deadline||null,
    turnSeconds:room.turnSeconds||75,turnDeadline:room.turnDeadline||null,turnNumber:room.speakerIndex||0,turnTotal:isDebate?6:room.members.length,
    activeSpeakerId:speaker,activeSpeakerName:speaker?memberLabel(speaker,room):null,speakerIndex:room.speakerIndex||0,
    members:room.members.map(id=>({id,nickname:memberLabel(id,room),isHost:room.hostId===id,submitted:!!room.positions[id],team:memberTeam(room,id),isBot:isBot(room,id)})),
    positions:Object.fromEntries(Object.entries(room.positions).filter(([id])=>room.stage==='discussion'||room.stage==='ended'||id===viewerId).map(([id,text])=>[id,{nickname:memberLabel(id,room),text}])),
    messages:room.messages.map(m=>({id:m.id,userId:m.userId,nickname:memberLabel(m.userId,room),isBot:isBot(room,m.userId),kind:m.kind,text:m.text,createdAt:m.createdAt,votes:m.votes.length,voters:m.votes.filter(v=>v.by===viewerId).map(v=>v.tag)})),
    scores:room.members.map(id=>({id,nickname:memberLabel(id,room),isBot:isBot(room,id),team:memberTeam(room,id),score:room.messages.filter(m=>m.userId===id).reduce((n,m)=>n+m.votes.length,0)})).sort((a,b)=>b.score-a.score)
  };
}
function roomSignal(code,from,to,type,payload){
  let log=roomSignals.get(code);if(!log){log={serial:0,items:[]};roomSignals.set(code,log);}
  log.items.push({seq:++log.serial,from,to,type,payload,at:Date.now()});
  const cutoff=Date.now()-90000;
  log.items=log.items.filter(x=>x.at>=cutoff).slice(-700);
}

function broadcast(code){
  const set=streams.get(code);if(!set)return;
  for(const res of set){try{res.write(`event: change\ndata: ${JSON.stringify({code,updatedAt:Date.now()})}\n\n`);}catch{set.delete(res);}}
}
function getRoom(code,uid){
  const room=store.db.rooms[code?.toUpperCase()];
  if(!room)fail(404,'Không tìm thấy phòng. Hãy kiểm tra lại mã.');
  if(!room.members.includes(uid))fail(403,'Bạn chưa tham gia phòng này.');
  return room;
}
function requireHost(room,uid){if(room.hostId!==uid)fail(403,'Chỉ quản trò mới được thao tác bước này.');}
function makeCode(){
  let code;const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  do{code=Array.from({length:6},()=>abc[crypto.randomInt(abc.length)]).join('');}while(store.db.rooms[code]);
  return code;
}
function createEntry(user,body){
  if(!user.privacy.saveHistory)fail(409,'Bạn đang tắt lưu lịch sử. Bật lại trong Dữ liệu của tôi để ghi nhật ký.');
  const type=str(body.type,30);
  if(!['thought','perspective','speech'].includes(type))fail(400,'Loại bài tập không hợp lệ.');
  const topic=str(body.topic,280),original=str(body.original,7000),revised=str(body.revised,7000);
  if(!topic||original.length<10)fail(400,'Hãy nhập chủ đề và ít nhất 10 ký tự tự suy nghĩ.');
  const entry={id:store.id(),userId:user.id,type,topic,original,revised,lesson:str(body.lesson,1600),
    action:str(body.action,1000),questions:asArray(body.questions,4),metrics:body.metrics&&typeof body.metrics==='object'?{
      words:Math.max(0,Math.min(10000,Number(body.metrics.words)||0)),wpm:Math.max(0,Math.min(400,Number(body.metrics.wpm)||0)),
      fillers:Math.max(0,Math.min(3000,Number(body.metrics.fillers)||0)),durationSeconds:Math.max(0,Math.min(3600,Number(body.metrics.durationSeconds)||0))}:null,
    createdAt:now(), recall:{count:0,nextAt:new Date(Date.now()+24*3600*1000).toISOString(),history:[]}};
  store.db.entries.push(entry);store.commit();return entry;
}
async function api(req,res,u){
  const pathname=u.pathname,method=req.method;
  checkRate(req);
  if(pathname==='/api/health'&&method==='GET')return send(res,200,{ok:true,service:'POTATO',time:now()});
  if(pathname==='/api/config'&&method==='GET')return send(res,200,{aiConnected:!!(process.env.OPENAI_API_KEY||process.env.GEMINI_API_KEY),provider:process.env.GEMINI_API_KEY?'Gemini':process.env.OPENAI_API_KEY?'OpenAI':null});
  if(pathname==='/api/guest'&&method==='POST'){
    const b=await parseBody(req),nickname=str(b.nickname,35).replace(/[<>]/g,'');
    if(nickname.length<2)fail(400,'Tên hiển thị cần ít nhất 2 ký tự.');
    return send(res,201,store.newUser(nickname));
  }
  const user=requireUser(req),uid=user.id;
  if(pathname==='/api/me'&&method==='GET')return send(res,200,viewMe(user));
  if(pathname==='/api/me'&&method==='PATCH'){
    const b=await parseBody(req);
    if('nickname' in b){const name=str(b.nickname,35);if(name.length<2)fail(400,'Tên cần ít nhất 2 ký tự.');user.nickname=name;}
    if('values' in b)user.values=asArray(b.values,5);
    if('saveHistory' in b)user.privacy.saveHistory=!!b.saveHistory;
    store.commit();return send(res,200,{user});
  }
  if(pathname==='/api/me'&&method==='DELETE'){store.deleteUser(uid);return send(res,200,{ok:true});}
  if(pathname==='/api/export'&&method==='GET')return send(res,200,{exportedAt:now(),...viewMe(user)});
  if(pathname==='/api/entries'&&method==='GET')return send(res,200,{entries:store.userEntries(uid)});
  if(pathname==='/api/entries'&&method==='POST')return send(res,201,{entry:createEntry(user,await parseBody(req))});
  const entryMatch=pathname.match(/^\/api\/entries\/([a-f0-9-]+)(?:\/(recall))?$/);
  if(entryMatch){
    const entry=store.db.entries.find(x=>x.id===entryMatch[1]&&x.userId===uid);
    if(!entry)fail(404,'Bản ghi không tồn tại.');
    if(method==='DELETE'&&!entryMatch[2]){store.db.entries=store.db.entries.filter(x=>x!==entry);store.commit();return send(res,200,{ok:true});}
    if(method==='POST'&&entryMatch[2]==='recall'){
      const b=await parseBody(req),answer=str(b.answer,3000),rating=Number(b.rating);
      if(answer.length<3||![1,2,3].includes(rating))fail(400,'Vui lòng trả lời và chọn mức độ nhớ.');
      entry.recall ||= {count:0,history:[]};entry.recall.history||=[];
      entry.recall.count++;entry.recall.history.push({at:now(),answer,rating});
      const gap=[1,3,7,14,30][Math.min(entry.recall.count-1,4)];
      const multiplier=rating===1?1:rating===2?gap:gap*2;
      entry.recall.nextAt=new Date(Date.now()+multiplier*24*3600*1000).toISOString();
      store.commit();return send(res,200,{entry});
    }
  }
  if(pathname==='/api/coach'&&method==='POST'){
    const b=await parseBody(req),topic=str(b.topic,300),response=str(b.response,5000),mode=str(b.mode,30);
    if(topic.length<3||response.length<15)fail(400,'Hãy hoàn thành câu trả lời của riêng bạn trước khi nhận gợi ý.');
    return send(res,200,await coach(topic,response,mode));
  }
  if(pathname==='/api/thought-review'&&method==='POST'){
    const b=await parseBody(req),topic=str(b.topic,300),original=str(b.original,7000),revised=str(b.revised,7000),lesson=str(b.lesson,1600);
    if(topic.length<3||original.length<20||revised.length<20)fail(400,'Cần chủ đề và hai phiên bản bài nói dài ít nhất 20 ký tự để nhận xét.');
    let entry=null;
    if(b.entryId){
      entry=store.db.entries.find(x=>x.id===b.entryId&&x.userId===uid&&x.type==='thought');
      if(!entry)fail(404,'Bản ghi không tồn tại hoặc không thuộc về bạn.');
      if(entry.topic!==topic||entry.original!==original||entry.revised!==revised)fail(409,'Nội dung đã khác bản ghi. Hãy tải lại bài tập.');
    }
    const review=await reviewThought(topic,original,revised,lesson);
    if(entry){entry.review=review;store.commit();}
    return send(res,200,{review});
  }
  if(pathname==='/api/activity-review'&&method==='POST'){
    const b=await parseBody(req),type=str(b.type,30),topic=str(b.topic,300),original=str(b.original,7000),revised=str(b.revised,7000),lesson=str(b.lesson,1600);
    if(!['speech','perspective','recall','quest','game'].includes(type))fail(400,'Loại luyện tập không hợp lệ.');
    if(topic.length<3||original.length<(['quest','recall','game'].includes(type)?10:20)||(type==='perspective'&&revised.length<20))fail(400,'Hãy hoàn thành bài nói hoặc hai góc nhìn trước khi nhận xét.');
    let entry=null;
    if(b.entryId){
      entry=store.db.entries.find(x=>x.id===b.entryId&&x.userId===uid&&x.type===type);
      if(!entry)fail(404,'Bài luyện không tồn tại hoặc không thuộc bạn.');
      if(type==='perspective'&&(!entry.original.endsWith(original)||!entry.revised.endsWith(revised)))fail(409,'Nội dung khác bài đã lưu.');
    }
    const review=await reviewActivity(type,topic,original,revised,lesson);
    if(entry){entry.review=review;store.commit();}
    return send(res,200,{review});
  }
  if(pathname==='/api/quest-logs'&&method==='POST'){
    const b=await parseBody(req),questId=str(b.questId,80),reflection=str(b.reflection,1500);
    if(!/^quest-\d+$/.test(questId)||reflection.length<15)fail(400,'Hãy chọn một nhiệm vụ và mô tả trải nghiệm (ít nhất 15 ký tự).');
    const record={id:store.id(),userId:uid,questId,reflection,createdAt:now()};store.db.questLogs.push(record);store.commit();return send(res,201,{record});
  }
  if(pathname==='/api/focus'&&method==='POST'){
    const b=await parseBody(req),minutes=Number(b.minutes),intention=str(b.intention,300);
    if(!Number.isFinite(minutes)||minutes<0.1||minutes>120)fail(400,'Thời lượng tập trung không hợp lệ.');
    const record={id:store.id(),userId:uid,minutes:Math.round(minutes*10)/10,intention,createdAt:now()};
    store.db.focusLogs.push(record);store.commit();return send(res,201,{record});
  }
  if(pathname==='/api/rooms'&&method==='GET'){
    const rooms=Object.values(store.db.rooms).filter(r=>r.members.includes(uid)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>({code:r.code,topic:r.topic,mode:roomMode(r),stage:r.stage,count:r.members.length}));
    return send(res,200,{rooms});
  }
  if(pathname==='/api/rooms'&&method==='POST'){
    const b=await parseBody(req),topic=str(b.topic,280),mode=b.mode==='debate'?'debate':'circle';
    if(topic.length<5)fail(400,'Chủ đề cần ít nhất 5 ký tự.');
    const code=makeCode(),room={code,topic,mode,teams:mode==='debate'?{[uid]:'for'}:{},bots:{},hostId:uid,members:[uid],positions:{},messages:[],stage:'lobby',deadline:null,speakerIndex:0,turnSeconds:75,createdAt:now()};
    store.db.rooms[code]=room;store.commit();return send(res,201,{room:roomView(room,uid)});
  }
  if(pathname==='/api/rooms/join'&&method==='POST'){
    const b=await parseBody(req),code=str(b.code,8).toUpperCase(),room=store.db.rooms[code];
    if(!room)fail(404,'Mã phòng không tồn tại.');
    if(!room.members.includes(uid)){
      if(room.stage!=='lobby')fail(409,'Phòng đã bắt đầu, hiện không nhận thành viên mới.');
      if(room.members.length>=(roomMode(room)==='debate'?6:12))fail(409,'Phòng đã đủ thành viên.');
      if(roomMode(room)==='debate'){
        const forCount=room.members.filter(id=>memberTeam(room,id)==='for').length;
        const againstCount=room.members.filter(id=>memberTeam(room,id)==='against').length;
        const team=b.team==='for'||b.team==='against'?b.team:(forCount<=againstCount?'for':'against');
        if(room.members.filter(id=>memberTeam(room,id)===team).length>=3)fail(409,'Phe này đã đủ 3 thành viên. Hãy chọn phe còn lại.');
        room.teams||={};room.teams[uid]=team;
      }
      room.members.push(uid);store.commit();broadcast(code);
    }
    return send(res,200,{room:roomView(room,uid)});
  }
  const match=pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/([\w-]+))?$/);
  if(match){
    const code=match[1],action=match[2]||'',room=getRoom(code,uid);
    if(!action&&method==='GET')return send(res,200,{room:roomView(room,uid)});
    if(action==='signals'&&method==='GET'){
      const after=Math.max(0,Number(u.searchParams.get('after'))||0);
      const log=roomSignals.get(code)||{serial:0,items:[]};
      return send(res,200,{latest:log.serial,signals:log.items.filter(x=>x.seq>after&&x.to===uid).slice(-80)});
    }
    if(action==='events'&&method==='GET'){
      // EventSource cannot attach Authorization; request is authenticated via query token here.
      // In this branch the Bearer header check above already ran; see early handling below.
      return fail(400,'Dùng kết nối sự kiện qua query token.');
    }
    if(method==='POST'){
      const b=await parseBody(req);
      if(action==='review'){
        if(room.stage!=='ended')fail(409,'Kết thúc phòng để nhận tổng kết trước.');
        const position=room.positions[uid]||'';
        const contributions=room.messages.filter(m=>m.userId===uid).map(m=>`${m.kind==='question'?'Câu hỏi':m.kind==='reply'?'Phản hồi':'Lập luận'}: ${m.text}`).join('\n').slice(0,7000);
        const team=memberTeam(room,uid);
        const reflection=roomMode(room)==='debate'?`Phe ${team==='for'?'ủng hộ':'phản đối'}. Nhận xét kỹ năng lập luận, đặt câu hỏi và lắng nghe; không xác định phe thắng.`:'Thảo luận vòng tròn. Không so sánh năng lực giữa người chơi.';
        const review=await reviewActivity('room',room.topic,position||'Người chơi chưa gửi quan điểm ban đầu.',contributions||'Người chơi chưa gửi lời phản hồi bằng chữ.',reflection);
        return send(res,200,{review});
      }
      if(action==='bots'){
        requireHost(room,uid);
        if(room.stage!=='lobby')fail(409,'Chỉ thêm bot khi chưa bắt đầu.');
        const count=Math.min(12,Math.max(1,Math.floor(Number(b.count)||1)));
        addPracticeBots(room,count);
      }else if(action==='bots-remove'){
        requireHost(room,uid);
        if(room.stage!=='lobby')fail(409,'Chỉ xóa bot khi chưa bắt đầu.');
        const botId=str(b.botId,100);
        if(!isBot(room,botId))fail(404,'Không tìm thấy bot.');
        room.members=room.members.filter(x=>x!==botId);delete room.teams[botId];delete room.bots[botId];
        delete room.positions[botId];
      }else if(action==='leave'){
        room.members=room.members.filter(x=>x!==uid);delete room.positions[uid];if(room.teams)delete room.teams[uid];room.speakerIndex=Math.min(room.speakerIndex||0,Math.max(0,room.members.length-1));
        if(!room.members.some(id=>!isBot(room,id))){delete store.db.rooms[code];roomSignals.delete(code);}
        else if(room.hostId===uid)room.hostId=room.members.find(id=>!isBot(room,id));
        store.commit();broadcast(code);return send(res,200,{ok:true});
      }else if(action==='signal'){
        if(room.stage==='ended')fail(409,'Phòng đã kết thúc.');
        const to=str(b.to,100),type=str(b.type,20);
        if(!room.members.includes(to)||to===uid)fail(403,'Người nhận không trong phòng.');
        if(!['offer','answer','candidate','bye'].includes(type))fail(400,'Tín hiệu không hợp lệ.');
        const payload=b.payload;
        if(JSON.stringify(payload??null).length>12000)fail(413,'Tín hiệu âm thanh quá dài.');
        roomSignal(code,uid,to,type,payload);return send(res,200,{ok:true});
      }else if(action==='team'){
        if(roomMode(room)!=='debate'||room.stage!=='lobby')fail(409,'Chỉ đổi phe trong phòng debate trước khi bắt đầu.');
        const team=b.team==='for'||b.team==='against'?b.team:'';
        if(!team)fail(400,'Phe không hợp lệ.');
        if(room.members.filter(id=>id!==uid&&memberTeam(room,id)===team).length>=3)fail(409,'Phe này đã đủ 3 người.');
        room.teams||={};room.teams[uid]=team;
      }else if(action==='start'){
        requireHost(room,uid);if(room.stage!=='lobby')fail(409,'Phòng đã bắt đầu.');
        if(roomMode(room)==='debate'){
          if(room.members.length!==6||room.members.filter(id=>memberTeam(room,id)==='for').length!==3||room.members.filter(id=>memberTeam(room,id)==='against').length!==3)fail(409,'Debate cần đúng 3 người ủng hộ và 3 người phản đối.');
          room.turnSeconds=Math.max(30,Math.min(180,Number(b.turnSeconds)||75));
        }else if(room.members.length<2)fail(409,'Thảo luận vòng tròn cần ít nhất 2 người.');
        room.stage='prep';room.deadline=Date.now()+Math.max(15,Math.min(900,Number(b.seconds)||90))*1000;
        for(const botId of room.members.filter(id=>isBot(room,id)))room.positions[botId]=botPosition(room,botId);
      }else if(action==='position'){
        if(room.stage!=='prep')fail(409,'Chỉ nộp quan điểm trong giai đoạn chuẩn bị.');
        const pos=str(b.text,2500);if(pos.length<15)fail(400,'Hãy tự viết quan điểm tối thiểu 15 ký tự.');
        room.positions[uid]=pos;
      }else if(action==='reveal'){
        requireHost(room,uid);if(room.stage!=='prep')fail(409,'Phòng chưa ở giai đoạn chuẩn bị.');
        if(roomMode(room)==='debate'){if(room.members.some(id=>!room.positions[id]))fail(409,'Cả 6 thành viên phải nộp quan điểm nguyên bản.');}
        else if(Object.keys(room.positions).length<2)fail(409,'Cần ít nhất 2 người nộp quan điểm trước khi thảo luận.');
        if(Date.now()<room.deadline&&Object.keys(room.positions).length<room.members.length)fail(409,'Vẫn còn thời gian chuẩn bị; hãy chờ hết giờ hoặc tất cả thành viên nộp bài.');
        room.stage='discussion';room.deadline=null;room.speakerIndex=0;room.botTurnsDone={};room.turnDeadline=roomMode(room)==='debate'?Date.now()+room.turnSeconds*1000:null;botSpeak(room);
      }else if(action==='messages'){
        if(room.stage!=='discussion')fail(409,'Chỉ gửi ý kiến trong giai đoạn thảo luận.');
        if(!room.positions[uid])fail(409,'Hãy nộp quan điểm nguyên bản trước khi thảo luận.');
        const content=str(b.text,2000),kind=str(b.kind,30);
        if(content.length<5)fail(400,'Nội dung cần ít nhất 5 ký tự.');
        if(!['argument','question','reply'].includes(kind))fail(400,'Loại tin nhắn không hợp lệ.');
        const speaker=roomMode(room)==='debate'?debateOrder(room)[room.speakerIndex||0]:room.members[room.speakerIndex||0];
        if(kind==='argument'&&uid!==speaker)fail(403,'Chờ đến lượt bạn thuyết trình. Hiện bạn có thể đặt câu hỏi.');
        if(kind==='question'&&uid===speaker)fail(403,'Người đang thuyết trình chưa thể tự đặt câu hỏi. Hãy chọn Lập luận hoặc Phản hồi.');
        if(room.messages.length>=250)fail(409,'Phòng đã đạt giới hạn 250 lượt trao đổi.');
        room.messages.push({id:store.id(),userId:uid,kind,text:content,createdAt:now(),votes:[]});
        if(!isBot(room,uid)&&kind==='argument')botQuestion(room,uid);
        if(!isBot(room,uid)&&kind==='question')botAnswer(room,uid,content);
      }else if(action==='vote'){
        if(room.stage!=='discussion')fail(409,'Chỉ đánh giá trong lúc thảo luận.');
        const msg=room.messages.find(x=>x.id===b.messageId),tag=str(b.tag,30);
        if(!msg)fail(404,'Không tìm thấy lượt trao đổi.');
        if(msg.userId===uid)fail(403,'Không thể tự đánh giá lượt của mình.');
        if(isBot(room,msg.userId))fail(409,'Bot mô phỏng không được tính vào hệ thống ghi nhận điểm.');
        if(!['logic','listen','insight'].includes(tag))fail(400,'Tiêu chí không hợp lệ.');
        if(msg.votes.some(v=>v.by===uid))fail(409,'Bạn đã đánh giá lượt trao đổi này.');
        msg.votes.push({by:uid,tag});
      }else if(action==='next'){
        requireHost(room,uid);if(room.stage!=='discussion')fail(409,'Chỉ đổi lượt khi đang thảo luận.');
        if(roomMode(room)==='debate'){
          if(room.speakerIndex>=5){room.stage='ended';room.turnDeadline=null;}
          else {room.speakerIndex++;room.turnDeadline=Date.now()+room.turnSeconds*1000;botSpeak(room);}
        }else {room.speakerIndex=((room.speakerIndex||0)+1)%room.members.length;botSpeak(room);}
      }else if(action==='end'){
        requireHost(room,uid);if(room.stage!=='discussion')fail(409,'Phòng chưa bắt đầu thảo luận.');
        room.stage='ended';room.deadline=null;room.turnDeadline=null;
      }else fail(404,'Không tìm thấy thao tác.');
      store.commit();broadcast(code);return send(res,200,{room:roomView(room,uid)});
    }
  }
  return fail(404,'Không tìm thấy chức năng này.');
}
function serveStatic(req,res,pathname){
  const rel=ALLOWED_STATIC.get(pathname)||(!pathname.startsWith('/api/')&&!path.extname(pathname)?'index.html':null);
  if(!rel){res.writeHead(404);res.end('Not found');return;}
  const full=path.join(PUBLIC,rel);
  fs.readFile(full,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':MIMES[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
    res.end(data);
  });
}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(u.pathname.match(/^\/api\/rooms\/[A-Z2-9]{6}\/events$/)&&req.method==='GET'){
    const code=u.pathname.split('/')[3],token=u.searchParams.get('token');
    const user=store.findUser(token),room=store.db.rooms[code];
    if(!user||!room||!room.members.includes(user.id))return send(res,401,{error:'Không có quyền theo dõi phòng.'});
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write('event: connected\ndata: {}\n\n');
    if(!streams.has(code))streams.set(code,new Set());streams.get(code).add(res);
    const heartbeat=setInterval(()=>{try{res.write(': heartbeat\n\n');}catch{}},20000);
    res.on('close',()=>{clearInterval(heartbeat);const set=streams.get(code);set?.delete(res);if(set&&!set.size)streams.delete(code);});
    return;
  }
  if(!u.pathname.startsWith('/api/'))return serveStatic(req,res,u.pathname);
  try{await api(req,res,u);}catch(err){
    const code=err.status||500;
    if(code>=500)console.error('[API ERROR]',err);
    if(!res.writableEnded)send(res,code,{error:code>=500?'Hệ thống gặp lỗi. Vui lòng thử lại.':err.message});
  }
});
server.listen(PORT,HOST,()=>{
  console.log(`\n  POTATO - Suy nghĩ trước, công nghệ sau\n  Local: http://localhost:${PORT}\n  Lưu trữ: data/store.json\n  AI: ${process.env.GEMINI_API_KEY?'Gemini':process.env.OPENAI_API_KEY?'OpenAI':'Gợi hỏi mẫu (không cần API)'}\n`);
});

server.on('error',err=>{
  if(err.code==='EADDRINUSE'){
    console.error(`\n[POTATO] Cổng ${PORT} đang được một ứng dụng khác sử dụng.`);
    console.error('Hãy tắt cửa sổ CMD của website cũ bằng Ctrl + C, rồi chạy lại.');
    console.error('Hoặc chạy trong CMD: set PORT=3001   rồi   node server.js');
    console.error('Sau đó mở: http://localhost:3001\n');
    process.exitCode=1;
  }else{console.error('[POTATO] Không khởi động được server:',err);process.exitCode=1;}
});
