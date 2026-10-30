/* Whatever: music keeps its OWN per-session conversation inside the contact's
 * existing COMMON MEMORY. Only an invite card appears in main chat. */
(function (w) {
  'use strict';
  const migrated = new Set();
  const sessions = new Map();
  const inProgress = new Map();
  // One accepted user click can start only one Char request, even if a
  // legacy listener or a duplicate iframe postMessage retries the action.
  const recallGuards = new Map();
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
    const appWindow=document.getElementById('appWindow') || document.querySelector('.app-window');
    const layer=document.getElementById('whatever-music-layer');
    const evergreen=document.getElementById('wmc-persistent-music');
    const content=appWindow?.querySelector('.app-content');
    const windowTitle=document.getElementById('appTitle')?.textContent || '';
    // Dedicated Chérie Music is a FULL-SCREEN sibling of appWindow, not
    // inside appWindow. Always include that actual launcher frame first.
    const fullScreen=Array.from(layer?.querySelectorAll('iframe')||[]);
    const desktop=Array.from(appWindow?.querySelectorAll('iframe')||[])
      .filter(f=>/音乐|music|ch[ée]rie/i.test([
        f.getAttribute('title')||'',f.getAttribute('data-app')||'',
        f.getAttribute('src')||'',f.id||''
      ].join(' ')));
    if(!desktop.length&&content&&/音乐|music|ch[ée]rie/i.test(windowTitle)){
      desktop.push(...Array.from(content.querySelectorAll('iframe')));
    }
    return [...new Set([...Array.from(evergreen?.querySelectorAll('iframe')||[]),...fullScreen,...desktop])];
  };
  // The private music app may run inside a sandboxed srcdoc iframe whose
  // browser origin is literally "null".  Trust only the currently mounted
  // music iframe's exact WindowProxy, never arbitrary opaque-origin frames.
  const validSender = e => (e.origin===w.location.origin||e.origin==='null')
    && (playerFrames().some(f=>f.contentWindow===e.source)
        || (!!float?.frame?.isConnected&&float.frame.contentWindow===e.source)
        // An original music frame can be detached in the same event turn as
        // its exit button. Only its final audio-leaving message may still
        // initiate handoff, using its exact previously authenticated WindowProxy.
        || (e.data?.type==='whatever:music:audio-leaving'
          &&!!float?.frame&&float.frame.contentWindow===e.source));
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
        // Session boundaries live in the original identity thread, not
        // a parallel player transcript or a standalone widget.
        if(!messages.some(x=>x.music?.kind==='boundary'&&x.music.sessionId===session.id&&x.music.phase==='start')){
          messages.push({id:id(),me:false,text:'',ts:Date.now(),t:time(),
            music:{kind:'boundary',phase:'start',sessionId:session.id,source:'music'}});
        }
      }
      if(entry){
        // One atomic contact mutation synchronizes the music episode and
        // the original Messages thread; never create a second contact store.
        if(m.chatLog.length>=1200)throw Error('同听记录已达本地存储上限，请结束本次同听并新建会话');
        const stamp=Date.now(), text=truncate(entry.text,2000), kind=entry.type||'chat';
        m.chatLog.push({me:!!entry.me,text,ts:stamp,
          title:truncate(entry.title||session.music.title,160),type:kind});
        if(kind==='chat'||kind==='recall'){
          messages.push({id:id(),me:!!entry.me,text,ts:stamp,t:time(),
            music:{kind:'synced',sessionId:session.id,source:'music',
              title:truncate(entry.title||session.music.title,160)}});
        }
      }
      if(session.music.title)m.title=session.music.title;
      if(session.music.artist)m.artist=session.music.artist;
      const n=m.chatLog.length;
      if(!m.endedAt)m.text='与{{char}}一起听《'+m.title+'》'+(m.artist?'（'+m.artist+'）':'')+'，同听交流 '+n+' 条';
      if(session.status==='ended'){
        m.endedAt=Date.now();
        if(!messages.some(x=>x.music?.kind==='boundary'&&x.music.sessionId===session.id&&x.music.phase==='end')){
          messages.push({id:id(),me:false,text:'',ts:Date.now(),t:time(),
            music:{kind:'boundary',phase:'end',sessionId:session.id,source:'music'}});
        }
      }
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
  const responseFor = (contactId, music, parts, sessionId, kind='chat')=>{
    const session=sessions.get(sessionKey(contactId));
    const texts=parts.map(p=>cleanPrefix(p.text)).filter(Boolean);
    if(session&&session.id===sessionId&&session.status==='accepted'){
      for(const text of texts)writeEpisode(contactId,session,{me:false,text,title:music.title,type:kind});
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
      const session={id:id(),contactId,inviteId:marker.id,status:mode==='ask'?'pending':'accepted',
        identityId:activeIdentity(),music,
        mainSeen:new Set(thread(contactId).filter(m=>m&&!m.music&&m.id!=null).map(m=>String(m.id))),
        pendingMain:[]};
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
  // A genuine API-generated partner reply, triggered by either native
  // “调取” button. Do not fabricate a user chat message or reopen a history
  // quote picker. The Char's response is stored in the SAME music episode.
  async function recall(data){
    // The early music-bundle click guard is the only producer of intentId.
    // Old/automatic music callbacks must not silently generate an AI reply.
    const intentId=typeof data.intentId==='string'?data.intentId:'';
    if(!/^wmc-recall-[a-z0-9]+-[a-z0-9]+$/.test(intentId))
      throw Error('请点击一起听窗口里的「调取」按钮');
    const contactId=String(data.contactId),music=safeMusic(data.music);
    const session=sessions.get(sessionKey(contactId));
    if(!session||session.status!=='accepted'||session.identityId!==activeIdentity())
      throw Error('请先与当前 Char 开始一起听');
    const key=sessionKey(contactId)+':'+session.id;
    const previous=recallGuards.get(key);
    if(previous&&(previous.pending||Date.now()-previous.finishedAt<1150))
      return {messages:[],deduped:true};
    const guard={pending:true,finishedAt:0,intentId};
    recallGuards.set(key,guard);
    try{
      return await serialize(contactId,async()=>{
        const current=sessions.get(sessionKey(contactId));
        if(!current||current.id!==session.id||current.status!=='accepted')
          throw Error('当前一起听已经结束，请重新邀请');
        const parts=await reply(contactId,music,'recall',
          '用户点了「调取」，请根据你的人设、当前歌曲和这次一起听的已有聊天自然主动回复。不要伪造用户刚发出的消息，也不要自行选歌。');
        return {messages:responseFor(contactId,music,parts,session.id,'recall')};
      });
    }finally{
      guard.pending=false;
      guard.finishedAt=Date.now();
    }
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
  // Top-level audio continues even when the private app-manager removes or
  // pauses its nested iframe. This is a playback handoff, not a second player
  // window, and it never touches Char messages, prompts or account data.
  const audioHandoff={
    node:null,state:null,active:false,returning:false,returnFrame:null,lastError:null,resumePending:false,
    validSource(src){
      if(typeof src!=='string'||src.length>2200)return false;
      try{
        const url=new URL(src,location.href);
        return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;
      }catch{return false;}
    },
    ensure(){
      if(this.node)return this.node;
      const node=document.createElement('audio');
      node.id='wmc-host-audio';node.preload='auto';
      node.setAttribute('aria-hidden','true');
      node.style.cssText='position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(node);
      this.node=node;
      node.addEventListener('error',()=>{
        this.lastError='主页面音频源无法播放';
        console.warn('[Music handoff] source cannot play in parent document');
      });
      // During top-level playback the nested original audio is paused,
      // so only this clock can advance the 3-line floating lyric.
      const updateLyrics=()=>float.renderAt(Number(node.currentTime)||0);
      node.addEventListener('timeupdate',updateLyrics);
      node.addEventListener('timeupdate',()=>exposeSongState());
      node.addEventListener('seeked',updateLyrics);
      node.addEventListener('playing',updateLyrics);
      return node;
    },
    receive(data,source){
      if(!data||!this.validSource(data.src))return;
      const position=Number(data.position),volume=Number(data.volume),rate=Number(data.playbackRate);
      if(!Number.isFinite(position)||position<0||position>86400)return;
      if(this.active&&source!==this.returnFrame)return;
      this.state={
        src:data.src,position,paused:!!data.paused,ended:!!data.ended,
        volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1,
        muted:!!data.muted,
        playbackRate:Number.isFinite(rate)&&rate>=0.5&&rate<=3?rate:1,
        stamp:Date.now()
      };
      if(this.returning&&source===this.returnFrame&&!data.paused){
        this.finishReturn();
      }
    },
    takeOver(fromGesture=false){
      const st=this.state;
      if(this.active||!st||st.paused||st.ended||
        (Date.now()-st.stamp>12000&&!this.resumePending)
        ||!this.validSource(st.src))return false;
      const a=this.ensure();
      this.returning=false;this.returnFrame=null;
      if(a.src!==new URL(st.src,location.href).href)a.src=st.src;
      try{a.currentTime=st.position+Math.min(1.5,(Date.now()-st.stamp)/1000);}
      catch{a.addEventListener('loadedmetadata',()=>{
        try{a.currentTime=st.position;}catch{}
      },{once:true});}
      a.volume=st.volume;a.muted=st.muted;a.playbackRate=st.playbackRate;
      this.active=true;
      Promise.resolve(a.play()).then(()=>{
        this.resumePending=false;this.lastError=null;
        // Mute ONLY after parent audio actually starts; no double song.
        float.command('audio-handoff-mute');
      }).catch(e=>{
        this.lastError=String(e?.message||e);
        this.active=false;this.resumePending=true;
        console.warn('[Music handoff] parent audio playback was blocked, retry on next gesture:',this.lastError);
      });
      return true;
    },
    requestReturn(){
      if(!this.active||!this.node)return false;
      this.returning=true;this.returnFrame=float.frame?.contentWindow||null;
      this.sendReturn();
      return true;
    },
    sendReturn(){
      if(!this.returning||!this.node?.src||!float.frame?.isConnected)return;
      this.returnFrame=float.frame.contentWindow;
      const a=this.node;
      float.command('audio-restore',{
        src:a.currentSrc||a.src,position:Number(a.currentTime)||0,
        volume:a.volume,muted:a.muted,playbackRate:a.playbackRate
      });
    },
    finishReturn(){
      if(!this.active||!this.returning)return;
      this.node?.pause();
      this.active=false;this.resumePending=false;
      this.returning=false;this.returnFrame=null;
    }
  };
  // Browser user activation policies differ: if an iframe exit triggered
  // a denied play() in the parent, retry on the NEXT explicit touch/gesture.
  // Do not display an extra dialog and never start a song paused by the user.
  document.addEventListener('pointerdown',()=>{
    if(audioHandoff.resumePending&&!audioHandoff.active)
      audioHandoff.takeOver(true);
  },true);
  // Existing Whatever API ball sometimes sits under the full-screen Music
  // iframe. Promote that SAME DOM node (not a copy) into the top-level layer
  // and expose the live music context for its normal API requests.
  const EXISTING_API_BALL_SELECTORS=[
    '#apiFloatingBall','#apiFloatBall','#api-floating-ball',
    '#apiFloat','#apiFab','#apiBall','#apiStatusBall',
    '#apiStatusFloat','.api-floating-ball','.api-float-ball',
    '.api-fab','.api-status-ball','.api-status-float',
    '.api-bubble','[data-api-ball]'
  ];
  function findExistingAPIBall(){
    for(const selector of EXISTING_API_BALL_SELECTORS){
      const ball=document.querySelector(selector);
      if(ball&&ball.id!=='wmc-floating-player'&&!ball.closest?.('#wmc-persistent-music'))return ball;
    }
    return null;
  }
  function promoteExistingAPIBall(){
    if(!float.frame?.isConnected)return;
    const names=EXISTING_API_BALL_SELECTORS;
    for(const selector of names){
      const ball=document.querySelector(selector);
      if(!ball||ball.id==='wmc-floating-player'||ball.closest?.('#wmc-persistent-music'))continue;
      if(!ball.dataset.wmcOriginalParent){
        // No host UI is cloned; existing event handlers remain attached.
        if(ball.parentElement&&ball.parentElement!==document.body)
          document.body.appendChild(ball);
        ball.dataset.wmcOriginalParent='promoted';
      }
      ball.style.zIndex='2147483562';
      if(ball.style.position!=='fixed')ball.style.position='fixed';
    }
  }
  // Lyric-only floating ticker. Clicking it opens the music module's OWN
  // ListenTogether.chatPanel, identical to tapping the original partner avatar.
  // Never create a replacement chat form, send button, or quick-recall panel.
  const float={
    node:null,lyric:null,frame:null,origin:null,data:null,lastText:'',
    preservedPane:null,sparePane:null,shelvedLayer:null,nativePanelVisible:false,homeMode:false,guarded:false,
    originalWinClip:null,paneStyles:null,panelBounds:null,persistentViewport:null,
    chatSize:{width:285,height:340},lastDockLayout:'',
    lyricTimeline:[],lyricSongId:'',lastHostLyricIndex:-1,
    keyboardFocused:false,keyboardBottom:0,keyboardOldTop:null,
    create(){
      if(this.node)return;
      const el=document.createElement('button');
      el.id='wmc-floating-player';el.type='button';el.hidden=true;
      el.setAttribute('aria-label','拖动三行歌词可带着聊天窗移动，点击可打开一起听聊天');
      const track=document.createElement('span');track.className='wmc-lyric-track';
      const previous=document.createElement('span');previous.className='wmc-lyric-row wmc-lyric-prev';
      const lyric=document.createElement('span');lyric.className='wmc-lyric-row wmc-fp-lyric';
      const next=document.createElement('span');next.className='wmc-lyric-row wmc-lyric-next';
      previous.textContent=' ';lyric.textContent='♪';next.textContent=' ';
      track.append(previous,lyric,next);el.appendChild(track);document.body.appendChild(el);
      // The only resizing control lives INSIDE the original #chatPanel.
      this.node=el;this.track=track;
      this.previous=previous;this.lyric=lyric;this.next=next;
      this.lastLyricIndex=null;
      const toggleChat=()=>{
        if(this.frame?.isConnected)this.command('chat-toggle');
      };
      let drag=null,lastPointerEnd=0;
      el.addEventListener('click',()=>{
        // Pointer taps open on release: some mobile WebViews swallow click
        // after pointer capture. Preserve a fallback for keyboard clicks.
        if(Date.now()-lastPointerEnd<750)return;
        toggleChat();
      });
      el.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.isPrimary===false)return;
        const rect=el.getBoundingClientRect();
        drag={id:e.pointerId,dx:e.clientX-rect.left,dy:e.clientY-rect.top,
          x:e.clientX,y:e.clientY,moved:false};
        el.setPointerCapture?.(e.pointerId);
      });
      el.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
        if(!drag.moved)return;
        this.moveDock(e.clientX-drag.dx,e.clientY-drag.dy);
      });
      const end=e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const moved=drag.moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6;
        drag=null;
        lastPointerEnd=Date.now();
        if(e.type==='pointerup'&&!moved)toggleChat();
      };
      el.addEventListener('pointerup',end);
      el.addEventListener('pointercancel',end);
      window.addEventListener('resize',()=>this.layoutDock());
      window.visualViewport?.addEventListener('resize',()=>this.layoutDock());
      window.visualViewport?.addEventListener('scroll',()=>this.layoutDock());
    },
    dockRect(){
      if(!this.node)return null;
      const vv=w.visualViewport;
      const parentBottom=vv?vv.offsetTop+vv.height:window.innerHeight;
      const viewBottom=this.keyboardFocused?Math.min(parentBottom,this.keyboardBottom||parentBottom):parentBottom;
      let r=this.node.getBoundingClientRect();
      if(this.keyboardFocused&&r.bottom+125>viewBottom){
        if(this.keyboardOldTop===null)
          this.keyboardOldTop={top:this.node.style.top,right:this.node.style.right,
            bottom:this.node.style.bottom,left:this.node.style.left};
        this.node.style.top=Math.max(4,viewBottom-(r.height||90)-125)+'px';
        this.node.style.bottom='auto';
        r=this.node.getBoundingClientRect();
      }
      const width=Math.max(190,Math.min(this.chatSize.width,window.innerWidth-r.left-8));
      const room=viewBottom-r.bottom-12;
      const height=this.keyboardFocused?Math.max(105,Math.min(this.chatSize.height,room))
        :Math.max(170,Math.min(this.chatSize.height,room));
      return {left:r.left,top:r.bottom+8,width,height};
    },
    onKeyboard(info){
      const was=this.keyboardFocused;
      this.keyboardFocused=!!info?.focused;
      // The iframe reports local coordinates; the lyric dock lives in the
      // host document. Use one host-coordinate bottom to avoid jitter.
      const vv=w.visualViewport;
      const hostBottom=vv?vv.offsetTop+vv.height:w.innerHeight;
      const reported=Number(info?.availableBottom);
      const frameTop=this.frame?.getBoundingClientRect().top||0;
      this.keyboardBottom=Number.isFinite(reported)&&reported>0
        ?Math.min(hostBottom,frameTop+reported):hostBottom;
      if(was&&!this.keyboardFocused&&this.keyboardOldTop&&this.node){
        const o=this.keyboardOldTop;
        this.node.style.top=o.top;this.node.style.right=o.right;
        this.node.style.bottom=o.bottom;this.node.style.left=o.left;
        this.keyboardOldTop=null;
      }
      this.layoutDock();
    },
    moveDock(x,y){
      if(!this.node)return;
      const w=this.node.offsetWidth||270,h=this.node.offsetHeight||90;
      const available=this.nativePanelVisible
        ?Math.max(8,window.innerHeight-h-8-170-8)
        :Math.max(8,window.innerHeight-h-8);
      const left=Math.max(8,Math.min(x,window.innerWidth-w-8));
      const top=Math.max(8,Math.min(y,available));
      this.node.style.left=left+'px';this.node.style.top=top+'px';
      this.node.style.right='auto';this.node.style.bottom='auto';
      this.layoutDock();
    },
    layoutDock(){
      if(!this.node||!this.nativePanelVisible||!this.shelvedLayer)return;
      const r=this.dockRect();if(!r)return;
      const layer=this.shelvedLayer.layer;
      const fr=this.frame?.getBoundingClientRect();
      if(!fr||!fr.width||!fr.height)return;
      const local={left:Math.max(0,r.left-fr.left),top:Math.max(0,r.top-fr.top),
        width:Math.min(r.width,fr.right-r.left),height:Math.min(r.height,fr.bottom-r.top)};
      if(local.width<150||local.height<100)return;
      const fingerprint=JSON.stringify(local);
      if(this.lastDockLayout!==fingerprint){
        this.lastDockLayout=fingerprint;
        this.command('chat-layout',local);
      }
      this.panelBounds={open:true,rect:local,viewport:{width:fr.width,height:fr.height}};
      this.clipOnlyPanel(layer,this.panelBounds);
      layer.style.opacity='1';

    },
    resizeOriginalChat(dx,dy){
      if(!this.nativePanelVisible)return;
      const rect=this.dockRect();if(!rect)return;
      this.chatSize.width=Math.max(190,Math.min(window.innerWidth-rect.left-8,
        this.chatSize.width+Number(dx||0)));
      this.chatSize.height=Math.max(170,Math.min(window.innerHeight-rect.top-8,
        this.chatSize.height+Number(dy||0)));
      this.layoutDock();
    },
    dragFromChat(dx,dy){
      if(!this.node||!this.nativePanelVisible)return;
      const r=this.node.getBoundingClientRect();
      this.moveDock(r.left+Number(dx||0),r.top+Number(dy||0));
    },
    receiveTimeline(payload){
      if(!payload||!Array.isArray(payload.lines))return;
      const timeline=payload.lines.slice(0,450).map(item=>({
        t:Number(item.t),text:truncate(item.text||'',170)
      })).filter(item=>Number.isFinite(item.t)&&item.t>=0&&item.t<=86400&&item.text)
        .sort((a,b)=>a.t-b.t);
      if(!timeline.length)return;
      this.lyricTimeline=timeline;
      this.lyricSongId=String(payload.songId||'');
      this.lastHostLyricIndex=-1;
      if(audioHandoff.active&&audioHandoff.node)this.renderAt(audioHandoff.node.currentTime);
    },
    renderAt(seconds){
      if(!audioHandoff.active||!this.lyricTimeline.length||!this.node||this.node.hidden)return;
      const t=Number(seconds);
      if(!Number.isFinite(t)||t<0)return;
      const lines=this.lyricTimeline;
      let lo=0,hi=lines.length;
      while(lo<hi){const middle=(lo+hi)>>>1;if(lines[middle].t<=t+.08)lo=middle+1;else hi=middle;}
      const index=Math.max(0,lo-1);
      if(index===this.lastHostLyricIndex)return;
      this.lastHostLyricIndex=index;
      const prev=lines[index-1]?.text||' ',current=lines[index]?.text||'♪';
      const next=lines[index+1]?.text||' ';
      const key=[prev,current,next].join('\\u001f');
      if(key===this.lastText)return;
      const oldKey=this.lastText;
      this.previous.textContent=prev;this.lyric.textContent=current;this.next.textContent=next;
      this.lastText=key;
      if(oldKey){
        this.track.classList.remove('wmc-lyric-moving');
        void this.track.offsetWidth;
        this.track.classList.add('wmc-lyric-moving');
      }
    },
    command(action,value){
      if(!this.frame?.isConnected||!this.frame.contentWindow){this.close();return;}
      try{
        this.frame.contentWindow.postMessage({type:'whatever:music:ui:command',command:action,value},
          this.origin==='null'?'*':this.origin);
      }catch(error){console.warn('[Music Lyrics] command failed:',error?.message);}
    },
    persistentLayer(){
      const node=document.getElementById('wmc-persistent-music');
      return node?.contains(this.frame)?node:null;
    },
    positionPersistent(){
      const layer=this.persistentLayer();
      if(!layer)return;
      const content=document.querySelector('#appWindow .app-content');
      const rect=content?.getBoundingClientRect();
      if(rect&&rect.width>30&&rect.height>30){
        layer.style.left=rect.left+'px';
        layer.style.top=rect.top+'px';
        layer.style.width=rect.width+'px';
        layer.style.height=rect.height+'px';
        this.persistentViewport={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
      }else if(this.persistentViewport){
        const p=this.persistentViewport;
        layer.style.left=p.left+'px';layer.style.top=p.top+'px';
        layer.style.width=p.width+'px';layer.style.height=p.height+'px';
      }
    },
    // Translate ORIGINAL iframe-local chat coordinates into the retaining
    // host's clipping coordinates. Browser layout offsets vary with base.css.
    panelInsets(host,panel){
      const rect=panel?.rect,frame=this.frame;
      if(!rect||!frame||typeof host?.getBoundingClientRect!=='function')return null;
      const fr=frame.getBoundingClientRect(),hr=host.getBoundingClientRect();
      const width=Number(panel.viewport?.width)||fr.width||window.innerWidth;
      const height=Number(panel.viewport?.height)||fr.height||window.innerHeight;
      if(!fr.width||!fr.height||!hr.width||!hr.height||width<=0||height<=0)return null;
      const sx=fr.width/width,sy=fr.height/height;
      const x=fr.left+rect.left*sx-hr.left;
      const y=fr.top+rect.top*sy-hr.top;
      const right=hr.width-x-rect.width*sx;
      const bottom=hr.height-y-rect.height*sy;
      const pad=8;
      return {top:Math.max(0,y-pad),right:Math.max(0,right-pad),
        bottom:Math.max(0,bottom-pad),left:Math.max(0,x-pad)};
    },
    clipOnlyPanel(host,panel){
      const insets=this.panelInsets(host,panel);
      if(!insets)return false;
      host.style.clipPath='inset('+insets.top+'px '+insets.right+'px '+
        insets.bottom+'px '+insets.left+'px round 24px)';
      host.style.pointerEvents='auto';
      return true;
    },
    hideRetainedPane(){
      if(!this.preservedPane)return;
      // Never use display:none or visibility:hidden for a playing iframe.
      // Both can suspend mobile WebViews' nested media/audio contexts.
      this.preservedPane.style.clipPath='inset(0 0 100% 0)';
      this.preservedPane.style.pointerEvents='none';
      this.nativePanelVisible=false;
    },
    hideWindowOnHome(){
      if(!this.homeMode)return;
      const win=document.getElementById('appWindow');
      if(win){win.style.clipPath='inset(0 0 100% 0)';win.style.pointerEvents='none';}
    },
    // Reveal only the original music iframe's existing chatPanel over other
    // Whatever apps. Clipping on the FULL-SCREEN host preserves its iframe,
    // audio graph and base.css geometry. No second chat UI is created.
    setNativePanel(panel){
      const musicLayer=this.persistentLayer()||document.getElementById('whatever-music-layer');
      if(panel?.open===false){
        this.panelBounds=null;this.nativePanelVisible=false;this.lastDockLayout='';
        if(this.shelvedLayer&&musicLayer){
          musicLayer.style.opacity='0';
          // Do not reveal the full opaque player before its iframe reports
          // chat-isolation readiness; that produced a one-frame flash.
          musicLayer.style.clipPath='inset(0 0 100% 0)';
          musicLayer.style.pointerEvents='none';
          if(this.persistentLayer())musicLayer.style.zIndex='0';
          this.command('chat-isolated',true);
        }
        this.hideRetainedPane();
        this.hideWindowOnHome();
        return;
      }
      if(!panel?.open)return;
      this.panelBounds=panel;
      if(musicLayer?.contains(this.frame)){
        if(!this.shelvedLayer)return; // original fullscreen remains unchanged
        this.nativePanelVisible=true;
        musicLayer.style.zIndex='2147483490';
        // Keep hidden until the original panel has been clipped to its
        // smaller bounds, avoiding a fullscreen player flash.
        this.command('chat-isolated',true);
        this.layoutDock();
        if(this.lastDockLayout)musicLayer.style.opacity='1';
        return;
      }
      if(this.preservedPane){
        this.nativePanelVisible=this.clipOnlyPanel(this.preservedPane,panel);
        if(this.homeMode){
          const win=document.getElementById('appWindow');
          if(win)this.clipOnlyPanel(win,panel);
        }
      }
    },
    guardNavigation(){
      if(this.guarded)return;
      this.guarded=true;
      const root=this;
      if(typeof w.openApp==='function'){
        const original=w.openApp;
        w.openApp=function(appId){
          // The first music iframe lives in a permanent sibling. Keep its
          // existing audio element playing; do not start a second player.
          if(appId!=='music'&&!root.persistentLayer())audioHandoff.takeOver();
          if(appId==='music'&&root.persistentLayer()){
            root.restoreMusic();
            audioHandoff.requestReturn();
            return root.frame;
          }
          if(appId==='music'&&root.preservedPane){
            root.restoreMusic();audioHandoff.requestReturn();return;
          }
          if(appId!=='music'&&root.persistentLayer()){
            root.shelveLayer();
            const opened=original.apply(this,arguments);
            root.command('panel-sync');
            return opened;
          }
          if(root.frame?.isConnected&&appId!=='music'){
            audioHandoff.takeOver();
            root.preservePane();
            if(root.preservedPane){
              root.homeMode=false;
              const win=document.getElementById('appWindow');
              if(win&&root.originalWinClip){
                win.style.clipPath=root.originalWinClip.clipPath;
                win.style.pointerEvents=root.originalWinClip.pointerEvents;
              }
              root.hideRetainedPane();
              if(root.sparePane)root.sparePane.style.display='';
            }
          }
          const result=original.apply(this,arguments);
          if(appId==='music'&&audioHandoff.active){
            audioHandoff.returning=true;
            audioHandoff.sendReturn();
          }
          if(root.preservedPane&&root.panelBounds)root.setNativePanel(root.panelBounds);
          return result;
        };
      }
      if(typeof w.closeApp==='function'){
        const original=w.closeApp;
        w.closeApp=function(){
          if(root.persistentLayer()){
            root.shelveLayer();
            // Private app-manager.closeApp() pauses __whateverMusicFrame.
            // Temporarily hide ONLY its reference while closing the window,
            // then restore it so reopening reuses the same audio and song.
            const retained=w.__whateverMusicFrame===root.frame?root.frame:null;
            if(retained)w.__whateverMusicFrame=null;
            let closed;
            try{closed=original.apply(this,arguments);}
            finally{if(retained)w.__whateverMusicFrame=retained;}
            root.command('panel-sync');
            return closed;
          }
          audioHandoff.takeOver();
          if(root.frame?.isConnected){
            audioHandoff.takeOver();
            root.preservePane();
          }
          const result=original.apply(this,arguments);
          if(root.preservedPane){
            const win=document.getElementById('appWindow');
            root.homeMode=true;
            if(win){
              win.classList.add('active'); // keep original iframe/audio loaded
              root.hideWindowOnHome();
              if(root.panelBounds)root.setNativePanel(root.panelBounds);
            }
          }
          return result;
        };
      }
      const app=w.WhateverMusicApp;
      if(app&&typeof app.close==='function'&&!app.__wmcKeepAlive){
        const original=app.close.bind(app);
        app.__wmcKeepAlive=true;
        app.close=function(opts){
          if(root.frame?.isConnected){
            if(!root.persistentLayer())audioHandoff.takeOver();
            // Keep playing even before choosing a Char; no src reset, pause
            // or iframe destruction, irrespective of participant state.
            root.shelveLayer();
            root.command('panel-sync');
            return;
          }
          return original(opts);
        };
      }
      if(app&&typeof app.open==='function'&&!app.__wmcRestorePatched){
        const original=app.open.bind(app);
        app.__wmcRestorePatched=true;
        app.open=function(){
          if(root.shelvedLayer){
            root.restoreMusic();audioHandoff.requestReturn();return root.frame;
          }
          return original();
        };
      }
    },
    preservePane(){
      if(this.preservedPane)return;
      const win=document.getElementById('appWindow');
      if(!this.frame||!win?.contains(this.frame))return;
      const pane=this.frame.closest('.app-content');if(!pane)return;
      const spare=document.createElement('div');spare.className='app-content';
      // Never reparent iframe or change base.css. It must stay rendered;
      // display:none can suspend the nested media on mobile WebViews.
      pane.parentNode.insertBefore(spare,pane);
      if(!this.originalWinClip)this.originalWinClip={
        clipPath:win.style.clipPath,pointerEvents:win.style.pointerEvents
      };
      this.paneStyles={
        position:pane.style.position,inset:pane.style.inset,zIndex:pane.style.zIndex,
        clipPath:pane.style.clipPath,pointerEvents:pane.style.pointerEvents
      };
      pane.style.position='absolute';
      pane.style.inset='0';
      pane.style.zIndex='24';
      this.preservedPane=pane;this.sparePane=spare;
      this.hideRetainedPane();
    },
    shelveLayer(){
      const layer=this.persistentLayer()||document.getElementById('whatever-music-layer');
      if(!layer||!layer.contains(this.frame)||this.shelvedLayer)return;
      this.shelvedLayer={layer,clipPath:layer.style.clipPath,pointerEvents:layer.style.pointerEvents,zIndex:layer.style.zIndex,opacity:layer.style.opacity};
      // Briefly hide until the iframe confirms its own transparent document;
      // then remove clipping entirely so the browser keeps audio rendering.
      layer.style.opacity='0';
      layer.style.clipPath='inset(0 0 100% 0)';
      layer.style.pointerEvents='none';
      // Other Whatever widgets (including the API floating orb) must stay
      // ABOVE the hidden audio document until the user opens native chat.
      if(this.persistentLayer())layer.style.zIndex='0';
      // Opaque iframe element backgrounds otherwise show the player through
      // rounded corners even when its document hides every non-chat node.
      if(this.persistentLayer()){
        this.savedFrameBackground=this.frame.style.background;
        this.frame.style.background='transparent';
      }
      this.command('chat-isolated',true);
    },
    restoreMusic(){
      if(this.shelvedLayer){
        const {layer,clipPath,pointerEvents,zIndex,opacity}=this.shelvedLayer;
        layer.style.clipPath=clipPath;layer.style.pointerEvents=pointerEvents;
        layer.style.zIndex=zIndex;layer.style.opacity=opacity;
        this.shelvedLayer=null;
      }
      if(this.persistentLayer()){
        if(this.savedFrameBackground!==undefined){
          this.frame.style.background=this.savedFrameBackground;
          this.savedFrameBackground=undefined;
        }
        this.command('chat-isolated',false);
        const win=document.getElementById('appWindow');
        win?.classList.add('active');
        document.getElementById('homeScreen')?.classList.add('scaled');
        const title=document.getElementById('appTitle');
        if(title)title.textContent='音乐';
        this.positionPersistent();
        return;
      }
      if(this.preservedPane){
        this.homeMode=false;
        this.preservedPane.style.clipPath=this.paneStyles?.clipPath||'';
        this.preservedPane.style.pointerEvents=this.paneStyles?.pointerEvents||'';
        if(this.sparePane)this.sparePane.style.display='none';
        const win=document.getElementById('appWindow');
        if(win){
          win.style.clipPath=this.originalWinClip?.clipPath||'';
          win.style.pointerEvents=this.originalWinClip?.pointerEvents||'';
          win.classList.add('active');
        }
        document.getElementById('homeScreen')?.classList.add('scaled');
        const title=document.getElementById('appTitle');
        if(title)title.textContent='音乐';
      }
    },
    close(){
      this.nativePanelVisible=false;
      if(this.shelvedLayer){
        const layer=this.shelvedLayer.layer;
        layer.style.opacity='0';
        layer.style.clipPath='none';
        layer.style.pointerEvents='none';
      }
      if(this.node)this.node.hidden=true;
      this.lastDockLayout='';
      if(!this.persistentLayer()){this.frame=null;this.origin=null;}
      this.data=null;this.lastText='';
      // Leave the original player's base layout and data untouched.
    },
    update(data,source,origin){
      if(data.active===false){
        if(!this.data||String(data.contactId)===String(this.data.contactId))this.close();
        return {ok:true};
      }
      const sourceFrame=playerFrames().find(f=>f.contentWindow===source)
        || (this.frame?.isConnected&&this.frame.contentWindow===source?this.frame:null);
      if(!sourceFrame)throw Error('音乐窗口未认证');
      this.create();
      this.frame=sourceFrame;this.origin=origin;
      if(data.panel)this.setNativePanel(data.panel);
      // Preserve contact identity across lightweight panel-only updates.
      if(data.contactId||data.music)this.data={...(this.data||{}),...data};
      for(const session of sessions.values())flushMainSync(session);
      this.node.hidden=false;
      const context=Object.freeze({
        title:truncate(data.music?.title||this.data?.music?.title||'',160),
        artist:truncate(data.music?.artist||this.data?.music?.artist||'',120),
        songId:truncate(data.music?.songId||this.data?.music?.songId||'',90),
        lyric:truncate(data.lyric||this.lyric?.textContent||'',170),
        playing:!!data.playing
      });
      w.WhateverMusicNowPlaying=context;
      try{w.dispatchEvent(new CustomEvent('whatever:music:api-context',{detail:context}));}catch{}
      promoteExistingAPIBall();
      if(Object.prototype.hasOwnProperty.call(data,'lyric')||data.music){
        const current=truncate(data.lyric||data.music?.lyric||'',220)
          || ('♪ '+truncate(data.music?.title||'一起听',80));
        const previous=truncate(data.lyricPrev||'',220);
        const following=truncate(data.lyricNext||'',220);
        const key=[previous,current,following].join('\u001f');
        if(this.lastText!==key){
          // Real lyric timing is sometimes exposed only as DOM text (no
          // numeric lyricState.active). Animate whenever the actual three
          // lines move; never require an available lyric index.
          const changed=this.lastText!==''&&this.lastText!==key;
          this.previous.textContent=previous||' ';
          this.lyric.textContent=current;
          this.next.textContent=following||' ';
          this.lastText=key;
          if(changed){
            this.track.classList.remove('wmc-lyric-moving');
            // Restart CSS animation on every new line, even during fast
            // consecutive transitions. A rAF alone won't always restart it.
            void this.track.offsetWidth;
            this.track.classList.add('wmc-lyric-moving');
          }
        }
        if(Number.isInteger(data.lyricIndex))this.lastLyricIndex=data.lyricIndex;
      }
      this.guardNavigation();
      exposeSongState();
      return {ok:true};
    }
  };
  setInterval(()=>{
    if(float.frame&&!float.frame.isConnected)float.close();
    promoteExistingAPIBall();
  },3000);

  // Share sanitized current-song context with the main Whatever API widget.
  // The actual AI/Char transport and messages remain on their original path.
  // Do not duplicate the API orb, media player, or any private chat content.
  function exposeSongState(){
    const meta=float.data?.music||{};
    const audio=audioHandoff.active?audioHandoff.node:null;
    const state={
      title:truncate(meta.title||'',160),artist:truncate(meta.artist||'',120),
      lyric:truncate(float.lyric?.textContent||'',170),
      position:audio?Number(audio.currentTime)||0:Number(audioHandoff.state?.position)||0,
      playing:audioHandoff.active?!audio?.paused:!!float.data?.playing,
      source:'whatever-music'
    };
    w.WhateverMusicNowPlaying=Object.freeze({...state});
    // Existing API float integrations may call the music snapshot name.
    // Only expose public song metadata, never Char prompts or messages.
    w.WhateverMusicSnapshot=()=>({...state,playlist:[]});
    try{w.dispatchEvent(new CustomEvent('whatever:music-state',{detail:state}));}catch{}
  }
  // The API widget is not a child of the music iframe. Keep its host-page
  // music snapshot available even when the private player is shelved.
  const hostViewport=w.visualViewport;
  function adjustForKeyboard(){
    if(!float.frame?.isConnected)return;
    const fr=float.frame.getBoundingClientRect();
    const bottom=hostViewport?hostViewport.offsetTop+hostViewport.height:w.innerHeight;
    float.command('keyboard-viewport',{bottom:Math.max(0,bottom-fr.top)});
    if(float.nativePanelVisible)float.layoutDock();
  }
  hostViewport?.addEventListener('resize',adjustForKeyboard,{passive:true});
  hostViewport?.addEventListener('scroll',adjustForKeyboard,{passive:true});
  // Mount the FIRST original music iframe in a permanent sibling before the
  // private app manager can attach it to a disposable .app-content. Moving
  // an already-mounted iframe would reload and stop the audio, so interception
  // must happen synchronously BEFORE its first DOM insertion.
  (function installPermanentMusicMount(){
    const originalAppend=Element.prototype.appendChild;
    const originalReplace=Element.prototype.replaceChildren;
    const originalInsert=Element.prototype.insertBefore;
    const originalAppendMany=Element.prototype.append;
    let capturing=false;
    function isMusicFrame(parent,node){
      if(capturing||!node||node.tagName!=='IFRAME')return false;
      const win=document.getElementById('appWindow');
      if(!win||!win.contains(parent))return false;
      const area=parent.closest?.('.app-content');
      if(!area||!win.contains(area))return false;
      const ownTitle=[node.title||'',node.getAttribute?.('title')||''].join(' ');
      if(/音乐|ch[ée]rie|music/i.test(ownTitle))return true;
      const currentTitle=document.getElementById('appTitle')?.textContent||'';
      // A title-less iframe is accepted only when it contains the actual
      // music document. Never capture an unrelated app's iframe.
      return /音乐|ch[ée]rie|music/i.test(currentTitle)&&
        /(?:id=["']realAudio["']|id=["']chatPanel["'])/.test(node.srcdoc||'');
    }
    function capture(parent,node){
      if(!isMusicFrame(parent,node))return false;
      const previous=document.getElementById('wmc-persistent-music');
      if(previous?.querySelector('iframe'))return false;
      capturing=true;
      try{
        const layer=previous||document.createElement('div');
        layer.id='wmc-persistent-music';
        layer.style.cssText='position:fixed;inset:auto;z-index:2147483490;'+
          'overflow:hidden;pointer-events:auto;background:transparent;'+
          'clip-path:none;isolation:isolate';
        if(!layer.isConnected)originalAppend.call(document.body,layer);
        node.style.display='block';
        node.style.width='100%';node.style.height='100%';
        node.style.border='0';
        originalAppend.call(layer,node);
        float.frame=node;float.origin='null';
        float.positionPersistent();
        float.guardNavigation();
        return true;
      }finally{capturing=false;}
    }
    // Private app-manager sometimes builds an iframe inside a DETACHED
    // wrapper, then appends that wrapper to .app-content. Intercept the
    // wrapper's first insertion and capture the still-unmounted descendant.
    // No mounted iframe is ever reparented or reloaded.
    function detachMusicDescendants(parent,node){
      if(capturing||!node||node.nodeType!==1&&node.tagName==null)return false;
      const win=document.getElementById('appWindow');
      if(!win||!win.contains(parent))return false;
      const area=parent.closest?.('.app-content');
      if(!area||!win.contains(area))return false;
      const frames=Array.from(node.querySelectorAll?.('iframe')||[]);
      let changed=false;
      for(const frame of frames){
        if(frame.isConnected)continue; // NEVER reload a connected player
        if(capture(parent,frame))changed=true;
      }
      return changed;
    }
    function handleInsert(parent,node){
      if(capture(parent,node))return true;
      detachMusicDescendants(parent,node);
      return false;
    }
    Element.prototype.appendChild=function(node){
      if(handleInsert(this,node))return node;
      return originalAppend.call(this,node);
    };
    Element.prototype.insertBefore=function(node,ref){
      if(handleInsert(this,node))return node;
      return originalInsert.call(this,node,ref);
    };
    Element.prototype.replaceChildren=function(...nodes){
      const remaining=nodes.filter(n=>!handleInsert(this,n));
      return originalReplace.apply(this,remaining);
    };
    Element.prototype.append=function(...nodes){
      const remaining=nodes.filter(n=>!handleInsert(this,n));
      return originalAppendMany.apply(this,remaining);
    };
  })();
  const miniStyle=document.createElement('style');
  miniStyle.textContent=[
    '#wmc-floating-player{position:fixed;top:calc(env(safe-area-inset-top,0px) + 66px);right:12px;z-index:2147483550;box-sizing:border-box;width:min(290px,calc(100vw - 24px));min-height:90px;height:90px;padding:0;border:0!important;outline:0;background:none!important;color:#fff;box-shadow:none!important;border-radius:0;overflow:hidden;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;text-align:center}',
    '#wmc-floating-player[hidden]{display:none!important}',
    '#wmc-floating-player .wmc-lyric-track{display:grid;grid-template-rows:24px 30px 24px;align-content:center;justify-items:center;width:100%;height:100%;overflow:hidden;background:none!important;mask-image:linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%);-webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)}',
    '#wmc-floating-player .wmc-lyric-row{display:block;box-sizing:border-box;max-width:100%;height:100%;padding:0 5px;background:none!important;border:0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,-apple-system,sans-serif;text-shadow:0 1px 6px #000e,0 2px 12px #000a}',
    '#wmc-floating-player .wmc-lyric-prev,#wmc-floating-player .wmc-lyric-next{font-size:11px;font-weight:500;color:rgba(255,255,255,.7);opacity:.60;line-height:24px}',
    '#wmc-floating-player .wmc-fp-lyric{font-size:14px;line-height:30px;font-weight:750;color:#fff;opacity:1}',
    '#wmc-floating-player .wmc-lyric-track.wmc-lyric-moving{animation:wmc-three-lyrics-rise .48s cubic-bezier(.2,.7,.2,1) both}',
    '@keyframes wmc-three-lyrics-rise{from{transform:translateY(24px);opacity:.58}to{transform:translateY(0);opacity:1}}',
    '#wmc-floating-player:focus-visible{outline:1px dashed #fff;outline-offset:1px}',
    '@media(prefers-reduced-motion:reduce){#wmc-floating-player .wmc-lyric-track{animation:none!important}}'
  ].join('\n');
  document.head.appendChild(miniStyle);
  // A small, host-owned recall indicator: always visible over the original
  // music iframe, including its clipped floating chat. No second chat window.
  // Entries are in-memory only and scoped to the current page session.
  // Recall progress belongs to the API floating ball already configured in
  // Settings. Never create a separate recall orb or history panel.
  const recallJournal={
    ball:null,label:null,timer:0,
    update(data){
      const intentId=truncate(data.intentId,90);
      if(!/^wmc-recall-[a-z0-9]+-[a-z0-9]+$/.test(intentId)
        ||!['loading','success','error'].includes(data.stage))return;
      const ball=findExistingAPIBall();
      if(!ball||ball.hidden||getComputedStyle(ball).display==='none')return;
      if(this.ball!==ball){
        this.label?.remove();
        this.ball=ball;
        this.label=null;
      }
      if(!this.label){
        const label=document.createElement('span');
        label.className='wmc-api-recall-state';
        label.setAttribute('aria-hidden','true');
        ball.appendChild(label);
        this.label=label;
      }
      this.label.textContent=data.stage==='loading'?'调取中':
        data.stage==='success'?'已收到回复':'调取失败';
      this.label.hidden=false;
      ball.dataset.wmcRecallStage=data.stage;
      clearTimeout(this.timer);
      this.timer=setTimeout(()=>{
        if(this.label)this.label.hidden=true;
        if(this.ball)delete this.ball.dataset.wmcRecallStage;
      },data.stage==='loading'?15000:4500);
    }
  };
  const handlers={
    contacts:async()=>({contacts:listContacts()}),
    invite,chat,recall,pick,track,leave
  };
  w.addEventListener('message',async e=>{
    if(!validSender(e))return;
    const d=e.data;
    if(d?.type==='whatever:music:lyric-timeline'){
      float.receiveTimeline(d);
      return;
    }
    if(d?.type==='whatever:music:audio-state'){
      audioHandoff.receive(d,e.source);
      return;
    }
    if(d?.type==='whatever:music:audio-restored'){
      if(audioHandoff.returning&&audioHandoff.returnFrame===e.source)
        audioHandoff.finishReturn();
      return;
    }
    if(d?.type==='whatever:music:audio-leaving'){
      // Native persistent iframe remains mounted on exit. Handoff only
      // when the player actually needs to be replaced or removed.
      if(!float.persistentLayer())audioHandoff.takeOver();
      return;
    }
    if(d?.type==='whatever:music:ui:keyboard'){
      float.onKeyboard(d);
      return;
    }
    if(d?.type==='whatever:music:ui:recall-feedback'){
      recallJournal.update(d);
      return;
    }
    if(d?.type==='whatever:music:ui:dock-resize'){
      float.resizeOriginalChat(Math.max(-120,Math.min(120,Number(d.dx)||0)),
        Math.max(-120,Math.min(120,Number(d.dy)||0)));
      return;
    }
    if(d?.type==='whatever:music:ui:dock-drag'){
      float.dragFromChat(Math.max(-120,Math.min(120,Number(d.dx)||0)),
        Math.max(-120,Math.min(120,Number(d.dy)||0)));
      return;
    }
    if(d?.type==='whatever:music:ui:isolation-ready'){
      const layer=float.shelvedLayer?.layer;
      if(layer&&!float.nativePanelVisible){
        // Keep the original audio iframe visibly composited rather than
        // fully clipped: its DOCUMENT is now transparent and non-interactive.
        layer.style.clipPath='none';
        layer.style.pointerEvents='none';
      }
      return;
    }
    if(d?.type==='whatever:music:ui:ready'){
      // Do NOT show a virtual Char or floating dock. Merely keep the real
      // audio iframe alive from its first mount, before invitations exist.
      const frame=playerFrames().find(x=>x.contentWindow===e.source);
      if(frame){
        float.frame=frame;float.origin=e.origin;float.guardNavigation();
        if(audioHandoff.returning)audioHandoff.sendReturn();
        for(const session of sessions.values())flushMainSync(session);
      }
      return;
    }
    if(!d||d.type!=='whatever:music:request'||typeof d.id!=='string'||typeof d.action!=='string')return;
    try{
      const handler=handlers[d.action];
      if(!handler&&d.action!=='ui')throw Error('未知操作');
      // Both lyric and original-chat geometry come from this authenticated iframe.
      const result=d.action==='ui'?float.update(d.payload||{},e.source,e.origin):await handler(d.payload||{});
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:true,result},responseOrigin(e));
    }catch(error){
      e.source.postMessage({type:'whatever:music:response',id:d.id,ok:false,error:truncate(error?.message||'操作失败',240)},responseOrigin(e));
    }
  });
  // Deliver new real Messages messages to the same original listening panel.
  // The private music adapter only renders these; it never re-sends them to AI.
  function flushMainSync(session){
    if(!session?.pendingMain?.length||!float.frame?.isConnected)return;
    const entries=session.pendingMain.splice(0,session.pendingMain.length);
    float.command('main-chat-sync',{contactId:session.contactId,entries});
  }
  function onMainThreadChanged(contactId,messages){
    const session=sessions.get(sessionKey(String(contactId)));
    if(!session||session.status!=='accepted'||session.identityId!==activeIdentity()
      ||!Array.isArray(messages))return;
    for(const m of messages){
      if(!m||m.music||m.id==null||typeof m.text!=='string'||!m.text.trim())continue;
      const id=String(m.id);
      if(session.mainSeen.has(id))continue;
      session.mainSeen.add(id);
      session.pendingMain.push({id,me:!!m.me,text:truncate(m.text,200)});
    }
    if(session.pendingMain.length>100)session.pendingMain.splice(0,session.pendingMain.length-100);
    flushMainSync(session);
  }
  // The existing chat room renders a *card* for typed invite messages, while the
  // original music chatPanel remains the sole music conversation window.
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('.wmc-song-card'))return;
    if(typeof w.openApp==='function')w.openApp('music');
  });
  const theme=document.createElement('style');
  theme.textContent=[
    // Reuse the private messages.css file attachment shape and dimensions.
    // Its old pink folder icon becomes a real album sleeve + black vinyl.
    '.messages-app #thread .mrow.wmc-card-row{display:flex!important;width:100%;box-sizing:border-box;flex-direction:row-reverse!important;align-items:flex-end;margin:9px 0;gap:0;min-width:0;padding-right:0!important}',
    '.messages-app #thread .wmc-song-card.ff-card{appearance:none;border:1px solid #d9dadd!important;background:#fff!important;color:#3a3a3e!important;min-width:0;max-width:min(216px,calc(100vw - 80px));width:auto;box-sizing:border-box;padding:9px 10px;display:inline-flex!important;align-items:center;gap:8px;cursor:pointer;margin-right:12px!important;box-shadow:none!important;filter:none!important}',
    '.messages-app .wmc-song-art.ff-mini{position:relative;flex:0 0 54px!important;width:54px!important;height:45px!important;overflow:visible}',
    '.messages-app .wmc-card-vinyl{position:absolute;right:0;top:4px;width:38px;height:38px;border-radius:50%;background:repeating-radial-gradient(circle,#101010 0 2px,#262626 3px,#080808 4px,#191919 5px);box-shadow:none}',
    '.messages-app .wmc-card-vinyl:after{content:"";position:absolute;left:15px;top:15px;width:8px;height:8px;border-radius:50%;background:#dedee1;border:2px solid #555}',
    '.messages-app .wmc-card-sleeve{position:absolute;left:0;top:3px;width:39px;height:39px;border-radius:5px;background:#e2dce2;overflow:hidden;box-shadow:none;display:grid;place-items:center}',
    '.messages-app .wmc-card-sleeve:before{content:"♫";font:600 19px system-ui,sans-serif;color:#777;position:absolute;inset:0;display:grid;place-items:center}',
    '.messages-app .wmc-card-cover{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:cover;border:0}',
    '.messages-app .wmc-card-cover[hidden]{display:none!important}',
    '.messages-app .wmc-song-text.ff-txt{display:flex;flex-direction:column;min-width:0;gap:3px;flex:1}',
    '.messages-app .wmc-song-text .ff-n{font-size:14px;color:#3a3a3e!important;font-weight:600;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.messages-app .wmc-song-text .ff-m{font-size:11px;color:#8a8a90!important;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.messages-app .wmc-song-card:focus-visible{outline:2px solid #222;outline-offset:3px}',
    '@media(max-width:350px){.messages-app #thread .wmc-song-card{min-width:0!important;max-width:min(202px,calc(100vw - 66px))!important;gap:7px!important;padding:8px 9px}}',
    // Keep Quick Cruise status switching intact; suppress only its left flare.
    '#quickCruiseBall.qc-glow-left::after{display:none!important}',
    '.wmc-api-recall-state{position:absolute;right:calc(100% + 7px);top:50%;transform:translateY(-50%);z-index:2;display:block;white-space:nowrap;pointer-events:none;padding:6px 9px;border:1px solid #e4e4e8;border-radius:999px;background:#fff;color:#444;font:500 11px/1.3 system-ui,sans-serif;box-shadow:0 2px 9px #0001}',
    '.wmc-api-recall-state[hidden]{display:none!important}',
    // Keep the original room bubbles, with lightweight listening session rules.
    '.messages-app #thread .wmc-listening-divider{width:100%;display:flex;align-items:center;gap:11px;margin:11px 0 8px;padding:0 11px;box-sizing:border-box;pointer-events:none}',
    '.messages-app #thread .wmc-listening-divider::before,.messages-app #thread .wmc-listening-divider::after{content:"";height:1px;flex:1 1 auto;background:#e9e9ed}',
    '.messages-app #thread .wmc-listening-divider-label{flex:0 0 auto;border-radius:999px;background:#f5f5f6;color:#999aa1;padding:4px 11px;font:500 10.5px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:.02em}',
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
    onMainThreadChanged,
    safeMusic
  });
})(window);