/* =========================================
   世界书 App：文件夹（书）+ 条目；支持导入 txt / docx；条目可设置 前 / 中(深度) / 后
   ========================================= */
window.initWorldbookModule = function (root) {
    if (!root) return;
    /* 已经初始化过的根节点：重新打开时只回到书架，不重复绑定事件 */
    if (root.__wbReset) { root.__wbReset(); return; }
    root.classList.add('worldbook-app');

    /* ---------------- 数据 ---------------- */
    const KEY = 'forever_worldbooks_v1';
    const POS_LABEL = { before: '前', mid: '中', after: '后' };
    const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
    let BOOKS = load();

    /* ---------------- 分组（胶囊切换，默认 i / love / u） ---------------- */
    const GKEY = 'forever_worldbooks_groups_v1';
    const DEFAULT_GROUPS = ['i', 'love', 'u'];
    function loadGroups() { try { const v = JSON.parse(localStorage.getItem(GKEY) || 'null'); return Array.isArray(v) && v.length ? v : DEFAULT_GROUPS.slice(); } catch (_) { return DEFAULT_GROUPS.slice(); } }
    let GROUPS = loadGroups();
    let activeGroup = GROUPS[0];
    function saveGroups() { try { localStorage.setItem(GKEY, JSON.stringify(GROUPS)); } catch (_) {} }
    const groupOf = b => (b.group && GROUPS.indexOf(b.group) >= 0) ? b.group : GROUPS[0];
    function save() { try { localStorage.setItem(KEY, JSON.stringify(BOOKS)); return true; } catch (_) { note('保存失败：存储空间可能不足'); return false; } }
    const findBook = id => BOOKS.find(b => b.id === id);
    const findEntry = (b, id) => b && (b.entries || []).find(e => e.id === id);

    /* ---------------- 视图状态 ---------------- */
    let cur = { view: 'lib', bookId: null, entryId: null, delArmed: false };
    let selectMode = false;
    let selectedEntryIds = new Set();
    let tip = '';
    let tipT = null;
    function note(t) { tip = t; clearTimeout(tipT); tipT = setTimeout(() => { tip = ''; const el = root.querySelector('.wb-tip'); if (el) el.classList.remove('show'); }, 2200); const el = root.querySelector('.wb-tip'); if (el) { el.innerHTML = '<i class="wb-tip-star"></i>' + esc(t); el.classList.add('show'); } }
    function go(view, extra) { selectMode = false; selectedEntryIds.clear(); formDraft = null; cur = Object.assign({ view, bookId: null, entryId: null, delArmed: false }, extra || {}); render(); }

    /* ---------------- 图标 ---------------- */
    const WING_PAIR = `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 26C7 27 2.5 21.5 2 13.5c4 1.2 7.2.6 9.4-1.6-2.1-1.7-2.7-4.3-1.8-7.2 3.6 2.1 5.9 5.2 6.4 9.3"/>
        <path d="M14 26c-3.5-.6-6.4-3-7.6-6.4"/><path d="M14 26c-1.6-2.8-1.7-5.6-.9-8.2"/></g>`;
    const WING_HALF = `<path d="M14 26C7 27 2.5 21.5 2 13.5c4 1.2 7.2.6 9.4-1.6-2.1-1.7-2.7-4.3-1.8-7.2 3.6 2.1 5.9 5.2 6.4 9.3"/><path d="M14 26c-3.5-.6-6.4-3-7.6-6.4"/><path d="M14 26c-1.6-2.8-1.7-5.6-.9-8.2"/>`;
    /* 一边两层：后层小一点、淡一点，前层清楚；右边用 CSS 镜像 */
    const WING_SIDE = `<svg viewBox="0 0 16 30" width="15" height="28" style="display:block;overflow:visible" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".42" transform="translate(4 -4) scale(.8)">${WING_HALF}</g>
        <g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${WING_HALF}</g></svg>`;
    const WING_ONE_SVG = `<svg viewBox="0 4 16 26" width="20" height="33" style="display:block" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${WING_HALF}</g></svg>`;
    const WINGS_SVG = (w) => `<svg viewBox="0 0 64 40" width="${w}" style="display:block">${WING_PAIR}<g transform="translate(64 0) scale(-1 1)">${WING_PAIR}</g></svg>`;
    const FOLDER_SVG = `<svg viewBox="0 0 48 44"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="24" cy="5" rx="5" ry="1.6"/>
        <path d="M24 16.5C22.2 12.6 16.8 11.2 13.6 14.4 10.2 17.8 11.2 23.4 14 27c3 3.8 7 6.6 10 8.4 3-1.8 7-4.6 10-8.4 2.8-3.6 3.8-9.2.4-12.6-3.2-3.2-8.6-1.8-10.4 2.1z"/>
        <path d="M24 16.5v20"/><path d="M17.5 21.5h13"/><path d="M14.5 14.2c-3-.6-6.4.6-8.2 3.6-.8 1.4-1.2 3.2-1 5"/><path d="M33.5 14.2c3-.6 6.4.6 8.2 3.6.8 1.4 1.2 3.2 1 5"/></g>
        <path transform="translate(40 8) scale(.5)" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="currentColor"/></svg>`;
    const PLUS_SVG = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`;
    const BACK_SVG = `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>`;
    const IMPORT_SVG = `<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/></svg>`;

    /* ---------------- 渲染 ---------------- */
    let lastVKey = null;
    function render() {
        let body = '';
        if (cur.view === 'lib') body = viewLib();
        else if (cur.view === 'book') body = viewBook();
        else if (cur.view === 'bookForm') body = viewBookForm();
        else if (cur.view === 'entry') body = viewEntry();
        if (cur.view === 'book') {
            body = `<div class="wb-journal">
                <i class="wb-tape t1"></i><i class="wb-tape t2"></i>
                <i class="wb-binding"></i>
                <svg class="wb-sticker s1" viewBox="-8 -8 16 16"><path d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="currentColor"/></svg>
                <svg class="wb-sticker s2" viewBox="-8 -8 16 16"><path d="M0 5.5C-4-1-6.5-3-6.5-5.5c0-2 1.5-3.2 3.2-3.2 1.3 0 2.4.7 3.3 1.9.9-1.2 2-1.9 3.3-1.9 1.7 0 3.2 1.2 3.2 3.2C6.5-3 4-1 0 5.5z" fill="currentColor"/></svg>
                ${body}
                <div class="wb-pageno">P.01</div>
            </div>`;
        }
        const vkey = cur.view + '|' + (cur.bookId || '') + '|' + (cur.entryId || '');
        const animate = vkey !== lastVKey;
        lastVKey = vkey;
        const keepTop = root.scrollTop;
        const oldPills = root.querySelector('.wb-pills');
        const keepLeft = oldPills ? oldPills.scrollLeft : 0;
        root.innerHTML = `<div class="wb-tip"></div><div class="wb-view${animate ? ' wb-in' : ''}">${body}</div>`;
        root.scrollTop = keepTop;
        const newPills = root.querySelector('.wb-pills');
        if (newPills) newPills.scrollLeft = keepLeft;
        if (tip) { const el = root.querySelector('.wb-tip'); el.innerHTML = '<i class="wb-tip-star"></i>' + esc(tip); el.classList.add('show'); }
        const sel = root.querySelector('[data-focus]'); if (sel) sel.focus({ preventScroll: true });
    }

    function groupBar() {
        const pills = GROUPS.map(g => `<button class="wb-gpill ${g === activeGroup ? 'on' : ''}" type="button" data-act="pick-group" data-g="${esc(g)}">${esc(g)}</button>`).join('');
        const add = cur.addingGroup
            ? `<div class="wb-gadd-row"><input class="wb-gin" data-field="newgroup" data-focus maxlength="8" placeholder="分组名"><button class="wb-gok" type="button" data-act="confirm-group">确定</button></div>`
            : '';
        return `<div class="wb-groups"><div class="wb-pills">${pills}</div><button class="wb-gadd" type="button" data-act="add-group">+ 新增分组</button></div>${add}`;
    }
    function viewLib() {
        const shown = BOOKS.filter(b => groupOf(b) === activeGroup);
        const cards = shown.map(b => `
            <div class="wb-card" data-act="open-book" data-id="${b.id}">
                <div class="wb-card-ico">${FOLDER_SVG}</div><span class="wb-card-star"><svg viewBox="-8 -8 16 16"><path d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="currentColor"/></svg></span>
                <div class="wb-card-name">${esc(b.name || '未命名')}</div>
                <div class="wb-card-author">${b.author ? '作者 ' + esc(b.author) : '未填写作者'}</div>
                <div class="wb-card-intro">${esc(b.intro || '暂无简介')}</div>
                <div class="wb-card-foot"><span>${(b.entries || []).length} 条目</span><span class="wb-chip ${b.enabled === false ? 'off' : ''}">${b.enabled === false ? '已停用' : '启用中'}</span></div>
            </div>`).join('');
        return `
            <div class="wb-top wb-top-lib">
                <button class="wb-round" data-act="exit" aria-label="退出世界书"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
                <div class="wb-title-wrap"><svg class="wb-halo" viewBox="0 0 40 10"><ellipse cx="20" cy="5" rx="9" ry="2.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg><div class="wb-title-row"><span class="wb-wing-half">${WING_ONE_SVG}</span><span class="wb-title-text">世界书</span><span class="wb-wing-half mirror">${WING_ONE_SVG}</span></div></div>
                <div class="wb-top-actions">
                    <button class="wb-round" data-act="import" aria-label="导入 txt / docx">${IMPORT_SVG}</button>
                    <button class="wb-round" data-act="new-book" aria-label="新建世界书">${PLUS_SVG}</button>
                </div>
            </div>
            ${groupBar()}
            ${shown.length ? `<div class="wb-grid">${cards}</div>` : `
            <div class="wb-empty">
                <svg class="wb-angel" viewBox="0 0 160 130" aria-hidden="true">
                    <ellipse cx="80" cy="20" rx="18" ry="4.5" fill="none" stroke="#B3B3B3" stroke-width="2"/>
                    <g fill="#F2F2F2" stroke="#B3B3B3" stroke-width="1.6" stroke-linejoin="round">
                        <path d="M58 70C36 74 20 58 18 36c14 4 24 1 30-8-6-6-8-16-3-26 12 8 20 22 22 38"/>
                        <path d="M102 70c22 4 38-12 40-34-14 4-24 1-30-8 6-6 8-16 3-26-12 8-20 22-22 38"/>
                    </g>
                    <path d="M58 60h44v18c0 4-3 6-6 6H64c-3 0-6-2-6-6z" fill="#FFFFFF" stroke="#B3B3B3" stroke-width="1.6"/>
                    <path d="M80 60v24" stroke="#B3B3B3" stroke-width="1.3"/>
                    <path d="M62 68h14M62 73h12M84 68h12M84 73h10" stroke="#CCCCCC" stroke-width="1.6" stroke-linecap="round"/>
                    <circle cx="80" cy="50" r="5" fill="#E9E9E9"/>
                    <path transform="translate(26 22)" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="#CCCCCC"/>
                    <path transform="translate(136 40) scale(.7)" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="#E2E2E2"/>
                    <path transform="translate(128 100) scale(.6)" d="M0-6L1.5-1.5 6 0 1.5 1.5 0 6-1.5 1.5-6 0-1.5-1.5Z" fill="#B3B3B3"/>
                    <g fill="#EFEFEF"><path d="M10 104a6 6 0 0 1 6-6 7 7 0 0 1 13-1 5 5 0 0 1 7 5 4 4 0 0 1-4 4H14a4 4 0 0 1-4-2z"/></g>
                </svg>
                <div class="wb-empty-txt">还没有世界书</div>
                <div class="wb-empty-sub">点右上角新建，或导入 txt / docx 文件</div>
            </div>`}`;
    }

    function viewBook() {
        const b = findBook(cur.bookId); if (!b) { go('lib'); return ''; }
        const entries = (b.entries || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
        const rows = entries.map(e => {
            const posTxt = e.pos === 'mid' ? `中 · 深度 ${Number(e.depth) || 0}` : POS_LABEL[e.pos] || '前';
            const posCls = e.pos === 'mid' ? 'pos-mid' : e.pos === 'after' ? 'pos-after' : 'pos-before';
            const isSel = selectMode && selectedEntryIds.has(e.id);
            return `
            <div class="wb-entry ${selectMode ? 'wb-entry-select-mode' : ''} ${isSel ? 'selected' : ''}" data-act="${selectMode ? 'toggle-entry-select' : 'open-entry'}" data-id="${e.id}">
                ${selectMode ? `<span class="wb-select-check ${isSel ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>` : ''}
                <div class="wb-entry-main">
                    <div class="wb-entry-name">${esc(e.name || '未命名条目')}</div>
                    <div class="wb-entry-keys">${e.keys ? esc(e.keys) : '无关键词'}</div>
                </div>
                <span class="wb-chip ${posCls}">${posTxt}</span>
                ${selectMode ? '' : `<span class="wb-switch ${e.enabled === false ? '' : 'on'}" data-act="toggle-entry" data-id="${e.id}" role="switch" aria-checked="${e.enabled !== false}"><i></i></span>`}
            </div>`;
        }).join('');
        const topBar = selectMode ? `
            <div class="wb-top wb-top-select">
                <button class="wb-round" data-act="cancel-select" aria-label="退出多选">${BACK_SVG}</button>
                <div class="wb-title small">已选择 ${selectedEntryIds.size} 项</div>
                <button class="wb-text-btn ${selectedEntryIds.size ? 'wb-danger-text' : ''}" data-act="del-selected">删除</button>
            </div>` : `
            <div class="wb-top">
                <button class="wb-round" data-act="lib" aria-label="返回">${BACK_SVG}</button>
                <div class="wb-title small">${esc(b.name || '未命名')}</div>
                <button class="wb-text-btn" data-act="edit-book" data-id="${b.id}">编辑</button>
            </div>`;
        return `
            ${topBar}
            ${mountRow(b)}
            <div class="wb-cover">
                <i class="wb-spine"></i>
                <div class="wb-cover-ico">${FOLDER_SVG}</div>
                <div class="wb-cover-label">${esc(b.name || '未命名')}</div>
                <div class="wb-cover-author">${b.author ? '作者 ' + esc(b.author) : '未填写作者'}</div>
                <p class="wb-cover-intro">${esc(b.intro || '暂无简介')}</p>
                <div class="wb-head-row">
                    <span class="wb-chip ${b.enabled === false ? 'off' : ''}">${b.enabled === false ? '已停用' : '启用中'}</span>
                    <span class="wb-switch ${b.enabled === false ? '' : 'on'}" data-act="toggle-book" data-id="${b.id}" role="switch" aria-checked="${b.enabled !== false}"><i></i></span>
                </div>
            </div>
            <div class="wb-sec">
                <span>${selectMode ? `选择条目 · ${selectedEntryIds.size}/${entries.length}` : `条目 · ${entries.length}`}</span>
                <div class="wb-sec-btns">
                    ${selectMode ? `
                        <button class="wb-pill" data-act="select-all">${selectedEntryIds.size === entries.length && entries.length > 0 ? '取消全选' : '全选'}</button>
                        <button class="wb-pill strong wb-pill-del" data-act="del-selected">删除所选</button>
                    ` : `
                        <button class="wb-pill" data-act="import">导入</button>
                        <button class="wb-pill strong" data-act="new-entry">新建</button>
                    `}
                </div>
            </div>
            <div class="wb-list ${selectMode ? 'wb-selecting' : ''}">${rows || '<div class="wb-empty-sub pad">还没有条目</div>'}</div>`;
    }

    function viewBookForm() {
        const isNew = !cur.bookId;
        const b = isNew ? { name: '', author: '', intro: '' } : findBook(cur.bookId) || { name: '', author: '', intro: '' };
        const gsel = isNew ? activeGroup : groupOf(b);
        const del = !isNew ? `<button class="wb-danger" data-act="del-book">${cur.delArmed ? '再点一次，删除整本' : '删除世界书'}</button>` : '';
        return `
            <div class="wb-top">
                <button class="wb-round" data-act="${isNew ? 'lib' : 'open-book'}" data-id="${cur.bookId || ''}" aria-label="返回">${BACK_SVG}</button>
                <div class="wb-title small">${isNew ? '新建世界书' : '编辑世界书'}</div>
                <span class="wb-top-spacer"></span>
            </div>
            <div class="wb-form">
                <label class="wb-field"><span>名字</span><input data-field="name" data-focus value="${esc(b.name)}" placeholder="例如：小镇设定"></label>
                <label class="wb-field"><span>作者</span><input data-field="author" value="${esc(b.author)}" placeholder="作者名"></label>
                <label class="wb-field"><span>简介</span><textarea data-field="intro" rows="4" placeholder="这本世界书是关于什么的">${esc(b.intro)}</textarea></label>
                <div class="wb-field"><span>分组</span><div class="wb-seg wb-seg-group">${GROUPS.map(g => `<button type="button" class="wb-seg-btn ${g === gsel ? 'on' : ''}" data-act="set-group" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>
                <input type="hidden" data-field="group" value="${esc(gsel)}">
                <button class="wb-save" data-act="save-book" data-id="${cur.bookId || ''}">保存</button>
                ${del}
            </div>`;
    }

    function viewEntry() {
        const b = findBook(cur.bookId); if (!b) { go('lib'); return ''; }
        const isNew = !cur.entryId;
        const e = isNew ? { name: '', keys: '', content: '', pos: 'before', depth: 4, order: 100, enabled: true } : (findEntry(b, cur.entryId) || { name: '', keys: '', content: '', pos: 'before', depth: 4, order: 100, enabled: true });
        const seg = ['before', 'mid', 'after'].map(p => `<button type="button" class="wb-seg-btn ${e.pos === p ? 'on' : ''}" data-act="set-pos" data-pos="${p}">${POS_LABEL[p]}</button>`).join('');
        const del = !isNew ? `<button class="wb-danger" data-act="del-entry" data-id="${e.id}">${cur.delArmed ? '再点一次，删除条目' : '删除条目'}</button>` : '';
        return `
            <div class="wb-top">
                <button class="wb-round" data-act="open-book" data-id="${b.id}" aria-label="返回">${BACK_SVG}</button>
                <div class="wb-title small">${isNew ? '新建条目' : '编辑条目'}</div>
                <span class="wb-top-spacer"></span>
            </div>
            <div class="wb-form">
                <label class="wb-field"><span>名称</span><input data-field="name" data-focus value="${esc(e.name)}" placeholder="条目名"></label>
                <label class="wb-field"><span>关键词</span><input data-field="keys" value="${esc(e.keys)}" placeholder="多个用逗号分隔（可留空）"></label>
                <div class="wb-entry-import"><button class="wb-pill" type="button" data-act="import-entry">导入 txt / docx</button></div>
                <label class="wb-field"><span>内容</span><textarea data-field="content" rows="8" placeholder="写入提示词的内容">${esc(e.content)}</textarea></label>
                <div class="wb-field"><span>位置</span><div class="wb-seg">${seg}</div></div>
                <div class="wb-depth-row" data-show="${e.pos === 'mid'}">
                    <label class="wb-field half"><span>深度</span><input data-field="depth" type="number" min="0" max="999" value="${Number(e.depth) || 0}"></label>
                    <div class="wb-depth-hint">从最新一条往上数第几条之前插入</div>
                </div>
                <label class="wb-field half"><span>顺序</span><input data-field="order" type="number" value="${Number(e.order) || 0}"></label>
                <div class="wb-head-row">
                    <span>启用</span>
                    <span class="wb-switch ${e.enabled === false ? '' : 'on'}" data-act="toggle-form" role="switch" aria-checked="${e.enabled !== false}"><i></i></span>
                </div>
                <button class="wb-save" data-act="save-entry" data-id="${e.id || ''}">保存</button>
                ${del}
            </div>`;
    }

    /* ---------------- 挂载 ---------------- */
    function loadMountContacts() {
        try {
            const v = JSON.parse(localStorage.getItem('forever_messages_contacts_v1') || '[]');
            return Array.isArray(v) ? v.filter(c => c && c.id != null).map(c => ({
                id: String(c.id), name: String(c.name || '未命名'), avatar: c.avatar || '',
                ini: String(c.ini || c.name || '?').slice(0, 1).toUpperCase()
            })) : [];
        } catch (_) { return []; }
    }
    function mountLabel(b) {
        const m = b.mount || {};
        if (m.all) return '全局挂载';
        const n = (m.contacts || []).length;
        return n ? n + ' 位联系人' : '未挂载';
    }
    function mountOn(b) { const m = b.mount || {}; return !!(m.all || (m.contacts || []).length); }
    function mountInner(b) {
        const m = b.mount || {};
        const d = cur.mountOpen && cur.mountDraft ? cur.mountDraft : { all: !!m.all, contacts: (m.contacts || []).slice() };
        const rows = loadMountContacts().map(c => {
            const on = d.contacts.indexOf(c.id) >= 0;
            return `<div class="wb-mount-item ${on ? 'on' : ''}" data-act="mount-contact" data-cid="${esc(c.id)}"><span class="wb-mount-av">${c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : esc(c.ini)}</span><span class="wb-mount-name">${esc(c.name)}</span><span class="wb-mount-check"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span></div>`;
        }).join('');
        return `<button class="wb-mount-head-btn" type="button" data-act="toggle-mount"><i class="wb-mount-dot"></i><span>挂载</span><b>${esc(mountLabel(b))}</b><svg class="wb-mount-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="wb-mount-drop"><div class="wb-mount-drop-in">
            <button class="wb-mount-all ${d.all ? 'on' : ''}" type="button" data-act="mount-all"><span><b>全局挂载</b><small>所有联系人都会注入这本书</small></span><span class="wb-mount-switch-wrap"><span class="wb-mount-switch ${d.all ? 'on' : ''}"><i></i></span><span class="wb-mount-tag">全局</span></span></button>
            <div class="wb-mount-divider"><span>${d.all ? '已全局挂载' : '或单独选择联系人'}</span></div>
            <div class="wb-mount-list ${d.all ? 'dim' : ''}">${rows || '<div class="wb-mount-empty">还没有联系人</div>'}</div>
            <div class="wb-mount-foot"><button class="wb-mount-cancel" type="button" data-act="mount-cancel">取消</button><button class="wb-mount-save" type="button" data-act="mount-save">保存</button></div>
        </div></div>`;
    }
    function mountRow(b) {
        return `<div class="wb-mount-row"><div class="wb-mount-capsule ${mountOn(b) ? 'on' : ''} ${cur.mountOpen ? 'open' : ''}">${mountInner(b)}</div></div>`;
    }
    /* 只更新胶囊内部，胶囊本身不重建，才能看到伸长动画 */
    function refreshMount() {
        const b = findBook(cur.bookId); const cap = root.querySelector('.wb-mount-capsule');
        if (!b || !cap) { render(); return; }
        const list = cap.querySelector('.wb-mount-list'); const keep = list ? list.scrollTop : 0;
        cap.className = 'wb-mount-capsule ' + (mountOn(b) ? 'on ' : '') + (cur.mountOpen ? 'open' : '');
        cap.innerHTML = mountInner(b);
        const nl = cap.querySelector('.wb-mount-list'); if (nl) nl.scrollTop = keep;
    }

    /* ---------------- 表单状态（切换位置/开关时先记住输入） ---------------- */
    let formDraft = null;
    function captureForm() {
        const f = {};
        root.querySelectorAll('[data-field]').forEach(el => { f[el.dataset.field] = el.value; });
        return f;
    }

    function deleteGroup(g) {
        if (GROUPS.length <= 1) { note('至少保留一个分组'); return; }
        const first = GROUPS.find(x => x !== g);
        GROUPS = GROUPS.filter(x => x !== g);
        BOOKS.forEach(b => { if (b.group === g) b.group = first; });
        saveGroups(); save();
        if (activeGroup === g) activeGroup = GROUPS[0];
        note('已删除分组「' + g + '」，其中的世界书移到「' + first + '」');
        render();
    }
    let pressT = null, pressG = null, pressX = 0, pressY = 0;
    function clearPress() { clearTimeout(pressT); pressT = null; pressG = null; }
    let entryPressT = null, entryPressId = null, entryPressX = 0, entryPressY = 0;
    function clearEntryPress() { clearTimeout(entryPressT); entryPressT = null; entryPressId = null; }
    root.addEventListener('pointerdown', e => {
        const entryEl = e.target.closest && e.target.closest('.wb-entry');
        if (entryEl && cur.view === 'book' && !selectMode) {
            if (e.target.closest('.wb-switch')) return;
            entryPressId = entryEl.dataset.id;
            entryPressX = e.clientX; entryPressY = e.clientY;
            entryPressT = setTimeout(() => {
                const eid = entryPressId; clearEntryPress();
                root.__wbEntryLongFired = true;
                selectMode = true;
                selectedEntryIds.clear();
                if (eid) selectedEntryIds.add(eid);
                render();
            }, 550);
            return;
        }
        const pill = e.target.closest && e.target.closest('.wb-gpill');
        if (!pill) return;
        pressG = pill.dataset.g; pressX = e.clientX; pressY = e.clientY;
        pressT = setTimeout(() => {
            const g = pressG; clearPress();
            root.__wbLongFired = true;
            deleteGroup(g);
        }, 700);
    });
    root.addEventListener('pointermove', e => {
        if (pressT && (Math.abs(e.clientX - pressX) > 8 || Math.abs(e.clientY - pressY) > 8)) clearPress();
        if (entryPressT && (Math.abs(e.clientX - entryPressX) > 8 || Math.abs(e.clientY - entryPressY) > 8)) clearEntryPress();
    });
    function clearAllPress() { clearPress(); clearEntryPress(); }
    root.addEventListener('pointerup', clearAllPress);
    root.addEventListener('pointercancel', clearAllPress);
    root.addEventListener('pointerleave', clearAllPress);

    function confirmGroup() {
        const inp = root.querySelector('[data-field="newgroup"]');
        const name = (inp ? inp.value : '').trim().slice(0, 8);
        if (!name) { note('先写一个分组名'); return; }
        if (GROUPS.indexOf(name) < 0) { GROUPS.push(name); saveGroups(); }
        activeGroup = name; cur.addingGroup = false; render();
    }
    root.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('[data-field="newgroup"]')) { e.preventDefault(); confirmGroup(); }
    });

    /* ---------------- 动作 ---------------- */
    root.addEventListener('click', e => {
        const el = e.target.closest('[data-act]'); if (!el) return;
        const act = el.dataset.act, id = el.dataset.id;
        switch (act) {
            case 'lib': cur.delArmed = false; go('lib'); break;
            case 'open-book':
                selectMode = false; selectedEntryIds.clear();
                if (cur.view === 'lib' && el.classList.contains('wb-card')) { openBookAnim(el, id); break; }
                go('book', { bookId: id }); break;
            case 'cancel-select':
                selectMode = false; selectedEntryIds.clear(); render(); break;
            case 'select-all': {
                const b = findBook(cur.bookId); const entries = (b && b.entries) || [];
                if (selectedEntryIds.size === entries.length && entries.length > 0) selectedEntryIds.clear();
                else entries.forEach(item => selectedEntryIds.add(item.id));
                render(); break;
            }
            case 'del-selected': {
                if (selectedEntryIds.size === 0) { note('请先选择要删除的条目'); break; }
                const count = selectedEntryIds.size;
                const b = findBook(cur.bookId);
                if (b) { b.entries = (b.entries || []).filter(x => !selectedEntryIds.has(x.id)); save(); }
                selectedEntryIds.clear(); selectMode = false;
                note(`已删除 ${count} 个条目`);
                render(); break;
            }
            case 'toggle-entry-select':
                if (root.__wbEntryLongFired) { root.__wbEntryLongFired = false; break; }
                if (selectedEntryIds.has(id)) selectedEntryIds.delete(id);
                else selectedEntryIds.add(id);
                render(); break;
            case 'new-book': go('bookForm', {}); break;
            case 'edit-book': go('bookForm', { bookId: id }); break;
            case 'import': importTarget(); break;
            case 'exit': exitWorldbook(); break;
            case 'pick-group':
                if (root.__wbLongFired) { root.__wbLongFired = false; break; }
                activeGroup = el.dataset.g; cur.addingGroup = false; render(); break;
            case 'add-group': cur.addingGroup = true; render(); break;
            case 'confirm-group': confirmGroup(); break;
            case 'set-group': {
                const h = root.querySelector('[data-field="group"]'); if (h) h.value = el.dataset.g;
                root.querySelectorAll('.wb-seg-group .wb-seg-btn').forEach(b => b.classList.toggle('on', b === el));
                break;
            }
            case 'import-entry': importMode = 'entry'; fileInput.click(); break;
            case 'new-entry': go('entry', { bookId: cur.bookId }); break;
            case 'open-entry':
                if (root.__wbEntryLongFired) { root.__wbEntryLongFired = false; break; }
                go('entry', { bookId: cur.bookId, entryId: id }); break;
            case 'toggle-book': {
                const b = findBook(id); if (!b) break;
                b.enabled = b.enabled === false; save(); render(); break;
            }
            case 'toggle-entry': {
                const b = findBook(cur.bookId); const en = findEntry(b, id); if (!en) break;
                en.enabled = en.enabled === false; save(); render(); break;
            }
            case 'toggle-form': {
                el.classList.toggle('on');
                el.setAttribute('aria-checked', el.classList.contains('on'));
                break;
            }
            case 'set-pos': {
                formDraft = captureForm(); formDraft.pos = el.dataset.pos;
                root.querySelectorAll('.wb-seg-btn').forEach(b => b.classList.toggle('on', b === el));
                const row = root.querySelector('.wb-depth-row'); if (row) row.dataset.show = String(el.dataset.pos === 'mid');
                break;
            }
            case 'toggle-mount': {
                const b = findBook(cur.bookId); if (!b) break;
                if (cur.mountOpen) { cur.mountOpen = false; cur.mountDraft = null; }
                else { const m = b.mount || {}; cur.mountOpen = true; cur.mountDraft = { all: !!m.all, contacts: (m.contacts || []).slice() }; }
                refreshMount(); break;
            }
            case 'mount-cancel': cur.mountOpen = false; cur.mountDraft = null; refreshMount(); break;
            case 'mount-all': if (cur.mountDraft) { cur.mountDraft.all = !cur.mountDraft.all; refreshMount(); } break;
            case 'mount-contact': {
                const d = cur.mountDraft; if (!d || d.all) break;
                const cid = el.dataset.cid; const i = d.contacts.indexOf(cid);
                if (i >= 0) d.contacts.splice(i, 1); else d.contacts.push(cid);
                refreshMount(); break;
            }
            case 'mount-save': {
                const b = findBook(cur.bookId); const d = cur.mountDraft;
                if (!b || !d) break;
                b.mount = { all: !!d.all, contacts: d.contacts.slice() };
                cur.mountOpen = false; cur.mountDraft = null;
                if (save()) note(d.all ? '已全局挂载' : (d.contacts.length ? '已挂载给 ' + d.contacts.length + ' 位联系人' : '已取消挂载'));
                refreshMount(); break;
            }
            case 'save-book': saveBook(id); break;
            case 'save-entry': saveEntry(id); break;
            case 'del-book': {
                if (!cur.delArmed) { cur.delArmed = true; render(); break; }
                BOOKS = BOOKS.filter(b => b.id !== cur.bookId); save(); go('lib'); break;
            }
            case 'del-entry': {
                if (!cur.delArmed) { cur.delArmed = true; render(); break; }
                const b = findBook(cur.bookId); if (b) b.entries = (b.entries || []).filter(x => x.id !== id);
                save(); go('book', { bookId: cur.bookId }); break;
            }
        }
    });

    /* 点开书本：封面向左翻开，其他书淡出，然后进入详情 */
    function openBookAnim(el, id) {
        if (root.__wbOpening) return;
        root.__wbOpening = true;
        el.classList.add('wb-opening');
        root.querySelectorAll('.wb-card').forEach(c => { if (c !== el) c.classList.add('wb-dim'); });
        setTimeout(() => { root.__wbOpening = false; go('book', { bookId: id }); }, 520);
    }

    function saveBook(id) {
        const f = captureForm();
        const name = (f.name || '').trim();
        if (!name) { note('先写一个名字'); return; }
        if (id) {
            const b = findBook(id); if (!b) return;
            Object.assign(b, { name, author: (f.author || '').trim(), intro: (f.intro || '').trim(), group: GROUPS.indexOf(f.group) >= 0 ? f.group : GROUPS[0] });
            activeGroup = groupOf(b);
            if (!save()) return;
            go('book', { bookId: id });
        } else {
            const b = { id: uid('b'), name, author: (f.author || '').trim(), intro: (f.intro || '').trim(), enabled: true, entries: [], group: GROUPS.indexOf(f.group) >= 0 ? f.group : activeGroup };
            activeGroup = b.group;
            BOOKS.unshift(b);
            if (!save()) return;
            go('book', { bookId: b.id });
        }
    }

    function saveEntry(id) {
        const b = findBook(cur.bookId); if (!b) return;
        const f = captureForm();
        const name = (f.name || '').trim();
        const content = (f.content || '').trim();
        if (!name) { note('先写一个条目名'); return; }
        if (!content) { note('内容不能为空'); return; }
        const pos = formDraft && formDraft.pos ? formDraft.pos : (cur.entryId && findEntry(b, cur.entryId) ? findEntry(b, cur.entryId).pos : 'before');
        const enabled = (root.querySelector('[data-act="toggle-form"]') || {}).classList ? root.querySelector('[data-act="toggle-form"]').classList.contains('on') : true;
        const data = {
            name, keys: (f.keys || '').trim(), content, pos,
            depth: Math.max(0, parseInt(f.depth, 10) || 0),
            order: parseInt(f.order, 10) || 0,
            enabled
        };
        b.entries = b.entries || [];
        if (id) Object.assign(findEntry(b, id) || {}, data);
        else b.entries.push(Object.assign({ id: uid('e') }, data));
        formDraft = null;
        if (!save()) return;
        go('book', { bookId: b.id });
    }

    /* ---------------- 导入 txt / docx ---------------- */
    let importMode = 'book';   // 'book' 导入条目到书；'entry' 导入到当前条目的内容框
    let fileInput = document.getElementById('wbFileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.id = 'wbFileInput';
        fileInput.accept = '.txt,.docx'; fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
    fileInput.onchange = async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!file) return;
        if (importMode === 'entry') {
            importMode = 'book';
            try {
                const text = /\.docx$/i.test(file.name) ? await docxToText(file) : await file.text();
                const ta = root.querySelector('textarea[data-field="content"]');
                const nm = root.querySelector('input[data-field="name"]');
                if (ta) ta.value = text.trim();
                if (nm && !nm.value.trim()) nm.value = file.name.replace(/\.(txt|docx)$/i, '').slice(0, 16);
                note('已导入内容');
            } catch (err) {
                note('导入失败：' + (err && err.message ? err.message : '文件无法读取'));
            }
            return;
        }
        try {
            const text = /\.docx$/i.test(file.name) ? await docxToText(file) : await file.text();
            const blocks = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
            if (!blocks.length) { note('文件里没有内容'); return; }
            const entries = blocks.map((blk, i) => ({
                id: uid('e'),
                name: (blk.split('\n')[0] || '').trim().slice(0, 16) || ('条目' + (i + 1)),
                keys: '', content: blk, pos: 'before', depth: 4, order: 100 + i * 10, enabled: true
            }));
            if (cur.view === 'book' && findBook(cur.bookId)) {
                const b = findBook(cur.bookId); b.entries = (b.entries || []).concat(entries);
                if (!save()) return;
                note('已导入 ' + entries.length + ' 条');
                render();
            } else {
                const b = { id: uid('b'), name: file.name.replace(/\.(txt|docx)$/i, ''), author: '', intro: '从 ' + file.name + ' 导入', enabled: true, entries, group: activeGroup };
                BOOKS.unshift(b);
                if (!save()) return;
                go('book', { bookId: b.id });
                note('已导入 ' + entries.length + ' 条');
            }
        } catch (err) {
            note('导入失败：' + (err && err.message ? err.message : '文件无法读取'));
        }
    };
    function importTarget() { importMode = 'book'; fileInput.click(); }
    /* 与消息应用一致：调用主页面的 closeApp() */
    function exitWorldbook() {
        if (typeof window.closeApp === 'function') { window.closeApp(); return; }
        if (window.parent && window.parent !== window && typeof window.parent.closeApp === 'function') { window.parent.closeApp(); return; }
        note('主界面关闭方法未加载，请检查 js/apps/app-manager.js');
    }

    /* docx 本质是 zip：找到 word/document.xml 并取出段落文本 */
    async function readZipEntry(buf, want) {
        const dv = new DataView(buf), u8 = new Uint8Array(buf);
        let eocd = -1;
        for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
        if (eocd < 0) throw new Error('不是有效的 docx 文件');
        const count = dv.getUint16(eocd + 10, true);
        let p = dv.getUint32(eocd + 16, true);
        for (let n = 0; n < count; n++) {
            if (dv.getUint32(p, true) !== 0x02014b50) break;
            const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
            const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
            const lho = dv.getUint32(p + 42, true);
            const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
            if (name === want) {
                const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
                const data = u8.subarray(start, start + csize);
                if (method === 0) return new TextDecoder().decode(data);
                if (method === 8) {
                    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
                    return await new Response(stream).text();
                }
                throw new Error('不支持的压缩格式');
            }
            p += 46 + nlen + xlen + clen;
        }
        throw new Error('docx 中找不到正文');
    }
    async function docxToText(file) {
        const xml = await readZipEntry(await file.arrayBuffer(), 'word/document.xml');
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        return [...doc.getElementsByTagNameNS('*', 'p')]
            .map(p => [...p.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join(''))
            .join('\n');
    }

    /* ---------------- 给提示词用的接口 ---------------- */
    window.WORLDBOOK = {
        list: () => BOOKS,
        /* 返回 { before: [文本], after: [文本], depth: [{ depth, text, order }] }；contactId 为空时只取全局挂载的书 */
        buildInjection(contextText, contactId) { return wbBuildInjection(BOOKS, contextText, contactId); }
    };

    root.__wbReset = () => { selectMode = false; selectedEntryIds.clear(); formDraft = null; cur = { view: 'lib', bookId: null, entryId: null, delArmed: false }; render(); };
    render();
};

function matchWbEntry(e, ctx) {
    if (!e || e.enabled === false || !e.content || !e.content.trim()) return false;
    if (ctx && e.keys && e.keys.trim()) {
        const keys = e.keys.split(/[,，、\s]+/).map(k => k.trim().toLowerCase()).filter(Boolean);
        if (keys.length && !keys.some(k => ctx.includes(k))) return false;
    }
    return true;
}

function wbLoadBooks() {
    try { const v = JSON.parse(localStorage.getItem('forever_worldbooks_v1') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
}

/* 挂载判断：全局挂载的书给所有联系人；单独挂载的书只给选中的联系人 */
function wbIsMounted(b, contactId) {
    const m = b && b.mount;
    if (!m) return false;
    if (m.all) return true;
    return contactId != null && Array.isArray(m.contacts) && m.contacts.indexOf(String(contactId)) >= 0;
}

function wbBuildInjection(books, contextText, contactId) {
    const out = { before: [], after: [], depth: [] };
    const ctx = typeof contextText === 'string' ? contextText.toLowerCase() : null;
    (books || []).filter(b => b && b.enabled !== false && wbIsMounted(b, contactId)).forEach(b => {
        (b.entries || []).filter(e => matchWbEntry(e, ctx))
            .sort((x, y) => (x.order || 0) - (y.order || 0))
            .forEach(e => {
                const t = e.content.trim();
                if (e.pos === 'mid') out.depth.push({ depth: Math.max(0, Number(e.depth) || 0), text: t, order: e.order || 0 });
                else if (e.pos === 'after') out.after.push(t);
                else out.before.push(t);
            });
    });
    return out;
}

function wbMsgText(recentMsgs) {
    if (typeof recentMsgs === 'string') return recentMsgs;
    if (!Array.isArray(recentMsgs)) return '';
    return recentMsgs.map(m => typeof m === 'string' ? m : (m && (m.text || m.content) || '')).join('\n');
}

function wbPromptText(inj) {
    const mid = inj.depth.slice().sort((x, y) => x.order - y.order).map(d => d.text);
    return [...inj.before, ...mid, ...inj.after].filter(Boolean).join('\n\n');
}

if (!window.WORLDBOOK) {
    window.WORLDBOOK = {
        list: wbLoadBooks,
        buildInjection: (contextText, contactId) => wbBuildInjection(wbLoadBooks(), contextText, contactId)
    };
}

/* 给消息应用的提示词接口：按联系人返回已挂载的世界书文本 */
window.WorldBook = {
    getChatPrompt(contact, recentMsgs) {
        const cid = contact && contact.id != null ? String(contact.id) : null;
        return wbPromptText(wbBuildInjection(wbLoadBooks(), wbMsgText(recentMsgs), cid));
    }
};
