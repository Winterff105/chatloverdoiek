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

/* 遍历所有图标文字、图标底座与小组件，逐个精准检测判定并赋予深/浅样式 */
function updateAllElementsAdaptiveContrast() {
    if (!window.enableAdaptiveContrast) return; // 默认关闭自适应检测，彻底杜绝移动闪烁
    if (window.isGlobalDragging) return; // 拖拽移动时锁死检测，防止高频乱闪
    if (!wallpaperCtx || !phoneContainer) return;
    const containerRect = phoneContainer.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    document.querySelectorAll('.app-item, .widget-item').forEach(el => {
        if (el.classList.contains('dragging')) return;
        const rect = el.getBoundingClientRect();
        const luma = sampleBrightnessAtRect(rect, containerRect);
        if (luma < 135) {
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
    const wallpaperPath = isLight ? 'assets/Light/bizhi.png' : 'assets/Dark/bizhi.png';
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

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化 DOM 引用
    phoneContainer = document.getElementById('phoneContainer');
    desktopTrack = document.getElementById('desktopTrack');
    dotsContainer = document.getElementById('dotsContainer');
    addPageBtn = document.getElementById('addPageBtn');
    dockBar = document.getElementById('dockBar');
    avatarFileInput = document.getElementById('avatarFileInput');
    coupleAvatarInput = document.getElementById('coupleAvatarInput');

    // 异步从无限制 DB 加载保存的主题模式、自定义头像与自适应检测开关状态
    if (typeof DB !== 'undefined') {
        const savedTheme = await DB.load('theme', 'theme-dark');
        if (savedTheme) {
            phoneContainer.className = `phone-container ${savedTheme}`;
        } else {
            phoneContainer.classList.add('theme-dark');
        }
        const savedAvatar1 = await DB.load('avatar_female', null);
        const savedAvatar2 = await DB.load('avatar_male', null);
        if (savedAvatar1) currentUploadedAvatar = savedAvatar1;
        if (savedAvatar2) currentCoupleAvatar = savedAvatar2;

        const savedAdaptive = await DB.load('enable_adaptive_contrast', true);
        window.enableAdaptiveContrast = savedAdaptive;

        const savedMode = await DB.load('icon_style_mode', 'dark');
        const customColor = await DB.load('custom_icon_color', '#ffffff');
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
        phoneContainer.classList.add('theme-dark');
        window.enableAdaptiveContrast = true;
    }

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
});
