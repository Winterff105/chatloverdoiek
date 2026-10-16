/* =====================================================================
   本体开头 · 加载界面（ovo 背景 + 灰框文字 + 进度条）
   - 样式在 css/photo-loader.css（位置、字体、颜色都在那里改）
   - 进度条跟着真实加载走：背景图 + PHOTO_LIST 里的照片 + data-preload 的图片
   - 全部加载完成后，整屏淡出，进入本体
   可选设置（放在这个 js 加载之前）：
     window.PHOTO_BG          背景图路径，默认 'assets/前景/ovo.png'
     window.PHOTO_LIST        要等的照片，例如 ['assets/照片/1.jpg']
     window.PHOTO_LOADER_CSS  样式文件路径，默认 'css/photo-loader.css'
   ===================================================================== */
(function () {
    const BG = window.PHOTO_BG || 'assets/前景/ovo.png';
    const LIST = Array.isArray(window.PHOTO_LIST) ? window.PHOTO_LIST.slice() : [];
    const TIMEOUT = 30000;   // 兜底：超过 30 秒还有照片没读完，才强制进入（控制台会列出未读完的图片）
    const HOLD_MIN = 3000;   // 最少停留 3 秒，之后照片读完就进入
    const CSS_PATH = window.PHOTO_LOADER_CSS || 'css/photo-loader.css';

    const startedAt = Date.now();

    // 1. 样式文件（如果 index.html 已经引用了，就不重复加）
    if (!document.querySelector('link[href$="photo-loader.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_PATH;
        document.head.appendChild(link);
    }

    // 2. 页面结构（文字内容都在这里）
    const layer = document.createElement('div');
    layer.id = 'photoLoader';
    layer.className = 'pl-overlay';
    layer.innerHTML = `
      <div class="pl-stage" id="plStage">
        <img class="pl-bg" src="${BG}" alt="">
        <div class="pl-progress"><div class="pl-fill" id="plFill"></div></div>
        <div class="pl-dots" aria-hidden="true"><i></i><i></i></div>
        <div class="pl-text pl-title">WHATEVERCHAT</div>
        <div class="pl-text pl-author">†正牌作者「<span class="pl-hl">@26443012097</span>」<br>（xhs）†</div>
        <div class="pl-text pl-report">如果你玩到的是「<span class="pl-hl">倒卖或二传</span>」<br>的链接</div>
        <div class="pl-text pl-report2">请举报给我</div>
        <div class="pl-text pl-warn">我不允许任何形式的照搬、<br>扒源码、倒卖<br>不要盗取我的心血</div>
      </div>`;
    document.body.appendChild(layer);
    const fill = document.getElementById('plFill');

    // 3. 真实加载监控：页面里所有图片（含后来插入的、CSS 背景图）全部读完，进度条才走满
    const recs = [];                 // 每一项 { src, done }
    const seenSrc = new Set();
    const seenEl = new WeakMap();    // img 元素 -> 已登记的 src
    let started = false;             // main.js 完成首屏渲染后调用 start()
    let forced = false;              // 超时或手动强制
    let closing = false;

    function record(src) { const r = { src, done: false }; recs.push(r); return r; }

    function trackUrl(src) {
        if (!src || typeof src !== 'string' || seenSrc.has(src)) return;
        seenSrc.add(src);
        const r = record(src);
        const im = new Image();
        const end = () => { r.done = true; };
        im.onload = end;
        im.onerror = end;
        im.src = src;
    }

    function trackEl(img) {
        if (!(img instanceof HTMLImageElement)) return;
        if (img.closest('#photoLoader')) return;
        if (img.loading === 'lazy') return;          // 懒加载图在滚动前不会读，不能等它
        const src = img.getAttribute('src');
        if (!src || seenEl.get(img) === src) return;
        seenEl.set(img, src);
        const r = record(src);
        const end = () => { r.done = true; };
        if (img.complete) { end(); return; }
        img.addEventListener('load', end, { once: true });
        img.addEventListener('error', end, { once: true });
    }

    function trackCssBackgrounds(root) {
        root.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundImage;
            if (!bg || bg === 'none') return;
            const re = /url\((['"]?)(.*?)\1\)/g;
            let m;
            while ((m = re.exec(bg))) trackUrl(m[2]);
        });
    }

    // 监听 DOM：页面解析、渲染过程中新出现的图片也登记
    const mo = new MutationObserver(muts => {
        if (closing) return;
        muts.forEach(m => {
            if (m.type === 'attributes') { trackEl(m.target); return; }
            m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.tagName === 'IMG') trackEl(n);
                n.querySelectorAll && n.querySelectorAll('img').forEach(trackEl);
            });
        });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

    function addPhotos(arr) {
        if (!Array.isArray(arr)) return;
        arr.forEach(trackUrl);
    }
    window.addPhotosToLoader = addPhotos;

    let rawList = LIST;
    try {
        Object.defineProperty(window, 'PHOTO_LIST', {
            configurable: true,
            enumerable: true,
            get() { return rawList; },
            set(v) {
                rawList = Array.isArray(v) ? v : [];
                addPhotos(rawList);
            }
        });
    } catch (e) {}

    // 进度条：按真实完成比例推进（平滑过渡，所以能看到过程）；全部读完才走到 100%
    let shown = 0;
    function tick() {
        const total = recs.length;
        const done = recs.reduce((n, r) => n + (r.done ? 1 : 0), 0);
        const allDone = forced || (started && done === total);
        const real = total ? done / total : 0;
        const goal = allDone ? 1 : Math.min(real, 0.97);
        shown += (goal - shown) * 0.06;
        if (allDone && shown > 0.995) shown = 1;
        fill.style.width = (shown * 100).toFixed(2) + '%';

        if (allDone && shown >= 1 && Date.now() - startedAt >= HOLD_MIN) {
            closing = true;
            mo.disconnect();
            layer.classList.add('pl-hide');
            setTimeout(() => { if (layer.parentNode) layer.remove(); }, 800);
            return;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    /* main.js 首屏渲染完成后调用：补充壁纸、头像等资源并开始等待 */
    function start(extra) {
        if (started) return;
        started = true;
        if (Array.isArray(extra)) extra.forEach(trackUrl);
        const phone = document.getElementById('phoneContainer');
        if (phone) trackCssBackgrounds(phone);
        document.querySelectorAll('#phoneContainer img').forEach(trackEl);
    }
    window.PhotoLoader = { start, track: trackUrl };
    window.hidePhotoLoader = () => { forced = true; };

    // 兜底：如果 main.js 没有调用 start，DOM 就绪后 2 秒自动开始
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => { if (!started) start(); }, 2000);
    });

    // 立即登记背景图与配置的照片
    trackUrl(BG);
    addPhotos(LIST);
    document.querySelectorAll('img[data-preload]').forEach(i => trackEl(i));

    // 超时保护：超过 TIMEOUT 仍未读完，强制进入，并列出没读完的图片
    setTimeout(() => {
        if (closing) return;
        const pending = recs.filter(r => !r.done).map(r => r.src);
        if (pending.length) console.warn('[PhotoLoader] 超时，以下图片未读完:', pending);
        forced = true;
    }, TIMEOUT);

})();

/* ---- 自动全屏：进入后尽量进入浏览器全屏 ----
   浏览器要求必须有一次用户点击/触摸才允许全屏，所以：
   - 页面一打开先试一次（多数浏览器会拒绝，正常）
   - 之后第一次点击或触摸屏幕时进入全屏，成功后就不再重复进入
   iPhone 的 Safari 不支持网页全屏，这种情况下请用“添加到主屏幕”打开 */
(function autoFullscreen(){
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!request) return;
    const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const enter = () => {
        if (isFull()) return;
        try {
            const p = request.call(el);
            if (p && p.catch) p.catch(() => {});
        } catch (e) {}
    };
    const events = ['pointerdown', 'touchend', 'keydown'];
    const onGesture = () => {
        enter();
        if (isFull()) events.forEach(t => window.removeEventListener(t, onGesture, true));
    };
    events.forEach(t => window.addEventListener(t, onGesture, true));
    enter();
})();
