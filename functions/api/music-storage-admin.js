// Whatever: restricted administrative access to private Supabase music sources.
// This endpoint does not expose any service key and cannot touch css/base.css.
// Admin roster + valid signed login + bound device are required before any read.
const ROOT='https://tjgxfyblzgqwxwfwvfol.supabase.co';
const BUCKET='protected-scripts';
const TYPES=Object.freeze({
 'js/apps/music.js':'text/javascript',
 'js/apps/music-api.js':'text/javascript',
 'js/apps/music-markup.js':'text/javascript',
 'css/music.css':'text/css'
});
const MAX=384*1024, TE=new TextEncoder();
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'Content-Type':'application/json;charset=utf-8','Cache-Control':'private,no-store',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}});
function b64(s){
 const t=String(s).replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(t+'='.repeat((4-t.length%4)%4)),x=>x.charCodeAt(0));
}
async function login(token,secret){
 try{
  const parts=String(token||'').split('.');
  if(parts.length!==2)return null;
  const key=await crypto.subtle.importKey('raw',TE.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,b64(parts[1]),TE.encode(parts[0])))return null;
  const [qq,expires,device]=new TextDecoder().decode(b64(parts[0])).split(':');
  if(!/^\d{5,12}$/.test(qq||'')||!Number.isFinite(Number(expires))||Number(expires)<=Date.now()||!/^[\w-]{4,64}$/.test(device||''))return null;
  return {qq,device};
 }catch{return null;}
}
const sbHeaders=key=>({apikey:key,Authorization:'Bearer '+key});
async function getTable(path,key){
 const res=await fetch(ROOT+'/rest/v1/'+path,{headers:sbHeaders(key),cache:'no-store',signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw new Error('Database read status '+res.status);
 return res.json();
}
async function adminAllowed(user,key){
 const qq=encodeURIComponent(user.qq);
 const [admins,creds,member]=await Promise.all([
  getTable('admin_roster?qq=eq.'+qq+'&active=is.true&select=qq&limit=1',key),
  getTable('auth_credentials?qq=eq.'+qq+'&is_activated=is.true&select=qq,bound_devices&limit=1',key),
  getTable('member_durations?qq=eq.'+qq+'&select=status&limit=1',key)
 ]);
 if(!admins?.length||!creds?.length||member?.[0]?.status==='revoked')return false;
 const devices=Array.isArray(creds[0].bound_devices)?creds[0].bound_devices:[];
 return devices.some(d=>String(typeof d==='string'?d:d?.id)===user.device);
}
const storageUrl=path=>ROOT+'/storage/v1/object/'+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
async function download(path,key){
 const res=await fetch(storageUrl(path),{headers:sbHeaders(key),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw new Error('Storage GET status '+res.status);
 const bytes=new Uint8Array(await res.arrayBuffer());
 if(!bytes.length||bytes.length>MAX)throw new Error('Unexpected object length');
 return bytes;
}
async function hash(bytes){
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function upload(path,bytes,type,key,upsert=false){
 const res=await fetch(storageUrl(path),{method:'POST',headers:{
  ...sbHeaders(key),'Content-Type':type,'x-upsert':upsert?'true':'false'
 },body:bytes,signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw new Error('Storage POST status '+res.status);
}
async function backup(path,bytes,checksum,key){
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID();
 const dest='backups/music-source-edits/'+id+'/'+path;
 await upload(dest,bytes,TYPES[path],key);
 const copy=await download(dest,key);
 if(await hash(copy)!==checksum)throw new Error('Backup verification failed');
 return dest;
}
export function onRequestGet(){return respond({ok:false,error:'post_only'},405);}
export async function onRequestPost({request,env}){
 if(!env.SUPABASE_SERVICE_KEY||!env.TOKEN_SECRET)return respond({ok:false,error:'not_configured'},503);
 if(Number(request.headers.get('content-length')||0)>MAX*2)return respond({ok:false,error:'too_large'},413);
 let data;try{data=await request.json();}catch{return respond({ok:false,error:'bad_json'},400);}
 const user=await login(data?.token,env.TOKEN_SECRET);
 if(!user)return respond({ok:false,error:'unauthorized'},401);
 try{
  if(!await adminAllowed(user,env.SUPABASE_SERVICE_KEY))return respond({ok:false,error:'forbidden'},403);
 }catch{return respond({ok:false,error:'admin_verification_unavailable'},503);}
 const path=String(data.path||'');
 if(!Object.hasOwn(TYPES,path))return respond({ok:false,error:'unlisted_file'},400);
 if(!['inspect','read','backup','replace'].includes(data.action))return respond({ok:false,error:'invalid_action'},400);
 try{
  const original=await download(path,env.SUPABASE_SERVICE_KEY);
  const checksum=await hash(original);
  if(data.action==='inspect')return respond({ok:true,path,sha256:checksum,bytes:original.length});
  if(data.action==='read')return respond({ok:true,path,sha256:checksum,
   content:new TextDecoder('utf-8',{fatal:true}).decode(original)});
  if(data.action==='backup'){
   const saved=await backup(path,original,checksum,env.SUPABASE_SERVICE_KEY);
   return respond({ok:true,path,sha256:checksum,backup:saved,verified:true});
  }
  // Deliberately OFF by default, even for administrators.
  if(env.MUSIC_STORAGE_WRITE_ENABLED!=='true')return respond({ok:false,error:'write_disabled'},403);
  if(!/^[a-f0-9]{64}$/.test(String(data.expectedSha256||''))||data.expectedSha256!==checksum)
   return respond({ok:false,error:'source_conflict',sha256:checksum},409);
  if(typeof data.content!=='string')return respond({ok:false,error:'missing_content'},400);
  const next=TE.encode(data.content);
  if(!next.length||next.length>MAX)return respond({ok:false,error:'invalid_size'},413);
  const saved=await backup(path,original,checksum,env.SUPABASE_SERVICE_KEY);
  await upload(path,next,TYPES[path],env.SUPABASE_SERVICE_KEY,true);
  const verified=await download(path,env.SUPABASE_SERVICE_KEY);
  const nextHash=await hash(verified);
  if(nextHash!==await hash(next))return respond({ok:false,error:'verify_failed',backup:saved},502);
  return respond({ok:true,path,previousSha256:checksum,sha256:nextHash,backup:saved,verified:true});
 }catch(e){
  console.error('[music-storage-admin] operation failed:',String(e?.message||e));
  return respond({ok:false,error:'storage_failed'},502);
 }
}
