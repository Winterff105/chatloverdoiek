/* 长按区域：禁用系统长按选中 / 长按菜单，防止样式被顶开 */
(function injectSettingsLongPressStyle() {
    if (document.getElementById('settingsLongPressStyle')) return;
    const st = document.createElement('style');
    st.id = 'settingsLongPressStyle';
    st.textContent = '#noirSettingsRoot, #noirSettingsRoot *, .wp-morph, .wp-morph *, .sb-morph, .sb-morph * { -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }'
        + ' #noirSettingsRoot input, #noirSettingsRoot textarea { -webkit-user-select:text; user-select:text; }'
        + ' #noirSettingsRoot .settings-panel { overflow-x:hidden; }';
    document.head.appendChild(st);
    // 长按选中时浏览器会横向拖动内容：一旦设置页内有横向滚动，立即拉回
    document.addEventListener('scroll', e => {
        const t = e.target;
        if (t && t.nodeType === 1 && t.scrollLeft && t.closest && t.closest('#noirSettingsRoot')) t.scrollLeft = 0;
    }, true);
})();

/* =========================================
   Studio Noir OS · 设置应用核心逻辑
   ======================================== */

// 内置安全存储代理（自动在 window.DB 与 localStorage 之间无缝切换，杜绝 DB 未定义报错）
const safeDB = {
    async save(key, value) {
        if (window.DB && typeof window.DB.save === 'function') {
            return await window.DB.save(key, value);
        }
        try {
            localStorage.setItem(`noir_os_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('❌ [safeDB SAVE ERROR]:', e);
            return false;
        }
    },
    async load(key, defaultValue = null) {
        if (window.DB && typeof window.DB.load === 'function') {
            const res = await window.DB.load(key, defaultValue);
            if (res !== null && res !== undefined) return res;
        }
        try {
            const item = localStorage.getItem(`noir_os_${key}`);
            const parsed = item ? JSON.parse(item) : defaultValue;
            return parsed;
        } catch (e) {
            console.error('❌ [safeDB LOAD ERROR]:', e);
            return defaultValue;
        }
    }
};
   
function getSettingsAppHTML() {
    return `
    <svg class="svg-filters" style="position:absolute; width:0; height:0; pointer-events:none;">
        <filter id="lens-refraction" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
    </svg>

    <div class="noir-settings-root" id="noirSettingsRoot">
        <div class="grid-bg"></div>
        <div class="top-glow"></div>

        <div class="crosshair tl"></div>
        <div class="crosshair tr"></div>

        <!-- 波点五角星群 -->
        <div class="dotted-stars-container">
            <svg style="position:absolute; top:7%; left:14%; opacity:0.8; width:30px; height:30px;" viewBox="0 0 24 24"><circle cx="12" cy="2" r="1.6"/><circle cx="12" cy="22" r="1.2"/><circle cx="2" cy="12" r="1.6"/><circle cx="22" cy="12" r="1.2"/><circle cx="12" cy="12" r="2.6"/><circle cx="7" cy="7" r="1"/><circle cx="17" cy="7" r="1"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/></svg>
            <svg style="position:absolute; top:16%; right:13%; opacity:0.5; width:22px; height:22px;" viewBox="0 0 24 24"><circle cx="12" cy="2" r="1.3"/><circle cx="12" cy="22" r="1"/><circle cx="2" cy="12" r="1.3"/><circle cx="22" cy="12" r="1"/><circle cx="12" cy="12" r="2.1"/><circle cx="7" cy="7" r="0.8"/><circle cx="17" cy="7" r="0.8"/></svg>
            <svg style="position:absolute; top:33%; left:7%; opacity:0.25; width:15px; height:15px;" viewBox="0 0 24 24"><circle cx="12" cy="2" r="1"/><circle cx="12" cy="22" r="0.8"/><circle cx="2" cy="12" r="1"/><circle cx="22" cy="12" r="0.8"/><circle cx="12" cy="12" r="1.5"/></svg>
            <svg style="position:absolute; top:50%; right:8%; opacity:0.6; width:25px; height:25px;" viewBox="0 0 24 24"><circle cx="12" cy="2" r="1.4"/><circle cx="12" cy="22" r="1.1"/><circle cx="2" cy="12" r="1.4"/><circle cx="22" cy="12" r="1.1"/><circle cx="12" cy="12" r="2.3"/><circle cx="7" cy="7" r="0.9"/><circle cx="17" cy="17" r="0.9"/></svg>
            <svg style="position:absolute; top:78%; right:14%; opacity:0.7; width:26px; height:26px;" viewBox="0 0 24 24"><circle cx="12" cy="2" r="1.5"/><circle cx="12" cy="22" r="1.1"/><circle cx="2" cy="12" r="1.5"/><circle cx="22" cy="12" r="1.1"/><circle cx="12" cy="12" r="2.4"/><circle cx="7" cy="7" r="0.9"/><circle cx="17" cy="7" r="0.9"/><circle cx="7" cy="17" r="0.9"/></svg>
        </div>

        <!-- 1. 顶部导航 -->
        <div class="nav-header">
            <div class="top-glass-pill" onclick="handleSettingsBack()" title="返回">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                <span class="mono-font" id="settingsLeftText">HOME</span>
            </div>

            <div class="header-title-group">
                <svg class="plane-logo-svg" viewBox="0 0 24 24">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <span class="header-title mono-font" id="settingsNavTitle">SETTINGS</span>
            </div>

            <div class="top-glass-pill" onclick="openCenterModal('menu')" title="菜单">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                <span class="mono-font">MENU</span>
            </div>
        </div>

        <!-- Hero 大标题 + 圆形头像 -->
        <div class="hero-zone">
            <div class="hero-text-col">
                <div class="hero-kicker mono-font">
                    <span class="kicker-line"></span>
                    <span class="txt" id="settingsHeroKicker">Control Center</span>
                </div>
                <div class="hero-main" id="settingsHeroMain">System<br><strong>Preferences</strong></div>
                <div class="hero-sub" id="settingsHeroSub">外观 · 接口 · 预设管理</div>
            </div>

            <div class="hero-avatar">
                <div class="avatar-ring" id="settingsAvatarRing" onclick="openSettingsAvatarMorph(this, event)" title="点击更换头像">
                    <img class="settings-avatar-img" id="settingsAvatarImg" src="assets/杂七杂八/设置里面的头像.jpg" alt="avatar">
                </div>
                <div class="avatar-status"></div>
            </div>
        </div>

        <!-- 2. 设置面板区 -->
        <div class="settings-container">

            <!-- 主面板 -->
            <div class="settings-panel active" id="settingsPanelMain">
                <div class="section-tag mono-font">Section 01 — General</div>
                <div class="setting-card">
                    <div class="setting-row" onclick="switchSettingsPanel('appearance')">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">外观设置</span>
                                <span class="row-note mono-font">Appearance & Icons</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>

                    <div class="setting-row" onclick="switchSettingsPanel('api')">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">API 接口与预设</span>
                                <span class="row-note mono-font">Presets & Gateway</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>
                </div>

                <div class="section-tag mono-font">Section 02 — Performance</div>
                <div class="setting-card">
                    <div class="setting-row">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.5 1.2c-.2.4 0 .9.4 1.1l6.5 3.5-3 3-2-.5c-.4-.1-.8.1-1 .4l-.8 1c-.3.4-.2.9.2 1.2l3.5 2.5 2.5 3.5c.3.4.8.5 1.2.2l1-.8c.3-.2.5-.6.4-1l-.5-2 3-3 3.5 6.5c.2.4.7.6 1.1.4l1.2-.5c.4-.2.6-.6.5-1.1z"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">快速巡航</span>
                                <span class="row-note mono-font">Turbo Cruise · 调用观测面板</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <div class="ios-switch" id="quickCruiseSwitch" onclick="event.stopPropagation(); toggleQuickCruise(this)"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 子面板：外观 -->
            <div class="settings-panel" id="settingsPanelAppearance">
                <div class="section-tag mono-font">Appearance — 显示与模式</div>
                <div class="setting-card">
                    <div class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div class="row-left">
                                <div class="row-icon-box">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                </div>
                                <div class="row-text-group">
                                    <span class="row-label">外观明暗模式</span>
                                    <span class="row-note mono-font">Theme Mode</span>
                                </div>
                            </div>
                            <div class="action-text-btn mono-font" onclick="showSettingsThemeTip(event)" style="font-size: 9px; padding: 2px 7px; opacity: 0.8;">Tip</div>
                        </div>
                        <div class="theme-seg-picker">
                            <div class="seg-pill active mono-font" onclick="setSettingsThemeMode('dark', this)">Dark</div>
                            <div class="seg-pill mono-font" onclick="setSettingsThemeMode('light', this)">Light</div>
                            <div class="seg-pill mono-font" onclick="setSettingsThemeMode('auto', this)">System</div>
                        </div>
                    </div>

                    <div class="setting-row">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">自定义壁纸</span>
                                <span class="row-note mono-font">Wallpaper Engine</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <input type="file" id="desktopWallpaperInput" style="display:none;" accept="image/*" onchange="handleDesktopWallpaperUpload(event)">
                            <div class="action-text-btn" id="wallpaperTrigger" onclick="openWallpaperMorph(event)">Change</div>
                            <div class="action-text-btn restore-btn" onclick="resetDesktopWallpaper()" style="opacity:0.6;">Reset</div>
                        </div>
                    </div>
                    <div class="setting-row" onclick="openCenterModal('iconLib')">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">软件图标库设置</span>
                                <span class="row-note mono-font">App Icon Library</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>

                    <div class="setting-row" style="cursor:pointer;" onclick="toggleSettingsFullscreen()">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">点这全屏</span>
                                <span class="row-note mono-font">Immersive Mode</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <div class="ios-switch" id="settingsFullscreenSwitch"></div>
                        </div>
                    </div>
                </div>

                <div class="section-tag mono-font" style="margin-top: 8px;">Section 02 — Advanced Visuals</div>
                <div class="setting-card">
                    <div class="setting-row" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div class="row-left">
                                <div class="row-icon-box">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                </div>
                                <div class="row-text-group">
                                    <span class="row-label">图标深浅自动检测</span>
                                    <span class="row-note mono-font">Adaptive Icon Contrast</span>
                                </div>
                            </div>
                            <div class="row-right">
                                <div class="ios-switch" id="adaptiveContrastSwitch" onclick="toggleAdaptiveContrast()"></div>
                            </div>
                        </div>
                        <div class="manual-color-options" id="manualColorOptions">
                            <span class="field-label mono-font" style="font-size: 8px;">SVG Style Mode · SVG 样式控制</span>
                            <div class="icon-mode-dots">
                                <div class="icon-dot dark-dot" id="dotDark" title="强制深色 SVG" onclick="setIconStyleMode('dark')"></div>
                                <div class="icon-dot light-dot" id="dotLight" title="强制浅色 SVG" onclick="setIconStyleMode('light')"></div>
                                <div class="icon-dot custom-dot" id="dotCustom" title="自定义颜色" onclick="triggerCustomColorPicker(event)">
                                    <input type="color" id="customColorInput" style="position:absolute; opacity:0; width:0; height:0;" onchange="applyCustomIconColor(this.value)">
                                </div>
                            </div>

                            <!-- 渐显提示语 -->
                            <div class="hint-toast mono-font" id="appColorHintToast">✦ 点击书签设置 app 文字颜色</div>

                            <!-- 悬空小书签 -->
                            <div class="bookmark-tab" id="appColorBookmarkTab" onclick="toggleAppNameColorPanel()">
                                <svg viewBox="0 0 34 46">
                                    <path d="M4 2 C4 1 5 0 6 0 L28 0 C29 0 30 1 30 2 L30 40 C30 41.5 28.3 42.2 27.1 41.2 L18.9 34.3 C18.4 33.9 17.6 33.9 17.1 34.3 L8.9 41.2 C7.7 42.2 6 41.5 6 40 Z" 
                                        fill="rgba(255,255,255,0.12)" 
                                        stroke="rgba(255,255,255,0.55)" 
                                        stroke-width="1"/>
                                    <path d="M17 8 L18.2 12.2 L22.5 13.4 L18.2 14.6 L17 18.8 L15.8 14.6 L11.5 13.4 L15.8 12.2 Z" fill="rgba(255,255,255,0.9)"/>
                                </svg>
                            </div>

                            <!-- 拉出的 App 名称颜色面板 -->
                            <div class="app-name-panel" id="appNameColorPanel">
                                <div>
                                    <span class="panel-title mono-font">App Name Color</span>
                                    <span class="panel-sub mono-font">应用名称文字颜色</span>
                                </div>
                                <div class="name-color-dots">
                                    <div class="name-dot nd-white" id="ndWhite" title="白色" onclick="setAppNameColor('#FFFFFF', this)"></div>
                                    <div class="name-dot nd-black" id="ndBlack" title="黑色" onclick="setAppNameColor('#1E1E24', this)"></div>
                                    <div class="name-dot nd-gray" id="ndGray" title="灰色" onclick="setAppNameColor('#A1A1AA', this)"></div>
                                    <div class="name-dot nd-blue" id="ndBlue" title="蓝色" onclick="setAppNameColor('#74b9ff', this)"></div>
                                    <div class="name-dot nd-pink" id="ndPink" title="粉色" onclick="setAppNameColor('#ff7675', this)"></div>
                                    <div class="name-dot nd-custom" id="ndCustom" title="自定义颜色" onclick="triggerCustomAppNameColorPicker(event)">
                                        <input type="color" id="customAppNameColorInput" style="position:absolute; opacity:0; width:0; height:0;" onchange="applyCustomAppNameColor(this.value)">
                                    </div>
                                </div>
                                <div class="live-preview">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    <span class="txt" id="appNamePreviewText" style="color: #FFFFFF;">设置 Settings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-tag mono-font" style="margin-top: 8px;">Section 03 — Viewport Layout</div>
                <div class="setting-card">
                    <div class="setting-row viewport-toggle-row" onclick="toggleViewportPaddingPanel()">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">视口边距调整</span>
                                <span class="row-note mono-font">Viewport Padding (Top / Bottom)</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <div class="action-text-btn viewport-reset restore-btn" onclick="resetViewportPadding(event)" style="opacity:0.6;">Reset</div>
                            <svg id="viewportPanelArrow" class="viewport-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>
                    <div class="viewport-panel collapsed" id="viewportPaddingPanel">
                        <div class="viewport-panel-inner">
                            <div class="appicon-slider-head" style="font-size: 11px;">
                                <span class="modal-text">顶部距离 (Top)</span>
                                <span class="modal-text appicon-val" id="viewportTopVal">24px</span>
                            </div>
                            <input type="range" class="appicon-range" id="viewportTopRange" min="0" max="200" step="1" value="24" style="--p:30%"
                                oninput="previewViewportPadding('top', this.value, this)"
                                onchange="commitViewportPadding('top', this.value)">
                            <div class="appicon-slider-head" style="font-size: 11px; margin-top: 4px;">
                                <span class="modal-text">底部距离 (Bottom)</span>
                                <span class="modal-text appicon-val" id="viewportBottomVal">0px</span>
                            </div>
                            <input type="range" class="appicon-range" id="viewportBottomRange" min="0" max="200" step="1" value="0" style="--p:0%"
                                oninput="previewViewportPadding('bottom', this.value, this)"
                                onchange="commitViewportPadding('bottom', this.value)">
                        </div>
                    </div>
                </div>
                <div class="section-tag mono-font" style="margin-top: 8px;">Section 04b — Chat Font</div>
                <div class="setting-card">
                    <div class="setting-row" onclick="toggleChatFontPanel()">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><path d="M4 19 L9.5 5 L15 19"/><path d="M6.5 14 H12.5"/><path d="M17 9 V19"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">聊天字体</span>
                                <span class="row-note mono-font">Chat Font · 所有聊天统一使用</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg id="chatFontArrow" class="viewport-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>
                    <div class="viewport-panel collapsed" id="chatFontPanel">
                        <div class="viewport-panel-inner">
                            <div class="font-btn-row">
                                <label class="font-btn" for="chatFontFile">上传字体</label>
                                <button class="font-btn" type="button" onclick="toggleChatFontUrl()">用字体 URL</button>
                            </div>
                            <input type="file" id="chatFontFile" accept=".ttf,.otf,.woff,.woff2" style="position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;" onchange="onChatFontFile(this)">
                            <div id="chatFontUrlRow" style="display:none;">
                                <input class="api-input-field font-url-input" id="chatFontUrl" placeholder="https://example.com/font.woff2" oninput="onChatFontUrl(this.value)">
                            </div>
                            <button class="font-save-btn" id="chatFontSave" type="button" onclick="saveChatFontPreset()" style="display:none;">保存字体预设</button>
                            <div id="chatFontList" class="font-preset-list"></div>
                        </div>
                    </div>
                </div>
                <div class="section-tag mono-font" style="margin-top: 8px;">Section 04 — Home Icon</div>
                <div class="setting-card">
                    <div class="setting-row pwa-toggle-row" onclick="togglePwaIconPanel()">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 9v6M9 12h6"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">桌面图标（PWA）</span>
                                <span class="row-note mono-font">Home Screen Icon</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg id="pwaIconArrow" class="viewport-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>
                    <div class="viewport-panel collapsed" id="pwaIconPanel">
                        <div class="viewport-panel-inner">
                            <div class="pwa-grid" id="pwaIconGrid"></div>
                            <div class="pwa-hint mono-font">选择后请删除桌面旧图标，重新添加到主屏幕才会生效</div>
                            <input type="file" id="pwaIconUploadInput" accept="image/*" style="display:none;" onchange="handlePwaIconUpload(event)">
                        </div>
                    </div>
                </div>
            </div>

            <!-- 子面板：API -->
            <div class="settings-panel" id="settingsPanelApi">
                <div class="section-tag mono-font">API Gateway & Presets</div>
                <div class="setting-card" style="padding-top: 10px; padding-bottom: 14px;">
                    <div class="api-form-group">
                        <div>
                            <div class="field-label mono-font">Preset Name · 预设名称</div>
                            <div style="height:5px;"></div>
                            <input type="text" class="api-input-field" id="settingsPresetName" placeholder="例如：OpenAI 主力端点">
                        </div>
                        <div>
                            <div class="field-label mono-font">Endpoint URL · 接口地址</div>
                            <div style="height:5px;"></div>
                            <input type="text" class="api-input-field" id="settingsApiUrl" placeholder="https://api.openai.com/v1">
                        </div>
                        <div>
                            <div class="field-label mono-font">Secret Key · 密钥</div>
                            <div style="height:5px;"></div>
                            <input type="password" class="api-input-field" id="settingsApiKey" placeholder="sk-...">
                        </div>

                        <div class="api-action-buttons">
                            <button class="pill-btn mono-font" onclick="fetchSettingsModels(event)">
                                <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                <span class="txt">Fetch</span>
                            </button>
                            <button class="pill-btn primary mono-font" onclick="saveSettingsPreset()">
                                <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                <span class="txt">Save Preset</span>
                            </button>
                        </div>

                        <div class="model-select-wrapper" id="settingsModelSelectBox">
                            <div class="field-label mono-font">Select Model · 选模型</div>
                            <select class="model-dropdown" id="settingsModelDropdown">
                                <option value="" disabled selected>先点 Fetch 获取模型列表</option>
                            </select>
                        </div>

                        <div style="margin-top: 6px;">
                            <div class="field-label mono-font">Saved Presets · 已保存的预设</div>
                            <div class="presets-list-box" id="settingsPresetsListBox"></div>
                        </div>

                    </div>
                </div>
                <div class="section-tag mono-font" style="margin-top: 8px;">Model Tuning</div>
                <div class="setting-card">
                    <div class="setting-row" onclick="toggleApiTuningPanel()">
                        <div class="row-left">
                            <div class="row-icon-box">
                                <svg viewBox="0 0 24 24"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z"/></svg>
                            </div>
                            <div class="row-text-group">
                                <span class="row-label">温度与思考力度</span>
                                <span class="row-note mono-font">Temperature · Thinking</span>
                            </div>
                        </div>
                        <div class="row-right">
                            <svg id="apiTuningArrow" class="viewport-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>
                    <div class="viewport-panel collapsed" id="apiTuningPanel">
                        <div class="viewport-panel-inner">
                            <div class="tune-wrap">
                                <div class="tune-block">
                                    <div class="tune-head">
                                        <span class="tune-name">温度 <em>Temperature</em></span>
                                        <span class="tune-value" id="settingsTempValue">0.8</span>
                                    </div>
                                    <input type="range" class="tune-range" min="0" max="2" step="0.1" value="0.8" id="settingsTemp" style="--p:40%" oninput="tuneTempInput(this)">
                                    <div class="tune-hint"><span>严谨</span><span>发散</span></div>
                                </div>
                                <div class="tune-block">
                                    <div class="tune-head">
                                        <span class="tune-name">思考力度 <em>Thinking</em></span>
                                    </div>
                                    <div class="tune-seg" id="settingsThinkingSeg">
                                        <button type="button" data-val="" class="active" onclick="tuneThinkingPick('')">关</button>
                                        <button type="button" data-val="low" onclick="tuneThinkingPick('low')">低</button>
                                        <button type="button" data-val="medium" onclick="tuneThinkingPick('medium')">中</button>
                                        <button type="button" data-val="high" onclick="tuneThinkingPick('high')">高</button>
                                    </div>
                                    <input type="hidden" id="settingsThinking" value="">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- 底部 footer -->
        <div class="stage-footer mono-font">
            <span class="txt">NOIR OS</span>
            <span class="dot-sep"></span>
            <span class="txt">V 2.7.5</span>
            <span class="dot-sep"></span>
            <span class="txt">READY</span>
        </div>

        <!-- 左下角独立液态玻璃按钮组 -->
        <div class="bottom-left-controls">
            <div class="corner-preset-switcher" onclick="cycleSettingsPreset()" title="切换 API 预设">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="#fff">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <span class="switcher-text mono-font" id="settingsActivePresetBadge">Preset 1</span>
            </div>
            <div class="corner-bg-switcher" id="settingsBgCorner" onpointerdown="sbgPointerDown(event)" onpointerup="sbgPointerUp(event)" onpointerleave="sbgCancel()" onpointercancel="sbgCancel()" oncontextmenu="return false" title="单击切换背景 · 长按更多选项">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
            </div>
        </div>

    </div>
    `;
}

async function initSettingsApp() {
    settingsCurrentPanel = 'main';
    restoreActiveSettingsApi();
    const quickCruiseSwitch = document.getElementById('quickCruiseSwitch');
    if (quickCruiseSwitch && localStorage.getItem('whatever_quick_cruise_enabled_v1') === '1') quickCruiseSwitch.classList.add('active');
    renderSettingsPresetsList();
    updateSettingsActivePresetBadge();
    renderPwaIconGrid();

    if (typeof safeDB !== 'undefined') {
        const themeMode = await safeDB.load('settings_theme_mode', 'auto');
        const savedTheme = resolveThemeClass(themeMode);
        const savedBgIdx = await safeDB.load('settings_bg_index', 1);
        const savedAdaptive = await safeDB.load('enable_adaptive_contrast', true);
        const savedMode = await safeDB.load('icon_style_mode', 'dark');
        const savedCustomColor = await safeDB.load('custom_icon_color', '#ffffff');
        const savedFullscreen = await safeDB.load('settings_fullscreen', false);

        settingsCurrentBgIndex = savedBgIdx !== null ? savedBgIdx : 1;
        settingsCustomBg = await safeDB.load('settings_bg_custom', null);
        settingsMaskTransparency = await safeDB.load('settings_mask_transparency', null);
        enableAdaptiveContrast = savedAdaptive;
        window.enableAdaptiveContrast = enableAdaptiveContrast;
        currentIconStyleMode = savedMode || 'dark';

        // 1. 应用主题（统一入口，同时同步桌面、选项按钮和背景）
        applySettingsThemeClass(savedTheme, themeMode);

        // 2. 主题应用完毕后，再渲染背景及对应深浅遮罩
        applyCurrentSettingsBackground();

        // 3. 更新自适应开关状态
        const sw = document.getElementById('adaptiveContrastSwitch');
        if (sw) {
            if (enableAdaptiveContrast) sw.classList.add('active');
            else sw.classList.remove('active');
        }
        updateManualColorOptionsVisibility(enableAdaptiveContrast);
        updateIconDotsUI();

        // 4. 如果关闭了自适应检测，立即将保存的手动 SVG 样式应用到桌面容器
        if (!enableAdaptiveContrast) {
            applyIconStyleModeToContainer(currentIconStyleMode, savedCustomColor);
        }

        // 5. 加载保存的 App 名称颜色并同步预览与容器变量
        const savedAppNameColor = await safeDB.load('app_name_color', null);
        if (savedAppNameColor) {
            if (window.phoneContainer) {
                applyAppNameColorVar(savedAppNameColor);
            }
            const preview = document.getElementById('appNamePreviewText');
            if (preview) {
                preview.style.color = savedAppNameColor;
            }
            const colorMap = { '#FFFFFF': 'ndWhite', '#1E1E24': 'ndBlack', '#A1A1AA': 'ndGray', '#74b9ff': 'ndBlue', '#ff7675': 'ndPink' };
            const dotId = colorMap[savedAppNameColor.toUpperCase()] || colorMap[savedAppNameColor];
            if (dotId) {
                const dot = document.getElementById(dotId);
                if (dot) dot.classList.add('active');
            } else {
                const customDot = document.getElementById('ndCustom');
                if (customDot) {
                    customDot.classList.add('active');
                    customDot.style.background = savedAppNameColor;
                }
            }
        }

        // 5. 更新全屏开关状态
        syncFullscreenSwitch();
        const customAvatar = await safeDB.load('settings_avatar', null);
        const chatUserAvatar = await safeDB.load('chat_user_avatar', null) || await safeDB.load('user_avatar', null) || (window.userAvatar || window.chatUserAvatar || null);
        applySettingsAvatar(customAvatar || chatUserAvatar || null);

        // 6. 加载并应用保存的视口边距
        const savedVpTop = await safeDB.load('viewport_padding_top', 24);
        const savedVpBottom = await safeDB.load('viewport_padding_bottom', 0);
        applyViewportPadding(savedVpTop, savedVpBottom);
        const topRange = document.getElementById('viewportTopRange');
        const topValLabel = document.getElementById('viewportTopVal');
        if (topRange) {
            topRange.value = savedVpTop;
            topRange.style.setProperty('--p', ((savedVpTop - topRange.min) / (topRange.max - topRange.min) * 100) + '%');
        }
        if (topValLabel) topValLabel.innerText = savedVpTop + 'px';

        const botRange = document.getElementById('viewportBottomRange');
        const botValLabel = document.getElementById('viewportBottomVal');
        if (botRange) {
            botRange.value = savedVpBottom;
            botRange.style.setProperty('--p', ((savedVpBottom - botRange.min) / (botRange.max - botRange.min) * 100) + '%');
        }
        if (botValLabel) botValLabel.innerText = savedVpBottom + 'px';
    } else {
        applyCurrentSettingsBackground();
    }
}

let settingsCurrentPanel = 'main';
const DEFAULT_API_PRESETS = [
    { id: 1, name: '默认主线路', url: 'https://api.openai.com/v1', key: 'sk-proj-mockkey987654321', model: 'gpt-4o' },
    { id: 2, name: '备用中转站', url: 'https://api.deepseek.com/v1', key: 'sk-ds-abcdef123456', model: 'deepseek-v3' }
];
let settingsApiPresets = [];
const SETTINGS_PRESETS_KEY = 'forever_settings_api_presets_v1';

function settingsEsc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function loadSettingsApiPresets() {
    const raw = localStorage.getItem(SETTINGS_PRESETS_KEY);
    if (raw === null) { settingsApiPresets = DEFAULT_API_PRESETS.map(p => ({ ...p })); return; }
    try {
        const list = JSON.parse(raw || '[]');
        if (Array.isArray(list)) {
            settingsApiPresets = list
                .filter(p => p && p.name && p.url)
                .map(p => ({ id: p.id || Date.now() + Math.random(), name: String(p.name), url: String(p.url), key: String(p.key || ''), model: String(p.model || ''),
                    temperature: (typeof p.temperature === 'number' && isFinite(p.temperature)) ? p.temperature : 0.8,
                    thinking: ['low', 'medium', 'high'].includes(p.thinking) ? p.thinking : '' }));
        }
    } catch (e) { console.warn('[Settings API] 预设读取失败', e); }
}
/* 温度滑块：数值、滑过的颜色同步 */
function tuneTempInput(el) {
    const v = Number(el.value);
    const lbl = document.getElementById('settingsTempValue');
    if (lbl) lbl.textContent = v.toFixed(1);
    el.style.setProperty('--p', (v / 2 * 100) + '%');
}
/* 思考力度分段：点哪个就选哪个 */
function tuneThinkingPick(val) {
    const h = document.getElementById('settingsThinking');
    if (h) h.value = val;
    syncThinkingSeg(val);
}
function syncThinkingSeg(val) {
    document.querySelectorAll('#settingsThinkingSeg button').forEach(b => b.classList.toggle('active', b.dataset.val === (val || '')));
}
/* 温度与思考力度：读取表单 / 填回表单 */
function settingsTuningFromForm() {
    const t = document.getElementById('settingsTemp');
    const th = document.getElementById('settingsThinking');
    const temperature = t ? Math.max(0, Math.min(2, parseFloat(t.value) || 0)) : 0.8;
    const thinking = th && ['low', 'medium', 'high'].includes(th.value) ? th.value : '';
    return { temperature, thinking };
}
function settingsSetTuningForm(p) {
    const temperature = (p && typeof p.temperature === 'number' && isFinite(p.temperature)) ? p.temperature : 0.8;
    const thinking = p && ['low', 'medium', 'high'].includes(p.thinking) ? p.thinking : '';
    const t = document.getElementById('settingsTemp');
    const v = document.getElementById('settingsTempValue');
    const th = document.getElementById('settingsThinking');
    if (t) { t.value = String(temperature); t.style.setProperty('--p', (temperature / 2 * 100) + '%'); }
    if (v) v.textContent = temperature.toFixed(1);
    if (th) th.value = thinking;
    syncThinkingSeg(thinking);
}
/* 没有已保存的当前配置时，把表单填成当前预设（与原来的默认表单一致） */
function prefillSettingsForm(p) {
    if (!p) return;
    const name = document.getElementById('settingsPresetName');
    const url = document.getElementById('settingsApiUrl');
    const key = document.getElementById('settingsApiKey');
    if (name) name.value = p.name;
    if (url) url.value = p.url;
    if (key) key.value = p.key;
    ensureModelOption(document.getElementById('settingsModelDropdown'), p.model);
    settingsSetTuningForm(p);
}
function saveSettingsApiPresets() {
    try { localStorage.setItem(SETTINGS_PRESETS_KEY, JSON.stringify(settingsApiPresets)); }
    catch (e) { console.warn('[Settings API] 预设保存失败', e); }
}
/* 用真实返回的模型列表填充下拉框；保留当前已选的模型 */
function fillModelSelect(select, ids, selected) {
    if (!select) return;
    const list = [...new Set([...(selected ? [selected] : []), ...ids])];
    select.innerHTML = list.length
        ? list.map(id => `<option value="${settingsEsc(id)}">${settingsEsc(id)}</option>`).join('')
        : '<option value="" disabled selected>先点 Fetch 获取模型列表</option>';
    if (selected) select.value = selected;
}
function ensureModelOption(select, model) {
    if (!select || !model) return;
    if (![...select.options].some(o => o.value === model)) {
        const opt = document.createElement('option');
        opt.value = model;
        opt.textContent = model;
        select.appendChild(opt);
    }
    select.value = model;
}
/* 真正请求 {接口地址}/models，返回模型 id 列表 */
async function fetchModelsFromEndpoint(url, key) {
    const base = String(url || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    const secret = String(key || '').trim();
    if (!base) throw new Error('请先填写接口地址');
    if (!secret) throw new Error('请先填写密钥');
    let res;
    try {
        res = await fetch(base + '/models', { headers: { 'Authorization': 'Bearer ' + secret } });
    } catch (_) {
        throw new Error('连接失败：请检查接口地址和网络。若接口不允许浏览器跨域（CORS）访问，也会在这里失败');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data && data.error && (data.error.message || data.error);
        throw new Error(typeof msg === 'string' && msg ? msg : `请求失败 (${res.status})`);
    }
    const list = Array.isArray(data.data) ? data.data : (Array.isArray(data.models) ? data.models : []);
    const ids = [...new Set(list.map(m => (typeof m === 'string' ? m : (m && (m.id || m.name)))).filter(Boolean).map(String))].sort();
    if (!ids.length) throw new Error('接口返回的模型列表为空');
    return ids;
}
let settingsActivePresetIndex = 0;

function publishActiveSettingsApi(preset) {
    if (!preset) return;
    try {
        const payload = JSON.stringify({
            name: String(preset.name || ''), url: String(preset.url || '').trim(),
            key: String(preset.key || '').trim(), model: String(preset.model || '').trim(),
            temperature: (typeof preset.temperature === 'number' && isFinite(preset.temperature)) ? preset.temperature : 0.8,
            thinking: ['low', 'medium', 'high'].includes(preset.thinking) ? preset.thinking : '',
            updatedAt: Date.now()
        });
        localStorage.setItem('whatever_settings_active_api_v1', payload);
        localStorage.setItem('forever_settings_active_api_v1', payload);
    } catch (e) { console.warn('[Settings API] 无法同步 API 配置到聊天模块', e); }
}
function restoreActiveSettingsApi() {
    loadSettingsApiPresets();
    try {
        const saved = JSON.parse(localStorage.getItem('whatever_settings_active_api_v1') || localStorage.getItem('forever_settings_active_api_v1') || 'null');
        if (!saved || !saved.url || !saved.model) {
            const fallback = settingsApiPresets[settingsActivePresetIndex];
            prefillSettingsForm(fallback);
            if (fallback) publishActiveSettingsApi(fallback);
            return;
        }
        let idx = settingsApiPresets.findIndex(p => p.name === saved.name);
        if (idx < 0) {
            settingsApiPresets.unshift({ id: Date.now(), name: saved.name || '当前 API', url: saved.url, key: saved.key || '', model: saved.model });
            idx = 0;
        } else {
            Object.assign(settingsApiPresets[idx], { url: saved.url, key: saved.key || '', model: saved.model });
        }
        settingsActivePresetIndex = idx;
        const name = document.getElementById('settingsPresetName');
        const url = document.getElementById('settingsApiUrl');
        const key = document.getElementById('settingsApiKey');
        const model = document.getElementById('settingsModelDropdown');
        if (name) name.value = settingsApiPresets[idx].name;
        if (url) url.value = saved.url;
        if (key) key.value = saved.key || '';
        Object.assign(settingsApiPresets[idx], { temperature: saved.temperature, thinking: saved.thinking });
        settingsSetTuningForm(saved);
        ensureModelOption(model, saved.model);
        publishActiveSettingsApi(settingsApiPresets[idx]);
    } catch (e) { console.warn('[Settings API] 配置恢复失败', e); }
}

let appLibrary = [
    { id: 'chat', name: '信息', style: 'Line Art' },
    { id: 'weather', name: '天气', style: 'Line Art' },
    { id: 'gallery', name: '相册', style: 'Line Art' },
    { id: 'notes', name: '便签', style: 'Line Art' },
    { id: 'settings', name: '设置', style: 'Line Art' }
];

function switchSettingsPanel(panelName) {
    const title = document.getElementById('settingsNavTitle');
    const kicker = document.getElementById('settingsHeroKicker');
    const heroMain = document.getElementById('settingsHeroMain');
    const heroSub = document.getElementById('settingsHeroSub');
    const leftText = document.getElementById('settingsLeftText');

    document.querySelectorAll('.noir-settings-root .settings-panel').forEach(p => p.classList.remove('active'));

    if (panelName === 'appearance') {
        document.getElementById('settingsPanelAppearance').classList.add('active');
        title.innerText = 'APPEARANCE';
        kicker.innerText = 'Section 01';
        heroMain.innerHTML = 'Look &<br><strong>Feel</strong>';
        heroSub.innerText = '明暗模式 · 壁纸 · 图标库';
        leftText.innerText = 'BACK';
        settingsCurrentPanel = 'appearance';
    } else if (panelName === 'api') {
        document.getElementById('settingsPanelApi').classList.add('active');
        title.innerText = 'API HUB';
        kicker.innerText = 'Section 02';
        heroMain.innerHTML = 'Model<br><strong>Gateway</strong>';
        heroSub.innerText = '接口 · 密钥 · 预设管理';
        leftText.innerText = 'BACK';
        settingsCurrentPanel = 'api';
    } else {
        document.getElementById('settingsPanelMain').classList.add('active');
        title.innerText = 'SETTINGS';
        kicker.innerText = 'Control Center';
        heroMain.innerHTML = 'System<br><strong>Preferences</strong>';
        heroSub.innerText = '外观 · 接口 · 预设管理';
        leftText.innerText = 'HOME';
        settingsCurrentPanel = 'main';
    }
}

function handleSettingsBack() {
    if (settingsCurrentPanel !== 'main') {
        switchSettingsPanel('main');
    } else {
        closeApp();
    }
}

let settingsBackgrounds = [
    'assets/settings/设置背景.png',
    'assets/settings/设置背景2.png',
    'assets/settings/设置背景3.png',
    'assets/settings/设置背景4.png'
];
let settingsCurrentBgIndex = 1; // 默认：设置背景2.png

let enableAdaptiveContrast = true; // 默认开启
let currentIconStyleMode = 'dark'; // 默认深色

function updateManualColorOptionsVisibility(isAdaptive) {
    const container = document.getElementById('manualColorOptions');
    if (!container) return;
    if (isAdaptive) {
        container.classList.add('collapsed');
    } else {
        container.classList.remove('collapsed');
    }
}

async function toggleAdaptiveContrast() {
    const sw = document.getElementById('adaptiveContrastSwitch');
    if (!sw) return;
    sw.classList.toggle('active');
    enableAdaptiveContrast = sw.classList.contains('active');
    window.enableAdaptiveContrast = enableAdaptiveContrast;
    await safeDB.save('enable_adaptive_contrast', enableAdaptiveContrast);
    updateManualColorOptionsVisibility(enableAdaptiveContrast);
    if (!enableAdaptiveContrast) {
        applyIconStyleModeToContainer(currentIconStyleMode);
        // 展开后触发渐显提示：点击书签可设置 app 文字颜色
        setTimeout(() => {
            const toast = document.getElementById('appColorHintToast');
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 1800);
            }
        }, 400);
    } else {
        const panel = document.getElementById('appNameColorPanel');
        if (panel) panel.classList.remove('open');
        if (window.phoneContainer) {
            window.phoneContainer.classList.remove('force-dark', 'force-light', 'force-custom');
        }
        if (typeof updateAllElementsAdaptiveContrast === 'function') {
            updateAllElementsAdaptiveContrast();
        }
    }
}

function toggleAppNameColorPanel() {
    const panel = document.getElementById('appNameColorPanel');
    if (panel) {
        panel.classList.toggle('open');
    }
}

async function setAppNameColor(colorHex, dotEl = null) {
    if (dotEl) {
        document.querySelectorAll('.app-name-panel .name-dot').forEach(d => d.classList.remove('active'));
        dotEl.classList.add('active');
    }
    const preview = document.getElementById('appNamePreviewText');
    if (preview) {
        preview.style.color = colorHex;
    }
    if (window.phoneContainer) {
        applyAppNameColorVar(colorHex);
    }
    await safeDB.save('app_name_color', colorHex);
}

function triggerCustomAppNameColorPicker(e) {
    e.stopPropagation();
    const picker = document.getElementById('customAppNameColorInput');
    if (picker) picker.click();
}

async function applyCustomAppNameColor(colorHex) {
    const customDot = document.getElementById('ndCustom');
    if (customDot) {
        document.querySelectorAll('.app-name-panel .name-dot').forEach(d => d.classList.remove('active'));
        customDot.classList.add('active');
        customDot.style.background = colorHex;
    }
    const preview = document.getElementById('appNamePreviewText');
    if (preview) {
        preview.style.color = colorHex;
    }
    if (window.phoneContainer) {
        applyAppNameColorVar(colorHex);
    }
    await safeDB.save('app_name_color', colorHex);
}

async function setIconStyleMode(mode) {
    currentIconStyleMode = mode;
    await safeDB.save('icon_style_mode', mode);
    updateIconDotsUI();
    if (!enableAdaptiveContrast) {
        applyIconStyleModeToContainer(mode);
    }
}

function triggerCustomColorPicker(e) {
    e.stopPropagation();
    const picker = document.getElementById('customColorInput');
    if (picker) picker.click();
}

async function applyCustomIconColor(colorHex) {
    currentIconStyleMode = 'custom';
    await safeDB.save('icon_style_mode', 'custom');
    await safeDB.save('custom_icon_color', colorHex);
    updateIconDotsUI();
    if (!enableAdaptiveContrast) {
        applyIconStyleModeToContainer('custom', colorHex);
    }
}

function updateIconDotsUI() {
    document.querySelectorAll('.icon-dot').forEach(d => d.classList.remove('active'));
    if (currentIconStyleMode === 'dark') {
        const dot = document.getElementById('dotDark');
        if (dot) dot.classList.add('active');
    } else if (currentIconStyleMode === 'light') {
        const dot = document.getElementById('dotLight');
        if (dot) dot.classList.add('active');
    } else if (currentIconStyleMode === 'custom') {
        const dot = document.getElementById('dotCustom');
        if (dot) dot.classList.add('active');
    }
}

function applyIconStyleModeToContainer(mode, customColor = null) {
    if (!window.phoneContainer) return;
    window.phoneContainer.classList.remove('force-dark', 'force-light', 'force-custom');
    if (mode === 'dark') {
        window.phoneContainer.classList.add('force-dark');
    } else if (mode === 'light') {
        window.phoneContainer.classList.add('force-light');
    } else if (mode === 'custom') {
        window.phoneContainer.classList.add('force-custom');
        if (customColor) {
            window.phoneContainer.style.setProperty('--custom-icon-color', customColor);
        }
    }
}

async function cycleSettingsBackground() {
    settingsCurrentBgIndex = (settingsCurrentBgIndex + 1) % settingsBackgrounds.length;
    settingsCustomBg = null;
    await safeDB.save('settings_bg_custom', null);
    await safeDB.save('settings_bg_index', settingsCurrentBgIndex);
    applyCurrentSettingsBackground();
}

// 设置背景：自定义图片 > 内置四张；遮罩透明度有值就用它，没有则用日夜默认
let settingsCustomBg = null;
let settingsMaskTransparency = null;

// 预加载内置设置背景图，避免切换或打开时闪烁
(function preloadSettingsBgs() {
    settingsBackgrounds.forEach(src => {
        const img = new Image();
        img.src = cssWallpaperUrl(src);
    });
})();

function applyCurrentSettingsBackground() {
    const root = document.getElementById('noirSettingsRoot');
    if (!root) return;
    const bgPath = settingsCustomBg || settingsBackgrounds[settingsCurrentBgIndex] || 'assets/settings/设置背景.png';
    const isLight = root.classList.contains('theme-light');
    const hasMask = settingsMaskTransparency !== null && settingsMaskTransparency !== undefined;
    const alpha = hasMask ? (1 - settingsMaskTransparency / 100) : (isLight ? 0.6 : 0.55);
    const rgb = isLight ? '255, 255, 255' : '6, 6, 8';
    const overlay = `linear-gradient(rgba(${rgb}, ${alpha.toFixed(2)}), rgba(${rgb}, ${alpha.toFixed(2)}))`;
    const nextBg = `${overlay}, url('${cssWallpaperUrl(bgPath)}')`;
    if (root.dataset.appliedBg === nextBg) return;
    root.dataset.appliedBg = nextBg;
    root.style.backgroundImage = nextBg;
    root.style.backgroundSize = 'cover';
    root.style.backgroundPosition = 'center';
}

function resolveThemeClass(mode) {
    if (mode === 'light') return 'theme-light';
    if (mode === 'dark') return 'theme-dark';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'theme-light' : 'theme-dark';
}

// 只负责把主题画出来：设置根节点、信息样式弹窗、Dark/Light/System 选项、桌面、背景
function applySettingsThemeClass(targetThemeClass, mode = 'auto') {
    const root = document.getElementById('noirSettingsRoot');
    // 桌面的类名在下面才改，所以壁纸默认图要在改完类名后再写
    if (root) {
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(targetThemeClass);
    }

    const chatRoot = document.getElementById('chatStyleModalRoot');
    if (chatRoot) {
        chatRoot.classList.remove('theme-light', 'theme-dark');
        chatRoot.classList.add(targetThemeClass);
    }

    const activeText = mode === 'auto' ? 'system' : (targetThemeClass === 'theme-light' ? 'light' : 'dark');
    document.querySelectorAll('.noir-settings-root .theme-seg-picker .seg-pill').forEach(p => {
        p.classList.toggle('active', p.textContent.trim().toLowerCase() === activeText);
    });

    const pc = document.getElementById('phoneContainer');
    if (pc) {
        pc.classList.remove('theme-light', 'theme-dark');
        pc.classList.add(targetThemeClass);
    }
    writeDesktopWallpaperVar();
    if (typeof updateDesktopWallpaperByTheme === 'function') {
        updateDesktopWallpaperByTheme();
    }

    applyCurrentSettingsBackground();
}

// 用户手动选择（设置页选项 或 弹窗按钮）：会保存
async function setSettingsThemeMode(mode, el) {
    const targetThemeClass = resolveThemeClass(mode);
    applySettingsThemeClass(targetThemeClass, mode);

    // 第一次切换到浅色：背景改为 设置背景.png，之后保留用户的选择
    if (targetThemeClass === 'theme-light') {
        const alreadySwitched = await safeDB.load('settings_bg_light_switched', false);
        if (!alreadySwitched) {
            settingsCurrentBgIndex = 0;
            await safeDB.save('settings_bg_index', 0);
            await safeDB.save('settings_bg_light_switched', true);
            applyCurrentSettingsBackground();
        }
    }

    await safeDB.save('settings_theme_mode', mode);
    await safeDB.save('theme', targetThemeClass);
}

// 没有手动选择过（模式为 auto）时，跟随系统的日夜间
async function followSystemThemeIfAuto() {
    const mode = await safeDB.load('settings_theme_mode', 'auto');
    if (mode !== 'auto') return;
    const t = resolveThemeClass('auto');
    applySettingsThemeClass(t, 'auto');
    await safeDB.save('theme', t);
}

// 弹窗右上角的日夜切换按钮
let settingsModalRerender = null;

// ---------- 弹窗主题（与设置页、系统分开；未手动设置则跟随系统） ----------
async function resolvePopupThemeClass() {
    const mode = await safeDB.load('popup_theme_mode', 'auto');
    if (mode === 'light') return 'theme-light';
    if (mode === 'dark') return 'theme-dark';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'theme-light' : 'theme-dark';
}

// 所有弹窗共用一个独立容器；它自带 theme-light / theme-dark，互不影响设置页
function ensurePopupShell(themeClass) {
    const host = document.getElementById('phoneContainer') || document.body;
    let shell = document.getElementById('settingsPopupShell');
    if (!shell) {
        shell = document.createElement('div');
        shell.id = 'settingsPopupShell';
        shell.className = 'noir-settings-root';
        shell.style.cssText = 'position:absolute; inset:0; z-index:9000; background:transparent; padding:0; display:block; pointer-events:none;';
        shell.innerHTML = `
            <div class="modal-backdrop" onclick="closeCenterModal()"></div>
            <div class="ios-center-modal" id="settingsCenterModal">
                <div class="center-modal-header">
                    <div class="sheet-title-group">
                        <svg viewBox="0 0 24 24" id="settingsModalSvg">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                        </svg>
                        <div>
                            <span class="sheet-title" id="settingsModalTitle"></span>
                            <span class="sheet-subtitle mono-font" id="settingsModalSubtitle"></span>
                        </div>
                    </div>
                    <div class="sheet-header-actions">
                        <button class="sheet-close-btn sheet-theme-btn" onclick="toggleSettingsThemeFromModal(event)" title="切换日夜间">
                            <svg class="icon-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
                            <svg class="icon-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
                        </button>
                        <button class="sheet-close-btn" onclick="closeCenterModal()">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                <div class="center-modal-body" id="settingsModalBody"></div>
            </div>
            <div class="popup-floating-footer" id="settingsModalFooter"></div>
        `;
        host.appendChild(shell);
    }
    shell.classList.remove('theme-light', 'theme-dark');
    shell.classList.add(themeClass);
    shell.classList.add('center-modal-open');
    // 每次打开弹窗先隐藏底部按钮，需要的弹窗自己再显示
    const footer = document.getElementById('settingsModalFooter');
    if (footer) { footer.style.display = 'none'; footer.innerHTML = ''; }
    return shell;
}

// 弹窗右上角按钮：只切换弹窗自己的日夜，并保存
async function toggleSettingsThemeFromModal(e) {
    if (e) e.stopPropagation();
    const shell = document.getElementById('settingsPopupShell');
    const isLight = shell && shell.classList.contains('theme-light');
    await safeDB.save('popup_theme_mode', isLight ? 'dark' : 'light');
    if (typeof settingsModalRerender === 'function') {
        await settingsModalRerender();
    }
}

// 系统日夜间变化时：弹窗若仍处于“跟随系统”，就重新渲染
async function refreshPopupIfAuto() {
    const shell = document.getElementById('settingsPopupShell');
    if (!shell || !shell.classList.contains('center-modal-open')) return;
    const mode = await safeDB.load('popup_theme_mode', 'auto');
    if (mode === 'auto' && typeof settingsModalRerender === 'function') {
        await settingsModalRerender();
    }
}

async function showSettingsThemeTip(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    settingsModalRerender = () => showSettingsThemeTip(null);
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = 'Notice';
    subtitle.innerText = '外观提示';
    body.innerHTML = `
        <div class="tip-modal-content">（桌面默认布置也会变喔）</div>
        <button class="tip-modal-btn mono-font" onclick="closeCenterModal()">Got it</button>
    `;
}

function isFullscreenNow() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

// 开关 = 真实的全屏状态；退出全屏（Esc、浏览器按钮等）时开关自动弹回
function syncFullscreenSwitch() {
    const sw = document.getElementById('settingsFullscreenSwitch');
    const on = isFullscreenNow();
    if (sw) sw.classList.toggle('active', on);
    if (on) markFullscreenArmed();
    safeDB.save('settings_fullscreen', on);
}

function toggleSettingsFullscreen() {
    const docEl = document.documentElement;
    if (!isFullscreenNow()) {
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
        if (req) {
            const p = req.call(docEl);
            if (p && p.catch) p.catch(() => {});
        }
    } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) {
            const p = exit.call(document);
            if (p && p.catch) p.catch(() => {});
        }
    }
}

document.addEventListener('fullscreenchange', syncFullscreenSwitch);
document.addEventListener('webkitfullscreenchange', syncFullscreenSwitch);

// ---------- 全屏记忆：第一次进入全屏后记住；之后每次退出全屏，任意位置点击都会重新进入 ----------
const FS_ARMED_KEY = 'forever_fullscreen_armed_v1';
let fullscreenArmed = (() => { try { return localStorage.getItem(FS_ARMED_KEY) === '1'; } catch (_) { return false; } })();
function markFullscreenArmed() {
    if (fullscreenArmed) return;
    fullscreenArmed = true;
    try { localStorage.setItem(FS_ARMED_KEY, '1'); } catch (_) {}
}
function requestAppFullscreen() {
    const docEl = document.documentElement;
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (!req) return;
    const p = req.call(docEl);
    if (p && p.catch) p.catch(() => {});
}
// 退出全屏后，点击任意位置回到全屏（默认一直开启，不需要设置；进入过一次全屏之后生效）
document.addEventListener('click', () => {
    if (!fullscreenArmed || isFullscreenNow()) return;
    requestAppFullscreen();
}, true);

// ---------- 桌面壁纸（只影响桌面，用 DB 保存） ----------
// ---------- 桌面壁纸：自己上传 > 内置选择 > 跟随系统 ----------
const BUILTIN_WALLPAPER_FOLDER = { dark: '内置壁纸暗', light: '内置壁纸亮' };
const BUILTIN_WALLPAPER_NAME = { dark: '暗', light: '亮' };

function builtinWallpaperSrc(set, index) {
    return `assets/${BUILTIN_WALLPAPER_FOLDER[set]}/${BUILTIN_WALLPAPER_NAME[set]}${index}.png`;
}

function systemWallpaperSrc() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
        ? 'assets/Light/bizhi.png'
        : 'assets/Dark/bizhi.png';
}

function cssWallpaperUrl(src) {
    return src.startsWith('data:') ? src : encodeURI(src);
}

// 只决定壁纸并写到桌面容器上（不重新渲染）
// 写入桌面壁纸：选中的图 -> 当前日夜的默认图（两种路径都写，哪个能读就用哪个）-> 纯色
// 加载失败的那一层会被浏览器跳过，所以不会变成全黑
function writeDesktopWallpaperVar() {
    const pc = document.getElementById('phoneContainer');
    if (!pc) return;
    const isLight = pc.classList.contains('theme-light');
    const themeName = isLight ? 'Light' : 'Dark';
    const fallbackColor = isLight ? '#FCFAFB' : '#09090b';
    const layers = [];
    if (window.currentDesktopWallpaperSrc) {
        const s = window.currentDesktopWallpaperSrc;
        if (s.startsWith('data:')) {
            layers.push(`url('${s}') no-repeat center center / cover`);
        } else {
            // 两种路径都写：样式表里的 url() 可能按 css 目录解析
            const u = cssWallpaperUrl(s);
            layers.push(`url('${u}') no-repeat center center / cover`);
            layers.push(`url('../${u}') no-repeat center center / cover`);
        }
    }
    layers.push(`url('assets/${themeName}/bizhi.png') no-repeat center center / cover`);
    layers.push(`url('../assets/${themeName}/bizhi.png') no-repeat center center / cover`);
    pc.style.setProperty('--wallpaper-bg', `${layers.join(', ')}, ${fallbackColor}`);
    pc.style.backgroundImage = '';
    pc.style.backgroundSize = '';
    pc.style.backgroundPosition = '';
    pc.style.backgroundRepeat = '';
}

async function resolveDesktopWallpaper() {
    const custom = await safeDB.load('desktop_wallpaper', null);
    const builtin = await safeDB.load('builtin_wallpaper', null);
    let src = null;
    if (custom) {
        src = custom;
    } else if (builtin && builtin.set && builtin.index) {
        src = builtinWallpaperSrc(builtin.set, builtin.index);
    }
    window.currentDesktopWallpaperSrc = src;
    writeDesktopWallpaperVar();
    return src;
}

// 决定壁纸并刷新桌面（取色、图标）
async function applyDesktopWallpaper() {
    await resolveDesktopWallpaper();
    if (typeof updateDesktopWallpaperByTheme === 'function') {
        updateDesktopWallpaperByTheme();
    }
}

// ---------- 切换壁纸按钮（设置背景）：长按出方框；短按打开遮罩透明度 ----------
let sbgTimer = null;
let sbgLong = false;

function sbgPointerDown(e) {
    sbgLong = false;
    const el = e.currentTarget;
    clearTimeout(sbgTimer);
    sbgTimer = setTimeout(() => {
        sbgLong = true;
        openSettingsBgMorph(el);
    }, 450);
}

function sbgPointerUp(e) {
    clearTimeout(sbgTimer);
    if (!sbgLong) cycleSettingsBackground();
}

function sbgCancel() {
    clearTimeout(sbgTimer);
}

function openSettingsBgMorph(trigger) {
    const root = document.getElementById('noirSettingsRoot');
    closeWallpaperMorph(true);
    closeSettingsBgMorph(true);

    const rr = root.getBoundingClientRect();
    const tr = trigger.getBoundingClientRect();
    const W = 200, H = 124;
    const startLeft = tr.left - rr.left;
    const startTop = tr.top - rr.top;
    const endLeft = Math.max(12, Math.min(tr.left - rr.left, rr.width - W - 12));
    const endTop = Math.max(12, tr.top - rr.top - H - 8);

    const menu = document.createElement('div');
    menu.id = 'settingsBgMorph';
    menu.className = 'wp-morph sb-morph';
    menu.style.left = startLeft + 'px';
    menu.style.top = startTop + 'px';
    menu.style.width = tr.width + 'px';
    menu.style.height = tr.height + 'px';
    menu.innerHTML = `
        <div class="sb-grid">
            <div class="wp-morph-item" onclick="settingsBgChooseBuiltin(event)">内置</div>
            <div class="wp-morph-item" onclick="settingsBgPickUpload(event)">自己上传</div>
            <div class="wp-morph-item" onclick="settingsBgOpenMask(event)">遮罩透明度</div>
            <div class="wp-morph-item" onclick="settingsBgRestore(event)">还原</div>
        </div>
    `;
    root.appendChild(menu);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        menu.style.left = endLeft + 'px';
        menu.style.top = endTop + 'px';
        menu.style.width = W + 'px';
        menu.style.height = H + 'px';
        menu.classList.add('open');
    }));

    setTimeout(() => document.addEventListener('pointerdown', outsideSettingsBgMorph), 0);
}

function outsideSettingsBgMorph(ev) {
    const menu = document.getElementById('settingsBgMorph');
    if (!menu) {
        document.removeEventListener('pointerdown', outsideSettingsBgMorph);
        return;
    }
    if (!menu.contains(ev.target) && !ev.target.closest('#settingsBgCorner')) {
        closeSettingsBgMorph();
    }
}

function closeSettingsBgMorph(immediate = false) {
    document.removeEventListener('pointerdown', outsideSettingsBgMorph);
    const menu = document.getElementById('settingsBgMorph');
    if (!menu) return;
    if (immediate) {
        menu.remove();
        return;
    }
    menu.classList.remove('open');
    menu.style.opacity = '0';
    setTimeout(() => menu.remove(), 260);
}

function settingsBgChooseBuiltin(e) {
    e.stopPropagation();
    closeSettingsBgMorph(true);
    openSettingsBgBuiltinPopup();
}

function settingsBgOpenMask(e) {
    e.stopPropagation();
    closeSettingsBgMorph(true);
    openSettingsBgMaskPopup();
}

// 方框里的“还原”：只还原并提示，不改弹窗
async function settingsBgRestore(e) {
    e.stopPropagation();
    closeSettingsBgMorph(true);
    await restoreSettingsBgQuiet();
}

function settingsBgPickUpload(e) {
    e.stopPropagation();
    closeSettingsBgMorph(true);
    document.getElementById('settingsBgInput').click();
}

async function handleSettingsBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        settingsCustomBg = evt.target.result;
        await safeDB.save('settings_bg_custom', settingsCustomBg);
        applyCurrentSettingsBackground();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

// 内置设置背景：四张，选中即应用
async function openSettingsBgBuiltinPopup() {
    settingsModalRerender = () => openSettingsBgBuiltinPopup();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = 'Background';
    subtitle.innerText = '设置背景 · 内置';
    body.style.maxHeight = 'none';

    body.innerHTML = `
        <div class="bw-grid">
            ${settingsBackgrounds.map((src, i) => `
                <div class="bw-thumb ${!settingsCustomBg && settingsCurrentBgIndex === i ? 'selected' : ''}" onclick="selectSettingsBgBuiltin(${i})">
                    <img src="${encodeURI(src)}" alt="${i + 1}" onerror="this.style.visibility='hidden'">
                    <span class="bw-num">${i + 1}</span>
                </div>`).join('')}
        </div>
    `;
}

async function selectSettingsBgBuiltin(i) {
    settingsCurrentBgIndex = i;
    settingsCustomBg = null;
    await safeDB.save('settings_bg_custom', null);
    await safeDB.save('settings_bg_index', i);
    applyCurrentSettingsBackground();
    await openSettingsBgBuiltinPopup();
}

// 遮罩透明度：滑条 + 还原
async function openSettingsBgMaskPopup() {
    settingsModalRerender = () => openSettingsBgMaskPopup();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = 'Mask';
    subtitle.innerText = '设置背景遮罩透明度';
    body.style.maxHeight = 'none';

    const isLight = themeClass === 'theme-light';
    const defaultTrans = isLight ? 40 : 45;
    const val = settingsMaskTransparency !== null && settingsMaskTransparency !== undefined ? settingsMaskTransparency : defaultTrans;

    body.innerHTML = `
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">遮罩透明度</span>
                <span class="modal-text appicon-val" id="mask-val">${val}%</span>
            </div>
            <input type="range" class="appicon-range" min="0" max="100" step="1" value="${val}" style="--p:${val}%"
                oninput="previewSettingsMask(this.value, this)"
                onchange="commitSettingsMask(this.value)">
        </div>
        <div class="bw-more restore-btn" onclick="restoreSettingsBg()">还原</div>
    `;
}

function previewSettingsMask(val, el) {
    const label = document.getElementById('mask-val');
    if (label) label.innerText = val + '%';
    if (el) el.style.setProperty('--p', val + '%');
    settingsMaskTransparency = parseFloat(val);
    applyCurrentSettingsBackground();
}

async function commitSettingsMask(val) {
    settingsMaskTransparency = parseFloat(val);
    await safeDB.save('settings_mask_transparency', settingsMaskTransparency);
}

// 还原：遮罩、背景图片都回到默认（不改弹窗）
async function restoreSettingsBgQuiet() {
    settingsMaskTransparency = null;
    settingsCustomBg = null;
    settingsCurrentBgIndex = 1;
    await safeDB.save('settings_mask_transparency', null);
    await safeDB.save('settings_bg_custom', null);
    await safeDB.save('settings_bg_index', 1);
    applyCurrentSettingsBackground();
    showCapsuleTip('已还原');
}

// 还原（遮罩弹窗里的按钮）
async function restoreSettingsBg() {
    await restoreSettingsBgQuiet();
    await openSettingsBgMaskPopup();
}

// 点击“Change”：从按钮处展开一个圆角方框，里面有“内置 / 自己上传”
function openWallpaperMorph(e) {
    e.stopPropagation();
    const root = document.getElementById('noirSettingsRoot');
    const trigger = e.currentTarget;
    closeWallpaperMorph(true);

    const rr = root.getBoundingClientRect();
    const tr = trigger.getBoundingClientRect();
    const W = 168, H = 104;
    const startLeft = tr.left - rr.left;
    const startTop = tr.top - rr.top;
    const endLeft = Math.max(12, Math.min(tr.right - rr.left - W, rr.width - W - 12));
    const endTop = tr.bottom - rr.top + 8;

    const menu = document.createElement('div');
    menu.id = 'wallpaperMorph';
    menu.className = 'wp-morph';
    menu.style.left = startLeft + 'px';
    menu.style.top = startTop + 'px';
    menu.style.width = tr.width + 'px';
    menu.style.height = tr.height + 'px';
    menu.innerHTML = `
        <div class="wp-morph-item" onclick="chooseBuiltinWallpaper(event)">内置</div>
        <div class="wp-morph-item" onclick="pickCustomWallpaper(event)">自己上传</div>
    `;
    root.appendChild(menu);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        menu.style.left = endLeft + 'px';
        menu.style.top = endTop + 'px';
        menu.style.width = W + 'px';
        menu.style.height = H + 'px';
        menu.classList.add('open');
    }));

    setTimeout(() => document.addEventListener('pointerdown', outsideWallpaperMorph), 0);
}

function outsideWallpaperMorph(ev) {
    const menu = document.getElementById('wallpaperMorph');
    if (!menu) {
        document.removeEventListener('pointerdown', outsideWallpaperMorph);
        return;
    }
    if (!menu.contains(ev.target) && ev.target.id !== 'wallpaperTrigger') {
        closeWallpaperMorph();
    }
}

function closeWallpaperMorph(immediate = false) {
    document.removeEventListener('pointerdown', outsideWallpaperMorph);
    const menu = document.getElementById('wallpaperMorph');
    if (!menu) return;
    if (immediate) {
        menu.remove();
        return;
    }
    menu.classList.remove('open');
    menu.style.opacity = '0';
    setTimeout(() => menu.remove(), 260);
}

async function chooseBuiltinWallpaper(e) {
    e.stopPropagation();
    closeWallpaperMorph(true);
    await openBuiltinWallpaperPopup();
}

// 内置壁纸弹窗的界面状态：当前是暗色还是亮色、当前是第几批（每批 3 张）
let bwUi = { mode: 'dark', batch: 0 };

// 内置壁纸弹窗：顶部“跟随系统”横条开关；暗/亮分段；每次三张，换一批
async function openBuiltinWallpaperPopup() {
    settingsModalRerender = () => openBuiltinWallpaperPopup();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = 'Wallpaper';
    subtitle.innerText = '内置壁纸';
    body.style.maxHeight = 'none';

    const cur = await safeDB.load('builtin_wallpaper', null);
    const custom = await safeDB.load('desktop_wallpaper', null);
    const isSel = (set, i) => !custom && cur && cur.set === set && cur.index === i;
    const followOn = !custom && !cur;

    const first = bwUi.batch * 3 + 1;
    const thumbs = [first, first + 1, first + 2].map(i => `
        <div class="bw-thumb ${isSel(bwUi.mode, i) ? 'selected' : ''}" onclick="selectBuiltinWallpaper('${bwUi.mode}', ${i})">
            <img src="${encodeURI(builtinWallpaperSrc(bwUi.mode, i))}" alt="${i}" onerror="this.style.visibility='hidden'">
            <span class="bw-num">${i}</span>
        </div>`).join('');

    body.innerHTML = `
        <div class="bw-switch-bar" onclick="toggleFollowSystemWallpaper()">
            <span class="modal-text bw-switch-label">跟随系统壁纸</span>
            <div class="bw-switch ${followOn ? 'on' : ''}"><div class="bw-knob"></div></div>
        </div>
        <div class="bw-seg">
            <div class="bw-seg-item ${bwUi.mode === 'dark' ? 'active' : ''}" onclick="setBwMode('dark')">暗色</div>
            <div class="bw-seg-item ${bwUi.mode === 'light' ? 'active' : ''}" onclick="setBwMode('light')">亮色</div>
        </div>
        <div class="bw-row3">${thumbs}</div>
        <div class="bw-more" onclick="nextBwBatch()">换一批 ›</div>
    `;
}

function setBwMode(mode) {
    bwUi.mode = mode;
    bwUi.batch = 0;
    openBuiltinWallpaperPopup();
}

function nextBwBatch() {
    bwUi.batch = (bwUi.batch + 1) % 2;
    openBuiltinWallpaperPopup();
}

// 开关：开 = 跟随系统；关 = 使用当前这一批的第一张
async function toggleFollowSystemWallpaper() {
    const cur = await safeDB.load('builtin_wallpaper', null);
    const custom = await safeDB.load('desktop_wallpaper', null);
    const followOn = !custom && !cur;
    if (followOn) {
        await selectBuiltinWallpaper(bwUi.mode, bwUi.batch * 3 + 1);
    } else {
        await followSystemWallpaper();
    }
}

async function selectBuiltinWallpaper(set, index) {
    await safeDB.save('builtin_wallpaper', { set, index });
    await safeDB.save('desktop_wallpaper', null);
    await applyDesktopWallpaper();
    await openBuiltinWallpaperPopup();
}

async function followSystemWallpaper() {
    await safeDB.save('builtin_wallpaper', null);
    await safeDB.save('desktop_wallpaper', null);
    await applyDesktopWallpaper();
    await openBuiltinWallpaperPopup();
}

// 恢复默认：桌面壁纸回到内置（随日夜变化）
async function resetDesktopWallpaper() {
    await safeDB.save('desktop_wallpaper', null);
    await safeDB.save('builtin_wallpaper', null);
    await applyDesktopWallpaper();
    alert('已恢复默认壁纸！');
}

function pickCustomWallpaper(e) {
    e.stopPropagation();
    closeWallpaperMorph(true);
    document.getElementById('desktopWallpaperInput').click();
}

function handleDesktopWallpaperUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const dataUrl = evt.target.result;
        await safeDB.save('builtin_wallpaper', null);
        await safeDB.save('desktop_wallpaper', dataUrl);
        await applyDesktopWallpaper();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

async function fetchSettingsModels(e) {
    const btn = e.currentTarget;
    const original = btn.innerHTML;
    const url = document.getElementById('settingsApiUrl').value;
    const key = document.getElementById('settingsApiKey').value;
    const select = document.getElementById('settingsModelDropdown');
    btn.disabled = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" style="animation: spin 0.9s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span class="txt">Fetching...</span>`;
    try {
        const ids = await fetchModelsFromEndpoint(url, key);
        fillModelSelect(select, ids, select.value);
        document.getElementById('settingsModelSelectBox').classList.add('show');
    } catch (err) {
        showSettingsToast((err && err.message) || '获取模型列表失败');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

async function fetchPresetModels(id) {
    const url = document.getElementById(`edit-url-${id}`).value;
    const key = document.getElementById(`edit-key-${id}`).value;
    const select = document.getElementById(`edit-model-${id}`);
    try {
        const ids = await fetchModelsFromEndpoint(url, key);
        fillModelSelect(select, ids, select.value);
    } catch (err) {
        showSettingsToast((err && err.message) || '获取模型列表失败');
    }
}

/* 设置保存提示：非阻塞小条，几秒后自动消失（不用 alert，全屏下 alert 会卡住页面） */
function showSettingsToast(text) {
    const old = document.getElementById('settingsToast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'settingsToast';
    el.textContent = String(text || '');
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 110px);transform:translateX(-50%);max-width:86%;height:30px;padding:0 16px;box-sizing:border-box;border-radius:999px;background:#000;color:#fff;font-size:12px;line-height:30px;white-space:nowrap;text-align:center;z-index:99999;pointer-events:none;opacity:0;transition:opacity .25s ease;';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 260); }, 1800);
}

function saveSettingsPreset() {
    const name = document.getElementById('settingsPresetName').value.trim();
    const url = document.getElementById('settingsApiUrl').value.trim();
    const key = document.getElementById('settingsApiKey').value.trim();
    const model = document.getElementById('settingsModelDropdown').value;
    const tune = settingsTuningFromForm();

    if (!name || !url || !key) {
        showSettingsToast('预设名称、URL 和 Key 都要填完整');
        return;
    }
    if (!model) {
        showSettingsToast('请先点 Fetch 获取模型列表，并选择一个模型');
        return;
    }

    const existing = settingsApiPresets.find(p => p.name === name);
    if (existing) {
        existing.url = url;
        existing.key = key;
        existing.model = model;
        Object.assign(existing, tune);
        showSettingsToast(`预设 "${name}" 已更新！`);
    } else {
        settingsApiPresets.push({ id: Date.now(), name, url, key, model, ...tune });
        showSettingsToast(`新预设 "${name}" 保存成功！`);
    }

    settingsActivePresetIndex = settingsApiPresets.findIndex(p => p.name === name);
    publishActiveSettingsApi(settingsApiPresets[settingsActivePresetIndex]);
    saveSettingsApiPresets();
    renderSettingsPresetsList();
    updateSettingsActivePresetBadge();
}

function renderSettingsPresetsList() {
    const box = document.getElementById('settingsPresetsListBox');
    if (!box) return;
    box.innerHTML = '';

    settingsApiPresets.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'preset-accordion-item';
        item.id = `settings-preset-item-${p.id}`;
        item.innerHTML = `
            <div class="preset-accordion-header" onclick="toggleSettingsPresetExpand(${p.id})">
                <div class="preset-title-wrap">
                    <svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    <span class="preset-name-text">${p.name}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    ${idx === settingsActivePresetIndex ? '<span class="preset-tag-badge mono-font" style="background:#ffffff; color:#000000;" id="settingsActiveTagBadge">Active</span>' : ''}
                    <span class="preset-tag-badge mono-font">Edit</span>
                </div>
            </div>
            <div class="preset-accordion-body">
                <div class="preset-edit-inner">
                    <input type="text" class="preset-edit-input" id="edit-name-${p.id}" value="${p.name}" placeholder="预设名">
                    <input type="text" class="preset-edit-input" id="edit-url-${p.id}" value="${p.url}" placeholder="URL">
                    <input type="password" class="preset-edit-input" id="edit-key-${p.id}" value="${p.key}" placeholder="Key">
                    
                    <div style="margin-top:2px;">
                        <div class="field-label mono-font" style="font-size:7.5px;">Model · 模型</div>
                        <select class="model-dropdown" id="edit-model-${p.id}" style="margin-top:3px; padding:6px 10px; font-size:11px;">
                            ${p.model ? `<option value="${settingsEsc(p.model)}" selected>${settingsEsc(p.model)}</option>` : '<option value="" disabled selected>先点 Fetch 获取模型列表</option>'}
                        </select>
                    </div>

                    <div class="preset-edit-row-btns">
                        <button class="preset-sub-btn mono-font" onclick="fetchPresetModels(${p.id})">Fetch</button>
                        <button class="preset-sub-btn primary mono-font" onclick="updateSettingsPresetData(${p.id})">Update</button>
                    </div>
                </div>
            </div>
        `;
        box.appendChild(item);
    });
}

function toggleSettingsPresetExpand(id) {
    const el = document.getElementById(`settings-preset-item-${id}`);
    document.querySelectorAll('.noir-settings-root .preset-accordion-item').forEach(node => {
        if (node !== el) node.classList.remove('expanded');
    });
    el.classList.toggle('expanded');
}

function updateSettingsPresetData(id) {
    const name = document.getElementById(`edit-name-${id}`).value.trim();
    const url = document.getElementById(`edit-url-${id}`).value.trim();
    const key = document.getElementById(`edit-key-${id}`).value.trim();
    const model = document.getElementById(`edit-model-${id}`).value;
    if (!model) { showSettingsToast('请先点 Fetch 获取模型列表，并选择一个模型'); return; }

    const target = settingsApiPresets.find(p => p.id === id);
    if (target) {
        target.name = name;
        target.url = url;
        target.key = key;
        target.model = model;
        if (settingsApiPresets[settingsActivePresetIndex] === target) publishActiveSettingsApi(target);
        saveSettingsApiPresets();
        showSettingsToast(`预设 "${name}" 更新成功！`);
        renderSettingsPresetsList();
        updateSettingsActivePresetBadge();
    }
}

function cycleSettingsPreset() {
    if (settingsApiPresets.length === 0) {
        showSettingsToast('请先保存至少一个 API 预设');
        return;
    }
    settingsActivePresetIndex = (settingsActivePresetIndex + 1) % settingsApiPresets.length;
    const current = settingsApiPresets[settingsActivePresetIndex];

    document.getElementById('settingsPresetName').value = current.name;
    document.getElementById('settingsApiUrl').value = current.url;
    document.getElementById('settingsApiKey').value = current.key;
    const modelSelect = document.getElementById('settingsModelDropdown');
    ensureModelOption(modelSelect, current.model);
    settingsSetTuningForm(current);
    publishActiveSettingsApi(current);

    updateSettingsActivePresetBadge();
    renderSettingsPresetsList();
}

function updateSettingsActivePresetBadge() {
    const badge = document.getElementById('settingsActivePresetBadge');
    if (settingsApiPresets.length > 0) {
        badge.innerText = settingsApiPresets[settingsActivePresetIndex].name;
    } else {
        badge.innerText = 'No Preset';
    }
}

// 默认：原来的圆角气泡（带小尾巴）
const CHAT_ICON_GLYPH = `
    <path class="stroke-primary" d="M13.5 8.5h12a6 6 0 0 1 6 6v7a6 6 0 0 1-6 6H18l-4.5 3.5v-3.5a6 6 0 0 1-6-6v-7a6 6 0 0 1 6-6z"/>
    <line class="stroke-primary" x1="13.5" y1="15.5" x2="25.5" y2="15.5"/>
    <line class="stroke-secondary" x1="13.5" y1="20" x2="20.5" y2="20"/>
    <circle class="fill-solid" cx="24" cy="20" r="1.1"/>
    <path class="star-solid-translucent" d="M33.5 6v4M31.5 8h4"/>
`;

// 圆形：圆圆的气泡 + 短短的小尾巴（左下角）
const CHAT_ICON_ROUND_GLYPH = `
    <path class="stroke-primary" d="M15.98 31.36 A13 13 0 1 0 11.99 29.24 L10.6 33.2 Z"/>
    <circle class="fill-solid" cx="14.6" cy="19" r="1.5"/>
    <circle class="fill-solid" cx="20" cy="19" r="1.5"/>
    <circle class="fill-solid" cx="25.4" cy="19" r="1.5"/>
`;

function getChatIconSvg(styleId = 'default') {
    if (styleId === 'circular') {
        return `<svg viewBox="0 0 40 40">${CHAT_ICON_ROUND_GLYPH}</svg>`;
    }
    return `<svg viewBox="0 0 40 40">${CHAT_ICON_GLYPH}</svg>`;
}

function getDefaultAppSvgHtml(appId, chatStyle = 'default') {
    if (appId === 'chat') {
        return getChatIconSvg(chatStyle);
    } else if (appId === 'weather') {
        return `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`;
    } else if (appId === 'gallery') {
        return `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    } else if (appId === 'notes') {
        return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    } else {
        return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    }
}

function getModalTextColors(isLightMode) {
    return {
        main: isLightMode ? '#000' : '#fff',
        sub: isLightMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)'
    };
}

async function openCenterModal(type) {
    settingsModalRerender = () => openCenterModal(type);
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    body.innerHTML = '';
    body.style.maxHeight = '';

    const isLightMode = themeClass === 'theme-light';
    const colors = getModalTextColors(isLightMode);

    if (title) title.style.color = colors.main;
    if (subtitle) subtitle.style.color = colors.sub;

    const rowText = (main, sub) => `
        <div style="display:flex; flex-direction:column; gap:3px; min-width:0; flex:1;">
            <span class="modal-text" style="color:${colors.main}; font-size:13px; font-weight:600; line-height:1.3;">${main}</span>
            <span class="modal-text" style="color:${colors.sub}; font-size:10px; font-weight:500; line-height:1.3;">${sub}</span>
        </div>`;

    if (type === 'iconLib') {
        if (title) title.innerText = 'App Icon Library';
        if (subtitle) subtitle.innerText = '软件图标库配置';

        const customIcons = await safeDB.load('app_custom_icons', {});
        // 纯色材质开启时，列表里的 app 图标颜色跟随“纯色材质图标颜色”
        const styNow = await loadAppIconStyle();
        const listIconColor = styNow.material === 'solid'
            ? (styNow.solidIconColor || '#595959')
            : colors.main;

        // 列表里的信息图标恢复为最初的样子（样式切换只在主界面进行）
        const ORIGINAL_CHAT_LIST_ICON = `<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

        // 名称来自真实的 APPS；这五个应用的图标保留固定示意图形
        const FIXED_ICON_IDS = ['chat', 'weather', 'gallery', 'notes', 'settings'];
        const registry = (typeof APPS !== 'undefined') ? APPS : (window.APPS || {});
        const appsList = Object.keys(registry).map(id => ({
            id,
            name: registry[id].name
        }));

        appsList.forEach(app => {
            const customImg = customIcons[app.id];
            const item = document.createElement('div');
            item.className = 'sheet-option-item';

            let svgHtml;
            if (app.id === 'chat') {
                svgHtml = ORIGINAL_CHAT_LIST_ICON;
            } else if (FIXED_ICON_IDS.includes(app.id)) {
                svgHtml = getDefaultAppSvgHtml(app.id);
            } else {
                svgHtml = registry[app.id].svg;
            }

            const sub = app.id === 'chat'
                ? '样式请在主界面长按信息图标后切换'
                : '点击 Change 更换图标';

            item.innerHTML = `
                <div class="opt-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center; background:${customImg ? 'transparent' : (isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)')}; stroke:${listIconColor}; fill:${listIconColor};">
                    ${customImg ? `<img src="${customImg}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">` : svgHtml}
                </div>
                ${rowText(app.name, sub)}
                <input type="file" id="app-icon-file-${app.id}" style="display:none;" accept="image/*" onchange="handleAppIconUpload(event, '${app.id}')">
                <span class="preset-tag-badge mono-font opt-arrow" onclick="event.stopPropagation(); document.getElementById('app-icon-file-${app.id}').click()">Change</span>
                ${customImg ? `<span class="preset-tag-badge mono-font restore-btn" style="margin-left:4px; cursor:pointer;" onclick="event.stopPropagation(); resetAppIcon('${app.id}')">Reset</span>` : ''}
            `;
            body.appendChild(item);
        });
    } else {
        if (title) title.innerText = 'Flight Options';
        if (subtitle) subtitle.innerText = '航空配置';

        const rows = [
            {
                icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
                name: '极速巡航 — Turbo Boost',
                sub: '加速模式（占位，尚未接入功能）'
            },
            {
                icon: '<circle cx="12" cy="12" r="2"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>',
                name: '卫星频段锁定 — Sat Lock',
                sub: '频段锁定（占位，尚未接入功能）'
            }
        ];

        body.innerHTML = rows.map(r => `
            <div class="sheet-option-item" onclick="closeCenterModal()">
                <div class="opt-icon" style="stroke:${colors.main}; fill:none;"><svg viewBox="0 0 24 24">${r.icon}</svg></div>
                ${rowText(r.name, r.sub)}
                <svg class="opt-arrow" viewBox="0 0 24 24" width="13" height="13" style="stroke:${colors.main}; stroke-width:2; fill:none;"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
        `).join('');
    }
    if (type === 'iconLib') {
        await renderIconLibFooter();
    }
}

async function handleAppIconUpload(e, appId) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(evt) {
            const base64 = evt.target.result;
            const customIcons = await safeDB.load('app_custom_icons', {});
            customIcons[appId] = base64;
            await safeDB.save('app_custom_icons', customIcons);
            window.noirCustomAppIcons = customIcons;
            alert(`应用 "${appId}" 图标更新成功！`);
            if (typeof renderUI === 'function') {
                renderUI();
            }
            openCenterModal('iconLib'); // 刷新弹窗列表
        };
        reader.readAsDataURL(file);
    }
}

async function resetAppIcon(appId) {
    const customIcons = await safeDB.load('app_custom_icons', {});
    delete customIcons[appId];
    await safeDB.save('app_custom_icons', customIcons);
    window.noirCustomAppIcons = customIcons;
    alert(`应用 "${appId}" 已恢复默认图标！`);
    if (typeof renderUI === 'function') {
        renderUI();
    }
    openCenterModal('iconLib'); // 刷新弹窗列表
}

async function openChatSvgStyleModal() {
    settingsModalRerender = () => openChatSvgStyleModal();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);
    const isLightMode = themeClass === 'theme-light';

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    body.innerHTML = '';

    title.innerText = 'Chat Icon Style';
    subtitle.innerText = '信息应用图标样式';

    const currentStyle = await safeDB.load('chat_svg_style', 'default');

    const styles = [
        { id: 'default', name: '标准气泡样式 (Default)' },
        { id: 'circular', name: '精致圆形样式 (Circular)' }
    ];

    styles.forEach(s => {
        const isSelected = currentStyle === s.id;
        const item = document.createElement('div');
        item.className = 'sheet-option-item';
        item.onclick = () => setChatSvgStyle(s.id);
        item.innerHTML = `
            <div class="opt-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center; stroke:${isLightMode ? '#000' : '#fff'}; fill:${isLightMode ? '#000' : '#fff'};">
                ${getDefaultAppSvgHtml('chat', s.id)}
            </div>
            <span class="modal-text" style="color:${isLightMode ? '#000' : '#fff'};">${s.name}</span>
            ${isSelected ? '<span class="preset-tag-badge mono-font" style="background:#fff; color:#000; margin-left:auto;">Active</span>' : ''}
        `;
        body.appendChild(item);
    });
}

async function setChatSvgStyle(styleId) {
    await safeDB.save('chat_svg_style', styleId);
    if (window.APPS && window.APPS['chat']) {
        window.APPS['chat'].svg = getChatIconSvg(styleId);
    }
    alert('信息图标样式已切换！');
    if (typeof renderUI === 'function') {
        renderUI();
    }
    openCenterModal('iconLib');
}

// ---------- 桌面 App 图标材质（方圆度 / 磨砂玻璃度 / 透明度 / 材质），用 DB 保存 ----------
const APP_ICON_STYLE_DEFAULT = { radius: 17, blur: 1.5, transparency: 93, solidTransparency: 0, material: 'default', solidColor: null, solidIconColor: null, borderWidth: null, borderColor: null };
let liveAppIconStyle = null;

// 内存中的最新样式：避免快速连续修改时，读到旧数据互相覆盖
let appIconStyleCache = null;

async function loadAppIconStyle() {
    if (!appIconStyleCache) {
        const saved = await safeDB.load('app_icon_style', null);
        appIconStyleCache = Object.assign({}, APP_ICON_STYLE_DEFAULT, saved || {});
    }
    return Object.assign({}, appIconStyleCache);
}

// 应用名称颜色：有值时加标记类，让它的优先级高于自适应和手动颜色
function applyAppNameColorVar(color) {
    const pc = document.getElementById('phoneContainer');
    if (!pc) return;
    if (color) {
        pc.style.setProperty('--app-name-color', color);
        pc.classList.add('app-name-custom');
    } else {
        pc.style.removeProperty('--app-name-color');
        pc.classList.remove('app-name-custom');
    }
}

function colorToRgba(color, opacity) {
    if (!color) return color;
    if (color.startsWith('#')) {
        let hex = color.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(h => h + h).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
}

// 把材质写到桌面容器的 CSS 变量上；透明度 93% 对应原来的 0.035 底色
function applyAppIconStyle(style) {
    const pc = document.getElementById('phoneContainer');
    if (!pc) return;
    const s = Object.assign({}, APP_ICON_STYLE_DEFAULT, style || {});
    const alpha = (0.5 * (1 - s.transparency / 100)).toFixed(3); // 透明度越高，底色越淡
    pc.style.setProperty('--app-radius', s.radius + 'px');
    pc.style.setProperty('--app-blur', s.blur + 'px');
    pc.style.setProperty('--app-glass-alpha', alpha);

    // 纯色材质的不透明度：0% 透明度 = 完全不透明
    const solidOpacity = (1 - s.solidTransparency / 100).toFixed(3);
    pc.style.setProperty('--app-solid-opacity', solidOpacity);
    pc.style.removeProperty('--app-solid-bg-rgba');

    if (s.borderWidth !== null && s.borderWidth !== undefined) pc.style.setProperty('--app-border-w', s.borderWidth + 'px');
    else pc.style.removeProperty('--app-border-w');
    if (s.borderColor) {
        pc.style.setProperty('--app-border-color', s.borderColor);
        pc.classList.add('app-border-custom');
    } else {
        pc.style.removeProperty('--app-border-color');
        pc.classList.remove('app-border-custom');
    }
    if (s.solidColor) pc.style.setProperty('--app-solid-bg', s.solidColor);
    else pc.style.removeProperty('--app-solid-bg');
    if (s.solidIconColor) pc.style.setProperty('--app-solid-icon', s.solidIconColor);
    else pc.style.removeProperty('--app-solid-icon');
    pc.classList.toggle('app-material-solid', s.material === 'solid');
    // 自定义图标图片：跟随当前材质的透明度（最低 0.2，免得完全看不见）
    const activeT = s.material === 'solid' ? (s.solidTransparency || 0) : (s.transparency || 0);
    pc.style.setProperty('--custom-icon-opacity', Math.max(0.2, 1 - activeT / 100).toFixed(2));
}

async function updateAppIconStyle(patch) {
    if (!appIconStyleCache) await loadAppIconStyle();
    // 读取缓存与写回缓存之间没有 await，连续调用也不会互相覆盖
    const next = Object.assign({}, appIconStyleCache, patch);
    appIconStyleCache = next;
    applyAppIconStyle(next);
    await safeDB.save('app_icon_style', next);
    return next;
}

// 图标库弹窗底部：取消 | 设置 | 切换材质
async function renderIconLibFooter() {
    const footer = document.getElementById('settingsModalFooter');
    if (!footer) return;
    const st = await loadAppIconStyle();
    const ICON_CANCEL = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><polyline points="3 4 3 9.5 8.5 9.5"/></svg>';
    const ICON_SETTINGS = '<svg viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="#000"/><circle cx="15" cy="12" r="2.2" fill="#000"/><circle cx="9" cy="17" r="2.2" fill="#000"/></svg>';
    const ICON_MATERIAL_DEFAULT = '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>';
    const ICON_MATERIAL_SOLID = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5" fill="#ffffff" stroke="none"/><rect x="4" y="4" width="16" height="16" rx="5" stroke="#8a8a92"/></svg>';
    const isSolid = st.material === 'solid';
    const ICON_MATERIAL = isSolid ? ICON_MATERIAL_SOLID : ICON_MATERIAL_DEFAULT;
    footer.style.display = 'flex';
    footer.innerHTML = `
        <div class="pf-item" onclick="resetAppIconStyle(false)">
            <div class="pf-btn" title="取消：恢复默认">${ICON_CANCEL}</div>
        </div>
        <div class="pf-item" onclick="openAppIconSettingsView(true)">
            <div class="pf-btn" title="设置方圆度、磨砂玻璃度、透明度">${ICON_SETTINGS}</div>
        </div>
        <div class="pf-item" onclick="toggleAppMaterial()">
            <div class="pf-btn" title="切换 App 材质">${ICON_MATERIAL}</div>
        </div>
    `;
    positionPopupFooter();
}

// 把底部按钮放在弹窗正下方（用布局尺寸计算，不受缩放动画影响）
function positionPopupFooter() {
    const shell = document.getElementById('settingsPopupShell');
    const card = document.getElementById('settingsCenterModal');
    const footer = document.getElementById('settingsModalFooter');
    if (!shell || !card || !footer || footer.style.display === 'none') return;
    const bottom = card.offsetTop + card.offsetHeight / 2;
    footer.style.top = (bottom + 16) + 'px';
}
window.addEventListener('resize', positionPopupFooter);

// 取消：恢复默认的方圆度、磨砂、透明度和材质
async function resetAppIconStyle(stayInSettings = false) {
    showCapsuleTip('已恢复默认');
    appIconStyleCache = Object.assign({}, APP_ICON_STYLE_DEFAULT);
    applyAppIconStyle(APP_ICON_STYLE_DEFAULT);
    await safeDB.save('app_icon_style', Object.assign({}, APP_ICON_STYLE_DEFAULT));
    if (stayInSettings) {
        await openAppIconSettingsView();
    } else {
        await openCenterModal('iconLib');
    }
}

// 底部圆形小胶囊提示：冒出 -> 停留 -> 渐出
function showCapsuleTip(text) {
    const host = document.getElementById('phoneContainer') || document.body;
    const old = document.getElementById('capsuleTip');
    if (old) old.remove();
    const tip = document.createElement('div');
    tip.id = 'capsuleTip';
    tip.className = 'capsule-tip';
    tip.innerText = text;
    host.appendChild(tip);
    requestAnimationFrame(() => requestAnimationFrame(() => tip.classList.add('show')));
    setTimeout(() => {
        tip.classList.remove('show');
        setTimeout(() => tip.remove(), 450);
    }, 1400);
}

// 切换材质：默认 <-> 纯色带灰色边框
async function toggleAppMaterial() {
    const st = await loadAppIconStyle();
    const next = st.material === 'solid' ? 'default' : 'solid';
    showCapsuleTip(next === 'solid' ? '材质：纯色' : '材质：默认');
    await updateAppIconStyle({ material: next });
    await renderIconLibFooter();
}

// 设置：方圆度 / 磨砂玻璃度 / 透明度 三个滑条
async function openAppIconSettingsView(showTip = false) {
    if (showTip) showCapsuleTip('材质设置');
    settingsModalRerender = () => openAppIconSettingsView();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    liveAppIconStyle = await loadAppIconStyle();
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    const footer = document.getElementById('settingsModalFooter');

    subtitle.innerText = '应用图标材质设置';

    const row = (key, label, min, max, step, val, unit) => {
        const pct = ((val - min) / (max - min)) * 100;
        return `
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">${label}</span>
                <span class="modal-text appicon-val" id="appicon-val-${key}">${val}${unit}</span>
            </div>
            <input type="range" class="appicon-range" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${pct}%"
                oninput="previewAppIconSlider('${key}', this.value, '${unit}', this)"
                onchange="commitAppIconSlider('${key}', this.value)">
        </div>`;
    };

    const isLight = themeClass === 'theme-light';
    const bgVal = liveAppIconStyle.solidColor || '#ffffff';
    const iconVal = liveAppIconStyle.solidIconColor || '#595959';
    const colorRow = (key, label, val) => `
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">${label}</span>
                <input type="color" class="appicon-color" value="${val}"
                    oninput="previewAppIconColor('${key}', this.value)"
                    onchange="commitAppIconColor('${key}', this.value)">
            </div>
        </div>`;

    const solidNow = liveAppIconStyle.material === 'solid';
    const borderVal = liveAppIconStyle.borderWidth !== null && liveAppIconStyle.borderWidth !== undefined ? liveAppIconStyle.borderWidth : (solidNow ? 3 : 0.5);
    const borderColorVal = liveAppIconStyle.borderColor || (solidNow ? '#DDDDDD' : '#ffffff');

    body.innerHTML =
        `<div class="appicon-preview-row">
            <div class="appicon-preview-tile" id="appiconPreviewTile">${getChatIconSvg('default')}</div>
            <div class="appicon-preview-text">
                <span class="modal-text appicon-preview-title">预览</span>
                <span class="modal-text appicon-hint" id="appiconHint"></span>
            </div>
        </div>` +
        row('radius', '方圆度', 0, 28, 1, liveAppIconStyle.radius, 'px') +
        row('blur', '磨砂玻璃度', 0, 20, 0.5, liveAppIconStyle.blur, 'px') +
        (liveAppIconStyle.material === 'solid'
            ? row('solidTransparency', '透明度（纯色）', 0, 100, 1, liveAppIconStyle.solidTransparency ?? 0, '%')
            : row('transparency', '透明度', 0, 100, 1, liveAppIconStyle.transparency, '%')) +
        row('borderWidth', '图标边框粗细', 0, 3, 0.5, borderVal, 'px') +
        colorRow('borderColor', '图标边框颜色', borderColorVal) +
        colorRow('solidColor', '纯色材质颜色', bgVal) +
        colorRow('solidIconColor', '纯色材质图标颜色', iconVal) +
        `<div class="appicon-priority">颜色优先级（高 → 低）：纯色材质 › 图标边框 › 应用名称颜色 › 手动颜色 › 自适应</div>`;
    body.style.maxHeight = '380px';

    renderAppIconPreview();
    footer.style.display = 'flex';
    footer.innerHTML = `
        <div class="pf-item" onclick="resetAppIconStyle(true)">
            <div class="pf-btn" title="取消：恢复默认"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><polyline points="3 4 3 9.5 8.5 9.5"/></svg></div>
        </div>
        <div class="pf-item" onclick="showCapsuleTip('已完成'); openCenterModal('iconLib')">
            <div class="pf-btn" title="完成"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        </div>
    `;
    positionPopupFooter();
}

function previewAppIconSlider(key, val, unit, el) {
    renderAppIconPreview();
    const label = document.getElementById('appicon-val-' + key);
    if (label) label.innerText = val + unit;
    if (el) el.style.setProperty('--p', ((val - el.min) / (el.max - el.min) * 100) + '%');
    if (!liveAppIconStyle) return;
    liveAppIconStyle[key] = parseFloat(val);
    applyAppIconStyle(liveAppIconStyle);
}

function previewAppIconColor(key, val) {
    if (!liveAppIconStyle) return;
    liveAppIconStyle[key] = val;
    applyAppIconStyle(liveAppIconStyle);
    renderAppIconPreview();
}

// 设置页顶部的预览方块：实时显示当前的材质、颜色、透明度、边框
function hexToRgbaStr(hex, a) {
    let h = (hex || '#2b2b30').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function renderAppIconPreview() {
    const tile = document.getElementById('appiconPreviewTile');
    const hint = document.getElementById('appiconHint');
    if (!tile || !liveAppIconStyle) return;
    const s = liveAppIconStyle;
    const isLight = (document.getElementById('phoneContainer') || {}).classList
        ? document.getElementById('phoneContainer').classList.contains('theme-light') : false;
    const solid = s.material === 'solid';
    const iconCol = s.solidIconColor || '#595959';
    if (solid) {
        const bg = s.solidColor || '#ffffff';
        const a = 1 - (s.solidTransparency || 0) / 100;
        tile.style.background = hexToRgbaStr(bg, a.toFixed(2));
        tile.style.border = `${s.borderWidth != null ? s.borderWidth : 3}px solid ${s.borderColor || '#DDDDDD'}`;
        tile.style.backdropFilter = 'none';
    } else {
        tile.style.background = `rgba(255, 255, 255, ${(0.5 * (1 - s.transparency / 100)).toFixed(3)})`;
        tile.style.border = `${s.borderWidth != null ? s.borderWidth : 0.5}px solid ${s.borderColor || 'rgba(255,255,255,0.18)'}`;
        tile.style.backdropFilter = `blur(${s.blur}px)`;
    }
    tile.style.borderRadius = s.radius + 'px';
    tile.style.setProperty('--pv-icon', iconCol);
    if (hint) {
        hint.innerText = solid
            ? '纯色材质已开启：颜色实时生效'
            : '颜色仅在纯色材质下生效，先切换到纯色材质';
    }
}

async function commitAppIconColor(key, val) {
    if (liveAppIconStyle) liveAppIconStyle[key] = val;
    await updateAppIconStyle({ [key]: val });
}

async function commitAppIconSlider(key, val) {
    if (liveAppIconStyle) liveAppIconStyle[key] = parseFloat(val);
    await updateAppIconStyle({ [key]: parseFloat(val) });
}

function closeCenterModal() {
    const shell = document.getElementById('settingsPopupShell');
    if (shell) shell.classList.remove('center-modal-open');
    settingsModalRerender = null;
}

window.getDefaultAppSvgHtml = getDefaultAppSvgHtml;

async function openChatStyleModal() {
    settingsModalRerender = () => openChatStyleModal();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);
    const isLightMode = themeClass === 'theme-light';

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    body.innerHTML = '';

    title.innerText = 'Chat Icon Style';
    subtitle.innerText = '信息图标样式';

    const currentStyle = await safeDB.load('chat_svg_style', 'default');

    const styles = [
        { id: 'default', name: '标准气泡样式 (Default)' },
        { id: 'circular', name: '精致圆形样式 (Circular)' }
    ];

    styles.forEach(s => {
        const isSelected = currentStyle === s.id;
        const item = document.createElement('div');
        item.className = 'sheet-option-item';
        item.onclick = async () => {
            await safeDB.save('chat_svg_style', s.id);
            if (window.APPS && window.APPS['chat']) {
                window.APPS['chat'].svg = window.getDefaultAppSvgHtml('chat', s.id);
            }
            if (typeof renderUI === 'function') {
                renderUI();
            }
            closeCenterModal();
        };
        item.innerHTML = `
            <div class="opt-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center; stroke:${isLightMode ? '#000' : '#fff'}; fill:${isLightMode ? '#000' : '#fff'};">
                ${window.getDefaultAppSvgHtml('chat', s.id)}
            </div>
            <span class="modal-text" style="color:${isLightMode ? '#000' : '#fff'};">${s.name}</span>
            ${isSelected ? '<span class="preset-tag-badge mono-font" style="background:#fff; color:#000; margin-left:auto;">Active</span>' : ''}
        `;
        body.appendChild(item);
    });
}
window.openChatStyleModal = openChatStyleModal;
window.openChatStyleModal = openChatStyleModal;

function toggleViewportPaddingPanel() {
    const panel = document.getElementById('viewportPaddingPanel');
    const arrow = document.getElementById('viewportPanelArrow');
    const row = document.querySelector('.viewport-toggle-row');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    const open = !panel.classList.contains('collapsed');
    if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
    if (row) row.classList.toggle('expanded', open);
}

// 视口恢复默认：顶部 24px、底部 0px（和壁纸的 Reset 一样，只恢复视口，不收起面板）
async function resetViewportPadding(e) {
    if (e) e.stopPropagation();
    const top = 24, bottom = 0;
    await safeDB.save('viewport_padding_top', top);
    await safeDB.save('viewport_padding_bottom', bottom);
    applyViewportPadding(top, bottom);
    const tr = document.getElementById('viewportTopRange');
    const br = document.getElementById('viewportBottomRange');
    const tl = document.getElementById('viewportTopVal');
    const bl = document.getElementById('viewportBottomVal');
    if (tr) { tr.value = top; tr.style.setProperty('--p', ((top - tr.min) / (tr.max - tr.min) * 100) + '%'); }
    if (br) { br.value = bottom; br.style.setProperty('--p', ((bottom - br.min) / (br.max - br.min) * 100) + '%'); }
    if (tl) tl.innerText = top + 'px';
    if (bl) bl.innerText = bottom + 'px';
}

// ---------- 视口：把桌面和应用窗口放进“视口层”，上下边距由滑条控制 ----------
// 壁纸在手机容器自己的 ::before 上（不受影响），所以只有视口层里的界面会移动
function ensureViewportLayer() {
    const pc = document.getElementById('phoneContainer');
    if (!pc) return null;
    let layer = document.getElementById('viewportLayer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'viewportLayer';
        layer.className = 'viewport-layer';
        pc.appendChild(layer);
        ['appWindow'].forEach(id => {
            const el = document.getElementById(id);
            if (el) layer.appendChild(el);
        });
    }
    return layer;
}

function applyViewportPadding(topVal, bottomVal) {
    const pc = document.getElementById('phoneContainer');
    const layer = ensureViewportLayer();
    if (!pc || !layer) return;
    pc.style.paddingTop = '0px';
    pc.style.paddingBottom = '0px';
    layer.style.setProperty('--vp-top', topVal + 'px');
    layer.style.setProperty('--vp-bottom', bottomVal + 'px');
}

function previewViewportPadding(type, val, el) {
    if (el) {
        const pct = ((val - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--p', pct + '%');
    }
    const label = document.getElementById(type === 'top' ? 'viewportTopVal' : 'viewportBottomVal');
    if (label) label.innerText = val + 'px';
    const layer = ensureViewportLayer();
    if (!layer) return;
    if (type === 'top') layer.style.setProperty('--vp-top', val + 'px');
    else layer.style.setProperty('--vp-bottom', val + 'px');
}

async function commitViewportPadding(type, val) {
    const num = parseInt(val, 10);
    if (type === 'top') {
        await safeDB.save('viewport_padding_top', num);
    } else {
        await safeDB.save('viewport_padding_bottom', num);
    }
}

// ---------- 桌面视口：独立于应用窗口的视口，只控制桌面 ----------
function applyDesktopViewport(topVal, bottomVal) {
    const home = document.getElementById('homeScreen');
    if (!home) return;
    home.style.top = topVal + 'px';
    home.style.bottom = bottomVal + 'px';
}

function previewDesktopViewport(type, val, el) {
    if (el) {
        const pct = ((val - el.min) / (el.max - el.min)) * 100;
        el.style.setProperty('--p', pct + '%');
    }
    const label = document.getElementById(type === 'top' ? 'dvpTopVal' : 'dvpBottomVal');
    if (label) label.innerText = val + 'px';
    const home = document.getElementById('homeScreen');
    if (!home) return;
    if (type === 'top') home.style.top = val + 'px';
    else home.style.bottom = val + 'px';
}

async function commitDesktopViewport(type, val) {
    const num = parseInt(val, 10);
    await safeDB.save(type === 'top' ? 'desktop_viewport_top' : 'desktop_viewport_bottom', num);
}

async function resetDesktopViewport() {
    const top = 24, bottom = 0;
    await safeDB.save('desktop_viewport_top', top);
    await safeDB.save('desktop_viewport_bottom', bottom);
    applyDesktopViewport(top, bottom);
    const tr = document.getElementById('dvpTopRange');
    const br = document.getElementById('dvpBottomRange');
    if (tr) { tr.value = top; tr.style.setProperty('--p', ((top - tr.min) / (tr.max - tr.min) * 100) + '%'); }
    if (br) { br.value = bottom; br.style.setProperty('--p', ((bottom - br.min) / (br.max - br.min) * 100) + '%'); }
    const tl = document.getElementById('dvpTopVal'); if (tl) tl.innerText = top + 'px';
    const bl = document.getElementById('dvpBottomVal'); if (bl) bl.innerText = bottom + 'px';
}

// 编辑模式下：分页点上方的黑色五角星按钮，星星上写着 Got it；点击打开桌面视口设置
function ensureDesktopEditButton() {
    if (document.getElementById('desktopEditSettingsBtn')) return;
    const host = document.querySelector('#homeScreen .pagination-bar') || document.getElementById('phoneContainer');
    if (!host) return;
    const btn = document.createElement('div');
    btn.id = 'desktopEditSettingsBtn';
    btn.className = 'desktop-edit-star wk-capsule';
    btn.title = '小组件';
    btn.innerHTML = '<span class="wk-capsule-plus">+</span>';
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof openWidgetLibrary === 'function') openWidgetLibrary(); else openDesktopViewportPopup();
    });
    host.appendChild(btn);
}

async function openDesktopViewportPopup() {
    settingsModalRerender = () => openDesktopViewportPopup();
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = 'Desktop Viewport';
    subtitle.innerText = '桌面视口';
    body.style.maxHeight = 'none';

    const top = await safeDB.load('desktop_viewport_top', 24);
    const bottom = await safeDB.load('desktop_viewport_bottom', 0);
    const pct = (v) => ((v - 0) / (200 - 0)) * 100;
    const dock = await loadDockStyle();

    body.innerHTML = `
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">顶部距离 (Top)</span>
                <span class="modal-text appicon-val" id="dvpTopVal">${top}px</span>
            </div>
            <input type="range" class="appicon-range" id="dvpTopRange" min="0" max="200" step="1" value="${top}" style="--p:${pct(top)}%"
                oninput="previewDesktopViewport('top', this.value, this)"
                onchange="commitDesktopViewport('top', this.value)">
        </div>
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">底部距离 (Bottom)</span>
                <span class="modal-text appicon-val" id="dvpBottomVal">${bottom}px</span>
            </div>
            <input type="range" class="appicon-range" id="dvpBottomRange" min="0" max="200" step="1" value="${bottom}" style="--p:${pct(bottom)}%"
                oninput="previewDesktopViewport('bottom', this.value, this)"
                onchange="commitDesktopViewport('bottom', this.value)">
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top: 10px;">
            <div class="action-text-btn restore-btn" onclick="resetDesktopViewport()" style="opacity:0.6;">Reset</div>
        </div>
        ${renderDockSection(dock)}
    `;
    liveDockStyle = dock;
    applyDockStyle(dock);
}

// ---------- Dock 控制：方角 / 磨砂玻璃（开关）/ 透明度 / 还原 ----------
const DOCK_STYLE_DEFAULT = { radius: 32, frosted: false, transparency: 93, spacingSync: false, disperse: true };
let dockExpanded = false; // Dock 区块是否展开（默认收起）
let liveDockStyle = null;

async function loadDockStyle() {
    const saved = await safeDB.load('dock_style', null);
    const s = Object.assign({}, DOCK_STYLE_DEFAULT, saved || {});
    if (saved && saved.radius === undefined && saved.square === true) s.radius = 0; // 兼容旧的“方角”开关
    delete s.square;
    return s;
}

// 写到桌面容器的 CSS 变量：圆角、底色透明度、磨砂强度
function applyDockStyle(style) {
    const pc = document.getElementById('phoneContainer');
    if (!pc) return;
    const s = Object.assign({}, DOCK_STYLE_DEFAULT, style || {});
    pc.style.setProperty('--dock-radius', Math.max(0, Math.min(32, s.radius)) + 'px');
    pc.style.setProperty('--dock-alpha', (0.5 * (1 - s.transparency / 100)).toFixed(3));
    pc.style.setProperty('--dock-filter', s.frosted
        ? 'url(#lens-refraction) blur(16px) saturate(180%)'
        : 'url(#lens-refraction) blur(1.5px) saturate(180%)');
    pc.style.setProperty('--dock-before-display', s.disperse ? 'block' : 'none');
    pc.style.setProperty('--dock-gap', dockGapPx(s.spacingSync) + 'px');
}

// 桌面的列间距（中心到中心）减去 Dock 图标宽度，就是“和桌面一样”的 Dock 间距；
// 同时不超过 Dock 的可用宽度
function dockGapPx(sync) {
    const DEFAULT_GAP = 10, SLOT = 56;
    if (!sync) return DEFAULT_GAP;
    const pc = document.getElementById('phoneContainer');
    if (!pc) return DEFAULT_GAP;
    // 用手机容器的宽度算，不依赖桌面页 / Dock 是否正在显示（打开应用时它们可能被隐藏）
    const phoneW = pc.clientWidth || pc.getBoundingClientRect().width;
    if (!phoneW) return DEFAULT_GAP;
    const pageCS = document.querySelector('#desktopTrack .desktop-page') ? getComputedStyle(document.querySelector('#desktopTrack .desktop-page')) : null;
    const padX = pageCS ? (parseFloat(pageCS.paddingLeft) || 0) + (parseFloat(pageCS.paddingRight) || 0) : 32;
    const colGap = pageCS ? (parseFloat(pageCS.columnGap) || 8) : 8;
    const cols = pageCS ? ((pageCS.gridTemplateColumns || '').split(' ').filter(Boolean).length || 4) : 4;
    const colW = (phoneW - padX - colGap * (cols - 1)) / cols;
    let gap = (colW + colGap) - SLOT;
    // 不超过 Dock 的可用宽度（Dock 左右各留 16px，内边距 12px）
    const dockInner = phoneW - 32 - 24;
    const maxGap = (dockInner - 4 * SLOT) / 3;
    gap = Math.min(gap, maxGap);
    return Math.max(0, Math.round(gap * 10) / 10);
}

function renderDockSection(d) {
    const sw = (key, label, on) => `
        <div class="appicon-slider-row">
            <div class="appicon-slider-head">
                <span class="modal-text">${label}</span>
                <div class="ios-switch ${on ? 'active' : ''}" onclick="toggleDockOption('${key}')"></div>
            </div>
        </div>`;
    return `
        <div class="dock-section-head">
            <span class="section-tag mono-font" style="margin:0;">Dock</span>
            <div class="dock-expand-btn" id="dockExpandBtn" onclick="toggleDockSection()" title="展开 / 收起">
                <svg viewBox="0 0 24 24" style="transform: rotate(${dockExpanded ? 180 : 0}deg);"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
        </div>
        <div id="dockSectionBody" style="display:${dockExpanded ? 'block' : 'none'};">
            <div class="appicon-slider-row">
                <div class="appicon-slider-head">
                    <span class="modal-text">Dock 方角</span>
                    <span class="modal-text appicon-val" id="dockRadiusVal">${d.radius}px</span>
                </div>
                <input type="range" class="appicon-range" id="dockRadiusRange" min="0" max="32" step="1" value="${d.radius}" style="--p:${d.radius / 32 * 100}%"
                    oninput="previewDockRadius(this.value, this)"
                    onchange="commitDockRadius(this.value)">
            </div>
            ${sw('frosted', 'Dock 磨砂玻璃', d.frosted)}
            ${sw('disperse', 'Dock 色散', d.disperse)}
            ${sw('spacingSync', 'Dock 软件间距同桌面', d.spacingSync)}
            <div class="appicon-slider-row">
                <div class="appicon-slider-head">
                    <span class="modal-text">Dock 透明度</span>
                    <span class="modal-text appicon-val" id="dockTransVal">${d.transparency}%</span>
                </div>
                <input type="range" class="appicon-range" id="dockTransRange" min="0" max="100" step="1" value="${d.transparency}" style="--p:${d.transparency}%"
                    oninput="previewDockTransparency(this.value, this)"
                    onchange="commitDockTransparency(this.value)">
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top: 10px;">
                <div class="action-text-btn restore-btn" onclick="resetDockStyle()" style="opacity:0.6;">还原</div>
            </div>
        </div>`;
}

// Dock 区块展开 / 收起（只切换显示，不重新渲染）
function toggleDockSection() {
    dockExpanded = !dockExpanded;
    const body = document.getElementById('dockSectionBody');
    const svg = document.querySelector('#dockExpandBtn svg');
    if (body) body.style.display = dockExpanded ? 'block' : 'none';
    if (svg) svg.style.transform = dockExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
}

// Dock 方角滑块
function previewDockRadius(val, el) {
    if (el) el.style.setProperty('--p', (val / 32 * 100) + '%');
    const label = document.getElementById('dockRadiusVal');
    if (label) label.innerText = val + 'px';
    if (!liveDockStyle) return;
    liveDockStyle.radius = parseFloat(val);
    applyDockStyle(liveDockStyle);
}

async function commitDockRadius(val) {
    if (liveDockStyle) liveDockStyle.radius = parseFloat(val);
    await safeDB.save('dock_style', liveDockStyle || Object.assign({}, DOCK_STYLE_DEFAULT, { radius: parseFloat(val) }));
}

async function toggleDockOption(key) {
    const d = liveDockStyle || await loadDockStyle();
    d[key] = !d[key];
    liveDockStyle = d;
    await safeDB.save('dock_style', d);
    applyDockStyle(d);
    await openDesktopViewportPopup();
}

function previewDockTransparency(val, el) {
    if (el) el.style.setProperty('--p', val + '%');
    const label = document.getElementById('dockTransVal');
    if (label) label.innerText = val + '%';
    if (!liveDockStyle) return;
    liveDockStyle.transparency = parseFloat(val);
    applyDockStyle(liveDockStyle);
}

async function commitDockTransparency(val) {
    if (liveDockStyle) liveDockStyle.transparency = parseFloat(val);
    await safeDB.save('dock_style', liveDockStyle || Object.assign({}, DOCK_STYLE_DEFAULT, { transparency: parseFloat(val) }));
}

async function resetDockStyle() {
    liveDockStyle = Object.assign({}, DOCK_STYLE_DEFAULT);
    await safeDB.save('dock_style', liveDockStyle);
    applyDockStyle(liveDockStyle);
    await openDesktopViewportPopup();
}

// 页面一加载就应用保存的视口（不必先打开设置）
document.addEventListener('DOMContentLoaded', async () => {
    const topVal = await safeDB.load('viewport_padding_top', 24);
    const bottomVal = await safeDB.load('viewport_padding_bottom', 0);
    applyViewportPadding(topVal, bottomVal);
    const dTop = await safeDB.load('desktop_viewport_top', 24);
    const dBottom = await safeDB.load('desktop_viewport_bottom', 0);
    applyDesktopViewport(dTop, dBottom);
    applyDockStyle(await loadDockStyle());
    ensureDesktopEditButton();
});
window.addEventListener('resize', async () => {
    applyDockStyle(await loadDockStyle());
});

// 系统日夜间变化时，如果用户没有手动选择过，就跟随
if (window.matchMedia) {
    const systemLightQuery = window.matchMedia('(prefers-color-scheme: light)');
    const onSystemThemeChange = () => { followSystemThemeIfAuto(); refreshPopupIfAuto(); applyDesktopWallpaper(); };
    if (systemLightQuery.addEventListener) systemLightQuery.addEventListener('change', onSystemThemeChange);
    else if (systemLightQuery.addListener) systemLightQuery.addListener(onSystemThemeChange);
}


// =====================================================================
// 小组件：编辑模式下点小组件 -> 文字与颜色设置（Got it 弹窗）
// 头像：点击 -> 恢复内置 / 上传图片 的方框
// =====================================================================
const WIDGET_NAMES = {
    'w-profile': 'Profile',
    'w-polaroid': 'Daily Moment',
    'w-heartbeat': 'Heartbeat',
    'w-mp3': 'MP3',
    'w-dialogue': 'Dialogue'
};
let widgetOverrides = {};   // { [widgetId]: { [textIndex]: { text?, color? } } }

// 小组件里“原本带文字”的元素（按 DOM 顺序，SVG 里的不算）。
// 只在小组件刚渲染、还没改过时算一次，并打上 data-wt 编号；之后编号固定，不会因为文字被清空而错位
function tagWidgetLeaves(widgetEl) {
    if (widgetEl.dataset.wtTagged) return;
    let n = 0;
    widgetEl.querySelectorAll('*').forEach(el => {
        if (el.tagName.toLowerCase() === 'svg' || el.closest('svg')) return;
        const hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
        if (hasText) el.setAttribute('data-wt', String(n++));
    });
    widgetEl.dataset.wtTagged = '1';
}

function getWidgetTextLeaves(widgetEl) {
    tagWidgetLeaves(widgetEl);
    return [...widgetEl.querySelectorAll('[data-wt]')]
        .sort((a, b) => (+a.getAttribute('data-wt')) - (+b.getAttribute('data-wt')));
}

function leafOwnText(el) {
    return [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
}

function setLeafText(el, text) {
    const tns = [...el.childNodes].filter(n => n.nodeType === 3);
    if (!tns.length) return;
    const trail = /\s$/.test(tns[0].textContent) ? ' ' : '';
    tns[0].textContent = text + trail;
    tns.slice(1).forEach(n => { n.textContent = ''; });
}

function rgbToHex(rgb) {
    const m = (rgb || '').match(/\d+/g);
    if (!m || m.length < 3) return '#ffffff';
    return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('');
}

// 把保存的文字 / 颜色套到当前的小组件上（渲染后也会自动套用）
function applyWidgetOverridesToDom() {
    document.querySelectorAll('#desktopTrack .widget-item').forEach(w => {
        tagWidgetLeaves(w);
        const ov = widgetOverrides[w.dataset.id];
        if (!ov) return;
        getWidgetTextLeaves(w).forEach((el, i) => {
            const o = ov[i];
            if (!o) return;
            if (o.text !== undefined && leafOwnText(el) !== o.text) setLeafText(el, o.text);
            if (o.color) el.style.setProperty('color', o.color, 'important');
        });
    });
}

function saveWidgetOverride(widgetId, index, patch) {
    widgetOverrides[widgetId] = widgetOverrides[widgetId] || {};
    widgetOverrides[widgetId][index] = Object.assign({}, widgetOverrides[widgetId][index] || {}, patch);
    return safeDB.save('widget_text_overrides', widgetOverrides);
}

function previewWidgetText(widgetId, index, val) {
    widgetOverrides[widgetId] = widgetOverrides[widgetId] || {};
    widgetOverrides[widgetId][index] = Object.assign({}, widgetOverrides[widgetId][index] || {}, { text: val });
    applyWidgetOverridesToDom();
}
async function commitWidgetText(widgetId, index, val) {
    await saveWidgetOverride(widgetId, index, { text: val });
}

function previewWidgetColor(widgetId, index, val) {
    widgetOverrides[widgetId] = widgetOverrides[widgetId] || {};
    widgetOverrides[widgetId][index] = Object.assign({}, widgetOverrides[widgetId][index] || {}, { color: val });
    applyWidgetOverridesToDom();
}
async function commitWidgetColor(widgetId, index, val) {
    await saveWidgetOverride(widgetId, index, { color: val });
}

// 还原：清掉这个小组件的所有文字 / 颜色修改，重新渲染回原样
async function resetWidgetOverrides(widgetId) {
    delete widgetOverrides[widgetId];
    await safeDB.save('widget_text_overrides', widgetOverrides);
    if (typeof renderUI === 'function') renderUI();
    openWidgetPopup(widgetId);
}

async function openWidgetPopup(widgetId) {
    const widgetEl = document.querySelector(`#desktopTrack .widget-item[data-id="${widgetId}"]`);
    if (!widgetEl) return;
    settingsModalRerender = () => openWidgetPopup(widgetId);
    const themeClass = await resolvePopupThemeClass();
    ensurePopupShell(themeClass);

    const title = document.getElementById('settingsModalTitle');
    const subtitle = document.getElementById('settingsModalSubtitle');
    const body = document.getElementById('settingsModalBody');
    title.innerText = WIDGET_NAMES[widgetId] || 'Widget';
    subtitle.innerText = '小组件文字与颜色';
    body.style.maxHeight = '380px';

    const leaves = getWidgetTextLeaves(widgetEl);
    const ov = widgetOverrides[widgetId] || {};
    const rows = leaves.map((el, i) => {
        const cur = ov[i] || {};
        const text = cur.text !== undefined ? cur.text : leafOwnText(el);
        const color = cur.color || rgbToHex(getComputedStyle(el).color);
        const safeText = text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        return `
            <div class="widget-text-row">
                <span class="modal-text widget-text-idx">${i + 1}</span>
                <input type="text" class="widget-text-input" value="${safeText}"
                    oninput="previewWidgetText('${widgetId}', ${i}, this.value)"
                    onchange="commitWidgetText('${widgetId}', ${i}, this.value)">
                <input type="color" class="appicon-color" value="${color}"
                    oninput="previewWidgetColor('${widgetId}', ${i}, this.value)"
                    onchange="commitWidgetColor('${widgetId}', ${i}, this.value)">
            </div>`;
    }).join('');

    body.innerHTML = `
        ${leaves.length ? rows : '<div class="tip-modal-content">这个小组件没有可编辑的文字</div>'}
        <div class="widget-popup-actions">
            <button class="tip-modal-btn mono-font widget-got-btn" onclick="closeCenterModal()">Got it</button>
            <div class="restore-round restore-btn" title="还原" onclick="resetWidgetOverrides('${widgetId}')">
                <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><polyline points="3 4 3 9.5 8.5 9.5"/></svg>
            </div>
        </div>
    `;
}

// 头像方框：恢复内置 / 上传图片
function closeAvatarMorph(immediate = false) {
    document.removeEventListener('pointerdown', outsideAvatarMorph);
    const menu = document.getElementById('avatarMorph');
    if (!menu) return;
    if (immediate) { menu.remove(); return; }
    menu.classList.remove('open');
    menu.style.opacity = '0';
    setTimeout(() => menu.remove(), 260);
}

function outsideAvatarMorph(ev) {
    const menu = document.getElementById('avatarMorph');
    if (!menu) { document.removeEventListener('pointerdown', outsideAvatarMorph); return; }
    if (!menu.contains(ev.target)) closeAvatarMorph();
}

function openAvatarMorph(el) {
    const phone = document.getElementById('phoneContainer');
    if (!phone) return;
    const slot = el.closest('.hb-right, .hb-dialogue-right, .chat-chip.right') ? 'male' : 'female';
    closeAvatarMorph(true);
    const pr = phone.getBoundingClientRect();
    const tr = el.getBoundingClientRect();
    const W = 156, H = 92;
    const startL = tr.left - pr.left, startT = tr.top - pr.top;
    const endL = Math.max(12, Math.min(tr.left - pr.left + tr.width / 2 - W / 2, pr.width - W - 12));
    const endT = Math.max(12, tr.top - pr.top - H - 8);

    const menu = document.createElement('div');
    menu.id = 'avatarMorph';
    menu.className = 'wp-morph';
    menu.style.left = startL + 'px';
    menu.style.top = startT + 'px';
    menu.style.width = tr.width + 'px';
    menu.style.height = tr.height + 'px';
    menu.style.zIndex = '90';
    menu.innerHTML = `
        <div class="wp-morph-item" onclick="avatarMorphRestore('${slot}', event)">恢复内置</div>
        <div class="wp-morph-item" onclick="avatarMorphUpload('${slot}', event)">上传图片</div>`;
    phone.appendChild(menu);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        menu.style.left = endL + 'px';
        menu.style.top = endT + 'px';
        menu.style.width = W + 'px';
        menu.style.height = H + 'px';
        menu.classList.add('open');
    }));
    setTimeout(() => document.addEventListener('pointerdown', outsideAvatarMorph), 0);
}

async function avatarMorphRestore(slot, e) {
    if (e) e.stopPropagation();
    closeAvatarMorph(true);
    const phone = document.getElementById('phoneContainer');
    const isLight = phone && phone.classList.contains('theme-light');
    const theme = isLight ? 'Light' : 'Dark';
    if (slot === 'female') {
        currentUploadedAvatar = `assets/${theme}/avatar-female.png`;
        await safeDB.save('avatar_female', null);
    } else {
        currentCoupleAvatar = `assets/${theme}/avatar-male.png`;
        await safeDB.save('avatar_male', null);
    }
    if (typeof renderUI === 'function') renderUI();
}

function avatarMorphUpload(slot, e) {
    if (e) e.stopPropagation();
    closeAvatarMorph(true);
    const input = document.getElementById(slot === 'female' ? 'avatarFileInput' : 'coupleAvatarInput');
    if (input) input.click();
}

// 捕获阶段拦截：头像 -> 方框；编辑模式下小组件 -> 文字设置
document.addEventListener('click', (e) => {
    // 小组件右上角的 × 自己处理，这里不能拦
    if (e.target.closest && e.target.closest('.wk-del-badge')) return;
    const avatar = e.target.closest('#desktopTrack .profile-avatar-wrap, #desktopTrack .hb-left, #desktopTrack .hb-right, #desktopTrack .chip-avatar');
    if (avatar) {
        e.stopPropagation();
        e.preventDefault();
        openAvatarMorph(avatar.classList.contains('chip-avatar') ? avatar : avatar);
        return;
    }
    const phone = document.getElementById('phoneContainer');
    const widget = e.target.closest('#desktopTrack .widget-item');
    if (widget && phone && phone.classList.contains('edit-mode')) {
        e.stopPropagation();
        openWidgetPopup(widget.dataset.id);
    }
}, true);

// 小组件文字修改会在重新渲染后自动套用
function observeWidgetOverrides() {
    const track = document.getElementById('desktopTrack');
    if (!track) return;
    new MutationObserver(() => applyWidgetOverridesToDom()).observe(track, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    widgetOverrides = (await safeDB.load('widget_text_overrides', {})) || {};
    observeWidgetOverrides();
    applyWidgetOverridesToDom();
});


// =====================================================================
// 设置页头像圆框：默认 assets/杂七杂八/设置里面的头像.jpg；点击 -> 恢复内置 / 本地上传
// =====================================================================
const SETTINGS_AVATAR_DEFAULT = "assets/杂七杂八/设置里面的头像.jpg";

async function getChatUserAvatarFallback() {
    return (await safeDB.load('chat_user_avatar', null)) || (await safeDB.load('user_avatar', null)) || (window.userAvatar || window.chatUserAvatar || null) || SETTINGS_AVATAR_DEFAULT;
}

function applySettingsAvatar(src) {
    const img = document.getElementById('settingsAvatarImg');
    if (img) img.src = src || SETTINGS_AVATAR_DEFAULT;
}

function closeSettingsAvatarMorph(immediate = false) {
    document.removeEventListener('pointerdown', outsideSettingsAvatarMorph);
    const menu = document.getElementById('settingsAvatarMorph');
    if (!menu) return;
    if (immediate) { menu.remove(); return; }
    menu.classList.remove('open');
    menu.style.opacity = '0';
    setTimeout(() => menu.remove(), 260);
}

function outsideSettingsAvatarMorph(ev) {
    const menu = document.getElementById('settingsAvatarMorph');
    if (!menu) { document.removeEventListener('pointerdown', outsideSettingsAvatarMorph); return; }
    if (!menu.contains(ev.target) && !ev.target.closest('#settingsAvatarRing')) closeSettingsAvatarMorph();
}

function openSettingsAvatarMorph(el, e) {
    if (e) e.stopPropagation();
    const root = document.getElementById('noirSettingsRoot');
    if (!root) return;
    closeSettingsAvatarMorph(true);
    const rr = root.getBoundingClientRect();
    const tr = el.getBoundingClientRect();
    const W = 156, H = 92;
    const startL = tr.left - rr.left, startT = tr.top - rr.top;
    const endL = Math.max(12, Math.min(tr.right - rr.left - W, rr.width - W - 12));
    const endT = tr.bottom - rr.top + 8;

    const menu = document.createElement('div');
    menu.id = 'settingsAvatarMorph';
    menu.className = 'wp-morph';
    menu.style.left = startL + 'px';
    menu.style.top = startT + 'px';
    menu.style.width = tr.width + 'px';
    menu.style.height = tr.height + 'px';
    menu.style.zIndex = '90';
    menu.innerHTML = `
        <div class="wp-morph-item" onclick="settingsAvatarRestore(event)">恢复内置</div>
        <div class="wp-morph-item" onclick="settingsAvatarUpload(event)">本地上传</div>`;
    root.appendChild(menu);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        menu.style.left = endL + 'px';
        menu.style.top = endT + 'px';
        menu.style.width = W + 'px';
        menu.style.height = H + 'px';
        menu.classList.add('open');
    }));
    setTimeout(() => document.addEventListener('pointerdown', outsideSettingsAvatarMorph), 0);
}

async function settingsAvatarRestore(e) {
    if (e) e.stopPropagation();
    closeSettingsAvatarMorph(true);
    await safeDB.save('settings_avatar', null);
    const fallback = await getChatUserAvatarFallback();
    applySettingsAvatar(fallback);
}

function settingsAvatarUpload(e) {
    if (e) e.stopPropagation();
    closeSettingsAvatarMorph(true);
    let input = document.getElementById('settingsAvatarInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'settingsAvatarInput';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', (ev) => {
            const file = ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (evt) => {
                await safeDB.save('settings_avatar', evt.target.result);
                applySettingsAvatar(evt.target.result);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        });
        document.body.appendChild(input);
    }
    input.click();
}


// =====================================================================
// 自定义应用图标：把图标库里上传的图片真正贴到桌面 / Dock 的应用方块上
// （main.js 里的同名逻辑查的是 data-app-id，而应用元素用的是 data-id，所以这里重新实现）
// =====================================================================
const appIconOriginalHTML = new WeakMap();

function applyCustomAppIconsToDom() {
    const custom = window.noirCustomAppIcons || {};
    document.querySelectorAll('#desktopTrack .app-item[data-id], #dockBar .app-item[data-id]').forEach(el => {
        const tile = el.querySelector('.app-icon');
        if (!tile) return;
        const src = custom[el.dataset.id];
        const cur = tile.querySelector(':scope > img.custom-app-img');
        if (src) {
            if (!appIconOriginalHTML.has(tile)) appIconOriginalHTML.set(tile, tile.innerHTML);
            if (cur && cur.getAttribute('src') === src) return;
            tile.innerHTML = `<img class="custom-app-img" src="${src}" alt="">`;
        } else if (cur) {
            tile.innerHTML = appIconOriginalHTML.get(tile) || '';
            appIconOriginalHTML.delete(tile);
        }
    });
}

function observeCustomAppIcons() {
    ['desktopTrack', 'dockBar'].forEach(id => {
        const node = document.getElementById(id);
        if (node) new MutationObserver(() => applyCustomAppIconsToDom()).observe(node, { childList: true, subtree: true });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    applyAppIconStyle(await loadAppIconStyle()); // 让图标透明度变量在默认状态下也生效
    window.noirCustomAppIcons = (await safeDB.load('app_custom_icons', {})) || {};
    observeCustomAppIcons();
    applyCustomAppIconsToDom();
});


/* =========================================
   PWA 桌面图标：预设 + 自定义上传
   ========================================= */
// 预设列表。默认图标保持 index.html / manifest.json 原来的路径不变；
// 图标二到四对应 assets/ 下的 图标2.jpg / 图标3.jpg / 图标4.jpg。
const PWA_ICON_PRESETS = [
    { id: 'default', name: '默认', src: 'assets/IMG_20261008_161846.jpg' },
    { id: 'icon2',   name: '图标二', src: 'assets/图标2.jpg' },
    { id: 'icon3',   name: '图标三', src: 'assets/图标3.jpg' },
    { id: 'icon4',   name: '图标四', src: 'assets/图标4.jpg' }
];
const PWA_ICON_KEY = 'pwa_home_icon';           // { type: 'preset', id } 或 { type: 'custom', id }
const PWA_CUSTOM_LIST_KEY = 'pwa_home_icon_customs';   // [{ id, data }]，data 为 512×512 PNG dataURL
const PWA_CUSTOM_LEGACY_KEY = 'pwa_home_icon_custom';  // 旧版单个自定义图标（仅用于迁移）
const PWA_CUSTOM_MAX = 8;
let pwaIconOriginal = null;                     // index.html 原始 link 地址，用于恢复默认

function captureOriginalPwaLinks() {
    if (pwaIconOriginal) return;
    pwaIconOriginal = {
        icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
        apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
        manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href')
    };
}

// 把任意图片居中裁成正方形并缩放到指定尺寸（避免非正方形图片被拉伸）
function pwaMakeIcon(src, size) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - side) / 2;
            const sy = (img.naturalHeight - side) / 2;
            const c = document.createElement('canvas');
            c.width = c.height = size;
            c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = src;
    });
}

// 把图标写入页面的 link 和 manifest（iOS 添加时读 apple-touch-icon，安卓安装时读 manifest）
async function applyPwaHomeIcon(src) {
    captureOriginalPwaLinks();
    const icon180 = await pwaMakeIcon(src, 180);
    const icon512 = await pwaMakeIcon(src, 512);

    document.querySelector('link[rel="apple-touch-icon"]').href = icon180;
    document.querySelector('link[rel="icon"]').href = icon512;

    const base = new URL('./', location.href).href;
    const manifest = {
        name: 'Whatever', short_name: 'Whatever', description: 'Whatever',
        start_url: base + 'index.html', scope: base,
        display: 'standalone', orientation: 'portrait',
        background_color: '#09090b', theme_color: '#09090b',
        icons: [{ src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' }]
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    document.querySelector('link[rel="manifest"]').href = url;
}

// 恢复 index.html 原本的图标与 manifest
function restorePwaDefaultIcon() {
    captureOriginalPwaLinks();
    if (pwaIconOriginal.apple) document.querySelector('link[rel="apple-touch-icon"]').href = pwaIconOriginal.apple;
    if (pwaIconOriginal.icon) document.querySelector('link[rel="icon"]').href = pwaIconOriginal.icon;
    if (pwaIconOriginal.manifest) document.querySelector('link[rel="manifest"]').href = pwaIconOriginal.manifest;
}

// 读取自定义图标列表（旧版单图标自动迁移成列表）
async function loadPwaCustoms() {
    let list = await safeDB.load(PWA_CUSTOM_LIST_KEY, null);
    if (!Array.isArray(list)) {
        list = [];
        const legacy = await safeDB.load(PWA_CUSTOM_LEGACY_KEY, null);
        if (legacy) {
            list.push({ id: 'legacy', data: legacy });
            await safeDB.save(PWA_CUSTOM_LIST_KEY, list);
        }
    }
    return list;
}

// 按已保存的选择应用图标（启动时也调用一次）
async function applyCurrentPwaIcon() {
    const cur = await safeDB.load(PWA_ICON_KEY, null);
    if (cur && cur.type === 'custom') {
        const list = await loadPwaCustoms();
        const item = list.find(x => x.id === cur.id) || list[0];
        if (item) return applyPwaHomeIcon(item.data);
    } else if (cur && cur.type === 'preset' && cur.id !== 'default') {
        const preset = PWA_ICON_PRESETS.find(p => p.id === cur.id);
        if (preset) return applyPwaHomeIcon(preset.src);
    }
    restorePwaDefaultIcon();
}

// 渲染格子：默认 / 图标二到四（内置，不可删）+ 自定义（可删）+ 上传
async function renderPwaIconGrid() {
    const grid = document.getElementById('pwaIconGrid');
    if (!grid) return;
    const cur = await safeDB.load(PWA_ICON_KEY, { type: 'preset', id: 'default' });
    const customs = await loadPwaCustoms();

    const card = (active, onclick, thumbHtml, name, delHtml = '') => `
        <div class="pwa-card ${active ? 'active' : ''}" onclick="${onclick}">
            <div class="pwa-thumb-wrap">
                <div class="pwa-thumb">${thumbHtml}</div>
                ${delHtml}
            </div>
            <span class="pwa-card-name mono-font">${name}</span>
        </div>`;

    let html = PWA_ICON_PRESETS.map(p => card(
        cur && cur.type === 'preset' && cur.id === p.id,
        `pickPwaHomeIcon('${p.id}')`,
        `<img src="${p.src}" alt="${p.name}">`,
        p.name
    )).join('');

    html += customs.map((c, i) => card(
        cur && cur.type === 'custom' && (cur.id === c.id || (!cur.id && i === 0)),
        `pickPwaCustomIcon('${c.id}')`,
        `<img src="${c.data}" alt="自定义${i + 1}">`,
        `自定义${i + 1}`,
        `<div class="pwa-del" title="删除" onclick="deletePwaCustomIcon('${c.id}', event)">×</div>`
    )).join('');

    html += card(false, "document.getElementById('pwaIconUploadInput').click()",
        '<span class="pwa-plus">+</span>', '上传');

    grid.innerHTML = html;
}

async function refreshPwaIconAfterChange(msg) {
    await applyCurrentPwaIcon();
    renderPwaIconGrid();
    showCapsuleTip(msg);
}

async function pickPwaHomeIcon(id) {
    await safeDB.save(PWA_ICON_KEY, { type: 'preset', id });
    await refreshPwaIconAfterChange('已更换。请删除桌面旧图标，重新添加到主屏幕才会生效');
}

async function pickPwaCustomIcon(id) {
    await safeDB.save(PWA_ICON_KEY, { type: 'custom', id });
    await refreshPwaIconAfterChange('已更换。请删除桌面旧图标，重新添加到主屏幕才会生效');
}

// 删除自定义图标（只允许删自定义；默认和内置图标没有删除入口）
async function deletePwaCustomIcon(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('删除这个自定义图标？')) return;

    const oldList = await loadPwaCustoms();
    const cur = await safeDB.load(PWA_ICON_KEY, null);
    const resolvedId = cur && cur.type === 'custom' ? (cur.id || (oldList[0] && oldList[0].id)) : null;

    await safeDB.save(PWA_CUSTOM_LIST_KEY, oldList.filter(x => x.id !== id));

    // 正在使用的图标被删了，回到默认
    if (resolvedId === id) {
        await safeDB.save(PWA_ICON_KEY, { type: 'preset', id: 'default' });
    }
    await refreshPwaIconAfterChange('已删除该自定义图标');
}

// 上传自己的图标：读取 → 居中裁成 512 方图 → 加入列表并选中
function handlePwaIconUpload(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        const list = await loadPwaCustoms();
        if (list.length >= PWA_CUSTOM_MAX) {
            showCapsuleTip(`自定义图标最多 ${PWA_CUSTOM_MAX} 个，请先删除一个`);
            return;
        }
        const square = await pwaMakeIcon(reader.result, 512);
        const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        list.push({ id, data: square });
        await safeDB.save(PWA_CUSTOM_LIST_KEY, list);
        await safeDB.save(PWA_ICON_KEY, { type: 'custom', id });
        await refreshPwaIconAfterChange('已上传。请删除桌面旧图标，重新添加到主屏幕才会生效');
    };
    reader.readAsDataURL(file);
}

// 展开 / 收起（只切换显示，不重新渲染）
function toggleApiTuningPanel() {
    const panel = document.getElementById('apiTuningPanel');
    const arrow = document.getElementById('apiTuningArrow');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    const open = !panel.classList.contains('collapsed');
    if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
}
function togglePwaIconPanel() {
    const panel = document.getElementById('pwaIconPanel');
    const arrow = document.getElementById('pwaIconArrow');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    const open = !panel.classList.contains('collapsed');
    if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
}

// 启动时恢复上次选择的桌面图标
document.addEventListener('DOMContentLoaded', () => {
    captureOriginalPwaLinks();
    applyCurrentPwaIcon();
});

/* ---- 聊天字体：在设置里设置，所有聊天统一使用（数据存本地数据库） ---- */
const CHAT_FONT_PRESETS_KEY = 'chat_font_presets_v1';
const CHAT_FONT_ACTIVE_KEY = 'chat_font_active_v1';
let chatFontPresetsCache = null;
let chatFontPending = null;

function toggleChatFontPanel() {
    const panel = document.getElementById('chatFontPanel');
    const arrow = document.getElementById('chatFontArrow');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    const open = !panel.classList.contains('collapsed');
    if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
    if (open) refreshChatFontList();
}
function chatFontEsc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function chatFontSafe(src) { return String(src).replace(/["'()\\\s]/g, ''); }

function applyChatFont(src) {
    let st = document.getElementById('chatFontStyle');
    if (!st) { st = document.createElement('style'); st.id = 'chatFontStyle'; document.head.appendChild(st); }
    if (!src) { st.textContent = ''; return; }
    st.textContent = `@font-face{font-family:'ChatUserFont';src:url("${chatFontSafe(src)}")}\nhtml, body, body *:not(svg):not(svg *){font-family:'ChatUserFont',-apple-system,sans-serif !important}`;
}
async function applyChatFontFromStore() {
    let act = null;
    try { act = window.DB ? await window.DB.load(CHAT_FONT_ACTIVE_KEY, null) : null; } catch (_) {}
    if (!act) { applyChatFont(''); return; }
    if (act.kind === 'url') { applyChatFont(act.url); return; }
    let data = '';
    try { data = window.DB ? await window.DB.load(act.key, '') : ''; } catch (_) {}
    applyChatFont(data || '');
}
async function loadChatFontPresets() {
    if (chatFontPresetsCache) return chatFontPresetsCache;
    let v = [];
    try { v = window.DB ? await window.DB.load(CHAT_FONT_PRESETS_KEY, []) : []; } catch (_) {}
    chatFontPresetsCache = Array.isArray(v) ? v : [];
    return chatFontPresetsCache;
}
async function saveChatFontPresets(list) {
    chatFontPresetsCache = list;
    if (window.DB) await window.DB.save(CHAT_FONT_PRESETS_KEY, list);
}
function showChatFontSave(on) {
    const b = document.getElementById('chatFontSave'); if (b) b.style.display = on ? '' : 'none';
}
function toggleChatFontUrl() {
    const row = document.getElementById('chatFontUrlRow'); if (!row) return;
    row.style.display = row.style.display === 'none' ? '' : 'none';
}
function onChatFontFile(el) {
    const file = el && el.files && el.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        chatFontPending = { kind: 'file', name: file.name.replace(/\.[^.]+$/, '') || '字体', src: String(reader.result || '') };
        applyChatFont(chatFontPending.src);
        showChatFontSave(true);
        toast('字体已上传，预览中，点「保存字体预设」');
    };
    reader.onerror = () => toast('字体读取失败，请换一个文件再试');
    reader.readAsDataURL(file);
    el.value = '';
}
function onChatFontUrl(v) {
    const url = String(v || '').trim();
    if (!/^https?:\/\//i.test(url)) { chatFontPending = null; showChatFontSave(false); return; }
    const last = (url.split('?')[0].split('/').pop() || '').replace(/\.[^.]+$/, '');
    chatFontPending = { kind: 'url', name: last || 'URL 字体', src: url };
    applyChatFont(url);
    showChatFontSave(true);
}
/* 先试着加载一次字体链接，8 秒内不能加载就视为失败 */
async function checkChatFontUrl(src) {
    const timeout = new Promise(res => setTimeout(() => res(false), 8000));
    const load = (async () => {
        try {
            const f = new FontFace('ChatFontCheck', `url("${chatFontSafe(src)}")`);
            await f.load();
            return true;
        } catch (_) { return false; }
    })();
    return Promise.race([load, timeout]);
}
async function saveChatFontPreset() {
    const p = chatFontPending;
    if (!p) { toast('先上传字体或填写字体 URL'); return; }
    const list = (await loadChatFontPresets()).slice();
    const id = 'fp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const item = { id, name: p.name, kind: p.kind };
    if (p.kind === 'file') {
        item.key = 'cfont_' + id;
        const ok = window.DB ? await window.DB.saveLarge(item.key, p.src) : false;
        if (!ok) { toast('这台设备的本地数据库不可用，字体存不下（可以改用字体 URL）'); return; }
    } else {
        toast('正在检查字体链接…');
        if (!(await checkChatFontUrl(p.src))) { toast('字体链接加载失败：请确认是字体文件，并且对方允许跨域访问'); return; }
        item.url = p.src;
    }
    list.unshift(item);
    await saveChatFontPresets(list);
    if (window.DB) await window.DB.save(CHAT_FONT_ACTIVE_KEY, p.kind === 'file' ? { kind: 'file', key: item.key } : { kind: 'url', url: p.src });
    chatFontPending = null;
    showChatFontSave(false);
    await applyChatFontFromStore();
    refreshChatFontList();
    toast('已保存字体预设「' + item.name + '」，所有聊天已使用');
}
async function pickChatFontPreset(i) {
    const item = (await loadChatFontPresets())[i]; if (!item) return;
    if (window.DB) await window.DB.save(CHAT_FONT_ACTIVE_KEY, item.kind === 'file' ? { kind: 'file', key: item.key } : { kind: 'url', url: item.url });
    chatFontPending = null;
    showChatFontSave(false);
    await applyChatFontFromStore();
    toast('已套用字体「' + item.name + '」');
}
async function pickDefaultChatFont() {
    if (window.DB) await window.DB.save(CHAT_FONT_ACTIVE_KEY, null);
    chatFontPending = null;
    showChatFontSave(false);
    applyChatFont('');
    toast('已恢复默认字体');
}
async function refreshChatFontList() {
    const el = document.getElementById('chatFontList'); if (!el) return;
    const list = await loadChatFontPresets();
    const items = list.map((p, i) => `<button class="font-btn font-preset-item" type="button" onclick="pickChatFontPreset(${i})">${chatFontEsc(p.name)}</button>`).join('');
    el.innerHTML = '<button class="font-btn font-preset-item" type="button" onclick="pickDefaultChatFont()">默认字体</button>' + (items || '<div class="font-preset-empty">还没有字体预设</div>');
}
window.addEventListener('load', () => { applyChatFontFromStore(); refreshChatFontList(); });
