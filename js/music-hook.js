/* Connect the EXISTING desktop music app to protected Supabase sources. No extra icon. */
(function(root){
 'use strict';
 let previous=null, serial=0, activeFrame=null, didInstall=false;
 const escapeClose=(v,tag)=>String(v).replace(new RegExp('</'+tag,'gi'),'<'+String.fromCharCode(92)+'/'+tag);
 function buildPage(f){
  let html=String(f.html);
  const style='<link rel="stylesheet" href="./music.css">';
  const js='<script src="./music.js"></script>';
  const api='<script src="./music-api.js"></script>';
  if(![style,js,api].every(x=>html.includes(x)))throw Error('音乐代码版本不匹配');
  html=html.replace(style,'<style>'+escapeClose(f.css,'style')+'</style>');
  html=html.replace(js,'<script>'+escapeClose(f.js,'script')+'</script>');
  html=html.replace(api,'<script>'+escapeClose(f.api,'script')+'</script>');
  return html;
 }
 function token(){try{return JSON.parse(localStorage.getItem('whatever_phone_auth')||'{}').token||'';}catch{return '';}}
 async function openExistingMusic(){
  const t=token();
  if(!t){alert('请先登录小手机');return;}
  previous.call(root,'music');
  const win=document.getElementById('appWindow');
  const host=win?.querySelector('.app-content');
  if(!host)return;
  host.innerHTML='<div style="display:grid;place-items:center;height:100%;color:#fff;background:#0a0b0e">正在加载音乐…</div>';
  const n=++serial;
  try{
   const r=await fetch('/api/music-bundle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:t}),cache:'no-store'});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.success)throw Error(j.message||'音乐后端请求失败');
   if(n!==serial||!win.classList.contains('active'))return;
   const iframe=document.createElement('iframe');
   iframe.title='Chérie Music';
   iframe.allow='autoplay; clipboard-write';
   iframe.style.cssText='display:block;width:100%;height:100%;border:0;background:#0a0b0e';
   iframe.srcdoc=buildPage(j.files);
   activeFrame=iframe;
   host.replaceChildren(iframe);
  }catch(e){
   if(n!==serial)return;
   const el=document.createElement('div');
   el.style.cssText='padding:25px;color:#fff;background:#0a0b0e;height:100%;font-size:13px';
   el.textContent='音乐加载失败：'+String(e.message||e);
   host.replaceChildren(el);
  }
 }
 function install(){
  if(didInstall||typeof root.openApp!=='function')return;
  previous=root.openApp;didInstall=true;
  const old=previous;
  root.openApp=function(appId,...args){return appId==='music'?openExistingMusic():old.apply(this,[appId,...args]);};
  const close=root.closeApp;
  if(typeof close==='function')root.closeApp=function(...args){++serial;try{activeFrame?.contentWindow?.document?.getElementById('realAudio')?.pause();}catch{}activeFrame=null;return close.apply(this,args);};
  root.WhateverMusicApp=Object.assign(root.WhateverMusicApp||{},{close:()=>root.closeApp()});
 }
 document.addEventListener('DOMContentLoaded',install);
 root.addEventListener('load',install);
 if(document.readyState==='complete')install();
})(window);
