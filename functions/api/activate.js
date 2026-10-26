/* 激活并设置密码：后端校验审核状态与邮箱验证码，再保存哈希后的密码 */
const enc = new TextEncoder();
const PBKDF2_ITER = 100000;
const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';

function b64url(bytes) {
  let s = '';
  new Uint8Array(bytes).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signToken(qq, secret, days = 30) {
  const exp = Date.now() + days * 86400000;
  const payload = b64url(enc.encode(`${qq}:${exp}`));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, key, 256));
  return `pbkdf2$${PBKDF2_ITER}$${b64url(salt)}$${b64url(hash)}`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') return json({ success: false, message: '仅支持 POST' }, 405);
  if (!env.SUPABASE_SERVICE_KEY || !env.TOKEN_SECRET) {
    return json({ success: false, message: '服务器错误', error: '缺少环境变量 SUPABASE_SERVICE_KEY 或 TOKEN_SECRET' }, 500);
  }

  let body;
  try { body = await request.json(); } catch (_) { return json({ success: false, message: '请求格式错误' }, 400); }

  const qq = String(body.qq || '').trim();
  const code = String(body.code || '').trim();
  const password = String(body.password || '');

  if (!/^\d{5,12}$/.test(qq)) return json({ success: false, message: 'QQ 号格式不正确' }, 400);
  if (!code) return json({ success: false, message: '请输入激活码' }, 400);
  if (password.length < 6) return json({ success: false, message: '密码至少 6 位' }, 400);

  const serviceKey = env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  try {
    // 1. 必须是审核通过的 QQ
    const appRes = await fetch(`${SUPABASE_URL}/rest/v1/applications?applicant_qq=eq.${encodeURIComponent(qq)}&status=eq.approved&select=id&limit=1`, { headers });
    if (!appRes.ok) return json({ success: false, message: '审核核验失败', error: await appRes.text() }, 500);
    const apps = await appRes.json();
    if (!Array.isArray(apps) || !apps.length) return json({ success: false, message: '未找到该 QQ 的审核通过记录' }, 403);

    // 2. 由后端校验邮箱验证码
    const email = `${qq}@qq.com`;
    const otpRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'email', email, token: code })
    });
    if (!otpRes.ok) return json({ success: false, message: '激活码不正确或已过期，请重新获取' }, 401);

    // 3. 保存哈希密码（已存在则更新，保留已绑定的设备）
    const upRes = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?on_conflict=qq`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        qq,
        email,
        password_hash: await hashPassword(password),
        is_activated: true,
        last_login_at: new Date().toISOString()
      })
    });
    if (!upRes.ok) return json({ success: false, message: '保存密码失败', error: await upRes.text() }, 500);

    return json({ success: true, qq, token: await signToken(qq, env.TOKEN_SECRET) });
  } catch (error) {
    return json({ success: false, message: '服务器错误', error: error.message }, 500);
  }
}
