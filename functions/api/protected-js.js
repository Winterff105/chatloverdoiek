const enc = new TextEncoder();

// Private Music test access prompt. Only the authenticated server can unlock assets.
function gateExistingMusic(file,source) {
 if(file!=='js/apps/app-manager.js')return source;
 const start=source.indexOf("} else if (appId === 'music') {");
 const end=source.indexOf("} else if (appId === 'todo') {", start+1);
 if(start<0||end<0) {
   return source.replace('function openApp(appId) {',"function openApp(appId) { if(appId==='music'){alert('还在测试，请勿打开（请检查音乐模块）');return;}");
 }
 let part=source.slice(start,end);
 const spinner="contentArea.innerHTML = '<div style=\"height:100%;display:grid;place-items:center;background:#0a0b0e;color:#fff\">音乐加载中…</div>';";
 const authStart="let auth={}; try{auth=JSON.parse(localStorage.getItem('whatever_phone_auth')||'{}')}catch(_){}";
 const authEnd="if(musicLoadSerial!==window.__whateverMusicLoadId||!win.classList.contains('active')) return;";
 const spinnerAt=part.indexOf(spinner);
 const authAt=part.indexOf(authStart);
 const completedAt=part.indexOf(authEnd,authAt+1);
 if(spinnerAt<0 || authAt<0 || completedAt<0) {
   const locked="} else if (appId === 'music') { win.classList.add('noir-mode'); contentArea.innerHTML='<section class=\"whatever-music-test-lock\" style=\"width:100%;height:100%;display:grid;place-items:center;background:#0a0b0e;color:white;font-size:14px\">还在测试，请勿打开（测试模块需要更新）</section>'; ";
   return source.slice(0,start)+locked+source.slice(end);
 }
 const lockMarkup="<section class=\"whatever-music-test-lock\" style=\"box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;min-width:100%;height:100%;min-height:100%;flex:1 0 100%;padding:24px;background:#0a0b0e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;\"><div style=\"box-sizing:border-box;width:100%;max-width:330px;text-align:center;\"><div style=\"color:#b3b8c5;font-size:11px;letter-spacing:3px;margin-bottom:20px;\">PRIVATE PREVIEW</div><div style=\"color:white;font-size:24px;font-weight:650;line-height:1.5;margin-bottom:12px;\">还在测试，请勿打开</div><div style=\"color:#a5a9b4;font-size:13px;line-height:1.8;margin-bottom:22px;\">音乐功能尚未正式开放<br>输入访问密码才能进入</div><form class=\"whatever-music-test-form\" autocomplete=\"off\" style=\"display:flex;flex-direction:column;gap:12px;\"><input type=\"password\" aria-label=\"音乐测试密码\" maxlength=\"128\" placeholder=\"输入测试密码\" required autocomplete=\"off\" autocapitalize=\"none\" spellcheck=\"false\" style=\"box-sizing:border-box;width:100%;height:48px;background:#1c1e27;color:white;border:1px solid #444656;border-radius:12px;text-align:center;font-size:15px;outline:none;\"/><button type=\"submit\" style=\"height:48px;border:0;border-radius:12px;background:#efeff6;color:#191920;font-size:14px;font-weight:650;\">验证并打开</button></form><div class=\"whatever-music-test-status\" role=\"status\" aria-live=\"polite\" style=\"min-height:34px;padding:12px 0 0;color:#ffb6c1;font-size:12px;line-height:1.6;\"></div><button type=\"button\" class=\"whatever-music-test-back\" style=\"padding:10px;background:none;border:0;color:#9ca1b0;font-size:13px;\">返回桌面</button></div></section>";
 part=part.replace(spinner,'contentArea.innerHTML = '+JSON.stringify(lockMarkup)+';');
 const newAuthAt=part.indexOf(authStart);
 const newCompletedAt=part.indexOf(authEnd,newAuthAt+1);
 const authCode="\n   let data, musicGateError = '';\n   while(true) {\n     const musicTestPassword=await new Promise(resolve=>{\n       contentArea.innerHTML=\"<section class=\\\"whatever-music-test-lock\\\" style=\\\"box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;min-width:100%;height:100%;min-height:100%;flex:1 0 100%;padding:24px;background:#0a0b0e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;\\\"><div style=\\\"box-sizing:border-box;width:100%;max-width:330px;text-align:center;\\\"><div style=\\\"color:#b3b8c5;font-size:11px;letter-spacing:3px;margin-bottom:20px;\\\">PRIVATE PREVIEW</div><div style=\\\"color:white;font-size:24px;font-weight:650;line-height:1.5;margin-bottom:12px;\\\">还在测试，请勿打开</div><div style=\\\"color:#a5a9b4;font-size:13px;line-height:1.8;margin-bottom:22px;\\\">音乐功能尚未正式开放<br>输入访问密码才能进入</div><form class=\\\"whatever-music-test-form\\\" autocomplete=\\\"off\\\" style=\\\"display:flex;flex-direction:column;gap:12px;\\\"><input type=\\\"password\\\" aria-label=\\\"音乐测试密码\\\" maxlength=\\\"128\\\" placeholder=\\\"输入测试密码\\\" required autocomplete=\\\"off\\\" autocapitalize=\\\"none\\\" spellcheck=\\\"false\\\" style=\\\"box-sizing:border-box;width:100%;height:48px;background:#1c1e27;color:white;border:1px solid #444656;border-radius:12px;text-align:center;font-size:15px;outline:none;\\\"/><button type=\\\"submit\\\" style=\\\"height:48px;border:0;border-radius:12px;background:#efeff6;color:#191920;font-size:14px;font-weight:650;\\\">验证并打开</button></form><div class=\\\"whatever-music-test-status\\\" role=\\\"status\\\" aria-live=\\\"polite\\\" style=\\\"min-height:34px;padding:12px 0 0;color:#ffb6c1;font-size:12px;line-height:1.6;\\\"></div><button type=\\\"button\\\" class=\\\"whatever-music-test-back\\\" style=\\\"padding:10px;background:none;border:0;color:#9ca1b0;font-size:13px;\\\">返回桌面</button></div></section>\";\n       const form=contentArea.querySelector('.whatever-music-test-form');\n       const note=contentArea.querySelector('.whatever-music-test-status');\n       if(musicGateError) note.textContent=musicGateError;\n       if(!form){resolve(null);return;}\n       form.addEventListener('submit',event=>{\n         event.preventDefault();\n         const input=form.querySelector('input');\n         const supplied=input.value;input.value='';\n         resolve(supplied);\n       },{once:true});\n       const back=contentArea.querySelector('.whatever-music-test-back');\n       if(back)back.addEventListener('click',()=>{closeApp();resolve(null);},{once:true});\n     });\n     if(!musicTestPassword || musicLoadSerial!==window.__whateverMusicLoadId||!win.classList.contains('active'))return;\n     contentArea.innerHTML='<div class=\"whatever-music-loading\" style=\"box-sizing:border-box;width:100%;min-width:100%;height:100%;display:grid;place-items:center;background:#0a0b0e;color:#fff;font-size:14px;\">正在验证访问权限…</div>';\n     try {\n       let auth={};try{auth=JSON.parse(localStorage.getItem('whatever_phone_auth')||'{}')}catch(_){}\n       if(!auth.token){musicGateError='登录状态已失效，请返回桌面重新登录';continue;}\n       const response=await fetch('/api/music-bundle',{\n         method:'POST',headers:{'Content-Type':'application/json'},\n         body:JSON.stringify({token:auth.token,password:musicTestPassword}),cache:'no-store'\n       });\n       const result=await response.json().catch(()=>({}));\n       if(musicLoadSerial!==window.__whateverMusicLoadId||!win.classList.contains('active'))return;\n       if(response.status===403){musicGateError='密码不正确，请重新输入';continue;}\n       if(response.status===401){musicGateError='登录凭证已过期，请返回桌面重新登录';continue;}\n       if(!response.ok||!result.success){\n         musicGateError=(result.message ? String(result.message) : '音乐接口暂时不可用')+' (HTTP '+response.status+')';\n         continue;\n       }\n       data=result;break;\n     }catch(e){\n       if(musicLoadSerial!==window.__whateverMusicLoadId||!win.classList.contains('active'))return;\n       musicGateError='连接音乐接口失败：'+String(e&&e.message||e);\n       console.warn('[Music] '+musicGateError);\n     }\n   }\n ";
 part=part.slice(0,newAuthAt)+authCode+part.slice(newCompletedAt);
 const errorLogger="console.error('[Music] ',error);";
 const customError= "const musicProblem=String(error&&error.message||error);\n                console.warn('[Music] 启动失败：'+musicProblem);";
 if(part.includes(errorLogger))part=part.replace(errorLogger,customError);
 const ending='contentArea.replaceChildren(node);';
 if(part.includes(ending)){
  const more="\n                node.className='whatever-music-failure';\n                node.style.cssText='box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;color:#fff;background:#0a0b0e;line-height:1.7;font-size:14px;';\n                const retry=document.createElement('button');\n                retry.type='button'; retry.textContent='返回密码界面';\n                retry.style.cssText='margin-top:20px;padding:12px 20px;border:1px solid #525565;background:#292a36;color:#fff;border-radius:12px;font-size:13px;';\n                retry.addEventListener('click',()=>openApp('music'));\n                node.appendChild(retry);\n  ";
  part=part.replace(ending,more+'\n'+ending);
 }
 return source.slice(0,start)+part+source.slice(end);
}

// v16: preserve the private app-window CSS while making the existing music UI visible.
// The original CSS hides all direct children without class; the music iframe,
// its loading indicator, and its error indicator are classless elements.
function revealMusicWindow(file, contents) {
  if (file !== 'css/app-window.css') return contents;
  return contents + '\n/* Music full-screen loading fix v17: no narrow center strip */\n'
    + '.app-window .app-content > iframe[title="音乐"] { display:block !important; width:100% !important; min-width:0 !important; height:100% !important; flex:1 1 auto; align-self:stretch; background:#0a0b0e; }\n'
    + '.app-window .app-content > div[style*="background:#0a0b0e"] { display:grid !important; box-sizing:border-box; width:100% !important; min-width:100%; height:100% !important; flex:1 0 auto; align-self:stretch; place-items:center; text-align:center; color:#fff !important; font-size:14px !important; }\n';
}

// Allow the existing music dock icon to use openApp('music').
// The desktop module is stored in the private Supabase bucket; keep it private.
function allowExistingMusicTap(file, source) {
  if (file !== 'js/desktop.js') return source;
  const pattern = /const TAP_OPENS\s*=\s*\[([^\]]*)\]/;
  const match = source.match(pattern);
  if (!match) {
    console.warn('[Music] Desktop TAP_OPENS whitelist not found');
    return source;
  }
  if (/(?:'|")music(?:'|")/.test(match[1])) return source;
  return source.replace(pattern, (whole) => whole.slice(0, -1) + ", 'music']");
}


function fromB64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// 校验签名和有效期，通过时返回 { qq }，否则返回 null
async function verifyToken(token, secret) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const [qq, exp] = new TextDecoder().decode(fromB64url(payload)).split(':');
    if (!qq || !(Number(exp) > Date.now())) return null;
    return { qq };
  } catch (_) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const file = url.searchParams.get('file');
  const token = url.searchParams.get('token');

  if (!env.TOKEN_SECRET) {
    return new Response('Server error: 未读取到环境变量 TOKEN_SECRET', { status: 500 });
  }

  const authed = await verifyToken(token, env.TOKEN_SECRET);
  if (!authed) {
    return new Response('Unauthorized', { status: 401 });
  }

  const allowedFiles = [
    'js/db.js',
    'js/desktop.js',
    'js/apps/settings.js',
    'js/apps/quick-cruise.js',
    'js/apps/messages-api.js',
    'js/apps/messages-markup.js',
    'js/apps/messages.js',
    'js/apps/archangel.js',
    'js/apps/worldbook.js',
    'js/apps/world.js',
    'js/liquid-glass.js',
    'js/apps/preset.js',
    'js/apps/backup.js',
    'js/apps/app-manager.js',
    'js/main.js',
    'css/base.css',
    'css/desktop.css',
    'css/app-icon.css',
    'css/widgets.css',
    'css/app-window.css',
    'css/settings.css',
    'css/messages.css',
    'css/archangel.css',
    'css/worldbook.css',
    'css/preset.css',
    'css/world.css',
    'css/liquid-glass.css',
    'css/backup.css',
    'css/widget-kit.css'
  ];

  if (!file || !allowedFiles.includes(file)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!env.SUPABASE_SERVICE_KEY) {
    return new Response('Server error: 未读取到环境变量 SUPABASE_SERVICE_KEY', { status: 500 });
  }

  try {
    const serviceKey = env.SUPABASE_SERVICE_KEY;
    // 逐段编码路径，保留目录分隔符 /
    const objectPath = file.split('/').map(encodeURIComponent).join('/');

    // 直接调用 Supabase Storage REST 接口下载私有文件
    const res = await fetch(`https://tjgxfyblzgqwxwfwvfol.supabase.co/storage/v1/object/protected-scripts/${objectPath}`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(`File not found (${res.status}): ${detail}`, { status: 404 });
    }

    const content = gateExistingMusic(file, revealMusicWindow(file, allowExistingMusicTap(file, await res.text())));

    const contentType = file.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : 'application/javascript; charset=utf-8';

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return new Response('Server error: ' + error.message, { status: 500 });
  }
}
