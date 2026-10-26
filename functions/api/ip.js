// Cloudflare Pages Function：服务器端直接读取访问者真实公网 IP，路由为 /api/ip
export async function onRequestGet(context) {
  const ip = context.request.headers.get('CF-Connecting-IP') || '未知';
  return new Response(JSON.stringify({ ip }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
