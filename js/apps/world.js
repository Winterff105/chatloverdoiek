/* 世界 · 由 世界.html 拆分而来：结构在 WORLD_MARKUP，样式在 css/world.css，联系人与连线数据来自通讯录与 DB */
const WORLD_MARKUP = "\n\n<div class=\"k-phone\" id=\"phoneContainer\">\n    <!-- 顶部通知 -->\n    <div class=\"toast-msg\" id=\"toast\">\n        <span style=\"color: #ffffff;\">●</span>\n        <span id=\"toast-text\">Neo-Seoul 09</span>\n    </div>\n\n    <!-- 牵线模式浮动提示条 (带矢量 SVG 图标) -->\n    <div class=\"linking-banner\" id=\"linkingBanner\">\n        <svg class=\"svg-icon\" viewBox=\"0 0 24 24\">\n            <path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"></path>\n            <path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"></path>\n        </svg>\n        <span id=\"linkingText\">点击另一个头像以完成牵线</span>\n        <button class=\"cancel-link-btn\" id=\"btnCancelLink\">取消</button>\n    </div>\n\n    <!-- 顶部英文栏目 -->\n    <header>\n        <div>\n            <div class=\"header-meta\">Universe Protocol</div>\n            <h1 class=\"header-title\">Contacts & Ties</h1>\n        </div>\n        <div class=\"world-pill\" id=\"worldPillBtn\">\n            <span class=\"dot\"></span>\n            退出\n        </div>\n    </header>\n\n    <!-- 分组英文栏目 -->\n    <div class=\"filter-section\"><div class=\"filter-row\"><span id=\"groupBox\" class=\"group-box\"></span><button class=\"fchip\" id=\"addGroupBtn\">+</button></div></div>\n\n    <!-- 缩放控制工具 -->\n    <div class=\"zoom-controls\">\n        <button class=\"zoom-btn\" id=\"btnZoomIn\" title=\"放大\">+</button>\n        <button class=\"zoom-btn\" id=\"btnZoomOut\" title=\"缩小\">−</button>\n        <button class=\"zoom-btn\" id=\"btnReset\" title=\"居中\" style=\"font-size: 12px;\">⊙</button>\n    </div>\n\n    <!-- 画板视口 -->\n    <div class=\"graph-viewport\" id=\"graphViewport\">\n        <div class=\"graph-scene\" id=\"graphScene\">\n            <!-- 连线画布 -->\n            <svg id=\"svg-canvas\"></svg>\n\n            <!-- 轨道辅助环 -->\n            <div class=\"orbit-circle\" style=\"left: 600px; top: 600px; width: 340px; height: 340px;\"></div>\n            <div class=\"orbit-circle\" style=\"left: 600px; top: 600px; width: 560px; height: 560px;\"></div>\n\n            <!-- 节点 1：韩智允 (白角) -->\n            \n\n            <!-- 节点 2：宋旻浩 (白角) -->\n            \n\n            <!-- 节点 3：姜采源 (红角 / 特殊) -->\n            \n\n            <!-- 节点 4：[NPC] 执事智能 01 (白角) -->\n            \n\n            <!-- 节点 5：[NPC] 巡检蜂群 (红角 / 特殊) -->\n            \n        </div>\n    </div>\n\n    <!-- ======= 头像顶部专属悬浮操作微胶囊 (完美支持视口绝对定位) ======= -->\n    <div class=\"node-choice-pop\" id=\"nodeChoicePop\">\n        <button class=\"choice-btn inspect-choice\" id=\"btnPopInspect\">\n            查看卡片\n        </button>\n        <div class=\"choice-divider\"></div>\n        <button class=\"choice-btn link-choice\" id=\"btnPopLink\">\n            <svg class=\"svg-icon\" viewBox=\"0 0 24 24\">\n                <path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"></path>\n                <path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"></path>\n            </svg>\n            牵线\n        </button>\n    </div>\n\n    <!-- 底部导航 -->\n    <div class=\"bottom-nav-wrapper\">\n        <nav class=\"floating-nav\">\n            <button class=\"nav-btn\" id=\"btnWorldOverview\">概览</button>\n            <button class=\"nav-btn primary\" id=\"btnOpenCreate\">+ NEW TETHER</button>\n        </nav>\n    </div>\n\n    <!-- ======= 专属解构票券卡片 (Specimen Docket) ======= -->\n    <div class=\"modal-overlay\" id=\"docketModal\">\n        <article class=\"docket-card\" id=\"inspectCard\">\n            <div class=\"sharp-thorn thorn-right\"><div class=\"thorn-head\"></div></div>\n            <div class=\"sharp-thorn thorn-left\"><div class=\"thorn-head\"></div></div>\n\n            <div class=\"docket-sidebar\">\n                <span class=\"docket-code\" id=\"cardDocCode\">DOC.09-KR</span>\n                <span class=\"sync-indicator\" id=\"cardSync\">SYNC 98%</span>\n            </div>\n\n            <div class=\"docket-main\">\n                <div class=\"docket-header\">\n                    <span class=\"world-anchor-tag\" id=\"cardSector\">SECTOR_CORE // #01</span>\n                    <span class=\"stamp-capsule\" id=\"cardStamp\">ORIGIN</span>\n                </div>\n\n                <div class=\"docket-profile\">\n                    <div class=\"avatar-box\">\n                        <svg class=\"inverted-devil-horns\" viewBox=\"0 0 28 9\" fill=\"none\" id=\"cardHorn\">\n                            <path d=\"M7 8.5 C7 6 6 5.5 5.2 4 L5.2 0.8 L6.8 0.8 L7.8 4.5 C8 6.5 8.2 7.5 8.2 8.5 Z\" fill=\"#ffffff\"/>\n                            <path d=\"M21 8.5 C21 6 22 5.5 22.8 4 L22.8 0.8 L21.2 0.8 L20.2 4.5 C20 6.5 19.8 7.5 19.8 8.5 Z\" fill=\"#ffffff\"/>\n                        </svg>\n                        <div class=\"avatar-disc\" id=\"cardAvatarDisc\">Y</div>\n                    </div>\n                    <div class=\"identity-meta\">\n                        <h3 id=\"cardName\">韩智允</h3>\n                        <p id=\"cardRole\">ARCHIVIST // CORE</p>\n                    </div>\n                </div>\n\n                <div class=\"tether-container\" id=\"cardTethers\"></div>\n\n                <div class=\"card-close-btn\" id=\"btnCloseDocket\">返回</div>\n            </div>\n        </article>\n    </div>\n\n    <!-- ======= NEW TETHER 弹窗 (保留类型切换) ======= -->\n    <div class=\"modal-overlay\" id=\"createModal\">\n        <div class=\"center-modal\">\n            <div class=\"modal-header\">\n                <span class=\"modal-title\">NEW TETHER</span>\n                <button class=\"close-modal\" id=\"btnCloseCreate\">✕</button>\n            </div>\n\n            <!-- 完整放回的实体类型选择 -->\n            <div class=\"input-group\">\n                <label class=\"input-label\">实体类型 (TYPE)</label>\n                <div class=\"selector-row\">\n                    <button class=\"type-option active\" data-type=\"contact\">联系人 (Contact)</button>\n                    <button class=\"type-option\" data-type=\"npc\">世界 NPC (NPC)</button>\n                </div>\n            </div>\n\n            <div class=\"input-group\">\n                <label class=\"input-label\">名称 / 编号</label>\n                <input type=\"text\" class=\"k-input\" id=\"entityName\" placeholder=\"例如: 朴恩宇 或 [NPC] 警备机\">\n            </div>\n\n            <div class=\"input-group\">\n                <label class=\"input-label\">关联目标 (牵线至)</label>\n                <input type=\"text\" class=\"k-input\" id=\"tetherTarget\" placeholder=\"输入关联人: 韩智允\">\n            </div>\n\n            <div class=\"input-group\" id=\"npcSection\" style=\"display:none\"><label class=\"input-label\">选择关联联系人（可多选）</label><div class=\"npc-list\" id=\"npcContacts\"></div><label class=\"input-label\" style=\"margin-top:10px\">生成数量（可留空，由 AI 决定）</label><input type=\"number\" class=\"k-input\" id=\"npcCount\" min=\"1\" max=\"10\" placeholder=\"留空自由生成\"><label class=\"input-label\" style=\"margin-top:10px\">附加补充</label><textarea class=\"k-input\" id=\"npcExtra\" rows=\"3\" placeholder=\"补充设定，例如：都在同一所学校\"></textarea><div class=\"npc-status\" id=\"npcStatus\"></div></div>\n<button class=\"submit-btn\" id=\"btnSubmit\">确认建立联系</button>\n        </div>\n    </div>\n</div>\n\n<div class=\"modal-overlay\" id=\"relModal\"><div class=\"center-modal\"><div class=\"modal-header\"><span class=\"modal-title\">牵线关系</span><button class=\"close-modal\" id=\"relCancel\">✕</button></div><div class=\"input-group\"><label class=\"input-label\" id=\"relTitle\"></label></div><div class=\"input-group\"><label class=\"input-label\">关系 (RELATION)</label><input type=\"text\" class=\"k-input\" id=\"relInput\" placeholder=\"例如: 朋友 / 同事 / 恋人\"></div><button class=\"submit-btn\" id=\"relOk\">确认牵线</button></div></div><div class=\"modal-overlay\" id=\"groupModal\"><div class=\"center-modal\"><div class=\"modal-header\"><span class=\"modal-title\">新建分组</span><button class=\"close-modal\" id=\"groupCancel\">✕</button></div><div class=\"input-group\"><label class=\"input-label\">分组名字</label><input type=\"text\" class=\"k-input\" id=\"groupName\" placeholder=\"例如: 同学\"></div><button class=\"submit-btn\" id=\"groupOk\">确认</button></div></div><div class=\"modal-overlay\" id=\"groupMenuModal\"><div class=\"center-modal\"><div class=\"modal-header\"><span class=\"modal-title\" id=\"groupMenuTitle\"></span><button class=\"close-modal\" id=\"gmCancel\">✕</button></div><button class=\"submit-btn\" id=\"gmPick\">勾选联系人</button><button class=\"submit-btn\" id=\"gmDelete\" style=\"margin-top:8px\">删除分组</button></div></div><div class=\"modal-overlay\" id=\"groupPickModal\"><div class=\"center-modal\" style=\"max-height:88%;overflow-y:auto\"><div class=\"modal-header\"><span class=\"modal-title\">勾选联系人加入分组</span><button class=\"close-modal\" id=\"gpCancel\">✕</button></div><div class=\"npc-list\" id=\"gpContacts\"></div><button class=\"submit-btn\" id=\"gpSave\" style=\"margin-top:10px\">保存分组</button></div></div>";

const WORLD_CSS = ":host { all: initial; display: block; width: 100%; height: 100%; background: linear-gradient(rgba(6,6,6,0.55), rgba(6,6,6,0.55)), url('assets/app/世界壁纸.jpg') center / cover no-repeat #060606; }\n/* 世界 · 由 世界.html 拆分而来，所有选择器限定在 .world-host 内 */\n@import url('https://fonts.googleapis.com/css2?family=Italiana&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');\n.world-host { position: relative; width: 100%; height: 100%; overflow: hidden; }\n.world-host button, .world-host span, .world-host p, .world-host h1, .world-host h2, .world-host h3, .world-host label, .world-host input { color: inherit; font-family: inherit; }\n.world-host {\n            --bg-base: #060606;\n            --card-surface: #101010;\n            --text-high: #ffffff;\n            --text-mid: #909090;\n            --text-low: #444444;\n            --border-hairline: rgba(255, 255, 255, 0.08);\n            --border-focus: rgba(255, 255, 255, 0.28);\n            \n            --thread-white: #ffffff;\n            --glow-white: rgba(255, 255, 255, 0.35);\n            \n            --thread-red: #8e0e20;\n            --glow-red: rgba(142, 14, 32, 0.6);\n            --font-serif: 'Italiana', serif;\n            --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;\n            --font-mono: 'Space Mono', monospace;\n        }\n.world-host, .world-host * {\n            box-sizing: border-box;\n            margin: 0;\n            padding: 0;\n            -webkit-tap-highlight-color: transparent;\n            user-select: none;\n        }\n.world-host {\n            background-color: #000000;\n            color: var(--text-high);\n            font-family: var(--font-sans);\n            display: flex;\n            justify-content: center;\n            min-height: 100%;\n            overflow: hidden;\n        }\n.world-host .k-phone {\n            width: 100%;\n            max-width: 414px;\n            height: 100%;\n            background: var(--bg-base);\n            border-left: 0.5px solid var(--border-hairline);\n            border-right: 0.5px solid var(--border-hairline);\n            display: flex;\n            flex-direction: column;\n            position: relative;\n            overflow: hidden;\n        }\n.world-host header {\n            padding: 22px 22px 12px;\n            display: flex;\n            justify-content: space-between;\n            align-items: flex-end;\n            position: absolute;\n            top: 0;\n            left: 0;\n            right: 0;\n            background: linear-gradient(180deg, rgba(6,6,6,0.95) 0%, rgba(6,6,6,0.7) 70%, transparent 100%);\n            z-index: 50;\n            pointer-events: none;\n        }\n.world-host header > * {\n            pointer-events: auto;\n        }\n.world-host .header-meta {\n            font-size: 10px;\n            letter-spacing: 2px;\n            text-transform: uppercase;\n            color: var(--text-low);\n            font-family: var(--font-mono);\n            margin-bottom: 2px;\n        }\n.world-host .header-title {\n            font-family: var(--font-serif);\n            font-size: 28px;\n            font-weight: 400;\n            line-height: 1.05;\n        }\n.world-host .world-pill {\n            display: flex;\n            align-items: center;\n            gap: 6px;\n            border: 0.5px solid var(--border-hairline);\n            border-radius: 40px;\n            padding: 5px 12px;\n            font-size: 11px;\n            color: var(--text-mid);\n            background: rgba(18, 18, 18, 0.85);\n            backdrop-filter: blur(10px);\n            cursor: pointer;\n        }\n.world-host .world-pill .dot {\n            width: 5px;\n            height: 5px;\n            background: #fff;\n            border-radius: 50%;\n            animation: world-pulse 2s infinite ease-in-out;\n        }\n@keyframes world-pulse {\n            0%, 100% { opacity: 0.3; }\n            50% { opacity: 1; }\n        }\n.world-host .filter-section {\n            position: absolute;\n            top: 72px;\n            left: 20px;\n            right: 20px;\n            display: flex;\n            gap: 8px;\n            z-index: 50;\n            pointer-events: auto;\n        }\n.world-host .filter-chip {\n            border: 0.5px solid var(--border-hairline);\n            background: rgba(18, 18, 18, 0.75);\n            backdrop-filter: blur(12px);\n            color: var(--text-mid);\n            font-size: 11px;\n            padding: 6px 14px;\n            border-radius: 20px;\n            cursor: pointer;\n            transition: all 0.2s ease;\n        }\n.world-host .filter-chip.active {\n            background: #ffffff;\n            color: #000000;\n            border-color: #ffffff;\n            font-weight: 600;\n        }\n.world-host .linking-banner {\n            position: absolute;\n            top: 120px;\n            left: 50%;\n            transform: translateX(-50%) translateY(-20px);\n            background: #ffffff;\n            color: #000000;\n            padding: 7px 16px;\n            border-radius: 30px;\n            font-size: 11px;\n            font-weight: 600;\n            z-index: 70;\n            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85);\n            display: flex;\n            align-items: center;\n            gap: 10px;\n            opacity: 0;\n            pointer-events: none;\n            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);\n        }\n.world-host .linking-banner.show {\n            opacity: 1;\n            pointer-events: auto;\n            transform: translateX(-50%) translateY(0);\n        }\n.world-host .cancel-link-btn {\n            background: #000000;\n            color: #ffffff;\n            border: none;\n            border-radius: 12px;\n            padding: 3px 8px;\n            font-size: 10px;\n            cursor: pointer;\n        }\n.world-host .graph-viewport {\n            flex: 1;\n            width: 100%;\n            height: 100%;\n            overflow: hidden;\n            position: relative;\n            cursor: grab;\n            touch-action: none !important;\n            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0);\n            background-size: 24px 24px;\n        }\n.world-host .graph-viewport:active {\n            cursor: grabbing;\n        }\n.world-host .graph-scene {\n            position: absolute;\n            width: 1200px;\n            height: 1200px;\n            top: 0;\n            left: 0;\n            transform-origin: 0 0;\n            will-change: transform;\n        }\n.world-host #svg-canvas {\n            position: absolute;\n            top: 0;\n            left: 0;\n            width: 100%;\n            height: 100%;\n            pointer-events: none;\n            z-index: 2;\n        }\n.world-host .thread-line-white {\n            fill: none;\n            stroke: var(--thread-white);\n            stroke-width: 1.4;\n            stroke-linecap: square;\n            filter: drop-shadow(0 0 3px var(--glow-white));\n            opacity: 0.85;\n        }\n.world-host .thread-line-red {\n            fill: none;\n            stroke: var(--thread-red);\n            stroke-width: 1.6;\n            stroke-linecap: square;\n            filter: drop-shadow(0 0 4px var(--glow-red));\n            opacity: 0.98;\n        }\n.world-host .orbit-circle {\n            position: absolute;\n            border: 0.5px dashed rgba(255, 255, 255, 0.06);\n            border-radius: 50%;\n            pointer-events: none;\n            transform: translate(-50%, -50%);\n        }\n.world-host .avatar-node {\n            position: absolute;\n            transform: translate(-50%, -50%);\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            gap: 7px;\n            z-index: 10;\n            cursor: pointer;\n        }\n.world-host .avatar-node.linking-source .node-avatar {\n            border-color: #ffffff;\n            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35), 0 0 25px rgba(255, 255, 255, 0.85);\n            animation: world-pulse-ring 1.4s infinite;\n        }\n@keyframes world-pulse-ring {\n            0%, 100% { transform: scale(1); }\n            50% { transform: scale(1.08); }\n        }\n.world-host .avatar-node.hidden {\n            display: none !important;\n        }\n.world-host .node-avatar-wrap {\n            position: relative;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n        }\n.world-host .inverted-devil-horns {\n            position: absolute;\n            top: -4px;\n            width: 28px;\n            height: 9px;\n            transform: scaleY(-1);\n            z-index: 4;\n            pointer-events: none;\n            filter: drop-shadow(0 -1px 2px rgba(0, 0, 0, 0.9));\n        }\n.world-host .node-avatar {\n            border-radius: 50%;\n            background: #141414;\n            border: 0.5px solid rgba(255, 255, 255, 0.2);\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            color: #ffffff;\n            font-family: var(--font-serif);\n            position: relative;\n            z-index: 2;\n            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.85);\n            transition: transform 0.15s, border-color 0.2s;\n        }\n.world-host .avatar-node:active .node-avatar {\n            transform: scale(0.92);\n        }\n.world-host .node-center .node-avatar {\n            width: 62px;\n            height: 62px;\n            font-size: 26px;\n            border-color: #ffffff;\n            box-shadow: 0 0 25px rgba(255, 255, 255, 0.15);\n        }\n.world-host .node-satellite .node-avatar {\n            width: 48px;\n            height: 48px;\n            font-size: 20px;\n        }\n.world-host .node-npc .node-avatar {\n            width: 44px;\n            height: 44px;\n            font-size: 12px;\n            font-family: var(--font-mono);\n            background: rgba(18, 18, 18, 0.65);\n            border: 0.5px dashed rgba(255, 255, 255, 0.25);\n            backdrop-filter: blur(8px);\n        }\n.world-host .node-meta {\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            text-align: center;\n            pointer-events: none;\n            white-space: nowrap;\n        }\n.world-host .node-name {\n            font-size: 11.5px;\n            font-weight: 500;\n            color: #ffffff;\n            background: rgba(10, 10, 10, 0.75);\n            padding: 2px 8px;\n            border-radius: 12px;\n            border: 0.5px solid rgba(255, 255, 255, 0.06);\n            display: flex;\n            align-items: center;\n            gap: 4px;\n        }\n.world-host .horn-tag-red {\n            color: var(--thread-red);\n            font-size: 9px;\n            font-weight: 700;\n        }\n.world-host .node-role {\n            font-size: 9px;\n            color: var(--text-mid);\n            margin-top: 2px;\n        }\n.world-host .zoom-controls {\n            position: absolute;\n            right: 18px;\n            top: 130px;\n            display: flex;\n            flex-direction: column;\n            gap: 7px;\n            z-index: 60;\n        }\n.world-host .zoom-btn {\n            width: 36px;\n            height: 36px;\n            background: rgba(18, 18, 18, 0.88);\n            border: 0.5px solid var(--border-hairline);\n            backdrop-filter: blur(12px);\n            border-radius: 50%;\n            color: #ffffff;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-size: 16px;\n            cursor: pointer;\n            transition: all 0.15s;\n        }\n.world-host .zoom-btn:active {\n            transform: scale(0.9);\n            border-color: #ffffff;\n        }\n.world-host .bottom-nav-wrapper {\n            position: absolute;\n            bottom: 24px;\n            left: 0;\n            right: 0;\n            display: flex;\n            justify-content: center;\n            z-index: 60;\n            pointer-events: none;\n        }\n.world-host .floating-nav {\n            pointer-events: auto;\n            background: rgba(18, 18, 18, 0.92);\n            backdrop-filter: blur(24px);\n            border: 0.5px solid var(--border-focus);\n            border-radius: 36px;\n            padding: 5px 8px;\n            display: flex;\n            align-items: center;\n            gap: 6px;\n            box-shadow: 0 14px 35px rgba(0, 0, 0, 0.8);\n        }\n.world-host .nav-btn {\n            background: transparent;\n            border: none;\n            color: var(--text-mid);\n            font-size: 12px;\n            padding: 9px 16px;\n            border-radius: 20px;\n            cursor: pointer;\n            font-weight: 400;\n            display: flex;\n            align-items: center;\n            gap: 6px;\n        }\n.world-host .nav-btn:active {\n            transform: scale(0.96);\n        }\n.world-host .nav-btn.primary {\n            background: #ffffff;\n            color: #000000;\n            font-weight: 600;\n        }\n.world-host .svg-icon {\n            width: 14px;\n            height: 14px;\n            stroke-width: 2;\n            stroke: currentColor;\n            fill: none;\n            stroke-linecap: round;\n            stroke-linejoin: round;\n            display: inline-block;\n            vertical-align: middle;\n        }\n.world-host .node-choice-pop {\n            position: absolute;\n            background: rgba(18, 18, 18, 0.95);\n            backdrop-filter: blur(24px);\n            border: 0.5px solid var(--border-focus);\n            border-radius: 30px;\n            padding: 4px 6px;\n            display: none;\n            align-items: center;\n            gap: 4px;\n            z-index: 120;\n            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.95);\n            transform: translate(-50%, -100%);\n            pointer-events: auto;\n        }\n.world-host .node-choice-pop.open {\n            display: flex;\n            animation: pop-bounce 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n        }\n@keyframes pop-bounce {\n            0% { transform: translate(-50%, -85%) scale(0.85); opacity: 0; }\n            100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }\n        }\n.world-host .node-choice-pop::after {\n            content: '';\n            position: absolute;\n            bottom: -6px;\n            left: 50%;\n            transform: translateX(-50%);\n            border-left: 6px solid transparent;\n            border-right: 6px solid transparent;\n            border-top: 6px solid var(--border-focus);\n        }\n.world-host .choice-btn {\n            background: transparent;\n            border: none;\n            color: #ffffff;\n            font-size: 11px;\n            padding: 6px 12px;\n            border-radius: 20px;\n            cursor: pointer;\n            white-space: nowrap;\n            display: flex;\n            align-items: center;\n            gap: 5px;\n            transition: all 0.15s;\n        }\n.world-host .choice-btn:active {\n            transform: scale(0.95);\n        }\n.world-host .choice-btn.inspect-choice {\n            color: var(--text-mid);\n        }\n.world-host .choice-btn.inspect-choice:hover {\n            color: #ffffff;\n        }\n.world-host .choice-btn.link-choice {\n            background: #ffffff;\n            color: #000000;\n            font-weight: 600;\n        }\n.world-host .choice-divider {\n            width: 1px;\n            height: 12px;\n            background: var(--border-hairline);\n        }\n.world-host .modal-overlay {\n            position: fixed;\n            inset: 0;\n            background: rgba(0, 0, 0, 0.78);\n            backdrop-filter: blur(14px);\n            z-index: 200;\n            opacity: 0;\n            pointer-events: none;\n            transition: opacity 0.25s ease;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            padding: 20px;\n        }\n.world-host .modal-overlay.open {\n            opacity: 1;\n            pointer-events: auto;\n        }\n.world-host .docket-card {\n            width: 100%;\n            max-width: 350px;\n            background: var(--card-surface);\n            border: 0.5px solid var(--border-focus);\n            border-radius: 18px;\n            position: relative;\n            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95);\n            display: flex;\n            overflow: visible;\n            transform: scale(0.92);\n            opacity: 0;\n            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;\n        }\n.world-host .modal-overlay.open .docket-card {\n            transform: scale(1);\n            opacity: 1;\n        }\n.world-host .sharp-thorn {\n            position: absolute;\n            z-index: 25;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            pointer-events: none;\n        }\n.world-host .thorn-head {\n            width: 0;\n            height: 0;\n        }\n.world-host .thorn-right { right: -8px; top: 30px; }\n.world-host .thorn-right .thorn-head {\n            border-top: 5px solid transparent;\n            border-bottom: 5px solid transparent;\n            border-left: 9px solid #ffffff;\n        }\n.world-host .thorn-left { left: -8px; top: 30px; }\n.world-host .thorn-left .thorn-head {\n            border-top: 5px solid transparent;\n            border-bottom: 5px solid transparent;\n            border-right: 9px solid #ffffff;\n        }\n.world-host .docket-sidebar {\n            width: 44px;\n            border-right: 0.5px dashed var(--border-hairline);\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: space-between;\n            padding: 16px 0;\n            background: rgba(255, 255, 255, 0.015);\n        }\n.world-host .docket-code {\n            font-family: var(--font-mono);\n            font-size: 9px;\n            color: var(--text-low);\n            writing-mode: vertical-lr;\n            transform: rotate(180deg);\n            letter-spacing: 1.5px;\n        }\n.world-host .sync-indicator {\n            font-family: var(--font-mono);\n            font-size: 8px;\n            color: #ffffff;\n            writing-mode: vertical-lr;\n            letter-spacing: 1px;\n            font-weight: 700;\n        }\n.world-host .docket-main {\n            flex: 1;\n            padding: 16px 16px 16px 14px;\n            display: flex;\n            flex-direction: column;\n            gap: 12px;\n        }\n.world-host .docket-header {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n        }\n.world-host .world-anchor-tag {\n            font-family: var(--font-mono);\n            font-size: 9px;\n            color: var(--text-low);\n            letter-spacing: 0.5px;\n        }\n.world-host .stamp-capsule {\n            font-size: 9px;\n            text-transform: uppercase;\n            letter-spacing: 0.8px;\n            padding: 2px 7px;\n            border-radius: 4px;\n            background: #ffffff;\n            color: #000;\n            font-weight: 700;\n        }\n.world-host .docket-profile {\n            display: flex;\n            align-items: center;\n            gap: 12px;\n        }\n.world-host .avatar-box {\n            position: relative;\n            width: 40px;\n            height: 40px;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            flex-shrink: 0;\n        }\n.world-host .avatar-disc {\n            width: 38px;\n            height: 38px;\n            border-radius: 10px;\n            background: #181818;\n            border: 0.5px solid rgba(255, 255, 255, 0.15);\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: var(--font-serif);\n            font-size: 18px;\n            color: #ffffff;\n            position: relative;\n            z-index: 2;\n        }\n.world-host .identity-meta h3 {\n            font-size: 15px;\n            font-weight: 500;\n            display: flex;\n            align-items: center;\n            gap: 6px;\n            letter-spacing: -0.2px;\n            line-height: 1.2;\n        }\n.world-host .identity-meta p {\n            font-size: 10px;\n            color: var(--text-low);\n            margin-top: 2px;\n            font-family: var(--font-mono);\n        }\n.world-host .tether-container {\n            display: flex;\n            flex-direction: column;\n            gap: 6px;\n        }\n.world-host .tether-strip {\n            display: flex;\n            align-items: center;\n            justify-content: space-between;\n            background: rgba(255, 255, 255, 0.03);\n            border-left: 2px solid #ffffff;\n            padding: 6px 8px;\n            border-radius: 0 6px 6px 0;\n            font-size: 10.5px;\n        }\n.world-host .tether-strip.red-tether {\n            border-left-color: var(--thread-red);\n        }\n.world-host .tether-left {\n            display: flex;\n            align-items: center;\n            gap: 6px;\n            color: var(--text-mid);\n        }\n.world-host .tether-left .tether-dot {\n            width: 3px;\n            height: 3px;\n            background: #ffffff;\n            border-radius: 50%;\n        }\n.world-host .tether-strip.red-tether .tether-dot {\n            background: var(--thread-red);\n        }\n.world-host .tether-target {\n            font-weight: 600;\n            color: #ffffff;\n            font-size: 10px;\n            font-family: var(--font-mono);\n        }\n.world-host .card-close-btn {\n            background: rgba(255, 255, 255, 0.08);\n            border: 0.5px solid var(--border-hairline);\n            color: #ffffff;\n            padding: 9px;\n            border-radius: 8px;\n            font-size: 12px;\n            cursor: pointer;\n            margin-top: 4px;\n            text-align: center;\n            letter-spacing: 1px;\n            transition: all 0.2s;\n        }\n.world-host .card-close-btn:active {\n            background: #ffffff;\n            color: #000000;\n        }\n.world-host .docket-card.is-npc {\n            background: rgba(14, 14, 14, 0.55);\n            border: 0.5px dashed rgba(255, 255, 255, 0.16);\n            backdrop-filter: blur(16px);\n        }\n.world-host .docket-card.is-npc .docket-sidebar {\n            background: transparent;\n            border-right: 0.5px dashed rgba(255, 255, 255, 0.08);\n        }\n.world-host .docket-card.is-npc .avatar-disc {\n            background: transparent;\n            border-style: dashed;\n            font-size: 12px;\n            font-family: var(--font-mono);\n        }\n.world-host .center-modal {\n            width: 100%;\n            max-width: 340px;\n            background: #111111;\n            border: 0.5px solid var(--border-focus);\n            border-radius: 20px;\n            padding: 22px 20px 24px;\n            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);\n            display: flex;\n            flex-direction: column;\n            gap: 16px;\n        }\n.world-host .modal-header {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n        }\n.world-host .modal-title {\n            font-family: var(--font-serif);\n            font-size: 20px;\n            letter-spacing: -0.2px;\n        }\n.world-host .close-modal {\n            background: none;\n            border: none;\n            color: var(--text-mid);\n            font-size: 18px;\n            cursor: pointer;\n            padding: 4px;\n        }\n.world-host .input-group {\n            display: flex;\n            flex-direction: column;\n            gap: 6px;\n        }\n.world-host .input-label {\n            font-size: 11px;\n            color: var(--text-mid);\n        }\n.world-host .selector-row {\n            display: flex;\n            gap: 8px;\n        }\n.world-host .type-option {\n            flex: 1;\n            padding: 8px;\n            border-radius: 8px;\n            border: 0.5px solid var(--border-hairline);\n            background: transparent;\n            color: var(--text-mid);\n            font-size: 11px;\n            cursor: pointer;\n            text-align: center;\n            transition: all 0.2s;\n        }\n.world-host .type-option.active {\n            background: #ffffff;\n            color: #000000;\n            font-weight: 600;\n            border-color: #ffffff;\n        }\n.world-host .k-input {\n            background: rgba(255, 255, 255, 0.04);\n            border: 0.5px solid var(--border-hairline);\n            border-radius: 10px;\n            padding: 10px 12px;\n            color: #ffffff;\n            font-size: 13px;\n            outline: none;\n        }\n.world-host .submit-btn {\n            background: #ffffff;\n            color: #000000;\n            border: none;\n            padding: 11px;\n            border-radius: 10px;\n            font-weight: 600;\n            font-size: 12.5px;\n            cursor: pointer;\n            margin-top: 4px;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            gap: 6px;\n        }\n.world-host .toast-msg {\n            position: fixed;\n            top: 20px;\n            left: 50%;\n            transform: translateX(-50%) translateY(-60px);\n            background: rgba(25, 25, 25, 0.95);\n            border: 0.5px solid var(--border-focus);\n            padding: 8px 18px;\n            border-radius: 20px;\n            font-size: 12px;\n            color: #ffffff;\n            z-index: 300;\n            pointer-events: none;\n            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;\n            opacity: 0;\n            display: flex;\n            align-items: center;\n            gap: 6px;\n        }\n.world-host .toast-msg.show {\n            transform: translateX(-50%) translateY(0);\n            opacity: 1;\n        }/* 页面整体下移 35px，标题加大 */\n.world-host .k-phone { margin-top: 35px; height: calc(100% - 35px); background: transparent; }\n.world-host .header-title { font-size: 40px; }\n.world-host .world-pill span, .world-host .choice-btn span { display: inline-block; color: inherit; font-size: inherit; opacity: 1; visibility: visible; -webkit-text-fill-color: currentColor; }\n.world-host .node-avatar { position: relative; overflow: hidden; }\n.world-host .node-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }\n.world-host .npc-list { max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }\n.world-host .npc-item { font-size: 12px; padding: 7px 10px; border: 0.5px solid var(--border-hairline); border-radius: 12px; cursor: pointer; color: var(--text-high); }\n.world-host .npc-item.on { border-color: var(--border-focus); background: rgba(255, 255, 255, 0.1); }\n\n.world-host .npc-status { font-size: 11px; color: var(--text-mid); margin-top: 8px; min-height: 14px; }\n.world-host .filter-section { flex-wrap: nowrap; }\n.world-host .filter-row { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; margin-right: 58px; }\n.world-host .group-box { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; }\n.world-host .fchip { border: 0.5px solid var(--border-hairline); background: rgba(18, 18, 18, 0.75); backdrop-filter: blur(12px); color: var(--text-mid); font-size: 11px; border-radius: 20px; cursor: pointer; white-space: nowrap; }\n.world-host .fchip.active { background: #ffffff; color: #000000; border-color: #ffffff; font-weight: 600; }\n.world-host .fchip { transition: width .24s ease, padding .24s ease, border-radius .24s ease, background-color .2s ease, color .2s ease; }\n\n\n.world-host { background: linear-gradient(rgba(6,6,6,0.55), rgba(6,6,6,0.55)), url('assets/app/世界壁纸.jpg') center / cover no-repeat #060606; }\n";

window.initWorldModule = function (host) {
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    const WORLD_FIX_CSS = `
        .world-host header { background: transparent !important; }
        .world-host header > div:first-child { min-width: 0; flex: 1 1 auto; }
        .world-host .header-title { font-size: clamp(40px, 11vw, 56px) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; line-height: 1.05 !important; }
        .world-host .world-pill { flex-shrink: 0 !important; white-space: nowrap !important; word-break: keep-all !important; display: inline-flex !important; flex-direction: row !important; align-items: center !important; }
        .world-host .world-pill span { white-space: nowrap !important; }
        .world-host .filter-section { top: 118px !important; flex-wrap: nowrap !important; }
        .world-host .linking-banner { top: 156px !important; }
        .world-host .zoom-controls { top: 160px !important; }
    `;
    root.innerHTML = "<style>" + WORLD_CSS + WORLD_FIX_CSS + "</style><div class=\"world-host\">" + WORLD_MARKUP + "</div>";
    const $ = id => root.querySelector("#" + CSS.escape(id));
    const pill = $('worldPillBtn');
    if (pill) pill.innerHTML = '<span class="dot"></span><span style="white-space:nowrap;">退出</span>';

    // ======= 实体数据字典 (明确区分白角与红角) =======
    const docketDB = {
        npc_butler: {
            name: "[NPC] 执事智能 01",
            role: "AUTONOMOUS // SERVANT",
            docCode: "SYN-01-KR",
            sync: "BINDING",
            sector: "SUB-CONSTRUCT",
            stamp: "NPC",
            avatar: "01",
            isNpc: true,
            hornColor: "#ffffff",
            tethers: [
                { label: "所属联系人", target: "JI-YOON HAN", isRed: false }
            ]
        },
        npc_drone: {
            name: "[NPC] 巡检蜂群 09",
            role: "DEFENSE // DRONE",
            docCode: "SYN-09-KR",
            sync: "BINDING",
            sector: "SUB-CONSTRUCT",
            stamp: "NPC",
            avatar: "09",
            isNpc: true,
            hornColor: "var(--thread-red)",
            tethers: [
                { label: "特殊红线", target: "MIN-HO SONG", isRed: true }
            ]
        }
    };

    // ======= 连线列表 =======
    let relations = [];

    // ======= 1. 画布平移、缩放与头像拖拽引擎 =======
    const viewport = $('graphViewport');
    const scene = $('graphScene');
    const phone = $('phoneContainer');
    const choicePop = $('nodeChoicePop');

    let scale = 0.95;
    let panX = 0, panY = 0;

    let isCanvasDragging = false;
    let isNodeDragging = false;
    let activeDragNode = null;
    let startPointerX = 0, startPointerY = 0;
    let nodeOffsetX = 0, nodeOffsetY = 0;
    let canvasStartX = 0, canvasStartY = 0;
    let hasMovedSignificantly = false;

    let initialPinchDistance = null;
    let initialScale = 1;

    function centerScene() {
        const pRect = phone.getBoundingClientRect();
        scale = 0.95;
        panX = pRect.width / 2 - 600 * scale;
        panY = pRect.height / 2 - 600 * scale;
        updateTransform();
        hideChoicePop();
    }

    function updateTransform() {
        scene.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
    }

    function applyZoom(delta) {
        const newScale = Math.min(Math.max(scale + delta, 0.5), 1.9);
        const pRect = phone.getBoundingClientRect();
        const cx = pRect.width / 2;
        const cy = pRect.height / 2;
        panX = cx - (cx - panX) * (newScale / scale);
        panY = cy - (cy - panY) * (newScale / scale);
        scale = newScale;
        updateTransform();
        hideChoicePop();
    }

    // 触控/鼠标按下
    function pointerDown(clientX, clientY, target) {
        startPointerX = clientX;
        startPointerY = clientY;
        hasMovedSignificantly = false;

        const node = target.closest('.avatar-node');
        if (node) {
            isNodeDragging = true;
            activeDragNode = node;
            const pRect = phone.getBoundingClientRect();
            const sceneX = (clientX - panX - pRect.left) / scale;
            const sceneY = (clientY - panY - pRect.top) / scale;
            nodeOffsetX = sceneX - parseFloat(node.style.left);
            nodeOffsetY = sceneY - parseFloat(node.style.top);
        } else {
            isCanvasDragging = true;
            canvasStartX = clientX - panX;
            canvasStartY = clientY - panY;
            // 点击空白处收起微胶囊
            if (!target.closest('#nodeChoicePop')) {
                hideChoicePop();
            }
        }
    }

    function pointerMove(clientX, clientY) {
        const dist = Math.hypot(clientX - startPointerX, clientY - startPointerY);
        if (dist > 5) {
            hasMovedSignificantly = true;
            hideChoicePop();
        }

        if (isNodeDragging && activeDragNode) {
            const pRect = phone.getBoundingClientRect();
            const sceneX = (clientX - panX - pRect.left) / scale;
            const sceneY = (clientY - panY - pRect.top) / scale;
            activeDragNode.style.left = `${Math.round(sceneX - nodeOffsetX)}px`;
            activeDragNode.style.top = `${Math.round(sceneY - nodeOffsetY)}px`;
            renderTetherLines();
        } else if (isCanvasDragging) {
            panX = clientX - canvasStartX;
            panY = clientY - canvasStartY;
            updateTransform();
        }
    }

    function pointerUp(target) {
        // 如果未发生实质拖拽，判定为精准轻点头像！
        if (!hasMovedSignificantly) {
            const clickedNode = target.closest('.avatar-node');
            if (clickedNode) {
                handleNodeTap(clickedNode);
            }
        } else if (isNodeDragging && activeDragNode) {
            saveNodePosition(activeDragNode);
        }
        isNodeDragging = false;
        activeDragNode = null;
        isCanvasDragging = false;
    }

    let lastTouchAt = 0;
    const recentTouch = () => Date.now() - lastTouchAt < 800;
    viewport.addEventListener('mousedown', (e) => { if (!recentTouch()) pointerDown(e.clientX, e.clientY, e.target); });
    window.addEventListener('mousemove', (e) => { if (!recentTouch()) pointerMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', (e) => { if (!recentTouch()) pointerUp(e.composedPath()[0]); });

    viewport.addEventListener('touchstart', (e) => {
        lastTouchAt = Date.now();
        if (e.touches.length === 1) {
            pointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
        } else if (e.touches.length === 2) {
            isCanvasDragging = false;
            isNodeDragging = false;
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialScale = scale;
            hideChoicePop();
        }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            pointerMove(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2 && initialPinchDistance) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            scale = Math.min(Math.max(initialScale * (dist / initialPinchDistance), 0.5), 1.9);
            updateTransform();
        }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
        lastTouchAt = Date.now();
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const target = root.elementFromPoint(touch.clientX, touch.clientY);
            pointerUp(target || e.target);
        }
        initialPinchDistance = null;
    });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        applyZoom(e.deltaY < 0 ? 0.08 : -0.08);
    }, { passive: false });

    $('btnZoomIn').addEventListener('click', () => applyZoom(0.18));
    $('btnZoomOut').addEventListener('click', () => applyZoom(-0.18));
    $('btnReset').addEventListener('click', () => {
        centerScene();
        showToast('已居中');
    });

    // ======= 2. 动态连线与尖刺渲染 =======
    function renderTetherLines() {
        const svg = $('svg-canvas');
        svg.setAttribute('width', '1200');
        svg.setAttribute('height', '1200');
        svg.innerHTML = '';

        relations.forEach(rel => {
            const el1 = $(rel.from);
            const el2 = $(rel.to);

            if (!el1 || !el2) return;
            if (el1.classList.contains('hidden') || el2.classList.contains('hidden')) return;

            const x1 = parseFloat(el1.style.left);
            const y1 = parseFloat(el1.style.top);
            const x2 = parseFloat(el2.style.left);
            const y2 = parseFloat(el2.style.top);

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dx = y2 - y1;
            const dy = -(x2 - x1);
            const len = Math.sqrt(dx * dx + dy * dy);
            const cx = midX + (dx / len) * 16;
            const cy = midY + (dy / len) * 16;

            const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('class', rel.isRed ? 'thread-line-red' : 'thread-line-white');
            svg.appendChild(path);

            const spikeColor = rel.isRed ? 'var(--thread-red)' : '#ffffff';
            createSpike(x1, y1, cx, cy, spikeColor);
            createSpike(x2, y2, cx, cy, spikeColor);
        });
    }

    function createSpike(x, y, targetX, targetY, color) {
        const svg = $('svg-canvas');
        const angle = Math.atan2(targetY - y, targetX - x);
        const spikeLen = 8;
        const spikeWidth = 4;

        const startX = x + Math.cos(angle) * 28;
        const startY = y + Math.sin(angle) * 28;

        const tipX = startX + Math.cos(angle) * spikeLen;
        const tipY = startY + Math.sin(angle) * spikeLen;
        const leftX = startX + Math.cos(angle + Math.PI / 2) * spikeWidth;
        const leftY = startY + Math.sin(angle + Math.PI / 2) * spikeWidth;
        const rightX = startX + Math.cos(angle - Math.PI / 2) * spikeWidth;
        const rightY = startY + Math.sin(angle - Math.PI / 2) * spikeWidth;

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
        polygon.setAttribute('fill', color);
        svg.appendChild(polygon);
    }

    // ======= 3. 核心机制：点击头像弹出「悬浮选择胶囊」与牵线链路 =======
    let selectedNodeForPop = null;
    let linkingSourceNode = null;
    const linkingBanner = $('linkingBanner');

    function hideChoicePop() {
        choicePop.classList.remove('open');
        selectedNodeForPop = null;
    }

    function handleNodeTap(node) {
        // 如果当前正处于牵线模式
        if (linkingSourceNode) {
            if (linkingSourceNode !== node) {
                completeLink(linkingSourceNode, node);
            }
            exitLinkingMode();
            return;
        }

        // 正常状态：在视口层面精准计算头像屏幕坐标，弹出悬浮微胶囊
        selectedNodeForPop = node;
        const pRect = phone.getBoundingClientRect();
        const nRect = node.getBoundingClientRect();

        // 位于头像正上方 8px
        const popX = nRect.left - pRect.left + nRect.width / 2;
        const popY = nRect.top - pRect.top - 8;

        choicePop.style.left = `${popX}px`;
        choicePop.style.top = `${popY}px`;
        choicePop.classList.add('open');
    }

    // 微胶囊选项 1：查看卡片
    $('btnPopInspect').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedNodeForPop) return;
        const id = selectedNodeForPop.getAttribute('data-id');
        openDocketCard(id);
        hideChoicePop();
    });

    // 微胶囊选项 2：发起牵线
    $('btnPopLink').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedNodeForPop) return;
        enterLinkingMode(selectedNodeForPop);
        hideChoicePop();
    });

    function enterLinkingMode(sourceNode) {
        linkingSourceNode = sourceNode;
        sourceNode.classList.add('linking-source');
        linkingBanner.classList.add('show');
        const name = sourceNode.querySelector('.node-name').innerText.trim();
        $('linkingText').innerText = `已选 ${name}，点击另一人牵线`;
    }

    function exitLinkingMode() {
        if (linkingSourceNode) {
            linkingSourceNode.classList.remove('linking-source');
            linkingSourceNode = null;
        }
        linkingBanner.classList.remove('show');
    }

    $('btnCancelLink').addEventListener('click', (e) => {
        e.stopPropagation();
        exitLinkingMode();
    });

    let pendingLink = null;
    const relModal = $('relModal');
    function completeLink(nodeA, nodeB) {
        const idA = nodeA.id;
        const idB = nodeB.id;
        const exists = relations.some(r => (r.from === idA && r.to === idB) || (r.from === idB && r.to === idA));
        if (exists) { showToast('两者已有连线'); return; }
        pendingLink = {
            idA, idB,
            nameA: nodeA.querySelector('.node-name').innerText.trim(),
            nameB: nodeB.querySelector('.node-name').innerText.trim()
        };
        $('relTitle').innerText = pendingLink.nameA + ' ⇄ ' + pendingLink.nameB;
        $('relInput').value = '';
        relModal.classList.add('open');
        setTimeout(() => $('relInput').focus(), 50);
    }
    function closeRelModal() { relModal.classList.remove('open'); pendingLink = null; }
    $('relCancel').addEventListener('click', closeRelModal);
    relModal.addEventListener('click', (e) => { if (e.target === relModal) closeRelModal(); });
    $('relOk').addEventListener('click', () => {
        if (!pendingLink) return;
        const label = $('relInput').value.trim() || '关联';
        relations.push({ from: pendingLink.idA, to: pendingLink.idB, isRed: false, label });
        saveRelations();
        renderTetherLines();
        showToast(`已牵线: ${pendingLink.nameA} ⇄ ${pendingLink.nameB}`);
        closeRelModal();
    });

    // ======= 4. 卡片详情展示 =======
    const docketModal = $('docketModal');
    const inspectCard = $('inspectCard');

    function openDocketCard(id) {
        const data = docketDB[id];
        if (!data) return;

        $('cardDocCode').innerText = data.docCode;
        $('cardSync').innerText = data.sync;
        $('cardSector').innerText = data.sector;
        $('cardStamp').innerText = data.stamp;
        $('cardName').innerText = data.name;
        $('cardRole').innerText = data.role;
        $('cardAvatarDisc').innerText = data.avatar; { const disc = $('cardAvatarDisc'); disc.style.position = 'relative'; disc.style.overflow = 'hidden'; if (data.avatarImg) disc.insertAdjacentHTML('afterbegin', '<img src="' + escHtml(data.avatarImg) + '" alt="" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'); }

        const cardHorns = $('cardHorn').querySelectorAll('path');
        cardHorns.forEach(p => p.setAttribute('fill', data.hornColor));

        if (data.isNpc) {
            inspectCard.classList.add('is-npc');
        } else {
            inspectCard.classList.remove('is-npc');
        }

        const tetherContainer = $('cardTethers');
        tetherContainer.innerHTML = '';
        data.tethers.forEach(t => {
            const strip = document.createElement('div');
            strip.className = `tether-strip ${t.isRed ? 'red-tether' : ''}`;
            strip.innerHTML = `
                <div class="tether-left">
                    <span class="tether-dot"></span>
                    <span>${t.label}</span>
                </div>
                <span class="tether-target">${t.target}</span>
            `;
            tetherContainer.appendChild(strip);
        });

        docketModal.classList.add('open');
    }

    $('btnCloseDocket').addEventListener('click', () => docketModal.classList.remove('open'));
    docketModal.addEventListener('click', (e) => {
        if (e.target === docketModal) docketModal.classList.remove('open');
    });

    // ======= 5. 分组筛选 =======
    const chips = root.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const filter = chip.getAttribute('data-filter');
            root.querySelectorAll('.avatar-node').forEach(node => {
                if (filter === 'all' || matchFilter(node, filter)) {
                    node.classList.remove('hidden');
                } else {
                    node.classList.add('hidden');
                }
            });

            renderTetherLines();
            hideChoicePop();
            showToast(`已筛选: ${chip.innerText}`);
        });
    });

    // ======= 6. NEW TETHER 弹窗 =======
    const createModal = $('createModal');
    $('btnOpenCreate').addEventListener('click', () => {
        createModal.classList.add('open');
        hideChoicePop();
    });
    $('btnCloseCreate').addEventListener('click', () => createModal.classList.remove('open'));
    createModal.addEventListener('click', (e) => {
        if (e.target === createModal) createModal.classList.remove('open');
    });

    const typeOptions = root.querySelectorAll('.type-option');
    typeOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            typeOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    $('btnSubmit').addEventListener('click', () => {
        if (isNpcMode()) { generateNpc(); return; }
        const val = $('entityName').value.trim();
        if (!val) { showToast('请输入名字'); return; }
        createModal.classList.remove('open');
        $('entityName').value = '';
        hideChoicePop();
        // 跳转到消息应用的联系人设置（与消息应用共用同一份联系人数据）
        if (typeof window.openApp === 'function') window.openApp('chat');
        setTimeout(() => {
            if (typeof window.openNewContact === 'function') window.openNewContact(null);
            if (typeof window.fillPersona === 'function') {
                window.fillPersona({ id: '', name: val, status: '', sig: '', persona: '', speech: '', relation: '', backstory: '', replies: [], avatar: '' });
            }
        }, 300);
    });

    $('btnWorldOverview').addEventListener('click', () => {
        showToast(`${readContacts().length} 个联系人，2 个 NPC`);
        hideChoicePop();
    });
    $('worldPillBtn').addEventListener('click', () => {
        closeApp();
    });

    function showToast(text) {
        const toast = $('toast');
        $('toast-text').innerText = text;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // 初始化运行

    // ======= 7. 联系人同步 & 连线持久化（数据存于 DB：world_tethers_v1） =======
    const WORLD_CONTACTS_KEY = 'forever_messages_contacts_v1';
    const WORLD_TETHER_KEY = 'world_tethers_v1';
    const escHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const contactKey = c => 'c-' + String(c.id).replace(/[^a-zA-Z0-9_-]/g, '_');

    function readContacts() {
        try {
            // 优先使用消息应用里的实时联系人数据（含刚设置的头像），没有时再读存储
            const live = (typeof CONTACTS !== 'undefined' && Array.isArray(CONTACTS)) ? CONTACTS : null;
            const list = live || JSON.parse(localStorage.getItem(WORLD_CONTACTS_KEY) || '[]');
            return Array.isArray(list) ? list.filter(c => c && c.id != null) : [];
        } catch (_) { return []; }
    }

    const WORLD_POSITIONS_KEY = 'world_node_positions_v1';
    let nodePositions = {};
    function loadPositions() {
        try {
            nodePositions = JSON.parse(localStorage.getItem(WORLD_POSITIONS_KEY) || '{}') || {};
        } catch (_) { nodePositions = {}; }
    }
    function savePositions() {
        try { localStorage.setItem(WORLD_POSITIONS_KEY, JSON.stringify(nodePositions)); } catch (_) {}
        if (window.DB) DB.save(WORLD_POSITIONS_KEY, nodePositions);
    }
    function saveNodePosition(node) {
        if (!node) return;
        const key = node.dataset.id || node.id;
        const x = parseFloat(node.style.left);
        const y = parseFloat(node.style.top);
        if (!key || isNaN(x) || isNaN(y)) return;
        const pos = { x: Math.round(x), y: Math.round(y) };
        nodePositions[key] = pos;
        if (node.id) nodePositions[node.id] = pos;
        savePositions();
    }
    function saveRelations() {
        try { localStorage.setItem(WORLD_TETHER_KEY, JSON.stringify(relations)); } catch (_) {}
        if (window.DB) DB.save(WORLD_TETHER_KEY, relations);
    }

    function buildContactNodes() {
        const scene = $('graphScene');
        root.querySelectorAll('.avatar-node[data-id^="c-"]').forEach(n => n.remove());
        readContacts().forEach((c, i) => {
            const key = contactKey(c);
            const nodeId = 'node-' + key;
            const name = String(c.remark || c.name || '未命名联系人');
            const status = String(c.status || '联系人');
            const ini = (name.charAt(0) || '?').toUpperCase();
            // 没有设置头像时使用消息应用的默认联系人头像
            const avatarSrc = c.avatar || 'assets/聊天默认头像/chartouxiang.jpg';
            let x = 600, y = 600, cls = 'node-center';
            if (i > 0) {
                const k = i - 1, r = 200 + (k % 2) * 110, a = k * 2.399963;
                x = 600 + r * Math.cos(a); y = 600 + r * Math.sin(a); cls = 'node-satellite';
            }
            const savedPos = nodePositions[key] || nodePositions[nodeId];
            if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
                x = savedPos.x;
                y = savedPos.y;
            }
            docketDB[key] = {
                name, role: status, docCode: 'ID.' + String(c.id).slice(-4).toUpperCase(),
                sync: 'SYNC --', sector: 'SECTOR_CONTACT // #' + String(i + 1).padStart(2, '0'),
                stamp: 'CONTACT', avatar: ini, avatarImg: avatarSrc, isNpc: false, hornColor: '#ffffff',
                get tethers() {
                    return relations.filter(r => r.from === nodeId || r.to === nodeId).map(r => {
                        const otherId = r.from === nodeId ? r.to : r.from;
                        const el = $(otherId);
                        const target = el && el.querySelector('.node-name') ? el.querySelector('.node-name').innerText.trim() : otherId;
                        return { label: r.label || (r.isRed ? '特殊红线' : '关联联系人'), target, isRed: !!r.isRed };
                    });
                }
            };
            const el = document.createElement('div');
            el.className = 'avatar-node ' + cls;
            el.id = nodeId; el.dataset.id = key; el.dataset.type = c.npc ? 'npc' : 'contact'; el.dataset.folder = c.folder || '';
            el.style.left = x + 'px'; el.style.top = y + 'px';
            el.innerHTML =
                '<div class="node-avatar-wrap">' +
                '<svg class="inverted-devil-horns" viewBox="0 0 28 9" fill="none">' +
                '<path d="M7 8.5 C7 6 6 5.5 5.2 4 L5.2 0.8 L6.8 0.8 L7.8 4.5 C8 6.5 8.2 7.5 8.2 8.5 Z" fill="#ffffff"/>' +
                '<path d="M21 8.5 C21 6 22 5.5 22.8 4 L22.8 0.8 L21.2 0.8 L20.2 4.5 C20 6.5 19.8 7.5 19.8 8.5 Z" fill="#ffffff"/>' +
                '</svg>' +
                '<div class="node-avatar"><img src="' + escHtml(avatarSrc) + '" alt="" onerror="this.remove()">' + escHtml(ini) + '</div></div>' +
                '<div class="node-meta"><span class="node-name">' + escHtml(name) + '</span>' +
                '<span class="node-role">' + escHtml(status) + '</span></div>';
            scene.appendChild(el);
        });
    }

    async function loadRelations() {
        try {
            let saved = null;
            if (window.DB) {
                try { saved = await DB.load(WORLD_TETHER_KEY, null); } catch (_) {}
            }
            if (!saved || !Array.isArray(saved) || !saved.length) {
                saved = JSON.parse(localStorage.getItem(WORLD_TETHER_KEY) || '[]');
            }
            relations = Array.isArray(saved) ? saved : [];
        } catch (_) { relations = []; }
        renderTetherLines();
    }
    async function loadPositionsAsync() {
        if (window.DB) {
            try {
                const saved = await DB.load(WORLD_POSITIONS_KEY, null);
                if (saved && typeof saved === 'object') {
                    nodePositions = Object.assign({}, saved, nodePositions);
                    root.querySelectorAll('.avatar-node').forEach(node => {
                        const key = node.dataset.id || node.id;
                        const pos = nodePositions[key] || nodePositions[node.id];
                        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
                            node.style.left = `${pos.x}px`;
                            node.style.top = `${pos.y}px`;
                        }
                    });
                    renderTetherLines();
                }
            } catch (_) {}
        }
    }

    // ======= 8. 筛选与分组（与消息应用共用 FOLDERS）=======
    let activeFilter = 'all';
    // 尺寸与形状直接写成内联样式，保证未展开的分组是圆球，不受其他样式覆盖
    const GROUP_BALL_CSS = 'width:26px;height:26px;min-width:26px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto;';
    const GROUP_EXPANDED_CSS = 'width:auto;height:26px;min-width:26px;padding:0 14px;border-radius:20px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;';
    let menuFid = null;
    let pickFid = null;
    const groupModal = $('groupModal');
    const groupMenuModal = $('groupMenuModal');
    const groupPickModal = $('groupPickModal');

    const WORLD_FOLDERS_KEY = 'forever_messages_folders_v1';
    function saveFoldersLocal(list) {
        try { localStorage.setItem(WORLD_FOLDERS_KEY, JSON.stringify(list)); } catch (_) {}
        if (typeof persistFolders === 'function') persistFolders();
    }
    function saveContactsLocal(list) {
        try { localStorage.setItem(WORLD_CONTACTS_KEY, JSON.stringify(list)); } catch (_) {}
        if (typeof persistContacts === 'function') persistContacts();
    }
    function matchFilter(node, filter) {
        if (filter === 'all') return true;
        if (filter.indexOf('folder:') === 0) return String(node.dataset.folder || '') === String(filter.slice(7));
        return node.getAttribute('data-type') === filter;
    }
    function applyFilter(filter) {
        activeFilter = filter;
        root.querySelectorAll('.avatar-node').forEach(n => n.classList.toggle('hidden', !matchFilter(n, filter)));
        hideChoicePop();
        renderTetherLines();
        renderFilterRow();
    }
    function folderList() {
        if (typeof FOLDERS !== 'undefined' && Array.isArray(FOLDERS)) return FOLDERS;
        try {
            const list = JSON.parse(localStorage.getItem(WORLD_FOLDERS_KEY) || '[]');
            if (Array.isArray(list)) {
                if (typeof window !== 'undefined') window.FOLDERS = list;
                return list;
            }
        } catch (_) {}
        const fallback = [];
        if (typeof window !== 'undefined') window.FOLDERS = fallback;
        return fallback;
    }
    function removeGroup(fid) {
        const list = folderList();
        const idx = list.findIndex(f => String(f.id) === String(fid));
        if (idx < 0) return;
        const name = list[idx].name;
        list.splice(idx, 1);
        saveFoldersLocal(list);
        const cs = readContacts();
        cs.forEach(c => { if (String(c.folder || '') === String(fid)) c.folder = null; });
        if (typeof CONTACTS !== 'undefined' && Array.isArray(CONTACTS)) {
            CONTACTS.forEach(c => { if (String(c.folder || '') === String(fid)) c.folder = null; });
        }
        saveContactsLocal(cs);
        buildContactNodes();
        applyFilter(activeFilter === 'folder:' + fid ? 'all' : activeFilter);
        renderFilterRow();
        showToast('已删除分组: ' + name);
    }
    function filterItems() {
        const cs = readContacts();
        const items = [
            { key: 'all', label: 'All Nodes' },
            { key: 'contact', label: 'Contacts (' + cs.filter(c => !c.npc).length + ')' },
            { key: 'npc', label: 'NPC Bindings (' + cs.filter(c => c.npc).length + ')' }
        ];
        folderList().forEach(f => items.push({ key: 'folder:' + f.id, label: f.name, fid: f.id }));
        return items;
    }
    // 按钮复用：展开/收起时只改变尺寸与颜色，形成过渡动画
    const filterBtns = new Map();
    const GROUP_BASE_CSS = 'display:flex;align-items:center;justify-content:center;flex:0 0 auto;height:26px;box-sizing:border-box;overflow:hidden;';
    function styleFilterBtn(b, on, label) {
        if (b.dataset.on === String(on) && b.dataset.label === label) return;
        b.dataset.on = String(on);
        b.dataset.label = label;
        if (on) {
            b.textContent = label;
            b.classList.add('active');
            b.style.padding = '0 14px';
            b.style.borderRadius = '20px';
            b.style.width = 'auto';
            const target = b.getBoundingClientRect().width;
            b.style.width = '26px';
            void b.offsetWidth;
            b.style.width = target + 'px';
        } else {
            b.classList.remove('active');
            b.style.width = b.getBoundingClientRect().width + 'px';
            void b.offsetWidth;
            b.style.padding = '0';
            b.style.borderRadius = '50%';
            b.style.width = '26px';
            b.textContent = '';
        }
    }
    function attachLongPress(b) {
        let timer = null;
        b.addEventListener('pointerdown', () => {
            b.dataset.fired = '';
            timer = setTimeout(() => { b.dataset.fired = '1'; openGroupMenu(b.dataset.fid); }, 600);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(timer)));
    }
    function renderFilterRow() {
        const box = $('groupBox');
        const items = filterItems();
        const keep = new Set(items.map(i => i.key));
        filterBtns.forEach((b, k) => { if (!keep.has(k)) { b.remove(); filterBtns.delete(k); } });
        items.forEach(item => {
            let b = filterBtns.get(item.key);
            if (!b) {
                b = document.createElement('button');
                b.className = 'fchip';
                b.style.cssText = GROUP_BASE_CSS;
                b.style.width = '26px';
                b.style.padding = '0';
                b.style.borderRadius = '50%';
                if (item.fid) { b.dataset.fid = item.fid; attachLongPress(b); }
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (b.dataset.fired === '1') { b.dataset.fired = ''; return; }
                    applyFilter(activeFilter === b.dataset.key ? 'all' : b.dataset.key);
                });
                b.dataset.key = item.key;
                filterBtns.set(item.key, b);
            }
            b.title = item.label;
            box.appendChild(b);
            styleFilterBtn(b, activeFilter === item.key, item.label);
        });
    }
    function openGroupMenu(fid) {
        const f = folderList().find(x => x.id === fid);
        if (!f) return;
        menuFid = fid;
        $('groupMenuTitle').innerText = f.name;
        groupMenuModal.classList.add('open');
    }
    function openGroupPick(fid) {
        const cs = readContacts();
        $('gpContacts').innerHTML = cs.length
            ? cs.map(c => '<div class="npc-item' + (String(c.folder || '') === String(fid) ? ' on' : '') + '" data-cid="' + escHtml(c.id) + '">' + escHtml(c.remark || c.name || '未命名') + '</div>').join('')
            : '<div class="npc-status">还没有联系人</div>';
        $('gpContacts').querySelectorAll('.npc-item').forEach(el => el.addEventListener('click', () => el.classList.toggle('on')));
        pickFid = fid;
        groupPickModal.classList.add('open');
    }
    $('gmPick').addEventListener('click', () => { groupMenuModal.classList.remove('open'); openGroupPick(menuFid); });
    $('gmDelete').addEventListener('click', () => { groupMenuModal.classList.remove('open'); removeGroup(menuFid); });
    $('gmCancel').addEventListener('click', () => groupMenuModal.classList.remove('open'));
    groupMenuModal.addEventListener('click', (e) => { if (e.target === groupMenuModal) groupMenuModal.classList.remove('open'); });
    $('gpCancel').addEventListener('click', () => groupPickModal.classList.remove('open'));
    groupPickModal.addEventListener('click', (e) => { if (e.target === groupPickModal) groupPickModal.classList.remove('open'); });
    $('gpSave').addEventListener('click', () => {
        const picked = new Set([...$('gpContacts').querySelectorAll('.npc-item.on')].map(el => String(el.dataset.cid)));
        const cs = readContacts();
        cs.forEach(c => {
            if (picked.has(String(c.id))) c.folder = pickFid;
            else if (String(c.folder || '') === String(pickFid)) c.folder = null;
        });
        if (typeof CONTACTS !== 'undefined' && Array.isArray(CONTACTS)) {
            CONTACTS.forEach(c => {
                if (picked.has(String(c.id))) c.folder = pickFid;
                else if (String(c.folder || '') === String(pickFid)) c.folder = null;
            });
        }
        saveContactsLocal(cs);
        groupPickModal.classList.remove('open');
        buildContactNodes();
        applyFilter(activeFilter);
        renderTetherLines();
        showToast('已更新分组成员');
    });
    $('addGroupBtn').addEventListener('click', () => {
        $('groupName').value = '';
        groupModal.classList.add('open');
        setTimeout(() => $('groupName').focus(), 50);
    });
    $('groupCancel').addEventListener('click', () => groupModal.classList.remove('open'));
    groupModal.addEventListener('click', (e) => { if (e.target === groupModal) groupModal.classList.remove('open'); });
    $('groupOk').addEventListener('click', () => {
        const name = $('groupName').value.trim();
        if (!name) { showToast('请输入分组名字'); return; }
        const list = folderList();
        list.push({ id: 'f' + Date.now(), name });
        saveFoldersLocal(list);
        groupModal.classList.remove('open');
        renderFilterRow();
        showToast('已新建分组: ' + name);
    });

    // ======= 9. 新建联系人与生成 NPC：同一个弹窗 =======
    function isNpcMode() {
        const on = root.querySelector('.type-option.active');
        return !!on && on.dataset.type === 'npc';
    }
    function populateNpcList() {
        const list = $('npcContacts');
        const cs = readContacts();
        list.innerHTML = cs.length
            ? cs.map(c => '<div class="npc-item" data-cid="' + escHtml(c.id) + '">' + escHtml(c.remark || c.name || '未命名') + '</div>').join('')
            : '<div class="npc-status">还没有联系人，生成的 NPC 将不关联任何人</div>';
        list.querySelectorAll('.npc-item').forEach(el => el.addEventListener('click', () => el.classList.toggle('on')));
    }
    function setTetherMode(npc) {
        root.querySelectorAll('.contact-only').forEach(el => { el.style.display = npc ? 'none' : ''; });
        $('npcSection').style.display = npc ? '' : 'none';
        $('btnSubmit').innerText = npc ? '生成 NPC' : '确认建立联系';
        if (npc) { populateNpcList(); $('npcStatus').innerText = ''; }
    }
    root.querySelectorAll('.type-option').forEach(o => o.addEventListener('click', () => setTetherMode(o.dataset.type === 'npc')));

    function parseNpcJson(raw) {
        const t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const i = t.indexOf('['), j = t.lastIndexOf(']');
        if (i < 0 || j < i) return [];
        try {
            const arr = JSON.parse(t.slice(i, j + 1));
            return Array.isArray(arr) ? arr.filter(x => x && x.name) : [];
        } catch (_) { return []; }
    }
    function saveNpcContacts(items, selContacts) {
        let cs = (typeof CONTACTS !== 'undefined' && Array.isArray(CONTACTS)) ? CONTACTS : null;
        if (!cs) {
            cs = readContacts();
            if (typeof window !== 'undefined') window.CONTACTS = cs;
        }
        const norm = typeof normalizeContact === 'function' ? normalizeContact : (x => x);
        const stamp = Date.now();
        items.forEach((o, i) => {
            const name = String(o.name).trim();
            const c = norm({ id: 'npc' + stamp + '_' + i, name, remark: name, ini: (name.charAt(0) || 'N').toUpperCase(), status: String(o.status || 'NPC'), sig: String(o.sig || ''), persona: String(o.persona || ''), avatar: '', time: '' });
            c.npc = true;
            cs.unshift(c);
            const nKey = contactKey(c);
            const nNodeId = 'node-' + nKey;
            if (selContacts && selContacts.length > 0) {
                const firstSc = selContacts[0];
                const pKey = contactKey(firstSc);
                const pNodeId = 'node-' + pKey;
                const pEl = $(pNodeId);
                let px = 600, py = 600;
                if (pEl) {
                    px = parseFloat(pEl.style.left) || 600;
                    py = parseFloat(pEl.style.top) || 600;
                } else if (nodePositions[pKey]) {
                    px = nodePositions[pKey].x;
                    py = nodePositions[pKey].y;
                }
                const angle = (i * 1.5) + (Math.random() * 0.4 - 0.2);
                const dist = 110 + (i % 2) * 30;
                const nx = Math.round(px + Math.cos(angle) * dist);
                const ny = Math.round(py + Math.sin(angle) * dist);
                nodePositions[nKey] = { x: nx, y: ny };
                nodePositions[nNodeId] = { x: nx, y: ny };
            }
            selContacts.forEach(sc => {
                const fromId = 'node-' + contactKey(sc);
                const toId = nNodeId;
                const exists = relations.some(r => (r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId));
                if (!exists) {
                    relations.push({ from: fromId, to: toId, isRed: false, label: o.relation || '关联NPC' });
                }
            });
        });
        saveContactsLocal(cs);
        savePositions();
        saveRelations();
        return items.length;
    }
    async function generateNpc() {
        const api = window.MessagesAPI;
        if (!api || !api.isConfigured()) { showToast('请先在「设置 → API」保存接口配置'); return; }
        const status = $('npcStatus');
        const go = $('btnSubmit');
        const selIds = [...$('npcContacts').querySelectorAll('.npc-item.on')].map(el => el.dataset.cid);
        const selContacts = readContacts().filter(c => selIds.includes(String(c.id)));
        const n = parseInt($('npcCount').value, 10);
        const count = n > 0 ? Math.min(n, 10) : 0;
        const extra = $('npcExtra').value.trim();
        status.innerText = '生成中…';
        go.disabled = true;
        const sys = '你是角色设定生成器。只输出一个 JSON 数组，不要输出任何其他文字或代码块。每个元素格式为 {"name":"姓名","status":"一句话状态","sig":"个性签名","persona":"人设与背景，100字以内"}。';
        const ctx = selContacts.length
            ? '关联联系人：\n' + selContacts.map(c => '- ' + (c.remark || c.name) + '：' + (c.persona || c.status || '')).join('\n')
            : '没有指定关联联系人，请自由设计。';
        const user = ctx + '\n生成数量：' + (count ? count + ' 个' : '由你决定（1-3 个）') + '\n附加补充：' + (extra || '无') + '\n请生成 NPC，并尽量与关联联系人或已有设定相关。';
        try {
            const raw = await api.complete(sys, user);
            let items = parseNpcJson(raw);
            if (count) items = items.slice(0, count);
            if (!items.length) throw new Error('返回内容无法解析为 NPC');
            const created = saveNpcContacts(items, selContacts);
            buildContactNodes();
            applyFilter(activeFilter);
            renderTetherLines();
            createModal.classList.remove('open');
            showToast('已生成 ' + created + ' 个 NPC');
        } catch (err) {
            status.innerText = '生成失败：' + ((err && err.message) || err);
        } finally {
            go.disabled = false;
        }
    }

    // 初始化
    loadPositions();
    $('entityName').closest('.input-group').classList.add('contact-only');
    $('tetherTarget').closest('.input-group').classList.add('contact-only');
    setTetherMode(false);
    buildContactNodes();
    applyFilter('all');
    $('addGroupBtn').style.cssText = GROUP_BALL_CSS;
    renderFilterRow();
    new Image().src = 'assets/app/世界壁纸.jpg';
    centerScene();
    loadRelations();
    loadPositionsAsync();

};
