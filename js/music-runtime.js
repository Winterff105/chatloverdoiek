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
      const timer=setTimeout(()=>{waiting.delete(id);reject(Error('聊天室响应超时'));},55000);
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
    const heading=node('h2','wmc-title','把这首歌分享给谁？');
    heading.id='wmcHeading';
    const subtitle=node('p','wmc-subtitle','把耳机的另一半，留给特别的 Ta。');
    const track=snapshot();
    const album=node('div','wmc-album');
    const art=node('div','wmc-art','♫');
    const cover=track.cover;
    if(cover && /^(https?:|data:image\/)/i.test(cover)){
      const img=node('img','wmc-cover');
      img.alt='歌曲封面';
      img.src=cover;
      img.onerror=()=>img.remove();
      art.appendChild(img);
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

    const pickLabel=node('label','wmc-pick-label','邀请联系人');
    pickLabel.htmlFor='wmcContact';
    const picker=node('div','wmc-picker');
    const thumb=node('span','wmc-contact-initial','♡');
    const select=node('select','wmc-select');
    select.id='wmcContact';select.setAttribute('aria-label','选择联系人');
    select.disabled=true;
    const placeholder=node('option',null,'正在加载联系人…');
    placeholder.value='';select.append(placeholder);
    const chevron=node('span','wmc-chevron','⌄');
    chevron.setAttribute('aria-hidden','true');
    picker.append(thumb,select,chevron);

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
    const direct=option('wmc-direct','♥','直接同意','现在就开始一起听');
    const ask=option('wmc-ask','✧','先问 Char','由 Ta 根据性格决定要不要加入');
    direct.disabled=ask.disabled=true;
    actions.append(direct,ask);
    const note=node('p','wmc-notice','正在读取联系人…');
    note.setAttribute('role','status');
    note.setAttribute('aria-live','polite');
    const footer=node('p','wmc-footer','邀请会作为歌曲卡片，出现在你们的聊天室');
    sheet.append(top,heading,subtitle,album,pickLabel,picker,actionLabel,actions,note,footer);
    mask.append(sheet);
    mask.addEventListener('click',e=>{if(e.target===mask&&!busy)closeDialog();});
    close.addEventListener('click',()=>{if(!busy)closeDialog();});
    mask.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!busy){e.preventDefault();closeDialog();}
    });
    document.body.append(mask);
    dialog=mask;close.focus();

    let contacts=[];
    function syncContact(){
      const found=contacts.find(c=>String(c.id)===select.value);
      thumb.textContent=found?(found.name||'?').trim().charAt(0):'♡';
    }
    select.addEventListener('change',syncContact);
    async function begin(mode){
      if(busy)return;
      const contactId=select.value;
      if(!contactId){note.textContent='先选择一位联系人 ♡';return;}
      busy=true;direct.disabled=ask.disabled=close.disabled=select.disabled=true;
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
        close.disabled=false;select.disabled=false;
      }
    }
    direct.addEventListener('click',()=>begin('direct'));
    ask.addEventListener('click',()=>begin('ask'));
    rpc('contacts').then(result=>{
      if(dialog!==mask)return;
      contacts=Array.isArray(result.contacts)?result.contacts:[];
      select.replaceChildren();
      const first=node('option',null,'选择一位 Char');
      first.value='';select.append(first);
      for(const c of contacts){
        const item=node('option',null,c.name);item.value=c.id;select.append(item);
      }
      select.disabled=!contacts.length;
      direct.disabled=ask.disabled=!contacts.length;
      note.textContent=contacts.length?'选好 Char，再选择邀请方式':'还没有联系人，先在聊天室创建一位 Char 吧';
    }).catch(e=>{
      if(dialog===mask)note.textContent=trim(e.message||e,220);
    });
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
    '.wmc-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px 15px;box-sizing:border-box;background:rgba(9,9,15,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:wmcFade .2s ease}',
    '.wmc-sheet{box-sizing:border-box;width:min(385px,100%);max-height:min(92vh,740px);overflow:auto;overscroll-behavior:contain;border-radius:27px;padding:22px;background:radial-gradient(circle at 88% 0%,rgba(194,167,219,.13),transparent 50%),linear-gradient(155deg,#24212a 0%,#17161c 80%);color:#f8f4f7;border:1px solid rgba(238,222,246,.19);box-shadow:0 25px 80px #000b;font:14px/1.55 system-ui,-apple-system,sans-serif;animation:wmcRise .27s cubic-bezier(.18,.89,.3,1.13)}',
    '.wmc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.wmc-eyebrow{color:#cbb8d3;font-size:10px;letter-spacing:.17em;font-weight:700}',
    '.wmc-close{width:29px;height:29px;flex:none;border:1px solid #ffffff25;border-radius:50%;color:#d2c7d8;background:#ffffff0d;font-size:23px;line-height:22px;display:grid;place-items:center;cursor:pointer}',
    '.wmc-title{font-size:22px;font-weight:650;letter-spacing:-.04em;line-height:1.35;margin:0 0 6px}.wmc-subtitle{margin:0 0 21px;color:#ada3b1;font-size:12px}',
    '.wmc-album{display:flex;align-items:center;gap:13px;background:linear-gradient(110deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid #ffffff1a;border-radius:17px;padding:10px;margin:0 0 22px;min-width:0}',
    '.wmc-art{height:68px;width:68px;flex:none;display:grid;place-items:center;position:relative;overflow:hidden;border-radius:12px;background:linear-gradient(135deg,#9f87ac,#584e69 68%,#323041);font-size:30px;color:#fff;box-shadow:0 4px 18px #0005}',
    '.wmc-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.wmc-song-info{min-width:0;flex:1}.wmc-song-label{font-size:9px;letter-spacing:.14em;color:#ad9cbb}.wmc-song-title{margin-top:4px;font-size:15px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.wmc-song-artist{color:#b6aab7;font-size:12px;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.wmc-eq{height:22px;display:flex;gap:3px;align-items:center;opacity:.8;flex:none}.wmc-eq i{display:block;width:2px;background:#d3b0d8;border-radius:3px;height:9px;animation:wmcBeat 1.15s ease-in-out infinite alternate}.wmc-eq i:nth-child(2){height:19px;animation-delay:-.35s}.wmc-eq i:nth-child(3){height:13px;animation-delay:-.75s}',
    '.wmc-pick-label,.wmc-action-label{display:block;margin:0 0 9px;color:#e5dce7;font-size:12px;font-weight:600}',
    '.wmc-picker{position:relative;display:flex;align-items:center;gap:10px;height:51px;padding:0 13px;background:#ffffff0a;border:1px solid #ffffff2a;border-radius:14px;margin-bottom:20px}',
    '.wmc-contact-initial{display:grid;place-items:center;flex:none;width:27px;height:27px;border-radius:50%;color:#ede1f3;background:linear-gradient(140deg,#8b7499,#65566c);font-size:14px}',
    '.wmc-select{flex:1;min-width:0;appearance:none;-webkit-appearance:none;border:0;outline:0;background:transparent;color:#f8f4f7;font-size:14px;padding:10px 0;cursor:pointer}',
    '.wmc-select option{background:#27232c;color:#f8f4f7}.wmc-chevron{pointer-events:none;color:#beb1c2;font-size:24px;line-height:1}',
    '.wmc-actions{display:grid;gap:9px}.wmc-option{display:flex;align-items:center;width:100%;min-height:70px;gap:12px;padding:11px 14px;border-radius:15px;text-align:left;cursor:pointer;transition:transform .15s,border-color .15s,background .15s}',
    '.wmc-option:hover{transform:translateY(-1px)}.wmc-option-icon{flex:none;width:35px;height:35px;display:grid;place-items:center;border-radius:11px;font-size:21px}',
    '.wmc-option-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.wmc-option-copy strong{font-size:14px;font-weight:650}.wmc-option-copy small{font-size:11px;font-weight:400;line-height:1.35;opacity:.78}',
    '.wmc-option-arrow{font-size:25px;opacity:.65;font-weight:300}.wmc-direct{background:#eedde9;color:#2d2130;border:1px solid #eedde9}.wmc-direct .wmc-option-icon{background:rgba(121,73,118,.14);color:#82577d}',
    '.wmc-ask{background:rgba(255,255,255,.035);color:#ede5ef;border:1px solid rgba(255,255,255,.2)}.wmc-ask .wmc-option-icon{background:rgba(197,168,216,.12);color:#cfb8dc}',
    '.wmc-option:disabled,.wmc-close:disabled{opacity:.48;cursor:default;transform:none}.wmc-notice{min-height:18px;text-align:center;color:#cdbfd1;font-size:11px;line-height:1.5;margin:12px 0 0;overflow-wrap:anywhere}',
    '.wmc-footer{margin:12px 0 0;text-align:center;color:#817887;font-size:10px}.wmc-option:focus-visible,.wmc-close:focus-visible,.wmc-select:focus-visible{outline:2px solid #efdbf3;outline-offset:2px}',
    '@keyframes wmcBeat{to{height:3px}}@keyframes wmcFade{from{opacity:0}to{opacity:1}}@keyframes wmcRise{from{transform:translateY(10px) scale(.98);opacity:0}to{transform:none;opacity:1}}',
    '@media(max-width:355px){.wmc-sheet{padding:18px}.wmc-title{font-size:20px}.wmc-album{gap:9px}.wmc-art{width:58px;height:58px}}',
    '@media(prefers-reduced-motion:reduce){.wmc-mask,.wmc-sheet,.wmc-eq i{animation:none!important}.wmc-option{transition:none}}'
  ].join('\n');
  document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(install),{once:true});
  else queueMicrotask(install);
})(window);