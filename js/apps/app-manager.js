/* =========================================
   8. 启动与退出 App
   ========================================= */
function openApp(appId) {
    console.log('🚀 [openApp] 尝试打开应用:', appId);
    const def = APPS[appId];
    if (!def) {
        console.warn('⚠️ [openApp] 未找到应用定义:', appId);
        return;
    }

    const home = document.getElementById('homeScreen');
    const win = document.getElementById('appWindow');
    const contentArea = win.querySelector('.app-content');

    document.getElementById('appTitle').textContent = def.name;

    if (appId === 'settings') {
        win.classList.add('noir-mode');
        contentArea.innerHTML = getSettingsAppHTML();
        initSettingsApp();
    } else if (appId === 'chat') {
        if (typeof window.openChatStyleModal === 'function') {
            window.openChatStyleModal();
        }
        return;
    } else {
        win.classList.remove('noir-mode');
        contentArea.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 14px;">
                <div class="app-icon" style="width:68px;height:68px;">
                    <div class="floating-glyph" style="width:40px;height:40px;">${def.svg}</div>
                </div>
                <h2 style="color: var(--text-dark); font-size: 17px; font-weight: 600;">${def.name}</h2>
                <p style="font-size: 13px; color: var(--text-sub);">应用开发中...</p>
            </div>
        `;
    }

    home.classList.add('scaled');
    win.classList.add('active');
    console.log('✅ [openApp] 应用已成功打开，当前窗口类名:', win.className);
}

function closeApp() {
    console.log('🚪 [closeApp] 尝试关闭应用，返回主屏幕');
    const home = document.getElementById('homeScreen');
    const win = document.getElementById('appWindow');
    const contentArea = win.querySelector('.app-content');
    
    home.classList.remove('scaled');
    win.classList.remove('active');
    win.classList.remove('noir-mode');

    setTimeout(() => {
        if (!win.classList.contains('active')) {
            contentArea.innerHTML = '';
        }
    }, 300);

    console.log('✅ [closeApp] 应用已关闭，主屏幕恢复，当前窗口类名:', win.className);
}

// 供 HTML 内联 onclick 使用
window.closeApp = closeApp;
