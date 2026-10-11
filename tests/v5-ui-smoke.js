'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const js=path.join(__dirname,'..','public','js');
const attached=[];
const app={innerHTML:'',querySelectorAll:()=>[]};
const document={
 querySelector:x=>x==='#app'?app:null,
 querySelectorAll:()=>[],
 getElementById:()=>null,
 addEventListener:()=>{},
 createElement:()=>({type:'',className:'',dataset:{},setAttribute(){},innerHTML:''})
};
const context=vm.createContext({console,Date,Math,Intl,URL,AbortController,
 window:{addEventListener(){},scrollTo(){}},document,
 localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
 location:{hash:'#/thought'},setTimeout(){},setInterval(){},
 navigator:{},Event:class Event{},
});
vm.runInContext('class RoomVoice {constructor(){}get status(){return {active:false,muted:false,connected:0,error:""}}stop(){}}',context);
vm.runInContext(fs.readFileSync(path.join(js,'catalog.js'),'utf8').replace(/export const /g,'var '),context);
vm.runInContext(fs.readFileSync(path.join(js,'app.js'),'utf8').replace(/^(import [^\n]+\n)+/,'').replace(/boot\(\);\s*$/,''),context);
const run=x=>vm.runInContext(x,context);
(async()=>{
 run("state.user={id:'tester',nickname:'Student',privacy:{saveHistory:true}};state.route='thought';");
 assert.match(run('thought()'),/CHỦ ĐỀ CỦA BẠN/);
 const first=run('state.thought.topicId');
 await run("onAction('think-random',{dataset:{}})");
 assert.notEqual(run('state.thought.topicId'),first,'random topic must avoid same topic');
 assert.ok(run('thought()').includes(run('thoughtTopic()')),'show selected topic in spotlight');
 run("state.thought.stage='prepare';state.thought.deadline=Date.now()+60000;");
 await run("onAction('think-skip',{dataset:{}})");
 assert.equal(run('state.thought.stage'),'countdown');
 assert.match(run('thought()'),/Sẵn sàng nói/);
 run("state.route='perspective';state.perspective.step=0;");
 assert.match(run('perspective()'),/perspective-original/);
 run("state.perspective.step=1;");
 assert.match(run('perspective()'),/name="counter"/);
 run(`state.perspective.step=2;state.perspective.reviewStatus='ready';state.perspective.review={mode:'guided',label:'Góp ý theo quy tắc',overview:'Review succeeded',strengths:[],improvements:[]};`);
 assert.match(run('perspective()'),/Review succeeded/);
 run("state.route='recall';state.entries=[{id:'note1',type:'thought',topic:'Học cách tư duy',original:'Tôi tin cần tự mình nghĩ trước.',revised:'Luôn tự nghĩ và dùng AI để kiểm chứng.',lesson:'Không phụ thuộc.'}];state.recallId='note1';state.recallStage='reveal';state.recallDraft='Mình tự nhớ được phương pháp học tốt.';state.recallReviewStatus='ready';state.recallReview={mode:'guided',label:'Góp ý',overview:'Recall review works',strengths:[],improvements:[]};");
 assert.match(run('recall()'),/Recall review works/);
 run("state.route='quests';state.questSelected=QUESTS[0].id;state.questReviewedId=QUESTS[0].id;state.questCompleted=true;state.questReflection='Mình đã thử đi gặp bạn bè thật.';state.questReviewStatus='ready';state.questReview={mode:'guided',label:'Góp ý',overview:'Quest review works',strengths:[],improvements:[]};");
 assert.match(run('quests()'),/Quest review works/);
 run("state.route='games';state.game={type:'relay',stage:'result',players:['A','B','C'],phrase:'Xin chào các bạn!',history:[{player:'A',text:'Xin chào tất cả'},{player:'B',text:'Chào bạn'}]};");
 assert.match(run('games()'),/data-form="game-reflect"/);
 run("state.game.reviewStatus='ready';state.game.reflection='Tôi học được cách nghe chính xác.';state.game.review={mode:'guided',label:'Góp ý',overview:'Game review works',strengths:[],improvements:[]};");
 assert.match(run('games()'),/Game review works/);
 const field={id:'',name:'reflection',type:'textarea',disabled:false,readOnly:false,
   matches:()=>false,closest:()=>null,getAttribute:()=>null,
   insertAdjacentElement(_where,btn){attached.push(btn);},value:'',};
 app.querySelectorAll=()=>[field];
 run('decorateDictationFields()');
 assert.ok(field.id.startsWith('voice-field-'),'missing form field gets mic target');
 assert.equal(attached.length,1);
 assert.equal(attached[0].dataset.action,'voice-toggle');
 console.log('✓ V5 frontend: random topic, skip-to-3-2-1, perspective/recall/quest/game review, automatic mic on free-form fields.');
})().catch(err=>{console.error(err);process.exitCode=1;});
