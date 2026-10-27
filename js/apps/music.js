/* Chérie Music · Whatever launcher. Runs alongside the existing protected
 * desktop modules without altering app-manager.js in private Supabase Storage.
 */
(function (global) {
  'use strict';
  const API = global.WhateverMusicApp || {};
  let layer = null;
  let frame = null;

  API.configure = function ({ getSettings, callAI } = {}) {
    if (typeof getSettings === 'function') API.getSettings = getSettings;
    if (typeof callAI === 'function') API.callAI = callAI;
    return API;
  };

  API.open = API.mount = function () {
    if (layer?.isConnected) { layer.style.display = 'block'; return frame; }
    let token = '';
    try { token = JSON.parse(localStorage.getItem('whatever_phone_auth') || '{}').token || ''; }
    catch (_) { /* no session */ }
    if (!token) {
      if (typeof global.alert === 'function') global.alert('请登录小手机后再打开音乐 App');
      return null;
    }
    layer = document.createElement('div');
    layer.id = 'whatever-music-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483500;background:#0a0b0e;overflow:hidden;';
    frame = document.createElement('iframe');
    frame.src = '/music/';
    frame.title = 'Chérie Music';
    frame.allow = 'autoplay; clipboard-write';
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#0a0b0e;';
    layer.appendChild(frame);
    document.body.appendChild(layer);
    return frame;
  };

  API.close = function ({ remove = true } = {}) {
    if (!layer) return;
    try {
      const child = frame?.contentWindow;
      child?.document?.getElementById('realAudio')?.pause();
      child?.ListenTogether?.stop?.();
    } catch (_) { /* avoid breaking navigation */ }
    if (remove) { layer.remove(); layer = null; frame = null; }
    else layer.style.display = 'none';
  };

  API.getFrame = () => frame;
  global.WhateverMusicApp = API;
  global.openMusicApp = () => API.open();

  function installLauncher() {
    const home = document.getElementById('homeScreen');
    if (!home || document.getElementById('whatever-music-entry')) return;
    const b = document.createElement('button');
    b.id = 'whatever-music-entry';
    b.type = 'button';
    b.setAttribute('aria-label', '打开音乐 App');
    b.title = 'Chérie Music';
    b.innerHTML = '<span class="whatever-music-glyph" aria-hidden="true">♫</span><span class="whatever-music-label">音乐</span>';
    b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); API.open(); });
    const css = document.createElement('style');
    css.id = 'whatever-music-launcher-css';
    css.textContent = `#whatever-music-entry{position:absolute;right:20px;bottom:calc(env(safe-area-inset-bottom,0px) + 122px);z-index:100;width:62px;min-height:76px;padding:4px;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;color:#fff;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;filter:drop-shadow(0 2px 8px #0009)}#whatever-music-entry .whatever-music-glyph{display:grid;place-items:center;width:55px;height:55px;border-radius:16px;border:1px solid #ffffff50;background:linear-gradient(135deg,#29232c,#0a0b0e);box-shadow:inset 0 1px 0 #ffffff33,0 4px 12px #0005;font-size:31px;font-weight:300}#whatever-music-entry .whatever-music-label{font-size:11px;text-shadow:0 1px 3px #000;font-weight:600}`;
    document.head.appendChild(css);
    home.appendChild(b);
  }

  // When an existing desktop tile explicitly identifies the music app,
  // route that tile to Chérie rather than a placeholder handler.
  document.addEventListener('click', function (event) {
    const target = event.target.closest?.('[data-app-id="music"],[data-app="music"],[data-id="music"]');
    if (!target || target.closest('#whatever-music-layer')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    API.open();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installLauncher, { once: true });
  else installLauncher();
})(window);
