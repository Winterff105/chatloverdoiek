/* Chérie Music server-side asset gateway.
 * The music source JS remains a Pages static build asset but direct routes are
 * denied by functions/_middleware.js. Only signed app sessions get the source.
 * GitHub repository visibility is a separate concern: public GitHub source is public.
 */
const enc = new TextEncoder();
const SUPABASE_URL = 'https://tjgxfyblzgqwxwfwvfol.supabase.co';
const FILES = Object.freeze({
  'music.js': '/music/music.js',
  'music-api.js': '/music/music-api.js'
});

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function decodeB64url(s) {
  const str = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const chars = atob(str + '='.repeat((4 - str.length % 4) % 4));
  return Uint8Array.from(chars, c => c.charCodeAt(0));
}

async function verifySession(token, secret) {
  try {
    const [payload, signature, extra] = String(token || '').split('.');
    if (!payload || !signature || extra) return null;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeB64url(signature), enc.encode(payload));
    if (!valid) return null;
    const [qq, exp, deviceId] = new TextDecoder().decode(decodeB64url(payload)).split(':');
    if (!/^\d{5,12}$/.test(String(qq)) || !Number.isFinite(Number(exp)) || Number(exp) <= Date.now()) return null;
    return { qq, deviceId: deviceId || '' };
  } catch (_) { return null; }
}

async function checkActiveAccount(session, serviceKey) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const q = encodeURIComponent(session.qq);
  const [accountRes, statusRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?qq=eq.${q}&select=is_activated,bound_devices&limit=1`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/member_durations?qq=eq.${q}&select=status&limit=1`, { headers })
  ]);
  if (!accountRes.ok || !statusRes.ok) throw new Error('Account lookup failed');
  const accounts = await accountRes.json();
  const durations = await statusRes.json();
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (!account?.is_activated || (Array.isArray(durations) && durations[0]?.status === 'revoked')) return false;
  if (session.deviceId) {
    const devices = Array.isArray(account.bound_devices) ? account.bound_devices : [];
    if (!devices.some(d => (typeof d === 'string' ? d : d?.id) === session.deviceId)) return false;
  }
  return true;
}

export async function onRequestPost({ request, env }) {
  if (!env.TOKEN_SECRET || !env.SUPABASE_SERVICE_KEY || !env.ASSETS) {
    return json({ success: false, message: '音乐服务暂不可用' }, 503);
  }
  let body;
  try { body = await request.json(); } catch (_) { return json({ success: false, message: '无效请求' }, 400); }
  const session = await verifySession(body?.token, env.TOKEN_SECRET);
  if (!session) return json({ success: false, message: '请重新登录后打开音乐' }, 401);
  try {
    if (!(await checkActiveAccount(session, env.SUPABASE_SERVICE_KEY))) {
      return json({ success: false, message: '登录设备已失效或账号不可用' }, 403);
    }
    const entries = await Promise.all(Object.entries(FILES).map(async ([name, path]) => {
      // ASSETS.fetch accesses the deploy's static asset binding, NOT the public direct URL.
      const response = await env.ASSETS.fetch(new URL(path, request.url));
      if (!response.ok) throw new Error('Missing asset: ' + name);
      return [name, await response.text()];
    }));
    return json({ success: true, files: Object.fromEntries(entries) });
  } catch (error) {
    console.error('[music-core]', error?.message || error);
    return json({ success: false, message: '音乐资源加载失败，请稍后重试' }, 502);
  }
}
