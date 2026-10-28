/* Chérie Music: ORIGINAL draggable chatPanel + canonical Whatever chat. */
(function (w) {
  'use strict';
  if(w.__wmcInstalled)return;
  w.__wmcInstalled=true;
  let participant=null, busy=false, dialog=null, seq=0;
  const waiting=new Map();
  // srcdoc/sandboxed music iframes have the opaque origin "null".  The
  // parent is the only target window; use its real origin when the browser
  // exposes a referrer, otherwise the narrowly scoped parent-window fallback.
  const parentOrigin=(()=>{
    try{const x=new URL(document.referrer);return x.origin!=='null'?x.origin:'*';}
    catch{return '*';}
  })();
  const trim=(v,n=200)=>String(v??'').trim().slice(0,n);
  function snapshot(){
    const audio=document.getElementById('realAudio');
    let track=null,lines=[],active=-1,playlist=[];
    try{
      if(typeof currentTrackList!=='undefined'&&Array.isArray(currentTrackList)){
        playlist=currentTrackList.slice(0,50).map(x=>({id:String(x.id||''),title:trim(x.title,140),artist:trim(x.artist,100)}));
        if(typeof currentIndex!=='undefined'&&currentIndex>=0)track=currentTrackList[currentIndex]||null;
      }
      if(typeof lyricState!=='undefined'){
        lines=Array.isArray(lyricState.lines)?lyricState.lines:[];
        active=Number.isInteger(lyricState.active)?lyricState.active:-1;
      }
    }catch(e){console.warn('[Music Chat] player snapshot',e);}
    const title=track?.title||document.getElementById('playingTrackName')?.textContent||document.getElementById('drawerSongName')?.textContent||'未知歌曲';
    const artist=track?.artist||document.getElementById('playingTrackArtist')?.textContent||'';
    const current=active>=0?lines[active]:null;
    const context=active>=0?lines.slice(Math.max(0,active-2),Math.min(lines.length,active+3))
      .map(x=>trim(x.text,120)+(x.tr?'（'+trim(x.tr,100)+'）':'')).join(' / '):'';
    return {songId:String(track?.id||''),title:trim(title,160),artist:trim(artist,120),
      album:trim(track?.album||'',120),cover:trim(track?.cover||'',1000),
      position:audio?.currentTime||0,duration:Number.isFinite(audio?.duration)?audio.duration:0,
      lyric:trim(current?.text||document.querySelector('.lyric-line.active .lyric-main')?.textContent||'',220),
      context:trim(context,1200),playlist};
  }
  function rpc(action,payload={}){
    return new Promise((resolve,reject)=>{
      if(w.parent===w){reject(Error('请从 Whatever 主应用打开音乐'));return;}
      const id='music-'+Date.now()+'-'+(++seq);
      const timer=setTimeout(()=>{waiting.delete(id);reject(Error(action==='contacts'?'联系人读取超时，请重试':'聊天室响应超时'));},action==='contacts'?10000:action==='ui'?5000:55000);
      waiting.set(id,{resolve,reject,timer});
      w.parent.postMessage({type:'whatever:music:request',id,action,payload},parentOrigin);
    });
  }
  w.addEventListener('message',ev=>{
    if(ev.source!==w.parent||(parentOrigin!=='*'&&ev.origin!==parentOrigin))return;
    const d=ev.data;
    if(!d||d.type!=='whatever:music:response')return;
    const p=waiting.get(d.id);if(!p)return;
    waiting.delete(d.id);clearTimeout(p.timer);
    if(d.ok)p.resolve(d.result);else p.reject(Error(d.error||'聊天室请求失败'));
  });
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  function closeDialog(){dialog?.remove();dialog=null;}
  function notify(t){if(typeof w.showToast==='function')w.showToast(t);else console.info('[Music Chat]',t);}
  function inviteModal(){
    if(busy)return;
    closeDialog();
    const mask=node('div','wmc-mask'),sheet=node('section','wmc-sheet');
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-labelledby','wmcHeading');
    const top=node('div','wmc-top');
    const eyebrow=node('span','wmc-eyebrow','A LITTLE MUSIC FOR TWO');
    const close=node('button','wmc-close','×');
    close.type='button';close.setAttribute('aria-label','关闭邀请');
    top.append(eyebrow,close);
    const heading=node('h2','wmc-title','Listen Together');
    heading.id='wmcHeading';
    const subtitle=node('p','wmc-subtitle','A moment, shared in sound.');
    const track=snapshot();
    const album=node('div','wmc-album');
    const art=node('div','wmc-art');
    const vinylLabel=node('div','wmc-vinyl-label','♫');
    art.append(vinylLabel);
    const cover=track.cover;
    if(cover && /^(https?:|data:image\/)/i.test(cover)){
      const img=node('img','wmc-cover');
      img.alt='歌曲封面';
      img.src=cover;
      img.onerror=()=>img.remove();
      vinylLabel.replaceChildren(img);
    }
    const songBox=node('div','wmc-song-info');
    const albumLabel=node('span','wmc-song-label','NOW PLAYING');
    const songName=node('div','wmc-song-title',track.title);
    const artist=node('div','wmc-song-artist',track.artist||'未知歌手');
    songBox.append(albumLabel,songName,artist);
    const bars=node('div','wmc-eq');
    bars.setAttribute('aria-hidden','true');
    bars.append(node('i'),node('i'),node('i'));
    album.append(art,songBox,bars);

    const pickLabel=node('div','wmc-pick-label','邀请联系人');
    const picker=node('div','wmc-picker');
    const chooser=node('button','wmc-select-toggle');
    chooser.id='wmcContact';chooser.type='button';chooser.disabled=true;
    chooser.setAttribute('aria-haspopup','listbox');
    chooser.setAttribute('aria-expanded','false');
    chooser.setAttribute('aria-controls','wmcContactOptions');
    chooser.setAttribute('aria-label','选择邀请联系人');
    const thumb=node('span','wmc-contact-initial','♡');
    const chosenText=node('span','wmc-selected-text','正在加载联系人…');
    const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');
    arrow.setAttribute('viewBox','0 0 24 24');
    arrow.setAttribute('width','18');arrow.setAttribute('height','18');
    arrow.setAttribute('fill','none');arrow.setAttribute('stroke','currentColor');
    arrow.setAttribute('stroke-width','1.8');
    arrow.setAttribute('stroke-linecap','round');
    arrow.setAttribute('stroke-linejoin','round');
    arrow.setAttribute('aria-hidden','true');
    arrow.classList.add('wmc-chevron');
    const arrowPath=document.createElementNS('http://www.w3.org/2000/svg','path');
    arrowPath.setAttribute('d','m6 9 6 6 6-6');
    arrow.appendChild(arrowPath);
    chooser.append(thumb,chosenText,arrow);
    const choices=node('div','wmc-contact-menu');
    choices.id='wmcContactOptions';
    choices.setAttribute('role','listbox');
    choices.setAttribute('aria-label','选择联系人');
    choices.hidden=true;
    picker.append(chooser,choices);

    const actionLabel=node('p','wmc-action-label','邀请方式');
    const actions=node('div','wmc-actions');
    function option(css,icon,title,description){
      const button=node('button','wmc-option '+css);
      button.type='button';
      const glyph=node('span','wmc-option-icon',icon);
      const words=node('span','wmc-option-copy');
      words.append(node('strong',null,title),node('small',null,description));
      button.append(glyph,words,node('span','wmc-option-arrow','›'));
      return button;
    }
    const direct=option('wmc-direct','♪','直接同意','现在就开始一起听');
    const ask=option('wmc-ask','?','先问 Char','让 Ta 自己决定要不要加入');
    direct.disabled=ask.disabled=true;
    actions.append(direct,ask);
    const note=node('p','wmc-notice','正在读取联系人…');
    const retry=node('button','wmc-retry','重新读取联系人');
    retry.type='button';retry.hidden=true;
    note.setAttribute('role','status');
    note.setAttribute('aria-live','polite');
    const footer=node('p','wmc-footer','Only the song card appears in your chat.');
    sheet.append(top,heading,subtitle,album,pickLabel,picker,actionLabel,actions,note,retry,footer);
    mask.append(sheet);
    mask.addEventListener('click',e=>{if(e.target===mask&&!busy)closeDialog();});
    close.addEventListener('click',()=>{if(!busy)closeDialog();});
    mask.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!busy){e.preventDefault();closeDialog();}
    });
    document.body.append(mask);
    dialog=mask;close.focus();

    let contacts=[];
    let selectedId='';
    let activeOption=0;
    const optionButtons=[];
    function realAvatar(contact, className) {
      const fallback=String(contact?.name||'?').trim().charAt(0)||'?';
      const wrap=node('span',className,fallback);
      const src=String(contact?.avatar||'');
      if(!/^(?:https?:|blob:|data:image\/)/i.test(src))return wrap;
      const img=node('img','wmc-avatar-image');
      img.alt='';
      img.loading='lazy';
      img.referrerPolicy='no-referrer';
      img.src=src;
      img.onerror=()=>{img.remove();wrap.textContent=fallback;};
      wrap.replaceChildren(img);
      return wrap;
    }
    function selectedAvatar(contact) {
      const el=realAvatar(contact,'wmc-contact-initial');
      thumb.replaceChildren(...Array.from(el.childNodes));
      if(!thumb.childNodes.length)thumb.textContent=el.textContent||'?';
    }
    function closeChoices(returnFocus=false){
      choices.hidden=true;
      picker.classList.remove('wmc-picker-open');
      chooser.setAttribute('aria-expanded','false');
      if(returnFocus) chooser.focus();
    }
    function focusOption(index){
      if(!optionButtons.length)return;
      activeOption=(index+optionButtons.length)%optionButtons.length;
      optionButtons[activeOption].focus();
    }
    function openChoices(){
      if(chooser.disabled||busy||!optionButtons.length)return;
      choices.hidden=false;
      picker.classList.add('wmc-picker-open');
      chooser.setAttribute('aria-expanded','true');
    }
    function chooseContact(contact,returnFocus=true){
      selectedId=String(contact.id);
      chosenText.textContent=String(contact.name||'未命名');
      selectedAvatar(contact);
      optionButtons.forEach(button=>{
        const selected=button.dataset.contactId===selectedId;
        button.setAttribute('aria-selected',String(selected));
        button.classList.toggle('wmc-contact-selected',selected);
      });
      closeChoices(returnFocus);
    }
    chooser.addEventListener('click',()=>{
      if(choices.hidden)openChoices();
      else closeChoices();
    });
    chooser.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key===' '){
        e.preventDefault();
        openChoices();
        focusOption(e.key==='ArrowUp'?optionButtons.length-1:0);
      }else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeChoices(true);}
    });
    choices.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        focusOption(activeOption+(e.key==='ArrowDown'?1:-1));
      }else if(e.key==='Escape'||e.key==='Tab'){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}
        closeChoices(e.key==='Escape');
      }else if(e.key==='Home'||e.key==='End'){
        e.preventDefault();focusOption(e.key==='Home'?0:optionButtons.length-1);
      }
    });
    sheet.addEventListener('click',e=>{
      if(!picker.contains(e.target))closeChoices();
    });
    async function begin(mode){
      if(busy)return;
      const contactId=selectedId;
      if(!contactId){note.textContent='先选择一位联系人 ♡';return;}
      closeChoices();
      busy=true;direct.disabled=ask.disabled=close.disabled=chooser.disabled=true;
      note.textContent=mode==='ask'?'已发送邀请，正在等待 Char 回应…':'正在发送一起听邀请…';
      try{
        const result=await rpc('invite',{contactId,mode,music:snapshot()});
        if(result.accepted){
          participant={id:contactId,...result.contact};
          w.ListenTogether.start({id:contactId,name:result.contact.name,avatar:result.contact.avatar});
          closeDialog();
          if(Array.isArray(result.messages))for(const t of result.messages)w.ListenTogether.receive(t);
          mountPlayerEvents();
          sendFloatState(true,false);
          notify('已和 '+result.contact.name+' 开始一起听');
        }else{
          note.textContent=result.declined?'Ta 婉拒了这次邀请':'Ta 还没有明确答复';
          if(result.messages?.length)note.textContent+='：'+result.messages.join(' ');
        }
      }catch(e){note.textContent=trim(e.message||e,220);}
      finally{
        busy=false;direct.disabled=ask.disabled=false;
        close.disabled=false;chooser.disabled=false;
      }
    }
    direct.addEventListener('click',()=>begin('direct'));
    ask.addEventListener('click',()=>begin('ask'));
    async function loadContacts(){
      retry.hidden=true;
      note.textContent='正在读取联系人…';
      chooser.disabled=direct.disabled=ask.disabled=true;
      chosenText.textContent='正在加载联系人…';
      selectedId='';
      closeChoices();
      choices.replaceChildren();
      optionButtons.length=0;
      try{
        const result=await rpc('contacts');
        if(dialog!==mask)return;
        contacts=Array.isArray(result.contacts)?result.contacts:[];
        contacts.forEach((contact,index)=>{
          const button=node('button','wmc-contact-option');
          button.type='button';button.dataset.contactId=String(contact.id);
          button.setAttribute('role','option');
          button.setAttribute('aria-selected','false');
          button.setAttribute('tabindex','-1');
          const avatar=realAvatar(contact,'wmc-contact-avatar');
          const name=node('span','wmc-contact-name',String(contact.name||'未命名'));
          const check=node('span','wmc-contact-check','✓');
          check.setAttribute('aria-hidden','true');
          button.append(avatar,name,check);
          button.addEventListener('click',()=>chooseContact(contact));
          button.addEventListener('focus',()=>{activeOption=index;});
          choices.appendChild(button);
          optionButtons.push(button);
        });
        chooser.disabled=!contacts.length;
        chosenText.textContent=contacts.length?'选择一位 Char':'暂无可邀请的 Char';
        thumb.textContent='♡';
        direct.disabled=ask.disabled=!contacts.length;
        note.textContent=contacts.length?'':'还没有联系人，请先在聊天室创建一位 Char';
        retry.hidden=!!contacts.length;
      }catch(error){
        if(dialog!==mask)return;
        retry.hidden=false;
        chosenText.textContent='联系人读取失败';
        note.textContent='联系人读取失败：'+trim(error?.message||error,100);
      }
    }
    retry.addEventListener('click',loadContacts);
    loadContacts();
  }
  // Transient speaking bubbles: multiple tails stack upward; old ones fade.
  // The original ListenTogether chat list remains the full conversation, and
  // all messages are saved separately in common memory by the parent bridge.
  let liveFeed=null;
  function stackBubble(side,value){
    const text=trim(value,200);
    if(!text)return;
    if(!liveFeed){
      liveFeed=node('div','wmc-speech-stack');
      liveFeed.setAttribute('aria-live','off');
      document.body.appendChild(liveFeed);
    }
    const line=node('div','wmc-speech-row '+(side==='me'?'wmc-speech-me':'wmc-speech-them'),text);
    liveFeed.appendChild(line);
    while(liveFeed.children.length>4){const oldest=liveFeed.firstElementChild;if(!oldest)break;oldest.remove();}
    requestAnimationFrame(()=>line.classList.add('wmc-speech-visible'));
    setTimeout(()=>line.classList.add('wmc-speech-fading'),6500);
    setTimeout(()=>line.remove(),7600);
  }
  function protectOnlyAutomaticKeyboard(){
    // Keep all ORIGINAL '调取' and '发送' buttons and the quick-recall panel.
    // Suppress the old music openChat()/openInline() auto .focus() calls ONLY.
    // An actual click on send or a manual recall chip can still restore focus.
    for(const id of ['chatInput','duetChatInput']){
      const el=document.getElementById(id);
      if(!el||el.__wmcAutoKeyboardGuard)continue;
      const nativeFocus=el.focus.bind(el);
      el.__wmcAutoKeyboardGuard=true;
      el.__wmcAllowExplicitFocus=false;
      el.focus=function(...args){
        if(!el.__wmcAllowExplicitFocus)return;
        el.__wmcAllowExplicitFocus=false;
        return nativeFocus(...args);
      };
    }
    if(!document.__wmcFocusIntentInstalled){
      document.__wmcFocusIntentInstalled=true;
      document.addEventListener('click',e=>{
        // Triggered by REAL user interaction with existing controls, not
        // when the avatar or floating lyric opens the old chatPanel.
        if(e.isTrusted===false)return;
        const t=e.target?.closest?.('.quick-chip,button[aria-label="发送"]');
        if(!t)return;
        const id=t.closest?.('#duetInput') || t.closest?.('#duetQuick') ? 'duetChatInput' : 'chatInput';
        const input=document.getElementById(id);
        if(input){
          input.__wmcAllowExplicitFocus=true;
          setTimeout(()=>{input.__wmcAllowExplicitFocus=false;},0);
        }
      },true);
    }
  }
  // Sync only CHANGED lyrics, never the whole playlist on every time tick.
  let lastFloatSample=0,lastFloatKey='',entrySeq=0;
  function sendFloatState(force=false,entry=null){
    if(!participant)return;
    const now=Date.now();
    if(!force&&!entry&&now-lastFloatSample<900)return;
    lastFloatSample=now;
    // Lightweight lyric probe: no 50-song playlist map, album cover, or
    // AI-context preparation on audio timeupdate (often 4-10 times/sec).
    let songId='',title='',artist='',lyric='',lyricPrev='',lyricNext='',lyricIndex=-1;
    try {
      if(typeof currentTrackList!=='undefined'&&typeof currentIndex!=='undefined'&&currentIndex>=0){
        const track=currentTrackList[currentIndex];
        songId=String(track?.id||'');
        title=String(track?.title||'');
        artist=String(track?.artist||'');
      }
      if(typeof lyricState!=='undefined'){
        const lines=Array.isArray(lyricState.lines)?lyricState.lines:[];
        const index=lyricState.active;
        lyricIndex=Number.isInteger(index)?index:-1;
        const readLine=i=>i>=0&&i<lines.length?String(lines[i]?.text||''):'';
        lyric=readLine(lyricIndex);
        lyricPrev=readLine(lyricIndex-1);
        lyricNext=readLine(lyricIndex+1);
      }
    }catch(_){}
    if(!title)title=document.getElementById('playingTrackName')?.textContent||'未知歌曲';
    if(!artist)artist=document.getElementById('playingTrackArtist')?.textContent||'';
    if(!lyric)lyric=document.querySelector('.lyric-line.active .lyric-main')?.textContent||'';
    const audio=document.getElementById('realAudio');
    const playing=!!audio&&!audio.paused&&!audio.ended;
    const fingerprint=[songId,title,lyricIndex,lyricPrev,lyric,lyricNext,playing].join('\u001f');
    if(!force&&!entry&&fingerprint===lastFloatKey)return;
    lastFloatKey=fingerprint;
    const payload={active:true,contactId:participant.id,name:participant.name,avatar:participant.avatar||'',
      music:{title:trim(title,160),artist:trim(artist,120),songId:trim(songId,90)},
      lyric:trim(lyric,170),lyricPrev:trim(lyricPrev,170),
      lyricNext:trim(lyricNext,170),lyricIndex,playing};
    if(entry)payload.entry={id:'music-entry-'+(++entrySeq),me:!!entry.me,text:trim(entry.text,200)};
    rpc('ui',payload).catch(e=>console.warn('[Music Float] update unavailable',e.message));
  }
  function mountPlayerEvents(){
    protectOnlyAutomaticKeyboard();
    document.getElementById('wmcMinimize')?.remove();
    const audio=document.getElementById('realAudio');
    if(audio&&!audio.__wmcWatch){
      audio.__wmcWatch=true;
      for(const event of ['play','pause','loadedmetadata','ended','durationchange'])
        audio.addEventListener(event,()=>sendFloatState(true));
      audio.addEventListener('timeupdate',()=>sendFloatState(false));
    }
  }
  w.addEventListener('message',ev=>{
    if(ev.source!==w.parent||(parentOrigin!=='*'&&ev.origin!==parentOrigin))return;
    const d=ev.data||{};
    if(d.type!=='whatever:music:ui:command'||!participant)return;
    if(d.command==='chat'){
      // Open the ORIGINAL music chatPanel, exactly as its partner avatar does.
      w.ListenTogether?.openChat?.();
    }else if(d.command==='send'){
      const message=trim(d.text,200);
      if(message)w.ListenTogether?.send?.(message);
    }else if(d.command==='play'){
      const audio=document.getElementById('realAudio');
      if(!audio)return;
      if(audio.paused)Promise.resolve(audio.play()).catch(()=>{});
      else audio.pause();
    }else if(d.command==='panel-sync'){lastBounds='';requestNativeBounds();}
    else if(d.command==='sync')sendFloatState(true);
  });
  // Send the ORIGINAL chatPanel's geometry to the parent. A clipped, mounted
  // iframe can render its real, draggable chat over any other Whatever app.
  // No duplicated chat form, no audio.src or base style modifications.
  let boundsPending=false,lastBounds='';
  function sendNativePanelState(open){
    if(!participant)return;
    if(!open){
      lastBounds='';
      rpc('ui',{active:true,contactId:participant.id,panel:{open:false}}).catch(()=>{});
      return;
    }
    const panel=document.getElementById('chatPanel');
    if(!panel?.classList.contains('open'))return;
    const r=panel.getBoundingClientRect();
    if(r.width<=0||r.height<=0)return;
    const rect={left:r.left,top:r.top,width:r.width,height:r.height};
    const viewport={width:w.innerWidth,height:w.innerHeight};
    const fingerprint=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join('/');
    if(lastBounds===fingerprint)return;
    lastBounds=fingerprint;
    rpc('ui',{active:true,contactId:participant.id,panel:{open:true,rect,viewport}}).catch(()=>{});
  }
  function requestNativeBounds(){
    if(boundsPending)return;
    boundsPending=true;
    requestAnimationFrame(()=>{
      boundsPending=false;
      sendNativePanelState(true);
    });
  }
  function mountNativePanelSync(){
    const lt=w.ListenTogether;
    if(!lt||lt.__wmcPanelSync)return;
    if(typeof lt.openChat!=='function'||typeof lt.closeChat!=='function')return;
    lt.__wmcPanelSync=true;
    const originalOpen=lt.openChat.bind(lt);
    const originalClose=lt.closeChat.bind(lt);
    lt.openChat=function(...args){
      const result=originalOpen(...args);
      lastBounds='';requestNativeBounds();
      return result;
    };
    lt.closeChat=function(...args){
      const result=originalClose(...args);
      sendNativePanelState(false);
      return result;
    };
    const head=document.getElementById('chatHead');
    if(head){
      head.addEventListener('pointermove',requestNativeBounds);
      head.addEventListener('pointerup',requestNativeBounds);
    }
    w.addEventListener('resize',requestNativeBounds);
  }
  let installAttempts=0;
  let canonicalTransport=null;
  function install(){
    if(!w.ListenTogether?.setTransport){
      if(++installAttempts<=30)setTimeout(install,180);
      else console.warn('[Music Chat] ListenTogether unavailable; demo disabled by server guard');
      return;
    }
    if (canonicalTransport) {
      w.ListenTogether.setTransport(canonicalTransport);
      return;
    }
    const originalSetTransport=w.ListenTogether.setTransport.bind(w.ListenTogether);
    // Older music-api.js may register another standalone AI transport during
    // DOMContentLoaded. Do not let that override the canonical Char bridge.
    w.ListenTogether.setTransport=function(candidate){
      if(canonicalTransport&&candidate!==canonicalTransport){
        console.warn('[Music Chat] Ignored obsolete music-only AI transport');
        return;
      }
      return originalSetTransport(candidate);
    };
    canonicalTransport={send(msg){
      if(!participant)return;
      const contactId=participant.id;
      if(msg.type==='chat'){
        rpc('chat',{contactId,text:msg.text,music:snapshot()}).then(r=>{
          if(participant?.id===contactId)for(const t of r.messages||[])w.ListenTogether.receive(t);
        }).catch(e=>notify('AI 回复失败：'+trim(e.message,130)));
      }else if(msg.type==='pick-request'){
        rpc('pick',{contactId,music:snapshot()}).then(r=>{
          if(participant?.id!==contactId)return;
          for(const t of r.messages||[])w.ListenTogether.receive(t);
          if(r.songId)w.ListenTogether.partnerPick(r.songId);
        }).catch(e=>notify(trim(e.message,180)));
      }else if(msg.type==='track'){
        rpc('track',{contactId,music:snapshot()}).catch(e=>console.warn('[Music Chat] track',e.message));
      }else if(msg.type==='leave'){
        rpc('leave',{contactId}).catch(e=>console.warn('[Music Chat] leave',e.message));
        rpc('ui',{active:false,contactId}).catch(()=>{});
        participant=null;
      }
    }};
    w.ListenTogether.setTransport(canonicalTransport);
    mountPlayerEvents();
    mountNativePanelSync();
    if(!w.__wmcDecoratedReceive){
      const originalReceive=w.ListenTogether.receive.bind(w.ListenTogether);
      w.ListenTogether.receive=function(text){
        originalReceive(text);
        stackBubble('them',text);
        sendFloatState(true,{me:false,text});
      };
      w.__wmcDecoratedReceive=true;
    }
    if(!w.__wmcDecoratedSend){
      const originalSend=w.ListenTogether.send.bind(w.ListenTogether);
      w.ListenTogether.send=function(text){
        const ok=originalSend(text);
        if(ok){stackBubble('me',text);sendFloatState(true,{me:true,text});}
        return ok;
      };
      w.__wmcDecoratedSend=true;
    }
    const openInvite=function(){
      if(w.ListenTogether.isActive())w.ListenTogether.stop();
      else inviteModal();
    };
    // Guard in protected music.js delegates here; never starts a virtual lover.
    w.__whateverMusicInviteReady=openInvite;
    w.toggleTogether=openInvite;
    w.WhateverMusicSnapshot=snapshot;
    console.info('[Music Chat] Canonical Char transport mounted; virtual mode disabled');
  }
  const style=document.createElement('style');
  style.textContent=[
    '.wmc-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px 15px;box-sizing:border-box;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:wmcFade .18s ease}',
    '.wmc-sheet{box-sizing:border-box;width:min(382px,100%);max-height:min(91vh,720px);overflow:auto;overscroll-behavior:contain;border-radius:22px;padding:24px 22px;background:#000!important;color:#fff;border:1px solid #323232;box-shadow:0 24px 72px #000b;font:14px/1.5 system-ui,-apple-system,sans-serif;animation:wmcRise .2s ease-out}',
    '.wmc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.wmc-eyebrow{color:#bcbcbc;font-size:10px;letter-spacing:.19em;font-weight:700}',
    '.wmc-close{width:30px;height:30px;flex:none;border:1px solid #454545;border-radius:50%;color:#fff;background:#000;font-size:23px;line-height:22px;display:grid;place-items:center;cursor:pointer}',
    '.wmc-title{font-size:23px;font-weight:650;letter-spacing:-.035em;line-height:1.3;margin:0 0 7px;color:#fff}.wmc-subtitle{margin:0 0 22px;color:#999;font-size:12px}',
    '.wmc-album{display:flex;align-items:center;gap:14px;background:#080808;border:1px solid #303030;border-radius:16px;padding:14px 12px;margin:0 0 24px;min-width:0;box-shadow:inset 0 1px #ffffff08}',
    '.wmc-art{height:88px;width:88px;flex:none;display:grid;place-items:center;position:relative;border-radius:50%;background:repeating-radial-gradient(circle,#121212 0px,#121212 2px,#282828 3px,#080808 4px,#121212 5px);border:1px solid #343434;box-shadow:4px 6px 14px #0008;animation:wmcSpin 18s linear infinite}',
    '.wmc-art:before{content:"";position:absolute;inset:6px;border-radius:50%;background:conic-gradient(from 70deg,#ffffff12,transparent 15%,#ffffff1c 33%,transparent 49%,#ffffff0c 65%,transparent 78%,#ffffff12);pointer-events:none}',
    '.wmc-vinyl-label{width:42px;height:42px;border-radius:50%;position:relative;display:grid;place-items:center;overflow:hidden;background:#f1f1f1;color:#111;font-size:19px;box-shadow:0 0 0 2px #080808,0 0 0 3px #ffffff29}',
    '.wmc-vinyl-label:after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);height:5px;width:5px;background:#111;border-radius:50%;border:1px solid #ddd}',
    '.wmc-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.wmc-song-info{min-width:0;flex:1}.wmc-song-label{font-size:9px;letter-spacing:.14em;color:#777}',
    '.wmc-song-title{margin-top:5px;font-size:16px;font-weight:650;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wmc-song-artist{color:#999;font-size:12px;margin-top:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.wmc-eq{height:22px;display:flex;gap:3px;align-items:center;opacity:.8;flex:none}.wmc-eq i{display:block;width:2px;background:#fff;border-radius:3px;height:9px;animation:wmcBeat 1.15s ease-in-out infinite alternate}.wmc-eq i:nth-child(2){height:19px;animation-delay:-.35s}.wmc-eq i:nth-child(3){height:13px;animation-delay:-.75s}',
    '.wmc-pick-label,.wmc-action-label{display:block;margin:0 0 9px;color:#fff;font-size:12px;font-weight:600}',
    '.wmc-picker{position:relative;display:flex;align-items:center;gap:11px;height:53px;padding:0 14px;background:#070707;border:1px solid #414141;border-radius:12px;margin-bottom:22px}',
    '.wmc-contact-initial{display:grid;place-items:center;flex:none;width:29px;height:29px;border-radius:50%;color:#000;background:#fff;font-size:14px;font-weight:600}',
    '.wmc-select{flex:1;min-width:0;appearance:none;-webkit-appearance:none;border:0;outline:0;background:transparent;color:#fff;font-size:14px;padding:10px 0;cursor:pointer}.wmc-select option{background:#050505;color:#fff}',
    '.wmc-chevron{pointer-events:none;color:#fff;font-size:24px;line-height:1}.wmc-actions{display:grid;gap:10px}.wmc-option{display:flex;align-items:center;width:100%;min-height:66px;gap:12px;padding:11px 14px;border-radius:13px;text-align:left;cursor:pointer;transition:transform .14s,opacity .14s}',
    '.wmc-option:hover{transform:translateY(-1px)}.wmc-option-icon{flex:none;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;font-size:19px;background:#101010;color:#fff;border:1px solid #333}',
    '.wmc-option-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.wmc-option-copy strong{font-size:14px;font-weight:700;color:#000}.wmc-option-copy small{font-size:11px;font-weight:400;line-height:1.35;color:#444}',
    '.wmc-option-arrow{font-size:24px;opacity:.8;font-weight:300;color:#111}.wmc-direct,.wmc-ask{background:#fff;color:#000;border:1px solid #fff}.wmc-direct .wmc-option-icon,.wmc-ask .wmc-option-icon{background:#111;color:#fff;border:1px solid #111}',
    '.wmc-option:disabled,.wmc-close:disabled{opacity:.45;cursor:default;transform:none}.wmc-notice{min-height:18px;text-align:center;color:#aaa;font-size:11px;line-height:1.5;margin:15px 0 0;overflow-wrap:anywhere}',
    '.wmc-retry{display:block;margin:9px auto 0;background:#000;color:#fff;border:1px solid #888;border-radius:999px;font-size:12px;padding:7px 13px}.wmc-retry[hidden]{display:none}',
    '.wmc-footer{margin:12px 0 0;text-align:center;color:#777;font-size:10px}.wmc-option:focus-visible,.wmc-close:focus-visible,.wmc-select:focus-visible,.wmc-retry:focus-visible{outline:2px solid #fff;outline-offset:3px}',
    '@keyframes wmcBeat{to{height:3px}}@keyframes wmcSpin{to{transform:rotate(360deg)}}@keyframes wmcFade{from{opacity:0}to{opacity:1}}@keyframes wmcRise{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}',
    '@media(max-width:350px){.wmc-sheet{padding:20px 16px}.wmc-art{width:73px;height:73px}.wmc-vinyl-label{width:36px;height:36px}}',
    /* Compact layout: approx 25% shorter than the original invitation sheet. */
    '.wmc-mask{padding:10px 12px}.wmc-sheet{padding:16px 18px;border-radius:19px;overflow:visible;max-height:none}',
    '.wmc-top{margin-bottom:5px}.wmc-close{width:26px;height:26px;font-size:20px}',
    '.wmc-title{font-size:21px;margin-bottom:3px}.wmc-subtitle{font-size:11px;margin-bottom:10px}',
    '.wmc-album{padding:7px 10px;margin-bottom:11px;gap:11px;border-radius:12px}.wmc-art{width:63px;height:63px}',
    '.wmc-vinyl-label{width:32px;height:32px;font-size:15px}.wmc-song-title{font-size:14px;margin-top:3px}.wmc-song-artist{font-size:11px;margin-top:2px}.wmc-eq{height:17px}',
    '.wmc-pick-label,.wmc-action-label{font-size:11px;margin-bottom:6px}.wmc-picker{height:44px;position:relative;display:block;padding:0;margin-bottom:11px;border-radius:11px}',
    '.wmc-select-toggle{display:flex;align-items:center;gap:9px;width:100%;height:100%;padding:0 12px;background:transparent;border:0;color:#fff;text-align:left;font:13px system-ui,-apple-system,sans-serif;cursor:pointer;border-radius:11px}',
    '.wmc-select-toggle:disabled{opacity:.56;cursor:default}.wmc-selected-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.wmc-select-toggle .wmc-contact-initial{flex:none;width:25px;height:25px;font-size:12px}.wmc-chevron{display:block;flex:none;width:18px;height:18px;margin-left:auto;color:#fff;transition:transform .18s ease}',
    '.wmc-picker-open .wmc-chevron{transform:rotate(180deg)}',
    '.wmc-contact-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:30;max-height:min(186px,32vh);overflow-y:auto;overscroll-behavior:contain;background:#050505;border:1px solid #444;border-radius:12px;padding:4px;box-shadow:0 15px 40px #000d}',
    '.wmc-contact-menu[hidden]{display:none!important}.wmc-contact-option{display:flex;align-items:center;gap:10px;width:100%;min-height:43px;background:#050505;color:#fff;border:0;border-radius:9px;padding:6px 8px;text-align:left;cursor:pointer}',
    '.wmc-contact-option:hover,.wmc-contact-option:focus-visible,.wmc-contact-selected{background:#232323}.wmc-contact-avatar{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:#fff;color:#000;font-size:12px;font-weight:700}',
    '.wmc-contact-name{font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wmc-contact-check{opacity:0;font-size:14px;color:#fff}.wmc-contact-selected .wmc-contact-check{opacity:1}',
    '.wmc-contact-avatar,.wmc-contact-initial{overflow:hidden;position:relative}.wmc-avatar-image{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;flex:none}',
    '.wmc-actions{gap:7px}.wmc-option{min-height:48px;padding:6px 10px;border-radius:11px;gap:9px}.wmc-option-icon{width:27px;height:27px;font-size:16px}.wmc-option-copy{gap:0}.wmc-option-copy strong{font-size:12px}.wmc-option-copy small{font-size:10px;line-height:1.25}.wmc-option-arrow{font-size:20px}',
    '.wmc-notice{margin-top:8px;min-height:0;font-size:10px}.wmc-notice:empty{display:none}.wmc-footer{margin-top:6px;font-size:9px}',
    '.wmc-retry{margin-top:6px;padding:5px 12px;font-size:10px}',
    '.wmc-select-toggle:focus-visible,.wmc-contact-option:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '@media(max-height:560px){.wmc-mask{align-items:flex-start;overflow-y:auto}.wmc-sheet{margin:auto 0}.wmc-contact-menu{max-height:min(134px,26vh)}}',
    '@media(max-width:350px){.wmc-sheet{padding:14px 14px}.wmc-album{padding:6px 9px}.wmc-art{width:56px;height:56px}.wmc-option{min-height:45px}}',
    '.wmc-sheet{padding:13px 17px;border-radius:18px}.wmc-top{justify-content:center;position:relative;min-height:20px;margin-bottom:3px}.wmc-close{position:absolute;right:0;top:-2px;width:24px;height:24px}',
    '.wmc-eyebrow{text-align:center;font-size:8px;letter-spacing:.15em;color:#8c8c8c}.wmc-title{text-align:center;font-size:29px;line-height:1.1;font-weight:400;letter-spacing:0;margin:0 0 1px;font-family:"Snell Roundhand","Brush Script MT","Segoe Script",cursive;font-style:italic}',
    '.wmc-subtitle{text-align:center;margin:0 0 8px;font:italic 10px/1.25 Georgia,serif;letter-spacing:.02em;color:#8f8f8f}.wmc-album{margin-bottom:9px;padding:6px 10px}.wmc-pick-label,.wmc-action-label{margin-bottom:4px}.wmc-picker{margin-bottom:9px}',
    '.wmc-option{min-height:43px;padding:5px 9px}.wmc-option-icon{width:25px;height:25px}.wmc-actions{gap:6px}.wmc-footer{margin-top:4px;font-size:9px}.wmc-notice{margin-top:5px}',
    '.wmc-speech-stack{position:fixed;right:13px;bottom:calc(env(safe-area-inset-bottom,0px) + 146px);z-index:1200;width:min(285px,75vw);display:flex;flex-direction:column;align-items:flex-end;gap:9px;pointer-events:none}',
    '.wmc-speech-row{position:relative;max-width:95%;border:1px solid #ffffff1e;border-radius:14px;padding:9px 12px;font:12px/1.5 system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 5px 18px #0006;opacity:0;transform:translateY(13px);transition:opacity .38s ease,transform .38s ease}',
    '.wmc-speech-row.wmc-speech-me{align-self:flex-end;background:#fff;color:#111}.wmc-speech-row.wmc-speech-them{align-self:flex-start;background:#181818;color:#fff}',
    '.wmc-speech-row:after{content:"";position:absolute;bottom:-6px;width:10px;height:10px;background:inherit;transform:rotate(45deg);border-right:inherit;border-bottom:inherit}',
    '.wmc-speech-me:after{right:18px}.wmc-speech-them:after{left:18px}',
    '.wmc-speech-row.wmc-speech-visible{opacity:1;transform:translateY(0)}.wmc-speech-row.wmc-speech-fading{opacity:0;transform:translateY(-14px)}',
    '@media(prefers-reduced-motion:reduce){.wmc-speech-row{transition:none!important}}',
    '@media(prefers-reduced-motion:reduce){.wmc-mask,.wmc-sheet,.wmc-art,.wmc-eq i{animation:none!important}.wmc-option{transition:none}}'
  ].join('\n');
  document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(install),{once:true});
  else queueMicrotask(install);
  // Music.js and music-api.js are injected dynamically into an iframe.
  // Re-check after their own ready/load callbacks and any delayed scripts.
  document.addEventListener('DOMContentLoaded',install,{once:true});
  w.addEventListener('load',install,{once:true});
  setTimeout(install,400);
  setTimeout(install,1600);
})(window);