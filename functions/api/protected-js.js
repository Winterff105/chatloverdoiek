export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const file = url.searchParams.get('file');
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const decoded = atob(token);
    if (!decoded.includes(':')) {
      return new Response('Invalid token', { status: 401 });
    }
  } catch {
    return new Response('Invalid token', { status: 401 });
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

    const content = await res.text();

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
