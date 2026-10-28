const enc = new TextEncoder();
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

    const content = allowExistingMusicTap(file, await res.text());

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
