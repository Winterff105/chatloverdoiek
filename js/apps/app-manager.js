/* Robust app launcher: always opens the host window, even if a module has an initialization error. */
/* 按需加载 Little Lace 的样式与脚本（只加载一次） */
function loadArchangelApp(done) {
    if (!document.querySelector('link[href$="css/archangel.css"]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = 'css/archangel.css';
        document.head.appendChild(l);
    }
    if (window.initArchangelApp) { done(); return; }
    const existing = document.querySelector('script[data-archangel-js]');
    if (existing) { existing.addEventListener('load', done); existing.addEventListener('error', done); return; }
    const s = document.createElement('script');
    s.src = 'js/apps/archangel.js'; s.dataset.archangelJs = '1';
    s.onload = done; s.onerror = done;
    document.body.appendChild(s);
}
function openApp(appId) {
    const def = (typeof APPS !== 'undefined' && APPS[appId]) || { name: appId === 'chat' ? 'chat' : appId, svg: '' };
    const home = document.getElementById('homeScreen');
    const win = document.getElementById('appWindow');
    if (!home || !win) { console.error('[Forever] 找不到主屏幕或应用窗口容器'); return; }
    const contentArea = win.querySelector('.app-content');
    const title = document.getElementById('appTitle');
    if (title) title.textContent = def.name || '应用';
    win.classList.remove('noir-mode', 'messages-window');
    // 先显示窗口，模块初始化失败也不会表现为完全点不开。
    home.classList.add('scaled');
    win.classList.add('active');
    try {
        if (appId === 'settings') {
            win.classList.add('noir-mode');
            if (typeof getSettingsAppHTML === 'function') {
                contentArea.innerHTML = getSettingsAppHTML();
                if (typeof initSettingsApp === 'function') initSettingsApp();
            } else contentArea.innerHTML = '<div style="padding:24px">设置模块未加载，请检查 js/apps/settings.js 路径。</div>';
        } else if (appId === 'chat') {
            win.classList.add('messages-window');
            if (!window.MESSAGES_APP_MARKUP) {
                contentArea.innerHTML = '<div style="padding:24px;color:#fff">信息界面模板未加载。请检查 js/apps/messages-markup.js 的路径。</div>';
                console.error('[Forever] MESSAGES_APP_MARKUP is missing'); return;
            }
            contentArea.innerHTML = window.MESSAGES_APP_MARKUP;
            const root = contentArea.querySelector('.messages-app');
            if (!root) {
                contentArea.innerHTML = '<div style="padding:24px;color:#fff">信息界面模板结构异常：未找到 .messages-app。</div>';
                console.error('[Forever] .messages-app root is missing'); return;
            }
            if (typeof window.initMessagesModule === 'function') {
                try { window.initMessagesModule(root); }
                catch (err) {
                    console.error('[Forever] 信息模块初始化失败:', err);
                    const note = document.createElement('div');
                    note.style.cssText = 'position:absolute;z-index:99999;left:12px;right:12px;bottom:64px;padding:12px;border-radius:12px;background:#292929;color:#fff;font:12px/1.5 sans-serif;white-space:normal;';
                    note.textContent = '信息界面已打开，但初始化遇到错误：' + (err && err.message ? err.message : String(err)) + '。请截图反馈此提示。';
                    root.appendChild(note);
                }
            } else {
                console.error('[Forever] initMessagesModule is missing');
                const note = document.createElement('div'); note.style.cssText = 'padding:24px;color:#fff';
                note.textContent = '信息脚本未加载，请检查 js/apps/messages.js 的路径。'; root.appendChild(note);
            }
        } else if (appId === 'book') {
            // Little Lace：Archangel 工作台，直接挂在应用窗口里（样式 css/archangel.css，脚本 js/apps/archangel.js）
            contentArea.innerHTML = '<div class="archangel-app"></div>';
            loadArchangelApp(() => {
                if (typeof window.initArchangelApp === 'function') window.initArchangelApp(contentArea.firstElementChild);
                else contentArea.innerHTML = '<div style="padding:24px;color:#fff">Little Lace 模块未加载，请检查 js/apps/archangel.js 与 css/archangel.css 的路径。</div>';
            });
        } else if (appId === 'worldbook') {
            // 世界书：样式 css/worldbook.css，脚本 js/apps/worldbook.js
            contentArea.innerHTML = '<div class="wb-host" style="height:100%;overflow:hidden;"></div>';
            const host = contentArea.firstElementChild;
            if (typeof window.initWorldbookModule === 'function') {
                try { window.initWorldbookModule(host); }
                catch (err) {
                    console.error('[Forever] 世界书初始化失败:', err);
                    host.innerHTML = '<div style="padding:24px;color:#333">世界书初始化失败：' + String(err && err.message || err) + '</div>';
                }
            } else {
                host.innerHTML = '<div style="padding:24px;color:#333">世界书脚本未加载，请检查 js/apps/worldbook.js 的路径。</div>';
            }
        } else if (appId === 'todo') {
            // app预设：样式 css/preset.css，脚本 js/apps/preset.js
            contentArea.innerHTML = '<div class="preset-app" style="width:100%;height:100%;position:relative;overflow:hidden;"></div>';
            const host = contentArea.firstElementChild;
            if (typeof window.initPresetModule === 'function') {
                try { window.initPresetModule(host); }
                catch (err) {
                    console.error('[Forever] 预设模块初始化失败:', err);
                    host.innerHTML = '<div style="padding:24px;color:#333">预设模块初始化失败：' + String(err && err.message || err) + '</div>';
                }
            } else {
                host.innerHTML = '<div style="padding:24px;color:#333">预设脚本未加载，请检查 js/apps/preset.js 的路径。</div>';
            }
        } else {
            contentArea.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;"><div class="app-icon" style="width:68px;height:68px;"><div class="floating-glyph" style="width:40px;height:40px;">${def.svg || ''}</div></div><h2 style="color:var(--text-dark);font-size:17px;font-weight:600;">${def.name || '应用'}</h2><p style="font-size:13px;color:var(--text-sub);">应用开发中...</p></div>`;
        }
    } catch (err) {
        console.error('[Forever] 打开应用失败:', err);
        contentArea.innerHTML = '<div style="padding:24px;color:#fff">应用打开失败：' + String(err && err.message || err).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) + '</div>';
    }
}
function closeApp() {
    const home = document.getElementById('homeScreen'), win = document.getElementById('appWindow');
    const contentArea = win && win.querySelector('.app-content');
    if (home) home.classList.remove('scaled');
    if (win) win.classList.remove('active', 'noir-mode', 'messages-window');
    setTimeout(() => { if (win && !win.classList.contains('active') && contentArea) contentArea.innerHTML = ''; }, 300);
}
window.openApp = openApp;
window.closeApp = closeApp;
