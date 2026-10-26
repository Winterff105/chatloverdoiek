export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: '仅支持 POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { qq, password, deviceId, user_agent, ip } = await request.json();
    
    if (!qq || !password || !deviceId) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
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

    // 查账号
    const rows = await sbRest(`auth_credentials?${qqFilter}&select=qq,password_hash,is_activated,bound_devices&limit=1`);
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: '账号不存在' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 比对密码（明文）
    if (user.password_hash !== password) {
      return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 激活检查
    if (!user.is_activated) {
      return new Response(JSON.stringify({ success: false, message: '账号未激活' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 设备绑定检查：bound_devices 存的是对象 {id, ua, ip, bound_at}，同时兼容旧的纯字符串
    const boundDevices = Array.isArray(user.bound_devices) ? user.bound_devices : [];
    const deviceIdOf = d => (typeof d === 'string' ? d : (d && d.id));
    const alreadyBound = boundDevices.some(d => deviceIdOf(d) === deviceId);

    if (!alreadyBound) {
      if (boundDevices.length >= 2) {
        // 超出上限：写申请记录，字段名与后台 overseer.js 读取的保持一致
        await sbRest('device_requests', {
          method: 'POST',
          body: {
            applicant_qq: qq,
            device_fingerprint: deviceId,
            user_agent: user_agent || '',
            ip: ip || '',
            status: 'pending'
          }
        });
        return new Response(JSON.stringify({ 
          success: false, 
          reason: 'pending_approval',
          message: '设备数量已达上限，已提交审核申请' 
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // 自动绑定：存成对象，和心跳、后台换绑逻辑格式一致
        const newDevices = [...boundDevices, {
          id: deviceId,
          ua: user_agent || '',
          ip: ip || '',
          bound_at: new Date().toISOString()
        }];
        await sbRest(`auth_credentials?${qqFilter}`, {
          method: 'PATCH',
          body: { bound_devices: newDevices, last_login_at: new Date().toISOString() }
        });
      }
    } else {
      await sbRest(`auth_credentials?${qqFilter}`, {
        method: 'PATCH',
        body: { last_login_at: new Date().toISOString() }
      });
    }

    // 生成 token（简单方案：base64(qq:timestamp)）
    const token = btoa(`${qq}:${Date.now()}`);

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
