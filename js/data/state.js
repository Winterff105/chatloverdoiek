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

let dockData = ['phone', 'browser', 'music', 'worldbook'];

// 全局 DOM 引用 (在 main.js 中初始化)
let phoneContainer;
let desktopTrack;
let dotsContainer;
let addPageBtn;
let dockBar;
let avatarFileInput;
let coupleAvatarInput;
