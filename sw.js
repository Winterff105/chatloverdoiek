// Whatever · Service Worker：让应用可以被"添加到主屏幕"，并在离线时用缓存打开
// 每次改了 index.html 或公开资源，把这里的数字 +1，用户端就会收到更新提示
const CACHE_NAME = 'Whatever-v8';
const CRITICAL_ASSETS = [
    './index.html',
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
        // 存在旧版本缓存，说明是升级而不是首次安装，才通知页面"有新版本了"
        if (oldKeys.length > 0) {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
        }
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    const url = new URL(req.url);

    // 后端接口（登录、心跳、带 token 的受保护代码）一律不经过 SW、不进缓存
    if (url.pathname.startsWith('/api/')) return;

    // sw.js 自身不缓存，保证浏览器每次都能拿到最新版本
    if (url.pathname.endsWith('/sw.js')) return;

    // 打开页面：绕过 Safari 的 HTTP 缓存直接拿最新 index.html，断网时回退到缓存
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(new Request(req.url, { cache: 'no-store', credentials: 'same-origin' }))
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    }
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 关键资源（图标、manifest）优先使用缓存，加快启动
    const isCritical = CRITICAL_ASSETS
        .filter(asset => !asset.endsWith('.html'))
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
