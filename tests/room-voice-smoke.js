'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','public/js/room-voice.js'),'utf8').replace('export class RoomVoice','class RoomVoice');
let streams=0;const tracks=[];const pushes=[];let activePeers=[];
class PC {
  constructor(){this.connectionState='new';this.signalingState='stable';this.remoteDescription=null;this.localDescription=null;this.closed=false;activePeers.push(this);}
  addTrack(track){this.localTrack=track;}
  async createOffer(){return {type:'offer',sdp:'mock-offer'};}
  async createAnswer(){return {type:'answer',sdp:'mock-answer'};}
  async setLocalDescription(x){this.localDescription={...x,toJSON(){return x}};this.signalingState=x.type==='offer'?'have-local-offer':'stable';}
  async setRemoteDescription(x){this.remoteDescription=x;this.signalingState='stable';}
  async addIceCandidate(){}
  close(){this.closed=true;}
}
const ctx=vm.createContext({
  window:{RTCPeerConnection:PC},
  navigator:{mediaDevices:{getUserMedia:async()=>{
    streams++;const track={enabled:true,readyState:'live',stop(){this.readyState='ended';}};tracks.push(track);
    return {getTracks(){return [track]},getAudioTracks(){return [track]}};
  }}},
  document:{getElementById(){return null;},createElement(){return {appendChild(){}}},body:{appendChild(){}}},
  RTCPeerConnection:PC,RTCSessionDescription:class{},RTCIceCandidate:class{},
  setInterval(){return 123},clearInterval(){},console,Date,Map,Set,Promise,MediaStream:class{},
});
vm.runInContext(source+'\nglobalThis.RoomVoice=RoomVoice;',ctx);
(async()=>{
  const req=async(url,body)=>{if(url.endsWith('/signal'))pushes.push(body);return {signals:[],latest:0};};
  ctx.testReq=req;
  const room={code:'AABBCC',viewerId:'a',mode:'debate',stage:'lobby',members:[{id:'a'},{id:'b'}]};
  const voice=vm.runInContext('new RoomVoice(testReq)',ctx);
  assert.equal(await voice.requestPermission(),true);
  assert.equal(streams,1);await voice.enter(room);
  assert.equal(voice.active,true);assert.equal(activePeers.length,1);assert.equal(pushes[0].type,'offer');
  await voice.sync({...room,stage:'prep'});
  assert.equal(tracks[0].enabled,false,'Debate prep automatically silences mic');
  assert.equal(voice.status.locked,true);
  await voice.sync({...room,stage:'discussion',activeSpeakerId:'b'});
  assert.equal(tracks[0].enabled,false,'Non-speaker remains muted');
  await voice.sync({...room,stage:'discussion',activeSpeakerId:'a'});
  assert.equal(tracks[0].enabled,true,'Current speaker auto-unmutes without new permission');
  voice.toggleMute();assert.equal(tracks[0].enabled,false);
  voice.stop();assert.equal(tracks[0].readyState,'ended');
  assert.ok(activePeers.every(p=>p.closed));
  console.log('✓ WebRTC room: permission at entry, offer signaling, prep/turn mic lock, mute, cleanup.');
})().catch(err=>{console.error(err);process.exitCode=1;});
