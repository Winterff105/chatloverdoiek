/* 一次返回全部核心 CSS/JS：token 本地验签，文件在内存缓存 5 分钟，不再每次都去 Supabase 下载 */
const enc = new TextEncoder();
const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';
const CACHE_TTL = 5 * 60 * 1000;

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
      if (res.ok) return await res.text();
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
