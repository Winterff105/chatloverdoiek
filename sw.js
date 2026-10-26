// Whatever · Service Worker：让应用可以被"添加到主屏幕"，并在离线时用缓存打开
const CACHE_NAME = 'Whatever-v7';
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
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
         .then(() => {
            // 通知所有打开的页面"有新版本了"
            return self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    // 关键资源（图标、manifest）优先使用缓存，加快启动
    // 注意：index.html 不走缓存优先，保证页面改动能立即生效
    const url = new URL(req.url);
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
