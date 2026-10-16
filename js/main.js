/* =========================================
   9. 主入口与壁纸明暗自适应检测引擎
   ========================================= */
let wallpaperCanvas = null;
let wallpaperCtx = null;

function loadWallpaperSampler(imgSrc) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgSrc;
    img.onload = () => {
        try {
            wallpaperCanvas = document.createElement('canvas');
            wallpaperCtx = wallpaperCanvas.getContext('2d', { willReadFrequently: true });
            wallpaperCanvas.width = 300;
            wallpaperCanvas.height = 650;
            wallpaperCtx.drawImage(img, 0, 0, 300, 650);
            updateAllElementsAdaptiveContrast();
        } catch (e) {
            phoneContainer.classList.add('theme-light');
        }
    };
    img.onerror = () => {
        phoneContainer.classList.add('theme-light');
    };
}

/* 核心算法：高斯加权宏观环境光区域采样（防止局部杂色噪点误判） */
function sampleBrightnessAtRect(elemRect, containerRect) {
    if (!wallpaperCtx || !wallpaperCanvas) return 180;

    // 扩展采样边界（包含图标外围 20px 的宏观环境光）
    const padding = 20;
    const relLeft = (elemRect.left - containerRect.left - padding) / containerRect.width;
    const relTop = (elemRect.top - containerRect.top - padding) / containerRect.height;
    const relWidth = (elemRect.width + padding * 2) / containerRect.width;
    const relHeight = (elemRect.height + padding * 2) / containerRect.height;

    const sx = Math.max(0, Math.min(299, Math.floor(relLeft * 300)));
    const sy = Math.max(0, Math.min(649, Math.floor(relTop * 650)));
    const sw = Math.max(1, Math.min(300 - sx, Math.floor(relWidth * 300)));
    const sh = Math.max(1, Math.min(650 - sy, Math.floor(relHeight * 650)));

    const imgData = wallpaperCtx.getImageData(sx, sy, sw, sh).data;
    let weightedLuma = 0;
    let totalWeight = 0;

    // 高斯中心权重采样 (越接近中心权重越高，外围平滑过渡)
    const cx = sw / 2;
    const cy = sh / 2;
    for (let y = 0; y < sh; y += 2) {
        for (let x = 0; x < sw; x += 2) {
            const i = (y * sw + x) * 4;
            const dist = Math.hypot(x - cx, y - cy);
            const weight = Math.exp(-(dist * dist) / (2 * 40 * 40));
            const luma = (imgData[i] * 299 + imgData[i + 1] * 587 + imgData[i + 2] * 114) / 1000;
            weightedLuma += luma * weight;
            totalWeight += weight;
        }
    }
    return totalWeight > 0 ? (weightedLuma / totalWeight) : 180;
}

/* 遍历所有图标文字、图标底座与小组件，逐个精准检测判定并赋予深/浅样式（高灵敏模式） */
function updateAllElementsAdaptiveContrast() {
    if (!window.enableAdaptiveContrast) return; 
    if (window.isGlobalDragging) return; 
    if (!wallpaperCtx || !phoneContainer) return;
    const containerRect = phoneContainer.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    document.querySelectorAll('.app-item, .widget-item').forEach(el => {
        if (el.classList.contains('dragging')) return;
        const rect = el.getBoundingClientRect();
        const luma = sampleBrightnessAtRect(rect, containerRect);
        // 阈值设为 140，提高浅色背景判定的灵敏度
        if (luma < 140) {
            el.classList.add('adaptive-dark');
            el.classList.remove('adaptive-light');
        } else {
            el.classList.add('adaptive-light');
            el.classList.remove('adaptive-dark');
        }
    });
}

function updateDesktopWallpaperByTheme() {
    if (!phoneContainer) return;
    const isLight = phoneContainer.classList.contains('theme-light');
    // 有自定义桌面壁纸时用它取色，否则用当前日夜对应的内置壁纸
    const wallpaperPath = window.currentDesktopWallpaperSrc || (isLight ? 'assets/Light/bizhi.png' : 'assets/Dark/bizhi.png');
    loadWallpaperSampler(wallpaperPath);

    // 默认头像随主题自动切换 Light/Dark 文件夹（若用户未上传自定义本地或 Base64 头像）
    if (!currentUploadedAvatar.startsWith('data:') && !currentUploadedAvatar.includes('blob:')) {
        currentUploadedAvatar = isLight ? 'assets/Light/avatar-female.png' : 'assets/Dark/avatar-female.png';
    }
    if (!currentCoupleAvatar.startsWith('data:') && !currentCoupleAvatar.includes('blob:')) {
        currentCoupleAvatar = isLight ? 'assets/Light/avatar-male.png' : 'assets/Dark/avatar-male.png';
    }

    // 触发桌面重渲染，确保小组件与头像实时同步到当前主题目录
    if (typeof renderUI === 'function') {
        renderUI();
    }
}

window.noirCustomAppIcons = {};

function applyCustomAppIconsToDesktop() {
    const customIcons = window.noirCustomAppIcons || {};
    document.querySelectorAll('.app-item').forEach(el => {
        const appId = el.getAttribute('data-app-id') || el.dataset.app;
        if (appId && customIcons[appId]) {
            const glyphBox = el.querySelector('.floating-glyph');
            if (glyphBox) {
                glyphBox.innerHTML = `<img src="${customIcons[appId]}" style="width:100%; height:100%; object-fit:cover; border-radius:14px;">`;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化 DOM 引用
    phoneContainer = document.getElementById('phoneContainer');
    desktopTrack = document.getElementById('desktopTrack');
    dotsContainer = document.getElementById('dotsContainer');
    addPageBtn = document.getElementById('addPageBtn');
    dockBar = document.getElementById('dockBar');
    avatarFileInput = document.getElementById('avatarFileInput');
    coupleAvatarInput = document.getElementById('coupleAvatarInput');

    // 异步从无限制 DB 加载保存的主题模式、自定义头像、应用图标与自适应检测开关状态
    if (typeof DB !== 'undefined') {
        // 没有手动选择过（模式为 auto）时，跟随系统的日夜间
        const savedThemeMode = await DB.load('settings_theme_mode', 'auto');
        let savedTheme = await DB.load('theme', 'theme-dark');
        if (savedThemeMode === 'auto') {
            savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'theme-light' : 'theme-dark';
        }
        if (savedTheme) {
            phoneContainer.className = `phone-container ${savedTheme}`;
        } else {
            phoneContainer.classList.add('theme-dark');
        }
        const savedAvatar1 = await DB.load('avatar_female', null);
        const savedAvatar2 = await DB.load('avatar_male', null);
        if (savedAvatar1) currentUploadedAvatar = savedAvatar1;
        if (savedAvatar2) currentCoupleAvatar = savedAvatar2;

        window.noirCustomAppIcons = await DB.load('app_custom_icons', {});

        // 桌面 App 图标材质（方圆度 / 磨砂 / 透明度 / 材质 / 边框）
        const savedIconStyle = await DB.load('app_icon_style', null);
        if (savedIconStyle && typeof applyAppIconStyle === 'function') {
            applyAppIconStyle(savedIconStyle);
        }



        const savedAdaptive = await DB.load('enable_adaptive_contrast', true);
        window.enableAdaptiveContrast = savedAdaptive;

        const savedMode = await DB.load('icon_style_mode', 'dark');
        const customColor = await DB.load('custom_icon_color', '#ffffff');
        const savedAppNameColor = await DB.load('app_name_color', null);
        if (savedAppNameColor) {
            applyAppNameColorVar(savedAppNameColor);
        }

        const savedChatStyle = await DB.load('chat_svg_style', 'default');
        if (savedChatStyle && window.APPS && window.APPS['chat'] && typeof window.getDefaultAppSvgHtml === 'function') {
            window.APPS['chat'].svg = window.getDefaultAppSvgHtml('chat', savedChatStyle);
        }
        if (savedAdaptive) {
            phoneContainer.classList.remove('force-dark', 'force-light', 'force-custom');
        } else {
            phoneContainer.classList.remove('force-dark', 'force-light', 'force-custom');
            if (savedMode === 'dark') {
                phoneContainer.classList.add('force-dark');
            } else if (savedMode === 'light') {
                phoneContainer.classList.add('force-light');
            } else if (savedMode === 'custom') {
                phoneContainer.classList.add('force-custom');
                phoneContainer.style.setProperty('--custom-icon-color', customColor);
            }
        }
    } else {
        // 没有 DB 时使用 safeDB（settings.js 中定义）；未手动选择过则跟随系统
        const elseThemeMode = await safeDB.load('settings_theme_mode', 'auto');
        phoneContainer.classList.add(resolveThemeClass(elseThemeMode));
        window.enableAdaptiveContrast = true;
    }

    // 解析桌面壁纸：自己上传 > 内置选择 > 跟随系统
    await resolveDesktopWallpaper();
    updateDesktopWallpaperByTheme();

    // 绑定加号按钮事件
    addPageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        totalPages++;
        renderUI();
        goToPage(totalPages - 1);
    });

    // 绑定点击桌面空白处退出编辑模式
    document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.app-item, .widget-item, .add-page-btn')) {
            phoneContainer.classList.remove('edit-mode');
        }
    });

    // 上传照片事件监听（异步存入无限制 DB）
    avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                currentUploadedAvatar = event.target.result;
                if (typeof DB !== 'undefined') {
                    await DB.save('avatar_female', currentUploadedAvatar);
                }
                renderUI();
            };
            reader.readAsDataURL(file);
        }
    });

    coupleAvatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                currentCoupleAvatar = event.target.result;
                if (typeof DB !== 'undefined') {
                    await DB.save('avatar_male', currentCoupleAvatar);
                }
                renderUI();
            };
            reader.readAsDataURL(file);
        }
    });

    // 窗口尺寸改变时更新 Dock
    window.addEventListener('resize', () => {
        checkDockAnimation();
    });

    // 初始渲染
    renderUI();

    // 触发真实照片与资源预加载检测，确保所有照片加载完毕后再进入桌面
    if (window.PhotoLoader && typeof window.PhotoLoader.start === 'function') {
        // 把桌面壁纸、头像也交给开屏等待，全部读完才进入
        const themeWallpaper = phoneContainer.classList.contains('theme-light') ? 'assets/Light/bizhi.png' : 'assets/Dark/bizhi.png';
        window.PhotoLoader.start([
            window.currentDesktopWallpaperSrc,
            themeWallpaper,
            currentUploadedAvatar,
            currentCoupleAvatar
        ]);
    }
});
