/* Whatever: music keeps its OWN per-session conversation inside the contact's
 * existing COMMON MEMORY. Only an invite card appears in main chat. */
(function (w) {
  'use strict';
  const migrated = new Set();
  const sessions = new Map();
  const inProgress = new Map();
  let host = null;
  let lastId = 0;
  const esc = v => String(v ?? '').trim();
  const truncate = (v, n=1000) => esc(v).slice(0,n);
  const id = () => 'wm-' + Date.now().toString(36) + '-' + (++lastId);
  const time = () => {const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
  const activeIdentity = () => w.localStorage.getItem('whatever_messages_active_identity_v1') || 'self';
  const sessionKey = contactId => activeIdentity()+':'+contactId;
  const avatarSource = value => {
    const raw=esc(value);
    const source=raw || 'assets/聊天默认头像/chartouxiang.jpg';
    if (/^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml);/i.test(source) || /^blob:/i.test(source)) return source;
    try {
      const url=new URL(source,w.location.href);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    }catch{return '';}
  };
  // Select the actual music iframe by its exact WindowProxy. The private
  // app-manager has used more than one frame title across versions; relying
  // only on title="音乐" left invitations without a response.
  const playerFrames = () => {
    const appWindow = document.getElementById('appWindow') || document.querySelector('.app-window');
    const content = appWindow?.querySelector('.app-content');
    const windowTitle = document.getElementById('appTitle')?.textContent || '';
    const byTitle = frame => /音乐|music|ch[ée]rie/i.test([
      frame.getAttribute('title')||'', frame.getAttribute('data-app')||'',
      frame.getAttribute('src')||'', frame.id||''
    ].join(' '));
    if (content) {
      const frames = Array.from(content.querySelectorAll('iframe'));
      if (frames.length === 1 && /音乐|music|ch[ée]rie/i.test(windowTitle)) return frames;
      return frames.filter(byTitle);
    }
    return Array.from(document.querySelectorAll('iframe')).filter(byTitle);
  };
  // The private music app may run inside a sandboxed srcdoc iframe whose
  // browser origin is literally "null".  Trust only the currently mounted
  // music iframe's exact WindowProxy, never arbitrary opaque-origin frames.
  const validSender = e => (e.origin===w.location.origin||e.origin==='null')
    && playerFrames().some(f=>f.contentWindow===e.source);
  const responseOrigin = e => e.origin==='null'?'*':e.origin;
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
      try {
        const raw=w.localStorage.getItem(CHAT_KEY);
        const a=JSON.parse(raw||'[]');
        if (!Array.isArray(a)) throw Error('联系人存储格式不是列表');
        return a;
      } catch(error) {
        throw Error('联系人存储读取失败：'+String(error?.message||error));
      }
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
    // initMessagesModule is recreated whenever Chat opens. Its CONTACTS
    // closure becomes stale when switching back to Music. The current
    // persisted contacts/threads are canonical while Chat is unmounted.
    const liveChat = !!document.querySelector('.messages-app');
    return liveChat && host ? host : storageHost;
  }
  function listContacts(){
    let live = [];
    let stored = [];
    try { if (host && document.querySelector('.messages-app')) {
      const x = host.listContacts(); if (Array.isArray(x)) live = x;
    }} catch(error){ console.warn('[Music Chat] live contacts unavailable', error?.message); }
    let storageError = null;
    try {stored=storageHost.listContacts();}
    catch(error){storageError=error;console.warn('[Music Chat] stored contacts unavailable',error?.message);}
    if(!live.length && storageError)throw storageError;
    const selected = live.length ? live : stored;
    return selected
      .filter(c=>c && typeof c==='object' && c.id!=null && (c.remark||c.name))
      .map(c=>({id:String(c.id),name:truncate(c.remark||c.name,120),avatar:avatarSource(c.avatar)}));
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
  // One session -> one folded COMMON MEMORY entry (never individual room messages).
  // Stored in the same canonical contact model as existing memories, with the
  // original identity annotated to avoid mixing different user personas.
  function writeEpisode(contactId, session, entry) {
    requireHost().mutateContact(contactId,(c, messages)=>{
      c.memories=Array.isArray(c.memories)?c.memories:[];
      let m=c.memories.find(x=>x.kind==='music-listen'&&x.sessionId===session.id&&x.identityId===session.identityId);
      if(!m){
        m={id:id(),sessionId:session.id,identityId:session.identityId,
          kind:'music-listen',sec:'common',level:'mid',priority:5,
          label:new Date().toLocaleString('zh-CN',{hour12:false}),
          title:session.music.title,artist:session.music.artist,
          text:'与{{char}}一起听《'+session.music.title+'》'+(session.music.artist?'（'+session.music.artist+'）':''),
          chatLog:[],keys:['一起听歌',session.music.title],
          startedAt:Date.now(),endedAt:null};
        c.memories.unshift(m);
      }
      if(entry){
        // The episode is the single source of truth for both replay and AI
        // context; every message is saved before a model request starts.
        if(m.chatLog.length>=1200)throw Error('同听记录已达本地存储上限，请结束本次同听并新建会话');
        m.chatLog.push({me:!!entry.me,text:truncate(entry.text,2000),ts:Date.now(),
          title:truncate(entry.title||session.music.title,160),type:entry.type||'chat'});
      }
      if(session.music.title)m.title=session.music.title;
      if(session.music.artist)m.artist=session.music.artist;
      const n=m.chatLog.length;
      if(!m.endedAt)m.text='与{{char}}一起听《'+m.title+'》'+(m.artist?'（'+m.artist+'）':'')+'，同听交流 '+n+' 条';
      if(session.status==='ended')m.endedAt=Date.now();
    });
  }
  function episodeContext(contactId,session){
    if(!session)return '';
    const c=findContact(contactId);
    const m=(c.memories||[]).find(x=>x.kind==='music-listen'&&x.sessionId===session.id&&x.identityId===session.identityId);
    const log=Array.isArray(m?.chatLog)?m.chatLog:[];
    const recent=log.slice(-45).map(x=>(x.type==='event'?'【切歌／事件】':x.me?'用户：':'Char：')+x.text).join('\n');
    return '【这一次一起听的独立对话记录，按时间顺序】\n'+
      (recent||'刚开始一起听，尚无对话')+
      '\n这些对话属于当前一起听场景，不应重复写进主聊天室。之前的主聊天室和共同记忆仍然有效。';
  }
  // Full transcript is persisted first, so summarizer failures never lose data.
  async function summarizeEpisode(contactId,session){
    if(!w.MessagesAPI?.isConfigured?.()||typeof w.MessagesAPI.complete!=='function')return;
    const c=findContact(contactId);
    const entry=(c.memories||[]).find(x=>x.kind==='music-listen'&&x.sessionId===session.id&&x.identityId===session.identityId);
    if(!entry||!Array.isArray(entry.chatLog)||entry.chatLog.length<2)return;
    const log=entry.chatLog.slice(-120).map(x=>(x.me?'{{user}}':'{{char}}')+'：'+x.text).join('\n').slice(-14000);
    try {
      const raw=await w.MessagesAPI.complete(
        '你是共同记忆整理器。只基于下面实际发生的同听对话，写一段60到180字的中文记忆总结，描述听过的歌曲、互动、情绪及关系变化。不要编造事件，不要提系统提示词。人物称呼只用{{user}}和{{char}}，不输出JSON。',
        '一起听：《'+session.music.title+'》\n'+log
      );
      const summary=truncate(raw,700);
      if(!summary||activeIdentity()!==session.identityId)return;
      requireHost().mutateContact(contactId,(contact)=>{
        const m=(contact.memories||[]).find(x=>x.kind==='music-listen'&&x.sessionId===session.id&&x.identityId===session.identityId);
        if(m)m.text=summary;
      });
    }catch(error){console.warn('[Music Memory] Recap unavailable; full transcript retained',error?.message);}
  }
  // Migrate only old music-tagged messages, preserving normal room messages.
  // Called via the canonical host so the snapshot is persisted atomically.
  function migrateLegacy(contactId) {
    const key=sessionKey(contactId);
    if(migrated.has(key))return;
    const service=requireHost();
    const c=service.listContacts().find(x=>String(x.id)===String(contactId));
    if(!c)return;
    const old=service.getThread(contactId).filter(m=>m.music&&['chat','reply','event'].includes(m.music.kind));
    if(!old.length){migrated.add(key);return;}
    service.mutateContact(contactId,(contact,messages)=>{
      contact.memories=Array.isArray(contact.memories)?contact.memories:[];
      const grouped=new Map();
      for(const m of messages){
        if(!m.music||!['chat','reply','event'].includes(m.music.kind))continue;
        const sid=String(m.music.sessionId||'legacy-'+m.ts);
        if(!grouped.has(sid))grouped.set(sid,[]);
        grouped.get(sid).push(m);
      }
      for(const [sid,arr] of grouped){
        const memory=contact.memories.find(x=>x.kind==='music-listen'&&x.sessionId===sid&&x.identityId===activeIdentity());
        if(memory){
          const known=new Set((memory.chatLog||[]).map(x=>x.legacyMessageId));
          for(const m of arr)if(!known.has(m.id))memory.chatLog.push({me:!!m.me,text:truncate(m.text,2000),ts:m.ts||Date.now(),title:m.music.title||'',legacyMessageId:m.id,type:m.music.kind});
        }else{
          contact.memories.unshift({id:id(),kind:'music-listen',sessionId:sid,
            identityId:activeIdentity(),sec:'common',priority:5,level:'mid',
            label:new Date(arr[0].ts||Date.now()).toLocaleString('zh-CN',{hour12:false}),
            title:arr[0].music.title||'一起听歌',
            text:'与{{char}}一起听《'+(arr[0].music.title||'歌曲')+'》的历史聊天（'+arr.length+'条）',
            chatLog:arr.map(m=>({me:!!m.me,text:truncate(m.text,2000),ts:m.ts||Date.now(),legacyMessageId:m.id,title:m.music.title||'',type:m.music.kind})),
            keys:['一起听歌','历史记录'],endedAt:Date.now()});
        }
      }
      for(let i=messages.length-1;i>=0;i--)if(messages[i].music&&['chat','reply','event'].includes(messages[i].music.kind))messages.splice(i,1);
    });
    migrated.add(key);
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
    const session=sessions.get(sessionKey(contactId));
    const snapshot={...c,msgs:thread(contactId).filter(x=>!x.music||x.music.kind==='invite').slice(),
      memories:(c.memories||[]).filter(x=>x.kind!=='music-listen'||x.identityId===activeIdentity())
        .map(x=>x.kind==='music-listen'?{...x,chatLog:undefined}:x)};
    const instruction=[
      musicContext(m),
      episodeContext(contactId,session),
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
    const session=sessions.get(sessionKey(contactId));
    const texts=parts.map(p=>cleanPrefix(p.text)).filter(Boolean);
    if(session&&session.id===sessionId&&session.status==='accepted'){
      for(const text of texts)writeEpisode(contactId,session,{me:false,text,title:music.title});
    }
    return texts;
  };
  async function invite(data){
    const contactId=String(data.contactId), mode=data.mode, music=safeMusic(data.music);
    return serialize(contactId,async ()=>{
      const c=findContact(contactId);
      migrateLegacy(contactId);
      if(!['direct','ask'].includes(mode))throw Error('邀请方式无效');
      const marker=add(contactId,{me:true,text:'【一起听歌邀请】《'+music.title+'》'+(music.artist?' · '+music.artist:'')+'（'+(mode==='ask'?'等待回应':'已接受')+'）',
        music:{kind:'invite',title:music.title,artist:music.artist,album:music.album,songId:music.songId,cover:music.cover,mode,status:mode==='ask'?'pending':'accepted'}});
      const session={id:id(),contactId,inviteId:marker.id,status:mode==='ask'?'pending':'accepted',identityId:activeIdentity(),music};
      sessions.set(sessionKey(contactId),session);
      if(mode==='direct'){
        writeEpisode(contactId,session,null);
        return {accepted:true,contact:{id:c.id,name:c.remark||c.name,avatar:avatarSource(c.avatar)},sessionId:session.id,messages:[]};
      }
      let parts;
      try{ parts=await reply(contactId,music,'invite'); }
      catch(error){ editInvite(contactId,marker.id,'error');throw error;}
      const first=parts[0].text;
      const accepted=/^\s*【接受邀请】/.test(first);
      const declined=/^\s*【婉拒邀请】/.test(first);
      session.status=accepted?'accepted':declined?'declined':'pending';
      if(accepted)writeEpisode(contactId,session,null);
      const text=accepted?responseFor(contactId,music,parts,session.id)
        :parts.map(x=>cleanPrefix(x.text)).filter(Boolean);
      editInvite(contactId,marker.id,session.status);
      if(!accepted)sessions.delete(sessionKey(contactId));
      return {accepted,declined,contact:{id:c.id,name:c.remark||c.name,avatar:avatarSource(c.avatar)},sessionId:session.id,messages:text};
    });
  }
  async function chat(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const s=sessions.get(sessionKey(contactId));
      if(!s||s.status!=='accepted'||s.identityId!==activeIdentity())throw Error('尚未与当前联系人开始一起听');
      const text=truncate(data.text,1800);
      if(!text)throw Error('消息不能为空');
      writeEpisode(contactId,s,{me:true,text,title:music.title});
      const parts=await reply(contactId,music,'chat');
      return {messages:responseFor(contactId,music,parts,s.id)};
    });
  }
  async function pick(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const s=sessions.get(sessionKey(contactId));
      if(!s||s.status!=='accepted'||s.identityId!==activeIdentity())throw Error('还没开始一起听');
      if(!music.playlist.length)throw Error('当前没有可选的歌曲列表');
      writeEpisode(contactId,s,{me:true,text:'你来选下一首歌吧。',title:music.title});
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
      const s=sessions.get(sessionKey(contactId));
      if(!s)return {ok:true};
      if(s.identityId!==activeIdentity())return {ok:false};
      sessions.delete(sessionKey(contactId));
      editInvite(contactId,s.inviteId,'ended');
      s.status='ended';
      writeEpisode(contactId,s,null);
      void summarizeEpisode(contactId,s);
      return {ok:true};
    });
  }
  async function track(data){
    const contactId=String(data.contactId),music=safeMusic(data.music);
    return serialize(contactId,async()=>{
      const session=sessions.get(sessionKey(contactId));
      if(!session||session.status!=='accepted'||session.identityId!==activeIdentity())return {ok:false};
      if(session.music.songId===music.songId && session.music.title===music.title)return {ok:true};
      session.music=music;
      writeEpisode(contactId,session,{me:true,text:'切换到《'+music.title+'》'+(music.artist?' · '+music.artist:''),type:'event',title:music.title});
      return {ok:true};
    });
  }
  // Parent-level floating listening dock. The actual iframe/audio stays mounted
  // and keeps playing when the dock temporarily hides the music layer.
  // Never substitute a second player or a mocked contact/audio stream.
  const float={node:null,frame:null,origin:null,data:null,hidden:null,mini:false,
    create(){
      if(this.node)return;
      const el=document.createElement('aside');
      el.id='wmc-floating-player';el.hidden=true;
      el.setAttribute('aria-label','一起听悬浮小窗');
      const img=document.createElement('img');img.className='wmc-fp-avatar';img.alt='Char 头像';
      const copy=document.createElement('div');copy.className='wmc-fp-copy';
      const name=document.createElement('strong');name.className='wmc-fp-name';name.textContent='一起听';
      const song=document.createElement('span');song.className='wmc-fp-song';song.textContent='等待歌曲';
      copy.append(name,song);
      const play=document.createElement('button');play.type='button';play.className='wmc-fp-play';play.setAttribute('aria-label','播放或暂停');play.textContent='▶';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='wmc-fp-toggle';toggle.setAttribute('aria-label','收起音乐界面');toggle.textContent='▁';
      const open=document.createElement('button');open.type='button';open.className='wmc-fp-open';open.setAttribute('aria-label','打开一起听聊天');open.textContent='聊';
      el.append(img,copy,play,toggle,open);
      document.body.appendChild(el);
      this.node=el;this.img=img;this.name=name;this.song=song;this.play=play;this.toggle=toggle;
      play.addEventListener('click',()=>this.command('play'));
      open.addEventListener('click',()=>{this.restore();this.command('chat');});
      copy.addEventListener('click',()=>{this.restore();this.command('chat');});
      img.addEventListener('click',()=>{this.restore();this.command('chat');});
      toggle.addEventListener('click',()=>{this.mini?this.restore():this.minimize();});
      let drag=null;
      el.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.target.closest('button'))return;
        const r=el.getBoundingClientRect();
        drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,startX:e.clientX,startY:e.clientY};
        el.setPointerCapture?.(e.pointerId);
      });
      el.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const right=Math.max(6,Math.min(window.innerWidth-el.offsetWidth-6,window.innerWidth-(e.clientX-drag.dx)-el.offsetWidth));
        const top=Math.max(6,Math.min(window.innerHeight-el.offsetHeight-6,e.clientY-drag.dy));
        el.style.right=right+'px';el.style.top=top+'px';el.style.bottom='auto';
      });
      const end=e=>{if(drag?.id===e.pointerId)drag=null;};
      el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
    },
    command(command){
      if(!this.frame?.isConnected||!this.frame.contentWindow){this.close();return;}
      try {
        this.frame.contentWindow.postMessage({type:'whatever:music:ui:command',command},
          this.origin==='null'?'*':this.origin);
      }catch(error){console.warn('[Music Float] command failed',error?.message);}
    },
    minimize(){
      if(!this.frame?.isConnected){this.close();return;}
      const layer=document.getElementById('whatever-music-layer');
      const win=document.getElementById('appWindow');
      const target=(layer&&layer.contains(this.frame))?layer
        :(win&&win.contains(this.frame)?win:null);
      if(!target)return;
      this.hidden={target,opacity:target.style.opacity,pointerEvents:target.style.pointerEvents,
        inert:!!target.inert,active:target.classList.contains('active')};
      // Opacity keeps the real iframe/audio mounted and avoids visibility-
      // based media throttling. Inert/pointer-events disable its input.
      target.style.opacity='0';target.style.pointerEvents='none';target.inert=true;
      if(target===win)document.getElementById('homeScreen')?.classList.remove('scaled');
      this.mini=true;this.toggle.textContent='▢';
      this.toggle.setAttribute('aria-label','返回音乐界面');
    },
    restore(){
      if(this.hidden){
        const {target,opacity,pointerEvents,inert,active}=this.hidden;
        target.style.opacity=opacity;target.style.pointerEvents=pointerEvents;target.inert=inert;
        if(target.id==='appWindow'&&active){
          target.classList.add('active');
          document.getElementById('homeScreen')?.classList.add('scaled');
        }
        this.hidden=null;
      }
      this.mini=false;
      if(this.toggle){this.toggle.textContent='▁';this.toggle.setAttribute('aria-label','收起音乐界面');}
    },
    close(){
      this.restore();if(this.node)this.node.hidden=true;
      this.frame=null;this.origin=null;this.data=null;
    },
    update(data,source,origin){
      if(data.active===false){
        if(!this.data||String(data.contactId)===String(this.data.contactId))this.close();
        return {ok:true};
      }
      const sourceFrame=playerFrames().find(f=>f.contentWindow===source);
      if(!sourceFrame)throw Error('音乐窗口未认证');
      this.create();
      this.frame=sourceFrame;this.origin=origin;this.data=data;
      this.node.hidden=false;
      this.name.textContent=truncate(data.name||'Char',65);
      this.song.textContent=truncate(data.music?.title||'等待播放',75);
      this.play.textContent=data.playing?'Ⅱ':'▶';
      this.play.setAttribute('aria-label',data.playing?'暂停音乐':'播放音乐');
      const avatar=avatarSource(data.avatar);
      if(avatar&&this.img.src!==avatar)this.img.src=avatar;
      if(data.minimize===true)this.minimize();
      return {ok:true};
    }
  };
  setInterval(()=>{
    if(float.frame&&!float.frame.isConnected)float.close();
  },4000);
  const miniStyle=document.createElement('style');
  miniStyle.textContent=[
    '#wmc-floating-player{position:fixed;top:calc(env(safe-area-inset-top,0px) + 64px);right:12px;z-index:2147483550;width:min(268px,calc(100vw - 24px));box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:18px;border:1px solid #444;background:#000;color:#fff;box-shadow:0 8px 26px #0009;user-select:none;touch-action:none;font:12px/1.4 system-ui,sans-serif}',
    '#wmc-floating-player[hidden]{display:none!important}',
    '#wmc-floating-player .wmc-fp-avatar{height:33px;width:33px;flex:none;border-radius:50%;object-fit:cover;background:#333}',
    '#wmc-floating-player .wmc-fp-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;cursor:pointer}',
    '#wmc-floating-player .wmc-fp-name{font-size:12px;font-weight:650;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '#wmc-floating-player .wmc-fp-song{font-size:10px;color:#b7b7b7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '#wmc-floating-player button{flex:0 0 27px;height:27px;width:27px;padding:0;border:1px solid #666;background:#111;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:12px;cursor:pointer}',
    '#wmc-floating-player .wmc-fp-play{background:#fff;color:#000;border-color:#fff}',
    '@media(max-width:365px){#wmc-floating-player{gap:5px;padding:7px;width:min(245px,calc(100vw - 18px))}#wmc-floating-player button{width:24px;height:24px;flex-basis:24px}}'
  ].join('\n');
  document.head.appendChild(miniStyle);
  const handlers={
    contacts:async()=>({contacts:listContacts()}),
    invite,chat,pick,track,leave
  };
  w.addEventListener('message',async e=>{
    if(!validSender(e))return;
    const d=e.data;
    if(!d||d.type!=='whatever:music:request'||typeof d.id!=='string'||typeof d.action!=='string')return;
    try{
      const handler=handlers[d.action];
      if(!handler&&d.action!=='ui')throw Error('未知操作');
      // Only the sender already validated by validSender may control the dock.
      const result=d.action==='ui'?float.update(d.payload||{},e.source,e.origin):await handler(d.payload||{});
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:true,result},responseOrigin(e));
    }catch(error){
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:false,error:truncate(error?.message||'操作失败',240)},responseOrigin(e));
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
    // Mirror the existing white file-message card, not a black player card.
    '.messages-app #thread .mrow.wmc-card-row{display:flex!important;width:100%;box-sizing:border-box;flex-direction:row-reverse!important;align-items:flex-end;margin:9px 0;gap:0;min-width:0}',
    '.messages-app #thread .wmc-song-card{all:unset;box-sizing:border-box;display:inline-flex!important;align-items:center;gap:10px;min-width:190px;width:min(250px,calc(100% - 12px));max-width:100%;min-height:68px;padding:10px 14px 10px 10px;border-radius:14px;background:#fff!important;color:#3a3a3e!important;border:0!important;box-shadow:0 4px 12px rgba(60,40,55,.12);cursor:pointer;overflow:hidden;text-align:left;flex-shrink:1}',
    '.messages-app .wmc-card-disc{display:grid;place-items:center;position:relative;width:38px;height:38px;flex:0 0 38px;border:1px solid #dddde1;border-radius:50%;background:repeating-radial-gradient(circle,#f5f5f7 0 2px,#e2e2e8 3px,#f3f3f5 4px,#dad9df 5px);box-shadow:0 2px 5px #00000010}',
    '.messages-app .wmc-card-disc-center{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#f2dce4;color:#47434a;font-size:11px}',
    '.messages-app .wmc-card-main{display:flex;flex-direction:column;justify-content:center;min-width:0;flex:1;gap:2px;overflow:hidden}',
    '.messages-app .wmc-card-head{display:block;font-size:9px;letter-spacing:.08em;color:#aaa0a7;line-height:1.1;font-weight:650}',
    '.messages-app .wmc-card-title{display:block;font-size:14px;font-weight:600;line-height:1.4;color:#3a3a3e!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.messages-app .wmc-card-artist{display:block;color:#8a8a90!important;font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.messages-app .wmc-card-status{display:block;font-size:10px;line-height:1.3;color:#8a8a90!important}',
    '.messages-app .wmc-song-card:focus-visible{outline:2px solid #222;outline-offset:3px}',
    '@media(max-width:350px){.messages-app #thread .wmc-song-card{width:min(238px,calc(100% - 8px))}}',
    '.messages-app #memPage .mem-fold .mem-chatlog{max-height:360px;overflow-y:auto;overscroll-behavior:contain}',
    '.messages-app #memPage .mem-fold .mem-chatlog .mem-cl-bub{white-space:pre-wrap;overflow-wrap:anywhere}'
  ].join('\n');
  document.head.appendChild(theme);
  w.WhateverMusicChatBridge=Object.freeze({
    registerHost(adapter){
      if(!adapter||!adapter.listContacts||!adapter.getThread||!adapter.mutateContact)throw Error('聊天室适配器不完整');
      host=adapter;
      // Migrate historic music-only rows after current identity is loaded.
      for(const c of listContacts()){try{migrateLegacy(c.id);}catch(e){console.warn('[Music] Legacy migration deferred',e?.message);}}
    },
    hasHost:()=>!!host,
    safeMusic
  });
})(window);