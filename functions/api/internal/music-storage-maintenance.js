// Private, temporary maintenance endpoint for the existing Supabase Storage
// music sources. The independent 64-byte editor key is a CLOUDFLARE SECRET,
// never in GitHub. Keep disabled if any required secret is missing.
const BASE = 'https://tjgxfyblzgqwxwfwvfol.supabase.co/storage/v1/object/';
const BUCKET = 'protected-scripts';
const ALLOWED = new Set([
  'js/apps/music.js', 'js/apps/music-api.js',
  'js/apps/music-markup.js', 'css/music.css'
]);
const utf8 = new TextEncoder();

function respond(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'X-Robots-Tag':'noindex, nofollow',
      'Referrer-Policy':'no-referrer'
    }
  });
}
function sameSecret(got, want) {
  if (typeof got!=='string' || typeof want!=='string') return false;
  if (want.length<48 || got.length!==want.length) return false;
  let mismatch=0;
  for(let i=0;i<want.length;i++)mismatch|=got.charCodeAt(i)^want.charCodeAt(i);
  return mismatch===0;
}
async function sha(bytes) {
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
}
async function storage(path,method,serviceKey,content,contentType) {
  const headers={
    apikey:serviceKey,Authorization:'Bearer '+serviceKey
  };
  if(content!==undefined) {
    headers['Content-Type']=contentType||'application/javascript; charset=utf-8';
    headers['Cache-Control']='no-store';
    headers['x-upsert']=method==='PUT'?'true':'false';
  }
  const result=await fetch(BASE+BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/'),{
    method,headers,body:content,cache:'no-store',signal:AbortSignal.timeout(20000)
  });
  if(!result.ok)throw Error('Storage '+method+' '+result.status);
  return result;
}
export async function onRequestPost({request,env}) {
  // Fail closed. Not usable with the app login token, demo password or anon key.
  if(!env.PRIVATE_MUSIC_EDITOR_KEY || !env.SUPABASE_SERVICE_KEY ||
     !sameSecret(request.headers.get('X-Private-Music-Editor'),env.PRIVATE_MUSIC_EDITOR_KEY))
    return respond({success:false},404);
  const origin=request.headers.get('Origin');
  if(origin&&origin!=='https://chatlover.pages.dev')return respond({success:false},403);
  if(Number(request.headers.get('Content-Length')||0)>16000)return respond({success:false},413);
  let data;
  try{data=await request.json();}
  catch{return respond({success:false,reason:'JSON required'},400);}
  const path=String(data?.path||'');
  const action=data?.action;
  if(!ALLOWED.has(path)||!['probe','backup','patch'].includes(action))
    return respond({success:false,reason:'unsupported'},400);
  try {
    const existing=await storage(path,'GET',env.SUPABASE_SERVICE_KEY);
    const content=await existing.arrayBuffer();
    if(content.byteLength>300000)throw Error('File exceeds maintenance limit');
    const originalSha=await sha(content);
    const type=path.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8';
    if(action==='probe')return respond({success:true,path,size:content.byteLength,sha256:originalSha});
    if(action==='patch'&&data.expectedSha256!==originalSha)
      return respond({success:false,reason:'source changed',sha256:originalSha},409);
    let patched;
    if(action==='patch') {
      const patches=data.patches;
      if(!Array.isArray(patches)||patches.length<1||patches.length>4)
        return respond({success:false,reason:'invalid patch count'},400);
      patched=new TextDecoder('utf-8',{fatal:true}).decode(content);
      for(const p of patches){
        if(typeof p?.find!=='string'||typeof p?.replace!=='string'||
           p.find.length<8||p.find.length>5000||p.replace.length>6000)
          return respond({success:false,reason:'invalid patch'},400);
        const at=patched.indexOf(p.find);
        if(at<0||patched.indexOf(p.find,at+1)!==-1)
          return respond({success:false,reason:'patch anchor not unique'},409);
        patched=patched.slice(0,at)+p.replace+patched.slice(at+p.find.length);
      }
      if(utf8.encode(patched).byteLength>300000)
        return respond({success:false,reason:'patched file too large'},413);
    }
    // Immutable backup under a unique timestamp, always BEFORE any overwrite.
    const backup='backups/music-maintenance-2026-10-28/'+Date.now()+'-'+crypto.randomUUID()+'/'+path;
    await storage(backup,'POST',env.SUPABASE_SERVICE_KEY,content,type);
    if(action==='backup')
      return respond({success:true,path,backup,size:content.byteLength,sha256:originalSha});
    const saved=await storage(path,'PUT',env.SUPABASE_SERVICE_KEY,utf8.encode(patched),type);
    await saved.arrayBuffer();
    const check=await storage(path,'GET',env.SUPABASE_SERVICE_KEY);
    const actualSha=await sha(await check.arrayBuffer());
    const expected=await sha(utf8.encode(patched));
    if(actualSha!==expected)
      return respond({success:false,reason:'verify mismatch',backup,sha256:actualSha},500);
    return respond({success:true,path,backup,previousSha256:originalSha,sha256:actualSha});
  }catch(e){
    // Do not expose private source, keys, or detailed upstream response body.
    return respond({success:false,reason:String(e?.message||'storage operation failed').slice(0,90)},502);
  }
}
