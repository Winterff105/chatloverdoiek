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
    const [qq, exp, deviceId] = new TextDecoder().decode(fromB64url(payload)).split(':');
    if (!qq || !(Number(exp) > Date.now())) return null;
    return { qq, deviceId: deviceId || '' };
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
    // 读取自己的时长、周目标、是否正在计时
    if (body.action === 'status') {
      const [cfgRes, durRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/system_configs?key=eq.weekly_quota_minutes&select=value&limit=1`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/member_durations?${qqFilter}&select=duration,last_heartbeat,status&limit=1`, { headers })
      ]);
      const cfg = cfgRes.ok ? await cfgRes.json() : [];
      const dur = durRes.ok ? await durRes.json() : [];
      const row = (Array.isArray(dur) && dur[0]) || {};
      const last = row.last_heartbeat ? new Date(row.last_heartbeat).getTime() : 0;
      return json({
        success: true,
        duration: row.duration || 0,
        target: (Array.isArray(cfg) && cfg[0] && parseInt(cfg[0].value, 10)) || 60,
        counting: Date.now() - last < 180000,
        status: row.status || 'normal'
      });
    }

    // 兑换凭证：QQ 从 token 里取，不能替别人兑换
    if (body.action === 'redeem') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return json({ success: false, message: '凭证码格式不正确' }, 400);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redeem_voucher`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_qq: authed.qq, p_code: code })
      });
      if (!r.ok) return json({ success: false, message: '兑换失败', error: await r.text() }, 500);
      const out = await r.json();
      if (out === -1) return json({ success: false, message: '凭证码无效或已过期' }, 404);
      if (out === -2) return json({ success: false, message: '您已兑换过此凭证，不可重复领取' }, 409);
      return json({ success: true, bonus: out });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?${qqFilter}&select=bound_devices&limit=1`, { headers });
    if (!res.ok) return json({ success: false, message: '读取失败', error: await res.text() }, 500);
    const rows = await res.json();
    const devices = rows && rows[0] && Array.isArray(rows[0].bound_devices) ? rows[0].bound_devices : [];
    const idOf = d => (typeof d === 'string' ? d : (d && d.id));
    const publicDevice = d => (typeof d === 'string'
      ? { id: d }
      : { id: d.id, ua: d.ua || '', ip: d.ip || '', last_active: d.last_active || d.bound_at || '' });

    if (body.action === 'list') {
      return json({ success: true, devices: devices.map(publicDevice) });
    }

    // 在已登录状态下踢掉自己账号的另一台设备：由数据库函数 device_kick 加锁一次完成
    if (body.action === 'kick') {
      // 新 token 自带设备 id；旧 token 没有，就用请求里带的 deviceId
      const myId = authed.deviceId || String(body.deviceId || '');
      const targetId = String(body.targetId || '');

      if (!myId) {
        return json({ success: false, message: '本机未绑定设备，请退出后重新登录再操作' }, 403);
      }
      if (!targetId) return json({ success: false, message: '缺少要踢掉的设备' }, 400);

      const kr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/device_kick`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_qq: authed.qq, p_my_id: myId, p_target_id: targetId })
      });
      if (!kr.ok) return json({ success: false, message: '踢出失败', error: await kr.text() }, 500);
      const out = await kr.json();
      const code = out && out.code;

      // 发起者自己已被踢掉：不能反过来踢别人
      if (code === 'kicked') return json({ success: false, reason: 'kicked', message: '本机已下线，请重新登录' }, 401);
      if (code === 'self') return json({ success: false, message: '不能踢掉本机' }, 400);
      if (code === 'not_found') return json({ success: false, message: '该设备已不在绑定列表中' }, 404);
      if (code !== 'ok') return json({ success: false, message: '踢出失败', error: String(code) }, 500);

      // 被踢的设备下一次心跳会收到 kicked 并自动下线
      const left = Array.isArray(out.devices) ? out.devices : [];
      return json({ success: true, devices: left.map(publicDevice) });
    }

    if (body.action === 'touch') {
      const myId = authed.deviceId || String(body.deviceId || '');
      if (!myId) return json({ success: true, touched: false });
      const tr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/device_touch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_qq: authed.qq,
          p_device_id: myId,
          p_ip: request.headers.get('CF-Connecting-IP') || '',
          p_touch: true
        })
      });
      if (!tr.ok) return json({ success: false, message: '更新失败', error: await tr.text() }, 500);
      const state = await tr.json();
      return json({ success: true, touched: state === 'ok' });
    }

    return json({ success: false, message: '未知操作' }, 400);
  } catch (error) {
    return json({ success: false, message: '服务器错误', error: error.message }, 500);
  }
}
