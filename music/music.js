/* Chérie Music — 原版完整业务 JS（从 abcd(8).html 无删减拆出，仅修正 assets 路径）。
   真实 AI 对接独立放在 music-api.js；模拟玩法保留作为原源码的一部分。 */

(function (root) {
  // scale：边缘折射强度（像素）；bezel：折射边缘宽度；blur：玻璃模糊度，设为 0 即完全清晰
  const DEFAULTS = { scale: 24, bezel: 12, blur: 1, saturate: 1.6 };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ua = navigator.userAgent;
  // 只有 Chromium 内核支持 backdrop-filter: url(#svg滤镜)，其余浏览器退化为通透玻璃
  const canRefract = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\/|FxiOS/.test(ua);
  const items = new Map();
  let defs = null, uid = 0;

  function ensureDefs() {
    if (defs) return defs;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  // 生成位移贴图：算法与原 WebGL shader 一致，只在圆角边缘向内折射
  function buildMap(w, h, r, bezel) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const d = img.data;
    const hw = w / 2, hh = h / 2;
    r = Math.min(r, hw, hh);
    const bz = Math.max(1, Math.min(bezel, hw, hh));
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const cx = px + 0.5 - hw, cy = py + 0.5 - hh;
        const qx = Math.abs(cx) - (hw - r), qy = Math.abs(cy) - (hh - r);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0), ol = Math.hypot(ox, oy);
        const depth = -(ol + Math.min(Math.max(qx, qy), 0) - r);
        let nx = 0, ny = 0;
        if (ol > 0) { nx = Math.sign(cx) * ox / ol; ny = Math.sign(cy) * oy / ol; }
        else if (qx > qy) nx = Math.sign(cx);
        else ny = Math.sign(cy);
        const m = (depth >= 0 && depth < bz) ? Math.pow(1 - depth / bz, 3) : 0;
        const i = (py * w + px) * 4;
        d[i] = 128 - nx * m * 127;
        d[i + 1] = 128 - ny * m * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function createFilter(id) {
    const f = document.createElementNS(SVG_NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0');
    f.setAttribute('y', '0');
    f.setAttribute('width', '100%');
    f.setAttribute('height', '100%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const img = document.createElementNS(SVG_NS, 'feImage');
    img.setAttribute('x', '0');
    img.setAttribute('y', '0');
    img.setAttribute('preserveAspectRatio', 'none');
    img.setAttribute('result', 'map');
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'map');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    f.appendChild(img);
    f.appendChild(disp);
    ensureDefs().appendChild(f);
    return { img, disp };
  }

  function update(el) {
    const st = items.get(el);
    if (!st || !el.isConnected) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 4 || h < 4) return; // 隐藏状态（如胶囊未播放时）跳过，显示后 ResizeObserver 会再触发
    const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const key = w + '|' + h + '|' + r;
    if (key === st.key) return;
    st.key = key;
    const o = st.o;
    const base = `blur(${o.blur}px) saturate(${o.saturate})`;
    el.style.webkitBackdropFilter = base;
    if (!canRefract) {
      el.style.backdropFilter = base;
      return;
    }
    st.img.setAttribute('href', buildMap(w, h, r, o.bezel));
    st.img.setAttribute('width', String(w));
    st.img.setAttribute('height', String(h));
    st.disp.setAttribute('scale', String(o.scale));
    el.style.backdropFilter = `url(#${st.id}) ${base}`;
  }

  function apply(el, opt) {
    if (!el) return;
    let st = items.get(el);
    if (!st) {
      const id = 'liquid-glass-' + (++uid);
      const parts = canRefract ? createFilter(id) : { img: null, disp: null };
      st = { id, img: parts.img, disp: parts.disp, o: {}, key: '' };
      items.set(el, st);
      new ResizeObserver(() => update(el)).observe(el);
    }
    st.o = Object.assign({}, DEFAULTS, st.o, opt);
    st.key = '';
    update(el);
  }

  function wake() {
    items.forEach((_, el) => update(el));
  }

  function init() {
    return true;
  }

  root.LiquidGlass = { init, apply, wake };
})(window);

/* API 与业务逻辑 */
const API_BASES = [
    'https://apichatloveme.vercel.app',
    'https://netease-cloud-music-api-mu-ruby.vercel.app',
    'https://netease-cloud-music-api-ten-sable.vercel.app',
    'https://netease-cloud-music-api-lyart-eight.vercel.app'
];
const METING_API = 'https://api.qijieya.cn/meting/';
const DEFAULT_COVER = '../assets/changpianmoren.jpg';

let currentTrackList = [];
let currentIndex = -1;
let isPlaying = false;
let userPlaylists = [];
let favoriteTracks = [];

const audio = document.getElementById('realAudio');
const trackGrid = document.getElementById('trackGrid');
const searchInput = document.getElementById('searchInput');
const vinylCabinet = document.getElementById('vinylCabinet');
const dockVinylAvatar = document.getElementById('dockVinylAvatar');

async function fetchWithFallback(pathAndQuery) {
    let lastError = null;
    for (const base of API_BASES) {
        try {
            const url = `${base}${pathAndQuery}`;
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 15000);
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(tid);
            if (res.ok) {
                const data = await res.json();
                if (data) return data;
            }
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('All API nodes failed');
}

function formatDuration(ms) {
    const sec = Math.floor((ms || 0) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

/* 实色胶囊弹出提示：type 为 'success' 时是白色，默认红色报错 */
function showToast(message, type) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const ok = type === 'success';
    const el = document.createElement('div');
    el.className = 'toast-pill' + (ok ? ' success' : '');
    el.setAttribute('role', ok ? 'status' : 'alert');
    el.innerHTML = `<i class="${ok ? 'ri-check-line' : 'ri-error-warning-fill'}"></i><span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);
    while (stack.children.length > 3) stack.firstElementChild.remove();
    void el.offsetWidth; // 触发重排，保证渐显动画生效
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 2400);
}

/* 列表内的报错胶囊 */
function errorBlock(text) {
    return `<div style="grid-column: 1/-1; display: flex; justify-content: center; padding: 40px 0;"><span class="error-pill"><i class="ri-error-warning-fill"></i><span>${escapeHtml(text)}</span></span></div>`;
}

/* 内置弹窗：返回 Promise
   AppDialog.alert('内容')                     → 点确定后 resolve
   AppDialog.confirm('内容')                   → resolve(true / false)
   AppDialog.prompt('内容', { defaultValue })  → resolve(输入的文字 / null) */
const AppDialog = (function () {
    const mask = document.getElementById('appDialog');
    const titleEl = document.getElementById('appDialogTitle');
    const msgEl = document.getElementById('appDialogMessage');
    const input = document.getElementById('appDialogInput');
    const okBtn = document.getElementById('appDialogOk');
    const cancelBtn = document.getElementById('appDialogCancel');
    let resolver = null;
    let mode = 'alert';
    let lastFocus = null;

    function close(result) {
        if (!resolver) return;
        const done = resolver;
        resolver = null;
        mask.classList.remove('show');
        mask.setAttribute('aria-hidden', 'true');
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        done(result);
    }

    function cancelResult() {
        if (mode === 'confirm') return false;
        if (mode === 'prompt') return null;
        return undefined;
    }

    function open(opts) {
        // 上一个还没关就按取消处理
        if (resolver) close(cancelResult());
        mode = opts.mode;
        titleEl.textContent = opts.title || '提示';
        msgEl.textContent = opts.message || '';
        msgEl.hidden = !opts.message;
        input.hidden = mode !== 'prompt';
        input.value = opts.defaultValue || '';
        input.placeholder = opts.placeholder || '';
        okBtn.textContent = opts.okText || '确定';
        cancelBtn.textContent = opts.cancelText || '取消';
        cancelBtn.hidden = mode === 'alert';
        lastFocus = document.activeElement;
        mask.classList.add('show');
        mask.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => (mode === 'prompt' ? input : okBtn).focus());
        return new Promise(resolve => { resolver = resolve; });
    }

    okBtn.addEventListener('click', () => close(mode === 'prompt' ? input.value : true));
    cancelBtn.addEventListener('click', () => close(cancelResult()));
    mask.addEventListener('click', (e) => {
        if (e.target === mask) close(cancelResult());
    });
    mask.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            close(cancelResult());
        } else if (e.key === 'Enter' && e.target !== cancelBtn) {
            e.preventDefault();
            close(mode === 'prompt' ? input.value : true);
        }
    });

    return {
        alert: (message, opts) => open(Object.assign({}, opts, { mode: 'alert', message })),
        confirm: (message, opts) => open(Object.assign({}, opts, { mode: 'confirm', message })),
        prompt: (message, opts) => open(Object.assign({}, opts, { mode: 'prompt', message })),
        isOpen: () => !!resolver
    };
})();

// 任何地方再调用系统 alert，都改为显示内置弹窗
window.alert = (message) => {
    AppDialog.alert(message == null ? '' : String(message));
};

function switchPageTab(btn) {
    document.querySelectorAll('.dock-page-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const targetScene = btn.getAttribute('data-target');
    document.querySelectorAll('.view-scene').forEach(scene => {
        scene.classList.toggle('active', scene.id === targetScene);
    });
    if (window.LiquidGlass) LiquidGlass.wake();
}

/* 渲染唱片柜子 */
function renderVinylCabinet(list) {
    if (!list || !list.length) {
        vinylCabinet.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-faint); font-size: 11px;">暂无唱片</div>';
        return;
    }
    vinylCabinet.innerHTML = list.map((track, i) => `
        <div class="vinyl-slot ${i === 0 ? 'featured' : ''}" onclick="playTrackIndex(${i})">
            <img class="vinyl-cover" src="${escapeHtml(track.cover)}?param=300y300" loading="lazy" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'">
            <div class="vinyl-info">${escapeHtml(track.title)}</div>
            <div class="vinyl-artist">${escapeHtml(track.artist)}</div>
        </div>
    `).join('');
}

async function fetchHotSongs() {
    vinylCabinet.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-faint); font-size: 11px;">加载网易云热歌中...</div>';
    trackGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-faint); font-size: 11px;">加载网易云热歌中...</div>';
    document.getElementById('listBadge').textContent = 'HOT 30';
    document.getElementById('cabinetCounter').textContent = 'HOT 30';
    try {
        const json = await fetchWithFallback('/playlist/detail?id=3778678');

        if (json && json.playlist && Array.isArray(json.playlist.tracks)) {
            currentTrackList = json.playlist.tracks.slice(0, 30).map(t => ({
                id: String(t.id),
                title: t.name,
                artist: (t.ar || []).map(a => a.name).join(' / ') || '未知歌手',
                cover: (t.al && t.al.picUrl) ? t.al.picUrl.replace('http://', 'https://') : DEFAULT_COVER,
                dt: t.dt
            }));
            renderVinylCabinet(currentTrackList);
            renderTracks(currentTrackList);
            document.getElementById('songCounterLabel').textContent = `${currentTrackList.length} Tracks`;
            document.getElementById('cabinetCounter').textContent = `${currentTrackList.length} 张唱片`;
        } else {
            throw new Error('解析失败');
        }
    } catch (e) {
        console.error(e);
        vinylCabinet.innerHTML = errorBlock('获取热歌榜失败，请点右上角刷新');
        trackGrid.innerHTML = errorBlock('获取热歌榜失败，请点右上角刷新');
    }
}

function renderTracks(list) {
    if (!list || !list.length) {
        trackGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-faint); font-size: 11px;">暂无曲目</div>';
        return;
    }
    trackGrid.innerHTML = list.map((track, i) => `
        <div class="track-card ${currentIndex === i ? 'active-play' : ''}" onclick="playTrackIndex(${i})">
            <img class="track-thumb" src="${escapeHtml(track.cover)}?param=80y80" loading="lazy" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'">
            <div class="track-meta">
                <div class="track-name">${escapeHtml(track.title)}</div>
                <div class="track-artist">${escapeHtml(track.artist)}</div>
            </div>
            <div class="track-time">${formatDuration(track.dt)}</div>
        </div>
    `).join('');
}

async function playTrackIndex(idx) {
    if (idx < 0 || idx >= currentTrackList.length) return;
    currentIndex = idx;
    const track = currentTrackList[idx];

    document.getElementById('heroVinylCover').src = `${track.cover}?param=200y200`;
document.getElementById('heroPhotoCover').src = `${track.cover}?param=300y300`;
document.getElementById('heroSongTitle').textContent = `${track.title} - ${track.artist}`;

document.getElementById('drawerDiscArt').src = `${track.cover}?param=400y400`;
document.getElementById('drawerSongName').textContent = track.title;
document.getElementById('drawerSongArtist').textContent = track.artist;
onDrawerTrackChange(track);

// 更新播放胶囊
document.getElementById('nowPlayingCapsule').style.display = 'flex';
document.getElementById('playingVinylArt').src = `${track.cover}?param=200y200`;
document.getElementById('playingTrackName').textContent = track.title;
document.getElementById('playingTrackArtist').textContent = track.artist;

    updateLikeIcon();
    renderTracks(currentTrackList);

    try {
        const urlData = await fetchWithFallback(`/song/url?id=${track.id}`);
        if (urlData && urlData.data && urlData.data[0] && urlData.data[0].url) {
            audio.src = urlData.data[0].url;
            await audio.play();
            setPlayState(true);
        } else {
            throw new Error('无音源');
        }
    } catch (e) {
        console.warn('主通道失败，尝试备用', e);
        audio.src = `${METING_API}?server=netease&type=url&id=${track.id}`;
        try {
            await audio.play();
            setPlayState(true);
        } catch (err) {
            showToast('该歌曲版权受限，无法播放');
            setPlayState(false);
        }
    }
}

function setPlayState(playing) {
    isPlaying = playing;
    const vinylHero = document.getElementById('heroVinylDisc');
    const vinylDrawer = document.getElementById('drawerDiscStage');
    const drawerIcon = document.getElementById('drawerPlayIcon');
    const playingVinyl = document.getElementById('playingVinylDisc');
    const capsuleIcon = document.getElementById('capsulePlayIcon');

    // 唱臂起落
    document.getElementById('drawerPlayer').classList.toggle('is-playing', playing);
    // 播放列表里当前曲目的音浪
    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel) queuePanel.classList.toggle('playing', playing);

    if (playing) {
        vinylHero.classList.remove('paused');
        vinylDrawer.classList.remove('paused');
        playingVinyl.classList.remove('paused');
        drawerIcon.className = 'ri-pause-fill';
        capsuleIcon.className = 'ri-pause-fill';
    } else {
        vinylHero.classList.add('paused');
        vinylDrawer.classList.add('paused');
        playingVinyl.classList.add('paused');
        drawerIcon.className = 'ri-play-fill';
        capsuleIcon.className = 'ri-play-fill';
    }
}

function togglePlayState() {
    if (!audio.src) {
        if (currentTrackList.length) playTrackIndex(0);
        return;
    }
    if (audio.paused) {
        audio.play().then(() => setPlayState(true)).catch(() => {});
    } else {
        audio.pause();
        setPlayState(false);
    }
}

function prevTrack() {
    if (!currentTrackList.length) return;
    let next = currentIndex - 1;
    if (next < 0) next = currentTrackList.length - 1;
    playTrackIndex(next);
}

/* 播放模式：列表循环 / 单曲循环 / 随机播放 */
const PLAY_MODES = [
    { key: 'loop', label: '循环', name: '列表循环', icon: 'ri-repeat-line' },
    { key: 'one', label: '单曲', name: '单曲循环', icon: 'ri-repeat-one-line' },
    { key: 'shuffle', label: '随机', name: '随机播放', icon: 'ri-shuffle-line' }
];
const PLAY_MODE_KEY = 'cherie.playMode';
let playMode = (function () {
    try {
        const saved = localStorage.getItem(PLAY_MODE_KEY);
        return PLAY_MODES.some(m => m.key === saved) ? saved : 'loop';
    } catch (e) {
        return 'loop';
    }
})();

function nextTrack() {
    if (!currentTrackList.length) return;
    const n = currentTrackList.length;
    let next;
    if (playMode === 'shuffle' && n > 1) {
        if (currentIndex < 0) {
            next = Math.floor(Math.random() * n);
        } else {
            // 随机但不重复当前这首
            next = Math.floor(Math.random() * (n - 1));
            if (next >= currentIndex) next += 1;
        }
    } else {
        next = currentIndex + 1;
        if (next >= n) next = 0;
    }
    playTrackIndex(next);
}

audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 1;
    const pct = Math.min(100, (cur / dur) * 100);
    document.getElementById('drawerSliderFill').style.width = pct + '%';
    document.getElementById('drawerTimeCurrent').textContent = formatDuration(cur * 1000);
    document.getElementById('drawerTimeTotal').textContent = formatDuration(dur * 1000);
    syncLyrics();
});

audio.addEventListener('ended', () => {
    if (playMode === 'one') {
        audio.currentTime = 0;
        audio.play().then(() => setPlayState(true)).catch(() => setPlayState(false));
        return;
    }
    nextTrack();
});

function seekAudio(e) {
    if (!document.getElementById('drawerPlayer').classList.contains('open')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) {
        audio.currentTime = audio.duration * ratio;
    }
}

function openDrawerPlayer() {
    document.getElementById('drawerPlayer').classList.add('open');
    requestAnimationFrame(centerLyric);
}
function closeDrawerPlayer() {
    closeComments();
    if (window.ListenTogether) ListenTogether.closeDrawerExtras();
    document.getElementById('drawerPlayer').classList.remove('open');
}

/* 切歌时更新播放器背景、第二页唱片光晕、歌词、评论、最近播放 */
function onDrawerTrackChange(track) {
    document.getElementById('drawerBgArt').src = `${track.cover}?param=500y500`;
    document.getElementById('drawerGlowArt').src = `${track.cover}?param=300y300`;
    document.getElementById('heroGlowArt').src = `${track.cover}?param=200y200`;
    loadLyrics(track);
    addToRecent(track);
    if (window.ListenTogether) window.ListenTogether.onTrackChange(track);
    if (window.PlayQueue) window.PlayQueue.refresh();
    commentState.id = null;
    document.getElementById('commentBtnLabel').textContent = '评论';
    if (document.getElementById('commentSheet').classList.contains('open')) {
        loadComments(true);
    }
}

/* ========== 我的：唱片展柜 ========== */
let recentTracks = [];
let shelfTracks = [];

function goProfile() {
    const btn = document.querySelector('.dock-page-btn[data-target="scene-profile"]');
    if (btn) btn.click();
}

function addToRecent(track) {
    recentTracks = [track, ...recentTracks.filter(t => t.id !== track.id)].slice(0, 30);
    renderProfileShelf();
}

// 展柜：先放收藏，再放最近播放，去重后最多 24 张
function renderProfileShelf() {
    const shelf = document.getElementById('recordShelf');
    const seen = new Set();
    shelfTracks = [...favoriteTracks, ...recentTracks]
        .filter(t => !seen.has(t.id) && seen.add(t.id))
        .slice(0, 24);

    document.getElementById('profileFavCount').textContent = favoriteTracks.length;
    document.getElementById('profileRecentCount').textContent = recentTracks.length;
    document.getElementById('shelfCounter').textContent = `${shelfTracks.length} 张`;

    if (!shelfTracks.length) {
        shelf.innerHTML = '<div class="shelf-empty">展柜还空着，去听几首歌或收藏喜欢的唱片吧</div>';
        return;
    }

    const favIds = new Set(favoriteTracks.map(t => t.id));
    shelf.innerHTML = shelfTracks.map((t, i) => `
        <div class="shelf-slot" role="button" tabindex="0" aria-label="播放 ${escapeHtml(t.title)}"
             onclick="playShelfIndex(${i})" onkeydown="if (event.key === 'Enter') playShelfIndex(${i})">
            <div class="shelf-record">
                <div class="shelf-disc"><img src="${escapeHtml(t.cover)}?param=80y80" loading="lazy" alt=""></div>
                <div class="shelf-sleeve"><img src="${escapeHtml(t.cover)}?param=200y200" loading="lazy" alt=""></div>
                ${favIds.has(t.id) ? '<i class="ri-heart-3-fill shelf-fav"></i>' : ''}
            </div>
            <div class="shelf-title">${escapeHtml(t.title)}</div>
            <div class="shelf-artist">${escapeHtml(t.artist)}</div>
        </div>
    `).join('');
}

function playShelfIndex(idx) {
    if (!shelfTracks[idx]) return;
    currentTrackList = shelfTracks.slice();
    playTrackIndex(idx);
}

renderProfileShelf();

/* ========== 我的：名字原地修改 ========== */
const NAME_KEY = 'cherie.nickname';
const DEFAULT_NAME = 'babydoll';
const NAME_MAX = 20;
const profileNameEl = document.getElementById('profileName');
let nameBeforeEdit = DEFAULT_NAME;

function applyNickname(name) {
    profileNameEl.textContent = name;
    const alt = `${name} 的头像`;
    document.getElementById('profileAvatar').alt = alt;
    const dockImg = document.querySelector('#userAvatar img');
    if (dockImg) dockImg.alt = alt;
}

function loadNickname() {
    let saved = '';
    try {
        saved = localStorage.getItem(NAME_KEY) || '';
    } catch (e) {
        // 隐私模式下 localStorage 可能不可用，直接用默认名字
    }
    applyNickname(saved || DEFAULT_NAME);
}

function placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function startEditName() {
    if (profileNameEl.isContentEditable) return;
    nameBeforeEdit = profileNameEl.textContent;
    profileNameEl.contentEditable = 'true';
    profileNameEl.classList.add('editing');
    profileNameEl.focus();
    // 全选，直接输入即可覆盖
    const range = document.createRange();
    range.selectNodeContents(profileNameEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function finishEditName(save) {
    if (!profileNameEl.isContentEditable) return;
    profileNameEl.contentEditable = 'false';
    profileNameEl.classList.remove('editing');
    profileNameEl.scrollLeft = 0;
    let name = profileNameEl.textContent.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    if (!save || !name) name = nameBeforeEdit;
    applyNickname(name);
    try {
        localStorage.setItem(NAME_KEY, name);
    } catch (e) {
        // 存不了就只在本次会话生效
    }
    if (save && name !== nameBeforeEdit) showToast('名字已更新', 'success');
}

profileNameEl.addEventListener('click', startEditName);
profileNameEl.addEventListener('blur', () => finishEditName(true));
profileNameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (profileNameEl.isContentEditable) finishEditName(true);
        else startEditName();
    } else if (e.key === 'Escape' && profileNameEl.isContentEditable) {
        e.stopPropagation();
        finishEditName(false);
    }
});
// 限制长度
profileNameEl.addEventListener('input', () => {
    const text = profileNameEl.textContent;
    if (text.length > NAME_MAX) {
        profileNameEl.textContent = text.slice(0, NAME_MAX);
        placeCaretAtEnd(profileNameEl);
    }
});
// 粘贴时只保留纯文字，避免带进样式和换行
profileNameEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\s+/g, ' ');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    sel.deleteFromDocument();
    sel.getRangeAt(0).insertNode(document.createTextNode(text));
    placeCaretAtEnd(profileNameEl);
    profileNameEl.dispatchEvent(new Event('input'));
});

loadNickname();

/* ========== 唱片 / 歌词 ========== */
const lyricView = document.getElementById('lyricView');
const lyricList = document.getElementById('lyricList');
const lyricState = { id: null, lines: [], active: -1 };

function toggleLyricView(force) {
    const stage = document.getElementById('drawerStage');
    const show = typeof force === 'boolean' ? force : !stage.classList.contains('show-lyrics');
    // 还没有播放任何曲目时，不切换到歌词
    if (show && currentIndex < 0) return;
    stage.classList.toggle('show-lyrics', show);
    document.getElementById('lyricToggleBtn').classList.toggle('active', show);
    if (show) requestAnimationFrame(centerLyric);
}

// 解析 LRC：支持 [mm:ss]、[mm:ss.xx]、[mm:ss.xxx]，一行多个时间标签
function parseLrc(text) {
    const map = new Map();
    String(text || '').split(/\r?\n/).forEach(raw => {
        const tags = raw.match(/\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/g);
        if (!tags) return;
        const content = raw.replace(/\[[^\]]*\]/g, '').trim();
        if (!content) return;
        tags.forEach(tag => {
            const m = tag.match(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/);
            const frac = m[3] ? parseInt(m[3], 10) / Math.pow(10, m[3].length) : 0;
            const t = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac;
            map.set(t.toFixed(2), { t, text: content, tr: '' });
        });
    });
    return Array.from(map.values()).sort((a, b) => a.t - b.t);
}

// 合并翻译歌词（按时间对齐）
function buildLyricLines(lrc, tlrc) {
    const main = parseLrc(lrc);
    const trans = parseLrc(tlrc);
    if (trans.length) {
        const map = new Map(trans.map(l => [Math.round(l.t * 10), l.text]));
        main.forEach(l => {
            const k = Math.round(l.t * 10);
            l.tr = map.get(k) || map.get(k - 1) || map.get(k + 1) || '';
        });
    }
    return main;
}

function setLyricTip(text) {
    lyricState.lines = [];
    lyricState.active = -1;
    lyricList.innerHTML = `<p class="lyric-tip">${escapeHtml(text)}</p>`;
    requestAnimationFrame(centerLyric);
    setHeroLyricTip(text);
}

function renderLyrics(lines) {
    lyricState.lines = lines;
    lyricState.active = -1;
    lyricList.innerHTML = lines.map((l, i) => `
        <p class="lyric-line" data-i="${i}">
            <span class="lyric-main">${escapeHtml(l.text)}</span>
            ${l.tr ? `<span class="lyric-tr">${escapeHtml(l.tr)}</span>` : ''}
        </p>
    `).join('');
    renderHeroLyrics(lines);
    syncLyrics(true);
}

/* 第二页歌名下的滚动歌词 */
const heroLyricList = document.getElementById('heroLyricList');
const HERO_LYRIC_LINE = 16; // 与 .hero-lyric-line 的 height 保持一致

function setHeroLyricTip(text) {
    heroLyricList.innerHTML = `<div class="hero-lyric-line active">${escapeHtml(text)}</div>`;
    heroLyricList.style.transform = 'translateY(0)';
}

function renderHeroLyrics(lines) {
    heroLyricList.innerHTML = lines.map(l => `<div class="hero-lyric-line">${escapeHtml(l.text)}</div>`).join('');
    heroLyricList.style.transform = 'translateY(0)';
}

function updateHeroLyric(idx) {
    const prev = heroLyricList.querySelector('.hero-lyric-line.active');
    if (prev) prev.classList.remove('active');
    if (idx >= 0 && heroLyricList.children[idx]) heroLyricList.children[idx].classList.add('active');
    heroLyricList.style.transform = `translateY(${-Math.max(idx, 0) * HERO_LYRIC_LINE}px)`;
}

async function loadLyrics(track) {
    const id = track.id;
    lyricState.id = id;
    setLyricTip('歌词加载中...');

    let lrc = '';
    let tlrc = '';
    let pure = false;
    try {
        const data = await fetchWithFallback(`/lyric?id=${encodeURIComponent(id)}`);
        lrc = (data && data.lrc && data.lrc.lyric) || '';
        tlrc = (data && data.tlyric && data.tlyric.lyric) || '';
        pure = !!(data && (data.pureMusic || data.nolyric));
    } catch (e) {
        console.warn('主通道歌词获取失败，尝试备用', e);
    }
    if (!lrc && !pure) {
        try {
            const res = await fetch(`${METING_API}?server=netease&type=lrc&id=${encodeURIComponent(id)}`);
            if (res.ok) lrc = await res.text();
        } catch (e) {
            console.warn('备用歌词获取失败', e);
        }
    }

    // 期间已经切歌就丢弃结果
    if (lyricState.id !== id) return;

    const lines = buildLyricLines(lrc, tlrc);
    if (!lines.length) {
        setLyricTip(pure ? '纯音乐，请欣赏' : '暂无歌词');
        return;
    }
    renderLyrics(lines);
}

function syncLyrics(force) {
    const lines = lyricState.lines;
    if (!lines.length) return;
    const t = (audio.currentTime || 0) + 0.2;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].t <= t) idx = i;
        else break;
    }
    if (idx === lyricState.active && !force) return;
    const prev = lyricList.querySelector('.lyric-line.active');
    if (prev) prev.classList.remove('active');
    if (idx >= 0 && lyricList.children[idx]) lyricList.children[idx].classList.add('active');
    lyricState.active = idx;
    updateHeroLyric(idx);
    centerLyric();
}

// 把当前行移动到歌词区域正中间
function centerLyric() {
    const target = lyricList.querySelector('.lyric-line.active')
        || lyricList.querySelector('.lyric-tip')
        || lyricList.firstElementChild;
    if (!target || !lyricView.clientHeight) return;
    const offset = target.offsetTop + target.offsetHeight / 2 - lyricView.clientHeight / 2;
    lyricList.style.transform = `translateY(${-offset}px)`;
}

function isDrawerOpen() {
    return document.getElementById('drawerPlayer').classList.contains('open');
}

// 点某行歌词跳转到对应位置（只在播放器打开且处于歌词视图时生效）
lyricList.addEventListener('click', (e) => {
    const line = e.target.closest('.lyric-line');
    if (!line) return;
    e.stopPropagation();
    if (!isDrawerOpen() || !document.getElementById('drawerStage').classList.contains('show-lyrics')) return;
    const item = lyricState.lines[Number(line.dataset.i)];
    if (!item || !audio.src) return;
    audio.currentTime = item.t;
    if (audio.paused) audio.play().then(() => setPlayState(true)).catch(() => {});
    syncLyrics(true);
});

window.addEventListener('resize', () => centerLyric(), { passive: true });

/* ========== 评论 ========== */
const commentList = document.getElementById('commentList');
const commentState = { id: null, offset: 0, total: 0, loading: false, hasMore: true };

function formatCount(n) {
    n = Number(n) || 0;
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万';
    return String(n);
}

function formatCommentTime(c) {
    if (c.timeStr) return c.timeStr;
    const d = new Date(c.time);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function commentItemHtml(c) {
    const user = c.user || {};
    const avatar = (user.avatarUrl || '').replace('http://', 'https://');
    const avatarHtml = avatar
        ? `<img class="comment-avatar" src="${escapeHtml(avatar)}?param=64y64" loading="lazy" alt="">`
        : '<div class="comment-avatar"></div>';
    return `
        <div class="comment-item">
            ${avatarHtml}
            <div class="comment-body">
                <div class="comment-top">
                    <span class="comment-name">${escapeHtml(user.nickname || '网易云用户')}</span>
                    <span class="comment-like"><i class="ri-thumb-up-line"></i>${formatCount(c.likedCount)}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content)}</div>
                <div class="comment-time">${escapeHtml(formatCommentTime(c))}</div>
            </div>
        </div>
    `;
}

function setCommentStatus(text, retry) {
    let el = commentList.querySelector('.comment-status');
    if (!el) {
        el = document.createElement('div');
        el.className = 'comment-status';
        commentList.appendChild(el);
    }
    el.innerHTML = retry
        ? `<span class="error-pill"><i class="ri-error-warning-fill"></i><span>${escapeHtml(text)}</span></span><button class="comment-retry" onclick="loadComments(false)">重试</button>`
        : escapeHtml(text);
}

function openComments() {
    if (currentIndex < 0) return;
    document.getElementById('commentSheet').classList.add('open');
    document.getElementById('commentMask').classList.add('show');
    const track = currentTrackList[currentIndex];
    if (commentState.id !== track.id) loadComments(true);
}

function closeComments() {
    document.getElementById('commentSheet').classList.remove('open');
    document.getElementById('commentMask').classList.remove('show');
}

async function loadComments(reset) {
    if (currentIndex < 0) return;
    if (reset) {
        const track = currentTrackList[currentIndex];
        Object.assign(commentState, { id: track.id, offset: 0, total: 0, loading: false, hasMore: true });
        commentList.innerHTML = '';
        commentList.scrollTop = 0;
        document.getElementById('commentTotal').textContent = '';
    }
    if (commentState.loading || !commentState.hasMore || !commentState.id) return;

    const id = commentState.id;
    const isFirst = commentState.offset === 0;
    commentState.loading = true;
    setCommentStatus('评论加载中...');

    try {
        const data = await fetchWithFallback(`/comment/music?id=${encodeURIComponent(id)}&limit=20&offset=${commentState.offset}`);
        if (commentState.id !== id) return;

        const hot = isFirst && Array.isArray(data.hotComments) ? data.hotComments : [];
        const list = Array.isArray(data.comments) ? data.comments : [];
        commentState.total = Number(data.total) || commentState.total;
        commentState.offset += list.length;
        commentState.hasMore = !!data.more && list.length > 0;

        const status = commentList.querySelector('.comment-status');
        if (status) status.remove();

        let html = '';
        if (hot.length) {
            html += '<div class="comment-group-title">精彩评论</div>' + hot.map(commentItemHtml).join('');
        }
        if (list.length) {
            if (isFirst) html += '<div class="comment-group-title">最新评论</div>';
            html += list.map(commentItemHtml).join('');
        }
        commentList.insertAdjacentHTML('beforeend', html);

        if (isFirst && !hot.length && !list.length) {
            setCommentStatus('还没有人评论，来抢沙发吧');
        } else if (!commentState.hasMore) {
            setCommentStatus('没有更多了');
        }

        if (commentState.total > 0) {
            document.getElementById('commentTotal').textContent = formatCount(commentState.total);
            document.getElementById('commentBtnLabel').textContent = `评论 ${formatCount(commentState.total)}`;
        }
    } catch (e) {
        if (commentState.id !== id) return;
        console.warn('评论获取失败', e);
        setCommentStatus('评论加载失败', true);
    } finally {
        if (commentState.id === id) commentState.loading = false;
    }
}

// 滚动到底自动加载更多
commentList.addEventListener('scroll', () => {
    if (commentList.scrollTop + commentList.clientHeight >= commentList.scrollHeight - 80) {
        loadComments(false);
    }
}, { passive: true });

// Esc：先关弹窗，再关评论，最后关播放器
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (AppDialog.isOpen()) return;
    if (document.querySelector('.quick-panel.show')) {
        closeQuickPanels();
        return;
    }
    if (window.PlayQueue && PlayQueue.isOpen()) {
        PlayQueue.close();
        return;
    }
    if (window.ListenTogether && ListenTogether.isHistoryOpen()) {
        ListenTogether.closeHistory();
        return;
    }
    if (window.ListenTogether && ListenTogether.isChatOpen()) {
        ListenTogether.closeChat();
        return;
    }
    if (window.ListenTogether && ListenTogether.isInlineOpen()) {
        ListenTogether.closeInline();
        return;
    }
    if (document.getElementById('qrModal').classList.contains('show')) {
        closeQrLogin();
        return;
    }
    if (document.getElementById('importModal').classList.contains('show')) {
        closeImportModal();
        return;
    }
    if (document.getElementById('commentSheet').classList.contains('open')) {
        closeComments();
    } else if (document.getElementById('drawerPlayer').classList.contains('open')) {
        closeDrawerPlayer();
    }
});

function toggleLikeCurrentSong() {
    if (currentIndex < 0) return;
    const track = currentTrackList[currentIndex];
    const idx = favoriteTracks.findIndex(t => t.id === track.id);
    if (idx >= 0) {
        favoriteTracks.splice(idx, 1);
    } else {
        favoriteTracks.unshift(track);
    }
    updateLikeIcon();
    renderFavorites();
    renderProfileShelf();
}

function updateLikeIcon() {
    const icon = document.getElementById('drawerLikeIcon');
    if (currentIndex < 0) {
        icon.className = 'ri-heart-3-line';
        icon.style.color = 'var(--text-muted)';
        return;
    }
    const track = currentTrackList[currentIndex];
    const isLiked = favoriteTracks.some(t => t.id === track.id);
    icon.className = isLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line';
    icon.style.color = isLiked ? 'var(--accent-pink)' : 'var(--text-muted)';
}

function renderFavorites() {
    const favGrid = document.getElementById('favoritesGrid');
    if (!favoriteTracks.length) {
        favGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding: 50px 0; color: var(--text-faint); font-size: 11px;">暂无收藏歌曲</div>';
        return;
    }
    favGrid.innerHTML = favoriteTracks.map((t, idx) => `
        <div class="track-card" onclick="playFavoriteIndex(${idx})">
            <img class="track-thumb" src="${escapeHtml(t.cover)}?param=80y80" loading="lazy">
            <div class="track-meta">
                <div class="track-name">${escapeHtml(t.title)}</div>
                <div class="track-artist">${escapeHtml(t.artist)}</div>
            </div>
            <div class="track-time">${formatDuration(t.dt)}</div>
        </div>
    `).join('');
}

function playFavoriteIndex(idx) {
    currentTrackList = favoriteTracks.slice();
    playTrackIndex(idx);
}

function openImportModal() {
    document.getElementById('importModal').classList.add('show');
    requestAnimationFrame(() => document.getElementById('importInput').focus());
}
function closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
}

const IMPORT_MAX_TRACKS = 1000;   // 单个歌单最多导入多少首
const SONG_DETAIL_BATCH = 200;    // 每次 /song/detail 请求的歌曲数

// 只匹配真正的 id 参数，避免把 userid=xxx 误认成歌单 ID
function parsePlaylistId(val) {
    const m = val.match(/[?&#]id=(\d+)/i)
        || val.match(/playlist\/(\d+)/i)
        || val.match(/^\s*(\d+)\s*$/);
    return m ? m[1] : '';
}

function mapNeteaseTrack(t) {
    return {
        id: String(t.id),
        title: t.name,
        artist: (t.ar || t.artists || []).map(a => a.name).join(' / ') || '未知歌手',
        cover: (t.al && t.al.picUrl) ? t.al.picUrl.replace('http://', 'https://') : DEFAULT_COVER,
        dt: t.dt
    };
}

// 未登录时 playlist.tracks 只有前几首，用 trackIds 分批补全
async function fetchPlaylistTracks(playlist) {
    const have = Array.isArray(playlist.tracks) ? playlist.tracks : [];
    const ids = (playlist.trackIds || []).map(x => String(x.id)).slice(0, IMPORT_MAX_TRACKS);
    if (!ids.length) return have.slice(0, IMPORT_MAX_TRACKS).map(mapNeteaseTrack);

    const byId = new Map(have.map(t => [String(t.id), t]));
    const missing = ids.filter(id => !byId.has(id));
    for (let i = 0; i < missing.length; i += SONG_DETAIL_BATCH) {
        const chunk = missing.slice(i, i + SONG_DETAIL_BATCH);
        try {
            const d = await fetchWithFallback(`/song/detail?ids=${chunk.join(',')}`);
            (d && Array.isArray(d.songs) ? d.songs : []).forEach(s => byId.set(String(s.id), s));
        } catch (e) {
            console.warn('补全歌单曲目失败，保留已获取的部分', e);
            break;
        }
    }
    return ids.map(id => byId.get(id)).filter(Boolean).map(mapNeteaseTrack);
}

// 备用通道：meting 返回 [{ name, artist, url, pic }]，歌曲 ID 从 url 里取
async function fetchPlaylistFromMeting(playlistId) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 15000);
    try {
        const res = await fetch(`${METING_API}?server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error('meting HTTP ' + res.status);
        const list = await res.json();
        if (!Array.isArray(list)) throw new Error('meting 返回格式错误');
        return list.slice(0, IMPORT_MAX_TRACKS).map(item => {
            const m = String(item.url || '').match(/[?&]id=(\d+)/);
            if (!m) return null;
            return {
                id: m[1],
                title: item.name || item.title || '未知曲目',
                artist: item.artist || item.author || '未知歌手',
                cover: DEFAULT_COVER,
                dt: 0
            };
        }).filter(Boolean);
    } finally {
        clearTimeout(tid);
    }
}

async function submitImportPlaylist() {
    const input = document.getElementById('importInput');
    const val = input.value.trim();
    if (!val) return;

    if (/163cn\.tv/i.test(val)) {
        showToast('短链接无法解析，请复制带 id= 的完整链接');
        return;
    }

    const playlistId = parsePlaylistId(val);
    if (!playlistId) {
        showToast('无法解析歌单 ID，请输入数字 ID 或分享链接');
        return;
    }

    const btn = document.getElementById('importConfirmBtn');
    btn.textContent = '导入中...';
    btn.disabled = true;

    let title = '导入歌单';
    let cover = DEFAULT_COVER;
    let tracks = [];

    try {
        try {
            const data = await fetchWithFallback(`/playlist/detail?id=${playlistId}`);
            if (!data || !data.playlist) {
                throw new Error('接口返回异常，code: ' + (data && data.code));
            }
            title = data.playlist.name || title;
            cover = (data.playlist.coverImgUrl || '').replace('http://', 'https://') || DEFAULT_COVER;
            tracks = await fetchPlaylistTracks(data.playlist);
            if (!tracks.length) throw new Error('主通道未获取到曲目');
        } catch (e) {
            console.warn('主通道导入失败，尝试备用通道', e);
            tracks = await fetchPlaylistFromMeting(playlistId);
        }

        if (!tracks.length) throw new Error('歌单为空');

        const importedPlaylist = { id: playlistId, title, cover, tracks };
        // 重复导入同一个歌单时覆盖旧的
        userPlaylists = [importedPlaylist, ...userPlaylists.filter(p => p.id !== playlistId)];
        renderPlaylistLibrary();
        closeImportModal();
        input.value = '';
        showToast(`已导入「${title}」· ${tracks.length} 首`, 'success');
    } catch (e) {
        console.error('导入歌单失败', e);
        showToast('歌单解析失败：隐私歌单、ID 错误或接口限制');
    } finally {
        btn.textContent = '解析并导入';
        btn.disabled = false;
    }
}

/* ========== 歌单库：购物袋 ========== */
function renderPlaylistLibrary() {
    const grid = document.getElementById('playlistLibraryGrid');
    if (!userPlaylists.length) {
        grid.innerHTML = `<div class="bag-empty">${account ? '账号下还没有歌单' : '扫码登录自动导入，或点「手动导入」添加歌单'}</div>`;
        return;
    }
    grid.innerHTML = userPlaylists.map((pl, i) => {
        const count = pl.tracks ? pl.tracks.length : (pl.trackCount || 0);
        const tag = pl.fromAccount ? (pl.mine ? '我创建的' : '我收藏的') : '手动导入';
        return `
        <div class="bag" role="button" tabindex="0" aria-label="打开歌单 ${escapeHtml(pl.title)}" data-id="${escapeHtml(pl.id)}"
             onclick="loadUserPlaylist(${i})" onkeydown="if (event.key === 'Enter') loadUserPlaylist(${i})">
            <span class="bag-handle" aria-hidden="true"></span>
            <div class="bag-body">
                <span class="bag-tag">${tag}</span>
                <div class="bag-label">
                    <img src="${escapeHtml(pl.cover)}?param=200y200" loading="lazy" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'">
                </div>
                <div class="bag-title">${escapeHtml(pl.title)}</div>
                <div class="bag-count">${count} 首</div>
                <div class="bag-brand">CHÉRIE</div>
            </div>
        </div>`;
    }).join('');
}

// 登录后用 track/all 拿全部曲目（含隐私歌单），失败依次退回 detail 和 meting
async function fetchAccountPlaylistTracks(id) {
    if (account) {
        try {
            const d = await fetchWithFallback(withCookie(`/playlist/track/all?id=${encodeURIComponent(id)}&limit=${IMPORT_MAX_TRACKS}&${ts()}`));
            if (d && Array.isArray(d.songs) && d.songs.length) return d.songs.map(mapNeteaseTrack);
        } catch (e) {
            console.warn('track/all 获取失败，改用 detail', e);
        }
    }
    try {
        const d = await fetchWithFallback(withCookie(`/playlist/detail?id=${encodeURIComponent(id)}`));
        if (d && d.playlist) {
            const tracks = await fetchPlaylistTracks(d.playlist);
            if (tracks.length) return tracks;
        }
    } catch (e) {
        console.warn('detail 获取失败，改用 meting', e);
    }
    return fetchPlaylistFromMeting(id);
}

let playlistLoading = null;

async function loadUserPlaylist(idx) {
    const pl = userPlaylists[idx];
    if (!pl || playlistLoading) return;

    // 账号同步来的歌单只有基本信息，第一次点开时再加载曲目
    if (!pl.tracks) {
        playlistLoading = pl.id;
        const el = document.querySelector(`.bag[data-id="${CSS.escape(pl.id)}"]`);
        if (el) el.classList.add('loading');
        let tracks = null;
        try {
            tracks = await fetchAccountPlaylistTracks(pl.id);
        } catch (e) {
            console.error('加载歌单曲目失败', e);
        } finally {
            playlistLoading = null;
            if (el) el.classList.remove('loading');
        }
        if (!tracks) {
            showToast('歌单曲目加载失败，请重试');
            return;
        }
        pl.tracks = tracks;
        renderPlaylistLibrary();
    }

    if (!pl.tracks.length) {
        showToast('这个歌单是空的');
        return;
    }

    currentTrackList = pl.tracks.slice();
    document.getElementById('listBadge').textContent = 'PLAYLIST';
    document.getElementById('songCounterLabel').textContent = `${pl.title} (${currentTrackList.length})`;
    renderTracks(currentTrackList);
    renderVinylCabinet(currentTrackList);
    document.querySelector('.dock-page-btn[data-target="scene-discover"]').click();
}

/* ========== 网易云扫码登录 + 自动导入主页歌单 ========== */
const ACCOUNT_KEY = 'cherie.netease.account';
const QR_POLL_MS = 2000;
let account = null;            // { cookie, uid, nickname, avatar, signature, created, subscribed }
let accountSyncing = false;
const qrState = { key: '', timer: 0, session: 0 };

function ts() {
    return `timestamp=${Date.now()}`;
}

function withCookie(path) {
    if (!account || !account.cookie) return path;
    return `${path}${path.includes('?') ? '&' : '?'}cookie=${encodeURIComponent(account.cookie)}`;
}

function saveAccount() {
    try {
        if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
        else localStorage.removeItem(ACCOUNT_KEY);
    } catch (e) {
        // 存不了就只在本次会话有效
    }
}

function loadAccount() {
    try {
        const raw = localStorage.getItem(ACCOUNT_KEY);
        account = raw ? JSON.parse(raw) : null;
    } catch (e) {
        account = null;
    }
}

function renderAccount() {
    const area = document.getElementById('accountArea');
    if (!account) {
        area.innerHTML = `
            <div class="login-card">
                <div class="login-card-icon"><i class="ri-qr-code-line"></i></div>
                <div class="login-card-text">
                    <div class="login-card-title">扫码登录网易云</div>
                    <div class="login-card-desc">登录后自动导入你主页的全部歌单</div>
                </div>
                <button class="modal-btn-confirm" onclick="openQrLogin()">扫码登录</button>
            </div>`;
        return;
    }
    const created = account.created || 0;
    const subscribed = account.subscribed || 0;
    const avatar = account.avatar ? `${escapeHtml(account.avatar)}?param=200y200` : '../assets/morentouxiang.jpg';
    area.innerHTML = `
        <div class="stamp-wrap">
            <div class="stamp-card">
                <div class="stamp-inner">
                    <div class="stamp-photo">
                        <img src="${avatar}" alt="${escapeHtml(account.nickname)} 的头像" onerror="this.onerror=null;this.src='../assets/morentouxiang.jpg'">
                    </div>
                    <div class="stamp-info">
                        <div class="stamp-label">NETEASE · MUSIC ID</div>
                        <div class="stamp-name">${escapeHtml(account.nickname)}</div>
                        <div class="stamp-sign">${escapeHtml(account.signature || '这个人很懒，什么也没写')}</div>
                        <div class="stamp-stats">
                            <span><b>${created + subscribed}</b>歌单</span>
                            <span><b>${created}</b>创建</span>
                            <span><b>${subscribed}</b>收藏</span>
                        </div>
                        <div class="stamp-actions">
                            <button class="stamp-btn" onclick="syncAccountPlaylists(false)" ${accountSyncing ? 'disabled' : ''}>
                                <i class="ri-refresh-line"></i>${accountSyncing ? '同步中...' : '同步'}
                            </button>
                            <button class="stamp-btn ghost" onclick="logoutAccount()">
                                <i class="ri-logout-box-r-line"></i>退出
                            </button>
                        </div>
                    </div>
                    <div class="stamp-postmark" aria-hidden="true"><span>CHÉRIE</span><span>已导入</span></div>
                    <div class="stamp-value">¥1.63</div>
                </div>
            </div>
        </div>`;
}

function setQrStatus(text, overlay) {
    document.getElementById('qrStatus').textContent = text;
    const ov = document.getElementById('qrOverlay');
    ov.hidden = !overlay;
    if (overlay) ov.textContent = overlay;
}

function stopQrPoll() {
    clearTimeout(qrState.timer);
    qrState.timer = 0;
}

function openQrLogin() {
    document.getElementById('qrModal').classList.add('show');
    startQrLogin();
}

function closeQrLogin() {
    qrState.session++;
    stopQrPoll();
    document.getElementById('qrModal').classList.remove('show');
}

async function startQrLogin() {
    stopQrPoll();
    const session = ++qrState.session;
    const img = document.getElementById('qrImage');
    img.hidden = true;
    setQrStatus('打开网易云音乐 App 扫一扫', '获取中...');
    try {
        const k = await fetchWithFallback(`/login/qr/key?${ts()}`);
        const key = k && k.data && k.data.unikey;
        if (!key) throw new Error('未获取到二维码 key');
        const c = await fetchWithFallback(`/login/qr/create?key=${encodeURIComponent(key)}&qrimg=true&${ts()}`);
        const qrimg = c && c.data && c.data.qrimg;
        if (!qrimg) throw new Error('未获取到二维码图片');
        if (session !== qrState.session) return;
        qrState.key = key;
        img.src = qrimg;
        img.hidden = false;
        setQrStatus('打开网易云音乐 App 扫一扫', null);
        pollQr(session);
    } catch (e) {
        if (session !== qrState.session) return;
        console.error('二维码获取失败', e);
        setQrStatus('二维码获取失败，点「刷新二维码」重试', '获取失败');
    }
}

function pollQr(session) {
    qrState.timer = setTimeout(async () => {
        if (session !== qrState.session) return;
        let d;
        try {
            d = await fetchWithFallback(`/login/qr/check?key=${encodeURIComponent(qrState.key)}&${ts()}`);
        } catch (e) {
            if (session === qrState.session) pollQr(session); // 网络抖动继续轮询
            return;
        }
        if (session !== qrState.session) return;
        switch (d && d.code) {
            case 800:
                setQrStatus('二维码已过期，点「刷新二维码」', '已过期');
                return;
            case 801:
                pollQr(session);
                return;
            case 802:
                setQrStatus(`${d.nickname ? d.nickname + '，' : ''}已扫码，请在手机上确认`, '已扫码');
                pollQr(session);
                return;
            case 803:
                setQrStatus('登录成功，正在导入歌单...', '登录成功');
                await onQrLoginSuccess(d.cookie, session);
                return;
            default:
                setQrStatus((d && d.message) || `登录失败（code ${d && d.code}）`, '登录失败');
        }
    }, QR_POLL_MS);
}

async function onQrLoginSuccess(cookie, session) {
    try {
        if (!cookie) throw new Error('接口没有返回 cookie');
        const a = await fetchWithFallback(`/user/account?cookie=${encodeURIComponent(cookie)}&${ts()}`);
        const p = a && a.profile;
        if (!p || !p.userId) throw new Error('未获取到账号信息');
        account = {
            cookie,
            uid: String(p.userId),
            nickname: p.nickname || '网易云用户',
            avatar: (p.avatarUrl || '').replace('http://', 'https://'),
            signature: p.signature || '',
            created: 0,
            subscribed: 0
        };
        saveAccount();
        if (session === qrState.session) closeQrLogin();
        renderAccount();
        await syncAccountPlaylists(false);
    } catch (e) {
        console.error('登录后获取账号信息失败', e);
        if (session === qrState.session) setQrStatus('获取账号信息失败，请刷新二维码重试', '登录失败');
    }
}

// 拉取账号主页的全部歌单（创建 + 收藏），只存基本信息，曲目点开时再加载
async function syncAccountPlaylists(silent) {
    if (!account || accountSyncing) return;
    accountSyncing = true;
    renderAccount();
    try {
        const d = await fetchWithFallback(withCookie(`/user/playlist?uid=${encodeURIComponent(account.uid)}&limit=1000&${ts()}`));
        if (!d || !Array.isArray(d.playlist)) throw new Error('接口返回异常，code: ' + (d && d.code));
        const prev = new Map(userPlaylists.map(p => [p.id, p]));
        const lists = d.playlist.map(p => {
            const id = String(p.id);
            const old = prev.get(id);
            return {
                id,
                title: p.name || '未命名歌单',
                cover: (p.coverImgUrl || '').replace('http://', 'https://') || DEFAULT_COVER,
                trackCount: Number(p.trackCount) || 0,
                tracks: old && old.tracks ? old.tracks : null,
                fromAccount: true,
                mine: !!(p.creator && String(p.creator.userId) === account.uid)
            };
        });
        const ids = new Set(lists.map(p => p.id));
        userPlaylists = [...lists, ...userPlaylists.filter(p => !p.fromAccount && !ids.has(p.id))];
        account.created = lists.filter(p => p.mine).length;
        account.subscribed = lists.length - account.created;
        saveAccount();
        renderPlaylistLibrary();
        if (!silent) showToast(`已导入 ${lists.length} 个歌单`, 'success');
    } catch (e) {
        console.error('同步账号歌单失败', e);
        showToast('同步歌单失败，登录可能已过期，请重新扫码');
    } finally {
        accountSyncing = false;
        renderAccount();
    }
}

async function logoutAccount() {
    if (!account) return;
    const ok = await AppDialog.confirm('退出后会移除从账号导入的歌单，手动导入的会保留。', { title: '退出登录', okText: '退出' });
    if (!ok) return;
    account = null;
    saveAccount();
    userPlaylists = userPlaylists.filter(p => !p.fromAccount);
    renderAccount();
    renderPlaylistLibrary();
    showToast('已退出登录', 'success');
}

function initAccount() {
    loadAccount();
    renderAccount();
    renderPlaylistLibrary();
    if (account) syncAccountPlaylists(true);
}

initAccount();

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const kw = searchInput.value.trim();
        if (!kw) return;
        executeSearch(kw);
    }
});

async function executeSearch(keyword) {
    trackGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-faint); font-size: 11px;">搜索中...</div>';
    document.getElementById('listBadge').textContent = 'SEARCH';
    try {
        const data = await fetchWithFallback(`/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=30`);
        if (data && data.result && Array.isArray(data.result.songs)) {
            currentTrackList = data.result.songs.map(t => ({
                id: String(t.id),
                title: t.name,
                artist: (t.ar || []).map(a => a.name).join(' / ') || '未知歌手',
                cover: (t.al && t.al.picUrl) ? t.al.picUrl.replace('http://', 'https://') : DEFAULT_COVER,
                dt: t.dt
            }));
            renderTracks(currentTrackList);
            document.getElementById('songCounterLabel').textContent = `找到 ${currentTrackList.length} 首`;
        } else {
            throw new Error('未检索到结果');
        }
    } catch (e) {
        trackGrid.innerHTML = errorBlock('未搜索到相关曲目，换个关键词试试');
    }
}

/* 自动检测元素后方背景图的亮度，偏亮时加 .on-light 切深色文字 */
const AutoContrast = (function () {
    const THRESHOLD = 120;                         // 0-255，越小越容易切到深色文字
    const OVERLAY = { color: 11, alpha: 0.4 };     // 对应 body::before 的 rgba(10, 11, 14, 0.4) 遮罩
    const targets = new Set();
    let ctx = null;
    let cw = 0;
    let ch = 0;
    let raf = 0;

    function loadBackground() {
        const bg = getComputedStyle(document.body).backgroundImage;
        const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
        if (!m) return;
        const img = new Image();
        img.onload = () => {
            const k = 240 / Math.max(img.naturalWidth, img.naturalHeight);
            cw = Math.max(1, Math.round(img.naturalWidth * k));
            ch = Math.max(1, Math.round(img.naturalHeight * k));
            const c = document.createElement('canvas');
            c.width = cw;
            c.height = ch;
            const x = c.getContext('2d', { willReadFrequently: true });
            x.drawImage(img, 0, 0, cw, ch);
            try {
                x.getImageData(0, 0, 1, 1);
                ctx = x;
                schedule();
            } catch (e) {
                console.warn('AutoContrast：file:// 直接打开时浏览器禁止读取图片像素，请用本地服务器打开页面');
            }
        };
        img.src = m[1];
    }

    // 按 background-size: cover + background-position: center + fixed 计算元素后方区域的平均亮度
    function luminanceAt(rect) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const k = Math.max(vw / cw, vh / ch);
        const ox = (vw - cw * k) / 2;
        const oy = (vh - ch * k) / 2;
        const sx = Math.max(0, Math.floor((rect.left - ox) / k));
        const sy = Math.max(0, Math.floor((rect.top - oy) / k));
        const ex = Math.min(cw, Math.ceil((rect.right - ox) / k));
        const ey = Math.min(ch, Math.ceil((rect.bottom - oy) / k));
        const w = ex - sx;
        const h = ey - sy;
        if (w <= 0 || h <= 0) return null;
        const d = ctx.getImageData(sx, sy, w, h).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
            sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        }
        const raw = sum / (d.length / 4);
        return raw * (1 - OVERLAY.alpha) + OVERLAY.color * OVERLAY.alpha;
    }

    function update() {
        raf = 0;
        if (!ctx) return;
        targets.forEach(el => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            const lum = luminanceAt(r);
            if (lum === null) return;
            const isLight = el.classList.contains('on-light');
            // 留回差，避免在临界值附近来回闪
            if (!isLight && lum > THRESHOLD + 6) el.classList.add('on-light');
            else if (isLight && lum < THRESHOLD - 6) el.classList.remove('on-light');
        });
    }

    function schedule() {
        if (!raf) raf = requestAnimationFrame(update);
    }

    function watch(el) {
        if (!el) return;
        targets.add(el);
        new ResizeObserver(schedule).observe(el); // 切换页面时搜索框出现也会触发
        schedule();
    }

    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule, { passive: true });
    loadBackground();

    return { watch, update: schedule };
})();

/* ========== 一起听（当前是虚拟对象，后面接入后端） ==========
   接入方式：
   ListenTogether.setTransport({ send(msg) { 发到服务器 } })
       msg 结构：{ type: 'chat', text } / { type: 'track', id } / { type: 'leave' }
   收到对方消息时调用：ListenTogether.receive(text)
   开始 / 结束：ListenTogether.start({ id, name, avatar }) / ListenTogether.stop()
   设置 transport 后，虚拟自动回复会自动关闭 */
window.ListenTogether = (function () {
    const VIRTUAL_PARTNER = { id: 'virtual', name: '恋人', avatar: '../assets/morentouxiang.jpg' };
    const FALLBACK_AVATAR = '../assets/morentouxiang.jpg';
    const THOUGHT_MS = 5000;       // 底栏脑海气泡显示时长
    const DUET_BUBBLE_MS = 4500;   // 播放页头像气泡显示时长
    const MSG_MAX = 200;
    const VIRTUAL_REPLIES = [
        '嗯嗯 我在听呢',
        '这段旋律好好听',
        '想抱抱你',
        '下一首你来挑',
        '哈哈哈哈',
        '戴着耳机想你',
        '我们好有默契',
        '再循环一遍好不好'
    ];

    const dockAvatar = document.getElementById('userAvatar');
    const dockImg = document.getElementById('dockAvatarImg');
    const unreadDot = document.getElementById('dockUnread');
    const thought = document.getElementById('dockThought');
    const thoughtText = document.getElementById('dockThoughtText');
    const panel = document.getElementById('chatPanel');
    const list = document.getElementById('chatList');
    const input = document.getElementById('chatInput');
    const drawer = document.getElementById('drawerPlayer');
    const headTitle = document.querySelector('.drawer-head-title');
    const togetherBtn = document.getElementById('togetherBtn');
    const togetherLabel = document.getElementById('togetherBtnLabel');
    const chatHead = document.getElementById('chatHead');
    const duetInput = document.getElementById('duetInput');
    const duetChatInput = document.getElementById('duetChatInput');
    const duetChatBtn = document.getElementById('duetChatBtn');
    const historyMask = document.getElementById('historyMask');
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    const HISTORY_GAP_MS = 5 * 60 * 1000; // 聊天记录里超过 5 分钟显示一次时间

    // messages：[{ from: 'me' | 'them' | 'system', text, at }]
    const state = { active: false, partner: null, startedAt: 0, transport: null, messages: [] };
    const timers = { thought: 0, me: 0, them: 0, clock: 0, typing: 0 };
    let replySeq = 0;

    function setImg(img, src) {
        img.onerror = () => {
            img.onerror = null;
            img.src = FALLBACK_AVATAR;
        };
        img.src = src || FALLBACK_AVATAR;
    }

    function myName() {
        const el = document.getElementById('profileName');
        return (el && el.textContent.trim()) || 'babydoll';
    }

    function myAvatar() {
        const el = document.getElementById('profileAvatar');
        return (el && el.getAttribute('src')) || FALLBACK_AVATAR;
    }

    function currentTitle() {
        const t = currentIndex >= 0 ? currentTrackList[currentIndex] : null;
        return t ? t.title : '';
    }

    function clip(text, n) {
        return text.length > n ? text.slice(0, n) + '…' : text;
    }

    const drawerOpen = () => drawer.classList.contains('open');
    const chatOpen = () => panel.classList.contains('open');
    const scrollBottom = () => { list.scrollTop = list.scrollHeight; };

    /* ---- 聊天列表 ---- */
    function addSystem(text) {
        state.messages.push({ from: 'system', text, at: Date.now() });
        const el = document.createElement('div');
        el.className = 'chat-system';
        el.textContent = text;
        list.appendChild(el);
        scrollBottom();
    }

    function addMessage(from, text) {
        removeTyping();
        state.messages.push({ from, text, at: Date.now() });
        const el = document.createElement('div');
        el.className = `chat-msg ${from}`;
        const img = document.createElement('img');
        img.alt = '';
        setImg(img, from === 'me' ? myAvatar() : state.partner.avatar);
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;
        el.append(img, bubble);
        list.appendChild(el);
        scrollBottom();
    }

    function showTyping() {
        if (list.querySelector('.chat-msg.typing')) return;
        const el = document.createElement('div');
        el.className = 'chat-msg them typing';
        el.innerHTML = '<img alt=""><div class="chat-bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div>';
        setImg(el.querySelector('img'), state.partner.avatar);
        list.appendChild(el);
        scrollBottom();
    }

    function removeTyping() {
        const el = list.querySelector('.chat-msg.typing');
        if (el) el.remove();
    }

    /* ---- 底栏红点 + 脑海气泡 ---- */
    function setUnread(on) {
        unreadDot.classList.toggle('show', on);
    }

    function showThought(text) {
        thoughtText.textContent = clip(text, 60);
        thought.classList.add('show');
        clearTimeout(timers.thought);
        timers.thought = setTimeout(hideThought, THOUGHT_MS);
    }

    function hideThought() {
        clearTimeout(timers.thought);
        thought.classList.remove('show');
    }

    /* ---- 播放页头像气泡 ---- */
    function showDuetBubble(side, text) {
        const el = document.getElementById(side === 'me' ? 'duetMeBubble' : 'duetThemBubble');
        el.textContent = clip(text, 40);
        el.classList.add('show');
        clearTimeout(timers[side]);
        timers[side] = setTimeout(() => el.classList.remove('show'), DUET_BUBBLE_MS);
    }

    function hideDuetBubbles() {
        ['me', 'them'].forEach(side => {
            clearTimeout(timers[side]);
            document.getElementById(side === 'me' ? 'duetMeBubble' : 'duetThemBubble').classList.remove('show');
        });
    }

    function refreshMe() {
        setImg(document.getElementById('duetMeImg'), myAvatar());
        document.getElementById('duetMeName').textContent = myName();
    }

    function updateClock() {
        if (!state.active) return;
        const m = Math.floor((Date.now() - state.startedAt) / 60000);
        document.getElementById('duetTime').textContent = m < 1 ? '刚刚开始一起听' : `一起听了 ${m} 分钟`;
        const title = currentTitle();
        document.getElementById('chatStatus').textContent = title ? `一起听 · ${title}` : '一起听中 · 还没放歌';
    }

    /* ---- 虚拟对象 ---- */
    function pickReply(text) {
        const title = currentTitle();
        if (/[?？]\s*$/.test(text)) return '嗯… 你说呢';
        const pool = VIRTUAL_REPLIES.concat(title ? [`《${title}》这首好好听`, `听着《${title}》想你了`] : []);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function virtualSay(text, delay) {
        const seq = ++replySeq;
        clearTimeout(timers.typing);
        timers.typing = setTimeout(() => {
            if (!state.active || seq !== replySeq) return;
            showTyping();
            timers.typing = setTimeout(() => {
                if (!state.active || seq !== replySeq) return;
                receive(text);
            }, 1000 + Math.random() * 1400);
        }, delay);
    }

    function transportSend(msg) {
        try {
            state.transport.send(msg);
            return true;
        } catch (e) {
            console.error('一起听消息发送失败', e);
            return false;
        }
    }

    /* ---- 对外接口 ---- */
    function receive(text) {
        if (!state.active) return;
        text = String(text == null ? '' : text).trim().slice(0, MSG_MAX);
        if (!text) return;
        addMessage('them', text);
        if (drawerOpen()) showDuetBubble('them', text);
        if (historyOpen()) renderHistory();
        if (chatOpen() || (drawerOpen() && inlineOpen())) return;
        setUnread(true);
        if (!drawerOpen()) showThought(text);
    }

    function send(text) {
        if (!state.active) return false;
        text = String(text == null ? '' : text).trim().slice(0, MSG_MAX);
        if (!text) return false;
        addMessage('me', text);
        if (drawerOpen()) showDuetBubble('me', text);
        if (state.transport) {
            if (!transportSend({ type: 'chat', text })) showToast('消息发送失败');
        } else {
            virtualSay(pickReply(text), 500);
        }
        return true;
    }

    function onTrackChange(track) {
        if (!state.active) return;
        updateClock();
        if (state.transport) {
            transportSend({ type: 'track', id: track.id });
            return;
        }
        if (state.pickedByPartner) {
            state.pickedByPartner = false;
            return;
        }
        if (Math.random() < 0.4) virtualSay(`换到《${track.title}》啦，这首我也喜欢`, 2000);
    }

    function start(partner) {
        if (state.active) stop();
        const p = Object.assign({}, VIRTUAL_PARTNER, partner);
        state.active = true;
        state.partner = p;
        state.startedAt = Date.now();

        // 底栏头像换成对象
        setImg(dockImg, p.avatar);
        dockImg.alt = `${p.name} 的头像`;
        dockAvatar.setAttribute('aria-label', `和 ${p.name} 聊天`);
        dockAvatar.classList.add('together');

        setImg(document.getElementById('chatPartnerImg'), p.avatar);
        document.getElementById('chatPartnerName').textContent = p.name;
        setImg(document.getElementById('duetThemImg'), p.avatar);
        document.getElementById('duetThemName').textContent = p.name;
        refreshMe();

        drawer.classList.add('together');
        headTitle.textContent = 'LISTENING TOGETHER';
        togetherBtn.classList.add('active');
        togetherLabel.textContent = '一起听中';

        list.innerHTML = '';
        state.messages = [];
        addSystem(`你和 ${p.name} 开始一起听`);
        updateClock();
        clearInterval(timers.clock);
        timers.clock = setInterval(updateClock, 30000);

        if (!state.transport) virtualSay('来啦～我也戴上耳机了', 800);
    }

    function stop() {
        if (!state.active) return;
        if (state.transport) transportSend({ type: 'leave' });
        state.active = false;
        replySeq++;
        clearTimeout(timers.typing);
        clearInterval(timers.clock);
        closeChat();
        closeInline();
        closeHistory();
        hideThought();
        hideDuetBubbles();
        setUnread(false);

        // 底栏头像恢复成自己
        setImg(dockImg, myAvatar());
        dockImg.alt = `${myName()} 的头像`;
        dockAvatar.setAttribute('aria-label', '我的');
        dockAvatar.classList.remove('together');

        drawer.classList.remove('together');
        headTitle.textContent = 'NOW PLAYING';
        togetherBtn.classList.remove('active');
        togetherLabel.textContent = '一起听';
    }

    function openChat() {
        if (!state.active) return;
        refreshMe();
        updateClock();
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        setUnread(false);
        hideThought();
        scrollBottom();
        requestAnimationFrame(() => input.focus());
    }

    function closeChat() {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        input.blur();
        closeQuickPanels();
    }

    function toggleChat() {
        if (chatOpen()) closeChat();
        else openChat();
    }

    /* ---- 播放器内聊天输入栏 ---- */
    function inlineOpen() {
        return duetInput.classList.contains('show');
    }

    function openInline() {
        if (!state.active) return;
        duetInput.classList.add('show');
        duetChatBtn.classList.add('active');
        duetChatBtn.setAttribute('aria-expanded', 'true');
        setUnread(false);
        requestAnimationFrame(() => duetChatInput.focus());
    }

    function closeInline() {
        duetInput.classList.remove('show');
        duetChatBtn.classList.remove('active');
        duetChatBtn.setAttribute('aria-expanded', 'false');
        duetChatInput.blur();
        closeQuickPanels();
    }

    function toggleInline() {
        if (inlineOpen()) closeInline();
        else openInline();
    }

    /* ---- 聊天记录遮罩 ---- */
    function historyOpen() {
        return historyMask.classList.contains('show');
    }

    function formatClock(at) {
        const d = new Date(at);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function messageEl(from, text) {
        const el = document.createElement('div');
        el.className = `chat-msg ${from}`;
        const img = document.createElement('img');
        img.alt = '';
        setImg(img, from === 'me' ? myAvatar() : state.partner.avatar);
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;
        el.append(img, bubble);
        return el;
    }

    function renderHistory() {
        const frag = document.createDocumentFragment();
        let last = 0;
        state.messages.forEach(m => {
            if (m.at - last > HISTORY_GAP_MS) {
                const t = document.createElement('div');
                t.className = 'history-time';
                t.textContent = formatClock(m.at);
                frag.appendChild(t);
            }
            last = m.at;
            if (m.from === 'system') {
                const s = document.createElement('div');
                s.className = 'chat-system';
                s.textContent = m.text;
                frag.appendChild(s);
            } else {
                frag.appendChild(messageEl(m.from, m.text));
            }
        });
        historyList.replaceChildren(frag);
        const n = state.messages.filter(m => m.from !== 'system').length;
        if (!n && !state.messages.length) {
            historyList.innerHTML = '<div class="history-empty">还没有聊天记录</div>';
        }
        historyCount.textContent = n ? `${n} 条` : '';
        historyList.scrollTop = historyList.scrollHeight;
    }

    function openHistory() {
        if (!state.active) return;
        closeQuickPanels();
        renderHistory();
        historyMask.classList.add('show');
        historyMask.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => document.getElementById('historyCloseBtn').focus());
    }

    function closeHistory() {
        if (!historyOpen()) return;
        historyMask.classList.remove('show');
        historyMask.setAttribute('aria-hidden', 'true');
        if (state.active) document.getElementById('historyBtn').focus();
    }

    function closeDrawerExtras() {
        closeInline();
        closeHistory();
    }

    /* ---- 聊天小窗拖动：按住标题栏移动，限制在屏幕内 ---- */
    let drag = null;

    function placePanel(left, top) {
        const m = 8;
        const maxLeft = window.innerWidth - panel.offsetWidth - m;
        const maxTop = window.innerHeight - panel.offsetHeight - m;
        panel.style.left = Math.max(m, Math.min(left, maxLeft)) + 'px';
        panel.style.top = Math.max(m, Math.min(top, maxTop)) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    chatHead.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        const r = panel.getBoundingClientRect();
        drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
        chatHead.setPointerCapture(e.pointerId);
        panel.classList.add('dragging');
        e.preventDefault();
    });
    chatHead.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        placePanel(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        panel.classList.remove('dragging');
    }
    chatHead.addEventListener('pointerup', endDrag);
    chatHead.addEventListener('pointercancel', endDrag);
    // 窗口尺寸变化时把拖动过的小窗拉回屏幕内
    window.addEventListener('resize', () => {
        if (panel.style.left) placePanel(parseFloat(panel.style.left), parseFloat(panel.style.top));
    }, { passive: true });

    /* ---- 让恋人选下一首 ---- */
    function applyPartnerPick(trackId) {
        if (!state.active) return;
        const i = currentTrackList.findIndex(t => t.id === String(trackId));
        if (i < 0) {
            showToast('恋人选的歌不在当前列表里');
            return;
        }
        state.pickedByPartner = true;
        playTrackIndex(i);
    }

    function requestPick() {
        if (!state.active || !currentTrackList.length) return false;
        addSystem(`你让 ${state.partner.name} 来选下一首`);
        if (historyOpen()) renderHistory();
        if (state.transport) {
            transportSend({ type: 'pick-request' });
            return true;
        }
        // 虚拟对象：想一会儿，从当前列表挑一首（不选正在放的）
        const seq = ++replySeq;
        clearTimeout(timers.typing);
        timers.typing = setTimeout(() => {
            if (!state.active || seq !== replySeq) return;
            showTyping();
            timers.typing = setTimeout(() => {
                if (!state.active || seq !== replySeq) return;
                const list = currentTrackList;
                if (!list.length) return;
                let i = Math.floor(Math.random() * list.length);
                if (list.length > 1 && i === currentIndex) i = (i + 1) % list.length;
                const t = list[i];
                receive(`我选这首《${t.title}》～`);
                applyPartnerPick(t.id);
            }, 1200 + Math.random() * 1000);
        }, 600);
        return true;
    }

    /* ---- 回车发送 ---- */
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            if (send(input.value)) {
                input.value = '';
                closeQuickPanels();
            }
        }
    });
    duetChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            if (send(duetChatInput.value)) {
                duetChatInput.value = '';
                closeQuickPanels();
            }
        }
    });

    return {
        start,
        stop,
        send,
        receive,
        onTrackChange,
        openChat,
        closeChat,
        toggleChat,
        openInline,
        closeInline,
        toggleInline,
        openHistory,
        closeHistory,
        closeDrawerExtras,
        setTransport: (t) => { state.transport = t || null; },
        isActive: () => state.active,
        isChatOpen: chatOpen,
        isInlineOpen: inlineOpen,
        isHistoryOpen: historyOpen,
        requestPick,
        partnerPick: applyPartnerPick,
        partnerName: () => (state.partner ? state.partner.name : ''),
        partnerMessages: () => state.messages
            .filter(m => m.from === 'them')
            .map(m => ({ text: m.text, at: m.at }))
    };
})();

// 底栏头像：一起听时打开聊天，否则进入「我的」
function onDockAvatarClick() {
    if (ListenTogether.isActive()) ListenTogether.toggleChat();
    else goProfile();
}

function sendChat() {
    const input = document.getElementById('chatInput');
    if (ListenTogether.send(input.value)) input.value = '';
    closeQuickPanels();
    input.focus();
}

function sendDuetChat() {
    const input = document.getElementById('duetChatInput');
    if (ListenTogether.send(input.value)) input.value = '';
    closeQuickPanels();
    input.focus();
}

/* ========== 调取面板：调取对方说过的话（最新的在前） ========== */
const QUICK_MAX = 20;      // 最多显示多少句
const QUICK_QUOTE = 30;    // 插入回复时引用的最大字数

function renderQuick(panel) {
    const msgs = ListenTogether.partnerMessages().slice(-QUICK_MAX).reverse();
    if (!msgs.length) {
        panel.innerHTML = '<div class="quick-empty">对方还没说话</div>';
        return;
    }
    panel.innerHTML = msgs.map(m => {
        const quote = m.text.length > QUICK_QUOTE ? m.text.slice(0, QUICK_QUOTE) + '…' : m.text;
        return `<button type="button" class="quick-chip msg" data-text="${escapeHtml(`回复「${quote}」：`)}" title="${escapeHtml(m.text)}">${escapeHtml(m.text)}</button>`;
    }).join('');
}

function closeQuickPanels() {
    document.querySelectorAll('.quick-panel.show').forEach(p => {
        p.classList.remove('show');
        if (p._toggle) {
            p._toggle.classList.remove('active');
            p._toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

function toggleQuick(id, btn) {
    const panel = document.getElementById(id);
    const willOpen = !panel.classList.contains('show');
    closeQuickPanels();
    if (!willOpen) return;
    renderQuick(panel);
    panel._toggle = btn;
    panel.classList.add('show');
    btn.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
}

// 点选项：插入到光标位置
document.querySelectorAll('.quick-panel').forEach(panel => {
    panel.addEventListener('click', (e) => {
        const chip = e.target.closest('.quick-chip');
        if (!chip) return;
        const input = document.getElementById(panel.dataset.for);
        const text = chip.dataset.text || '';
        const start = input.selectionStart == null ? input.value.length : input.selectionStart;
        const end = input.selectionEnd == null ? input.value.length : input.selectionEnd;
        input.setRangeText(text, start, end, 'end');
        input.value = input.value.slice(0, 200);
        closeQuickPanels();
        input.focus();
    });
});

// 点面板外面就收起
document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.quick-panel, .chat-split')) return;
    closeQuickPanels();
});

async function toggleTogether() {
    if (!ListenTogether.isActive()) {
        ListenTogether.start();
        showToast(`已和 ${ListenTogether.partnerName()} 开始一起听`, 'success');
        return;
    }
    const name = ListenTogether.partnerName();
    const ok = await AppDialog.confirm(`确定结束和 ${name} 的一起听吗？`, { title: '结束一起听', okText: '结束' });
    if (ok) {
        ListenTogether.stop();
        showToast('已结束一起听', 'success');
    }
}

/* ========== 播放胶囊上滑：播放列表 ========== */
window.PlayQueue = (function () {
    const SWIPE_PX = 24; // 滑动超过多少像素才算上滑 / 下滑
    const wrap = document.getElementById('capsuleWrap');
    const capsule = document.getElementById('nowPlayingCapsule');
    const panel = document.getElementById('queuePanel');
    const head = document.getElementById('queueHead');
    const listEl = document.getElementById('queueList');
    const countEl = document.getElementById('queueCount');
    let swipe = null;
    let suppressClick = false;

    const isOpen = () => panel.classList.contains('open');

    function render() {
        const list = currentTrackList;
        countEl.textContent = list.length ? `${list.length} 首` : '';
        if (!list.length) {
            listEl.innerHTML = '<div class="queue-empty">播放列表是空的</div>';
            return;
        }
        listEl.innerHTML = list.map((t, i) => {
            const active = i === currentIndex;
            const right = active
                ? '<span class="queue-bars" aria-hidden="true"><span></span><span></span><span></span></span>'
                : `<span class="queue-time">${formatDuration(t.dt)}</span>`;
            return `
            <div class="queue-item ${active ? 'active' : ''}" role="button" tabindex="0" data-i="${i}" aria-label="播放 ${escapeHtml(t.title)}">
                <img class="queue-thumb" src="${escapeHtml(t.cover)}?param=80y80" loading="lazy" alt="" onerror="this.onerror=null;this.src='${DEFAULT_COVER}'">
                <div class="queue-meta">
                    <div class="queue-name">${escapeHtml(t.title)}</div>
                    <div class="queue-artist">${escapeHtml(t.artist)}</div>
                </div>
                ${right}
            </div>`;
        }).join('');
    }

    // 当前曲目滚到列表中间
    function scrollActive() {
        const a = listEl.querySelector('.queue-item.active');
        if (!a) return;
        listEl.scrollTop = a.offsetTop - listEl.clientHeight / 2 + a.offsetHeight / 2;
    }

    function open() {
        if (getComputedStyle(capsule).display === 'none') return; // 还没开始播放
        render();
        updateQueueTabs();
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(scrollActive);
    }

    function close() {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
    }

    function refresh() {
        if (!isOpen()) return;
        render();
        scrollActive();
    }

    function playAt(item) {
        const i = Number(item.dataset.i);
        if (!Number.isNaN(i)) playTrackIndex(i);
    }

    listEl.addEventListener('click', (e) => {
        const item = e.target.closest('.queue-item');
        if (item) playAt(item);
    });
    listEl.addEventListener('keydown', (e) => {
        const item = e.target.closest('.queue-item');
        if (item && e.key === 'Enter') playAt(item);
    });

    // 竖向滑动识别：onUp 上滑回调，onDown 下滑回调
    function bindSwipe(el, onUp, onDown) {
        el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.target.closest('button')) return;
            swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, onUp, onDown };
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        });
        el.addEventListener('pointermove', (e) => {
            if (!swipe || e.pointerId !== swipe.id) return;
            const dx = e.clientX - swipe.x;
            const dy = e.clientY - swipe.y;
            if (Math.abs(dy) < SWIPE_PX || Math.abs(dy) < Math.abs(dx)) return;
            const s = swipe;
            swipe = null;
            suppressClick = true; // 滑动结束后的 click 不再打开播放器
            if (dy < 0 && s.onUp) s.onUp();
            if (dy > 0 && s.onDown) s.onDown();
        });
        const end = (e) => {
            if (swipe && e.pointerId === swipe.id) swipe = null;
            setTimeout(() => { suppressClick = false; }, 0);
        };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
    }

    bindSwipe(capsule, open, close);
    bindSwipe(head, null, close);

    // 捕获阶段拦截胶囊的 click：滑动后不触发；列表打开时轻点胶囊 = 收起列表
    wrap.addEventListener('click', (e) => {
        const onCapsule = e.target.closest('.now-playing-capsule');
        const onButton = e.target.closest('button');
        if (suppressClick) {
            suppressClick = false;
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        if (onCapsule && !onButton && isOpen()) {
            e.stopPropagation();
            e.preventDefault();
            close();
        }
    }, true);

    // 点列表和胶囊以外的地方收起
    document.addEventListener('pointerdown', (e) => {
        if (isOpen() && !e.target.closest('#capsuleWrap')) close();
    });

    return { open, close, refresh, isOpen };
})();

/* 播放列表书签：显示当前模式、恋人选歌是否可用 */
function updateQueueTabs() {
    const m = PLAY_MODES.find(x => x.key === playMode) || PLAY_MODES[0];
    document.getElementById('playModeIcon').className = m.icon;
    document.getElementById('playModeLabel').textContent = m.label;
    document.getElementById('playModeTab').setAttribute('aria-label', `播放模式：${m.name}，点击切换`);
    const together = !!(window.ListenTogether && ListenTogether.isActive());
    document.getElementById('partnerPickTab').classList.toggle('off', !together);
}

function cyclePlayMode() {
    const i = PLAY_MODES.findIndex(x => x.key === playMode);
    const m = PLAY_MODES[(i + 1) % PLAY_MODES.length];
    playMode = m.key;
    try {
        localStorage.setItem(PLAY_MODE_KEY, playMode);
    } catch (e) {
        // 存不了就只在本次会话生效
    }
    updateQueueTabs();
    showToast(m.name, 'success');
}

function askPartnerPick() {
    if (!ListenTogether.isActive()) {
        showToast('开启一起听后，才能让恋人选歌');
        return;
    }
    if (!currentTrackList.length) {
        showToast('播放列表是空的');
        return;
    }
    if (ListenTogether.requestPick()) {
        showToast(`已让 ${ListenTogether.partnerName()} 来选歌`, 'success');
    }
}

updateQueueTabs();

window.addEventListener('DOMContentLoaded', () => {
    LiquidGlass.init();

    const searchCapsule = document.getElementById('searchCapsule');
    if (searchCapsule) {
        LiquidGlass.apply(searchCapsule);
        AutoContrast.watch(searchCapsule);
    }

    const dockBar = document.getElementById('dockBarGlass');
    if (dockBar) LiquidGlass.apply(dockBar);

    const playingCapsule = document.getElementById('nowPlayingCapsule');
    if (playingCapsule) LiquidGlass.apply(playingCapsule);

    const queuePanel = document.getElementById('queuePanel');
    if (queuePanel) LiquidGlass.apply(queuePanel);

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) LiquidGlass.apply(userAvatar);

    fetchHotSongs();
});
