// 拦截核心 JS 的静态直链访问，只允许通过 /api/protected-js 加载
const BLOCKED_PATHS = new Set([
  '/js/db.js',
  '/js/desktop.js',
  '/js/main.js',
  '/js/liquid-glass.js',
  '/js/apps/settings.js',
  '/js/apps/quick-cruise.js',
  '/js/apps/messages-api.js',
  '/js/apps/messages-markup.js',
  '/js/apps/messages.js',
  '/js/apps/archangel.js',
  '/js/apps/worldbook.js',
  '/js/apps/world.js',
  '/js/apps/preset.js',
  '/js/apps/backup.js',
  '/js/apps/app-manager.js',
  '/css/base.css',
  '/css/desktop.css',
  '/css/app-icon.css',
  '/css/widgets.css',
  '/css/app-window.css',
  '/css/settings.css',
  '/css/messages.css',
  '/css/archangel.css',
  '/css/worldbook.css',
  '/css/preset.css',
  '/css/world.css',
  '/css/liquid-glass.css',
  '/css/backup.css',
  '/css/widget-kit.css'
]);

/* Preview API fallback: Cloudflare does not reveal existing production
 * secret_text values, so preview must not copy/embed privileged keys.
 * Reuse authenticated production API only for this fixed allowlist.
 */
const PREVIEW_UPSTREAM = 'https://chatlover.pages.dev';
const PREVIEW_API_ROUTES = new Set([
  '/api/login','/api/activate','/api/devices','/api/heartbeat',
  '/api/protected-bundle','/api/protected-js','/api/music-bundle'
]);
const MUSIC_PREVIEW_ADAPTER = '\n;(function(){if(window.__whateverMusicRuntimeLoading)return;' +
  'window.__whateverMusicRuntimeLoading=true;var s=document.createElement("script");' +
  's.src="/js/music-runtime.js";s.async=false;document.head.appendChild(s);})();';

async function previewApiFallback(context, url) {
  const req=context.request;
  if (!['GET','HEAD','POST'].includes(req.method)) return new Response('Method Not Allowed',{status:405});
  const destination=new URL(url.pathname+url.search,PREVIEW_UPSTREAM);
  const headers=new Headers(req.headers);
  for (const name of ['host','cookie','x-forwarded-host','cf-connecting-ip','cf-ipcountry']) headers.delete(name);
  try {
    const upstream=await fetch(new Request(destination.toString(), {
      method:req.method,
      headers,
      body:(req.method==='GET'||req.method==='HEAD')?undefined:req.body,
      redirect:'manual'
    }));
    if (upstream.status>=300 && upstream.status<400) return new Response('Unexpected upstream redirect',{status:502});
    if (url.pathname!=='/api/music-bundle'||req.method!=='POST'||!upstream.ok) {
      const response=new Response(upstream.body,upstream);
      response.headers.set('Cache-Control','private, no-store');
      return response;
    }
    const data=await upstream.json();
    const file='js/apps/music-api.js';
    if (data?.success&&data.files&&typeof data.files[file]==='string') {
      if (!data.files[file].includes('__whateverMusicRuntimeLoading')) data.files[file]+=MUSIC_PREVIEW_ADAPTER;
    }
    return new Response(JSON.stringify(data),{status:upstream.status,headers:{
      'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
    }});
  }catch(error){
    console.error('[Preview API] Unreachable',error?.name||'Error');
    return new Response(JSON.stringify({success:false,message:'测试站登录服务暂时不可用'}),{
      status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
    });
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = decodeURIComponent(url.pathname);

  // Preview deployments have no Supabase service key or signing secret.
  // Only authenticated production endpoints receive these requests.
  if (!context.env?.TOKEN_SECRET && !context.env?.SUPABASE_SERVICE_KEY && PREVIEW_API_ROUTES.has(url.pathname)) {
    return previewApiFallback(context,url);
  }

  if (BLOCKED_PATHS.has(path)) {
    return new Response('Not Found', { status: 404 });
  }

  return context.next();
}
