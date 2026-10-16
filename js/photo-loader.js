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
    const TIMEOUT = 15000;   // 兜底：照片一直读不出来，最多等 15 秒
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

    // 3. 真实照片加载监控：必须真实照片全部加载完毕才进入
    const trackedUrls = new Set();
    let total = 0, done = 0, finished = false, closing = false;

    function trackUrl(src) {
        if (!src || trackedUrls.has(src)) return;
        trackedUrls.add(src);
        total++;
        const im = new Image();
        const onEnd = () => {
            done++;
            checkDone();
        };
        im.onload = onEnd;
        im.onerror = onEnd;
        im.src = src;
    }

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

    // 进度条：完全由真实照片加载推进，不靠时间伪装
    let shown = 0;
    function tick() {
        const realT = total > 0 ? (done / total) : 0;
        const goal = closing ? 1 : (finished ? 1 : Math.min(0.98, realT));
        shown += (goal - shown) * 0.1;
        if (closing && shown > 0.995) shown = 1;
        fill.style.width = (shown * 100).toFixed(2) + '%';
        if (!closing || shown < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function checkDone() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkDone, { once: true });
            return;
        }
        if (total > 0 && done >= total && !finished) {
            finish();
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        const wait = Math.max(300, HOLD_MIN - (Date.now() - startedAt));
        setTimeout(() => {
            closing = true;
            layer.classList.add('pl-hide');
            setTimeout(() => { if (layer.parentNode) layer.remove(); }, 800);
        }, wait);
    }

    window.hidePhotoLoader = finish;

    // 立即登记背景图与所有需要加载的真实照片
    trackUrl(BG);
    addPhotos(LIST);
    document.querySelectorAll('img[data-preload]').forEach(i => {
        const s = i.getAttribute('src');
        if (s) trackUrl(s);
    });

    setTimeout(finish, TIMEOUT);                        // 超时保护
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
