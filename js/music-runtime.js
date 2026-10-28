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
      const timer=setTimeout(()=>{waiting.delete(id);reject(Error(action==='contacts'?'联系人读取超时，请重试':'聊天室响应超时'));},action==='contacts'?10000:55000);
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
    const eyebrow=node('span','wmc-eyebrow','♫  LISTEN TOGETHER');
    const close=node('button','wmc-close','×');
    close.type='button';close.setAttribute('aria-label','关闭邀请');
    top.append(eyebrow,close);
    const heading=node('h2','wmc-title','邀请一起听');
    heading.id='wmcHeading';
    const subtitle=node('p','wmc-subtitle','选择一位 Char，分享这一刻的音乐。');
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
    const footer=node('p','wmc-footer','邀请会作为歌曲卡片，出现在你们的聊天室');
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
      thumb.textContent=String(contact.name||'?').trim().charAt(0)||'?';
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
      }else if(e.key==='Escape')closeChoices();
    });
    choices.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        focusOption(activeOption+(e.key==='ArrowDown'?1:-1));
      }else if(e.key==='Escape'||e.key==='Tab'){
        if(e.key==='Escape')e.preventDefault();
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
          const avatar=node('span','wmc-contact-avatar',String(contact.name||'?').trim().charAt(0)||'?');
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
  function install(){
    if(!w.ListenTogether?.setTransport){console.warn('[Music Chat] ListenTogether unavailable');return;}
    w.ListenTogether.setTransport({send(msg){
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
        participant=null;
      }
    }});
    w.toggleTogether=function(){
      if(w.ListenTogether.isActive())w.ListenTogether.stop();
      else inviteModal();
    };
    w.WhateverMusicSnapshot=snapshot;
    console.info('[Music Chat] Chat transport mounted on original chatPanel');
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
    '@media(prefers-reduced-motion:reduce){.wmc-mask,.wmc-sheet,.wmc-art,.wmc-eq i{animation:none!important}.wmc-option{transition:none}}'
  ].join('\n');
  document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(install),{once:true});
  else queueMicrotask(install);
})(window);