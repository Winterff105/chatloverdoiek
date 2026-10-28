/* Chérie Music: ORIGINAL draggable chatPanel + canonical Whatever chat. */
(function (w) {
  'use strict';
  if(w.__wmcInstalled)return;
  w.__wmcInstalled=true;
  let participant=null, busy=false, dialog=null, seq=0;
  const waiting=new Map();
  const origin=w.location.origin;
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
      w.parent.postMessage({type:'whatever:music:request',id,action,payload},origin);
    });
  }
  w.addEventListener('message',ev=>{
    if(ev.source!==w.parent||ev.origin!==origin)return;
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
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
    const heading=node('h2',null,'邀请 Char 一起听');
    const music=snapshot();
    const sub=node('p','wmc-sub','♪ '+music.title+(music.artist?' · '+music.artist:''));
    const select=node('select','wmc-select');select.setAttribute('aria-label','选择联系人');
    const note=node('p','wmc-notice','正在读取联系人…'),row=node('div','wmc-actions');
    const direct=node('button','wmc-accept','直接同意'),ask=node('button','wmc-ask','先问 Char'),close=node('button','wmc-close','取消');
    for(const b of [direct,ask,close])b.type='button';
    row.append(direct,ask);sheet.append(heading,sub,select,row,note,close);mask.append(sheet);
    mask.addEventListener('click',e=>{if(e.target===mask&&!busy)closeDialog();});
    close.addEventListener('click',()=>{if(!busy)closeDialog();});
    document.body.append(mask);dialog=mask;
    async function begin(mode){
      if(busy)return;
      const contactId=select.value;
      if(!contactId){note.textContent='请先选择联系人';return;}
      busy=true;direct.disabled=ask.disabled=close.disabled=true;
      note.textContent=mode==='ask'?'正在询问 Char 的意愿…':'正在发送邀请卡片…';
      try{
        const result=await rpc('invite',{contactId,mode,music:snapshot()});
        if(result.accepted){
          participant={id:contactId,...result.contact};
          w.ListenTogether.start({id:contactId,name:result.contact.name,avatar:result.contact.avatar});
          closeDialog();
          if(Array.isArray(result.messages))for(const t of result.messages)w.ListenTogether.receive(t);
          notify('已和 '+result.contact.name+' 开始一起听');
        }else{
          note.textContent=result.declined?'Char 婉拒了邀请':'Char 还没有明确答复';
          if(result.messages?.length)note.textContent+='：'+result.messages.join(' ');
        }
      }catch(e){note.textContent=trim(e.message||e,220);}
      finally{busy=false;direct.disabled=ask.disabled=close.disabled=false;}
    }
    direct.addEventListener('click',()=>begin('direct'));
    ask.addEventListener('click',()=>begin('ask'));
    rpc('contacts').then(r=>{
      select.replaceChildren();
      for(const c of r.contacts||[]){const o=node('option',null,c.name);o.value=c.id;select.append(o);}
      note.textContent=select.length?'选择一位 Char，再决定邀请方式':'还没有联系人，请先在聊天室创建角色';
    }).catch(e=>{note.textContent=trim(e.message||e,220);});
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
    '.wmc-mask{position:fixed;inset:0;z-index:2147483000;background:#000c;display:grid;place-items:center;padding:18px;box-sizing:border-box}',
    '.wmc-sheet{box-sizing:border-box;width:min(370px,100%);border-radius:22px;background:#19191d;color:#fff;border:1px solid #ffffff24;padding:24px;font:14px/1.55 system-ui,sans-serif;box-shadow:0 25px 60px #0009}',
    '.wmc-sheet h2{font-size:21px;margin:0 0 9px;font-weight:600}.wmc-sub{font-size:13px;color:#b8b8c1;overflow-wrap:anywhere}',
    '.wmc-select{box-sizing:border-box;width:100%;padding:12px;margin:12px 0;background:#292931;color:#fff;border:1px solid #ffffff30;border-radius:12px;font-size:15px}',
    '.wmc-actions{display:flex;gap:9px;margin:6px 0}.wmc-actions button{flex:1;padding:14px 5px;border-radius:13px;border:1px solid #ffffff3a}',
    '.wmc-accept{color:#161618;background:#fff}.wmc-ask{background:#33333a;color:#fff}',
    '.wmc-sheet button:disabled{opacity:.55}.wmc-notice{min-height:24px;color:#c0bec8;font-size:12px;margin:10px 0}.wmc-close{display:block;margin:auto;background:transparent;border:0;color:#aaa;padding:9px}'
  ].join('\n');
  document.head.append(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(install),{once:true});
  else queueMicrotask(install);
})(window);