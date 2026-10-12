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
    'browser': {
        name: '探索',
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
        name: '清单',
        svg: `<svg viewBox="0 0 40 40">
            <circle class="stroke-primary" cx="14" cy="15" r="4"/>
            <path class="stroke-primary" d="M12.2 15l1.3 1.3 2.3-2.6"/>
            <circle class="stroke-secondary" cx="14" cy="24.5" r="4"/>
            <path class="stroke-secondary" d="M12.2 24.5l1.3 1.3 2.3-2.6"/>
            <line class="stroke-primary" x1="21.5" y1="15" x2="31" y2="15"/>
            <line class="stroke-secondary" x1="21.5" y1="24.5" x2="29" y2="24.5"/>
            <path class="star-solid-translucent" d="M31 6v3M29.5 7.5h3"/>
        </svg>`
    }
};

// 组件手绘可爱爱心矢量
const COMPONENT_HEART_SVG = `<svg viewBox="0 0 24 16" width="14" height="10" style="display:inline-block; vertical-align:middle; stroke:none; fill:var(--svg-stroke);"><path d="M 12 15.2 C 7.5 12.2 3.5 10.2 3.5 6.8 A 4.2 3.4 0 0 1 12 5 A 4.2 3.4 0 0 1 20.5 6.8 C 20.5 10.2 16.5 12.2 12 15.2 Z"/></svg>`;
window.APPS = APPS;
