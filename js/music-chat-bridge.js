/* Whatever: music <-> canonical messages. Never stores a second chat history. */
(function (w) {
  'use strict';
  const pending = new Map();
  const sessions = new Map();
  const inProgress = new Map();
  let host = null;
  let lastId = 0;
  const esc = v => String(v ?? '').trim();
  const truncate = (v, n=1000) => esc(v).slice(0,n);
  const id = () => 'wm-' + Date.now().toString(36) + '-' + (++lastId);
  const time = () => {const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
  const activeIdentity = () => w.localStorage.getItem('whatever_messages_active_identity_v1') || 'self';
  const playerFrames = () => [...document.querySelectorAll('iframe[title="音乐"],iframe[title="Chérie Music"]')];
  const validSender = e => e.origin === w.location.origin && playerFrames().some(f=>f.contentWindow===e.source);
  const safeMusic = raw => {
    const s = raw && typeof raw === 'object' ? raw : {};
    return {
      songId: truncate(s.songId || s.id,90), title: truncate(s.title,160) || '未知歌曲',
      artist: truncate(s.artist,120), album: truncate(s.album,120), cover: truncate(s.cover,1000),
      position: Math.max(0,Math.min(36000,Number(s.position)||0)),
      duration: Math.max(0,Math.min(36000,Number(s.duration)||0)),
      lyric: truncate(s.lyric,220), context: truncate(s.context,1200),
      playlist: Array.isArray(s.playlist) ? s.playlist.slice(0,50).map(t=>({id:truncate(t.id,90),title:truncate(t.title,160),artist:truncate(t.artist,120)})) : []
    };
  };
  // If the contacts UI has not been opened yet, use its canonical persisted
  // identity thread directly. Never write a parallel "music" conversation.
  const CHAT_KEY = 'whatever_messages_contacts_v1';
  const CHATMAP_KEY = 'whatever_messages_chat_map_v2';
  const storageHost = {
    listContacts(){
      try {const a=JSON.parse(w.localStorage.getItem(CHAT_KEY)||'[]');return Array.isArray(a)?a:[];}
      catch{return [];}
    },
    getThread(contactId){
      const c=this.listContacts().find(x=>String(x.id)===String(contactId));
      return c?.threads?.[activeIdentity()] || (activeIdentity()==='self' ? c?.msgs : null) || [];
    },
    mutateContact(contactId,action){
      // If the messages app is visibly mounted but hook installation failed,
      // refuse rather than risk overwriting a newer in-memory conversation.
      if (document.querySelector('.messages-app')) throw Error('主聊天室适配器没有就绪，不能安全同步消息');
      const all=this.listContacts(),c=all.find(x=>String(x.id)===String(contactId));
      if(!c)throw Error('联系人不存在');
      c.threads=(c.threads&&typeof c.threads==='object')?c.threads:{};
      const who=activeIdentity();
      const list=Array.isArray(c.threads[who])?c.threads[who]:(who==='self'&&Array.isArray(c.msgs)?c.msgs:[]);
      c.threads[who]=list;
      action(c,list);
      c.time=time();
      w.localStorage.setItem(CHAT_KEY,JSON.stringify(all,(k,v)=>k==='msgs'?undefined:v));
      let map;
      try{map=JSON.parse(w.localStorage.getItem(CHATMAP_KEY)||'{}')||{};}catch{map={};}
      const ids=Array.isArray(map[who])?map[who].map(String):[];
      if(!ids.includes(String(contactId)))map[who]=[String(contactId),...ids];
      w.localStorage.setItem(CHATMAP_KEY,JSON.stringify(map));
      return c;
    }
  };
  function requireHost() {
    return host || storageHost;
  }
  function findContact(contactId) {
    const c = requireHost().listContacts().find(x=>String(x.id)===String(contactId));
    if (!c) throw Error('联系人已不存在，请重新选择');
    return c;
  }
  function thread(contactId){return requireHost().getThread(String(contactId));}
  function add(contactId, message) {
    const item={ id:id(), me:!!message.me, text:truncate(message.text,2400),
      ts:Date.now(), t:time(), ...message };
    requireHost().mutateContact(String(contactId), (_contact, messages)=>{
      if (!messages.some(x=>x.id===item.id)) messages.push(item);
    });
    return item;
  }
  function editInvite(contactId, messageId, status){
    const labels={accepted:'已接受',declined:'已婉拒',pending:'等待回应',ended:'已结束',error:'邀请待处理'};
    requireHost().mutateContact(String(contactId), (_contact, messages)=>{
      const m=messages.find(x=>x.id===messageId && x.music?.kind==='invite');
      if(!m)return;
      m.music.status=status;
      m.text='【一起听歌邀请】《'+m.music.title+'》'+(m.music.artist?' · '+m.music.artist:'')+'（'+(labels[status]||status)+'）';
    });
  }
  function serialize(contactId, job){
    const key=activeIdentity()+':'+contactId;
    const previous=inProgress.get(key)||Promise.resolve();
    const task=previous.catch(()=>{}).then(job);
    inProgress.set(key,task);
    task.finally(()=>{if(inProgress.get(key)===task)inProgress.delete(key);}).catch(()=>{});
    return task;
  }
  function musicContext(m){
    return [
      '【一起听歌场景】这是你与用户原聊天室的延续，不能忘记已有记忆、关系、角色卡、世界书或预设。请按照既有人设自然回应。',
      '当前正在播放：《'+m.title+'》'+(m.artist?'，歌手：'+m.artist:'')+(m.album?'，专辑：'+m.album:''),
      '歌曲播放进度：约'+Math.floor(m.position)+'秒'+(m.duration?' / '+Math.floor(m.duration)+'秒':''),
      m.lyric?'当前歌词：'+m.lyric:'没有可用的当前歌词。',
      m.context?'前后歌词：'+m.context:'',
      '音乐信息来自播放器元数据和歌词，并未进行真正音频声学识别；不能假装听到未提供的音色、节奏或编造歌词。',
      '不要每句都分析歌词；若歌词契合当前关系，可适当自然提起。'
    ].filter(Boolean).join('\n');
  }
  async function reply(contactId, m, purpose, extra=''){
    const c=findContact(contactId);
    if(!w.MessagesAPI?.isConfigured?.()) throw Error('请先在主聊天室的 API 设置中配置模型');
    const user=(()=>{try{return JSON.parse(w.localStorage.getItem('whatever_messages_me_v1')||'{}')}catch{return {}}})();
    w.MESSAGES_USER_NAME=user.name||'用户';
    w.MESSAGES_USER_PERSONA=user.persona||'';
    const snapshot={...c,msgs:thread(contactId).slice()};
    const instruction=[
      musicContext(m),
      purpose==='invite'?'用户向你发出了同听邀请。请结合人设决定；答应时首条台词必须以【接受邀请】开头，拒绝时以【婉拒邀请】开头，不要擅自跳过决定。':'请针对一起听中的真实互动回复，不要重复用户的话。',
      extra
    ].filter(Boolean).join('\n\n');
    const result=await w.MessagesAPI.replyFor(snapshot,instruction,purpose==='invite'?2:3,[]);
    const msgs=Array.from(result||[]).map(x=>typeof x==='string'?{text:x}:x)
      .filter(x=>x&&typeof x.text==='string'&&x.text.trim())
      .slice(0,5).map(x=>({text:truncate(x.text,2000),narr:!!x.narr,trans:truncate(x.trans,1200)}));
    if(!msgs.length)throw Error('AI 没有返回可用消息');
    return msgs;
  }
  const cleanPrefix=s=>s.replace(/^\s*【(?:接受邀请|婉拒邀请)】\s*/,'').trim();
  const responseFor = (contactId, music, parts, sessionId)=>{
    for(const p of parts){
      add(contactId,{me:false,text:cleanPrefix(p.text),narr:p.narr,trans:p.trans,music:{kind:'reply',sessionId,title:music.title,songId:music.songId}});
    }
    return parts.map(p=>cleanPrefix(p.text)).filter(Boolean);
  };
  async function invite(data){
    const contactId=String(data.contactId), mode=data.mode, music=safeMusic(data.music);
    return serialize(contactId,async ()=>{
      const c=findContact(contactId);
      if(!['direct','ask'].includes(mode))throw Error('邀请方式无效');
      const marker=add(contactId,{me:true,text:'【一起听歌邀请】《'+music.title+'》'+(music.artist?' · '+music.artist:'')+'（'+(mode==='ask'?'等待回应':'已接受')+'）',
        music:{kind:'invite',title:music.title,artist:music.artist,album:music.album,songId:music.songId,cover:music.cover,mode,status:mode==='ask'?'pending':'accepted'}});
      const session={id:id(),contactId,inviteId:marker.id,status:mode==='ask'?'pending':'accepted',identityId:activeIdentity(),music};
      sessions.set(contactId,session);
      if(mode==='direct')return {accepted:true,contact:{id:c.id,name:c.remark||c.name,avatar:c.avatar||''},sessionId:session.id,messages:[]};
      let parts;
      try{ parts=await reply(contactId,music,'invite'); }
      catch(error){ editInvite(contactId,marker.id,'error');throw error;}
      const first=parts[0].text;
      const accepted=/^\s*【接受邀请】/.test(first);
      const declined=/^\s*【婉拒邀请】/.test(first);
      const text=responseFor(contactId,music,parts,session.id);
      session.status=accepted?'accepted':declined?'declined':'pending';
      editInvite(contactId,marker.id,session.status);
      return {accepted,declined,contact:{id:c.id,name:c.remark||c.name,avatar:c.avatar||''},sessionId:session.id,messages:text};
    });
  }
  async function chat(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const s=sessions.get(contactId);
      if(!s||s.status!=='accepted'||s.identityId!==activeIdentity())throw Error('尚未与当前联系人开始一起听');
      const text=truncate(data.text,1800);
      if(!text)throw Error('消息不能为空');
      add(contactId,{me:true,text:'【一起听 · '+music.title+'】'+text,music:{kind:'chat',sessionId:s.id,title:music.title,songId:music.songId}});
      const parts=await reply(contactId,music,'chat');
      return {messages:responseFor(contactId,music,parts,s.id)};
    });
  }
  async function pick(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const s=sessions.get(contactId);
      if(!s||s.status!=='accepted'||s.identityId!==activeIdentity())throw Error('还没开始一起听');
      if(!music.playlist.length)throw Error('当前没有可选的歌曲列表');
      add(contactId,{me:true,text:'【一起听歌】你来选下一首吧。',music:{kind:'event',sessionId:s.id,title:music.title}});
      const valid=music.playlist.filter(t=>t.id);
      const parts=await reply(contactId,music,'pick','请从这份实际播放列表选一首，并严格以【选歌ID:歌曲ID】开头第一句话，再自然解释理由。不能编造ID：\n'+JSON.stringify(valid));
      const matched=parts[0].text.match(/^【选歌ID:([^】]+)】/);
      const track=matched&&valid.find(x=>x.id===matched[1].trim());
      if(!track)throw Error('Char 没选出列表里的歌曲');
      parts[0].text=parts[0].text.replace(/^【选歌ID:[^】]+】/,'').trim()||'我想听《'+track.title+'》。';
      return {songId:track.id,messages:responseFor(contactId,music,parts,s.id)};
    });
  }
  async function leave(data){
    const contactId=String(data.contactId);
    return serialize(contactId,async()=>{
      const s=sessions.get(contactId);
      if(!s)return {ok:true};
      if(s.identityId!==activeIdentity())return {ok:false};
      sessions.delete(contactId);
      editInvite(contactId,s.inviteId,'ended');
      add(contactId,{me:true,text:'【一起听歌】已结束同听',music:{kind:'event',sessionId:s.id,title:s.music.title}});
      return {ok:true};
    });
  }
  async function track(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const session=sessions.get(contactId);
      if(!session||session.status!=='accepted'||session.identityId!==activeIdentity())return {ok:false};
      if(session.music.songId===music.songId && session.music.title===music.title)return {ok:true};
      session.music=music;
      add(contactId,{me:true,text:'【一起听歌】切换到《'+music.title+'》'+(music.artist?' · '+music.artist:''),
        music:{kind:'event',sessionId:session.id,title:music.title,songId:music.songId}});
      return {ok:true};
    });
  }
  const handlers={
    contacts:async()=>({contacts:requireHost().listContacts().map(c=>({id:c.id,name:c.remark||c.name,avatar:c.avatar||''})).filter(c=>c.id&&c.name)}),
    invite,chat,pick,track,leave
  };
  w.addEventListener('message',async e=>{
    if(!validSender(e))return;
    const d=e.data;
    if(!d||d.type!=='whatever:music:request'||typeof d.id!=='string'||typeof d.action!=='string')return;
    try{
      const handler=handlers[d.action];
      if(!handler)throw Error('未知操作');
      const result=await handler(d.payload||{});
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:true,result},e.origin);
    }catch(error){
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:false,error:truncate(error?.message||'操作失败',240)},e.origin);
    }
  });
  // The existing chat room renders a *card* for typed invite messages, while the
  // original music chatPanel remains the sole music conversation window.
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('.wmc-song-card'))return;
    if(typeof w.openApp==='function')w.openApp('music');
  });
  const theme=document.createElement('style');
  theme.textContent=[
    '.wmc-song-card{width:min(255px,78vw);background:linear-gradient(145deg,#22212b,#34323d);color:white;border:1px solid #ffffff24;border-radius:16px;padding:16px;box-shadow:0 6px 24px #0003;cursor:pointer;line-height:1.55}',
    '.wmc-card-head{font-size:11px;color:#c5c1d4;letter-spacing:.08em;margin-bottom:12px}',
    '.wmc-card-title{font-weight:700;font-size:16px;overflow-wrap:anywhere}',
    '.wmc-card-artist{color:#aaa6b9;font-size:12px;margin-top:3px}',
    '.wmc-card-status{margin-top:13px;border-top:1px solid #ffffff30;padding-top:9px;font-size:12px;color:#ddd9eb}',
    '.wmc-card-row{margin:10px 0}.wmc-song-card:focus-visible{outline:2px solid #a5a0c6;outline-offset:3px}'
  ].join('\n');
  document.head.appendChild(theme);
  document.addEventListener('keydown',e=>{
    const card=e.target.closest?.('.wmc-song-card');
    if(card&&(e.key==='Enter'||e.key===' ')){
      e.preventDefault();if(typeof w.openApp==='function')w.openApp('music');
    }
  });
  w.WhateverMusicChatBridge=Object.freeze({
    registerHost(adapter){
      if(!adapter||!adapter.listContacts||!adapter.getThread||!adapter.mutateContact)throw Error('聊天室适配器不完整');
      host=adapter;
    },
    hasHost:()=>!!host,
    safeMusic
  });
})(window);