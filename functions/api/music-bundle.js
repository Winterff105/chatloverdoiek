// Whatever protected music bundle: existing music icon, Storage-only JS/CSS.
const STORAGE_ROOT = 'https://tjgxfyblzgqwxwfwvfol.supabase.co/storage/v1/object/protected-scripts/';
const FILES = [
  'js/apps/music-markup.js',
  'css/music.css',
  'js/apps/music.js',
  'js/apps/music-api.js'
];
const enc = new TextEncoder();
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
  try {
    const results=await Promise.all(FILES.map(async path=>{
      const encoded=path.split('/').map(encodeURIComponent).join('/');
      const r=await fetch(STORAGE_ROOT+encoded,{
        headers:{apikey:env.SUPABASE_SERVICE_KEY, Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY},
        signal:AbortSignal.timeout(25000),cache:'no-store'
      });
      if(!r.ok) throw new Error('Storage '+path+' HTTP '+r.status);
      return [path,await r.text()];
    }));
    return json({success:true,files:Object.fromEntries(results)});
  } catch(error) {
    console.error('[music-bundle] '+String(error?.message||error));
    return json({success:false,message:'音乐文件加载失败，请刷新后重试'},502);
  }
}
