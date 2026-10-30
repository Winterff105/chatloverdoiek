// Whatever protected music bundle: existing music icon, Storage-only JS/CSS.
const STORAGE_ROOT = 'https://tjgxfyblzgqwxwfwvfol.supabase.co/storage/v1/object/protected-scripts/';
const FILES = [
  'js/apps/music-markup.js',
  'css/music.css',
  'js/apps/music.js',
  'js/apps/music-api.js'
];
const enc = new TextEncoder();

// Prevent the legacy virtual-partner fallback from pretending to be a Char.
// This is appended to authenticated music.js in-memory; the original private
// music source, playlist, chatPanel and lyrics remain untouched.
const MUSIC_REAL_CHAR_GUARD = String.raw`
;(function(){
  if(window.__whateverMusicRealCharGuard) return;
  window.__whateverMusicRealCharGuard = true;
  function startRealChar(){
    if(typeof window.__whateverMusicInviteReady === 'function')
      return window.__whateverMusicInviteReady();
    var msg='真实 Char 邀请尚未连接，请稍后重试。未启动模拟恋人。';
    if(typeof window.showToast === 'function') window.showToast(msg, 'error');
    else if(typeof window.alert === 'function') window.alert(msg);
    else console.warn('[Music]', msg);
  }
  window.toggleTogether = startRealChar;
  // Capture ahead of the private music-api's document/button handlers.
  // Only a real user click on the ORIGINAL recall buttons may invoke Char.
  // Never allow the old quick-quote handler to run as a second request.
  window.addEventListener('click', function(e){
    var button=e.target && e.target.closest &&
      e.target.closest('button[aria-label="调取对方说的话"]');
    if(!button || !button.closest('#chatPanel,#duetInput')) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(!e.isTrusted) return; // programmatic/open-chat events cannot recall
    if(typeof window.__wmcExplicitMusicRecall === 'function')
      window.__wmcExplicitMusicRecall(button);
    else if(typeof window.showToast === 'function')
      window.showToast('一起听正在连接，请稍后重试。');
  }, true);
  document.addEventListener('click', function(e){
    var target=e.target;
    if(!target || typeof target.closest !== 'function') return;
    if(!target.closest('#togetherBtn, .modal-close[aria-label="结束一起听"]')) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    startRealChar();
  }, true);
})();
`;


// Patch the ORIGINAL music iframe command before loading the runtime adapter.
// Reuses ListenTogether's own open/close and invite APIs, never a duplicate UI.
const MUSIC_LYRIC_CHAT_TOGGLE_FIX = String.raw`
;(function(){
  if(window.__whateverMusicLyricToggleGuard)return;
  window.__whateverMusicLyricToggleGuard=true;
  window.addEventListener('message',function(event){
    if(event.source!==window.parent)return;
    var command=event.data;
    if(!command||command.type!=='whatever:music:ui:command'||command.command!=='chat-toggle')return;
    var together=window.ListenTogether;
    if(!together)return;
    if(typeof together.isActive!=='function'||!together.isActive()){
      // Solo listening must not open an invitation from the lyric ticker.
      // The player decides whether to invite a Char using its own controls.
      event.stopImmediatePropagation();
      return;
    }
    if(typeof together.openChat!=='function'||typeof together.closeChat!=='function')return;
    // Do not let the older participant-only handler toggle the same panel twice.
    event.stopImmediatePropagation();
    var panel=document.getElementById('chatPanel');
    var open=(typeof together.isChatOpen==='function'&&together.isChatOpen())
      ||!!(panel&&panel.classList.contains('open'));
    if(open)together.closeChat();else together.openChat();
  },true);
})();
`;

// Password hash lives in the private Supabase database, not in public GitHub
// and PBKDF2 is deliberately NOT run in Cloudflare's CPU-limited request handler.
async function checkMusicPassword(password, serviceKey) {
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) return false;
  const response = await fetch(
    'https://tjgxfyblzgqwxwfwvfol.supabase.co/rest/v1/rpc/verify_music_test_password',
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({p_password:password}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    }
  );
  if (!response.ok) throw new Error('Password verifier HTTP ' + response.status);
  return (await response.json()) === true;
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
function b64(str) {
  const v=String(str).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(v+'='.repeat((4-v.length%4)%4)), c=>c.charCodeAt(0));
}
async function verify(token, secret) {
  try {
    const [payload,signature,...extra]=String(token||'').split('.');
    if (!payload||!signature||extra.length) return false;
    const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    if (!await crypto.subtle.verify('HMAC',key,b64(signature),enc.encode(payload))) return false;
    const [qq,expiration]=new TextDecoder().decode(b64(payload)).split(':');
    return Boolean(qq) && Number(expiration)>Date.now();
  } catch (_) {return false;}
}
export async function onRequestPost({request, env}) {
  if (!env.TOKEN_SECRET||!env.SUPABASE_SERVICE_KEY) return json({success:false,message:'音乐接口未配置'},503);
  let data; try{data=await request.json();}catch(_){return json({success:false,message:'请求格式错误'},400)}
  if (!await verify(data?.token,env.TOKEN_SECRET)) return json({success:false,message:'请重新登录'},401);
  let allowed = false;
  try {
    allowed = await checkMusicPassword(data?.password, env.SUPABASE_SERVICE_KEY);
  } catch (error) {
    console.error('[Music gate]', String(error?.message || error));
    return json({success:false,message:'音乐测试锁验证服务暂时不可用，请稍后重试'},503);
  }
  if (!allowed) return json({success:false,message:'测试密码错误'},403);
  try {
    const results=await Promise.all(FILES.map(async path=>{
      const encoded=path.split('/').map(encodeURIComponent).join('/');
      const r=await fetch(STORAGE_ROOT+encoded,{
        headers:{apikey:env.SUPABASE_SERVICE_KEY, Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY},
        signal:AbortSignal.timeout(25000),cache:'no-store'
      });
      if(!r.ok) throw new Error('Storage '+path+' HTTP '+r.status);
      let contents = await r.text();
      if (path === 'js/apps/music.js') {
        // Safe fallback: never enter the old random-reply virtual mode if the
        // real Char adapter cannot load, regardless of document readiness.
        contents += MUSIC_REAL_CHAR_GUARD;
      }
      // Add a small integration adapter AFTER the original music-api module.
      // It reuses window.ListenTogether.chatPanel; no replacement of music.js,
      // song library, lyrics implementation, miniplayer or existing CSS.
      if (path === 'js/apps/music-api.js') {
        contents += MUSIC_LYRIC_CHAT_TOGGLE_FIX;
        contents += '\n;(function(){ if (window.__whateverMusicRuntimeLoading) return; window.__whateverMusicRuntimeLoading=true; var s=document.createElement("script"); s.src="/js/music-runtime.js"; s.async=false; document.head.appendChild(s); })();';
      }
      return [path,contents];
    }));
    return json({success:true,files:Object.fromEntries(results)});
  } catch(error) {
    console.error('[music-bundle] '+String(error?.message||error));
    return json({success:false,message:'音乐文件加载失败，请刷新后重试'},502);
  }
}
