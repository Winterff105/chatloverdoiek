/* 一次返回全部核心 CSS/JS：token 本地验签，文件在内存缓存 5 分钟，不再每次都去 Supabase 下载 */
const enc = new TextEncoder();
const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';
const CACHE_TTL = 5 * 60 * 1000;

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

// Fill the area below the optional floating toolbar without changing its
// geometry or the canonical stylesheet in private Supabase Storage.
function fillSecondMenuBackground(file, source) {
  if (file !== 'css/messages.css') return source;
  return source + '\n/* Floating menu bottom background */\n'
    + '.messages-app #chatView .composer.wmc-menu-floating { box-shadow: 0 -48px 0 0 #fff, 0 36px 0 0 #fff; }\n'
    + '.messages-app #chatView .composer.wmc-menu-floating .wmc-toolbar { background: #fff; }\n';
}
// Optimize the private Messages input/keyboard path in memory only.
function optimizeChatKeyboard(file, source) {
  if (file !== 'js/apps/messages.js') return source;
  const patches = [["function onTyping() { autoGrow(); updateSend(); }\nfunction autoGrow() { const t = document.getElementById('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }","let wmcGrowFrame=0;\nfunction onTyping() { updateSend(); autoGrow(); }\nfunction autoGrow() {\n  if(wmcGrowFrame)return;\n  wmcGrowFrame=requestAnimationFrame(()=>{\n    wmcGrowFrame=0;\n    const t=document.getElementById('input');\n    if(!t||!t.isConnected)return;\n    t.style.height='auto';\n    t.style.height=Math.min(t.scrollHeight,100)+'px';\n  });\n}"],["const actualBottom=active.getBoundingClientRect().bottom;","const actualBottom=active.getBoundingClientRect().bottom;\n    // Measure before changing transforms to avoid a forced second layout.\n    const originalComposerTop=composer.getBoundingClientRect().top+lift;"],["const composerTop=composer.getBoundingClientRect().top;","const composerTop=originalComposerTop-lift;"],["const nearLatest=thread.scrollHeight-thread.scrollTop-thread.clientHeight<96;","const nearLatest=!root.classList.contains('wmc-messages-keyboard') && thread.scrollHeight-thread.scrollTop-thread.clientHeight<96;"],["thread.style.setProperty('max-height',Math.max(56,available)+'px','important');","const maxHeight=Math.max(56,available)+'px';\n        if(thread.style.getPropertyValue('max-height')!==maxHeight)\n          thread.style.setProperty('max-height',maxHeight,'important');"],["thread.style.setProperty('min-height','0','important');","if(thread.style.getPropertyValue('min-height')!=='0')thread.style.setProperty('min-height','0','important');"],["thread.style.setProperty('overflow-y','auto','important');","if(thread.style.getPropertyValue('overflow-y')!=='auto')thread.style.setProperty('overflow-y','auto','important');"],["thread.style.setProperty('scroll-padding-bottom','3px');","if(thread.style.getPropertyValue('scroll-padding-bottom')!=='3px')thread.style.setProperty('scroll-padding-bottom','3px');"],["composer.style.setProperty('translate','0 '+(-lift)+'px');","const nextTranslate='0 '+(-lift)+'px';\n      if(composer.style.getPropertyValue('translate')!==nextTranslate)composer.style.setProperty('translate',nextTranslate);"],["composer.style.setProperty('z-index','20');","if(composer.style.getPropertyValue('z-index')!=='20')composer.style.setProperty('z-index','20');"],["root.classList.toggle('wmc-messages-keyboard',keyboardOpen);\n    root.style.setProperty('--wmc-main-input-rise',lift+'px');","root.classList.toggle('wmc-messages-keyboard',keyboardOpen);\n    if(root.style.getPropertyValue('--wmc-main-input-rise')!==lift+'px')\n      root.style.setProperty('--wmc-main-input-rise',lift+'px');"],["},160);\n  },true);\n  viewport()?.addEventListener('resize',schedule","},280);\n  },true);\n  viewport()?.addEventListener('resize',schedule"]];
  for (const [before] of patches) {
    if (source.split(before).length !== 2) {
      console.warn('[Messages keyboard] Unexpected source revision; skipping optimization');
      return source;
    }
  }
  for (const [before, after] of patches) source = source.replace(before, after);
  return source;
}
// Preserve normal text and money actions in timestamped AI replies.
// Modify only the private parser response, never its stored original.
function supportTimestampedChatReplies(file, source) {
  if (file !== 'js/apps/messages-api.js') return source;
  const before = "    let list = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.messages) ? obj.messages : null);";
  const after = "    // Keep timestamped dialogue and embedded JSON actions in their original order.\n    let timestamped = null;\n    const stamps = [...t.matchAll(/\\[\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2})?\\]/g)];\n    if (stamps.length && !t.slice(0, stamps[0].index).trim()) {\n      timestamped = [];\n      for (let i = 0; i < stamps.length; i++) {\n        const start = stamps[i].index + stamps[i][0].length;\n        const end = i + 1 < stamps.length ? stamps[i + 1].index : t.length;\n        const segment = t.slice(start, end).trim();\n        if (!segment) continue;\n        const event = segment[0] === '{' ? (tryJson(segment) || tryJson(fixRawNewlines(segment))) : null;\n        timestamped.push(event && typeof event === 'object' ? event : segment);\n      }\n      if (timestamped.length) obj = null;\n      else timestamped = null;\n    }\n    let list = timestamped || (Array.isArray(obj) ? obj : (obj && Array.isArray(obj.messages) ? obj.messages : null));";
  if (source.split(before).length !== 2) {
    console.warn('[Messages API] Parser source revision mismatch; patch skipped');
    return source;
  }
  return source.replace(before, after);
}
// UI-only session boundaries must never become empty AI dialogue turns.
function omitMusicUiBoundaries(file, source) {
  if(file!=='js/apps/messages-api.js')return source;
  const before="      const slice = (contact.msgs || []).slice(-memCount);";
  if(source.split(before).length!==2){
    console.warn('[Music] Message history revision changed; skipping boundary filter');
    return source;
  }
  return source.replace(before,"      const slice = (contact.msgs || []).filter(m => m?.music?.kind !== 'boundary').slice(-memCount);");
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


const CORE_FILES = [
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
  'css/widget-kit.css',
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
  'js/main.js'
];

// 同一个 Worker 实例内共享：缓存的文件内容，以及正在进行中的下载（并发请求只下载一次）
let memCache = null;
let inflight = null;

function fromB64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// 从 Supabase Storage 下载单个文件，失败重试一次
async function downloadOne(file, serviceKey) {
  const objectPath = file.split('/').map(encodeURIComponent).join('/');
  const url = `${SUPABASE_URL}/storage/v1/object/protected-scripts/${objectPath}`;
  let lastErr = null;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (res.ok) {
        const original = await res.text();
        // Uploaded canonical Supabase sources already contain these changes.
        // Skip all legacy response-time patches for those specific revisions.
        const native = (
          (file === 'js/apps/messages.js' && original.includes('__wmcPrivateMusicBridgeIntegrated')) ||
          (file === 'js/apps/messages-api.js' && original.includes('__wmcPrivateMessagesApiIntegrated')) ||
          (file === 'css/messages.css' && original.includes('/* Floating menu bottom background */')) ||
          (file === 'js/apps/app-manager.js' && original.includes('__wmcPrivateAppMusicGateIntegrated')) ||
          (file === 'css/app-window.css' && original.includes('Music full-screen loading fix v17'))
        );
        if (native) return original;
        return omitMusicUiBoundaries(file, supportTimestampedChatReplies(file, optimizeChatKeyboard(file, fillSecondMenuBackground(file, gateExistingMusic(file, revealMusicWindow(file, allowExistingMusicTap(file, original)))))));
      }
      lastErr = new Error(`${file} 下载失败 (${res.status})`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function loadAllFiles(serviceKey) {
  const entries = await Promise.all(CORE_FILES.map(async f => [f, await downloadOne(f, serviceKey)]));
  return Object.fromEntries(entries);
}

async function getFiles(serviceKey) {
  if (memCache && Date.now() - memCache.at < CACHE_TTL) return memCache.files;
  if (!inflight) {
    inflight = loadAllFiles(serviceKey)
      .then(files => {
        memCache = { at: Date.now(), files };
        return files;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_SERVICE_KEY || !env.TOKEN_SECRET) {
    return json({ success: false, message: '服务器缺少环境变量' }, 500);
  }

  let body;
  try { body = await request.json(); } catch (_) { return json({ success: false, message: '请求格式错误' }, 400); }

  const authed = await verifyToken(body.token, env.TOKEN_SECRET);
  if (!authed) return json({ success: false, message: '登录已失效' }, 401);

  // 只返回白名单里、且前端需要的文件
  const wanted = Array.isArray(body.files)
    ? body.files.filter(f => CORE_FILES.includes(f))
    : CORE_FILES;

  try {
    const all = await getFiles(env.SUPABASE_SERVICE_KEY);
    const files = {};
    wanted.forEach(f => { files[f] = all[f]; });
    return json({ success: true, files });
  } catch (error) {
    return json({ success: false, message: '核心文件加载失败', error: error.message }, 502);
  }
}
