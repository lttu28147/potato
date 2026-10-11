'use strict';
// Exercise the timer + automatic speech handoff without a real microphone/browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','public','js');
let granted=0,started=0;const page={innerHTML:''};
const elements={
  'think-original':{value:'',dispatchEvent(){}},
  'think-revised':{value:'',dispatchEvent(){}},
};
class FakeSpeechRecognition{
  start(){started++;this.onresult?.({results:[[{transcript:'Tôi nghĩ AI có thể giúp sinh viên học tốt hơn nếu chúng ta tự thử nghĩ và đưa ra lý do cùng dẫn chứng trước.'}]]});}
  stop(){this.onend?.();}
}
const context=vm.createContext({
  console,Date,Math,Intl,URL,AbortController,Event:class Event{},
  navigator:{mediaDevices:{getUserMedia:async()=>{granted++;return {getTracks:()=>[{stop(){}}]};}}},
  window:{SpeechRecognition:FakeSpeechRecognition,addEventListener(){},scrollTo(){}},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  document:{querySelector(sel){if(sel==='#app')return page;return null;},getElementById(id){return elements[id]||null;},addEventListener(){}},
  setInterval(){},setTimeout(){},
  history:{},location:{hash:'#/thought'},
});
vm.runInContext(`class RoomVoice{constructor(){}get status(){return {active:false,muted:false,connected:0,error:'',supported:true}}stop(){}}`,context);
vm.runInContext(fs.readFileSync(path.join(root,'catalog.js'),'utf8').replace(/export const /g,'var '),context);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/^(import [^\n]+\n)+/,'').replace(/boot\(\);\s*$/,'');
vm.runInContext(source,context);
(async()=>{
  await vm.runInContext(`(async()=>{state.user={id:'test',nickname:'Test',privacy:{saveHistory:true}};state.route='thought';state.thought.duration=15;state.thought.speakDuration=45;await onAction('think-start',{dataset:{}});return state.thought.stage;})()`,context);
  assert.equal(granted,1,'Microphone permission requested BEFORE countdown');
  assert.equal(vm.runInContext('state.thought.stage',context),'prepare');
  vm.runInContext('state.thought.deadline=Date.now()-1;tick();',context);
  assert.equal(vm.runInContext('state.thought.stage',context),'countdown','automatic switch from thought prep');
  vm.runInContext('state.thought.deadline=Date.now()-1;tick();',context);
  assert.equal(vm.runInContext('state.thought.stage',context),'speak','automatic 3-2-1 to speech');
  assert.equal(started,1,'Speech Recognition starts automatically');
  assert.ok(vm.runInContext('state.thought.original.length',context)>20,'Speech transcript captured');
  vm.runInContext('state.thought.deadline=Date.now()-1;tick();',context);
  assert.equal(vm.runInContext('state.thought.stage',context),'captured','speaking deadline stops speech automatically');
  console.log('✓ Thinking countdown → 3-2-1 → speech timer + auto mic → end, including advance permission.');
})().catch(err=>{console.error(err);process.exitCode=1;});
