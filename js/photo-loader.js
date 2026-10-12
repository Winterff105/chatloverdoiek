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
        <div class="pl-text pl-warn">我不允许任何形式的照搬、<br>扒源码、倒卖<br>不要盗取我的新血</div>
      </div>`;
    document.body.appendChild(layer);
    const fill = document.getElementById('plFill');

    // 3. 要等的地址：背景图 + PHOTO_LIST + data-preload 的图片
    const urls = Array.from(new Set(
        [BG].concat(LIST, Array.from(document.querySelectorAll('img[data-preload]'))
            .map(i => i.getAttribute('src')).filter(Boolean))
    ));
    const total = urls.length;
    let done = 0, finished = false;

    // 进度条：每一帧平滑往目标走。目标 = 真实加载进度，和“按时间慢慢爬”两者取大的那个，
    // 所以素材少、加载很快时也会有明显的推进；全部完成后走到 100%
    let shown = 0, closing = false;
    function tick() {
        const realT = total ? Math.min(done / total, 0.92) : 0;
        const timeT = Math.min(0.92, (Date.now() - startedAt) / HOLD_MIN * 0.92);
        const loaded = done >= total;
        // 还在加载：跟着真实进度（但不超过 92%）；已经全部加载：按时间慢慢走完停留时间；淡出那一刻走到 100%
        const goal = closing ? 1 : (loaded ? timeT : Math.max(realT, timeT));
        shown += (goal - shown) * 0.08;
        if (closing && shown > 0.995) shown = 1;
        fill.style.width = (shown * 100).toFixed(2) + '%';
        if (!closing || shown < 1) requestAnimationFrame(tick);
    }
    function setProgress() { /* 进度由 tick() 每帧更新 */ }
    requestAnimationFrame(tick);

    function finish() {
        if (finished) return;
        finished = true;
        done = total; setProgress();                    // 进度条走到 100%
        // 照片读完也要等够最短停留时间（默认 5 秒）再淡出
        const wait = Math.max(350, HOLD_MIN - (Date.now() - startedAt));   // 至少停满 3 秒
        setTimeout(() => {
            closing = true;                                 // 进度条此刻走到 100%
            layer.classList.add('pl-hide');
            setTimeout(() => layer.remove(), 800);
        }, wait);
    }

    window.hidePhotoLoader = finish;

    urls.forEach(src => {
        const im = new Image();
        const one = () => { done++; setProgress(); if (done >= total) finish(); };   // 照片全部读完就进入
        im.onload = one;
        im.onerror = one;                               // 读取失败也算完成，不卡住
        im.src = src;
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
