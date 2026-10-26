/* 设备列表与心跳：凭 token 只能读写自己账号的设备信息 */
const enc = new TextEncoder();
const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';

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
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return json({ success: false, message: '仅支持 POST' }, 405);
  if (!env.SUPABASE_SERVICE_KEY || !env.TOKEN_SECRET) return json({ success: false, message: '服务器缺少环境变量' }, 500);

  let body;
  try { body = await request.json(); } catch (_) { return json({ success: false, message: '请求格式错误' }, 400); }

  const authed = await verifyToken(body.token, env.TOKEN_SECRET);
  if (!authed) return json({ success: false, message: '登录已失效' }, 401);

  const serviceKey = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const qqFilter = `qq=eq.${encodeURIComponent(authed.qq)}`;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?${qqFilter}&select=bound_devices&limit=1`, { headers });
    if (!res.ok) return json({ success: false, message: '读取失败', error: await res.text() }, 500);
    const rows = await res.json();
    const devices = rows && rows[0] && Array.isArray(rows[0].bound_devices) ? rows[0].bound_devices : [];

    if (body.action === 'list') {
      return json({ success: true, devices: devices.map(d => (typeof d === 'string' ? { id: d } : d)) });
    }

    if (body.action === 'touch') {
      const me = devices.find(d => d && typeof d === 'object' && d.id === body.deviceId);
      if (!me) return json({ success: true, touched: false });
      me.ip = request.headers.get('CF-Connecting-IP') || me.ip || '';
      me.last_active = new Date().toISOString();
      const up = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?${qqFilter}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ bound_devices: devices })
      });
      if (!up.ok) return json({ success: false, message: '更新失败', error: await up.text() }, 500);
      return json({ success: true, touched: true });
    }

    return json({ success: false, message: '未知操作' }, 400);
  } catch (error) {
    return json({ success: false, message: '服务器错误', error: error.message }, 500);
  }
}
