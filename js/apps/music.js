/* Whatever 主 App 音乐模块：页面沙箱隔离，防止 3000 行 CSS 污染其他应用。
 * 只管理视图装载和关闭；音乐业务逻辑在 /music/music.js。
 */
(function (global) {
  'use strict';
  const API = global.WhateverMusicApp || {};
  let frame = null;
  let holder = null;

  API.configure = function ({ getSettings, callAI } = {}) {
    if (typeof getSettings === 'function') API.getSettings = getSettings;
    if (typeof callAI === 'function') API.callAI = callAI;
    return API;
  };

  API.mount = API.open = function (host) {
    const target = host || document.getElementById('appWindow');
    if (!target) throw new Error('音乐 App：需要一个主应用容器 host');
    if (frame && holder === target) {
      frame.style.display = 'block';
      return frame;
    }
    API.close({ remove: true });
    const iframe = document.createElement('iframe');
    iframe.src = '/music/index.html';
    iframe.title = 'Chérie Music';
    iframe.allow = 'autoplay; clipboard-write';
    iframe.style.cssText = 'position:absolute;inset:0;z-index:100;display:block;width:100%;height:100%;border:0;background:#0a0b0e;';
    iframe.dataset.whateverMusic = '1';
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.appendChild(iframe);
    holder = target;
    frame = iframe;
    return iframe;
  };

  API.close = function ({ remove = false } = {}) {
    if (!frame) return;
    try {
      const win = frame.contentWindow;
      const audio = win?.document?.getElementById('realAudio');
      if (audio) audio.pause();
      win?.ListenTogether?.stop?.();
    } catch (_) { /* 忽略跨域或未初始化状态 */ }
    if (remove) {
      frame.remove(); frame = null; holder = null;
    } else frame.style.display = 'none';
  };

  API.getFrame = () => frame;
  global.WhateverMusicApp = API;
})(window);
