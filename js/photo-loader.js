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

    function setProgress() {
        fill.style.width = Math.round((done / total) * 100) + '%';
    }

    function finish() {
        if (finished) return;
        finished = true;
        done = total; setProgress();                    // 进度条走到 100%
        // 照片读完也要等够最短停留时间（默认 5 秒）再淡出
        const wait = Math.max(350, HOLD_MIN - (Date.now() - startedAt));   // 至少停满 3 秒
        setTimeout(() => {
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
