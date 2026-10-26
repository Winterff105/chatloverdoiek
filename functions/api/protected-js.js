export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const file = url.searchParams.get('file');
  const token = url.searchParams.get('token');

  // 校验 token
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

  // 文件白名单
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
    'js/main.js'
  ];

  if (!file || !allowedFiles.includes(file)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 从 Pages 静态资源读取文件
  const assetResponse = await env.ASSETS.fetch(new URL(file, request.url));
  
  if (!assetResponse.ok) {
    return new Response('File not found', { status: 404 });
  }

  const content = await assetResponse.text();

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
