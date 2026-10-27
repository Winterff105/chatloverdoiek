/* 心跳计时：凭 token 识别 QQ，由服务器调用数据库函数加时长 */
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
    const [qq, exp, deviceId] = new TextDecoder().decode(fromB64url(payload)).split(':');
    if (!qq || !(Number(exp) > Date.now())) return null;
    return { qq, deviceId: deviceId || '' };
  } catch (_) {
    return null;
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_SERVICE_KEY || !env.TOKEN_SECRET) return json({ success: false, message: '服务器缺少环境变量' }, 500);

  let body;
  try { body = await request.json(); } catch (_) { return json({ success: false, message: '请求格式错误' }, 400); }

  const authed = await verifyToken(body.token, env.TOKEN_SECRET);
  if (!authed) return json({ success: false, message: '登录已失效' }, 401);

  const qq = authed.qq;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const os = body.os === 'iOS' ? 'iOS' : 'Android';
  const serviceKey = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  try {
    const qqFilter = `qq=eq.${encodeURIComponent(qq)}`;

    // 1. 先确认本机还在绑定列表里，被其他浏览器踢掉就返回 kicked，不再加时长
    //    新 token 自带设备 id；旧 token 没有，就用请求里带的 deviceId
    const myDeviceId = authed.deviceId || String(body.deviceId || '');
    let devices = [];
    if (myDeviceId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?${qqFilter}&select=bound_devices&limit=1`, { headers });
      // 数据库读取失败时不判定为被踢，避免误下线
      if (res.ok) {
        const rows = await res.json();
        devices = rows && rows[0] && Array.isArray(rows[0].bound_devices) ? rows[0].bound_devices : [];
        const idOf = d => (typeof d === 'string' ? d : (d && d.id));
        if (devices.length > 0 && !devices.some(d => idOf(d) === myDeviceId)) {
          return json({ success: false, reason: 'kicked', message: '账号已在其他浏览器登录，本机已下线' }, 401);
        }
      }
    }

    // 2. 加时长（规则在数据库函数 heartbeat_tick 里：50 秒内不重复加，超过 3 分钟重新计时）
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/heartbeat_tick`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_qq: qq, p_os: os, p_ip: ip })
    });
    if (!r.ok) return json({ success: false, message: '记录失败', error: await r.text() }, 500);
    const duration = await r.json();

    // 3. 顺便更新当前设备的活跃时间和 IP（前端每 5 次心跳带一次 touch，复用上面读到的设备列表）
    if (body.touch && myDeviceId) {
      const me = devices.find(d => d && typeof d === 'object' && d.id === myDeviceId);
      if (me) {
        try {
          me.ip = ip || me.ip || '';
          me.last_active = new Date().toISOString();
          await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?${qqFilter}`, {
            method: 'PATCH',
            headers: { ...headers, Prefer: 'return=minimal' },
            body: JSON.stringify({ bound_devices: devices })
          });
        } catch (_) {}
      }
    }

    return json({ success: true, duration });
  } catch (error) {
    return json({ success: false, message: '服务器错误', error: error.message }, 500);
  }
}
