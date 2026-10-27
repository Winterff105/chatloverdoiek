const enc = new TextEncoder();
const PBKDF2_ITER = 100000;

function b64url(bytes) {
  let s = '';
  new Uint8Array(bytes).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// token 格式：base64url("qq:过期时间:设备id") + "." + 签名
// 设备 id 用于心跳时判断本机是否已被其他浏览器踢掉
async function signToken(qq, secret, deviceId = '', days = 30) {
  const exp = Date.now() + days * 86400000;
  const payload = b64url(enc.encode(`${qq}:${exp}:${deviceId}`));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

async function pbkdf2(pwd, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256));
}

async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(pwd, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64url(salt)}$${b64url(hash)}`;
}

// legacy=true 表示数据库里还是旧的明文密码
async function checkPassword(pwd, stored) {
  if (!stored) return { ok: false, legacy: false };
  if (!String(stored).startsWith('pbkdf2$')) return { ok: stored === pwd, legacy: true };
  const [, iter, salt, hash] = String(stored).split('$');
  const got = await pbkdf2(pwd, fromB64url(salt), Number(iter));
  const want = fromB64url(hash);
  if (got.length !== want.length) return { ok: false, legacy: false };
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return { ok: diff === 0, legacy: false };
}

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: '仅支持 POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { qq, password, deviceId, user_agent, ip: clientIp, kickDeviceId } = await request.json();
    const ip = request.headers.get('CF-Connecting-IP') || clientIp || '';
    
    if (!qq || !password || !deviceId) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 设备 id 会写进 token，只允许字母、数字、下划线和短横线
    if (!/^[\w-]{4,64}$/.test(String(deviceId))) {
      return new Response(JSON.stringify({ success: false, message: '设备标识格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ success: false, message: '服务器错误', error: '未读取到环境变量 SUPABASE_SERVICE_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.TOKEN_SECRET) {
      return new Response(JSON.stringify({ success: false, message: '服务器错误', error: '未读取到环境变量 TOKEN_SECRET' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';
    const serviceKey = env.SUPABASE_SERVICE_KEY;

    // 直接调用 Supabase REST 接口，不依赖 @supabase/supabase-js 包
    async function sbRest(path, options = {}) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: options.method || 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Supabase ${res.status}: ${text}`);
      }
      return text ? JSON.parse(text) : null;
    }

    const qqFilter = `qq=eq.${encodeURIComponent(String(qq))}`;

    // 查账号和吊销状态：两个查询同时发出，少等一次数据库往返
    const [rows, durRows] = await Promise.all([
      sbRest(`auth_credentials?${qqFilter}&select=qq,password_hash,is_activated,bound_devices&limit=1`),
      sbRest(`member_durations?${qqFilter}&select=status&limit=1`)
    ]);
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: '账号不存在' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 比对密码：支持新的哈希格式，也兼容旧的明文
    const pwdCheck = await checkPassword(password, user.password_hash);
    if (!pwdCheck.ok) {
      return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 旧明文密码登录成功后，自动改存为哈希
    if (pwdCheck.legacy) {
      await sbRest(`auth_credentials?${qqFilter}`, {
        method: 'PATCH',
        body: { password_hash: await hashPassword(password) }
      });
    }

    // 激活检查
    if (!user.is_activated) {
      return new Response(JSON.stringify({ success: false, message: '账号未激活' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 被后台吊销资格的账号不允许登录（durRows 已在上面和账号一起查询）
    if (Array.isArray(durRows) && durRows[0] && durRows[0].status === 'revoked') {
      return new Response(JSON.stringify({ success: false, message: '资格已被吊销，请联系管理员' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 设备绑定交给数据库函数 device_bind 一次完成：读取、踢人、绑定在同一个事务里，并发登录不会互相覆盖
    // 密码已在上面校验通过，才会走到这里
    const bindRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/device_bind`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_qq: String(qq),
        p_device: {
          id: String(deviceId),
          ua: user_agent || '',
          ip: ip || '',
          bound_at: new Date().toISOString()
        },
        p_kick_id: kickDeviceId ? String(kickDeviceId) : null
      })
    });
    if (!bindRes.ok) {
      throw new Error(`device_bind ${bindRes.status}: ${await bindRes.text()}`);
    }
    const bind = await bindRes.json();

    if (bind && bind.code === 'limit') {
      // 超出上限且没指定要踢的设备：返回已绑定设备，由前端弹出踢设备面板
      const list = Array.isArray(bind.devices) ? bind.devices : [];
      return new Response(JSON.stringify({
        success: false,
        reason: 'device_limit',
        message: '设备数量已达上限，请选择踢掉一个浏览器',
        devices: list.map(d => (typeof d === 'string'
          ? { id: d }
          : { id: d.id, ua: d.ua || '', ip: d.ip || '', last_active: d.last_active || d.bound_at || '' }))
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!bind || (bind.code !== 'ok' && bind.code !== 'already')) {
      throw new Error('设备绑定失败：' + (bind && bind.code));
    }

    // 签发带签名和有效期的 token
    const token = await signToken(String(qq), env.TOKEN_SECRET, String(deviceId));

    return new Response(JSON.stringify({ 
      success: true, 
      token: token,
      qq: qq 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: '服务器错误',
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
