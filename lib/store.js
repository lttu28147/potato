'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
let db;
try { db = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
catch { db = { version: 1, users: {}, tokens: {}, entries: [], questLogs: [], focusLogs: [], rooms: {} }; }
for (const key of ['users','tokens','rooms']) db[key] ||= {};
for (const key of ['entries','questLogs','focusLogs']) db[key] ||= [];
let dirty = false;
function persist() {
  if (!dirty) return;
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, STORE_FILE);
  dirty = false;
}
function commit() { dirty = true; persist(); }
function id() { return crypto.randomUUID(); }
function token() { return crypto.randomBytes(32).toString('base64url'); }
function hash(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function newUser(nickname) {
  const user = { id:id(), nickname, values:[], createdAt:new Date().toISOString(), privacy: { saveHistory: true } };
  const t = token(); db.users[user.id] = user; db.tokens[hash(t)] = user.id; commit();
  return { token:t, user };
}
function findUser(t) {
  if (!t || typeof t !== 'string') return null;
  const uid = db.tokens[hash(t)];
  return uid ? db.users[uid] || null : null;
}
function userEntries(uid) { return db.entries.filter(x => x.userId === uid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
function userQuests(uid) { return db.questLogs.filter(x => x.userId === uid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); }
function userFocus(uid) { return db.focusLogs.filter(x => x.userId === uid); }
function stats(uid) {
  const entries=userEntries(uid), quests=userQuests(uid), focus=userFocus(uid);
  const days=new Set([...entries,...quests,...focus].map(x=>x.createdAt.slice(0,10)));
  let streak=0; let d=new Date(); d.setHours(0,0,0,0);
  if (!days.has(d.toISOString().slice(0,10))) d.setDate(d.getDate()-1);
  while(days.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1);}
  return { thoughts:entries.filter(e=>e.type==='thought').length, perspectives:entries.filter(e=>e.type==='perspective').length,
    speeches:entries.filter(e=>e.type==='speech').length, quests:quests.length,
    focusMinutes:focus.reduce((n,x)=>n+x.minutes,0), streak, days:days.size,
    recallCount:entries.reduce((n,x)=>n+(x.recall?.history?.length||0),0) };
}
function deleteUser(uid) {
  delete db.users[uid];
  for(const [k,v] of Object.entries(db.tokens)) if(v===uid) delete db.tokens[k];
  db.entries=db.entries.filter(x=>x.userId!==uid);
  db.questLogs=db.questLogs.filter(x=>x.userId!==uid);
  db.focusLogs=db.focusLogs.filter(x=>x.userId!==uid);
  for(const [code,room] of Object.entries(db.rooms)) {
    room.members=room.members.filter(x=>x!==uid);room.speakerIndex=Math.min(room.speakerIndex||0,Math.max(0,room.members.length-1));
    delete room.positions[uid];if(room.teams)delete room.teams[uid];
    room.messages=room.messages.filter(x=>x.userId!==uid).map(m=>({...m,votes:m.votes.filter(v=>v.by!==uid)}));
    if(!room.members.some(id=>!room.bots?.[id])) delete db.rooms[code];
    else if(room.hostId===uid) room.hostId=room.members.find(id=>!room.bots?.[id]);
  }
  commit();
}
module.exports={db,commit,id,newUser,findUser,userEntries,userQuests,userFocus,stats,deleteUser};
