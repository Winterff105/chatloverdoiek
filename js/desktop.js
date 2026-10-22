/* ===== apps.js ===== */
/* =========================================
   1. 高级银灰·多层架构·带半透明星芒 App SVG 图案库
   ========================================= */
/* =========================================
   1. 高定纯线条艺术 · App SVG 图案库
   ========================================= */
const APPS = {
    'chat': {
        name: 'chat',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M13.5 8.5h12a6 6 0 0 1 6 6v7a6 6 0 0 1-6 6H18l-4.5 3.5v-3.5a6 6 0 0 1-6-6v-7a6 6 0 0 1 6-6z"/>
            <line class="stroke-primary" x1="13.5" y1="15.5" x2="25.5" y2="15.5"/>
            <line class="stroke-secondary" x1="13.5" y1="20" x2="20.5" y2="20"/>
            <circle class="fill-solid" cx="24" cy="20" r="1.1"/>
            <path class="star-solid-translucent" d="M33.5 6v4M31.5 8h4"/>
        </svg>`
    },
    'weather': {
        name: '天气',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M26 8.5v2.6M33.5 16h-2.6M32 10.5l-1.8 1.8M20 16h2.2"/>
            <circle class="stroke-secondary" cx="26" cy="16" r="5" fill="none" stroke-dasharray="15.7 15.7"/>
            <path class="stroke-primary" d="M11 28.5h18a4.2 4.2 0 0 0 .6-8.4 6.5 6.5 0 0 0-12.6-1.9 5.2 5.2 0 0 0-6 10.3z"/>
            <path class="star-solid-translucent" d="M9 9v3M7.5 10.5h3"/>
        </svg>`
    },
    'gallery': {
        name: '相册',
        svg: `<svg viewBox="0 0 40 40">
            <rect class="stroke-secondary" x="10.5" y="9" width="19" height="17" rx="2.5" transform="rotate(-6 20 17.5)"/>
            <rect class="stroke-primary" x="9" y="12" width="20" height="17" rx="2.5" transform="rotate(4 19 20.5)"/>
            <circle class="stroke-secondary" cx="15" cy="18" r="1.8"/>
            <path class="stroke-primary" d="M11.5 27l5.5-5 3.5 3 3.5-3 5 4.5"/>
            <path class="star-solid-translucent" d="M31 7v4M29 9h4"/>
        </svg>`
    },
    'notes': {
        name: '便签',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M10 29V10.5A2.5 2.5 0 0 1 12.5 8H28a2.5 2.5 0 0 1 2.5 2.5V29a2.5 2.5 0 0 1-2.5 2.5h-15.5A2.5 2.5 0 0 1 10 29z"/>
            <path class="stroke-secondary" d="M24 8v4.5a2 2 0 0 0 2 2h4.5"/>
            <line class="stroke-primary" x1="15" y1="17" x2="25" y2="17"/>
            <line class="stroke-secondary" x1="15" y1="21" x2="22" y2="21"/>
            <line class="stroke-secondary" x1="15" y1="25" x2="19" y2="25"/>
            <path class="star-solid-translucent" d="M31 6v3.5M29.5 7.7h3"/>
        </svg>`
    },
    'settings': {
        name: '设置',
        svg: `<svg viewBox="0 0 40 40">
            <line class="stroke-primary" x1="9" y1="15" x2="31" y2="15"/>
            <line class="stroke-primary" x1="9" y1="20" x2="31" y2="20"/>
            <line class="stroke-primary" x1="9" y1="25" x2="31" y2="25"/>
            <circle class="stroke-secondary" cx="24" cy="15" r="2.4" fill="none"/>
            <circle class="stroke-secondary" cx="14" cy="20" r="2.4" fill="none"/>
            <circle class="stroke-secondary" cx="22" cy="25" r="2.4" fill="none"/>
            <path class="star-solid-translucent" d="M31 7v4M29 9h4"/>
        </svg>`
    },
    'phone': {
        name: '电话',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M12.5 11.5a2.5 2.5 0 0 0-2.5 2.5c0 9.7 7.8 17.5 17.5 17.5a2.5 2.5 0 0 0 2.5-2.5v-3a2.5 2.5 0 0 0-2-2.4l-3.6-.7a2.5 2.5 0 0 0-2.3.9l-1 1.2a12.5 12.5 0 0 1-5.5-5.5l1.2-1a2.5 2.5 0 0 0 .9-2.3l-.7-3.6a2.5 2.5 0 0 0-2.4-2z"/>
            <path class="star-solid-translucent" d="M31 8v4M29 10h4"/>
        </svg>`
    },
    'world': {
        name: 'World',
        svg: `<svg viewBox="0 0 40 40">
            <circle class="stroke-primary" cx="20" cy="20" r="11"/>
            <circle class="stroke-secondary" cx="20" cy="20" r="7.8" stroke-dasharray="2.5 3.5"/>
            <polygon class="stroke-primary" points="24.5,12.5 21.5,18.5 15.5,27.5 18.5,21.5"/>
            <circle class="stroke-primary" cx="20" cy="20" r="0.7" fill="currentColor" stroke="none"/>
            <path class="star-solid-translucent" d="M31 6v4M29 8h4"/>
        </svg>`
    },
    'music': {
        name: '音乐',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M16 25.5V11l12-3.5v13"/>
            <path class="stroke-secondary" d="M16 14.5l12-3.5"/>
            <circle class="stroke-primary" cx="13" cy="25.5" r="3"/>
            <circle class="stroke-primary" cx="25" cy="20.5" r="3"/>
            <path class="star-solid-translucent" d="M32 7v4M30 9h4"/>
        </svg>`
    },
    'camera': {
        name: '相机',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-primary" d="M9 15V12a3 3 0 0 1 3-3h3"/>
            <path class="stroke-primary" d="M31 15V12a3 3 0 0 0-3-3h-3"/>
            <path class="stroke-primary" d="M9 25v3a3 3 0 0 0 3 3h3"/>
            <path class="stroke-primary" d="M31 25v3a3 3 0 0 1-3 3h-3"/>
            <circle class="stroke-primary" cx="20" cy="20" r="5.5"/>
            <circle class="stroke-secondary" cx="20" cy="20" r="2.4"/>
            <path class="star-solid-translucent" d="M20 5.5v3M18.5 7h3"/>
        </svg>`
    },
    'mail': {
        name: '信件',
        svg: `<svg viewBox="0 0 40 40">
            <rect class="stroke-primary" x="7.5" y="11" width="25" height="17" rx="2.5"/>
            <path class="stroke-primary" d="M8 12.5l12 8.5 12-8.5"/>
            <path class="stroke-secondary" d="M8 26.5l7.5-6M32 26.5l-7.5-6"/>
            <path class="star-solid-translucent" d="M31 7v3.5M29.5 8.7h3"/>
        </svg>`
    },
    'clock': {
        name: '时钟',
        svg: `<svg viewBox="0 0 40 40">
            <circle class="stroke-primary" cx="20" cy="20" r="11.5"/>
            <circle class="stroke-secondary" cx="20" cy="20" r="8.5" stroke-dasharray="1.5 4"/>
            <path class="stroke-primary" d="M20 12.5V20l5 3"/>
            <circle class="stroke-primary" cx="20" cy="20" r="1" fill="currentColor" stroke="none"/>
            <path class="star-solid-translucent" d="M31 6v4M29 8h4"/>
        </svg>`
    },
    'calendar': {
        name: '日历',
        svg: `<svg viewBox="0 0 40 40">
            <rect class="stroke-primary" x="8" y="9" width="24" height="21" rx="3"/>
            <line class="stroke-primary" x1="8" y1="15.5" x2="32" y2="15.5"/>
            <line class="stroke-secondary" x1="13" y1="6.5" x2="13" y2="11.5"/>
            <line class="stroke-secondary" x1="27" y1="6.5" x2="27" y2="11.5"/>
            <circle class="stroke-secondary" cx="14" cy="20" r="0.8" fill="currentColor"/>
            <circle class="stroke-secondary" cx="20" cy="20" r="0.8" fill="currentColor"/>
            <circle class="stroke-secondary" cx="26" cy="20" r="0.8" fill="currentColor"/>
            <circle class="stroke-primary" cx="14" cy="25" r="0.8" fill="currentColor"/>
            <circle class="stroke-primary" cx="20" cy="25" r="0.8" fill="currentColor"/>
            <path class="star-solid-translucent" d="M31 5.5v3M29.5 7h3"/>
        </svg>`
    },
    'book': {
        name: 'little Leila',
        svg: `<div style="position:relative;width:100%;height:100%;"><img src="assets/app/github.jpg" alt="Leila" style="width:100%;height:100%;object-fit:cover;border-radius:22%;display:block;"><span style="position:absolute;left:0;right:0;bottom:9%;text-align:center;font:600 7px/1 -apple-system,'Helvetica Neue',Arial,sans-serif;letter-spacing:.6px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.55);pointer-events:none;">little</span></div>`
    },
    'wallet': {
        name: '卡包',
        svg: `<svg viewBox="0 0 40 40">
            <rect class="stroke-secondary" x="12" y="8" width="16" height="10.5" rx="2" transform="rotate(-8 20 13)"/>
            <rect class="stroke-secondary" x="12" y="11" width="16" height="10.5" rx="2" transform="rotate(-3 20 16)"/>
            <rect class="stroke-primary" x="9.5" y="14" width="21" height="13" rx="2.5"/>
            <line class="stroke-secondary" x1="9.5" y1="18.5" x2="30.5" y2="18.5"/>
            <path class="star-solid-translucent" d="M31 7v3M29.5 8.5h3"/>
        </svg>`
    },
    'game': {
        name: '游戏',
        svg: `<svg viewBox="0 0 40 40">
            <rect class="stroke-primary" x="7" y="13" width="26" height="14" rx="7"/>
            <path class="stroke-primary" d="M14 17v6M11 20h6"/>
            <circle class="stroke-primary" cx="25" cy="18" r="1" fill="currentColor" stroke="none"/>
            <circle class="stroke-secondary" cx="28.5" cy="22" r="1" fill="currentColor" stroke="none"/>
            <path class="star-solid-translucent" d="M31 7v3M29.5 8.5h3"/>
        </svg>`
    },
    'todo': {
        name: '预设',
        svg: `<svg viewBox="0 0 40 40">
            <circle class="stroke-primary" cx="14" cy="15" r="4"/>
            <path class="stroke-primary" d="M12.2 15l1.3 1.3 2.3-2.6"/>
            <circle class="stroke-secondary" cx="14" cy="24.5" r="4"/>
            <path class="stroke-secondary" d="M12.2 24.5l1.3 1.3 2.3-2.6"/>
            <line class="stroke-primary" x1="21.5" y1="15" x2="31" y2="15"/>
            <line class="stroke-secondary" x1="21.5" y1="24.5" x2="29" y2="24.5"/>
            <path class="star-solid-translucent" d="M31 6v3M29.5 7.5h3"/>
        </svg>`
    },
    'worldbook': {
        name: '世界书',
        svg: `<svg viewBox="0 0 40 40">
            <path class="stroke-secondary" d="M4 13v-4.5a4.5 4.5 0 0 1 4.5-4.5H13"/>
            <path class="stroke-secondary" d="M36 27v4.5a4.5 4.5 0 0 1-4.5 4.5H27"/>
            <g transform="translate(3.2 6) scale(0.7)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <ellipse class="stroke-primary" cx="24" cy="5" rx="5" ry="1.6"/>
                <path class="stroke-primary" d="M24 16.5C22.2 12.6 16.8 11.2 13.6 14.4 10.2 17.8 11.2 23.4 14 27c3 3.8 7 6.6 10 8.4 3-1.8 7-4.6 10-8.4 2.8-3.6 3.8-9.2.4-12.6-3.2-3.2-8.6-1.8-10.4 2.1z"/>
                <path class="stroke-secondary" d="M24 16.5v20"/>
                <path class="stroke-secondary" d="M17.5 21.5h13"/>
                <path class="stroke-primary" d="M14.5 14.2c-3-.6-6.4.6-8.2 3.6-.8 1.4-1.2 3.2-1 5"/>
                <path class="stroke-primary" d="M33.5 14.2c3-.6 6.4.6 8.2 3.6.8 1.4 1.2 3.2 1 5"/>
                <path class="star-solid-translucent" transform="translate(40 8) scale(.5)" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z"/>
            </g>
        </svg>`
    }

};

// 组件手绘可爱爱心矢量
const COMPONENT_HEART_SVG = `<svg viewBox="0 0 24 16" width="14" height="10" style="display:inline-block; vertical-align:middle; stroke:none; fill:var(--svg-stroke);"><path d="M 12 15.2 C 7.5 12.2 3.5 10.2 3.5 6.8 A 4.2 3.4 0 0 1 12 5 A 4.2 3.4 0 0 1 20.5 6.8 C 20.5 10.2 16.5 12.2 12 15.2 Z"/></svg>`;
window.APPS = APPS;

/* ===== state.js ===== */
/* =========================================
   2. 状态模型：多页桌面系统 (初始 2 页)
   ========================================= */
let totalPages = 2;
let currentPageIndex = 0;

let currentUploadedAvatar = "assets/Dark/avatar-female.png";
let currentCoupleAvatar = "assets/Dark/avatar-male.png";

let desktopItems = [
    // ===== 第一页 (page: 0) =====
    { id: 'w-profile', type: 'widget-profile', page: 0, slot: 1, span: 2, rowSpan: 2 },
    { id: 'w-polaroid', type: 'widget-polaroid', page: 0, slot: 8, span: 2, rowSpan: 1 },
    { id: 'w-heartbeat', type: 'widget-heartbeat', page: 0, slot: 12, span: 2, rowSpan: 1 },
    
    // 右边上面两个
    { id: 'chat', type: 'app', page: 0, slot: 10, span: 1, rowSpan: 1 },
    { id: 'weather', type: 'app', page: 0, slot: 11, span: 1, rowSpan: 1 },
    
    // 右边下面两个
    { id: 'settings', type: 'app', page: 0, slot: 14, span: 1, rowSpan: 1 },
    { id: 'mail', type: 'app', page: 0, slot: 15, span: 1, rowSpan: 1 },

    // ===== 第二页 (page: 1) 错落排布 =====
    { id: 'w-mp3', type: 'widget-mp3', page: 1, slot: 0, span: 2, rowSpan: 2 },
    { id: 'gallery', type: 'app', page: 1, slot: 2, span: 1, rowSpan: 1 },
    { id: 'notes', type: 'app', page: 1, slot: 3, span: 1, rowSpan: 1 },
    { id: 'clock', type: 'app', page: 1, slot: 6, span: 1, rowSpan: 1 },
    { id: 'calendar', type: 'app', page: 1, slot: 7, span: 1, rowSpan: 1 },
    { id: 'book', type: 'app', page: 1, slot: 8, span: 1, rowSpan: 1 },
    { id: 'wallet', type: 'app', page: 1, slot: 9, span: 1, rowSpan: 1 },
    { id: 'w-dialogue', type: 'widget-dialogue', page: 1, slot: 10, span: 2, rowSpan: 2 },
    { id: 'game', type: 'app', page: 1, slot: 12, span: 1, rowSpan: 1 },
    { id: 'todo', type: 'app', page: 1, slot: 13, span: 1, rowSpan: 1 }
];

let dockData = ['phone', 'world', 'music', 'worldbook'];

// 全局 DOM 引用 (在 main.js 中初始化)
let phoneContainer;
let desktopTrack;
let dotsContainer;
let addPageBtn;
let dockBar;
let avatarFileInput;
let coupleAvatarInput;

/* ===== grid.js ===== */
/* =========================================
   3. 空间检测与防穿模核心算法
   ========================================= */
function getOccupiedSlots(slot, span, rowSpan) {
    const startRow = Math.floor(slot / 4);
    const startCol = slot % 4;

    if (startCol + span > 4 || startRow + rowSpan > 5) {
        return null;
    }

    const slots = [];
    for (let r = 0; r < rowSpan; r++) {
        for (let c = 0; c < span; c++) {
            slots.push((startRow + r) * 4 + (startCol + c));
        }
    }
    return slots;
}

function buildPageOccupancyMap(pageIdx, excludeItemId) {
    const map = Array(20).fill(null);
    desktopItems.forEach(item => {
        if (item.page === pageIdx && item.id !== excludeItemId) {
            const occ = getOccupiedSlots(item.slot, item.span, item.rowSpan);
            if (occ) {
                occ.forEach(s => {
                    map[s] = item;
                });
            }
        }
    });
    return map;
}

/* ===== drag.js ===== */
/* =========================================
   6. 拖拽引擎
   ========================================= */
let dragSession = null;
let dragListenersCleanup = null;

// 统一收尾：不管怎么结束（正常松手 / 被系统打断 / 下一次按下），都清理干净
function resetDragState() {
    if (dragListenersCleanup) {
        dragListenersCleanup();
        dragListenersCleanup = null;
    }
    if (dragSession) {
        dragSession.avatar.remove();
        dragSession.sourceEl.classList.remove('dragging');
        dragSession = null;
    }
    document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));
    window.isGlobalDragging = false;
}

function attachDragAndHoldEvents(el, itemData) {
    let startX = 0, startY = 0;
    let isDragging = false;
    let holdTimer = null;
    let didTriggerHold = false;

    el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.profile-avatar-wrap, .hb-avatar-wrap, .chip-avatar')) return;

        // 新的按下之前，先清掉上一次残留的拖拽状态
        resetDragState();

        startX = e.clientX;
        startY = e.clientY;
        isDragging = false;
        didTriggerHold = false;

        holdTimer = setTimeout(() => {
            didTriggerHold = true;
            phoneContainer.classList.add('edit-mode');
            if (navigator.vibrate) navigator.vibrate(40);

            let existingToast = document.getElementById('globalEditToast');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.id = 'globalEditToast';
            toast.className = 'global-edit-toast mono-font';
            toast.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>已进入编辑模式…</span>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 20);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, 1600);
        }, 500);

        const removeListeners = () => {
            clearTimeout(holdTimer);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
        };

        const onMove = (moveEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 7) clearTimeout(holdTimer);

            if (!isDragging && dist > 7) {
                isDragging = true;
                window.isGlobalDragging = true;
                el.classList.add('dragging');

                const avatar = el.cloneNode(true);
                const colorModeClass = el.classList.contains('adaptive-light') ? 'adaptive-light' : 'adaptive-dark';
                avatar.className = `drag-avatar ${colorModeClass}`;
                avatar.style.width = `${el.offsetWidth}px`;
                avatar.style.height = `${el.offsetHeight}px`;
                document.body.appendChild(avatar);

                dragSession = { sourceEl: el, item: itemData, avatar: avatar };
            }

            if (isDragging && dragSession) {
                // 用 transform 移动，比改 left/top 更流畅，且以手指为中心
                dragSession.avatar.style.transform =
                    `translate(${moveEvent.clientX}px, ${moveEvent.clientY}px) translate(-50%, -50%)`;

                checkEdgePageFlip(moveEvent.clientX);

                // 跟随图标 pointer-events:none，elementFromPoint 会自动穿透它，不需要隐藏再显示
                const hoverEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));

                const hoverTarget = hoverEl ? hoverEl.closest('.app-item') : null;
                if (hoverTarget && hoverTarget !== el && itemData.span === 1 && hoverTarget.dataset.type === 'app') {
                    hoverTarget.classList.add('target-hover');
                }
            }
        };

        const onUp = (upEvent) => {
            removeListeners();
            dragListenersCleanup = null;

            if (isDragging && dragSession) {
                const session = dragSession;
                dragSession = null;
                session.avatar.remove();
                el.classList.remove('dragging');
                document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));

                const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                executeDrop(dropTarget, session, upEvent);

                setTimeout(() => {
                    window.isGlobalDragging = false;
                    if (typeof updateAllElementsAdaptiveContrast === 'function') {
                        updateAllElementsAdaptiveContrast();
                    }
                }, 300);
            } else {
                window.isGlobalDragging = false;
                const isEditMode = phoneContainer.classList.contains('edit-mode');
                if (itemData.type === 'app' && !didTriggerHold) {
                    // Normal tap must open the Information app too; previously only Settings
                    // opened outside edit mode, making the Chat/Information icon look dead.
                    // 普通点击直接打开的应用：设置、聊天、Little Lace（book）；其他应用在编辑模式下才打开
                    const TAP_OPENS = ['settings', 'chat', 'book', 'worldbook', 'todo', 'world'];
                    if (TAP_OPENS.includes(itemData.id) || isEditMode) {
                        phoneContainer.classList.remove('edit-mode');
                        if (typeof openApp === 'function') openApp(itemData.id);
                    }
                }
            }
            isDragging = false;
        };

        // 被系统打断（比如浏览器接管了滚动）：只清理，不执行放置
        const onCancel = () => {
            removeListeners();
            dragListenersCleanup = null;
            isDragging = false;
            resetDragState();
            if (typeof renderUI === 'function') renderUI();
        };

        dragListenersCleanup = removeListeners;
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
    });
}

let flipThrottle = false;
function checkEdgePageFlip(clientX) {
    if (flipThrottle) return;
    const containerRect = phoneContainer.getBoundingClientRect();

    if (clientX < containerRect.left + 35 && currentPageIndex > 0) {
        flipThrottle = true;
        goToPage(currentPageIndex - 1);
        setTimeout(() => { flipThrottle = false; }, 600);
    } else if (clientX > containerRect.right - 35 && currentPageIndex < totalPages - 1) {
        flipThrottle = true;
        goToPage(currentPageIndex + 1);
        setTimeout(() => { flipThrottle = false; }, 600);
    }
}

function executeDrop(targetEl, session, upEvent) {
    const { item } = session;
    const fromLoc = item.location;
    const fromIdx = item.index;

    // 1. 拖入 Dock 栏 (仅允许 1×1 软件)
    const dockTarget = targetEl ? targetEl.closest('#dockBar') : null;
    if (dockTarget && item.span === 1) {
        if (fromLoc === 'desktop' && dockData.length < 4) {
            desktopItems = desktopItems.filter(x => x.id !== item.id);
            dockData.push(item.id);
            renderUI(item.id);
            return;
        }
    }

            // 2. 落在当前页的网格槽位中
            const activePageEl = document.querySelector(`.desktop-page[data-page-index="${currentPageIndex}"]`);
            if (activePageEl) {
                const pageRect = activePageEl.getBoundingClientRect();
                if (
                    upEvent.clientX >= pageRect.left && upEvent.clientX <= pageRect.right &&
                    upEvent.clientY >= pageRect.top && upEvent.clientY <= pageRect.bottom
                ) {
                    const style = window.getComputedStyle(activePageEl);
                    const padLeft = parseFloat(style.paddingLeft) || 16;
                    const padRight = parseFloat(style.paddingRight) || 16;
                    const colGap = parseFloat(style.columnGap || style.gridColumnGap) || 10;
                    const rowGap = parseFloat(style.rowGap || style.gridRowGap) || 12;

                    const rowHeight = 88;
                    const totalGridHeight = 5 * rowHeight + 4 * rowGap;
                    const gridTopOffset = Math.max(0, (pageRect.height - totalGridHeight) / 2);

                    const contentWidth = pageRect.width - padLeft - padRight;
                    const colWidth = (contentWidth - 3 * colGap) / 4;

                    const relX = upEvent.clientX - (pageRect.left + padLeft);
                    const relY = upEvent.clientY - (pageRect.top + gridTopOffset);

                    let targetCol = Math.floor((relX + colGap / 2) / (colWidth + colGap));
                    let targetRow = Math.floor((relY + rowGap / 2) / (rowHeight + rowGap));

                    targetCol = Math.max(0, Math.min(4 - item.span, targetCol));
                    targetRow = Math.max(0, Math.min(5 - item.rowSpan, targetRow));

                    const targetSlot = targetRow * 4 + targetCol;
                    const neededSlots = getOccupiedSlots(targetSlot, item.span, item.rowSpan);


            if (!neededSlots) {
                renderUI();
                return;
            }

            const occupancyMap = buildPageOccupancyMap(currentPageIndex, item.id);

            const obstacles = [];
            neededSlots.forEach(s => {
                if (occupancyMap[s] && !obstacles.includes(occupancyMap[s])) {
                    obstacles.push(occupancyMap[s]);
                }
            });

            // 空间完全空白 -> 放置成功
            if (obstacles.length === 0) {
                if (fromLoc === 'dock') {
                    dockData.splice(fromIdx, 1);
                    desktopItems.push({
                        id: item.id,
                        type: item.type,
                        page: currentPageIndex,
                        slot: targetSlot,
                        span: item.span,
                        rowSpan: item.rowSpan
                    });
                } else {
                    const cur = desktopItems.find(x => x.id === item.id);
                    if (cur) {
                        cur.slot = targetSlot;
                        cur.page = currentPageIndex;
                    }
                }
                renderUI(item.id);
                return;
            }

            // 仅与一个 1×1 软件重叠 -> 允许对调 (Swap)
            if (obstacles.length === 1 && item.span === 1 && obstacles[0].span === 1 && obstacles[0].rowSpan === 1) {
                const obstacleItem = obstacles[0];
                if (fromLoc === 'desktop') {
                    const cur = desktopItems.find(x => x.id === item.id);
                    if (cur) {
                        const tempSlot = cur.slot;
                        const tempPage = cur.page;
                        cur.slot = obstacleItem.slot;
                        cur.page = obstacleItem.page;
                        obstacleItem.slot = tempSlot;
                        obstacleItem.page = tempPage;
                    }
                } else if (fromLoc === 'dock') {
                    dockData[fromIdx] = obstacleItem.id;
                    obstacleItem.id = item.id;
                }
                renderUI(item.id);
                return;
            }

            // 空间不足 -> 拒绝穿模，自动还原
            renderUI();
            return;
        }
    }

    renderUI();
}

/* ===== dom.js ===== */
/* =========================================
   5. DOM 生成函数
   ========================================= */
function createAppElement(appId, location, index, page) {
    const def = APPS[appId];
    const el = document.createElement('div');
    el.className = 'app-item';
    el.dataset.id = appId;
    el.dataset.type = 'app';
    el.dataset.location = location;
    el.dataset.index = index;
    el.dataset.page = page;

    el.innerHTML = `
        <div class="app-icon">
            <div class="floating-glyph">
                ${def.svg}
            </div>
        </div>
        <div class="app-label">${def.name}</div>
    `;

    attachDragAndHoldEvents(el, { id: appId, type: 'app', span: 1, rowSpan: 1, location, index, page });
    return el;
}

function createPolaroidWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="polaroid-widget">
            <div class="polaroid-tape"></div>
            <div class="polaroid-photo-frame">
                <div class="polaroid-img-area">
                    <svg viewBox="0 0 24 24"><path d="M12 8c-2 0-2.8 2-2.8 3.2 0 2 2.8 3.3 2.8 3.3s2.8-1.3 2.8-3.3c0-1.2-.8-3.2-2.8-3.2z"/><path d="M12 14.5v4.5"/></svg>
                </div>
            </div>
            <div class="polaroid-info">
                <div class="polaroid-title">Daily Moment ${COMPONENT_HEART_SVG}</div>
                <div class="polaroid-sub">May 28 · sunny day</div>
            </div>
        </div>
    `;

    attachDragAndHoldEvents(el, item);
    return el;
}

function createHeartbeatWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="heartbeat-widget">
            <div class="hb-avatar-wrap hb-left" title="点击更换左侧头像">
                <img class="hb-avatar-img" src="${currentUploadedAvatar}" alt="Avatar1">
            </div>

            <div class="hb-bridge">
                <svg class="hb-ecg-svg" viewBox="0 0 110 30" preserveAspectRatio="none">
                    <path class="hb-ecg-line" d="M0,15 L32,15 L38,8 L44,22 L48,12 L52,18 L56,15 L110,15"/>
                </svg>
                <svg class="hb-heart-svg" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </div>

            <div class="hb-avatar-wrap hb-right" title="点击更换右侧头像">
                <img class="hb-avatar-img" src="${currentCoupleAvatar}" alt="Avatar2">
            </div>
        </div>
    `;

    const leftAvatar = el.querySelector('.hb-left');
    const rightAvatar = el.querySelector('.hb-right');

    leftAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    rightAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        coupleAvatarInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}

function createProfileWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="profile-widget">
            <div class="profile-avatar-stage">
                <img class="profile-wing wing-left" src="assets/wing-left.png" alt="Left Wing">
                <img class="profile-wing wing-right" src="assets/wing-right.png" alt="Right Wing">
                <div class="profile-avatar-wrap" title="点击上传自定义头像照片">
                    <img class="profile-avatar-img" src="${currentUploadedAvatar}" alt="Avatar">
                    <div class="avatar-frosted-edge"></div>
                </div>
            </div>
            <div class="profile-name">MINJI ${COMPONENT_HEART_SVG}</div>
            <div class="profile-capsules">
                <span class="black-capsule">Hanni</span>
                <span class="black-capsule">Danielle</span>
                <span class="black-capsule">Haerin</span>
            </div>
        </div>
    `;

    const avatarWrap = el.querySelector('.profile-avatar-wrap');
    avatarWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}

function createMp3WidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="mp3-widget">
            <div class="mp3-top-engraved">
                <span class="mp3-engraved-logo">DIGITAL AUDIO</span>
                <span class="mp3-engraved-play">PLAY ■</span>
            </div>

            <div class="mp3-screen-top">
                <div class="mp3-track-title">Ditto - NewJeans ♪</div>
                <div class="mp3-progress-row">
                    <div class="mp3-bar-bg">
                        <div class="mp3-bar-fill"></div>
                    </div>
                    <span class="mp3-time">02:14</span>
                </div>
            </div>

            <div class="mp3-screen-middle">
                <div class="pixel-art-container">
                    <div class="pixel-eq">
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                    </div>

                    <svg class="pixel-heart-svg" viewBox="0 0 16 14">
                        <rect x="3" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="1" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="13" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="1" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="13" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="11" width="2" height="2" fill="#48373D" />
                    </svg>

                    <div class="pixel-song-text">
                        <span>Ditto.mp3</span>
                        <span style="opacity:0.65;">128kbps</span>
                    </div>
                </div>
            </div>

            <div class="mp3-wheel-oval">
                <span class="mp3-nav-icon mp3-nav-top">MENU</span>
                <span class="mp3-nav-icon mp3-nav-bottom">▶❚❚</span>
                <span class="mp3-nav-icon mp3-nav-left">|◀◀</span>
                <span class="mp3-nav-icon mp3-nav-right">▶▶|</span>
                <div class="mp3-center-oval-btn">
                    <svg viewBox="0 0 24 24"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                </div>
            </div>
        </div>
    `;

    attachDragAndHoldEvents(el, item);
    return el;
}

// 胶囊对话流组件 (全新无边框无底色，内嵌头像胶囊)
function createDialogueWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="dialogue-widget-2x2">
            <div class="chat-chip left" id="leftChipBtn_${item.id}" title="点击更换头像">
                <img class="chip-avatar hb-dialogue-left" src="${currentUploadedAvatar}" alt="avatar1">
                <span class="chip-text">今天开心吗？</span>
            </div>
            
            <div class="chip-timestamp">Today 09:41</div>
            
            <div class="chat-chip right" id="rightChipBtn_${item.id}" title="点击更换头像">
                <span class="chip-text">超开心 
                    <svg viewBox="0 0 24 16" width="14" height="10" style="display:inline-block; vertical-align:middle; stroke:none; fill:#ffffff; margin-bottom: 1px;">
                        <path d="M 12 15.2 C 7.5 12.2 3.5 10.2 3.5 6.8 A 4.2 3.4 0 0 1 12 5 A 4.2 3.4 0 0 1 20.5 6.8 C 20.5 10.2 16.5 12.2 12 15.2 Z"/>
                    </svg>
                </span>
                <img class="chip-avatar hb-dialogue-right" src="${currentCoupleAvatar}" alt="avatar2">
            </div>
        </div>
    `;

    const leftAvatar = el.querySelector('.hb-dialogue-left');
    const rightAvatar = el.querySelector('.hb-dialogue-right');

    leftAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    rightAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        coupleAvatarInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}

/* ===== render.js ===== */
/* =========================================
   4. 渲染系统
   ========================================= */
function renderUI(animateTargetId = null) {
    wkSaveLayout();
    desktopTrack.innerHTML = '';
    for (let p = 0; p < totalPages; p++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'desktop-page';
        pageEl.dataset.pageIndex = p;

        const itemsOnThisPage = desktopItems.filter(item => item.page === p);

        itemsOnThisPage.forEach(item => {
            const row = Math.floor(item.slot / 4) + 1;
            const col = (item.slot % 4) + 1;

            let el;
            if (item.type === 'app') {
                el = createAppElement(item.id, 'desktop', item.slot, p);
            } else if (item.type === 'widget-polaroid') {
                el = createPolaroidWidgetElement(item);
            } else if (item.type === 'widget-heartbeat') {
                el = createHeartbeatWidgetElement(item);
            } else if (item.type === 'widget-profile') {
                el = createProfileWidgetElement(item);
            } else if (item.type === 'widget-mp3') {
                el = createMp3WidgetElement(item);
            } else if (item.type === 'widget-dialogue') {
                el = createDialogueWidgetElement(item);
            } else if (item.type === 'custom') {
                el = createCustomWidgetElement(item);
            }

            if (!item.customId && !wkSnap[item.type]) wkSnap[item.type] = el.outerHTML;
            el.style.gridRow = `${row} / span ${item.rowSpan || 1}`;
            el.style.gridColumn = `${col} / span ${item.span || 1}`;


            if (item.id === animateTargetId) {
                el.classList.add('just-swapped');
            }

            pageEl.appendChild(el);
        });

        desktopTrack.appendChild(pageEl);
    }

    updateTrackPosition();
    renderPaginationDots();

    // 渲染 Dock 栏
    dockBar.innerHTML = '';
    dockData.forEach((appId, index) => {
        const dockSlot = document.createElement('div');
        dockSlot.className = 'dock-slot';
        
        const appEl = createAppElement(appId, 'dock', index, -1);
        if (appId === animateTargetId) {
            appEl.classList.add('just-swapped');
        }
        dockSlot.appendChild(appEl);
        dockBar.appendChild(dockSlot);
    });

    checkDockAnimation();
    wkWatchEditMode();
    wkSyncCapsule();
    
    // 渲染完成后触发逐个图标精准背景亮度采样
    requestAnimationFrame(() => {
        if (typeof updateAllElementsAdaptiveContrast === 'function') {
            updateAllElementsAdaptiveContrast();
        }
    });
}

function updateTrackPosition() {
    desktopTrack.style.transform = `translateX(-${currentPageIndex * 100}%)`;
}

function renderPaginationDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `page-dot ${i === currentPageIndex ? 'active' : ''}`;
        dot.onclick = (e) => {
            e.stopPropagation();
            goToPage(i);
        };
        dotsContainer.appendChild(dot);
    }
}

function goToPage(pageIdx) {
    currentPageIndex = Math.max(0, Math.min(totalPages - 1, pageIdx));
    updateTrackPosition();
    renderPaginationDots();
}

/* 测量桌面网格宽度，同步 Dock 栏尺寸与间距 */
function checkDockAnimation() {
    const currentCount = dockData.length;
    const containerRect = phoneContainer.getBoundingClientRect();
    const colWidth = (containerRect.width - 32 - 30) / 4;
    const colGap = 10;

    document.querySelectorAll('.dock-slot').forEach(slot => {
        slot.style.width = `${colWidth}px`;
    });

    const targetWidth = currentCount === 0 ? 90 : (currentCount * colWidth + (currentCount - 1) * colGap + 16);
    dockBar.style.gap = `${colGap}px`;
    dockBar.style.width = `${targetWidth}px`;
}

/* ===== swipe.js ===== */
/* =========================================
   7. 桌面手势滑屏切页
   ========================================= */
let swipeStartX = 0;
let swipeStartY = 0;

document.addEventListener('DOMContentLoaded', () => {
    const desktopViewport = document.getElementById('desktopViewport');
    
    desktopViewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('.app-item, .widget-item')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    desktopViewport.addEventListener('touchend', (e) => {
        if (e.target.closest('.app-item, .widget-item')) return;
        const diffX = e.changedTouches[0].clientX - swipeStartX;
        const diffY = e.changedTouches[0].clientY - swipeStartY;

        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0 && currentPageIndex < totalPages - 1) {
                goToPage(currentPageIndex + 1);
            } else if (diffX > 0 && currentPageIndex > 0) {
                goToPage(currentPageIndex - 1);
            }
        }
    }, { passive: true });
});


/* ===================================================================
   小组件库：默认组件 + 自定义组件（HTML/CSS/图片）+ 页面增删 + 布局保存
   =================================================================== */
const WK_LAYOUT_KEY = 'desktop_layout_v1';
const WK_CUSTOM_KEY = 'custom_widgets_v1';
let customWidgets = [];
let wkReady = false;
let wkJustAddedId = null;
const wkSnap = {};
const WK_DEFAULT_LIBRARY = [
    { type: 'widget-polaroid', name: '拍立得', span: 2, rowSpan: 1 },
    { type: 'widget-heartbeat', name: '心跳', span: 2, rowSpan: 1 },
    { type: 'widget-profile', name: '资料卡', span: 2, rowSpan: 2 },
    { type: 'widget-mp3', name: 'MP3', span: 2, rowSpan: 2 },
    { type: 'widget-dialogue', name: '对话', span: 2, rowSpan: 2 }
];
const WK_SIZES = [
    { label: '1×1', span: 1, rowSpan: 1 },
    { label: '2×1', span: 2, rowSpan: 1 },
    { label: '2×2', span: 2, rowSpan: 2 },
    { label: '4×1', span: 4, rowSpan: 1 }
];

function wkToast(msg) { if (typeof window.toast === 'function') window.toast(msg); else alert(msg); }
function wkEsc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function wkSizeText(d) { return (d.span || 1) + '×' + (d.rowSpan || 1); }

async function wkLoad() {
    let cw = [], layout = null;
    try { cw = window.DB ? await window.DB.load(WK_CUSTOM_KEY, []) : []; } catch (_) {}
    try { layout = window.DB ? await window.DB.load(WK_LAYOUT_KEY, null) : null; } catch (_) {}
    customWidgets = Array.isArray(cw) ? cw : [];
    if (layout && Array.isArray(layout.desktopItems)) {
        desktopItems = layout.desktopItems;
        totalPages = Math.max(1, layout.totalPages || 1);
        if (Array.isArray(layout.dockData)) dockData = layout.dockData;
    }
    wkReady = true;
    renderUI();
}
function wkSaveLayout() {
    if (!wkReady || !window.DB) return;
    window.DB.save(WK_LAYOUT_KEY, { totalPages, desktopItems, dockData });
}
async function wkSaveCustom() {
    if (window.DB) await window.DB.saveLarge(WK_CUSTOM_KEY, customWidgets);
}

/* 自定义组件：用 Shadow DOM 隔离样式，HTML/CSS 随便写 */
function createCustomWidgetElement(item) {
    const def = customWidgets.find(d => d.id === item.customId);
    const el = document.createElement('div');
    el.className = 'widget-item wk-custom';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;
    const root = el.attachShadow({ mode: 'open' });
    const css = def ? def.css : '';
    const html = def ? def.html : '<div style="padding:10px;font:12px sans-serif;color:#888">组件已删除</div>';
    root.innerHTML = '<style>:host{display:block;width:100%;height:100%;overflow:hidden;border-radius:18px;}' + css + '</style>' +
        '<div style="width:100%;height:100%;box-sizing:border-box;">' + html + '</div>';
    attachDragAndHoldEvents(el, item);
    return el;
}

/* 当前页找一个放得下 span×rowSpan 的空位，找不到返回 -1 */
function wkFindFreeSlot(page, span, rowSpan, ignoreId) {
    const occ = new Set();
    desktopItems.filter(it => it.page === page && it.id !== ignoreId).forEach(it => {
        (getOccupiedSlots(it.slot, it.span || 1, it.rowSpan || 1) || []).forEach(c => occ.add(c));
    });
    for (let slot = 0; slot < 20; slot++) {
        const cells = getOccupiedSlots(slot, span, rowSpan);
        if (!cells) continue;
        if (cells.every(c => !occ.has(c))) return slot;
    }
    return -1;
}
/* 资料卡：从页面中间开始找空位 */
function wkFindFreeSlotCenter(page, span, rowSpan) {
    const occ = new Set();
    desktopItems.filter(it => it.page === page).forEach(it => {
        (getOccupiedSlots(it.slot, it.span || 1, it.rowSpan || 1) || []).forEach(c => occ.add(c));
    });
    const cands = [];
    for (let slot = 0; slot < 20; slot++) {
        const cells = getOccupiedSlots(slot, span, rowSpan);
        if (!cells || cells.some(c => occ.has(c))) continue;
        const row = Math.floor(slot / 4), col = slot % 4;
        const dist = Math.abs(col + span / 2 - 2) + Math.abs(row + rowSpan / 2 - 2.5);
        cands.push({ slot, dist });
    }
    cands.sort((a, b) => a.dist - b.dist || a.slot - b.slot);
    return cands.length ? cands[0].slot : -1;
}
function wkAddToDesktop(spec) {
    const page = currentPageIndex;
    const slot = spec.type === 'widget-profile'
        ? wkFindFreeSlotCenter(page, spec.span, spec.rowSpan)
        : wkFindFreeSlot(page, spec.span, spec.rowSpan);
    if (slot < 0) { wkToast('这一页放不下这个尺寸了，先换一页或新建页面'); return false; }
    const newId = 'wk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    desktopItems.push(Object.assign({ id: newId, page, slot }, spec));
    wkJustAddedId = newId;
    renderUI();
    wkJustAddedId = null;
    const el = document.querySelector('#desktopTrack .widget-item[data-id="' + newId + '"]') || document.querySelector('#desktopTrack [data-id="' + newId + '"]');
    if (el) el.classList.add('wk-enter');
    return true;
}
function wkRemoveLastPage() {
    if (totalPages <= 1) { wkToast('至少保留一页'); return; }
    const last = totalPages - 1;
    if (desktopItems.some(it => it.page === last)) { wkToast('最后一页还有组件，先把它们移走'); return; }
    totalPages--;
    if (currentPageIndex > totalPages - 1) currentPageIndex = totalPages - 1;
    renderUI();
}

/* ---------- 小组件库面板 ---------- */
let wkTab = 'default';
function closeWidgetLibrary() { const o = document.getElementById('wkLibrary'); if (o) o.remove(); }
function closeWidgetEditor() { const o = document.getElementById('wkEditor'); if (o) o.remove(); }
function wkLabelOf(item) {
    if (item.type === 'custom') { const d = customWidgets.find(x => x.id === item.customId); return d ? d.name : '已删除'; }
    const d = WK_DEFAULT_LIBRARY.find(x => x.type === item.type);
    return d ? d.name : '组件';
}
function openWidgetLibrary() {
    closeWidgetLibrary();
    const ov = document.createElement('div');
    ov.id = 'wkLibrary';
    ov.className = 'wk-overlay show';
    const defaults = WK_DEFAULT_LIBRARY.map((d, i) =>
        '<div class="wk-item" data-wk="add-default" data-i="' + i + '">' +
        '<div class="wk-frame" data-pv="d" data-type="' + d.type + '" data-span="' + d.span + '" data-row="' + d.rowSpan + '" data-name="' + wkEsc(d.name) + '"></div>' +
        '<div class="wk-meta"><b>' + wkEsc(d.name) + '</b><small>' + wkSizeText(d) + '</small></div></div>').join('');
    const customs = customWidgets.map(d =>
        '<div class="wk-item" data-wk="add-custom" data-id="' + d.id + '">' +
        '<div class="wk-frame" data-pv="c" data-id="' + d.id + '"></div>' +
        '<div class="wk-meta"><b>' + wkEsc(d.name) + '</b><small>' + wkSizeText(d) + '</small></div>' +
        '<div class="wk-acts"><button type="button" class="wk-ico" data-wk="edit" data-id="' + d.id + '" aria-label="编辑">✎</button>' +
        '<button type="button" class="wk-ico" data-wk="del" data-id="' + d.id + '" aria-label="删除">✕</button></div></div>').join('');
    const body = wkTab === 'default'
        ? '<div class="wk-grid">' + defaults + '</div>'
        : (customWidgets.length
            ? '<div class="wk-grid">' + customs + '</div>'
            : '<div class="wk-empty"><div class="wk-empty-ico">+</div><div>还没有自定义组件</div><small>点下方「新建组件」，用 HTML / CSS 做一个</small></div>');
    ov.innerHTML = '<div class="wk-sheet">' +
        '<div class="wk-head"><div><div class="wk-title">Widgets</div><div class="wk-sub">点一下加到当前页 · 长按桌面组件可以移动，点右上角 × 收回</div></div>' +
        '<button class="wk-x" type="button" data-wk="close" aria-label="关闭">✕</button></div>' +
        '<div class="wk-tabs">' +
        '<button class="wk-tab' + (wkTab === 'default' ? ' on' : '') + '" type="button" data-wk="tab" data-t="default">默认组件</button>' +
        '<button class="wk-tab' + (wkTab === 'custom' ? ' on' : '') + '" type="button" data-wk="tab" data-t="custom">我的组件 · ' + customWidgets.length + '</button></div>' +
        '<div class="wk-body">' + body + '</div>' +
        '<div class="wk-foot"><button class="wk-pill ghost" type="button" data-wk="viewport">桌面视口设置</button>' +
        '<button class="wk-pill" type="button" data-wk="new">+ 新建组件</button></div></div>';
    ov.addEventListener('click', e => {
        if (e.target === ov) { closeWidgetLibrary(); return; }
        const b = e.target.closest('[data-wk]'); if (!b) return;
        wkLibraryAction(b.dataset.wk, b.dataset);
    });
    document.body.appendChild(ov);
    wkFillPreviews(ov);
}
/* 一个格子的像素大小（按当前桌面量），用来把预览按真实比例缩放 */
function wkCell() {
    const tr = document.getElementById('desktopTrack');
    const r = tr ? tr.getBoundingClientRect() : null;
    return { cw: (r && r.width) ? r.width / 4 : 90, ch: (r && r.height) ? r.height / 5 : 90 };
}
function wkFillPreviews(ov) {
    const cell = wkCell();
    ov.querySelectorAll('.wk-frame').forEach(pv => {
        let vw, vh, node = null;
        if (pv.dataset.pv === 'c') {
            const def = customWidgets.find(x => x.id === pv.dataset.id);
            if (!def) return;
            vw = cell.cw * def.span; vh = cell.ch * def.rowSpan;
            const host = document.createElement('div');
            host.style.cssText = 'width:' + vw + 'px;height:' + vh + 'px;';
            const root = host.attachShadow({ mode: 'open' });
            root.innerHTML = '<style>:host{display:block;width:100%;height:100%;overflow:hidden;border-radius:18px;}' + def.css + '</style><div style="width:100%;height:100%;box-sizing:border-box;">' + def.html + '</div>';
            node = host;
        } else {
            const span = +pv.dataset.span, row = +pv.dataset.row;
            vw = cell.cw * span; vh = cell.ch * row;
            let src = document.querySelector('#desktopTrack .widget-item[data-type="' + pv.dataset.type + '"]');
            if (!src && wkSnap[pv.dataset.type]) {
                const tmp = document.createElement('div');
                tmp.innerHTML = wkSnap[pv.dataset.type];
                src = tmp.firstElementChild;
            }
            if (src) {
                const clone = src.cloneNode(true);
                clone.removeAttribute('style');
                clone.classList.remove('just-swapped', 'wk-enter');
                clone.style.cssText = 'width:' + vw + 'px;height:' + vh + 'px;position:relative;';
                node = clone;
            } else {
                node = document.createElement('div');
                node.className = 'wk-frame-name';
                node.textContent = pv.dataset.name;
                node.style.cssText = 'width:' + vw + 'px;height:' + vh + 'px;';
            }
        }
        const sc = (pv.clientWidth || 150) / vw;
        pv.style.aspectRatio = vw + ' / ' + vh;
        const inner = document.createElement('div');
        inner.className = 'wk-scale';
        inner.style.cssText = 'width:' + vw + 'px;height:' + vh + 'px;transform:scale(' + sc + ');transform-origin:0 0;';
        inner.appendChild(node);
        pv.appendChild(inner);
    });
}
function wkLibraryAction(act, ds) {
    if (act === 'close') { closeWidgetLibrary(); return; }
    if (act === 'tab') { wkTab = ds.t; openWidgetLibrary(); return; }
    if (act === 'add-default') {
        const d = WK_DEFAULT_LIBRARY[+ds.i];
        if (d && wkAddToDesktop({ type: d.type, span: d.span, rowSpan: d.rowSpan })) closeWidgetLibrary();
        return;
    }
    if (act === 'add-custom') {
        const def = customWidgets.find(x => x.id === ds.id);
        if (def && wkAddToDesktop({ type: 'custom', customId: def.id, span: def.span, rowSpan: def.rowSpan })) closeWidgetLibrary();
        return;
    }
    if (act === 'edit') {
        const def = customWidgets.find(x => x.id === ds.id);
        if (def) openWidgetEditor(def);
        return;
    }
    if (act === 'del') {
        const def = customWidgets.find(x => x.id === ds.id);
        if (!def || !window.confirm('删除组件「' + def.name + '」？桌面上用到它的也会一起移除。')) return;
        customWidgets = customWidgets.filter(x => x.id !== def.id);
        desktopItems = desktopItems.filter(it => it.customId !== def.id);
        wkSaveCustom();
        renderUI();
        openWidgetLibrary();
        return;
    }
    if (act === 'new') { openWidgetEditor(null); return; }
    if (act === 'viewport') {
        closeWidgetLibrary();
        if (typeof openDesktopViewportPopup === 'function') openDesktopViewportPopup();
    }
}

/* ---------- 自定义组件编辑 ---------- */
function openWidgetEditor(def) {
    closeWidgetLibrary();
    closeWidgetEditor();
    const d = def || { name: '', span: 2, rowSpan: 2, html: '', css: '' };
    const ov = document.createElement('div');
    ov.id = 'wkEditor';
    ov.className = 'wk-overlay show';
    ov.dataset.editId = def ? def.id : '';
    ov.dataset.span = d.span;
    ov.dataset.rowSpan = d.rowSpan;
    ov.innerHTML = '<div class="wk-sheet wk-editor">' +
        '<div class="wk-head wk-head-c"><div class="wk-title">' + (def ? 'Edit Widget' : 'New Widget') + '</div>' +
        '<button class="wk-x" type="button" data-wk="ed-close" aria-label="关闭">&times;</button></div>' +
        '<div class="wk-ed-pv-wrap"><div class="wk-frame wk-ed-pv" id="wkEdPv"></div></div>' +
        '<label class="wk-lbl wk-c">名字</label>' +
        '<input class="wk-input wk-c" id="wkName" value="' + wkEsc(d.name) + '" placeholder="比如：今日一句">' +
        '<label class="wk-lbl wk-c">尺寸</label>' +
        '<div class="wk-sizes">' + WK_SIZES.map(s =>
            '<button class="wk-size' + (s.span === d.span && s.rowSpan === d.rowSpan ? ' on' : '') + '" type="button" data-wk="ed-size" data-span="' + s.span + '" data-row="' + s.rowSpan + '">' + s.label + '</button>').join('') + '</div>' +
        '<div class="wk-lbl wk-c"><span>HTML</span><button class="wk-mini" type="button" data-wk="ed-img">插入图片</button></div>' +
        '<textarea class="wk-ta" id="wkHtml" placeholder="<div class=&quot;box&quot;>你好</div>">' + wkEsc(d.html) + '</textarea>' +
        '<div class="wk-lbl wk-c"><span>CSS</span></div>' +
        '<textarea class="wk-ta" id="wkCss" placeholder=".box{padding:12px;color:#fff}">' + wkEsc(d.css) + '</textarea>' +
        '<input type="file" id="wkImgFile" accept="image/*" style="display:none">' +
        '<div class="wk-foot"><button class="wk-pill" type="button" data-wk="ed-save">保存组件</button></div>' +
        '</div>';
    ov.addEventListener('click', e => {
        const b = e.target.closest('[data-wk]'); if (!b) return;
        const act = b.dataset.wk;
        if (act === 'ed-close') { closeWidgetEditor(); openWidgetLibrary(); }
        else if (act === 'ed-size') {
            ov.dataset.span = b.dataset.span; ov.dataset.rowSpan = b.dataset.row;
            ov.querySelectorAll('.wk-size').forEach(x => x.classList.toggle('on', x === b));
            wkRenderEditorPreview(ov);
        }
        else if (act === 'ed-img') ov.querySelector('#wkImgFile').click();
        else if (act === 'ed-save') wkSaveEditor(ov);
    });
    ov.querySelector('#wkHtml').addEventListener('input', () => wkRenderEditorPreview(ov));
    ov.querySelector('#wkCss').addEventListener('input', () => wkRenderEditorPreview(ov));
    ov.querySelector('#wkImgFile').addEventListener('change', function () {
        const f = this.files && this.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            const ta = ov.querySelector('#wkHtml');
            ta.value += '\n<img src="' + r.result + '" style="width:100%;height:100%;object-fit:cover;display:block">';
            wkRenderEditorPreview(ov);
        };
        r.readAsDataURL(f);
        this.value = '';
    });
    document.body.appendChild(ov);
    wkRenderEditorPreview(ov);
}
/* 编辑面板里的实时预览：按当前尺寸和桌面格子比例渲染 */
function wkRenderEditorPreview(ov) {
    const pv = ov.querySelector('#wkEdPv'); if (!pv) return;
    const cell = wkCell();
    const span = +ov.dataset.span || 2, row = +ov.dataset.rowSpan || 1;
    const vw = cell.cw * span, vh = cell.ch * row;
    const host = document.createElement('div');
    host.style.cssText = 'width:' + vw + 'px;height:' + vh + 'px;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;width:100%;height:100%;overflow:hidden;border-radius:18px;}' + ov.querySelector('#wkCss').value + '</style><div style="width:100%;height:100%;box-sizing:border-box;">' + ov.querySelector('#wkHtml').value + '</div>';
    const sc = (pv.clientWidth || 200) / vw;
    pv.style.aspectRatio = vw + ' / ' + vh;
    pv.innerHTML = '<div class="wk-scale" style="width:' + vw + 'px;height:' + vh + 'px;transform:scale(' + sc + ');transform-origin:0 0;"></div>';
    pv.firstChild.appendChild(host);
}
function wkSaveEditor(ov) {
    const name = (ov.querySelector('#wkName').value || '').trim() || '未命名组件';
    const html = ov.querySelector('#wkHtml').value;
    const css = ov.querySelector('#wkCss').value;
    const span = +ov.dataset.span || 2, rowSpan = +ov.dataset.rowSpan || 1;
    const editId = ov.dataset.editId;
    if (editId) {
        const def = customWidgets.find(x => x.id === editId);
        if (def) Object.assign(def, { name, html, css, span, rowSpan });
        // 尺寸变了：桌面上的副本换成新尺寸；放不下就挪到当前页的空位
        desktopItems.filter(it => it.customId === editId).forEach(it => {
            it.span = span; it.rowSpan = rowSpan;
            if (!getOccupiedSlots(it.slot, span, rowSpan)) { it.slot = wkFindFreeSlot(it.page, span, rowSpan, it.id); return; }
            const cells = getOccupiedSlots(it.slot, span, rowSpan);
            const clash = desktopItems.some(o => o !== it && o.page === it.page && (getOccupiedSlots(o.slot, o.span || 1, o.rowSpan || 1) || []).some(c => cells.includes(c)));
            if (clash) it.slot = wkFindFreeSlot(it.page, span, rowSpan, it.id);
        });
    } else {
        customWidgets.push({ id: 'cw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), name, html, css, span, rowSpan });
    }
    wkSaveCustom();
    closeWidgetEditor();
    renderUI();
    openWidgetLibrary();
}

function wkIsWidget(item) { return !!item && (item.type === 'custom' || String(item.type).indexOf('widget-') === 0); }
function wkToggleCollapse(id) {
    const it = desktopItems.find(x => x.id === id);
    if (!it) return;
    it.collapsed = !it.collapsed;
    if (navigator.vibrate) navigator.vibrate(25);
    wkSaveLayout();
    renderUI();
}
/* 胶囊按钮：只在剪辑模式显示（用 JS 强制，不依赖 CSS 优先级） */
function wkSyncCapsule() {
    const b = document.getElementById('desktopEditSettingsBtn');
    if (!b) return;
    const pc = document.getElementById('phoneContainer');
    const on = !!(pc && pc.classList.contains('edit-mode'));
    b.style.setProperty('display', on ? 'flex' : 'none', 'important');
}
let wkCapsuleObserved = false;
function wkWatchEditMode() {
    const pc = document.getElementById('phoneContainer');
    if (!pc || wkCapsuleObserved) return;
    wkCapsuleObserved = true;
    new MutationObserver(wkSyncCapsule).observe(pc, { attributes: true, attributeFilter: ['class'] });
    wkSyncCapsule();
}

/* ---------- 启动：读取保存的布局 + 绑定删除页按钮 ---------- */
/* 叉号：在 document 捕获阶段统一处理，比小组件、设置页的任何监听都先拿到事件 */
function wkBadgeFrom(e) { return e.target && e.target.closest ? e.target.closest('.wk-del-badge') : null; }
/* 叉号悬浮层：放在 body 上，z-index 很高，永远不会被小组件内容盖住 */
function wkSyncBadges() {
    const pc = document.getElementById('phoneContainer');
    const on = !!(pc && pc.classList.contains('edit-mode'));
    const live = new Set();
    if (on) {
        document.querySelectorAll('#desktopTrack .widget-item[data-id]').forEach(el => {
            const id = el.dataset.id;
            const item = desktopItems.find(it => it.id === id);
            if (!item || !wkIsWidget(item)) return;
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            live.add(id);
            let x = document.querySelector('.wk-del-badge[data-id="' + id + '"]');
            if (!x) {
                x = document.createElement('button');
                x.type = 'button';
                x.className = 'wk-del-badge';
                x.dataset.id = id;
                x.setAttribute('aria-label', '移出桌面');
                x.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
                document.body.appendChild(x);
            }
            x.style.left = (r.right - 28) + 'px';
            x.style.top = (r.top + 6) + 'px';
            x.classList.add('live');
        });
    }
    document.querySelectorAll('.wk-del-badge').forEach(x => {
        if (!live.has(x.dataset.id) || !on) { x.classList.remove('live'); if (!on || !live.has(x.dataset.id)) x.remove(); }
    });
}
setInterval(wkSyncBadges, 120);

function wkRemoveFromBadge(badge) {
    const id = badge.dataset.id;
    if (!id) return;
    desktopItems = desktopItems.filter(it => it.id !== id);
    renderUI();
}
document.addEventListener('pointerdown', e => {
    if (wkBadgeFrom(e)) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
document.addEventListener('pointerup', e => {
    if (wkBadgeFrom(e)) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
document.addEventListener('click', e => {
    const badge = wkBadgeFrom(e);
    if (!badge) return;
    e.stopImmediatePropagation(); e.preventDefault();
    wkRemoveFromBadge(badge);
}, true);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(wkLoad, 0);
    setTimeout(wkWatchEditMode, 300);
    const rm = document.getElementById('removePageBtn');
    if (rm) rm.addEventListener('click', wkRemoveLastPage);
});
