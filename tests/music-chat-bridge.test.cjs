/* Run: node tests/music-chat-bridge.test.cjs
 * Tests the canonical chat bridge in isolation without exposing private assets.
 */
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../js/music-chat-bridge.js'),'utf8');
const store=new Map([
  ['whatever_messages_active_identity_v1','self'],
  ['whatever_messages_me_v1',JSON.stringify({name:'测试用户'})],
  ['whatever_messages_contacts_v1',JSON.stringify([{
    id:'alice',name:'阿星',persona:'安静、温柔但不油腻',
    memories:[{text:'一起散步的记忆'}],
    threads:{self:[{me:true,text:'旧消息',ts:1}],other:[{me:true,text:'其他身份的私聊',ts:2}]}
  }])]
]);
const frame={output:[],postMessage(message){this.output.push(message);}};
let onMessage;
const document={querySelectorAll(){return [{contentWindow:frame}];},addEventListener(){},head:{appendChild(){}},
  createElement(){return {textContent:'',className:'',addEventListener(){},setAttribute(){}}},querySelector(){return null}};
const window={location:{origin:'https://test.example'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  addEventListener(t,fn){if(t==='message')onMessage=fn},openApp(){}};
let summaries=0,contexts=[];
window.MessagesAPI={isConfigured:()=>true,async replyFor(c,instruction){
  contexts.push({history:c.msgs.map(x=>x.text),persona:c.persona,memories:c.memories,system:instruction});
  if(instruction.includes('用户向你发出了同听邀请'))return [{text:'【接受邀请】想听。'}];
  if(instruction.includes('请从这份实际播放列表'))return [{text:'【选歌ID:2】选这个吧'}];
  return [{text:'喜欢听你说这些。'}];
}};
vm.runInNewContext(code,{window,document});
let last=0;
async function request(action,payload){
  const id='test-'+(++last);
  await onMessage({origin:'https://test.example',source:frame,data:{type:'whatever:music:request',id,action,payload}});
  const response=frame.output.find(x=>x.id===id);
  assert.equal(response?.ok,true,JSON.stringify(response));
  return response.result;
}
window.WhateverMusicChatBridge.registerHost({
  listContacts:()=>JSON.parse(store.get('whatever_messages_contacts_v1')),
  getThread:()=>JSON.parse(store.get('whatever_messages_contacts_v1'))[0].threads.self,
  mutateContact:(id,fn)=>{
    const contacts=JSON.parse(store.get('whatever_messages_contacts_v1')),c=contacts.find(x=>x.id===id);
    const before=c.threads.self.length;
    fn(c,c.threads.self);
    if(c.threads.self.length>before)summaries++;
    store.set('whatever_messages_contacts_v1',JSON.stringify(contacts));
  }
});
(async()=>{
  const song={songId:'1',title:'试音曲',artist:'某歌手',lyric:'这一句歌词',position:75,playlist:[{id:'2',title:'另一首歌'}]};
  const invite=await request('invite',{contactId:'alice',mode:'ask',music:song});
  assert.equal(invite.accepted,true);
  // Sandboxed srcdoc music uses an opaque origin; only the exact registered frame may request data.
  const beforeOpaque=frame.output.length;
  await onMessage({origin:'null',source:frame,data:{type:'whatever:music:request',id:'opaque-test',action:'contacts',payload:{}}});
  assert.equal(frame.output.length,beforeOpaque+1);
  assert.equal(frame.output.at(-1).id,'opaque-test');
  const stranger={postMessage(){throw Error('An unrelated frame must never receive a reply')}};
  await onMessage({origin:'null',source:stranger,data:{type:'whatever:music:request',id:'stranger',action:'contacts',payload:{}}});
  assert.equal(frame.output.length,beforeOpaque+1);

  const reply=await request('chat',{contactId:'alice',text:'这一句你喜欢吗',music:song});
  assert.equal(reply.messages.length,1);
  const pick=await request('pick',{contactId:'alice',music:song});
  assert.equal(pick.songId,'2');
  await request('track',{contactId:'alice',music:{...song,songId:'2',title:'另一首歌'}});
  await request('leave',{contactId:'alice'});
  const saved=JSON.parse(store.get('whatever_messages_contacts_v1'))[0];
  assert.equal(saved.memories[0].text,'一起散步的记忆');
  assert.deepEqual(saved.threads.other,[{me:true,text:'其他身份的私聊',ts:2}]);
  assert.equal(saved.threads.self[0].text,'旧消息');
  assert.equal(saved.threads.self.find(x=>x.music?.kind==='invite').music.status,'ended');
  assert.ok(contexts.some(x=>x.system.includes('这一句歌词') && x.history.includes('旧消息')));
  assert.ok(summaries>=5);
  console.log('PASS: sandbox null origin + frame identity, invite, AI persona+memory+history, chat, song pick, track, shared persistence, leave');
})().catch(e=>{console.error(e);process.exitCode=1});