const enc=new TextEncoder();
const URL='https://tjgxfyblzgqwxwfwvfol.supabase.co';
const output=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function bytes(s){const x=String(s).replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(x+'='.repeat((4-x.length%4)%4)),c=>c.charCodeAt(0));}
async function auth(token,secret){
 try{
  const parts=String(token||'').split('.');
  if(parts.length!==2)return false;
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,bytes(parts[1]),enc.encode(parts[0])))return false;
  const [qq,exp]=new TextDecoder().decode(bytes(parts[0])).split(':');
  return /^\d{5,12}$/.test(qq)&&Number(exp)>Date.now();
 }catch{return false;}
}
export async function onRequestPost({request,env}){
 if(!env.TOKEN_SECRET||!env.SUPABASE_SERVICE_KEY)return output({success:false,message:'音乐后端未配置'},503);
 let params;try{params=await request.json();}catch{return output({success:false,message:'请求格式错误'},400);}
 if(!await auth(params?.token,env.TOKEN_SECRET))return output({success:false,message:'登录凭证无效'},401);
 try{
  const res=await fetch(URL+'/functions/v1/cherie-music-source',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY},signal:AbortSignal.timeout(25000)});
  if(!res.ok){console.warn('Supabase music status',res.status);return output({success:false,message:'音乐后端获取失败'},502);}
  const data=await res.json();
  if(!data.success||!['html','js','css','api'].every(k=>typeof data.files?.[k]==='string'))return output({success:false,message:'音乐后端文件不完整'},502);
  return output({success:true,files:data.files});
 }catch(e){console.warn('music proxy',e?.message);return output({success:false,message:'音乐后端网络失败'},502);}
}
