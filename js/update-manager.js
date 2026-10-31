/* Whatever auto-update manager · cache-safe, independent of SW update messages.
 * PAGE_VERSION must match /app-version.json and sw.js APP_VERSION.
 * Never clears localStorage, IndexedDB, accounts, messages, or credentials.
 */
(function () {
  'use strict';
  if (window.__whateverUpdatesStarted) return;
  window.__whateverUpdatesStarted = true;
  const PAGE_VERSION = '42.1.4';
  const VERSION_KEY = 'whatever_app_version';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const MAX_CHECK_MS = 10000;
  const RELEASE_URL = '/app-version.json';
  // Compare numeric segments, including legacy versions such as "42".
  function compareAppVersions(a, b) {
    const parse = value => {
      const str = String(value || '').trim();
      if (!/^\d+(?:\.\d+){0,2}$/.test(str)) return null;
      return str.split('.').map(Number).concat([0, 0]).slice(0, 3);
    };
    const left = parse(a), right = parse(b);
    if (!left || !right) return null;
    for (let i = 0; i < 3; i++) {
      if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    }
    return 0;
  }
  const modal = document.getElementById('appUpdateModal');
  const toast = document.getElementById('appUpdateToast');
  const openButton = document.getElementById('appUpdateOpen');
  const laterButton = document.getElementById('appUpdateLater');
  const nowButton = document.getElementById('appUpdateNow');
  const notesContainer = document.getElementById('appUpdateNotes');
  let updating = false;
  let latest = '';
  let showingInstalledNotes = false;
  let lastCheckAt = 0;
  const QUIET_HINT_KEY = 'whatever_update_hint_v1';
  const QUIET_HINT_DELAY_MS = 8000;
  const QUIET_HINT_VISIBLE_MS = 10000;
  const QUIET_HINT_SNOOZE_MS = 48 * 60 * 60 * 1000;
  let quietHintTimer = null;
  let quietHideTimer = null;
  let pendingHintVersion = '';

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
  const upgradedFrom = previous && compareAppVersions(PAGE_VERSION, previous) > 0 ? previous : '';
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
  function hideCapsule() {
    if (!toast) return;
    toast.style.visibility = 'hidden';
    toast.style.opacity = '0';
    toast.style.pointerEvents = 'none';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
  }
  function isSafeToHint() {
    if (document.visibilityState !== 'visible') return false;
    // Never prompt during login, chat, typing or music playback.
    if (document.getElementById('sanctuaryGatePortal')?.isConnected) return false;
    if (document.getElementById('appWindow')?.classList.contains('active')) return false;
    if (window.WhateverMusicNowPlaying?.playing) return false;
    if (document.getElementById('wmc-floating-player')?.hidden === false) return false;
    if (document.activeElement?.matches?.('input,textarea,[contenteditable="true"]')) return false;
    return true;
  }
  function scheduleQuietHint(version, notes) {
    if (pendingHintVersion === version) return;
    try {
      const lastHint = JSON.parse(localStorage.getItem(QUIET_HINT_KEY) || 'null');
      if (lastHint?.version === version &&
          Date.now() - lastHint.at < QUIET_HINT_SNOOZE_MS) return;
    } catch (_) {}
    clearTimeout(quietHintTimer);
    pendingHintVersion = version;
    const tryShowWhenSafe = () => {
      if (pendingHintVersion !== version) return;
      // A chat or login screen may be open at startup. Retry safely instead
      // of dropping this release notice until the next app launch.
      if (!isSafeToHint()) {
        quietHintTimer = setTimeout(tryShowWhenSafe, 15000);
        return;
      }
      pendingHintVersion = '';
      show(version, notes);
      try {
        localStorage.setItem(QUIET_HINT_KEY, JSON.stringify({version, at:Date.now()}));
      } catch (_) {}
      clearTimeout(quietHideTimer);
      quietHideTimer = setTimeout(() => {
        if (!updating) hideCapsule();
      }, QUIET_HINT_VISIBLE_MS);
    };
    quietHintTimer = setTimeout(tryShowWhenSafe, QUIET_HINT_DELAY_MS);
  }
  function show(version, notes) {
    if (!version || version === PAGE_VERSION || updating) return;
    clearTimeout(quietHideTimer);
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
    // Keep the bottom capsule as the only automatic prompt. The full
    // details sheet is opened only when the user taps "查看".
  }
  function dismiss() {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (showingInstalledNotes) {
      showingInstalledNotes = false;
      if (nowButton) nowButton.textContent = '立即更新';
    }
  }
  // Show the full release notes once after a new shell has finished loading.
  function showInstalledNotes(previousVersion, notes) {
    if (!previousVersion || !modal || updating) return;
    showingInstalledNotes = true;
    text('appUpdateFrom', 'v' + previousVersion);
    text('appUpdateTo', 'v' + PAGE_VERSION);
    text('appUpdateVersion', 'v' + PAGE_VERSION);
    text('appUpdateStatus', '已更新到最新版本，聊天记录和设置不会删除。');
    setNotes(notes);
    if (nowButton) {
      nowButton.disabled = false;
      nowButton.textContent = '完成';
    }
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
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
  async function checkUpdates(force, mode = 'passive') {
    if (updating) return;
    const now = Date.now();
    if (!force && now - lastCheckAt < 20000) return;
    lastCheckAt = now;
    try {
      const release = await fetchLatest();
      // If a slower/older deployment finishes after this one, never invite
      // the user to downgrade to a smaller numeric version.
      const order = compareAppVersions(release.version, PAGE_VERSION);
      if (order !== null && order <= 0) return;
      // Foreground, timer and SW checks stay silent while someone is playing.
      if (mode === 'manual') {
        clearTimeout(quietHintTimer);
        pendingHintVersion = '';
        show(release.version, release.notes);
      } else if (mode === 'startup' || mode === 'passive') {
        // Retry a dismissed unsafe hint after leaving chat or music playback.
        scheduleQuietHint(release.version, release.notes);
      }
    } catch (error) {
      console.info('[Whatever Updates] Network check skipped:', error?.message || error);
    }
  }
  async function verifyReleaseReady(version) {
    // A manifest can arrive before the corresponding JS is deployed. Never
    // force reload into a mixed release, which can leave installed PWAs stale.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), MAX_CHECK_MS);
    try {
      const url = '/js/update-manager.js?verify=' + Date.now();
      const response = await fetch(url, {
        cache:'no-store',credentials:'same-origin',signal:ac.signal
      });
      if (!response.ok) throw new Error('update script HTTP ' + response.status);
      const source = await response.text();
      const found = source.match(/const PAGE_VERSION\s*=\s*['"]([\w.-]+)['"]/);
      return found?.[1] === version;
    } finally {clearTimeout(timer);}
  }
  async function applyUpdate() {
    if (updating) return;
    updating = true;
    if (nowButton) {
      nowButton.disabled = true;
      nowButton.textContent = '正在检查…';
    }
    text('appUpdateStatus', '正在确认版本文件已发布，不会删除聊天记录或登录信息。');
    try {
      const release = await fetchLatest();
      if (release.version !== latest || !(await verifyReleaseReady(release.version))) {
        throw new Error('新版本仍在发布中，请稍后重试。');
      }
      text('appUpdateStatus', '版本文件已就绪，正在更新应用。');
      if (nowButton) nowButton.textContent = '正在更新…';
      // Retain existing offline caches until the new worker successfully
      // activates. Clearing an active cache first can break offline launch.
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await Promise.race([
              reg.update().catch(error => {
                console.warn('[Whatever Updates] SW refresh unavailable:', error);
              }),
              new Promise(resolve => setTimeout(resolve, 4000))
            ]);
            reg.waiting?.postMessage({type:'SKIP_WAITING'});
          }
        } catch (error) {
          console.warn('[Whatever Updates] SW refresh unavailable:', error);
        }
      }
      try {sessionStorage.setItem('whatever_update_requested', release.version);} catch (_) {}
      // A unique navigation URL bypasses stale installed-PWA shell documents.
      const target = new URL(location.href);
      target.searchParams.set('whatever_update', release.version + '-' + Date.now());
      location.replace(target.href);
    } catch (error) {
      updating = false;
      if (nowButton) {
        nowButton.disabled = false;
        nowButton.textContent = '立即更新';
      }
      text('appUpdateStatus', error?.message || '更新失败，请稍后再试。');
      console.warn('[Whatever Updates] Update not ready:', error);
    }
  }
  window.__applyUpdate = applyUpdate;
  window.checkWhateverUpdate = () => checkUpdates(true, 'manual');
  openButton?.addEventListener('click', showDetails);
  laterButton?.addEventListener('click', dismiss);
  nowButton?.addEventListener('click', () => {
    if (showingInstalledNotes) { dismiss(); return; }
    applyUpdate();
  });
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
    checkUpdates(true, 'startup');
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

  // Only confirm an update when the newly loaded shell reached the
  // requested version. Preserve a pending request if an old shell reloaded.
  try {
    const requested = sessionStorage.getItem('whatever_update_requested');
    if (requested && compareAppVersions(PAGE_VERSION, requested) !== null &&
        compareAppVersions(PAGE_VERSION, requested) >= 0) {
      sessionStorage.removeItem('whatever_update_requested');
      console.info('[Whatever Updates] Requested release loaded:', PAGE_VERSION);
    } else if (requested) {
      console.info('[Whatever Updates] Still on older shell:', PAGE_VERSION, requested);
    }
  } catch (_) {}
  registerSW();
  checkUpdates(true, 'startup');
  if (upgradedFrom) {
    // Defer the notes until the desktop is visible and not busy.
    let releaseNotesTimer = null;
    const announce = async () => {
      if (!isSafeToHint()) return;
      clearInterval(releaseNotesTimer);
      try {
        const release = await fetchLatest();
        if (release.version === PAGE_VERSION) showInstalledNotes(upgradedFrom, release.notes);
      } catch (error) {
        console.info('[Whatever Updates] Release notes unavailable:', error?.message || error);
        showInstalledNotes(upgradedFrom, []);
      }
    };
    releaseNotesTimer = setInterval(announce, 4000);
    setTimeout(announce, 1200);
  }
})();
