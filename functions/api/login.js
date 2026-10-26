export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: '仅支持 POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { qq, password, deviceId } = await request.json();
    
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

    // 设备绑定检查
    const boundDevices = user.bound_devices || [];
    if (!boundDevices.includes(deviceId)) {
      if (boundDevices.length >= 2) {
        // 超出上限，写申请记录
        await supabase.from('device_requests').insert({
          qq: qq,
          device_id: deviceId,
          request_time: new Date().toISOString(),
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
        // 自动绑定
        const newDevices = [...boundDevices, deviceId];
        await supabase
          .from('auth_credentials')
          .update({ bound_devices: newDevices })
          .eq('qq', qq);
      }
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
