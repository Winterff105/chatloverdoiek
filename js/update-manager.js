/* Whatever auto-update manager · cache-safe, independent of SW update messages.
 * PAGE_VERSION must match /app-version.json and sw.js APP_VERSION.
 * Never clears localStorage, IndexedDB, accounts, messages, or credentials.
 */
(function () {
  'use strict';
  if (window.__whateverUpdatesStarted) return;
  window.__whateverUpdatesStarted = true;
  const PAGE_VERSION = '25';
  const VERSION_KEY = 'whatever_app_version';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const MAX_CHECK_MS = 10000;
  const RELEASE_URL = '/app-version.json';
  const modal = document.getElementById('appUpdateModal');
  const toast = document.getElementById('appUpdateToast');
  const openButton = document.getElementById('appUpdateOpen');
  const laterButton = document.getElementById('appUpdateLater');
  const nowButton = document.getElementById('appUpdateNow');
  const notesContainer = document.getElementById('appUpdateNotes');
  let updating = false;
  let latest = '';
  let lastCheckAt = 0;
  let displayedVersion = '';
  let autoPrompted = false;

  function text(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function stored() {
    try {return localStorage.getItem(VERSION_KEY) || '';} catch (_) {return '';}
  }
  function installed(version) {
    try {localStorage.setItem(VERSION_KEY, version);} catch (_) {}
  }
  // Existing installed v20 may be stored, but the new v21 shell is already
  // running when this script executes. Do not offer to "update" current code.
  const previous = stored();
  if (!previous || previous !== PAGE_VERSION) installed(PAGE_VERSION);
  text('appVersionBadge', 'Whatever v' + PAGE_VERSION);
  if (previous && previous !== PAGE_VERSION) {
    try {sessionStorage.setItem('whatever_just_updated', PAGE_VERSION);} catch (_) {}
  }

  function setNotes(items) {
    if (!notesContainer) return;
    notesContainer.replaceChildren();
    const entries = (Array.isArray(items) ? items : [])
      .filter(s => typeof s === 'string' && s.trim()).slice(0, 4);
    if (!entries.length) entries.push('优化体验，修复已知问题');
    for (const s of entries) {
      const row = document.createElement('li');
      row.textContent = s.trim().slice(0, 140);
      notesContainer.appendChild(row);
    }
  }
  function show(version, notes) {
    if (!version || version === PAGE_VERSION || updating) return;
    latest = version;
    window.__pendingAppVersion = version;
    text('appUpdateFrom', 'v' + PAGE_VERSION);
    text('appUpdateTo', 'v' + version);
    text('appUpdateVersion', 'v' + version);
    setNotes(notes);
    if (toast) {
      toast.hidden = false;
      toast.style.visibility = 'visible';
      toast.style.opacity = '1';
      toast.style.pointerEvents = 'auto';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }
    if (!autoPrompted && modal) {
      autoPrompted = true;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      nowButton?.focus();
    }
  }
  function dismiss() {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  function showDetails() {
    if (!latest || !modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    nowButton?.focus();
  }
  async function fetchLatest() {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), MAX_CHECK_MS);
    try {
      // URL cache-busting + no-store bypasses stale browser, CDN and old SW
      // caches. The SW itself also excludes this endpoint from interception.
      const url = RELEASE_URL + '?check=' + Date.now();
      const response = await fetch(url, {
        cache: 'no-store', credentials: 'same-origin', signal: ac.signal,
        headers: {Accept: 'application/json'}
      });
      if (!response.ok) throw new Error('release manifest HTTP ' + response.status);
      const data = await response.json();
      const version = typeof data.version === 'string' ? data.version.trim() : '';
      if (!/^[\w.-]{1,32}$/.test(version)) throw new Error('invalid version manifest');
      return {version, notes:data.notes};
    } finally { clearTimeout(timeout); }
  }
  async function checkUpdates(force) {
    if (updating) return;
    const now = Date.now();
    if (!force && now - lastCheckAt < 20000) return;
    lastCheckAt = now;
    try {
      const release = await fetchLatest();
      // If a slower/older deployment finishes after this one, never invite
      // the user to downgrade to a smaller numeric version.
      const n = Number(release.version), current = Number(PAGE_VERSION);
      if (Number.isFinite(n) && Number.isFinite(current) && n <= current) return;
      show(release.version, release.notes);
    } catch (error) {
      console.info('[Whatever Updates] Network check skipped:', error?.message || error);
    }
  }
  async function applyUpdate() {
    if (updating) return;
    updating = true;
    if (nowButton) {
      nowButton.disabled = true;
      nowButton.textContent = '正在更新…';
    }
    text('appUpdateStatus', '正在获取最新版本，不会删除聊天记录或登录信息。');
    // Clear *only* our own cache namespace. Never delete other apps' caches.
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('Whatever-v'))
          .map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await Promise.race([
            reg.update().catch(() => {}),
            new Promise(resolve => setTimeout(resolve, 3500))
          ]);
          reg.waiting?.postMessage({type:'SKIP_WAITING'});
        }
      }
    } catch (error) {
      console.warn('[Whatever Updates] Partial cache reset:', error);
    }
    try {sessionStorage.setItem('whatever_update_requested', latest || 'new');} catch (_) {}
    // A fresh navigation with a unique URL is important for installed PWA
    // and Android WebView: it forces a new HTML document rather than reload().
    const target = new URL(location.href);
    target.searchParams.set('whatever_update', Date.now().toString());
    location.replace(target.href);
  }
  window.__applyUpdate = applyUpdate;
  window.checkWhateverUpdate = () => checkUpdates(true);
  openButton?.addEventListener('click', showDetails);
  laterButton?.addEventListener('click', dismiss);
  nowButton?.addEventListener('click', applyUpdate);
  modal?.addEventListener('click', e => {if (e.target === modal) dismiss();});
  modal?.addEventListener('keydown', e => {if (e.key === 'Escape') dismiss();});

  async function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope:'/', updateViaCache:'none'
      });
      const requestCurrent = () => {
        try {reg.active?.postMessage({type:'GET_VERSION'});} catch (_) {}
      };
      requestCurrent();
      // Force a fresh check each time the app enters the foreground.
      reg.update().catch(() => {});
      navigator.serviceWorker.ready.then(requestCurrent).catch(() => {});
    } catch (error) {
      console.warn('[Whatever Updates] Service Worker unavailable:', error);
    }
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      const data = e.data || {};
      if (!['NEW_VERSION','VERSION'].includes(data.type)) return;
      if (typeof data.version !== 'string') return;
      if (data.version !== PAGE_VERSION) checkUpdates(true);
    });
  }
  function refresh() {
    checkUpdates(true);
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration()
      .then(reg => reg?.update()).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', e => {if (e.persisted) refresh();});
  setInterval(() => {
    if (document.visibilityState === 'visible') checkUpdates(false);
  }, CHECK_INTERVAL_MS);

  // A previous update requested a fresh page but the CDN might still serve the
  // old release. Keep retrying via the same prompt rather than claiming success.
  try {
    if (sessionStorage.getItem('whatever_update_requested')) {
      sessionStorage.removeItem('whatever_update_requested');
      if (previous && previous !== PAGE_VERSION) {
        console.info('[Whatever Updates] Fresh version installed:', PAGE_VERSION);
      }
    }
  } catch (_) {}
  registerSW();
  checkUpdates(true);
})();
