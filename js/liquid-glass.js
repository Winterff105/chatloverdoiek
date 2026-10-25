/* 液态玻璃（WebGL 版）：iPhone / 安卓通用。
   原理：在每块玻璃里用着色器重画壁纸，并在边缘做折射、模糊、提亮，再叠一圈高光。
   折射的是壁纸，所以玻璃要放在壁纸之上（图标、Dock、小组件都适用）。 */
(function (root) {
  const DEFAULTS = { scale: 40, bezel: 18, power: 2, blur: 1.5, saturate: 1.4, brightness: 1.06, tint: 0.1, invert: false };
  const VS = 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v; uniform sampler2D t;
uniform vec2 size, origin, wOff, wSize;
uniform float radius, bezel, power, scale, blur, sat, bri, tint, dir;
vec3 tap(vec2 s){ return texture2D(t, (s - wOff) / wSize).rgb; }
void main(){
  vec2 h = size * .5, c = v * size - h;
  float r = min(radius, min(h.x, h.y));
  vec2 q = abs(c) - (h - r), o = max(q, 0.);
  float ol = length(o), depth = -(ol + min(max(q.x, q.y), 0.) - r);
  vec2 n = vec2(0.);
  if (ol > 0.) n = sign(c) * o / ol; else if (q.x > q.y) n = vec2(sign(c.x), 0.); else n = vec2(0., sign(c.y));
  float bz = max(1., min(bezel, min(h.x, h.y)));
  float m = (depth >= 0. && depth < bz) ? pow(1. - depth / bz, power) : 0.;
  vec2 s = origin + v * size + n * m * scale * .5 * dir;
  vec3 col = vec3(0.);
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
    col += tap(s + vec2(float(i), float(j)) * blur) * ((i == 0 ? 2. : 1.) * (j == 0 ? 2. : 1.));
  col /= 16.;
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, sat) * bri;
  gl_FragColor = vec4(mix(col, vec3(1.), tint), 1.);
}`;
  const dpr = Math.min(root.devicePixelRatio || 1, 2);
  let gl, glc, prog, tex, ok, lost = false, wall = null, wallUrl = '', cfg = {}, inited = false, raf = 0, idle = 0;
  const loc = {}, items = new Set(), rules = [];

  function setup() {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    ['size', 'origin', 'wOff', 'wSize', 'radius', 'bezel', 'power', 'scale', 'blur', 'sat', 'bri', 'tint', 'dir'].forEach(n => loc[n] = gl.getUniformLocation(prog, n));
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }
  function initGL() {
    if (ok !== undefined) return ok;
    try {
      const opt = { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false };
      glc = document.createElement('canvas');
      gl = glc.getContext('webgl', opt) || glc.getContext('experimental-webgl', opt);
      ok = !!gl && setup();
      if (ok) {
        glc.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
        glc.addEventListener('webglcontextrestored', () => { setup(); lost = false; wallUrl = ''; refreshWall(); });
      }
    } catch (e) { ok = false; }
    return ok;
  }

  function container() {
    let c = cfg.container; if (typeof c === 'string') c = document.querySelector(c);
    return c || document.getElementById('phoneContainer') || document.documentElement;
  }
  function resolveWall() {
    let w = cfg.wallpaper; if (typeof w === 'function') w = w();
    if (w) return w;
    const s = root.currentDesktopWallpaperSrc;                 // 你的设置里选的壁纸
    if (s) return s.startsWith('data:') ? s : encodeURI(s);
    const pc = document.getElementById('phoneContainer');
    return 'assets/' + (pc && pc.classList.contains('theme-light') ? 'Light' : 'Dark') + '/bizhi.png';
  }
  function refreshWall() {
    const url = resolveWall(); if (!url || url === wallUrl || !ok) return;
    wallUrl = url;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (url !== wallUrl) return;
      let src = img, w = img.naturalWidth, h = img.naturalHeight; const M = 2048;
      if (Math.max(w, h) > M) {                                // 太大的图先缩小，避免超出手机显存
        const k = M / Math.max(w, h), c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); src = c;
      }
      try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      catch (e) { wall = null; items.forEach(el => el.classList.add('lg-fallback')); return; }
      wall = { w, h }; items.forEach(el => { el._lg.key = ''; }); wake();
    };
    img.onerror = () => { wall = null; };
    img.src = url;
  }

  function rim(x, w, h, r) {                                    // 玻璃边缘的高光描边
    r = Math.min(r, w / 2, h / 2); const a = .75;
    x.beginPath(); x.moveTo(r + a, a);
    x.arcTo(w - a, a, w - a, h - a, r); x.arcTo(w - a, h - a, a, h - a, r); x.arcTo(a, h - a, a, a, r); x.arcTo(a, a, w - a, a, r);
    x.closePath();
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.35, 'rgba(255,255,255,.12)');
    g.addColorStop(.65, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,.45)');
    x.lineWidth = 1.5; x.strokeStyle = g; x.stroke();
  }

  function render(el) {
    const st = el._lg, w = el.offsetWidth, h = el.offsetHeight;
    if (!wall || lost || w < 4 || h < 4) return;
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return;   // 屏幕外的不画
    if (st.w !== w || st.h !== h) { st.w = w; st.h = h; st.r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0; }
    const cr = container().getBoundingClientRect(), k = Math.max(cr.width / wall.w, cr.height / wall.h);
    const sw = wall.w * k, sh = wall.h * k, o = st.o, W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (glc.width !== W || glc.height !== H) { glc.width = W; glc.height = H; }
    gl.viewport(0, 0, W, H); gl.useProgram(prog); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform2f(loc.size, w, h); gl.uniform2f(loc.origin, r.left, r.top);
    gl.uniform2f(loc.wOff, cr.left + (cr.width - sw) / 2, cr.top + (cr.height - sh) / 2); gl.uniform2f(loc.wSize, sw, sh);
    gl.uniform1f(loc.radius, st.r); gl.uniform1f(loc.bezel, o.bezel); gl.uniform1f(loc.power, o.power); gl.uniform1f(loc.scale, o.scale);
    gl.uniform1f(loc.blur, o.blur); gl.uniform1f(loc.sat, o.saturate); gl.uniform1f(loc.bri, o.brightness); gl.uniform1f(loc.tint, o.tint);
    gl.uniform1f(loc.dir, o.invert ? 1 : -1);                  // 默认朝内取样（凸透镜）
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const c = st.c; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(glc, 0, 0);
    x.setTransform(W / w, 0, 0, H / h, 0, 0); rim(x, w, h, st.r);
  }

  // 只在有东西在动（滑动翻页、动画）时逐帧重画，静止约半秒后自动停止
  function tick() {
    let moved = false;
    items.forEach(el => {
      if (!el.isConnected) { items.delete(el); return; }
      const r = el.getBoundingClientRect(), key = r.left.toFixed(1) + '|' + r.top.toFixed(1) + '|' + el.offsetWidth + '|' + el.offsetHeight;
      if (key !== el._lg.key) { el._lg.key = key; render(el); moved = true; }
    });
    idle = moved ? 0 : idle + 1;
    raf = idle > 30 ? 0 : requestAnimationFrame(tick);
  }
  function wake() { idle = 0; if (!raf && ok) raf = requestAnimationFrame(tick); }

  function init(opts) {
    Object.assign(cfg, opts || {});
    if (!initGL()) return false;
    if (!inited) {
      inited = true;
      ['touchmove', 'pointermove', 'scroll', 'transitionrun', 'transitionend', 'animationstart', 'animationend']
        .forEach(ev => document.addEventListener(ev, wake, { capture: true, passive: true }));
      root.addEventListener('resize', wake);
      new MutationObserver(() => { refreshWall(); wake(); }).observe(container(), { attributes: true, attributeFilter: ['class', 'style'] });
    }
    refreshWall(); return true;
  }

  function apply(el, opt) {
    if (!inited) init();
    if (!ok) { el.classList.add('lg-fallback'); return; }
    if (!el._lg) {
      const c = document.createElement('canvas'); c.className = 'lg-cv';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.insertBefore(c, el.firstChild); el.classList.add('lg');
      el._lg = { c, o: {}, key: '', w: 0, h: 0, r: 0 }; items.add(el);
      new ResizeObserver(wake).observe(el);
    }
    el._lg.o = Object.assign({}, DEFAULTS, el._lg.o, opt); el._lg.key = '';
    render(el); wake();
  }

  function auto(selectors, opt) {                                // 之后动态生成的元素也会自动加上
    rules.push({ sel: [].concat(selectors).join(','), opt }); scan();
    if (!auto._mo) {
      let t; auto._mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 200); });
      auto._mo.observe(document.body, { childList: true, subtree: true });
    }
  }
  function scan() { rules.forEach(r => document.querySelectorAll(r.sel).forEach(el => { if (!el._lg && !el.classList.contains('lg-fallback')) apply(el, r.opt); })); }

  root.LiquidGlass = { get supported() { return initGL(); }, defaults: DEFAULTS, init, apply, auto, wake, refresh: () => { wallUrl = ''; refreshWall(); } };
})(typeof window !== 'undefined' ? window : globalThis);
