// Whatever · Service Worker：让应用可以被"添加到主屏幕"，并在离线时用缓存打开
// 每次改了 index.html 或公开资源，把这里的数字 +1，用户端就会收到更新提示
const APP_VERSION = '14';
const CACHE_NAME = 'Whatever-v' + APP_VERSION;
// 首页缓存用 './' 而不是 './index.html'：Cloudflare 会把 /index.html 308 跳转到 /，
// 缓存进去的就是"跳转过的响应"，Safari 会拒绝显示
const CRITICAL_ASSETS = [
    './',
    './manifest.json',
    './assets/IMG_20261008_161846.jpg',
    './assets/ovo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CRITICAL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        const oldKeys = keys.filter(key => key !== CACHE_NAME);
        await Promise.all(oldKeys.map(key => caches.delete(key)));
        await self.clients.claim();
        // 把当前版本号告诉所有打开的页面，由页面对比本地记录决定要不要提示
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({ type: 'NEW_VERSION', version: APP_VERSION }));
    })());
});

// 页面每次打开都会主动询问当前版本号
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION' && event.source) {
        event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
    }
});

// 把"被重定向过的响应"重新包装成普通响应，导航请求才能使用
async function cleanRedirect(res) {
    if (!res.redirected) return res;
    const body = await res.blob();
    return new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
    });
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    const url = new URL(req.url);

    // 后端接口（登录、心跳、带 token 的受保护代码）一律不经过 SW、不进缓存
    if (url.pathname.startsWith('/api/')) return;

    // sw.js 自身不缓存，保证浏览器每次都能拿到最新版本
    if (url.pathname.endsWith('/sw.js')) return;

    // 打开页面：网络优先，断网用缓存
    // Safari 不接受带跳转记录的页面响应，所以无论来自网络还是缓存，返回前都先清洗一遍
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const res = await fetch(req);
                const clean = await cleanRedirect(res);
                if (clean.ok) {
                    const copy = clean.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./', copy));
                }
                return clean;
            } catch (e) {
                const cached = (await caches.match('./')) || (await caches.match('./index.html'));
                if (!cached) return Response.error();
                return cleanRedirect(cached);
            }
        })());
        return;
    }

    // 关键资源（图标、manifest）优先使用缓存，加快启动
    const isCritical = CRITICAL_ASSETS
        .filter(asset => asset !== './' && !asset.endsWith('.html'))
        .some(asset => url.pathname.endsWith(asset.replace(/^\./, '')));

    if (isCritical) {
        event.respondWith(
            caches.match(req).then(cached => {
                const networkFetch = fetch(req).then(res => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
                    }
                    return res;
                }).catch(() => cached);
                return cached || networkFetch;
            })
        );
    } else {
        // 其他资源网络优先
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
    }
});
