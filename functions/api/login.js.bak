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

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://tjgxfyblzgqwxwfwvfol.supabase.co',
      env.SUPABASE_SERVICE_KEY
    );

    // 查账号
    const { data: user, error: userError } = await supabase
      .from('auth_credentials')
      .select('qq, password_hash, is_activated, bound_devices')
      .eq('qq', qq)
      .single();

    if (userError || !user) {
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
        await supabase.from('device_requests').insert({
          applicant_qq: qq,
          device_fingerprint: deviceId,
          user_agent: user_agent || '',
          ip: ip || '',
          status: 'pending'
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
        await supabase
          .from('auth_credentials')
          .update({ bound_devices: newDevices, last_login_at: new Date().toISOString() })
          .eq('qq', qq);
      }
    } else {
      await supabase
        .from('auth_credentials')
        .update({ last_login_at: new Date().toISOString() })
        .eq('qq', qq);
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
