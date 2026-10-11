window.initMessagesModule = function(root) {
if (root) root.classList.add('messages-app');

/* ---------------- 数据（黑白灰） ---------------- */
let CONTACTS = loadStoredContacts();
let CHAT_IDS = loadStoredChatIds();
let CHAT_MAP = loadStoredChatMap();
const ME_DEFAULT = { name: 'Kitty Angel', id: '1004', status: '오늘도 날개를 펴는 중', sig: '작은 구름 위에서 안부를 전해요', avatar: '', persona: '', speech: '', relation: '', backstory: '', replies: [] };
let ME = loadStoredMe();
const SIDE = { open: false, pickedId: null, liveId: null };
const IDN_KEY = 'forever_messages_identities_v2';
let IDENTITIES = loadStoredIdentities();
let pendingPersonaAvatar = null;
const ACTIVE_KEY = 'forever_messages_active_identity_v1';
let ACTIVE_ID = 'self';
try { ACTIVE_ID = localStorage.getItem(ACTIVE_KEY) || 'self'; } catch (_) {}
function setActiveIdentity(id) { ACTIVE_ID = id || 'self'; try { localStorage.setItem(ACTIVE_KEY, ACTIVE_ID); } catch (_) {} }
function activeIdentity() { return ACTIVE_ID === 'self' ? null : (IDENTITIES.find(x => x.id === ACTIVE_ID) || null); }
function normalizeIdentity(x) {
    return { id: String(x.id), name: String(x.name || '未命名'), avatar: x.avatar || '', ini: String(x.ini || x.name || '?').slice(0, 1).toUpperCase(),
        g: x.g || 'g1', status: x.status || '身份', sig: x.sig || '', persona: x.persona || '', speech: x.speech || '',
        relation: x.relation || '', backstory: x.backstory || '', replies: Array.isArray(x.replies) ? x.replies : [],
        cover: '', online: false, unread: 0, time: '', msgs: [], folder: null };
}
function loadStoredIdentities() { try { const v = JSON.parse(localStorage.getItem(IDN_KEY) || '[]'); return Array.isArray(v) ? v.map(normalizeIdentity) : []; } catch (_) { return []; } }
function persistIdentities() { try { localStorage.setItem(IDN_KEY, JSON.stringify(IDENTITIES)); } catch (e) { toast('保存失败：存储空间可能不足'); } }
function loadStoredMe() { try { const v = JSON.parse(localStorage.getItem('forever_messages_me_v1') || 'null'); return Object.assign({}, ME_DEFAULT, v && typeof v === 'object' ? v : {}); } catch (_) { return Object.assign({}, ME_DEFAULT); } }
function persistMe() { try { localStorage.setItem('forever_messages_me_v1', JSON.stringify(ME)); } catch (e) { toast('保存失败：存储空间可能不足'); console.error(e); } }


function loadStoredChatIds(){ try { const v=JSON.parse(localStorage.getItem('forever_messages_chat_ids_v1')||'[]'); return Array.isArray(v)?v.map(String):[]; } catch(_){ return []; } }


const MOMENT_KEY = 'forever_messages_moments_v1';
const MOMENT_BG_KEY = 'forever_messages_moments_bg_v1';
const MOMENT_AVATAR_KEY = 'forever_messages_moments_avatar_v1';
let POSTS = loadStoredMoments();
let MOMENT_BG = loadMomentBg();
let MOMENT_AVATAR = loadMomentAvatar();
let MOMENT_CMT_OPEN = {};
const DEFAULT_CHAT_AVATAR = 'assets/聊天默认头像/morentouxiang.jpg';
const DEFAULT_POLAROID = 'assets/聊天默认头像/pailide.jpg';
const DEFAULT_CHAR_AVATAR = 'assets/聊天默认头像/chartouxiang.jpg';
const DEFAULT_CHAR_BG = 'assets/聊天默认头像/charbjt.jpg';

const APPS = [
    { name: 'Notes',    dark: false, icon: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>' },
    { name: 'Camera',   dark: false, icon: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>' },
    { name: 'Music',    dark: true,  icon: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>' },
    { name: 'Weather',  dark: false, icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
    { name: 'Calendar', dark: false, icon: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>' },
    { name: 'Files',    dark: false, icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    { name: 'Maps',     dark: false, icon: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>' },
    { name: 'Photos',   dark: false, icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5-8 9"/>' },
    { name: 'Clock',    dark: false, icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { name: 'Mail',     dark: false, icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' },
    { name: 'Wallet',   dark: false, icon: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/>' },
    { name: 'Settings', dark: true,  icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>' },
];

let activeTab = 'chats';
let activeId = null;
let typingTimer = null;
let editingContactId = null;
let pendingCover = null;
let pendingAvatar = null;
let editingPersonaId = null;

/* ---------------- 本地真实数据：没有内置假联系人 ---------------- */
function loadStoredContacts() {
    try {
        const raw = localStorage.getItem('forever_messages_contacts_v1');
        let list = raw ? JSON.parse(raw) : [];
        // 一次性迁移：防油腻默认开启，已存在的联系人也补上（只改 promptOpts，其他字段原样保留）
        if (Array.isArray(list) && !localStorage.getItem('forever_messages_greasy_default_v1')) {
            list.forEach(c => {
                if (!c || typeof c !== 'object') return;
                const opts = Array.isArray(c.promptOpts) ? c.promptOpts : [];
                if (!opts.includes('greasy')) c.promptOpts = opts.concat('greasy');
            });
            localStorage.setItem('forever_messages_contacts_v1', JSON.stringify(list));
            localStorage.setItem('forever_messages_greasy_default_v1', '1');
        }
        return Array.isArray(list) ? list.map(normalizeContact) : [];
    } catch (e) { console.warn('[Messages] 联系人读取失败', e); return []; }
}
function normalizeContact(c) {
    return { id: String(c.id || ('contact-' + Date.now() + '-' + Math.random().toString(36).slice(2,8))), name: String(c.name || '未命名联系人'), avatar: c.avatar || '', ini: String(c.ini || c.name || '?').slice(0,1).toUpperCase(), g: c.g || 'g1', cover: c.cover || '', online: false, unread: Number(c.unread || 0), time: c.time || '', status: c.status || '联系人', beauty: (c.beauty && typeof c.beauty === 'object') ? c.beauty : {}, msgs: [], threads: (c.threads && typeof c.threads === 'object') ? c.threads : (Array.isArray(c.msgs) && c.msgs.length ? { self: c.msgs } : {}), replies: Array.isArray(c.replies) ? c.replies.map(String).filter(Boolean) : [], phone: c.phone || '', email: c.email || '', folder: c.folder || null, persona: c.persona || '', sig: c.sig || '', speech: c.speech || '', relation: c.relation || '', backstory: c.backstory || '', chatOpts: (c.chatOpts && typeof c.chatOpts === 'object') ? c.chatOpts : null, fresh: !!c.fresh, mem: (c.mem && typeof c.mem === 'object') ? c.mem : null, memories: Array.isArray(c.memories) ? c.memories : [], memCursor: Number(c.memCursor || 0), avOpts: (c.avOpts && typeof c.avOpts === 'object') ? c.avOpts : null, promptOpts: Array.isArray(c.promptOpts) ? c.promptOpts : ['greasy'], greasyEntries: Array.isArray(c.greasyEntries) ? c.greasyEntries : [] };
}


function loadStoredFolders() { try { const v=JSON.parse(localStorage.getItem('forever_messages_folders_v1') || '[]'); return Array.isArray(v) ? v.filter(x=>x && x.id && x.name).map(x=>({id:String(x.id),name:String(x.name)})) : []; } catch (_) { return []; } }
function persistFolders() { try { localStorage.setItem('forever_messages_folders_v1', JSON.stringify(FOLDERS)); } catch(e) { console.warn('[Messages] 文件夹保存失败',e); } }
async function importDeviceContacts() {
    if (!('contacts' in navigator) || !navigator.contacts || typeof navigator.contacts.select !== 'function') {
        toast('当前浏览器不支持读取手机通讯录，请点 New 手动新建'); return;
    }
    try {
        const picked = await navigator.contacts.select(['name','tel','email'], {multiple:true});
        let added = 0;
        for (const p of picked || []) {
            const name = (p.name && p.name[0] || '').trim();
            const phone = (p.tel && p.tel[0] || '').trim();
            const email = (p.email && p.email[0] || '').trim();
            if (!name) continue;
            if (CONTACTS.some(c => c.name.toLowerCase() === name.toLowerCase() && ((phone && c.phone === phone) || (!phone && c.email === email)))) continue;
            CONTACTS.unshift(normalizeContact({fresh:true,id:makeContactId(),name,phone,email,status:phone || email || '手机联系人',time:nowTime(),msgs:[],avatar:'',ini:name.slice(0,1)})); added++;
        }
        persistContacts(); renderContacts(); renderChats(); toast(added ? `已导入 ${added} 位联系人` : '没有新的联系人');
    } catch (e) { if (e && e.name !== 'AbortError') { console.error(e); toast('读取通讯录失败，请检查浏览器权限'); } }
}
function openApiSettings() { toast('请返回主界面，打开「设置 → API」配置聊天接口'); }

function exitMessagesToHome() {
    // 信息模块是直接挂载在主页面的 appWindow 中，不在 iframe 里；
    // 因此必须调用同一页面的 closeApp()，否则返回按钮会看起来完全无效。
    if (typeof window.closeApp === 'function') { window.closeApp(); return; }
    if (window.parent && window.parent !== window && typeof window.parent.closeApp === 'function') { window.parent.closeApp(); return; }
    toast('主界面关闭方法未加载，请检查 js/apps/app-manager.js');
}






function directAddContact(id) {
    const c = CONTACTS.find(x => String(x.id) === String(id));
    if (!c) return;
    if (CHAT_IDS.includes(c.id)) { toast('这个联系人已经添加'); return; }
    CHAT_IDS.unshift(c.id); persistChatIds(); closeContactIdModal(); switchTab('chats'); renderChats(); openChat(c.id);
}


function previewContactById(raw) {
    const id = String(raw || '').trim();
    const c = id ? CONTACTS.find(x => String(x.id).toLowerCase() === id.toLowerCase()) : null;
    const preview = document.getElementById('contactIdPreview'); const status = document.getElementById('contactIdStatus'); const start = document.getElementById('contactIdStart');
    if (!preview || !status || !start) return;
    if (!id) { preview.innerHTML = '<div class="contact-id-preview-empty">输入 ID 后会在这里显示联系人资料</div>'; status.textContent='仅能添加已创建并保存在本项目中的联系人'; start.disabled=true; return; }
    if (!c) { preview.innerHTML = '<div class="contact-id-preview-empty"><span class="contact-id-not-found">?</span><span>暂未找到这个 ID</span></div>'; status.textContent='请核对 ID，或先在「联系人」里创建该联系人'; start.disabled=true; return; }
    preview.innerHTML = `<div class="contact-id-person">${avatar(c, 'md')}<div class="contact-id-preview-info"><strong>${esc(c.name)}</strong><span>${esc(c.status || '联系人')}</span><code>ID · ${esc(c.id)}</code></div><span class="contact-id-found">已匹配</span></div>`;
    const already = CHAT_IDS.includes(c.id);
    status.textContent = already ? '这个联系人已经在 Chats 列表里了' : '请确认头像、名称和 ID 无误后添加';
    start.disabled = already;
    start.querySelector('span').textContent = already ? '已添加' : '确认并添加';
}
function addChatByContactId() {
    const input = document.getElementById('contactIdInput'); const id = input && input.value.trim();
    const c = CONTACTS.find(x => String(x.id).toLowerCase() === String(id || '').toLowerCase());
    if (!c) { previewContactById(id); return; }
    if (!CHAT_IDS.includes(c.id)) CHAT_IDS.unshift(c.id);
    persistChatIds(); closeContactIdModal(); switchTab('chats'); renderChats(); openChat(c.id);
}

/* ---------------- 工具 ---------------- */
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const last = c => c.msgs[c.msgs.length - 1];
function avatar(c, size) {
    const img = (c.avatar || DEFAULT_CHAR_AVATAR) ? `<img src="${c.avatar || DEFAULT_CHAR_AVATAR}" alt="" onerror="this.remove()">` : '';
    return `<div class="av ${size || 'lg'} ${c.g}">${img}<span class="ini">${c.ini}</span></div>`;
}
function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

/* ---------------- 侧边栏 · 账号登录 ---------------- */
















/* 底栏样式：长按第一个图标切换参考材质 / 经典黑色 */
(function initTabbarStyle() {
    const bar = document.getElementById('tabbar');
    const first = document.querySelector('.messages-app').querySelector('.tab[data-tab="chats"]');
    let timer = null, fired = false;
    first.addEventListener('pointerdown', () => {
        fired = false;
        timer = setTimeout(() => {
            fired = true;
            bar.classList.toggle('glass');
            toast(bar.classList.contains('glass') ? '已切换为玻璃底栏' : '已切换为经典黑色底栏');
        }, 600);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => first.addEventListener(ev, () => clearTimeout(timer)));
    first.addEventListener('contextmenu', e => e.preventDefault());
    first.addEventListener('click', e => {
        if (fired) { fired = false; e.stopImmediatePropagation(); return; }
        switchTab('chats');
    });
})();

function toast(text) {
    const t = document.getElementById('toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1500);
}
function focusSearch() { document.getElementById('searchInput').focus(); }

/* ---------------- 标签页 ---------------- */
function switchTab(name) {
    activeTab = name;
    document.querySelector('.messages-app').querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
    document.querySelector('.messages-app').querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.getElementById('v-' + name).classList.add('on');
    const fab = document.getElementById('fab');
    fab.title = { chats: '写消息', contacts: '添加联系人', moments: '发布动态', settings: '设置' }[name];
    if (name === 'contacts') renderContacts();
    if (name === 'chats') renderChats();
    if (name === 'moments') renderMoments();
}
function fabAction() {
    if (activeTab === 'chats') { openContactIdModal(); return; }
    if (activeTab === 'contacts') { openNewContact(null); return; }
    if (activeTab === 'moments') { openMomentComposer(); return; }
    if (activeTab === 'settings') { toast('聊天 API 请在主界面「设置 → API」中配置'); return; }
    toast('此功能暂不可用');
}

/* ---------------- 消息列表 ---------------- */
function renderChats() {
    const chatContacts = CHAT_IDS.map(id => CONTACTS.find(c => c.id === id)).filter(Boolean);
    const storyEl = document.getElementById('storyRow');
    const storyHtml = THEME === 'tabs'
        ? krHead() + profileCard()
        : chatContacts.map(c =>
            `<button class="story ${c.unread ? 'unread' : ''}" title="${esc(c.name)}" onclick="openChat('${c.id}')">${avatar(c, 'lg')}</button>`).join('');
    if (storyEl.dataset.html !== storyHtml) { storyEl.innerHTML = storyHtml; storyEl.dataset.html = storyHtml; }
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const list = chatContacts.filter(c => !q || c.name.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q) || c.msgs.some(m => m.text.toLowerCase().includes(q)));
    const unreadTotal = chatContacts.reduce((s, c) => s + c.unread, 0);
    document.querySelector('.messages-app').querySelectorAll('.chatsSub').forEach(el => el.textContent = unreadTotal ? `${unreadTotal} unread` : 'All caught up');
    document.getElementById('tabDot').style.display = unreadTotal ? 'block' : 'none';
    const box = document.getElementById('chatList');
    const setListHtml = h => { if (box.dataset.html !== h) { box.innerHTML = h; box.dataset.html = h; } };
    if (!list.length) { setListHtml('<div class="empty"><div style="font-size:28px;margin-bottom:12px">＋</div><strong>还没有聊天</strong><p style="margin-top:8px;line-height:1.7">先到「联系人」创建联系人并生成 ID，再点击右下角圆形按钮，粘贴 ID 添加聊天。</p></div>'); return; }
    setListHtml(list.map(c => {
        const m = last(c) || {me:false,text:'还没有消息',t:''};
        return `
        <div class="row ${c.unread ? 'unread' : ''}" onclick="openChat('${c.id}')">
            ${avatar(c, 'lg')}
            <div class="info">
                <div class="top"><span class="name">${esc(c.name)}</span><span class="time">${esc(c.time)}</span></div>
                <div class="bottom">
                    <span class="preview">${m.me ? 'You: ' : ''}${esc(m.text)}</span>
                    ${c.unread ? `<span class="badge">${c.unread}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join(''));
}

/* ---------------- 联系人 (信封角色卡) ---------------- */
const CLIP_SVG = '<svg viewBox="0 0 24 24"><defs><linearGradient id="clipGlass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050505"/><stop offset="0.42" stop-color="#2a2a2a"/><stop offset="0.52" stop-color="#cfcfcf"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="url(#clipGlass)" stroke-width="1.9"/><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="rgba(255,255,255,0.55)" stroke-width="0.5" transform="translate(-0.25,-0.3)"/></svg>';

const STAR_PATH = 'M12 2.5l2.9 6.2 6.7.8-5 4.6 1.4 6.7L12 17.4l-6 3.4 1.4-6.7-5-4.6 6.7-.8z';

/* 每张卡片随机撒 5~12 颗星，按卡片 id 生成，每次渲染位置一致 */
function starsHtml(seedStr) {
    let seed = 7;
    for (const ch of String(seedStr)) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const count = 5 + Math.floor(rnd() * 8);
    const out = [];
    let tries = 0;
    while (out.length < count && tries < 400) {
        tries++;
        const x = 3 + rnd() * 90;
        const y = 3 + rnd() * 88;
        // 避开：右上未读角标、中缝曲别针、头像、右下文字区
        if (x > 84 && y < 20) continue;
        if (x > 40 && x < 60 && y > 5 && y < 48) continue;
        if (x > 10 && x < 36 && y > 18 && y < 82) continue;
        if (x > 48 && y > 32) continue;
        const size = 10 + Math.pow(rnd(), 1.6) * 11;
        const op = 0.6 + rnd() * 0.35;
        const rot = Math.round(rnd() * 60 - 30);
        const color = x < 46 ? '#000' : '#fff';
        out.push(`<svg class="env-star" viewBox="0 0 24 24" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;opacity:${op.toFixed(2)};color:${color};transform:translate(-50%,-50%) rotate(${rot}deg)"><path d="${STAR_PATH}" fill="currentColor"/></svg>`);
    }
    return `<div class="env-stars">${out.join('')}</div>`;
}

function cardHtml(c, i) {
    const preview = (c.persona || '').trim() || (c.msgs && c.msgs.length ? c.msgs[c.msgs.length - 1].text : '');
    const coverUrl = c.cover || DEFAULT_CHAR_BG;
    const rightBg = coverUrl
        ? `<div class="env-bg" style="background-image: url('${coverUrl}')"></div>`
        : `<span class="env-wm">${esc(c.ini)}</span>`;
    const no = String((i || 0) + 1).padStart(2, '0');
    return `
        <div class="env-wrap">
            <div class="env" onclick="openContactEditor('${c.id}')">
                ${starsHtml(c.id)}
                <div class="env-right${coverUrl ? '' : ' fallback'}">
                    ${rightBg}
                    <div class="env-shade"></div>
                    ${c.unread > 0 ? `<span class="cc-badge env-badge">${c.unread}</span>` : ''}
                    <div class="env-info">
                        <span class="cc-status"><span class="cc-dot ${c.online ? '' : 'offline'}"></span>${esc(c.status)}</span>
                        <div class="cc-name">${esc(c.name)}</div>
                        ${preview ? `<div class="cc-preview">${esc(preview)}</div>` : ''}
                    </div>
                </div>
                <div class="env-left"><div class="av-frame">${avatar(c, 'lg')}</div><span class="env-no">NO.${no}</span></div>
                <span class="env-deco">₊⋆°₊꒰১</span>
                <div class="env-seam"></div>
                <button class="env-clip" title="人设与信息" aria-label="人设与信息" onclick="event.stopPropagation(); openPersonaEditor('${c.id}')">${CLIP_SVG}</button>
            </div>
        </div>`;
}

function addCardHtml() {
    return `
        <div class="env-wrap">
            <div class="add-contact-card" onclick="openContactEditor(null)">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>添加联系人</span>
            </div>
        </div>`;
}



function openContactEditor(id) {
    editingContactId = id || null;
    pendingCover = null;
    pendingAvatar = null;
    
    const editor = document.getElementById('contactEditor');
    const title = document.getElementById('editorTitle');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (id) {
        const c = CONTACTS.find(x => x.id === id);
        if (!c) return;
        title.innerText = '编辑联系人';
        deleteBtn.style.display = 'block';
        
        document.getElementById('editName').value = c.name;
        document.getElementById('editStatus').value = c.status;
        document.getElementById('editId').value = c.id;
        
        const coverPreview = document.getElementById('coverPreview');
        const coverPlaceholder = document.getElementById('coverPlaceholder');
        if (c.cover || DEFAULT_CHAR_BG) {
            coverPreview.src = c.cover || DEFAULT_CHAR_BG;
            coverPreview.style.display = 'block';
            coverPlaceholder.style.display = 'none';
        } else {
            coverPreview.src = '';
            coverPreview.style.display = 'none';
            coverPlaceholder.style.display = 'flex';
        }

        const avEl = document.getElementById('avatarPreview');
        avEl.innerHTML = (c.avatar || DEFAULT_CHAR_AVATAR) ? `<img src="${c.avatar || DEFAULT_CHAR_AVATAR}" id="avatarPreviewImg" alt="" onerror="this.remove()"><span class="ini" id="avatarIni" style="display:none">${c.ini}</span>` : `<span class="ini" id="avatarIni">${c.ini}</span>`;
        avEl.className = `av ${c.g || 'g1'}`;
    } else {
        title.innerText = '新建联系人';
        deleteBtn.style.display = 'none';
        
        document.getElementById('editName').value = '';
        document.getElementById('editStatus').value = '';
        document.getElementById('editId').value = '';
        
        document.getElementById('coverPreview').src = DEFAULT_CHAR_BG;
        document.getElementById('coverPreview').style.display = 'block';
        document.getElementById('coverPlaceholder').style.display = 'none';
        
        const avEl = document.getElementById('avatarPreview');
        avEl.innerHTML = `<img src="${DEFAULT_CHAR_AVATAR}" id="avatarPreviewImg" alt="" onerror="this.remove()"><span class="ini" id="avatarIni" style="display:none">N</span>`;
        avEl.className = 'av g1';
    }
    
    editor.classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
}

function closeContactEditor() {
    document.getElementById('contactEditor').classList.remove('open');
    if (!FD_ID) document.getElementById('tabbar').classList.remove('hide');
}

let personaMode = 'edit';      // 'edit' 编辑已有联系人 / 'create' 新建联系人
let personaNewFolder = null;   // 新建时放进哪个文件夹（null = 不放进任何文件夹）



function openNewContactFromCurrentFolder() { openNewContact(FD_ID); }

function openNewContact(folderId) {
    personaMode = 'create';
    personaNewFolder = folderId && folderId !== 'all' ? folderId : null;
    editingPersonaId = null;
    fillPersona(null);
    showPersona();
}

function showPersona() {
    const pe = document.getElementById('personaEditor');
    pe.classList.toggle('glass-top', personaMode === 'identity');
    pe.classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
}



function previewPersonaName(v) {
    const el = document.getElementById('personaHeroName');
    if (el) el.textContent = v.trim() || (personaMode === 'create' ? '新建联系人' : '未命名');
}

function closePersonaEditor() {
    document.getElementById('personaEditor').classList.remove('open');
    if (!FD_ID) document.getElementById('tabbar').classList.remove('hide');
    editingPersonaId = null;
    personaMode = 'edit';
}







function loadImage(input, imgId, placeholderId) {
    const file = input.files[0];
    if (!file) return;
    compressImage(file, imgId === 'coverPreview' ? 1100 : 512).then(dataUrl => {
        if (imgId === 'coverPreview') {
            const img = document.getElementById(imgId);
            img.src = dataUrl;
            img.style.display = 'block';
            document.getElementById(placeholderId).style.display = 'none';
            pendingCover = dataUrl;
        } else {
            const img = document.getElementById(imgId);
            const ini = document.getElementById('avatarIni');
            if (img) {
                img.src = dataUrl;
                img.style.display = 'block';
            } else {
                const newImg = document.createElement('img');
                newImg.id = 'avatarPreviewImg';
                newImg.src = dataUrl;
                document.getElementById('avatarPreview').prepend(newImg);
            }
            if (ini) ini.style.display = 'none';
            pendingAvatar = dataUrl;
        }
    }).catch(() => toast('图片读取失败，请换一张试试'));
}

function saveContact() {
    const name = document.getElementById('editName').value.trim();
    if (!name) {
        toast('姓名不能为空');
        return;
    }
    const status = document.getElementById('editStatus').value.trim() || '未知状态';
    let id = document.getElementById('editId').value.trim();
    if (!id) { id = makeContactId(); document.getElementById('editId').value = id; }
    id = id.toUpperCase(); document.getElementById('editId').value = id;
    if (!isValidContactId(id) && !(editingContactId && CONTACTS.some(c => c.id === editingContactId && c.id === id))) { toast('ID 格式应为 ID- 加 8 位大写字母或数字，例如 ID-PXESX38G'); return; }
    if (CONTACTS.some(c => c.id.toLowerCase() === id.toLowerCase() && c.id !== editingContactId)) { toast('这个 ID 已存在，请检查或直接编辑该联系人'); return; }
    
    if (editingContactId) {
        // Update
        const c = CONTACTS.find(x => x.id === editingContactId);
        if (c) {
            const oldId = c.id;
            c.id = id;
            migrateContactId(oldId, id);
            c.name = name;
            c.status = status;
            c.ini = name[0].toUpperCase();
            if (pendingCover) c.cover = pendingCover;
            if (pendingAvatar) c.avatar = pendingAvatar;
        }
        toast('联系人已更新');
    } else {
        // Create
        const newContact = {
            id: id,
            name: name,
            status: status,
            ini: name[0].toUpperCase(),
            g: 'g' + (Math.floor(Math.random() * 4) + 1),
            cover: pendingCover,
            avatar: pendingAvatar,
            online: false,
            unread: 0,
            time: nowTime(),
            msgs: [],
            replies: [],
            promptOpts: ['greasy'],
            greasyEntries: []
        };
        newContact.fresh = true; CONTACTS.unshift(newContact);
        toast('联系人已创建 · ID：' + id);
    }
    
    persistContacts();
    closeContactEditor();
    renderContacts();
    renderChats();
}

function deleteContact() {
    if (!editingContactId) return;
    CONTACTS = CONTACTS.filter(c => c.id !== editingContactId);
    persistContacts();
    toast('联系人已删除');
    closeContactEditor();
    renderContacts();
    renderChats();
}

/* ---------------- 朋友圈 ---------------- */
const PIC_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5-8 9"/></svg>';
const HEART = '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>';
const CHAT_ICON = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>';



/* ---------------- 聊天详情 ---------------- */
function openChat(id) {
    const c = CONTACTS.find(x => x.id === id);
    if (!c) return;
    activeId = id;
    c.unread = 0;
    persistContacts();
    document.getElementById('headAv').outerHTML = avatar(c, 'md').replace('class="av ', 'id="headAv" class="av ');
    document.getElementById('headName').textContent = c.name;
    document.getElementById('headStatus').textContent = c.online ? '在线' : c.status;
    renderThread();
    applyRoomBeauty(c);
    document.getElementById('chatView').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
    renderChats();
}
function closeChat() {
    clearTimeout(typingTimer);
    document.getElementById('chatView').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
    activeId = null;
    renderChats();
}
/* 默认头像 / 背景：启动时预加载，加载完成后刷新列表，避免第一次渲染时漏掉 */
function preloadDefaultImages() {
    [DEFAULT_CHAR_AVATAR, DEFAULT_CHAR_BG, DEFAULT_CHAT_AVATAR, DEFAULT_POLAROID].forEach(src => {
        const im = new Image();
        im.onload = () => {
            ['storyRow', 'chatList'].forEach(id => { const el = document.getElementById(id); if (el) el.dataset.html = ''; });
            renderChats();
            if (typeof renderContacts === 'function') renderContacts();
        };
        im.src = src;
    });
}
/* ---------------- 记忆区：总结、记忆列表、全屏页面 ---------------- */
const MEM_PRESET_KEY = 'forever_memory_presets_v1';
const DEFAULT_SUMMARY_INSTR = [
    '你是聊天记录的记忆整理员。请阅读下面的对话，写出这段时间里发生的事情经过。',
    '【格式必须遵守】',
    '1. 用户消息里会给出“时间范围”，形如 [年月日时分—年月日时分]。summary 必须以这个时间范围原样开头，方括号一起保留，之后紧跟事情经过。',
    '2. 事情经过用第三人称、直白客观地叙述，直接写角色名 {{char}} 和用户名 {{user}}，不要用“他、她、我、你”指代他们。',
    '3. points：挑出 2 到 5 句最关键的原话或要点。',
    '4. relation：写清关系与感情的变化；如有多人，逐一写出每个人的变化；没有变化就写“无明显变化”。',
    '5. priority：1 到 10 的整数，越大越重要。keys：3 到 6 个关键词。',
    '只输出一个 JSON 对象，不要代码块，不要任何其他文字，格式如下：',
    '{"summary":"[时间范围]事情经过","points":["要点"],"relation":"关系与感情的变化","priority":5,"keys":["关键词"]}'
].join('\n');
function memPresets() { try { const v = JSON.parse(localStorage.getItem(MEM_PRESET_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
function saveMemPresets(list) { try { localStorage.setItem(MEM_PRESET_KEY, JSON.stringify(list)); } catch (_) {} }
function memOf(c) { c.mem = Object.assign({ ctx: 30, auto: false, every: 40, instr: DEFAULT_SUMMARY_INSTR, presetIdx: -1 }, c.mem || {}); return c.mem; }
function memStamp(ts) { const d = new Date(ts); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${pad2(d.getHours())}时${pad2(d.getMinutes())}分`; }
function memLabelFor(part) {
    const f = x => x.ts ? memStamp(x.ts) : `${memDateLabel()} ${String(x.t || '').replace(':', '时')}分`;
    return `[${f(part[0])}—${f(part[part.length - 1])}]`;
}
function memDateLabel() { const d = new Date(); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }
function fillMemInstr(text, c) { return String(text || '').split('{{char}}').join(c.name).split('{{user}}').join(ME.name); }
function parseSummaryJson(raw) {
    const t = String(raw || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(t); } catch (_) {}
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (_) {} }
    return null;
}
async function runSummary(c, from, to) {
    const m = memOf(c);
    const part = c.msgs.slice(from, to);
    if (!part.length) { toast('这段没有消息'); return false; }
    if (!window.MessagesAPI || !window.MessagesAPI.isConfigured()) { toast('请先在「设置 → API」保存接口配置'); return false; }
    const label = memLabelFor(part);
    const transcript = '时间范围：' + label + '\n' + part.map(x => `${x.me ? ME.name : c.name}：${x.text}`).join('\n');
    toast('正在总结…');
    try {
        const raw = await window.MessagesAPI.complete(fillMemInstr(m.instr || DEFAULT_SUMMARY_INSTR, c), transcript);
        const o = parseSummaryJson(raw) || {};
        const pr = Math.max(1, Math.min(10, parseInt(o.priority, 10) || 5));
        c.memories = c.memories || [];
        c.memories.unshift({
            id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            label,
            text: String(o.summary || raw || '').trim().replace(/^\s*\[[^\]]*\]\s*/, ''),
            points: Array.isArray(o.points) ? o.points.map(String).slice(0, 6) : [],
            relation: String(o.relation || '').trim(),
            keys: Array.isArray(o.keys) ? o.keys.map(String).slice(0, 8) : [],
            priority: pr
        });
        c.memCursor = to;
        persistContacts(); renderMemoryPage();
        toast('已生成记忆');
        return true;
    } catch (err) { toast((err && err.message) || '总结失败'); return false; }
}
function maybeAutoSummary(c) {
    const m = memOf(c);
    if (!m.auto) return;
    const cursor = c.memCursor || 0;
    if (c.msgs.length - cursor >= (m.every || 40)) runSummary(c, cursor, c.msgs.length);
}
function curMemContact() { return CONTACTS.find(x => x.id === activeId) || null; }
function openMemoryPage() {
    const c = curMemContact(); if (!c) return;
    const host = document.querySelector('.messages-app'); if (!host) return;
    let page = document.getElementById('memPage');
    if (!page) { page = document.createElement('div'); page.id = 'memPage'; host.appendChild(page); }
    page.classList.add('open');
    renderMemoryPage();
}
function closeMemoryPage() { const p = document.getElementById('memPage'); if (p) p.classList.remove('open'); }
const MEM_ICO = {
    restore: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 15"/><path d="M20 20v-5h-5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/></svg>'
};
function renderMemoryPage() {
    const page = document.getElementById('memPage'); const c = curMemContact();
    if (!page || !c) return;
    const m = memOf(c);
    const presets = memPresets();
    const presetOpts = '<option value="-1">默认指令</option>' + presets.map((p, i) => `<option value="${i}" ${m.presetIdx === i ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    const mems = (c.memories || []).slice().sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const memHtml = mems.length ? mems.map(x => `
        <div class="mem-card mem-item">
            <div class="mem-head"><span class="mem-prio">优先级 <input type="number" min="1" max="10" value="${x.priority}" onchange="memSetPriority('${x.id}', this.value)"></span><button class="mem-del" type="button" onclick="memDelete('${x.id}')">删除</button></div>
            <div class="mem-text"><span class="mem-stamp">${esc(x.label)}</span> ${esc(x.text)}</div>
            ${x.points && x.points.length ? `<div class="mem-points">${x.points.map(p => `<div>- ${esc(p)}</div>`).join('')}</div>` : ''}
            ${x.relation ? `<div class="mem-rel"><span>关系与感情</span>${esc(x.relation)}</div>` : ''}
            ${x.keys && x.keys.length ? `<div class="mem-keys">${x.keys.map(k => `<em>${esc(k)}</em>`).join('')}</div>` : ''}
        </div>`).join('') : '<div class="mem-empty">还没有记忆。开启自动总结，或手动总结一段对话。</div>';
    const last = c.msgs.length;
    page.innerHTML = `
        <header class="mem-top"><button class="mem-back" type="button" onclick="closeMemoryPage()">返回</button><span class="mem-title">记忆</span><span class="mem-spacer"></span></header>
        <div class="mem-scroll">
            <div class="mem-sec">设置</div>
            <div class="mem-card">
                <div class="mem-row"><span class="mem-lbl">上下文条数</span><input type="number" min="1" value="${m.ctx}" onchange="memSetNum('ctx', this.value)"></div>
                <div class="mem-row"><span class="mem-lbl">自动总结</span><button class="mem-switch ${m.auto ? 'on' : ''}" type="button" onclick="memToggleAuto()" aria-label="自动总结"></button></div>
                <div class="mem-row"><span class="mem-lbl">每到多少条总结一次</span><input type="number" min="1" value="${m.every}" onchange="memSetNum('every', this.value)"></div>
                <div class="mem-row"><span class="mem-lbl">手动总结：第几条到第几条</span><span class="mem-range"><input type="number" min="1" id="memFrom" value="${Math.max(1, last - 39)}"><i>—</i><input type="number" min="1" id="memTo" value="${last}"></span></div>
                <button class="mem-btn mem-primary" type="button" onclick="memSummarizeRange()">${MEM_ICO.doc}<span>手动总结这段</span></button>
            </div>
            <div class="mem-sec">总结指令</div>
            <div class="mem-card">
                <div class="mem-row"><span class="mem-lbl">预设</span><select class="mem-select" onchange="memSwitchPreset(this.value)">${presetOpts}</select></div>
                <textarea class="mem-instr" id="memInstr" rows="9">${esc(m.instr)}</textarea>
                <div class="mem-btns">
                    <button class="mem-btn" type="button" onclick="memRestoreDefault()">${MEM_ICO.restore}<span>恢复默认</span></button>
                    <button class="mem-btn" type="button" onclick="memSaveInstr()">${MEM_ICO.save}<span>保存修改</span></button>
                    <button class="mem-btn" type="button" onclick="memSavePreset()">${MEM_ICO.plus}<span>存为预设</span></button>
                    ${m.presetIdx >= 0 ? `<button class="mem-btn" type="button" onclick="memUpdatePreset()">${MEM_ICO.refresh}<span>更新预设</span></button><button class="mem-btn mem-danger" type="button" onclick="memDeletePreset()">${MEM_ICO.trash}<span>删除预设</span></button>` : ''}
                </div>
                <div class="mem-hint">{{char}} 代表角色名，{{user}} 代表你的名字。</div>
            </div>
            <div class="mem-sec">查看记忆（优先级高的排在提示词前面）</div>
            ${memHtml}
        </div>`;
}
function memSetNum(key, v) { const c = curMemContact(); if (!c) return; const m = memOf(c); m[key] = Math.max(1, parseInt(v, 10) || 1); persistContacts(); renderMemoryPage(); }
function memToggleAuto() { const c = curMemContact(); if (!c) return; const m = memOf(c); m.auto = !m.auto; persistContacts(); renderMemoryPage(); }
async function memSummarizeRange() {
    const c = curMemContact(); if (!c) return;
    const a = Math.max(1, parseInt(document.getElementById('memFrom').value, 10) || 1);
    const b = Math.min(c.msgs.length, parseInt(document.getElementById('memTo').value, 10) || c.msgs.length);
    if (b < a) { toast('结束条数不能小于开始条数'); return; }
    window.MESSAGES_USER_NAME = ME.name;
    await runSummary(c, a - 1, b);
}
function memSaveInstr() { const c = curMemContact(); if (!c) return; memOf(c).instr = document.getElementById('memInstr').value; persistContacts(); toast('已保存总结指令'); }
function memRestoreDefault() { const c = curMemContact(); if (!c) return; const m = memOf(c); m.instr = DEFAULT_SUMMARY_INSTR; m.presetIdx = -1; persistContacts(); renderMemoryPage(); }
function memSavePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const list = memPresets();
    list.push({ name: '预设 ' + (list.length + 1), text: document.getElementById('memInstr').value });
    saveMemPresets(list);
    m.presetIdx = list.length - 1; m.instr = list[m.presetIdx].text;
    persistContacts(); renderMemoryPage(); toast('已存为预设');
}
function memUpdatePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const list = memPresets(); if (m.presetIdx < 0 || !list[m.presetIdx]) return;
    list[m.presetIdx].text = document.getElementById('memInstr').value; saveMemPresets(list);
    m.instr = list[m.presetIdx].text; persistContacts(); renderMemoryPage(); toast('预设已更新');
}
function memSwitchPreset(v) {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const i = parseInt(v, 10); const list = memPresets();
    if (i < 0 || !list[i]) { m.presetIdx = -1; m.instr = DEFAULT_SUMMARY_INSTR; }
    else { m.presetIdx = i; m.instr = list[i].text; }
    persistContacts(); renderMemoryPage();
}
function memSetPriority(id, v) { const c = curMemContact(); if (!c) return; const x = (c.memories || []).find(y => y.id === id); if (!x) return; x.priority = Math.max(1, Math.min(10, parseInt(v, 10) || 1)); persistContacts(); renderMemoryPage(); }
function memDeletePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    if (m.presetIdx < 0) { toast('当前是默认指令，不能删除'); return; }
    const idx = m.presetIdx;
    const list = memPresets(); list.splice(idx, 1); saveMemPresets(list);
    CONTACTS.forEach(x => { if (x.mem) { if (x.mem.presetIdx === idx) x.mem.presetIdx = -1; else if (x.mem.presetIdx > idx) x.mem.presetIdx -= 1; } });
    m.presetIdx = -1; m.instr = DEFAULT_SUMMARY_INSTR;
    persistContacts(); renderMemoryPage(); toast('已删除预设');
}
function memDelete(id) { const c = curMemContact(); if (!c) return; c.memories = (c.memories || []).filter(y => y.id !== id); persistContacts(); renderMemoryPage(); }
/* ---------------- 长按消息菜单：编辑 / 复制 / 删除 / 多选 ---------------- */
function mmHost() { return document.querySelector('.messages-app'); }
function mmMenuEl() {
    let ov = document.getElementById('mmOverlay');
    if (!ov) {
        const host = mmHost(); if (!host) return null;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        ov = document.createElement('div');
        ov.id = 'mmOverlay'; ov.className = 'mm-overlay';
        ov.addEventListener('pointerdown', e => { if (e.target === ov) hideMsgMenu(); });
        host.appendChild(ov);
    }
    let el = document.getElementById('mmMenu');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mmMenu'; el.className = 'mm-menu';
        ov.appendChild(el);
    }
    return el;
}
function mmBuildMenu(el) {
    const items = [
        { k: 'edit', label: '编辑', icon: MM_ICONS.edit },
        { k: 'copy', label: '复制', icon: MM_ICONS.copy },
        { div: true },
        { k: 'del', label: '删除', icon: MM_ICONS.del, cls: 'del' },
        { k: 'multi', label: '多选', icon: MM_ICONS.multi, cls: 'multi' }
    ];
    el.innerHTML = items.map(it => it.div
        ? '<span class="mm-div"></span>'
        : `<button class="mm-item ${it.cls || ''}" type="button" data-k="${it.k}">${it.icon}<span>${it.label}</span></button>`
    ).join('');
    el.querySelectorAll('.mm-item').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        mmRun(btn.dataset.k);
    }));
}
function showMsgMenu(row) {
    if (navigator.vibrate) navigator.vibrate(40);
    const el = mmMenuEl(); if (!el) return;
    MM.idx = Number(row.dataset.i);
    mmBuildMenu(el);
    const ov = document.getElementById('mmOverlay');
    ov.querySelectorAll('.mm-hl').forEach(n => n.remove());
    const bubble = row.querySelector('.bubble');
    if (bubble) {
        // 被长按的消息：在遮罩上方复制一份，位置、颜色、字体、边框与原气泡一致
        const hr = ov.getBoundingClientRect(), br = bubble.getBoundingClientRect();
        const cs = getComputedStyle(bubble);
        const hl = bubble.cloneNode(true);
        hl.removeAttribute('id');
        hl.classList.add('mm-hl');
        ['backgroundColor', 'backgroundImage', 'color', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'boxShadow', 'padding', 'fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'lineHeight', 'textAlign', 'whiteSpace', 'wordBreak'].forEach(k => { hl.style[k] = cs[k]; });
        hl.style.boxSizing = 'border-box';
        hl.style.left = (br.left - hr.left) + 'px';
        hl.style.top = (br.top - hr.top) + 'px';
        hl.style.width = br.width + 'px';
        hl.style.height = br.height + 'px';
        ov.insertBefore(hl, ov.firstChild);
    }
    ov.classList.add('show');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
}
function hideMsgMenu() {
    const ov = document.getElementById('mmOverlay'); if (ov) { ov.classList.remove('show'); ov.querySelectorAll('.mm-hl').forEach(n => n.remove()); }
    const el = document.getElementById('mmMenu'); if (el) el.classList.remove('show');
}
function mmRun(k) {
    const i = MM.idx;
    hideMsgMenu();
    const c = curMemContact(); if (!c || i == null || !c.msgs[i]) return;
    if (k === 'edit') return mmOpenEdit(c, i);
    if (k === 'copy') return mmCopy([c.msgs[i].text]);
    if (k === 'del') return mmDelete(c, [i]);
    if (k === 'multi') return mmEnterMulti(i);
}
function mmOpenEdit(c, i) {
    MM_SHEET_TAG = true;
    openSheet(`<div class="sheet-title">编辑消息</div><div class="sheet-body">`
        + `<textarea class="mm-edit-ta" id="mmEditTa" rows="4">${esc(c.msgs[i].text)}</textarea>`
        + `<button class="identity-cancel" id="mmEditOk" type="button">保存</button>`
        + `<button class="identity-cancel" id="mmEditNo" type="button">取消</button></div>`);
    MM_SHEET_TAG = false;
    document.getElementById('mmEditNo').onclick = () => closeSheet();
    document.getElementById('mmEditOk').onclick = () => {
        const v = document.getElementById('mmEditTa').value.trim();
        if (!v) { toast('消息不能为空'); return; }
        c.msgs[i].text = v;
        persistContacts(); closeSheet(); renderThread(); renderChats();
    };
}
function mmCopy(texts) {
    const text = texts.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('已复制')).catch(() => toast('复制失败'));
    } else toast('当前浏览器不支持复制');
}
function mmDelete(c, idxs) {
    const list = idxs.slice().sort((a, b) => b - a);
    MM_SHEET_TAG = true;
    askConfirm('删除消息？', `将删除 ${list.length} 条消息，删除后无法恢复`, '删除', () => {
        list.forEach(i => c.msgs.splice(i, 1));
        persistContacts(); renderThread(); renderChats();
        if (MM.mode === 'multi') mmExitMulti();
    });
    MM_SHEET_TAG = false;
}
function mmEnterMulti(i) {
    MM.mode = 'multi';
    MM.sel = new Set([i]);
    const box = document.getElementById('thread');
    if (box) box.classList.add('mm-multi');
    mmBarEl().classList.add('show');
    mmRefreshSel(); mmBarUpdate();
}
function mmExitMulti() {
    MM.mode = 'menu'; MM.sel = new Set();
    const box = document.getElementById('thread');
    if (box) box.classList.remove('mm-multi');
    const bar = document.getElementById('mmBar'); if (bar) bar.classList.remove('show');
    mmRefreshSel();
}
function mmRefreshSel() {
    document.querySelectorAll('#thread .mrow').forEach(r => r.classList.toggle('sel', MM.sel.has(Number(r.dataset.i))));
}
function mmBarEl() {
    let b = document.getElementById('mmBar');
    if (b) return b;
    const comp = document.querySelector('.messages-app .composer') || mmHost();
    b = document.createElement('div');
    b.id = 'mmBar'; b.className = 'mm-bar';
    b.innerHTML = `<span class="mm-bar-count" id="mmCount">已选 0</span>`
        + `<button class="mm-bar-btn" id="mmBarCopy" type="button">复制</button>`
        + `<button class="mm-bar-btn del" id="mmBarDel" type="button">删除</button>`
        + `<button class="mm-bar-btn" id="mmBarCancel" type="button">取消</button>`;
    comp.appendChild(b);
    b.querySelector('#mmBarCancel').onclick = mmExitMulti;
    b.querySelector('#mmBarCopy').onclick = () => {
        const c = curMemContact(); if (!c) return;
        const idxs = [...MM.sel].sort((a, b) => a - b);
        if (!idxs.length) { toast('先选择消息'); return; }
        mmCopy(idxs.map(i => c.msgs[i] ? c.msgs[i].text : '').filter(Boolean));
    };
    b.querySelector('#mmBarDel').onclick = () => {
        const c = curMemContact(); if (!c) return;
        const idxs = [...MM.sel];
        if (!idxs.length) { toast('先选择消息'); return; }
        mmDelete(c, idxs);
    };
    return b;
}
function mmBarUpdate() {
    const n = document.getElementById('mmCount');
    if (n) n.textContent = '已选 ' + MM.sel.size;
}
function bindMsgMenu() {
    const box = document.getElementById('thread');
    if (!box || MM.bound) return;
    MM.bound = true;
    const cancel = () => { clearTimeout(MM.timer); MM.timer = null; };
    box.addEventListener('pointerdown', e => {
        hideMsgMenu();
        if (MM.mode === 'multi') return;
        const row = e.target.closest && e.target.closest('.mrow');
        if (!row || row.classList.contains('typing')) return;
        MM.sx = e.clientX; MM.sy = e.clientY;
        cancel();
        MM.timer = setTimeout(() => { MM.timer = null; showMsgMenu(row); }, 400);
    });
    box.addEventListener('pointermove', e => {
        if (MM.timer && Math.hypot(e.clientX - MM.sx, e.clientY - MM.sy) > 8) cancel();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => box.addEventListener(t, cancel));
    box.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mrow')) e.preventDefault(); });
    box.addEventListener('click', e => {
        if (MM.mode !== 'multi') return;
        const row = e.target.closest && e.target.closest('.mrow');
        if (!row) return;
        const i = Number(row.dataset.i);
        if (MM.sel.has(i)) MM.sel.delete(i); else MM.sel.add(i);
        mmRefreshSel(); mmBarUpdate();
    });
    document.addEventListener('pointerdown', e => {
        if (!e.target.closest('.mm-menu') && !e.target.closest('.mrow')) hideMsgMenu();
    });
}
/* ---------------- 聊天室顶栏下滑面板：内置提示词 + 条数 + 大时间 ---------------- */
const CHAT_PROMPT_OPTS = [
    { k: 'ai', label: '防八股' },
    { k: 'greasy', label: '防油腻' },
    { k: 'threat', label: '防威胁' },
    { k: 'fake', label: '防假性安慰' },
    { k: 'macho', label: '防超雄' }
];
function chatDropEl() {
    let p = document.getElementById('chatDrop');
    if (p) return p;
    const view = document.getElementById('chatView'); if (!view) return null;
    p = document.createElement('div');
    p.id = 'chatDrop'; p.className = 'chat-drop';
    view.appendChild(p);
    return p;
}
const CD_TITLE = '如果思念也有声音';
const CD_TITLE_STYLE = [[-7, 58], [5, 66], [-3, 54], [8, 62], [-5, 58], [4, 68], [-9, 54], [6, 62]]; // [角度, 字号]
const CD_TITLE_TONE = ['#F3D1DF', '#FBEAF0', '#EAB8CC', '#F5DCE6', '#F0C9DA', '#FFF0F5', '#F2D3E0', '#F7E1E9']; // 浅色玻璃，深浅不一
function cdTitleHtml() {
    return `<div class="cd-title">${Array.from(CD_TITLE).map((ch, i) => {
        const st = CD_TITLE_STYLE[i % CD_TITLE_STYLE.length];
        return `<span class="cd-ch" style="--char-index:${i};transform: rotate(${st[0]}deg) translateY(${i % 2 ? 3 : -3}px); font-size: ${st[1]}px">${ch}</span>`;
    }).join('')}</div>`;
}
function renderChatDrop() {
    const p = chatDropEl(); const c = curMemContact(); if (!p || !c) return;
    const on = c.promptOpts || [];
    p.innerHTML = cdTitleHtml() + `<div class="cd-chips">${CHAT_PROMPT_OPTS.map(o => `<div class="cd-option"><button class="cd-chip ${on.indexOf(o.k) >= 0 ? 'on' : ''}" type="button" onclick="toggleChatPrompt('${o.k}')">${o.label}</button><button class="cd-option-settings" type="button" aria-label="调整${o.label}" onclick="openChatPromptSettings('${o.k}')" title="调整提示词"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"/><path d="m19.4 13.5 1.1.85-1.1 1.9-1.35-.45a7.9 7.9 0 0 1-1.45.84l-.24 1.43h-2.2l-.24-1.43a7.9 7.9 0 0 1-1.45-.84l-1.35.45-1.1-1.9 1.1-.85a7.1 7.1 0 0 1 0-1.68l-1.1-.85 1.1-1.9 1.35.45a7.9 7.9 0 0 1 1.45-.84l.24-1.43h2.2l.24 1.43a7.9 7.9 0 0 1 1.45.84l1.35-.45 1.1 1.9-1.1.85a7.1 7.1 0 0 1 0 1.68Z" transform="translate(-1 -1) scale(1.05)"/></svg></button></div>`).join('')}</div>`
        + `<div class="cd-foot"><span class="cd-count">共 ${c.msgs.length} 条</span><span class="cd-time">${nowTime()}</span></div>`;
    if (CD_STARS_NODE) p.appendChild(CD_STARS_NODE);
}
let DROP_DRAG_MOVED = false;
function toggleChatDrop() {
    if (DROP_DRAG_MOVED) { DROP_DRAG_MOVED = false; return; }
    const p = chatDropEl(); if (!p) return;
    if (p.classList.contains('show')) { p.classList.remove('show'); return; }
    renderChatDrop();
    p.classList.add('show');
    cdSpawnStars();
}
function toggleChatPrompt(k) {
    const c = curMemContact(); if (!c) return;
    const arr = Array.isArray(c.promptOpts) ? c.promptOpts.slice() : [];
    const i = arr.indexOf(k);
    if (i >= 0) arr.splice(i, 1); else arr.push(k);
    c.promptOpts = arr;
    persistContacts(); renderChatDrop();
}
const CHAT_PROMPT_SETTINGS_KEY = 'forever_chat_prompt_settings_v1';
const CHAT_BAN_DEFAULTS = ['低吼一声', '揉进骨血', '揉进骨头'];
// 解析一行输入：「词条」或「词条|原因」
function parseWordLine(line) {
    const i = line.indexOf('|');
    if (i < 0) return { word: line.trim(), reason: '' };
    return { word: line.slice(0, i).trim(), reason: line.slice(i + 1).trim() };
}
function readChatPromptSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(CHAT_PROMPT_SETTINGS_KEY) || '{}');
        const words = Array.isArray(saved.words) ? saved.words : CHAT_BAN_DEFAULTS.slice();
        const oldPriority = Array.isArray(saved.priority) ? saved.priority : CHAT_BAN_DEFAULTS.slice();
        const levels = saved.priorityLevels && typeof saved.priorityLevels === 'object' ? saved.priorityLevels : {};
        words.forEach(w => { if (!levels[w]) levels[w] = oldPriority.includes(w) ? 'high' : 'low'; });
        const disabledWords = Array.isArray(saved.disabledWords) ? saved.disabledWords : [];
        const customWords = Array.isArray(saved.customWords) ? saved.customWords : [];
        const customReasons = saved.customReasons && typeof saved.customReasons === 'object' ? saved.customReasons : {};
        return { enabled: saved.enabled !== false, words, priorityLevels: levels, disabledWords, customWords, customReasons };
    } catch (_) {
        return { enabled: true, words: CHAT_BAN_DEFAULTS.slice(), priorityLevels: Object.fromEntries(CHAT_BAN_DEFAULTS.map(w=>[w,'high'])) };
    }
}
function saveChatPromptSettings(v) { try { localStorage.setItem(CHAT_PROMPT_SETTINGS_KEY, JSON.stringify(v)); } catch (_) {} }
function cdPriorityControl(word, level) {
    const current = ['high','medium','low'].includes(level) ? level : 'medium';
    const label = {high:'高',medium:'中',low:'低'}[current];
    return `<div class="cd-priority-pills" role="group" aria-label="${escapeHtml(word)}提示词位置"><button type="button" class="cd-prio-pill is-${current}" data-prio="${current}" aria-label="优先级${label}，点击切换" aria-pressed="true">${label}</button></div>`;
}
function cdWordRowHtml(w, i, enabled, level, reason = '') {
    return `<div class="cd-word-row" data-word-row="${i}">
      <label class="cd-word-check"><input type="checkbox" data-word="${i}" ${enabled?'checked':''} aria-label="启用词条 ${escapeHtml(w)}"><svg viewBox="0 0 36 22" aria-hidden="true"><text x="18" y="16" text-anchor="middle" font-size="15" font-family="system-ui, sans-serif" font-weight="650">^ω^</text></svg></label>
      <span class="cd-word-label" title="${escapeHtml(reason ? w + ' | ' + reason : w)}"><span class="cd-word-text">${escapeHtml(w)}</span>${reason ? `<span class="cd-word-reason">| ${escapeHtml(reason)}</span>` : ''}</span>${cdPriorityControl(w,level)}
      <div class="cd-word-actions"><button type="button" class="cd-word-edit" aria-label="编辑词条" title="编辑"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.8-.8 4 4-.8L19 8.2 15.8 5 4 16.8Z"/><path d="m13.9 6.9 3.2 3.2"/></svg></button><button type="button" class="cd-word-delete" aria-label="删除词条" title="删除"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7m-8 0 .8 13h8.4L17 7M10 10.5v6m4-6v6"/></svg></button></div>
    </div>`;
}
function cdWordListHtml(words, disabledWords, priorityLevels, customWords = [], customReasons = {}) {
    // 先去重：相同词条只保留一个，避免重复显示。
    const uniqueWords = [...new Set(words.map(word => String(word || '').trim()).filter(Boolean))];
    const customSet = new Set(customWords);
    const entries = uniqueWords.map((word, index) => ({ word, index }));

    // 按“实际共享的词/连续字串”分组，而不是机械地按前两个字分组。
    // 例如「揉进骨血」「揉进骨头」会收进「揉进骨」折叠组。
    const candidates = new Map();
    for (let i = 0; i < entries.length; i++) {
        const a = entries[i].word;
        for (let j = i + 1; j < entries.length; j++) {
            const b = entries[j].word;
            let best = '';
            for (let n = Math.min(a.length, b.length); n >= 2; n--) {
                let found = false;
                for (let k = 0; k <= a.length - n; k++) {
                    const part = a.slice(k, k + n);
                    if (b.includes(part)) { best = part; found = true; break; }
                }
                if (found) break;
            }
            if (best) {
                if (!candidates.has(best)) candidates.set(best, new Set());
                candidates.get(best).add(a); candidates.get(best).add(b);
            }
        }
    }
    const groups = [...candidates.entries()]
        .filter(([, set]) => set.size >= 2)
        .sort((a, b) => b[1].size - a[1].size || b[0].length - a[0].length);
    const buckets = [];
    const assigned = new Set();
    for (const [key, set] of groups) {
        const items = entries.filter(entry => set.has(entry.word) && !assigned.has(entry.word));
        if (items.length < 2) continue;
        items.forEach(entry => assigned.add(entry.word));
        buckets.push({ key, items, custom: items.every(entry => customSet.has(entry.word)) });
    }
    entries.filter(entry => !assigned.has(entry.word)).forEach(entry => {
        buckets.push({ key: entry.word, items: [entry], custom: customSet.has(entry.word) });
    });

    return buckets.map(({key, items, custom}) => {
        const rows = items.map(({word,index}) => cdWordRowHtml(word,index,!disabledWords.includes(word),priorityLevels[word]||'medium',(customReasons||{})[word]||'')).join('');
        if (items.length < 2) return rows;
        const title = key;
        return `<details class="cd-word-group ${custom ? 'cd-custom-related-group' : ''}"><summary><span class="cd-word-group-name">${escapeHtml(title)}<small>相同词语</small></span><span class="cd-word-group-count">${items.length} 个词条</span><svg class="cd-word-group-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></summary><div class="cd-word-group-items">${rows}</div></details>`;
    }).join('');
}
function rebuildCdWordGroups(modal) {
    const list = modal.querySelector('.cd-word-list');
    if (!list) return;
    const words = [], disabled = [], levels = {};
    list.querySelectorAll('.cd-word-row').forEach(row => {
        const label = row.querySelector('.cd-word-text');
        const check = row.querySelector('[data-word]');
        const prio = row.querySelector('.cd-prio-pill');
        const word = (label ? label.textContent : '').trim();
        if (!word) return;
        words.push(word);
        if (check && !check.checked) disabled.push(word);
        levels[word] = prio && ['high','medium','low'].includes(prio.dataset.prio) ? prio.dataset.prio : 'medium';
    });
    const openKeys = new Set([...list.querySelectorAll('.cd-word-group[open] .cd-word-group-name')].map(el => el.childNodes[0] ? el.childNodes[0].textContent.trim() : el.textContent.trim()));
    list.innerHTML = cdWordListHtml(words, disabled, levels, [...(modal._cdCustomWords || [])], modal._cdCustomReasons || {});
    list.querySelectorAll('.cd-word-group').forEach(group => {
        const name = group.querySelector('.cd-word-group-name');
        const key = name && name.childNodes[0] ? name.childNodes[0].textContent.trim() : '';
        if (openKeys.has(key)) group.open = true;
    });
}

// 编辑禁用词：自己的弹窗（词条 + 原因），不用系统 prompt
function openCdWordEdit(modal, row) {
    const label = row.querySelector('.cd-word-text');
    const oldWord = label.textContent.trim();
    const oldReason = (modal._cdCustomReasons && modal._cdCustomReasons[oldWord]) || '';
    const prev = document.getElementById('cdWordEdit'); if (prev) prev.remove();
    const box = document.createElement('div');
    box.id = 'cdWordEdit'; box.className = 'cd-edit-overlay';
    box.innerHTML = `<div class="cd-edit-card" role="dialog" aria-modal="true" aria-label="编辑禁用词">
        <div class="cd-edit-title">编辑禁用词</div>
        <label class="cd-edit-label">词条<input class="cd-edit-input" id="cdEditWord" maxlength="40" value="${escapeHtml(oldWord)}"></label>
        <label class="cd-edit-label">原因（可不写）<input class="cd-edit-input" id="cdEditReason" maxlength="80" placeholder="例如：太戏剧化，不像真人说话" value="${escapeHtml(oldReason)}"></label>
        <div class="cd-edit-actions"><button type="button" class="cd-edit-cancel">取消</button><button type="button" class="cd-edit-save">保存</button></div>
    </div>`;
    document.body.appendChild(box);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-visible')));
    const close = () => { box.classList.remove('is-visible'); setTimeout(() => box.remove(), 200); };
    box.querySelector('.cd-edit-cancel').onclick = close;
    box.addEventListener('click', e => { if (e.target === box) close(); });
    box.querySelector('.cd-edit-save').onclick = () => {
        const word = box.querySelector('#cdEditWord').value.trim();
        const reason = box.querySelector('#cdEditReason').value.trim();
        if (!word) { toast('词条不能为空'); return; }
        const dup = [...modal.querySelectorAll('.cd-word-text')].some(el => el !== label && el.textContent.trim() === word);
        if (dup) { toast('这个词条已经存在'); return; }
        label.textContent = word;
        if (modal._cdCustomWords && modal._cdCustomWords.has(oldWord)) { modal._cdCustomWords.delete(oldWord); modal._cdCustomWords.add(word); }
        if (!modal._cdCustomReasons) modal._cdCustomReasons = {};
        delete modal._cdCustomReasons[oldWord];
        if (reason) modal._cdCustomReasons[word] = reason;
        rebuildCdWordGroups(modal);
        close();
    };
}
/* ===== 防油腻：平底锅弹窗（开关 = 本联系人的防油腻状态） ===== */
/* ===== 防油腻：平底锅（界面和脚本都在这里，样式在 messages.css 的 #gpPanOverlay 里） ===== */
const GP_MARKUP = `


  <div class="wrap" id="gp-wrap" role="dialog" aria-modal="true" aria-label="防油腻">
    <div class="pan">
      <svg viewBox="0 0 480 320" aria-hidden="true">
        <defs>
          <linearGradient id="gp-rimG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#4a4a4d"/><stop offset="18%" stop-color="#1b1b1d"/>
            <stop offset="50%" stop-color="#050506"/><stop offset="82%" stop-color="#1e1e21"/>
            <stop offset="100%" stop-color="#3b3b3f"/>
          </linearGradient>
          <radialGradient id="gp-faceG" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stop-color="#2a2a2d"/><stop offset="60%" stop-color="#121214"/>
            <stop offset="100%" stop-color="#070708"/>
          </radialGradient>
          <linearGradient id="gp-handleG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a3a3e"/><stop offset="45%" stop-color="#0c0c0e"/>
            <stop offset="100%" stop-color="#1f1f23"/>
          </linearGradient>
          <linearGradient id="gp-glassG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#2b2f33"/><stop offset="35%" stop-color="#5b6168"/>
            <stop offset="60%" stop-color="#3a3f45"/><stop offset="100%" stop-color="#1c2024"/>
          </linearGradient>
          <linearGradient id="gp-oilG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e9c46a"/><stop offset="100%" stop-color="#b9862c"/>
          </linearGradient>
          <linearGradient id="gp-sauceG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".22"/><stop offset="45%" stop-color="#fff" stop-opacity="0"/>
            <stop offset="100%" stop-color="#3a1d0c" stop-opacity=".18"/>
          </linearGradient>
          <clipPath id="gp-faceClip"><circle cx="170" cy="160" r="124"/></clipPath>
          <filter id="gp-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".3"/>
          </filter>
          
<radialGradient id="gp-gCab" cx="40%" cy="35%" r="70%"><stop offset="0%" stop-color="#e4f7c2"/><stop offset="55%" stop-color="#8cc66b"/><stop offset="100%" stop-color="#4b8a3a"/></radialGradient>
<radialGradient id="gp-gMeat" cx="40%" cy="35%" r="75%"><stop offset="0%" stop-color="#f7aa98"/><stop offset="60%" stop-color="#c85a50"/><stop offset="100%" stop-color="#8a2e2a"/></radialGradient>
<radialGradient id="gp-gCarrot" cx="45%" cy="40%" r="65%"><stop offset="0%" stop-color="#ffc27a"/><stop offset="70%" stop-color="#f08a2e"/><stop offset="100%" stop-color="#b65a1c"/></radialGradient>
<radialGradient id="gp-gMush" cx="45%" cy="40%" r="65%"><stop offset="0%" stop-color="#9a7049"/><stop offset="70%" stop-color="#5e4026"/><stop offset="100%" stop-color="#3b2716"/></radialGradient>
<radialGradient id="gp-gEgg" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="#ffffff"/><stop offset="80%" stop-color="#f3efe6"/><stop offset="100%" stop-color="#d6cfc0"/></radialGradient>
<radialGradient id="gp-gYolk" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#fff2a6"/><stop offset="60%" stop-color="#ffc83a"/><stop offset="100%" stop-color="#e08c12"/></radialGradient>
<filter id="gp-pieceShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".45"/></filter>

        </defs>

        <!-- 把手 -->
        <g filter="url(#gp-shadow)">
          <rect x="292" y="146" width="150" height="28" rx="14" fill="url(#gp-handleG)"/>
          <circle cx="428" cy="160" r="6" fill="#050506" stroke="rgba(255,255,255,.12)"/>
          <circle cx="318" cy="160" r="3" fill="#2d2d31"/><circle cx="344" cy="160" r="3" fill="#2d2d31"/>
        </g>

        <!-- 锅身 -->
        <g class="pan-body" id="gp-panBody">
          <g filter="url(#gp-shadow)">
            <circle cx="170" cy="160" r="150" fill="url(#gp-rimG)"/>
            <circle cx="170" cy="160" r="138" fill="#0a0a0b"/>
            <circle cx="170" cy="160" r="126" fill="url(#gp-faceG)"/>
          </g>
          <g fill="none" stroke="rgba(255,255,255,.035)" stroke-width="1">
            <circle cx="170" cy="160" r="112"/><circle cx="170" cy="160" r="98"/>
            <circle cx="170" cy="160" r="84"/><circle cx="170" cy="160" r="70"/>
          </g>
          <path d="M 52 110 A 128 128 0 0 1 150 33" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="3" stroke-linecap="round"/>

          <!-- 菜：铺满锅面（clip 到锅面圆内） -->
          <g>
            <g id="gp-food"></g>
            <circle cx="170" cy="160" r="126" fill="url(#gp-sauceG)" id="gp-sheen" opacity="0"/>
          </g>
        </g>

        <!-- 锅铲：往右移、加大一点；按下时在锅面上扫一遍 -->
        <g class="spatula" id="gp-spatula" transform="translate(200,334) rotate(-22)">
          <rect x="-30" y="-36" width="200" height="72" fill="transparent"/>
          <g class="spatula-sweep" id="gp-spatulaSweep">
            <g transform="scale(1.12)">
              <g class="spatula-in" id="gp-spatulaIn">
                <rect x="14" y="-4" width="106" height="8" rx="4" fill="#2a2a2e"/>
                <!-- 蝴蝶结（图片）。位置、翻转、角度都在上面 CSS 的 .bow-wrap 里改 -->
                <g class="bow-wrap">
                  <image class="bow-img" href="assets/杂七杂八/锅铲蝴蝶结.png" x="-30" y="-30" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>
                </g>
                <rect x="-19" y="-16" width="38" height="32" rx="7" fill="url(#gp-rimG)"/>
                <rect x="-13" y="-10" width="26" height="20" rx="4" fill="#15151a"/>
                <g fill="#0a0a0c"><rect x="-10" y="-6" width="3" height="12" rx="1.5"/><rect x="-3" y="-6" width="3" height="12" rx="1.5"/><rect x="4" y="-6" width="3" height="12" rx="1.5"/></g>
              </g>
            </g>
          </g>
        </g>

        <!-- 油壶：每个条目一只，位置固定 -->
        <g id="gp-bottles" filter="url(#gp-shadow)"></g>
        <text id="gp-moreBadge" x="470" y="164" font-size="12" fill="rgba(255,255,255,.75)" text-anchor="end"></text>
        <g class="rack-arrow" id="gp-rackArrow" transform="translate(376,340)">
          <rect x="-22" y="-14" width="56" height="30" rx="8" fill="transparent"/>
          <path d="M-8,-4 L6,8 L20,-4" fill="none" stroke="#f4f4f4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="30" y="4" text-anchor="start" font-size="11" fill="rgba(255,255,255,.8)" id="gp-rackCount">0</text>
        </g>
      </svg>
    </div>

    <div class="face">
      <div class="head">
        <div class="kicker">Anti Greasy</div>
        <div class="title">防油腻</div>
        <div class="rule">不用<b>过度油腻称呼</b>，<br>比如「小丫头」「小没良心的」<br>「小野猫」。</div>
      </div>
      <div class="caps" id="gp-caps"></div>
      <div class="switch-row"><span>启用</span><button class="switch" id="gp-sw" role="switch" aria-checked="true" aria-label="启用防油腻"></button></div>
      <button class="done-btn" id="gp-doneBtn" type="button">完成</button>
    </div>
    </div>
  
</div>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="gp-shelfG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".42"/><stop offset="45%" stop-color="#ffffff" stop-opacity=".12"/><stop offset="100%" stop-color="#000000" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="gp-dividerG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f4f4f4" stop-opacity="0"/><stop offset="50%" stop-color="#f4f4f4" stop-opacity=".9"/><stop offset="100%" stop-color="#f4f4f4" stop-opacity="0"/>
    </linearGradient>
  </defs>
</svg>
<div class="mgr-overlay" id="gp-mgrOverlay">
  <div class="mgr-card" role="dialog" aria-modal="true" aria-label="油瓶管理">
    <div class="mgr-spot"></div>
    <svg class="mgr-corner tl" viewBox="0 0 22 22" aria-hidden="true"><path d="M1,9 L1,1 L9,1" fill="none" stroke="#f4f4f4" stroke-width="1.4" stroke-linecap="round"/><circle cx="3" cy="3" r="1.2" fill="#f4f4f4"/></svg>
    <svg class="mgr-corner tr" viewBox="0 0 22 22" aria-hidden="true"><path d="M1,9 L1,1 L9,1" fill="none" stroke="#f4f4f4" stroke-width="1.4" stroke-linecap="round"/><circle cx="3" cy="3" r="1.2" fill="#f4f4f4"/></svg>
    <svg class="mgr-corner bl" viewBox="0 0 22 22" aria-hidden="true"><path d="M1,9 L1,1 L9,1" fill="none" stroke="#f4f4f4" stroke-width="1.4" stroke-linecap="round"/><circle cx="3" cy="3" r="1.2" fill="#f4f4f4"/></svg>
    <svg class="mgr-corner br" viewBox="0 0 22 22" aria-hidden="true"><path d="M1,9 L1,1 L9,1" fill="none" stroke="#f4f4f4" stroke-width="1.4" stroke-linecap="round"/><circle cx="3" cy="3" r="1.2" fill="#f4f4f4"/></svg>
    <div class="mgr-head"><span class="mgr-title" aria-label="油瓶管理"><span class="ch" style="font-size:27px;transform:rotate(-7deg) translateY(-3px);color:#0b0b0d">油</span><span class="ch" style="font-size:20px;transform:rotate(6deg) translateY(4px);color:#4a4a52">瓶</span><span class="ch" style="font-size:29px;transform:rotate(-3deg) translateY(-1px);color:#131316">管</span><span class="ch" style="font-size:21px;transform:rotate(8deg) translateY(3px);color:#5a5a62">理</span><svg class="ul" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q18,2 34,5.5 T66,4.5 T98,6 T118,4" fill="none" stroke="#1a1a1e" stroke-width="2.6" stroke-linecap="round"/><path d="M10,8.5 Q40,6.5 70,8 T112,7.5" fill="none" stroke="#1a1a1e" stroke-width="1.1" stroke-linecap="round" opacity=".6"/></svg></span><span class="mgr-count" id="gp-mgrCount"></span></div>
    <svg class="mgr-divider" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="6" x2="300" y2="6" stroke="url(#gp-dividerG)" stroke-width="1"/><path d="M150,1 L155,6 L150,11 L145,6 Z" fill="#f4f4f4" opacity=".9"/></svg>
    <div class="mgr-list" id="gp-mgrList"></div>
    <button class="mgr-close" id="gp-mgrClose" type="button">完成</button>
  </div>
</div>

<div class="edit-overlay" id="gp-editOverlay">
  <div class="edit-card" role="dialog" aria-modal="true" aria-label="编辑条目">
    <div class="edit-title">编辑条目</div>
    <label class="edit-label">内容<input class="edit-input" id="gp-editInput" maxlength="40"></label>
    <div class="edit-actions">
      <button class="del" id="gp-editDel" type="button">删除</button>
      <button id="gp-editCancel" type="button">取消</button>
      <button class="save" id="gp-editSave" type="button">保存</button>
    </div>
  </div>
</div>

`;

// 平底锅音效：assets/音效/ 下的两段 wav，按需播放几秒钟
const GP_SFX = {
  clatter: 'assets/音效/锅铲叮当声.wav',       // 锅铲按下
  sizzle:  'assets/音效/烧油滋滋声.wav',       // 开始炒菜 / 菜做好
  oil:     'assets/音效/撒油声.wav'            // 删除条目撒油
};
function gpPlaySfx(src, seconds) {
  try {
    const a = new Audio(src);
    a.volume = 0.3;                             // 音量减半
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    setTimeout(() => { a.pause(); a.currentTime = 0; }, seconds * 1000);
  } catch (_) {}
}

function buildGreasyPan(root, opts) {
  const gp$ = id => root.querySelector('#gp-' + id);

  // 防油腻里的那几句话：一开始用这几句，之后的条目是新条目（可以再改）
  const PRESETS = ['语气自然不油腻', '不用过度亲昵的称呼', '不要暧昧措辞', '请把user视为独立的人类', '不要刻意矮化，幼化user', '避免小丫头、小没良心的、小野猫'];
  const CAP_ROUND = 6;    // 第 1 轮：六个胶囊
  const DISH_ROUND = 6;   // 第 2 轮：每个条目加一步食材，六步铺满锅
  const BOTTLE_MAX = 9;

  // 食材（细节版）
  const PIECE_SVG = {"cabbage": "<path d=\"M-48,-10 C-52,-40 -26,-54 0,-50 C24,-54 50,-38 50,-8 C54,18 38,46 10,50 C-16,54 -46,42 -48,14 C-49,4 -48,-2 -48,-10 Z\" fill=\"url(#gp-gCab)\" stroke=\"#5f9a4a\" stroke-width=\"1.5\"/>\n<path d=\"M-40,2 C-22,-8 -4,-4 12,-12 C24,-16 38,-10 44,-2\" fill=\"none\" stroke=\"#f1f9e0\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".85\"/>\n<path d=\"M-22,-34 C-16,-14 -20,8 -12,34\" fill=\"none\" stroke=\"#c8e8a2\" stroke-width=\"1.6\" opacity=\".75\"/>\n<path d=\"M12,-40 C16,-18 10,6 18,40\" fill=\"none\" stroke=\"#c8e8a2\" stroke-width=\"1.6\" opacity=\".75\"/>\n<path d=\"M-26,22 C-10,26 6,24 28,30\" fill=\"none\" stroke=\"#a6d37f\" stroke-width=\"1.2\" opacity=\".6\"/>\n<path d=\"M-44,-18 C-40,-30 -30,-36 -20,-38\" fill=\"none\" stroke=\"#e4f5cc\" stroke-width=\"2\" opacity=\".5\"/>", "meat": "<path d=\"M-44,-18 C-42,-44 -6,-48 18,-42 C42,-36 48,-8 44,14 C40,40 10,46 -12,42 C-36,40 -46,14 -44,-18 Z\" fill=\"url(#gp-gMeat)\" stroke=\"#7d2a26\" stroke-width=\"1.5\"/>\n<path d=\"M-30,-6 C-18,-14 -6,-4 6,-12 C18,-20 30,-10 40,-2\" fill=\"none\" stroke=\"#fff3ea\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".85\"/>\n<path d=\"M-28,16 C-12,10 4,20 18,12 C28,8 36,14 42,20\" fill=\"none\" stroke=\"#fbe2d6\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\".75\"/>\n<path d=\"M-6,-34 C2,-22 -2,-10 6,2\" fill=\"none\" stroke=\"#fbe2d6\" stroke-width=\"1.5\" opacity=\".5\"/>\n<ellipse cx=\"-14\" cy=\"-26\" rx=\"10\" ry=\"4\" fill=\"#fff\" opacity=\".2\"/>", "carrot": "<circle r=\"42\" fill=\"url(#gp-gCarrot)\" stroke=\"#b5561a\" stroke-width=\"1.5\"/>\n<circle r=\"30\" fill=\"none\" stroke=\"#ffd29a\" stroke-width=\"2\" opacity=\".5\"/>\n<circle r=\"18\" fill=\"none\" stroke=\"#ffb36b\" stroke-width=\"2\" opacity=\".5\"/>\n<circle r=\"7\" fill=\"#fff0d0\" opacity=\".7\"/>\n<ellipse cx=\"-14\" cy=\"-18\" rx=\"9\" ry=\"3.5\" fill=\"#fff\" opacity=\".2\"/>", "mushroom": "<path d=\"M-10,10 C-12,24 -10,38 -6,44 C-3,48 3,48 6,44 C10,38 12,24 10,10 Z\" fill=\"#efe3cc\" stroke=\"#c4aa80\" stroke-width=\"1.2\"/>\n<path d=\"M-42,-6 C-46,-36 -22,-48 0,-46 C24,-46 46,-34 44,-4 C44,8 38,14 26,14 C12,16 -12,16 -26,14 C-38,12 -42,4 -42,-6 Z\" fill=\"url(#gp-gMush)\" stroke=\"#3b2716\" stroke-width=\"1.4\"/>\n<path d=\"M-26,14 C-14,22 14,22 26,14\" fill=\"none\" stroke=\"#cdb08a\" stroke-width=\"2\"/>\n<g stroke=\"#d2b78e\" stroke-width=\"1\" opacity=\".6\"><path d=\"M-20,14 L-17.0,23\" /><path d=\"M-14,14 L-11.9,23\" /><path d=\"M-8,14 L-6.8,23\" /><path d=\"M-2,14 L-1.7,23\" /><path d=\"M4,14 L3.4,23\" /><path d=\"M10,14 L8.5,23\" /><path d=\"M16,14 L13.6,23\" /><path d=\"M22,14 L18.7,23\" /></g>\n<path d=\"M-26,-22 C-18,-34 0,-38 14,-34\" fill=\"none\" stroke=\"#e8d6b8\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".35\"/>\n<path d=\"M-22,-4 C-14,-12 -4,-10 4,-18\" fill=\"none\" stroke=\"#2a1a0c\" stroke-width=\"1\" opacity=\".3\"/>", "egg": "<path d=\"M-46,4 C-48,-30 -20,-46 6,-42 C34,-38 50,-18 46,10 C42,40 14,46 -10,40 C-34,36 -45,26 -46,4 Z\" fill=\"url(#gp-gEgg)\" stroke=\"#d8cfbf\" stroke-width=\"1\"/>\n<circle cx=\"4\" cy=\"-2\" r=\"20\" fill=\"url(#gp-gYolk)\"/>\n<ellipse cx=\"-2\" cy=\"-8\" rx=\"7\" ry=\"4\" fill=\"#fff\" opacity=\".55\"/>", "onion": "<circle r=\"44\" fill=\"#f4efe4\" stroke=\"#cfc4ae\" stroke-width=\"1.5\"/><circle r=\"34\" fill=\"none\" stroke=\"#e7dccb\" stroke-width=\"2\"/><circle r=\"22\" fill=\"none\" stroke=\"#d6c9ae\" stroke-width=\"2\"/><circle r=\"10\" fill=\"none\" stroke=\"#c9b898\" stroke-width=\"1.5\"/><ellipse cx=\"-14\" cy=\"-18\" rx=\"10\" ry=\"4\" fill=\"#fff\" opacity=\".5\"/>"};
  const STEP_TYPES = ["cabbage", "meat", "carrot", "mushroom", "egg", "onion"];
  const STEP_POS = {"cabbage": [{"x": 112, "y": 132, "r": -18, "s": 1.45}, {"x": 226, "y": 126, "r": 22, "s": 1.4}, {"x": 170, "y": 192, "r": 6, "s": 1.35}, {"x": 176, "y": 104, "r": -8, "s": 1.3}], "meat": [{"x": 150, "y": 140, "r": 20, "s": 0.8}, {"x": 200, "y": 150, "r": -30, "s": 0.77}, {"x": 125, "y": 175, "r": 44, "s": 0.8}, {"x": 215, "y": 185, "r": 12, "s": 0.77}, {"x": 176, "y": 222, "r": -8, "s": 0.72}], "carrot": [{"x": 105, "y": 160, "r": 0, "s": 0.56}, {"x": 180, "y": 118, "r": 0, "s": 0.56}, {"x": 245, "y": 160, "r": 0, "s": 0.6}, {"x": 140, "y": 235, "r": 0, "s": 0.56}, {"x": 205, "y": 215, "r": 0, "s": 0.52}], "mushroom": [{"x": 105, "y": 128, "r": -18, "s": 0.84}, {"x": 230, "y": 200, "r": 24, "s": 0.8}], "egg": [{"x": 170, "y": 162, "r": 0, "s": 1.25}], "onion": [{"x": 170, "y": 98, "r": 60, "s": 1.04}]};
  const STEP_ORDER = ["cabbage", "meat", "carrot", "mushroom", "egg", "onion"];

  let uid = 0;
  let entries = [];       // {id, text}，每个条目一只油壶，永远保留
  let mode = 'cap';       // 'cap' 胶囊轮 / 'dish' 食材轮
  let capIds = [];
  let dishCount = 0;      // 食材轮加了几样
  let served = false;     // 这一轮菜做好了，留在锅里，下一个条目来才清掉
  let editingId = null;
  let presetIdx = 0;      // 下一个用哪句预设

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function byId(id) { return entries.find(e => e.id === id); }

  // ---- 油壶 ----
  function bottleSlot(k) { const col = k % 3, row = Math.floor(k / 3); return { x: 362 + col * 38, y: 280 - row * 54 }; }
  function bottleSVG(e, k, num, fade) {
    const { x, y } = bottleSlot(k);
    return `<g class="bottle${fade ? ' fade-top' : ''}" data-id="${e.id}" transform="translate(${x},${y})"><title>${escapeHtml(e.text)}</title>
      <rect x="0" y="8" width="28" height="38" rx="9" fill="url(#gp-glassG)" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
      <rect x="4" y="22" width="20" height="20" rx="6" fill="url(#gp-oilG)" opacity=".9"/>
      <text x="14" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="#3a2a10">${num}</text>
      <rect x="9" y="2" width="10" height="8" rx="2.5" fill="#3a3f45"/>
      <rect x="7" y="0" width="14" height="4" rx="2" fill="#15181b"/>
      <rect x="4" y="12" width="4" height="16" rx="2" fill="rgba(255,255,255,.22)"/>
    </g>`;
  }
  function renderBottles() {
    // 位置固定，第 1 只一直在第 1 个位置；满了（九只）以后，最上面一排渐变消失
    const shown = entries.slice(0, BOTTLE_MAX);
    const full = shown.length >= BOTTLE_MAX;
    gp$('bottles').innerHTML = shown.map((e, k) =>
      bottleSVG(e, k, entries.indexOf(e) + 1, full && k >= 6)).join('');
    const more = entries.length - shown.length;
    gp$('moreBadge').textContent = more > 0 ? `+${more}` : '';
    gp$('rackCount').textContent = entries.length;
  }

  // ---- 胶囊 ----
  function renderCaps() {
    const box = gp$('caps');
    if (mode !== 'cap' || !capIds.length) { box.innerHTML = ''; box.classList.remove('has'); return; }
    box.classList.add('has');
    box.innerHTML = capIds.map(id => {
      const e = byId(id);
      return `<button class="cap" data-id="${e.id}" title="${escapeHtml(e.text)}">${escapeHtml(e.text)}</button>`;
    }).join('');
  }

  // ---- 食材：一步一样，一步可以是几块，铺满锅并溢出锅沿 ----
  function renderFood(newIndex) {
    const g = gp$('food');
    const showing = mode === 'dish' ? dishCount : (served ? DISH_ROUND : 0);
    let html = '';
    for (let i = 0; i < showing; i++) {
      const type = STEP_TYPES[i];
      const drop = (i === newIndex) ? 'drop-in' : '';
      for (const p of STEP_POS[type]) {
        html += `<g transform="translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s})" filter="url(#gp-pieceShadow)"><g class="${drop}">${PIECE_SVG[type]}</g></g>`;
      }
    }
    g.innerHTML = html;
    const fxOld = gp$('oilFx'); if (fxOld) fxOld.remove();
    gp$('sheen').setAttribute('opacity', showing ? '1' : '0');
    gp$('wrap').classList.toggle('food', showing > 0);
  }

  function refresh(newIndex) { renderCaps(); renderFood(newIndex); renderBottles(); postState(); }

  function postState() {
    if (!opts.onChange) return;
    opts.onChange({ entries: entries.map(e => ({ id: e.id, text: e.text })), enabled: sw.getAttribute('aria-checked') === 'true' });
  }

  // ---- 加条目（锅铲）：一开始锅是空的，要自己点 ----
  const panBody = gp$('panBody');
  function shakePan() {
    panBody.classList.remove('shake'); void panBody.offsetWidth; panBody.classList.add('shake');
    gpPlaySfx(GP_SFX.sizzle, 3);                 // 炒菜：滋滋声 3 秒
  }

  function nextText() {
    if (presetIdx < PRESETS.length) return PRESETS[presetIdx++];
    return '新条目 ' + (entries.length + 1);
  }

  function addEntry() {
    if (served) { served = false; dishCount = 0; }     // 上一轮的菜被端走
    const e = { id: ++uid, text: nextText() };
    entries.push(e);

    let newIndex = -1;
    if (mode === 'cap') {
      if (capIds.length < CAP_ROUND) {
        capIds.push(e.id);
      } else {                                           // 六个满了，这个进来 → 胶囊刷新，进入食材轮
        capIds = [];
        mode = 'dish'; dishCount = 1; newIndex = 0;
        shakePan();
      }
    } else {
      newIndex = dishCount;
      dishCount++;                                       // 一个条目 = 一样食材
      if (dishCount === DISH_ROUND) { mode = 'cap'; served = true; shakePan(); }
    }
    refresh(newIndex);
  }
  const spInner = gp$('spatulaIn');
  const spSweep = gp$('spatulaSweep');
  gp$('spatula').addEventListener('pointerdown', e => {
    e.preventDefault();
    spSweep.classList.remove('sweep'); spSweep.getBoundingClientRect();
    spSweep.classList.add('sweep');
    gpPlaySfx(GP_SFX.clatter, 1.5);              // 锅铲：叮当 1.5 秒
    addEntry();
  });
  spSweep.addEventListener('animationend', () => spSweep.classList.remove('sweep'));
  spInner.addEventListener('animationend', () => spInner.classList.remove('hit'));


  // ---- 删除条目：菜上面撒一层薄薄的黄油，白色颗粒闪动 ----
  const SVGNS = 'http://www.w3.org/2000/svg';
  function oilSplash() {
    gpPlaySfx(GP_SFX.oil, 1.6);                  // 撒油：噼啪 1.6 秒
    const body = gp$('panBody');
    const old = gp$('oilFx'); if (old) old.remove();
    const fx = document.createElementNS(SVGNS, 'g'); fx.id = 'gp-oilFx';
    const film = document.createElementNS(SVGNS, 'circle');
    film.setAttribute('cx', 170); film.setAttribute('cy', 160); film.setAttribute('r', 126);
    film.setAttribute('fill', 'rgba(255,206,64,.24)'); film.setAttribute('class', 'oil-film');
    fx.appendChild(film);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 110;
      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('cx', (170 + Math.cos(a) * d).toFixed(1));
      dot.setAttribute('cy', (160 + Math.sin(a) * d).toFixed(1));
      dot.setAttribute('r', (1.2 + Math.random() * 1.6).toFixed(1));
      dot.setAttribute('fill', '#ffffff');
      dot.setAttribute('class', 'spark');
      dot.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      fx.appendChild(dot);
    }
    body.appendChild(fx);
  }

  // ---- 油瓶管理：点箭头打开，列出所有条目，可以改或删 ----
  const mgrOverlay = gp$('mgrOverlay');
  function bottleIcon(num) {
    return `<svg viewBox="0 0 40 56" aria-hidden="true">
      <ellipse cx="20" cy="54" rx="15" ry="2.2" fill="rgba(0,0,0,.55)"/>
      <rect x="6" y="14" width="28" height="38" rx="9" fill="url(#gp-glassG)" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
      <rect x="10" y="28" width="20" height="20" rx="6" fill="url(#gp-oilG)" opacity=".9"/>
      <text x="20" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="#3a2a10">${num}</text>
      <rect x="15" y="6" width="10" height="8" rx="2.5" fill="#3a3f45"/>
      <rect x="13" y="3" width="14" height="4" rx="2" fill="#15181b"/>
      <rect x="9" y="19" width="4" height="16" rx="2" fill="rgba(255,255,255,.3)"/>
      <path d="M26,18 Q30,30 26,44" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>
    </svg>`;
  }
  const SHELF_SVG = '<svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="4" width="300" height="7" rx="2" fill="url(#gp-shelfG)"/><rect x="0" y="11" width="300" height="3" fill="rgba(0,0,0,.6)"/><line x1="8" y1="5.5" x2="292" y2="5.5" stroke="rgba(255,255,255,.55)" stroke-width="1"/></svg>';
  function renderMgr() {
    closeMgrPop();
    gp$('mgrCount').textContent = '共 ' + entries.length + ' 条';
    if (!entries.length) {
      gp$('mgrList').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,.6);font-size:13px;padding:24px 0;">还没有条目</div>';
      return;
    }
    let html = '';
    entries.forEach((e, i) => {
      html += `<button class="mgr-bottle" data-id="${e.id}" type="button" aria-label="第 ${i + 1} 条">${bottleIcon(i + 1)}</button>`;
      if ((i + 1) % 4 === 0 || i === entries.length - 1) html += `<div class="mgr-shelf">${SHELF_SVG}</div>`;
    });
    gp$('mgrList').innerHTML = html;
  }
  // 点油壶：条目浮在最上面（不挤开其它油壶）
  let mgrPop = null;
  function closeMgrPop() {
    if (mgrPop) { mgrPop.remove(); mgrPop = null; }
    root.querySelectorAll('#gp-mgrList .mgr-bottle.active').forEach(b => b.classList.remove('active'));
  }
  function openMgrPop(bottleEl, id) {
    closeMgrPop();
    const e = byId(id); if (!e) return;
    const idx = entries.indexOf(e) + 1;
    const pop = document.createElement('div');
    pop.className = 'mgr-pop';
    pop.innerHTML = `<div class="mgr-pop-bubble"><span class="mgr-pop-num">第 ${idx} 条</span><button class="mgr-pop-text" type="button" title="${escapeHtml(e.text)}">${escapeHtml(e.text)}</button></div><button class="mgr-pop-del" type="button">删除</button>`;
    root.appendChild(pop);
    // 浮层出现在油瓶的右边（右边放不下才放到左边），箭头指向油瓶
    const r = bottleEl.getBoundingClientRect();
    const bubble = pop.querySelector('.mgr-pop-bubble');
    // 浮层始终放在油瓶右边：宽度按右边剩余的空间来限制，超出的文字用省略号
    const rightSpace = window.innerWidth - r.right - 20;
    let side = 'pos-right';
    bubble.style.maxWidth = Math.max(160, Math.min(240, rightSpace)) + 'px';
    const pw = bubble.offsetWidth, ph = bubble.offsetHeight;
    let left = r.right + 12;
    if (rightSpace < 160) { side = 'pos-left'; left = r.left - pw - 12; }
    let top = r.top + r.height / 2 - ph / 2;
    top = Math.max(8, Math.min(window.innerHeight - ph - 60, top));
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = top + 'px';
    pop.classList.add(side);
    pop.querySelector('.mgr-pop-text').addEventListener('click', () => { closeMgrPop(); openEdit(id); });
    pop.querySelector('.mgr-pop-del').addEventListener('click', () => {
      entries = entries.filter(x => x.id !== id);
      capIds = capIds.filter(x => x !== id);
      closeMgrPop(); refresh(-1); renderMgr(); oilSplash();
    });
    mgrPop = pop;
    bottleEl.classList.add('active');
  }
  gp$('rackArrow').addEventListener('click', () => { renderMgr(); mgrOverlay.classList.add('show'); });
  gp$('mgrClose').addEventListener('click', () => { closeMgrPop(); mgrOverlay.classList.remove('show'); });
  mgrOverlay.addEventListener('click', ev => { if (ev.target === mgrOverlay) { closeMgrPop(); mgrOverlay.classList.remove('show'); } });
  gp$('mgrList').addEventListener('click', ev => {
    const bottle = ev.target.closest('.mgr-bottle[data-id]');
    if (bottle) openMgrPop(bottle, Number(bottle.dataset.id));
  });
  root.addEventListener('pointerdown', ev => {
    if (mgrPop && !ev.target.closest('.mgr-pop') && !ev.target.closest('.mgr-bottle')) closeMgrPop();
  });

  // ---- 编辑：胶囊和油瓶都能点开 ----
  const editOverlay = gp$('editOverlay');
  const editInput = gp$('editInput');
  function openEdit(id) {
    const e = byId(id); if (!e) return;
    editingId = id; editInput.value = e.text;
    editOverlay.classList.add('show');
  }
  function closeEdit() { editOverlay.classList.remove('show'); editingId = null; }
  gp$('editCancel').addEventListener('click', closeEdit);
  editOverlay.addEventListener('click', ev => { if (ev.target === editOverlay) closeEdit(); });
  gp$('editSave').addEventListener('click', () => {
    const e = byId(editingId); const text = editInput.value.trim();
    if (e && text) e.text = text;
    closeEdit(); refresh(-1); renderMgr();
  });
  gp$('editDel').addEventListener('click', () => {
    entries = entries.filter(x => x.id !== editingId);
    capIds = capIds.filter(id => id !== editingId);
    closeEdit(); refresh(-1); renderMgr();
    oilSplash();
  });
  gp$('caps').addEventListener('click', ev => {
    const b = ev.target.closest('[data-id]'); if (b) openEdit(Number(b.dataset.id));
  });
  gp$('bottles').addEventListener('click', ev => {
    const g = ev.target.closest('[data-id]'); if (g) openEdit(Number(g.dataset.id));
  });

  // ---- 弹窗开关 ----
  const sw = gp$('sw');
  gp$('doneBtn').addEventListener('click', () => opts.onClose());
  sw.addEventListener('click', () => { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); postState(); });

  // ---- 打开时：载入这个联系人的条目和开关 ----
  entries = (opts.entries || []).map(e => ({ id: Number(e.id), text: String(e.text || '') }));
  uid = entries.reduce((m, e) => Math.max(m, e.id), 0);
  presetIdx = Math.min(entries.length, PRESETS.length);
  sw.setAttribute('aria-checked', String(!!opts.enabled));
  refresh(-1);   // 一开始锅是空的，要自己点锅铲

}

function openGreasyPanPopup() {
    const c = curMemContact(); if (!c) return;
    const prev = document.getElementById('gpPanOverlay'); if (prev) prev.remove();
    const root = document.createElement('div');
    root.id = 'gpPanOverlay';
    root.innerHTML = GP_MARKUP;
    document.body.appendChild(root);
    buildGreasyPan(root, {
        entries: Array.isArray(c.greasyEntries) ? c.greasyEntries : [],
        enabled: (c.promptOpts || []).includes('greasy'),
        onChange(state) {
            c.greasyEntries = state.entries.map(e => ({ id: Number(e.id), text: String(e.text || '') }));
            const opts = Array.isArray(c.promptOpts) ? c.promptOpts.filter(k => k !== 'greasy') : [];
            c.promptOpts = state.enabled ? opts.concat('greasy') : opts;
            persistContacts();
        },
        onClose() {
            root.classList.remove('show'); renderChatDrop();
            setTimeout(() => root.remove(), 300);
        }
    });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show')));
}

function openChatPromptSettings(k) {
    if (k === 'greasy') { openGreasyPanPopup(); return; }
    if (k !== 'ai') { alert('这个选项暂时没有独立设置项。'); return; }
    const old = document.getElementById('cdPromptSettings'); if (old) old.remove();
    const v = readChatPromptSettings();
    const modal = document.createElement('div'); modal.id = 'cdPromptSettings'; modal.className = 'cd-settings-overlay';
    modal.innerHTML = `<section class="cd-settings" role="dialog" aria-modal="true" aria-label="防八股设置">
      <div class="cd-settings-main"><header><div><span class="cd-settings-kicker">CHAT STYLE / 01</span><strong>表达偏好</strong><small>词条优先级决定它们在提示词中的排列位置。</small></div><button class="cd-settings-close" type="button" aria-label="关闭">×</button></header>
      <label class="cd-master"><input id="cdBanEnabled" type="checkbox" ${v.enabled?'checked':''}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.2 3.8 3.7L16 5.8"/></svg><span><b>启用表达偏好</b><small>保留人设特点，优先选择自然、具体的表达</small></span></label>
      <div class="cd-settings-section"><div class="cd-settings-label">表达词条 <span>勾选启用 · 高 / 中 / 低控制提示词位置</span></div><div class="cd-word-list">${cdWordListHtml(v.words,v.disabledWords,v.priorityLevels,v.customWords,v.customReasons)}</div></div>
      <div class="cd-settings-section cd-add-section"><button class="cd-add-custom-trigger" type="button" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>添加自定义词条</span></button><textarea id="cdWordAdd" class="cd-word-add" placeholder="输入表达词条，每行一个；可写成 词条|原因" aria-label="自定义词条，每行一个"></textarea></div>
      <div class="cd-settings-hint"><span class="cd-hint-mark">✳</span><p>优先采用贴合角色性格、情境与说话习惯的具体表达。角色可以保留自己的复杂、强势或阴郁，不强迫角色变得善良或温柔。</p></div>
      </div><footer><button class="cd-settings-reset" type="button">恢复默认</button><button class="cd-settings-save" type="button" aria-label="保存设置" title="保存设置"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg></button></footer>
    </section>`;
    modal._cdCustomWords = new Set(v.customWords || []);
    modal._cdCustomReasons = Object.assign({}, v.customReasons || {});
    document.body.appendChild(modal);
    requestAnimationFrame(()=>requestAnimationFrame(()=>modal.classList.add('is-visible')));
    const close=()=>{modal.classList.remove('is-visible');modal.classList.add('is-leaving');setTimeout(()=>modal.remove(),220);};
    modal.querySelector('.cd-settings-close').onclick=close;
    const addSection=modal.querySelector('.cd-add-section');
    const addTrigger=modal.querySelector('.cd-add-custom-trigger');
    const addInput=modal.querySelector('#cdWordAdd');
    const addLabel=addTrigger.querySelector('span');
    addTrigger.onclick=()=>{
      if(!addSection.classList.contains('is-editing')){
        addSection.classList.add('is-editing');
        addTrigger.setAttribute('aria-expanded','true');
        addTrigger.classList.remove('has-value');
        addLabel.textContent='添加自定义词条';
        return; // 展开输入框但不主动调起系统键盘
      }
      const extra=addInput.value.split(/\n/).map(x=>x.trim()).filter(Boolean);
      if(!extra.length){
        addSection.classList.remove('is-editing');
        addTrigger.setAttribute('aria-expanded','false');
        addTrigger.classList.remove('has-value');
        addLabel.textContent='添加自定义词条';
        return;
      }
      const list=modal.querySelector('.cd-word-list');
      const words=[], disabled=[], levels={};
      list.querySelectorAll('.cd-word-row').forEach(row=>{
        const label=row.querySelector('.cd-word-text');
        const check=row.querySelector('[data-word]');
        const prio=row.querySelector('.cd-prio-pill');
        const word=(label?.textContent||'').trim(); if(!word)return;
        words.push(word); if(check&&!check.checked)disabled.push(word);
        levels[word]=prio&&['high','medium','low'].includes(prio.dataset.prio)?prio.dataset.prio:'medium';
      });
      let added=0;
      extra.map(parseWordLine).forEach(({word,reason})=>{if(!word)return;if(!words.includes(word)){words.push(word);levels[word]='medium';modal._cdCustomWords.add(word);if(reason)modal._cdCustomReasons[word]=reason;added++;}});
      if(!added){toast('这些词条已经存在');return;}
      list.innerHTML=cdWordListHtml(words,disabled,levels,[...modal._cdCustomWords],modal._cdCustomReasons);
      addInput.value='';
      addSection.classList.remove('is-editing');
      addTrigger.setAttribute('aria-expanded','false');
      addTrigger.classList.remove('has-value');
      addLabel.textContent='添加自定义词条';
      toast('自定义词条已添加');
      // 不关闭设置弹窗，顶栏菜单保持打开，可继续编辑后统一保存
    };
    addInput.addEventListener('input',()=>{
      const hasValue=!!addInput.value.trim();
      addTrigger.classList.toggle('has-value',hasValue);
      addLabel.textContent=hasValue?'完成':'添加自定义词条';
      addTrigger.setAttribute('aria-label',hasValue?'完成添加自定义词条':'添加自定义词条');
    });
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('.cd-word-list').addEventListener('click',e=>{
      const row=e.target.closest('.cd-word-row'); if(!row)return;
      const prio=e.target.closest('.cd-prio-pill');
      if(prio){
        const cycle={high:'medium',medium:'low',low:'high'};
        const level=cycle[prio.dataset.prio]||'high';
        prio.dataset.prio=level; prio.className='cd-prio-pill is-'+level;
        prio.textContent={high:'高',medium:'中',low:'低'}[level];
        prio.setAttribute('aria-label','优先级'+prio.textContent+'，点击切换'); return;
      }
      if(e.target.closest('.cd-word-edit')){ openCdWordEdit(modal,row); return; }
      if(e.target.closest('.cd-word-delete')){
        const deletedWord=(row.querySelector('.cd-word-text')?.textContent||'').trim();
        row.remove();
        if(modal._cdCustomWords) modal._cdCustomWords.delete(deletedWord);
        if(modal._cdCustomReasons) delete modal._cdCustomReasons[deletedWord];
        rebuildCdWordGroups(modal);
        return;
      }
    });
    const defaultWords=CHAT_BAN_DEFAULTS.slice();
    modal.querySelector('.cd-settings-reset').onclick=()=>{
      modal.querySelector('#cdBanEnabled').checked=true;
      modal._cdCustomWords = new Set();
      modal._cdCustomReasons = {};
      modal.querySelector('.cd-word-list').innerHTML=cdWordListHtml(defaultWords,[],Object.fromEntries(defaultWords.map(w=>[w,'high'])),[]);
      modal.querySelector('#cdWordAdd').value='';
      modal.querySelector('.cd-add-section').classList.remove('is-editing');
      modal.querySelector('.cd-add-custom-trigger').setAttribute('aria-expanded','false');
    };
    modal.querySelector('.cd-settings-save').onclick=()=>{
      const words=[]; const priorityLevels={}; const disabledWords=[];
      modal.querySelectorAll('.cd-word-row').forEach(row=>{
        const word=row.querySelector('.cd-word-text').textContent.trim(); if(!word)return;
        words.push(word);
        const checked=row.querySelector('[data-word]').checked;
        if(!checked)disabledWords.push(word);
        const active=row.querySelector('.cd-prio-pill');priorityLevels[word]=active?active.dataset.prio:'medium';
      });
      const extra=modal.querySelector('#cdWordAdd').value.split(/\n/).map(x=>x.trim()).filter(Boolean);
      extra.map(parseWordLine).forEach(({word:w,reason})=>{if(!w)return;if(!words.includes(w)){words.push(w);priorityLevels[w]='medium';}if(reason)modal._cdCustomReasons[w]=reason;});
      const customReasons=Object.fromEntries(Object.entries(modal._cdCustomReasons||{}).filter(([w,r])=>words.includes(w)&&r));
      saveChatPromptSettings({enabled:modal.querySelector('#cdBanEnabled').checked,words,priorityLevels,disabledWords,customWords:[...modal._cdCustomWords].filter(w=>words.includes(w)),customReasons,priority:Object.keys(priorityLevels).filter(w=>priorityLevels[w]==='high')});
      close();
    };
}
window.openChatPromptSettings = openChatPromptSettings;
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* 手指在顶栏上滑动：面板跟手拉出 / 收回，松手后吸附到打开或关闭 */
function bindChatDropSwipe() {
    const head = document.querySelector('.messages-app #chatView .chat-head');
    if (!head || head.dataset.swipeBound) return;
    head.dataset.swipeBound = '1';
    let sy = 0, base = false, moved = false, pct = 0, dragging = false;
    head.addEventListener('pointerdown', e => {
        DROP_DRAG_MOVED = false;
        if (e.target.closest && e.target.closest('button')) return;
        const p = chatDropEl(); if (!p) return;
        sy = e.clientY; moved = false; dragging = true;
        base = p.classList.contains('show');
        if (!base) renderChatDrop();
        p.classList.add('dragging');
        if (head.setPointerCapture) { try { head.setPointerCapture(e.pointerId); } catch (_) {} }
    });
    head.addEventListener('pointermove', e => {
        if (!dragging) return;
        const p = chatDropEl(); if (!p) return;
        const dy = e.clientY - sy;
        if (Math.abs(dy) > 6) moved = true;
        if (!moved) return;
        const h = p.offsetHeight || 260;
        pct = base ? 100 + Math.min(0, dy) / h * 100 : Math.max(0, dy) / h * 100;
        pct = Math.max(0, Math.min(100, pct));
        p.style.visibility = 'visible';
        p.style.clipPath = `inset(0 0 ${100 - pct}% 0 round 26px)`;
        p.style.transform = `translateY(${(pct / 100 - 1) * 36}px)`;
        p.style.opacity = String(Math.max(.3, pct / 100));
    });
    const end = () => {
        if (!dragging) return;
        dragging = false;
        const p = chatDropEl(); if (!p) return;
        p.classList.remove('dragging');
        p.style.clipPath = ''; p.style.transform = ''; p.style.opacity = ''; p.style.visibility = '';
        if (!moved) return;
        DROP_DRAG_MOVED = true;
        const open = pct > 45;
        if (open) { const was = p.classList.contains('show'); if (!was) renderChatDrop(); p.classList.add('show'); if (!was) cdSpawnStars(); }
        else p.classList.remove('show');
    };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
}
let CD_OUTSIDE_BOUND = false;
let CD_STARS_NODE = null;
const CD_STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8Z" fill="currentColor"/></svg>';
function cdSpawnStars() {
    const p = chatDropEl(); if (!p) return;
    if (CD_STARS_NODE) CD_STARS_NODE.remove();
    const box = document.createElement('div');
    box.className = 'cd-stars';
    let html = '';
    for (let i = 0; i < 18; i++) {
        const x = 3 + Math.random() * 94, y = 2 + Math.random() * 78;
        const size = 12 + Math.random() * 12, rot = Math.round(Math.random() * 60 - 30);
        const op = (0.5 + Math.random() * 0.4).toFixed(2), dur = (0.7 + Math.random() * 0.5).toFixed(2), delay = (Math.random() * 0.5).toFixed(2);
        html += `<span class="cd-star" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--s:${size.toFixed(1)}px;--rot:${rot}deg;--op:${op};--dur:${dur}s;--delay:${delay}s">${CD_STAR_SVG}</span>`;
    }
    box.innerHTML = html;
    p.appendChild(box);
    CD_STARS_NODE = box;
    setTimeout(() => box.classList.add('landed'), 1900);
}
function bindChatDropOutside() {
    if (CD_OUTSIDE_BOUND) return;
    CD_OUTSIDE_BOUND = true;
    document.addEventListener('pointerdown', e => {
        const p = document.getElementById('chatDrop');
        if (!p || !p.classList.contains('show')) return;
        if (e.target.closest && (e.target.closest('#chatDrop') || e.target.closest('.chat-head') || e.target.closest('#cdPromptSettings') || e.target.closest('#cdWordEdit') || e.target.closest('#gpPanOverlay') || e.target.closest('#gpPanOverlay'))) return;
        p.classList.remove('show');
    });
}
function bindChatDrop() {
    const cap = document.querySelector('.messages-app #chatView .head-capsule');
    if (!cap || cap.dataset.dropBound) return;
    cap.dataset.dropBound = '1';
    cap.addEventListener('click', toggleChatDrop);
}
function renderThread(opts) {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    const box = document.getElementById('thread');
    // 只有本次新增的消息播放进场动画；重绘已有消息时不闪
    const shownCount = (opts && opts.noAnim) || box.dataset.chat !== c.id ? c.msgs.length : Number(box.dataset.count || 0);
    const avo = avOptsOf(c);
    let html = '<div class="day">Today</div>';
    c.msgs.forEach((m, i) => {
        const prev = c.msgs[i - 1], next = c.msgs[i + 1];
        const newGroup = !prev || prev.me !== m.me;
        const lastInGroup = !next || next.me !== m.me;
        const meta = lastInGroup ? `<span class="mt">${esc(m.t)}</span>` : '';
        const showAv = avo.scope === 'all' || newGroup;
        const sp = m.me ? '' : (avo.them && showAv ? `<div style="width:32px;flex-shrink:0"><span class="avf">${avatar(c, 'sm')}</span></div>` : '<div class="sp"></div>');
        const spR = (m.me && avo.me) ? (showAv ? `<div style="width:32px;flex-shrink:0"><span class="avf">${selfAvatarHtml('sm')}</span></div>` : '<div style="width:32px;flex-shrink:0"></div>') : '';
        const pos = newGroup && lastInGroup ? 'g-single' : newGroup ? 'g-head' : lastInGroup ? 'g-tail' : 'g-mid';
        const grp = (pos === 'g-head') ? 'grp-head' : '';
        html += `<div class="mrow ${m.me ? 'me' : ''} ${newGroup && i > 0 ? 'gap' : ''} ${grp} ${i >= shownCount ? 'mrow-new' : ''}" data-i="${i}">${m.me ? spR : sp}<div class="bubble ${pos}">${esc(m.text)}</div>${meta}</div>`;
    });
    box.innerHTML = html;
    box.dataset.chat = c.id;
    box.dataset.count = c.msgs.length;
    box.scrollTop = box.scrollHeight;
    if (MM.mode === 'multi') mmRefreshSel();
}
function showTyping(c) {
    const box = document.getElementById('thread');
    const el = document.createElement('div');
    el.className = 'mrow typing mrow-new'; el.id = 'typingRow';
    el.innerHTML = `<div style="width:32px;flex-shrink:0"><span class="avf">${avatar(c, 'sm')}</span></div><div class="bubble"><span class="dots"><i></i><i></i><i></i></span></div>`;
    box.appendChild(el); box.scrollTop = box.scrollHeight;
}
const MSG_SEP = '|||';
const MAX_BUBBLES = 12;
/* 按 ||| 拆分成多条消息：纯文字分隔，消息内部仍可换行 */
function splitMsgs(text) {
    return String(text || '').split(MSG_SEP).map(x => x.trim()).filter(Boolean).slice(0, MAX_BUBBLES);
}
/* 清理单条消息：去掉名字前缀、动作/旁白（整段括号或星号）、外层引号 */
function cleanMsgPart(t, name) {
    let s = String(t || '').trim();
    if (name) {
        const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        s = s.replace(new RegExp('^' + esc + '\\s*[:：]\\s*'), '').trim();
    }
    if (/^\*\*[\s\S]+\*\*$/.test(s)) s = s.slice(2, -2).trim();   // **加粗** 只去掉星号
    else if (/^\*[\s\S]*\*$/.test(s)) return '';                 // *挥手* 动作描述整段丢弃
    if (/^[（(][\s\S]*[）)]$/.test(s)) return '';              // （笑）
    s = s.replace(/^[“"「『]([\s\S]*)[”"」』]$/, '$1').trim();
    return s;
}
/* ---------------- 聊天软件设置：消息条数 & 一次性发出（保存在本机） ---------------- */
const CHAT_OPTS_KEY = 'forever_messages_chat_opts_v1';
function coClamp(x, lo, hi, d) { const n = parseInt(x, 10); return Number.isFinite(n) ? Math.max(lo, n) : d; }
function loadChatOpts() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAT_OPTS_KEY) || 'null');
        if (v && typeof v === 'object') return { min: coClamp(v.min, 1, 10, 1), max: coClamp(v.max, 1, 10, 4), batch: !!v.batch };
    } catch (_) {}
    return { min: 1, max: 4, batch: false };
}
let CHAT_OPTS = loadChatOpts();
function persistChatOpts() { try { localStorage.setItem(CHAT_OPTS_KEY, JSON.stringify(CHAT_OPTS)); } catch (_) {} }
function openChatCountSheet() {
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span>消息条数</span></div>`
        + `<div class="co-field"><span>最少</span><input id="coMin" type="number" min="1" max="10" value="${CHAT_OPTS.min}"></div>`
        + `<div class="co-field"><span>最多</span><input id="coMax" type="number" min="1" max="10" value="${CHAT_OPTS.max}"></div>`
        + `<div class="co-tip">联系人每次回复的条数会在这个范围内</div>`
        + `<button class="identity-cancel" type="button" onclick="saveChatCount()">保存</button>`
        + `<button class="identity-cancel" type="button" onclick="closeSheet()">取消</button>`);
}
function saveChatCount() {
    const min = coClamp(document.getElementById('coMin').value, 1, 10, 1);
    let max = coClamp(document.getElementById('coMax').value, 1, 10, 4);
    if (max < min) max = min;
    CHAT_OPTS.min = min; CHAT_OPTS.max = max; persistChatOpts();
    closeSheet();
    toast(`已设置为 ${min} 到 ${max} 条`);
    openChatsSettings();
}

/* 每个联系人自己的选项，没设置时用默认值 */
function chatOptsOf(c) {
    const o = (c && c.chatOpts) || {};
    return {
        min: o.min !== undefined ? coClamp(o.min, 1, 10, 1) : CHAT_OPTS.min,
        max: o.max !== undefined ? coClamp(o.max, 1, 10, 4) : CHAT_OPTS.max,
        batch: o.batch !== undefined ? !!o.batch : CHAT_OPTS.batch
    };
}
function setRoomOpt(key, value) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const o = chatOptsOf(c);
    let min = o.min, max = o.max;
    if (key === 'min') min = coClamp(value, 1, 10, min);
    if (key === 'max') max = coClamp(value, 1, 10, max);
    if (max < min) { if (key === 'min') max = min; else min = max; }
    c.chatOpts = { min, max, batch: o.batch };
    persistContacts(); renderRoomPane();
}
function stepRoomOpt(key, delta) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const o = chatOptsOf(c);
    setRoomOpt(key, (key === 'min' ? o.min : o.max) + delta);
}
function toggleRoomBatch() {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const o = chatOptsOf(c);
    c.chatOpts = { min: o.min, max: o.max, batch: !o.batch };
    persistContacts(); renderRoomPane();
}

/* 把联系人的一组消息发出来：一次性发出 = 一起出现、无动画；否则一条一条出现 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function deliverMsgs(c, parts) {
    if (chatOptsOf(c).batch) {
        parts.forEach(t => c.msgs.push({me:false,text:t,t:nowTime(), ts: Date.now()}));
        c.time = nowTime(); persistContacts();
        if (activeId === c.id) renderThread({noAnim:true});
        renderChats();
        return;
    }
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) await sleep(650);
        c.msgs.push({me:false,text:parts[i],t:nowTime(), ts: Date.now()});
        c.time = nowTime(); persistContacts();
        if (activeId === c.id) renderThread();
        renderChats();
    }
}

let pullTimer = null;
async function pullReply() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c || c._busy) return;
    const o = chatOptsOf(c);
    const configured = !!(window.MessagesAPI && window.MessagesAPI.isConfigured());
    if (!configured) {
        // 没有接入 API：按顺序发送联系人的自动回复
        if (!c.replies || !c.replies.length) { toast('请先在「设置 → API」保存接口配置，或在联系人人设里填写自动回复'); return; }
        c._busy = true;
        try { await deliverMsgs(c, c.replies.slice(0, o.max)); }
        finally { c._busy = false; }
        return;
    }
    c._busy = true;
    const cap = document.querySelector('.messages-app').querySelector('.send-capsule'); if (cap) cap.classList.add('pulling');
    showTyping(c);
    try {
        const instruction = `请结合上下文继续回复，严格按系统要求只输出 JSON。本次请发送 ${o.min} 到 ${o.max} 条消息。`;
        window.MESSAGES_USER_NAME = ME.name;
        const replies = await window.MessagesAPI.replyFor(c, instruction, o.max);
        const row = document.getElementById('typingRow'); if (row) row.remove();
        const parts = replies.map(p => cleanMsgPart(p, c.name)).filter(Boolean);
        if (!parts.length) throw new Error('模型没有返回可用的消息，请重试');
        await deliverMsgs(c, parts);
        maybeAutoSummary(c);
    } catch (e) { const row=document.getElementById('typingRow'); if(row) row.remove(); toast(e.message || 'API 请求失败'); }
    finally { c._busy=false; if(cap) cap.classList.remove('pulling'); }
}

/* 人设页第一区折叠 */
function togglePersonaFold() {
    const f = document.getElementById('pFold');
    if (f) f.classList.toggle('collapsed');
}
async function sendMessage() {
    const input = document.getElementById('input');
    const text = input.value.trim();
    if (!text || !activeId) return;
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c || c._busy) return;
    c.msgs.push({me:true,text,t:nowTime(), ts: Date.now()}); c.time=nowTime();
    input.value=''; autoGrow(); updateSend(); persistContacts(); renderThread(); renderChats();
}
function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function onTyping() { autoGrow(); updateSend(); }
function autoGrow() { const t = document.getElementById('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }
function updateSend() { document.getElementById('sendBtn').classList.toggle('ready', document.getElementById('input').value.trim().length > 0); }

/* ---------------- 输入手势 ---------------- */
let touchStartY = 0;
let touchStartX = 0;

function toggleQuickMenu(force) {
    const menu = document.getElementById('quickMenu');
    if (!menu) return;
    const show = typeof force === 'boolean' ? force : !menu.classList.contains('show');
    menu.classList.toggle('show', show);
}

function initComposerGesture() {
    const composer = document.getElementById('composer');
    if (!composer) return;

    composer.addEventListener('touchstart', e => {
        const t = e.touches[0];
        touchStartY = t.clientY;
        touchStartX = t.clientX;
    }, { passive: true });

    composer.addEventListener('touchend', e => {
        const t = e.changedTouches[0];
        const dy = touchStartY - t.clientY;
        const dx = Math.abs(t.clientX - touchStartX);
        if (dy > 28 && dx < 70) toggleQuickMenu(true);
        else if (dy < -28 && dx < 70) toggleQuickMenu(false);
    }, { passive: true });
}

root.addEventListener('click', e => {
    const composer = document.getElementById('composer');
    const menu = document.getElementById('quickMenu');
    if (composer && menu && !composer.contains(e.target)) menu.classList.remove('show');
});

/* ---------------- 身份选择 ---------------- */






/* ---------------- 外观切换 ---------------- */
// 1 = 默认（黑白灰简洁风），2 = 标签页风格（无边框，顶部固定一张资料卡）
const THEMES = [
    { id: 'classic', name: '1 · 默认', sub: '黑白灰简洁风格' },
    { id: 'tabs',    name: '2 · 标签页', sub: '无边框，顶部固定一张资料卡' }
];
let THEME = 'tabs';
function krHead() {
    const f = key => `<span class="pc-edit" data-f="${key}" onclick="startProfileEdit(this)">${esc(PROFILE[key])}</span>`;
    return `<div class="kr-head"><div class="kr-title">${f('krTitle')}</div><div class="kr-sub">${f('krSub')}</div></div>`;
}



function applyTheme(id) {
    THEME = id;
    document.body.classList.toggle('theme-tabs', id === 'tabs');
    const t = THEMES.find(x => x.id === id);
    document.getElementById('appearanceSub').textContent = '当前 · ' + t.name;
    renderThemeList();
    renderChats();
}
function renderThemeList() {
    document.getElementById('themeList').innerHTML = THEMES.map(t => `
        <div class="theme-opt ${THEME === t.id ? 'on' : ''}" onclick="applyTheme('${t.id}')">
            <div class="t-main"><div class="t-name">${t.name}</div><div class="t-sub">${t.sub}</div></div>
            <div class="t-check">${THEME === t.id ? '✓' : ''}</div>
        </div>`).join('');
}
function openAppearance() {
    renderThemeList();
    document.getElementById('appearanceMgr').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
}
function closeAppearance() {
    document.getElementById('appearanceMgr').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}

/* ---------------- 文件夹 ---------------- */
const FOLDERS = loadStoredFolders(); // 用户自己创建的文件夹
let FD_ID = null;            // 当前打开的文件夹（'all' = 全部联系人）
const FOLDER_SVG = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';



function folderMembers(fid) {
    return fid === 'all' ? CONTACTS : CONTACTS.filter(c => c.folder === fid);
}
function folderName(fid) {
    const f = FOLDERS.find(x => x.id === fid);
    return f ? f.name : '';
}

function renderContacts() {
    const tiles = [{ id: 'all', name: '全部联系人', count: CONTACTS.length }]
        .concat(FOLDERS.map(f => ({ id: f.id, name: f.name, count: folderMembers(f.id).length })))
        .map(f => `
            <div class="folder-tile" onclick="openFolderDetail('${f.id}')">
                ${folderTileIcon(f.id)}
                <div>
                    <div class="ft-name">${esc(f.name)}</div>
                    <div class="ft-count">${f.count} 位</div>
                </div>
            </div>`).join('');
    document.getElementById('contactGrid').innerHTML =
        tiles + `<div class="folder-tile add" onclick="openFolderNew()"><span>+</span><div class="ft-count">新建文件夹</div></div>`;
    if (FD_ID) renderFolderDetail();
}

function openFolderDetail(fid, idx = 0) {
    FD_ID = fid;
    WHEEL.sel = idx;
    renderFolderDetail();
    const target = document.querySelector('.messages-app').querySelectorAll('#fdCards .env-wrap')[idx];
    document.getElementById('fdScroll').scrollTop = target ? target.offsetTop : 0;
    document.getElementById('folderDetail').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
    updateFdArrows();
}
function closeFolderDetail() {
    FD_ID = null;
    document.getElementById('folderDetail').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}
function renderFolderDetail() {
    if (!FD_ID) return;
    const isAll = FD_ID === 'all';
    const name = isAll ? '全部联系人' : folderName(FD_ID);
    if (!name) { closeFolderDetail(); return; }
    const list = folderMembers(FD_ID);
    document.getElementById('fdName').textContent = name;
    document.getElementById('fdCount').textContent = list.length + ' 位联系人';
    document.getElementById('fdEdit').style.display = isAll ? 'none' : '';
    document.getElementById('fdDelete').style.display = isAll ? 'none' : '';
    document.getElementById('fdCards').innerHTML = list.length
        ? list.map((c, i) => cardHtml(c, i)).join('')
        : `<div class="env-wrap"><div class="fd-empty"><div>还没有联系人</div><button onclick="openFolderPicker()">添加联系人</button></div></div>`;
    renderWheel();
    updateFdArrows();
}

function openFolderPicker() {
    if (!FD_ID || FD_ID === 'all') return;
    renderFolderPicker();
    document.getElementById('folderPicker').classList.add('open');
}
function closeFolderPicker() {
    document.getElementById('folderPicker').classList.remove('open');
    renderFolderDetail();
    renderContacts();
}
function renderFolderPicker() {
    document.getElementById('fpName').textContent = folderName(FD_ID);
    document.getElementById('fpList').innerHTML = CONTACTS.map(c => {
        const on = c.folder === FD_ID;
        const other = c.folder && !on ? '在「' + folderName(c.folder) + '」' : (c.status || '');
        return `
            <div class="fp-row ${on ? 'on' : ''}" onclick="toggleFolderMember('${c.id}')">
                ${avatar(c, 'md')}
                <div class="fp-info"><div class="fp-name">${esc(c.name)}</div><div class="fp-sub">${esc(other)}</div></div>
                <div class="fp-check">${on ? '✓' : ''}</div>
            </div>`;
    }).join('') || '<div class="fp-empty">还没有联系人</div>';
}
function toggleFolderMember(id) {
    const c = CONTACTS.find(x => x.id === id);
    if (!c) return;
    c.folder = c.folder === FD_ID ? null : FD_ID;   // 一个联系人只属于一个文件夹
    persistContacts();
    renderFolderPicker();
}

function openFolderNew() {
    document.getElementById('fnName').value = '';
    document.getElementById('folderNew').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
}
function closeFolderNew() {
    document.getElementById('folderNew').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}
function saveFolderNew() {
    const name = document.getElementById('fnName').value.trim();
    if (!name) { toast('请输入文件夹名字'); return; }
    FOLDERS.push({ id: 'f' + Date.now(), name });
    persistFolders();
    closeFolderNew();
    renderContacts();
}


/* ---------------- 半圆轮盘 ---------------- */
const WHEEL = { step: 22, R: 228, rot: 0, sel: 0, drag: false, lastAng: 0, moved: 0, idle: false, idleT: null };

function wheelList() { return FD_ID ? folderMembers(FD_ID) : []; }

function renderWheel() {
    const ring = document.getElementById('wheelRing');
    if (!ring) return;
    ring.innerHTML = wheelList().map((c, k) => {
        const a = k * WHEEL.step;
        return `<button class="wheel-item" data-k="${k}" style="transform: rotate(${a}deg) translateY(-${WHEEL.R}px) rotate(${-a}deg)" onclick="wheelTap(${k})">${avatar(c, 'md')}</button>`;
    }).join('');
    WHEEL.sel = Math.min(WHEEL.sel, Math.max(0, wheelList().length - 1));
    WHEEL.rot = -WHEEL.sel * WHEEL.step;
    applyWheel(false);
    updateWheelUI();
}
function applyWheel(anim) {
    const ring = document.getElementById('wheelRing');
    ring.style.transition = anim ? 'transform .18s ease-out' : 'none';
    ring.style.transform = `rotate(${WHEEL.rot}deg)`;
}
function updateWheelUI() {
    document.querySelector('.messages-app').querySelectorAll('.wheel-item').forEach(el => el.classList.toggle('sel', +el.dataset.k === WHEEL.sel));
    const c = wheelList()[WHEEL.sel];
    document.getElementById('wheelLabel').textContent = c ? c.name : '';
}
function wheelAngle(e) {
    const r = document.getElementById('wheelDisk').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.atan2(e.clientX - cx, cy - e.clientY) * 180 / Math.PI;
}
function wheelDown(e) {
    if (!wheelList().length) return;
    WHEEL.drag = true; WHEEL.moved = 0; WHEEL.idle = false;
    WHEEL.lastAng = wheelAngle(e);
    window.addEventListener('pointermove', wheelMove);
    window.addEventListener('pointerup', wheelUp);
    window.addEventListener('pointercancel', wheelUp);
    updateWheelUI();
}
function wheelMove(e) {
    if (!WHEEL.drag) return;
    const a = wheelAngle(e);
    let d = a - WHEEL.lastAng;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    WHEEL.lastAng = a;
    WHEEL.moved += Math.abs(d);
    const min = -(wheelList().length - 1) * WHEEL.step;
    WHEEL.rot = Math.max(min, Math.min(0, WHEEL.rot + d));
    WHEEL.sel = Math.round(-WHEEL.rot / WHEEL.step);
    applyWheel(false);
    updateWheelUI();
}
function wheelUp() {
    if (!WHEEL.drag) return;
    WHEEL.drag = false;
    window.removeEventListener('pointermove', wheelMove);
    window.removeEventListener('pointerup', wheelUp);
    window.removeEventListener('pointercancel', wheelUp);
    WHEEL.rot = -WHEEL.sel * WHEEL.step;     // 松手吸附到最近的联系人
    applyWheel(true);
    updateWheelUI();
    if (WHEEL.moved > 6) openWheelCard(WHEEL.sel);   // 滑动后直接跳到卡片
}
function wheelTap(k) {
    if (WHEEL.moved > 6) return;   // 拖动结束时的误触不处理
    WHEEL.sel = k; WHEEL.rot = -k * WHEEL.step;
    applyWheel(true);
    updateWheelUI();
    openWheelCard(k);
}
function openWheelCard(k) {
    fdGo(k, false);
}
document.getElementById('wheelDisk').addEventListener('pointerdown', wheelDown);
document.getElementById('fdScroll').addEventListener('scroll', () => updateFdArrows());

/* 上下箭头：当前是第几张卡片，哪一边没有了就变淡 */
function fdCards() { return [...document.querySelector('.messages-app').querySelectorAll('#fdCards .env-wrap')]; }
function fdCurrentIndex() {
    const st = document.getElementById('fdScroll').scrollTop;
    let best = 0, bd = Infinity;
    fdCards().forEach((w, i) => { const d = Math.abs(w.offsetTop - st); if (d < bd) { bd = d; best = i; } });
    return best;
}
let fdLockT = 0;   // 程序滚动期间不把滚动位置回写到轮盘，避免轮盘被一格一格拖着走
function fdGo(i, smooth = true) {
    const wraps = fdCards();
    if (!wraps.length) return;
    const t = Math.max(0, Math.min(wraps.length - 1, i));
    fdLockT = Date.now() + 700;
    document.getElementById('fdScroll').scrollTo({ top: wraps[t].offsetTop, behavior: smooth ? 'smooth' : 'auto' });
}
function fdStep(dir) { fdGo(fdCurrentIndex() + dir); }
function updateFdArrows() {
    const n = fdCards().length;
    const up = document.getElementById('fdUp'), down = document.getElementById('fdDown');
    up.style.display = down.style.display = n ? '' : 'none';
    if (!n) return;
    const i = fdCurrentIndex();
    up.classList.toggle('off', i <= 0);
    down.classList.toggle('off', i >= n - 1);
    // 手动滑动卡片时，轮盘跟着走
    if (!WHEEL.drag && Date.now() >= fdLockT && WHEEL.sel !== i) { WHEEL.sel = i; WHEEL.rot = -i * WHEEL.step; applyWheel(false); updateWheelUI(); }
}

/* ---------------- 分步调取（登录 / 刷新）---------------- */
const SYNC_SCREENS = [
    { key: 'chats',      name: '消息',     en: 'Chats' },
    { key: 'contacts',   name: '联系人',   en: 'Contacts' },
    { key: 'folders',    name: '文件夹',   en: 'Folders' },
    { key: 'moments',    name: '朋友圈',   en: 'Moments' },
    { key: 'settings',   name: '设置',     en: 'Settings' },
    { key: 'appearance', name: '外观设置', en: 'Appearance' },
    { key: 'account',    name: '账号管理', en: 'Account' }
];
const SYNC_CHECK = '<svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>';
let SYNC_RUN = 0;

// 这里换成你们内部的接口：按界面 key 调取该界面的数据，完成后 resolve
function fetchScreen(key) {
    // 检查本地真实数据源，不再伪造随机网络延迟。
    if (key === 'contacts' || key === 'chats' || key === 'folders') {
        return Promise.resolve(key === 'folders' ? FOLDERS : CONTACTS);
    }
    if (key === 'settings' || key === 'appearance' || key === 'account' || key === 'moments') return Promise.resolve(true);
    return Promise.resolve(false);
}

function drawSync(states) {
    const list = document.getElementById('syncList');
    if (!list.children.length) {
        list.innerHTML = SYNC_SCREENS.map(s => `
            <div class="sync-row pending" data-st="pending">
                <div class="sr-text"><div class="sr-name">${s.name}</div><div class="sr-en">${s.en}</div></div>
                <div class="sr-mark"></div>
            </div>`).join('');
    }
    [...list.children].forEach((row, i) => {
        if (row.dataset.st === states[i]) return;
        row.dataset.st = states[i];
        row.className = 'sync-row ' + states[i];
        row.querySelector('.sr-mark').innerHTML = states[i] === 'done' ? SYNC_CHECK : '';
    });
    const n = states.filter(x => x === 'done').length;
    document.getElementById('syncCount').textContent = n + ' / ' + SYNC_SCREENS.length;
    document.getElementById('syncBar').style.width = (n / SYNC_SCREENS.length * 100) + '%';
}

async function startSync() {
    const run = ++SYNC_RUN;
    setSunSpin(true);
    document.getElementById('syncHeroTitle').textContent = '正在调取';
    const states = SYNC_SCREENS.map(() => 'pending');
    document.getElementById('syncList').innerHTML = '';
    document.getElementById('syncDone').classList.remove('show');
    document.getElementById('syncPage').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
    drawSync(states);
    for (let i = 0; i < SYNC_SCREENS.length; i++) {
        states[i] = 'loading'; drawSync(states);
        await fetchScreen(SYNC_SCREENS[i].key);
        if (run !== SYNC_RUN) return;      // 中途关掉了，就不再继续
        states[i] = 'done'; drawSync(states);
    }
    setSunSpin(false);
    document.getElementById('syncHeroTitle').textContent = '调取完成';
    document.getElementById('syncDone').classList.add('show');
}

function closeSync() {
    SYNC_RUN++;
    setSunSpin(false);
    document.getElementById('syncPage').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}

/* ---------------- 管理我 · 默认人设（我就是我，联系人只是联系人） ---------------- */
const PLANE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>';





/* ---------------- 聊天页资料卡：纯展示，独立数据，和身份/联系人无关 ---------------- */
const PROFILE_DB_KEY = 'messages_profile_card_v1';
const PROFILE_DEFAULT = { label: '프로필', name: '구름천사', id: '1004', cap: '1004', status: '오늘도 날개를 펴는 중', sig: '작은 구름 위에서 안부를 전해요', krTitle: '나의 프로필', krSub: '오늘도 좋은 하루 보내세요' };
let PROFILE = Object.assign({}, PROFILE_DEFAULT);

function profileCard() {
    const f = key => `<span class="pc-edit" data-f="${key}" onclick="startProfileEdit(this)">${esc(PROFILE[key])}</span>`;
    return `
    <div class="story-card">
        <div class="polaroid">
            <div class="sq" style="background:#111" title="点击上传照片" onclick="pickProfilePhoto(event)">${PROFILE.photo ? `<img src="${PROFILE.photo}" alt="">` : `<img src="${DEFAULT_POLAROID}" alt="" onerror="this.remove()">`}</div>
            <div class="cap">${f('cap')}</div>
        </div>
        <div class="profile-card">
            <div class="pc-label">${f('label')}</div>
            <div class="pc-name">${f('name')}</div>
            <div class="pc-id">ID · ${f('id')}</div>
            <div class="pc-status"><i></i>${f('status')}</div>
            <div class="pc-sig">${f('sig')}</div>
        </div>
    </div>`;
}
function loadProfileCard() {
    if (!window.DB || typeof window.DB.load !== 'function') return;
    Promise.resolve(window.DB.load(PROFILE_DB_KEY, null)).then(v => {
        if (v && typeof v === 'object') { PROFILE = Object.assign({}, PROFILE_DEFAULT, v); renderChats(); }
    }).catch(() => {});
}
function saveProfileCard() {
    if (!window.DB || typeof window.DB.save !== 'function') { toast('保存失败：数据库不可用'); return; }
    Promise.resolve(window.DB.save(PROFILE_DB_KEY, PROFILE))
        .then(ok => toast(ok === false ? '保存失败，请检查存储空间' : '已保存'))
        .catch(() => toast('保存失败，请检查存储空间'));
}
function startProfileEdit(el) {
    if (el.classList.contains('editing')) return;
    el.classList.add('editing');
    el.contentEditable = 'true';
    el.focus();
    // 光标放到末尾，不全选
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    el.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        else if (e.key === 'Escape') { el.textContent = PROFILE[el.dataset.f]; el.blur(); }
    };
    el.onpaste = e => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData('text') || '';
        document.execCommand('insertText', false, t.replace(/\s+/g, ' '));
    };
    el.onblur = () => finishProfileEdit(el);
}
function finishProfileEdit(el) {
    el.onblur = null; el.onkeydown = null; el.onpaste = null;
    el.contentEditable = 'false';
    el.classList.remove('editing');
    const key = el.dataset.f;
    const orig = PROFILE[key];
    const next = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!next || next === orig) { el.textContent = orig; return; }
    askConfirm('保存修改？', `把「${orig}」改为「${next}」`, '保存', () => {
        PROFILE[key] = next;
        saveProfileCard();
        renderChats();
    }, () => { el.textContent = PROFILE[key]; });
}

/* 统一的选图入口：输入框挂在页面上（隐藏），再 click，手机上才能弹出选择器 */
function makeFilePicker() {
    const input = document.createElement('input');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(input);
    return input;
}
/* ---------------- 拍立得照片上传（资料卡左侧相纸）：压缩后保存，保留原色 ---------------- */
/* 导入 txt / docx 到人设（新建联系人） */
function pickPersonaImport() {
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = '.txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const isDocx = /\.docx$/i.test(file.name);
        const done = text => {
            const el = document.getElementById('pPersona');
            if (!el) return;
            const cur = el.value.trim();
            el.value = cur ? cur + '\n\n' + text : text;
            toast('已导入：' + file.name);
        };
        if (isDocx) {
            const reader = new FileReader();
            reader.onload = () => extractDocxText(reader.result).then(done).catch(err => toast(err.message || '读取 docx 失败'));
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = () => done(String(reader.result || '').trim());
            reader.onerror = () => toast('读取文件失败');
            reader.readAsText(file, 'utf-8');
        }
    };
    input.click();
}
async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持读取 docx，请改用 txt');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
function docxXmlToText(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementsByTagNameNS('*', 'p'))
        .map(p => Array.from(p.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join(''))
        .join('\n').trim();
}
/* 不依赖外部库：直接读 zip 目录，取出 word/document.xml */
async function extractDocxText(buf) {
    const u8 = new Uint8Array(buf); const dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('不是有效的 docx 文件');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    for (let n = 0; n < count; n++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        const method = dv.getUint16(p + 10, true);
        const csize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
        const lho = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(u8.slice(p + 46, p + 46 + nameLen));
        if (name === 'word/document.xml') {
            const lnameLen = dv.getUint16(lho + 26, true), lextra = dv.getUint16(lho + 28, true);
            const start = lho + 30 + lnameLen + lextra;
            const comp = u8.slice(start, start + csize);
            const raw = method === 0 ? comp : method === 8 ? await inflateRaw(comp) : null;
            if (!raw) throw new Error('暂不支持该 docx 的压缩格式');
            return docxXmlToText(new TextDecoder().decode(raw));
        }
        p += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error('docx 里没有找到正文');
}
function compressImageFile(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                const w = Math.max(1, Math.round(img.naturalWidth * scale));
                const h = Math.max(1, Math.round(img.naturalHeight * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('图片解码失败，请换一张照片'));
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
function pickProfilePhoto(e) {
    if (e) e.stopPropagation();
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return;
        compressImageFile(file, 640, 0.86).then(url => {
            PROFILE.photo = url;
            saveProfileCard();
            renderChats();
        }).catch(err => toast((err && err.message) || '照片保存失败'));
    };
    input.click();
}

/* ---------------- 设置页名字：点击可自定义，与身份无关，单独保存（不改动身份数据） ---------------- */
const SETTINGS_NAME_KEY = 'messages_settings_name_v1';
let SETTINGS_NAME = '';
function loadSettingsName() {
    if (!window.DB || typeof window.DB.load !== 'function') return;
    Promise.resolve(window.DB.load(SETTINGS_NAME_KEY, '')).then(v => {
        SETTINGS_NAME = typeof v === 'string' ? v : '';
        applySelf();
    }).catch(() => {});
}
function saveSettingsName(value) {
    SETTINGS_NAME = value;
    if (!window.DB || typeof window.DB.save !== 'function') { toast('保存失败：数据库不可用'); return; }
    Promise.resolve(window.DB.save(SETTINGS_NAME_KEY, value))
        .then(ok => toast(ok === false ? '保存失败，请检查存储空间' : '已保存'))
        .catch(() => toast('保存失败，请检查存储空间'));
}
function settingsNameShown() {
    if (SETTINGS_NAME) return SETTINGS_NAME;
    const a = activeIdentity();
    return a ? a.name : ME.name;
}
function bindSettingsNameEdit(el) {
    el.onclick = () => startSettingsNameEdit(el);
}
function startSettingsNameEdit(el) {
    if (el.classList.contains('editing')) return;
    el.classList.add('editing');
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    el.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        else if (e.key === 'Escape') { el.textContent = settingsNameShown(); el.blur(); }
    };
    el.onpaste = e => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData('text') || '';
        document.execCommand('insertText', false, t.replace(/\s+/g, ' '));
    };
    el.onblur = () => finishSettingsNameEdit(el);
}
function finishSettingsNameEdit(el) {
    el.onblur = null; el.onkeydown = null; el.onpaste = null;
    el.contentEditable = 'false';
    el.classList.remove('editing');
    const shown = settingsNameShown();
    const next = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 16);
    if (next === shown) { el.textContent = shown; return; }
    const isReset = next === '';
    askConfirm('保存修改？', isReset ? '恢复为默认名字（跟随当前身份）' : `把「${shown}」改为「${next}」`, '保存', () => {
        saveSettingsName(next);
        applySelf();
    }, () => { el.textContent = shown; });
}

/* ---------------- 弹窗：统一居中 + 设置弹窗同款飞机图标 ---------------- */
let POP = { ok: null, cancel: null };
function ensureSheet() {
    let b = document.getElementById('genericSheet');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'genericSheet';
    b.className = 'identity-sheet-backdrop';
    b.innerHTML = '<div class="identity-sheet" onclick="event.stopPropagation()"></div>';
    b.addEventListener('click', e => { if (e.target === b) popupCancel(); });
    (document.querySelector('.messages-app') || document.body).appendChild(b);
    return b;
}

function closeSheet(event) {
    if (event && event.target !== event.currentTarget) return;
    const b = document.getElementById('genericSheet');
    if (b) b.classList.remove('show');
}
function askConfirm(title, text, okLabel, onOk, onCancel) {
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span>${esc(title)}</span></div>
        <div class="pop-text">${esc(text)}</div>
        <div class="pop-actions"><button class="identity-cancel" type="button" onclick="popupCancel()">取消</button><button class="cid-btn" type="button" onclick="popupOk()">${esc(okLabel || '确定')}</button></div>`);
    POP = { ok: onOk || null, cancel: onCancel || null };
}
function popupOk() { const f = POP.ok; POP = { ok: null, cancel: null }; closeSheet(); if (f) f(); }
function popupCancel() { const f = POP.cancel; POP = { ok: null, cancel: null }; closeSheet(); if (f) f(); }

/* ---------------- 添加聊天（居中弹窗） ---------------- */
function contactIdShell(titleEn, titleZh, bodyHtml) {
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span id="contactIdTitle">${titleEn}</span><em>${titleZh}</em></div><div class="sheet-body">${bodyHtml}</div>`);
}


/* ---------------- 聊天室设置：全屏界面 ---------------- */
let roomEl = null;






/* ---------------- 聊天软件设置（设置 → Chats） ---------------- */

function softAction(kind) {
    if (kind === 'count') { openChatCountSheet(); return; }
    if (kind === 'batch') {
        CHAT_OPTS.batch = !CHAT_OPTS.batch; persistChatOpts();
        toast(CHAT_OPTS.batch ? '已开启一次性发出' : '已关闭一次性发出');
        openChatsSettings(); return;
    }
    if (kind === 'bar') {
        const bar = document.getElementById('tabbar');
        bar.classList.toggle('glass');
        toast(bar.classList.contains('glass') ? '已切换为玻璃底栏' : '已切换为经典黑色底栏');
        openChatsSettings();
        return;
    }
    if (kind === 'appearance') { closeSheet(); openAppearance(); return; }
    if (kind === 'clearAll') {
        askConfirm('清空全部聊天记录', '所有联系人的消息都会删除，联系人会保留。', '清空', () => {
            CONTACTS.forEach(c => { c.msgs = []; c.unread = 0; c.time = ''; });
            persistContacts(); renderChats();
            if (activeId) renderThread();
            toast('已清空全部聊天记录');
        });
    }
}

/* ---------------- 管理我（设置 → 管理我，只有我自己的默认人设） ---------------- */
function openAccountMgr() {
    renderAccountList();
    document.getElementById('accountMgr').classList.add('open');
    document.getElementById('tabbar').classList.add('hide');
}


/* ---------------- 文件夹删除：统一弹窗 ---------------- */
function deleteFolder() {
    if (!FD_ID || FD_ID === 'all') return;
    const fid = FD_ID;
    askConfirm('删除文件夹', '删除这个文件夹？里面的联系人不会被删除。', '删除', () => {
        CONTACTS.forEach(c => { if (c.folder === fid) c.folder = null; });
        const i = FOLDERS.findIndex(x => x.id === fid);
        if (i >= 0) FOLDERS.splice(i, 1);
        persistFolders(); persistContacts();
        closeFolderDetail(); renderContacts();
    });
}

function isValidContactId(id) { return /^ID-[A-Z0-9]{8}$/.test(id) || /^ID-[A-Z]+\d{2}$/.test(id); }
function makeContactId() {
    const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return 'ID-' + Array.from({ length: 8 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
}
function initOf(name) { return (String(name || '').trim().charAt(0) || '?').toUpperCase(); }
function ioInner(name, avatarUrl) {
    const img = (avatarUrl || DEFAULT_CHAT_AVATAR) ? `<img src="${avatarUrl || DEFAULT_CHAT_AVATAR}" alt="" onerror="this.remove()">` : '';
    return `${img}<span>${esc(initOf(name))}</span>`;
}
function selfAvatarHtml(size) {
    const img = (ME.avatar || DEFAULT_CHAT_AVATAR) ? `<img src="${ME.avatar || DEFAULT_CHAT_AVATAR}" alt="" onerror="this.remove()">` : '';
    return `<div class="av ${size || 'lg'} g1">${img}<span class="ini">${esc(initOf(ME.name))}</span></div>`;
}
function sheetRow(iconHtml, title, sub, action, active) {
    return `<button class="identity-option ${active ? 'active' : ''}" type="button" onclick="${action}"><div class="io-avatar">${iconHtml}</div><div class="io-info"><div class="io-name">${esc(title)}</div>${sub ? `<div class="io-sub">${esc(sub)}</div>` : ''}</div><div class="check">✓</div></button>`;
}
function showContactIdEntry() {
    contactIdShell('Enter ID', '输入联系人 ID', `
        <p class="cid-desc">匹配成功后会显示头像、名称和状态</p>
        <label class="contact-id-label" for="contactIdInput">联系人 ID</label>
        <div class="contact-id-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 20H3z"/><path d="M12 9v5m0 2.5v.1"/></svg><input id="contactIdInput" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="例如 ID-PXESX38G" oninput="previewContactById(this.value)" /></div>
        <div id="contactIdPreview" class="contact-id-preview"><div class="contact-id-preview-empty">输入 ID 后显示联系人资料</div></div>
        <div id="contactIdStatus" class="contact-id-status">请先在联系人页面创建联系人</div>
        <button id="contactIdStart" class="cid-btn" type="button" onclick="addChatByContactId()" disabled><span>确认并添加</span></button>
        <button class="cid-back" type="button" onclick="renderContactAddChoice()">‹ 返回选择方式</button>`);
    setTimeout(() => document.getElementById('contactIdInput')?.focus(), 100);
}
function showDirectContactList() {
    const list = CONTACTS.length ? CONTACTS.map(c => `<button class="contact-id-direct-row" type="button" onclick="directAddContact('${esc(c.id).replace(/'/g, '&#39;')}')">${avatar(c, 'md')}<span class="contact-id-direct-info"><strong>${esc(c.name)}</strong><small>${esc(c.status || '联系人')}</small><code>${esc(c.id)}</code></span><span class="cid-option-arrow">${CHAT_IDS.includes(c.id) ? '已添加' : '＋'}</span></button>`).join('') : '<div class="contact-id-preview-empty">还没有联系人，请先到「联系人」页面创建</div>';
    contactIdShell('Direct Add', '直接添加', `
        <p class="cid-desc">选择联系人即可加入 Chats</p>
        <div class="contact-id-direct-list">${list}</div>
        <button class="cid-back" type="button" onclick="renderContactAddChoice()">‹ 返回选择方式</button>`);
}
function openContactIdModal() { renderContactAddChoice(); }
function closeContactIdModal() { closeSheet(); }
function tapContactCard(id) {
    const c = CONTACTS.find(x => x.id === id); if (!c) return;
    if (c.fresh) openPersonaEditor(id); else openContactEditor(id);
}
function openPersonaEditor(id) {
    const c = CONTACTS.find(x => x.id === id);
    if (!c) return;
    personaMode = 'edit';
    editingPersonaId = id;
    fillPersona(c);
    showPersona();
}
function openSelfPersona() {
    personaMode = 'self';
    editingPersonaId = null;
    fillPersona(ME);
    showPersona();
}




function closeAccountMgr() {
    document.getElementById('accountMgr').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}

function resetFrameScroll() {
    document.getElementById('phone').scrollTop = 0;
    document.getElementById('phone').scrollLeft = 0;
    document.getElementById('appShell').scrollTop = 0;
    document.getElementById('appShell').scrollLeft = 0;
}

function openSidebar() {
    if (SIDE.open) return;
    SIDE.open = true;
    resetFrameScroll();
    renderStrip();
    document.getElementById('appShell').classList.add('pushed');
    setTimeout(() => { if (SIDE.open && !SIDE.liveId) showLoginMask(null); }, 420);
}

function closeSidebar() {
    if (!SIDE.open) return;
    SIDE.open = false;
    resetFrameScroll();
    document.getElementById('appShell').classList.remove('pushed');
    hideLoginMask();
}

function showLoginMask(id) {
    const m = document.getElementById('loginMask');
    m.classList.add('show');
    m.classList.toggle('picked', !!id);
}

function hideLoginMask() {
    document.getElementById('loginMask').classList.remove('show', 'picked');
}

function renderStrip() {
    document.getElementById('stripAccounts').innerHTML = CONTACTS.map(c => `
        <button class="strip-acc ${SIDE.pickedId === c.id ? 'sel' : ''} ${SIDE.liveId === c.id ? 'live' : ''}" title="${esc(c.name)}" onclick="event.stopPropagation(); pickAccount('${c.id}')">${avatar(c, 'md')}</button>`).join('');
}

function pickAccount(id) {
    const c = CONTACTS.find(x => x.id === id);
    if (!c) return;
    SIDE.pickedId = id;
    document.getElementById('lpAvatar').innerHTML = avatar(c, 'lg');
    document.getElementById('lpName').textContent = c.name;
    document.getElementById('lpId').textContent = 'ID · ' + c.id;
    document.getElementById('lpPwd').value = '';
    showLoginMask(id);
    renderStrip();
}

function refreshAccounts() {
    SIDE.pickedId = null;
    document.getElementById('lpPwd').value = '';
    if (SIDE.open) closeSidebar();
    renderStrip();
    startSync();
}

function doLogin() {
    if (!SIDE.pickedId) { toast(CONTACTS.length ? '请先选择账号' : '请先新建或导入联系人'); return; }
    const pwd = document.getElementById('lpPwd').value.trim();
    if (!pwd) {
        const f = document.getElementById('lpField');
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        toast('请输入密码');
        return;
    }
    const c = CONTACTS.find(x => x.id === SIDE.pickedId); if (!c) { toast('账号不存在，请刷新列表'); return; }
    finishLogin(c);
}

function directLogin() {
    if (!SIDE.pickedId) { toast(CONTACTS.length ? '请先选择账号' : '请先新建或导入联系人'); return; }
    const c = CONTACTS.find(x => x.id === SIDE.pickedId); if (!c) { toast('账号不存在，请刷新列表'); return; }
    finishLogin(c);
}

function finishLogin(c) {
    if (!c) { toast('没有可登录的联系人，请先新建或导入'); return; }
    SIDE.liveId = c.id;
    document.getElementById('capName').textContent = c.name;
    document.getElementById('accountCapsule').classList.add('show');
    document.getElementById('topTools').classList.add('logged');
    applyPersona(c);
    hideLoginMask();
    renderStrip();
    toast('已登录 ' + c.name);
    startSync();
}



/* ---------------- 我的默认人设 / 身份（身份独立于联系人） ---------------- */



/* 点击顶部胶囊：切换身份（我 / 我的身份列表） */


function identityAvatarHtml(c) {
    const url = pendingPersonaAvatar || (c && c.avatar) || '';
    const img = (url || DEFAULT_CHAT_AVATAR) ? `<img src="${url || DEFAULT_CHAT_AVATAR}" alt="" onerror="this.remove()">` : '';
    return `<div class="av lg g1">${img}<span class="ini">${esc(initOf(c && c.name ? c.name : '?'))}</span></div>`;
}


/* 管理我：默认人设 + 我的身份（身份只来自这里，不读取联系人） */
function renderAccountList() {
    const rows = IDENTITIES.map(c => `
        <div class="acct-row" onclick="openIdentityEditor('${c.id}')">
            ${avatar(c, 'lg')}
            <div class="acct-info">
                <div class="acct-name">${esc(c.name)}</div>
                <div class="acct-id">ID · ${esc(c.id)}</div>
                <div class="acct-persona ${c.persona ? '' : 'is-none'}">${esc(c.persona || '还没有人设，点击填写')}</div>
            </div>
            <button class="acct-remove" type="button" onclick="event.stopPropagation(); deleteIdentity('${c.id}')">删除</button>
        </div>`).join('');
    document.getElementById('accountList').innerHTML = `
        <div class="section-label" style="padding:16px 4px 10px;">我的默认人设</div>
        <div class="acct-row" onclick="openSelfPersona()">
            ${selfAvatarHtml('lg')}
            <div class="acct-info">
                <div class="acct-name">${esc(ME.name)}</div>
                <div class="acct-id">ID · ${esc(ME.id)}</div>
                <div class="acct-persona ${ME.persona ? '' : 'is-none'}">${esc(ME.persona || '还没有人设，点击填写')}</div>
            </div>
            <span class="acct-chev">›</span>
        </div>
        <div class="section-label" style="padding:18px 4px 10px;">我的身份</div>
        ${rows || '<div class="acct-empty">还没有身份。添加后可以在侧边栏登录，或从顶部切换。</div>'}
        <button class="acct-add" type="button" onclick="openIdentityEditor(null)">＋ 添加身份</button>`;
}
function openIdentityEditor(id) {
    personaMode = 'identity';
    const c = id ? IDENTITIES.find(x => x.id === id) : null;
    if (id && !c) return;
    editingPersonaId = c ? c.id : null;
    pendingPersonaAvatar = null;
    fillPersona(c || { id: '', name: '', status: '', sig: '', persona: '', speech: '', relation: '', backstory: '', replies: [], avatar: '' });
    showPersona();
}

function pickPersonaAvatar() {
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        compressImage(file, 512).then(url => {
            let slot;
            if (personaMode === 'self') {
                ME.avatar = url; persistMe(); applySelf(); renderChats(); renderMoments();
                slot = document.querySelector('#personaHero .persona-hero-av');
                if (slot) slot.innerHTML = selfAvatarHtml('lg');
            } else if (personaMode === 'identity') {
                const c = editingPersonaId ? IDENTITIES.find(x => x.id === editingPersonaId) : null;
                if (c) { c.avatar = url; persistIdentities(); if (ACTIVE_ID === c.id) applySelf(); renderAccountList(); }
                else pendingPersonaAvatar = url;
                slot = document.querySelector('#personaHero .persona-hero-av');
                if (slot) slot.innerHTML = identityAvatarHtml(c || { name: '' });
            }
            toast('头像已更新');
        }).catch(() => toast('图片读取失败，请换一张试试'));
    };
    input.click();
}

function fillPersona(c) {
    const g = id => document.getElementById(id);
    const mode = personaMode;
    const isNewIdentity = mode === 'identity' && !editingPersonaId;
    const titles = { self: '我的人设', identity: isNewIdentity ? '新建身份' : '身份人设', edit: '人设与信息', create: '新建联系人' };
    g('personaTitle').textContent = titles[mode] || '人设与信息';
    const importRow = g('pImportRow'); if (importRow) importRow.style.display = mode === 'create' ? '' : 'none';
    let heroAv;
    if (mode === 'self') heroAv = `<div class="persona-hero-av" onclick="pickPersonaAvatar()">${selfAvatarHtml('lg')}</div>`;
    else if (mode === 'identity') heroAv = `<div class="persona-hero-av" onclick="pickPersonaAvatar()">${identityAvatarHtml(c)}</div>`;
    else if (c) heroAv = avatar(c, 'lg');
    else heroAv = `<div class="av lg g1"><img src="${DEFAULT_CHAR_AVATAR}" alt="" onerror="this.remove()"><span class="ini">N</span></div>`;
    const heroName = c && c.name ? c.name : (isNewIdentity ? '新建身份' : '新建联系人');
    const heroSub = mode === 'self' ? '点击头像可更换 · 这是你的默认身份'
        : mode === 'identity' ? '点击头像可更换 · 登录时使用这个身份'
        : c ? '这里的设定会影响它的说话方式' : '先写下它是谁，再开始聊天';
    g('personaHero').innerHTML = heroAv + `<div class="persona-hero-name" id="personaHeroName">${esc(heroName)}</div><div class="persona-hero-sub">${heroSub}</div>`;
    if (c && c.id !== undefined) {
        g('pName').value = c.name || '';
        g('pStatus').value = c.status || '';
        g('pId').value = c.id || '';
        g('pId').placeholder = mode === 'self' || editingPersonaId ? '' : '留空则自动生成';
        g('pPersona').value = c.persona || '';
        g('pSig').value = c.sig || '';
        g('pSpeech').value = c.speech || '';
        g('pRelation').value = c.relation || '';
        g('pBackstory').value = c.backstory || '';
        g('pReplies').value = (c.replies || []).join(MSG_SEP);
    } else {
        g('pName').value = '';
        g('pStatus').value = '';
        g('pId').value = '';
        g('pId').placeholder = '留空则点击完成时自动生成';
        ['pPersona', 'pSig', 'pSpeech', 'pRelation', 'pBackstory', 'pReplies'].forEach(id => g(id).value = '');
    }
}
function savePersona() {
    const name = document.getElementById('pName').value.trim();
    if (!name) { toast('姓名不能为空'); return; }
    const status = document.getElementById('pStatus').value.trim() || '未知状态';
    const lines = splitMsgs(document.getElementById('pReplies').value);
    const persona = {
        persona: document.getElementById('pPersona').value.trim(),
        sig: document.getElementById('pSig').value.trim(),
        speech: document.getElementById('pSpeech').value.trim(),
        relation: document.getElementById('pRelation').value.trim(),
        backstory: document.getElementById('pBackstory').value.trim(),
        replies: lines
    };
    const typedId = document.getElementById('pId').value.trim().toUpperCase();

    if (personaMode === 'self') {
        Object.assign(ME, { name, status, id: typedId || ME_DEFAULT.id }, persona);
        persistMe(); applySelf(); syncSettingsMode(); renderChats();
        closePersonaEditor(); renderAccountList(); toast('我的人设已保存');
        return;
    }

    if (personaMode === 'identity') {
        if (typedId && !isValidContactId(typedId)) { toast('ID 格式应为 ID- 加 8 位大写字母或数字，例如 ID-PXESX38G'); return; }
        const takenByOther = (id, self) => IDENTITIES.some(x => x.id === id && x.id !== self) || CONTACTS.some(x => x.id === id);
        if (editingPersonaId) {
            const c = IDENTITIES.find(x => x.id === editingPersonaId);
            if (!c) return;
            const newId = typedId || c.id;
            if (takenByOther(newId, c.id)) { toast('这个 ID 已存在'); return; }
            const oldId = c.id;
            Object.assign(c, persona, { name, status, id: newId, ini: name[0].toUpperCase() });
            renameIdentityKey(oldId, newId);
            if (ACTIVE_ID === oldId) { setActiveIdentity(newId); applyActiveThreads(); renderChats(); }
        } else {
            const newId = typedId || makeContactId();
            if (takenByOther(newId, null)) { toast('这个 ID 已存在'); return; }
            IDENTITIES.unshift(normalizeIdentity(Object.assign({
                id: newId, name, status, ini: name[0].toUpperCase(),
                g: 'g' + (Math.floor(Math.random() * 4) + 1), avatar: pendingPersonaAvatar || ''
            }, persona)));
        }
        pendingPersonaAvatar = null;
        persistIdentities();
        closePersonaEditor(); renderAccountList(); renderStrip();
        applySelf();
        toast('身份已保存');
        return;
    }

    // 联系人（人设与信息 / 新建联系人）
    const personaId = typedId || makeContactId();
    if (!isValidContactId(personaId) && !(personaMode === 'edit' && CONTACTS.some(c => c.id === editingPersonaId && c.id === personaId))) { toast('ID 格式应为 ID- 加 8 位大写字母或数字，例如 ID-PXESX38G'); return; }
    if (CONTACTS.some(c => String(c.id).toLowerCase() === personaId.toLowerCase() && c.id !== editingPersonaId)) { toast('这个 ID 已存在'); return; }
    if (personaMode === 'create') {
        const c = Object.assign({
            id: personaId, name, status,
            ini: name[0].toUpperCase(),
            g: 'g' + (Math.floor(Math.random() * 4) + 1),
            cover: null, avatar: null, online: false, unread: 0,
            time: nowTime(), msgs: [],
            promptOpts: ['greasy'],
            greasyEntries: []
        }, persona);
        if (personaNewFolder) c.folder = personaNewFolder;
        c.fresh = true; CONTACTS.unshift(c);
        toast('联系人已创建 · ID：' + personaId);
    } else {
        const c = CONTACTS.find(x => x.id === editingPersonaId);
        if (!c) return;
        const oldId = c.id;
        Object.assign(c, { name, status, ini: name[0].toUpperCase(), fresh: false }, persona);
        c.id = personaId;
        migrateContactId(oldId, personaId);
        toast('人设已保存');
    }
    persistContacts();
    closePersonaEditor(); renderContacts(); renderChats(); renderAccountList();
}

function applySelf() {
    const root = document.querySelector('.messages-app');
    const a = activeIdentity();
    const name = a ? a.name : ME.name;
    const av = a ? a.avatar : ME.avatar;
    const id = a ? a.id : ME.id;
    root.querySelector('#identityPill .pill-avatar').innerHTML = ioInner(name, av);
    document.getElementById('identityPillName').textContent = name;
    root.querySelector('.settings-profile .big-avatar').innerHTML = ioInner(name, av);
    const settingsNameEl = root.querySelector('.settings-profile .profile-name');
    settingsNameEl.textContent = settingsNameShown();
    bindSettingsNameEdit(settingsNameEl);
    root.querySelector('.settings-profile .profile-sub').textContent = 'ID · ' + id;
}

function syncSettingsMode() {
    const c = CONTACTS.find(x => x.id === SIDE.liveId);
    document.getElementById('v-settings').classList.toggle('as-contact', !!c);
    document.getElementById('contactSigText').textContent = c ? (c.sig || '还没有个人签名') : (ME.sig || '还没有个人签名');
}

function applyPersona(c) {
    syncSettingsMode();
    document.getElementById('capName').textContent = c.name;
}

function exitContactLogin() {
    if (!SIDE.liveId) { toast('当前没有登录联系人账号'); return; }
    askConfirm('退出联系人账号', '退出当前登录的联系人账号？', '退出', () => {
        SIDE.liveId = null;
        SIDE.pickedId = null;
        document.getElementById('accountCapsule').classList.remove('show');
        document.getElementById('topTools').classList.remove('logged');
        syncSettingsMode();
        renderStrip();
        closeSync();
        toast('已退出');
    });
}





function persistChatIds() {
    CHAT_IDS = [...new Set(CHAT_IDS.map(String).filter(id => CONTACTS.some(c => String(c.id) === id)))];
    CHAT_MAP[ACTIVE_ID] = CHAT_IDS;
    try { localStorage.setItem('forever_messages_chat_map_v2', JSON.stringify(CHAT_MAP)); }
    catch (e) { console.warn('[Messages] 聊天列表保存失败', e); }
}

function persistContacts() {
    try { if (typeof renderMoments === 'function') renderMoments(); } catch (_) {}
    CONTACTS.forEach(c => { c.threads = c.threads || {}; c.threads[ACTIVE_ID] = c.msgs; });
    try { localStorage.setItem('forever_messages_contacts_v1', JSON.stringify(CONTACTS, (k, v) => (k === 'msgs' ? undefined : v))); }
    catch (e) { toast('保存失败：存储空间可能不足'); console.error(e); }
}

function migrateContactId(oldId, newId) {
    const fix = arr => arr.map(x => (x === oldId ? newId : x));
    Object.keys(CHAT_MAP).forEach(k => { CHAT_MAP[k] = fix(CHAT_MAP[k]); });
    CHAT_IDS = fix(CHAT_IDS);
    persistChatIds();
}

function loadStoredChatMap() {
    try {
        const v = JSON.parse(localStorage.getItem('forever_messages_chat_map_v2') || 'null');
        if (v && typeof v === 'object') {
            const out = {};
            Object.keys(v).forEach(k => { out[k] = Array.isArray(v[k]) ? v[k].map(String) : []; });
            return out;
        }
    } catch (_) {}
    return { self: loadStoredChatIds() };   // 旧版本只有一份列表，归到「我」下面
}
/* 切换身份时：每个联系人的聊天记录和聊天列表换成当前身份的那一份 */
function applyActiveThreads() {
    CONTACTS.forEach(c => { c.threads = c.threads || {}; c.msgs = c.threads[ACTIVE_ID] || []; });
    CHAT_IDS = (CHAT_MAP[ACTIVE_ID] || []).slice();
}
function renameIdentityKey(oldId, newId) {
    if (oldId === newId) return;
    persistContacts();
    if (CHAT_MAP[oldId]) { CHAT_MAP[newId] = CHAT_MAP[oldId]; delete CHAT_MAP[oldId]; }
    CONTACTS.forEach(c => { if (c.threads && c.threads[oldId]) { c.threads[newId] = c.threads[oldId]; delete c.threads[oldId]; } });
    persistChatIds();
}
function dropIdentityData(id) {
    delete CHAT_MAP[id];
    CONTACTS.forEach(c => { if (c.threads) delete c.threads[id]; });
    persistChatIds();
}

function openSheet(innerHtml, bottom) {
    POP = { ok: null, cancel: null };
    const b = ensureSheet();
    b.classList.toggle('bottom', !!bottom);
    const box = b.querySelector('.identity-sheet');
    box.innerHTML = innerHtml;
    box.classList.toggle('compact', !innerHtml.includes('Switch Account'));
    box.classList.toggle('mm-pop-sheet', !!MM_SHEET_TAG);
    b.classList.add('show');
}
function openIdentitySheet() {
    const cur = ACTIVE_ID;
    const rows = [sheetRow(ioInner(ME.name, ME.avatar), ME.name, 'ID · ' + ME.id + ' · 默认', "pickIdentity('self')", cur === 'self')];
    IDENTITIES.forEach(c => rows.push(sheetRow(ioInner(c.name, c.avatar), c.name, c.status || '身份', `pickIdentity('${c.id}')`, cur === c.id)));
    const hint = IDENTITIES.length ? '' : '<div class="cid-footnote">还没有其他身份，可在「设置 → 管理我」里添加</div>';
    openSheet(`<div class="sheet-title">Switch Account</div>${rows.join('')}${hint}<button class="identity-cancel" type="button" onclick="closeSheet()">取消</button>`, true);
}
/* 右下角切换：直接切换到对应身份（不需要密码），聊天记录跟着身份走 */
function pickIdentity(id) {
    closeSheet();
    if (id === ACTIVE_ID) return;
    persistContacts();
    if (document.getElementById('chatView').classList.contains('open')) closeChat();
    setActiveIdentity(id);
    applyActiveThreads();
    applySelf();
    renderChats();
    const a = activeIdentity();
    toast('已切换为 ' + (a ? a.name : ME.name));
}
function deleteIdentity(id) {
    const c = IDENTITIES.find(x => x.id === id);
    if (!c) return;
    askConfirm('删除身份', `删除身份「${c.name}」？这个身份下的聊天记录也会一起删除，联系人不受影响。`, '删除', () => {
        persistContacts();
        dropIdentityData(id);
        IDENTITIES = IDENTITIES.filter(x => x.id !== id);
        persistIdentities();
        if (ACTIVE_ID === id) { setActiveIdentity('self'); applyActiveThreads(); }
        applySelf(); renderChats(); renderAccountList(); renderStrip();
    });
}

function setSunSpin(on) {
    const btn = document.getElementById('syncBtn');
    if (btn) btn.classList.toggle('spinning', !!on);
    const sun = document.getElementById('syncSun');
    if (sun) sun.classList.toggle('spin', !!on);
}

/* ---------------- 聊天室设置：全屏 · 五角星滑轮 ---------------- */
const ROOM_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.00 0.80 L16.09 6.38 L22.65 8.54 L18.61 14.15 L18.58 21.06 L12.00 18.95 L5.42 21.06 L5.39 14.15 L1.35 8.54 L7.91 6.38 Z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const ROOM_TABS = ['聊天设置', '人设设置', '聊天美化'];
const BUBBLE_PRESETS = {
    default: { label: '默认', bg: '#FBF8FA', fg: '#4B4150' },
    ink:     { label: '墨黑', bg: '#111111', fg: '#ffffff' },
    mist:    { label: '雾灰', bg: '#dcdce2', fg: '#111111' },
    paper:   { label: '奶白', bg: '#fff5e6', fg: '#3a2e22' }
};
/* CSS 模板：点一下就把对应的样式填进输入框 */
const CSS_TEMPLATES = {
    ink:   '.mrow.me .bubble{background:#111111;color:#ffffff}',
    mist:  '.mrow.me .bubble{background:#dcdce2;color:#111111}',
    paper: '.mrow.me .bubble{background:#fff5e6;color:#3a2e22}',
    round: '.bubble{border-radius:4px !important}'
};
const CSS_TEMPLATE_LABELS = { ink: '墨黑', mist: '雾灰', paper: '奶白', round: '方角' };
let ROOM_TAB = 0;

/* 给用户写的 CSS 每条选择器加上前缀，只影响当前聊天，不会改到别的页面 */
function scopeCss(css, scope) {
    const src = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
    let out = '';
    let i = 0;
    while (i < src.length) {
        const open = src.indexOf('{', i);
        if (open < 0) break;
        const sel = src.slice(i, open).trim();
        let depth = 1, j = open + 1;
        while (j < src.length && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
        }
        const body = src.slice(open + 1, j - 1);
        if (sel.startsWith('@')) {
            const keepInside = /^@(media|supports)/.test(sel);
            out += sel + '{' + (keepInside ? scopeCss(body, scope) : body) + '}';
        } else if (sel) {
            out += sel.split(',').map(s => s.trim()).filter(Boolean)
                .map(s => (s === 'body' || s === 'html' ? scope : scope + ' ' + s)).join(', ') + '{' + body + '}';
        }
        i = j;
    }
    return out;
}
function applyChatCss(css) {
    let st = document.getElementById('chatCustomCss');
    if (!st) { st = document.createElement('style'); st.id = 'chatCustomCss'; document.head.appendChild(st); }
    st.textContent = scopeCss(css, '#chatView');
}
function chatCssOf(c) {
    const b = (c && c.beauty) || {};
    if (typeof b.css === 'string') return b.css;
    const p = BUBBLE_PRESETS[b.bubble];          // 旧版本的气泡预设，转成 CSS
    return (p && b.bubble !== 'default') ? `.mrow.me .bubble{background:${p.bg};color:${p.fg}}` : '';
}
/* 把美化应用到当前聊天页 */
function applyRoomBeauty(c) {
    const v = document.getElementById('chatView');
    if (!v || !c) return;
    const b = c.beauty || {};
    if (b.bg) { v.dataset.bg = '1'; v.style.backgroundImage = `url("${b.bg}")`; }
    else { delete v.dataset.bg; v.style.backgroundImage = ''; }
    applyChatCss(chatCssOf(c));
}

function ensureRoomView() {
    if (roomEl && roomEl.isConnected) return roomEl;
    roomEl = document.createElement('section');
    roomEl.className = 'edit-view room-view';
    roomEl.id = 'roomView';
    roomEl.innerHTML = `
        <header class="room-head">
            <button class="room-back" type="button" onclick="closeRoomView()" title="返回"><svg viewbox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
            <span class="room-head-title">聊天室设置</span>
            <span class="room-head-sp"></span>
        </header>
        <div class="room-body">
            <div class="room-hero" id="roomHero"></div>
            <div class="room-pane" id="roomPane"></div>
        </div>
        <div class="room-dock">
            <div class="room-track" id="roomTrack"><span class="room-thumb" id="roomThumb">${ROOM_STAR}</span></div>
            <div class="room-labels">${ROOM_TABS.map((t, i) => `<button class="room-lbl" type="button" data-i="${i}" onclick="setRoomTab(${i})">${t}</button>`).join('')}</div>
        </div>`;
    document.querySelector('.messages-app').appendChild(roomEl);
    bindRoomTrack();
    return roomEl;
}

function bindRoomTrack() {
    const track = document.getElementById('roomTrack');
    const thumb = document.getElementById('roomThumb');
    if (!track || track.dataset.bound) return;
    track.dataset.bound = '1';
    const idxAt = x => {
        const r = track.getBoundingClientRect();
        const rel = (x - r.left - 4) / (r.width - 8);
        return Math.max(0, Math.min(ROOM_TABS.length - 1, Math.floor(rel * ROOM_TABS.length)));
    };
    let drag = false;
    track.addEventListener('pointerdown', e => { drag = true; try { track.setPointerCapture(e.pointerId); } catch (_) {} thumb.classList.add('drag'); });
    track.addEventListener('pointermove', e => {
        if (!drag) return;
        const r = track.getBoundingClientRect();
        thumb.style.left = (e.clientX - r.left - 11.5) + 'px';
    });
    const end = e => {
        if (!drag) return;
        drag = false;
        thumb.classList.remove('drag');
        setRoomTab(idxAt(e.clientX));
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
}
function setRoomTab(i) {
    ROOM_TAB = Math.max(0, Math.min(ROOM_TABS.length - 1, i));
    const track = document.getElementById('roomTrack');
    const thumb = document.getElementById('roomThumb');
    if (track) track.style.setProperty('--i', ROOM_TAB);
    if (thumb) thumb.style.left = '';
    document.querySelectorAll('#roomView .room-lbl').forEach(b => b.classList.toggle('on', +b.dataset.i === ROOM_TAB));
    renderRoomPane();
}
function renderRoomHero(c) {
    document.getElementById('roomHero').innerHTML =
        avatar(c, 'lg') +
        `<div class="room-name">${esc(c.name)}</div><div class="room-id">ID · ${esc(c.id)}</div>` +
        (c.status ? `<div class="room-status">${esc(c.status)}</div>` : '');
}
function rpRow(title, sub, action, danger) {
    return `<button class="rp-row ${danger ? 'danger' : ''}" type="button" onclick="${action}"><span class="rp-t">${esc(title)}</span><span class="rp-s">${esc(sub)}</span></button>`;
}


let ROOM_FOLD_OPEN = false;
function toggleRoomFold() {
    ROOM_FOLD_OPEN = !ROOM_FOLD_OPEN;
    const f = document.getElementById('rfFold');
    if (f) f.classList.toggle('collapsed', !ROOM_FOLD_OPEN);
}
function roomPersonaPane(c) {
    const kv = [['说话风格', c.speech], ['与你的关系', c.relation], ['个人签名', c.sig], ['背景', c.backstory]].filter(x => x[1]);
    return `
        <div class="rf-fold${ROOM_FOLD_OPEN ? '' : ' collapsed'}" id="rfFold"><button class="rf-head" type="button" onclick="toggleRoomFold()"><span class="rp-label rf-title">基本信息</span><svg class="rf-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><div class="rf-body"><div class="rp-quote">${esc(c.persona || '还没有设定人设，点击下方编辑。')}</div>
${kv.length ? `<div class="rp-kv">${kv.map(x => `<div class="rp-kv-row"><span>${x[0]}</span><b>${esc(x[1])}</b></div>`).join('')}</div>` : ''}</div></div>
        <div class="rp-label">编辑</div>
        ${rpRow('人设与信息', '性格、说话风格与背景', "roomAction('persona')")}
        ${rpRow('联系人资料', '姓名、状态、头像与封面', "roomAction('contact')")}`;
}
function roomBeautyPane(c) {
    return roomBeautyPaneInner(c) + avOptsHtml(c);
}
function cfoldHtml(id, title, inner) {
    const open = !!CFOLD_OPEN[id];
    return `<div class="cf-fold ${open ? 'open' : ''}"><button class="cf-head" type="button" onclick="toggleCFold('${id}')"><span>${title}</span><svg class="cf-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><div class="cf-body">${inner}</div></div>`;
}
function toggleCFold(id) { CFOLD_OPEN[id] = !CFOLD_OPEN[id]; renderRoomPane(); }
function avOptsOf(c) {
    const o = (c && c.avOpts) || {};
    return { me: o.me !== false, them: o.them !== false, scope: o.scope === 'all' ? 'all' : 'group' };
}
function setAvOpt(key, val) {
    const c = curMemContact(); if (!c) return;
    const o = avOptsOf(c);
    o[key] = key === 'scope' ? (val === 'all' ? 'all' : 'group') : !!val;
    c.avOpts = o;
    persistContacts(); renderThread(); renderRoomPane();
}
function avOptsHtml(c) {
    const o = avOptsOf(c);
    return `<div class="rp-label">头像显示</div>
        <div class="rp-opt">
            <div class="rp-opt-row"><div><div class="rp-opt-t">显示我的头像</div><div class="rp-opt-s">我发的消息旁边显示头像</div></div><button class="rp-switch ${o.me ? 'on' : ''}" type="button" onclick="setAvOpt('me', ${!o.me})" aria-label="显示我的头像"></button></div>
            <div class="rp-opt-row"><div><div class="rp-opt-t">显示对方头像</div><div class="rp-opt-s">对方的消息旁边显示头像</div></div><button class="rp-switch ${o.them ? 'on' : ''}" type="button" onclick="setAvOpt('them', ${!o.them})" aria-label="显示对方头像"></button></div>
            <div class="rp-opt-row"><div><div class="rp-opt-t">每条消息都显示</div><div class="rp-opt-s">${o.scope === 'all' ? '当前：每条消息都显示头像' : '当前：每组第一条显示头像'}</div></div><button class="rp-switch ${o.scope === 'all' ? 'on' : ''}" type="button" onclick="setAvOpt('scope', '${o.scope === 'all' ? 'group' : 'all'}')" aria-label="每条消息都显示"></button></div>
        </div>`;
}
function roomBeautyPaneInner(c) {
    const hasBg = !!(c.beauty && c.beauty.bg);
    return `
        <div class="rp-label">预览</div>
        ${rpRow('预览效果', '点开看看这段聊天的样子', 'openCssPreview()')}
        <div class="rp-label">聊天背景</div>
        ${rpRow(hasBg ? '更换背景图片' : '选择背景图片', '会自动压缩，适合手机', 'pickRoomBg()')}
        ${hasBg ? rpRow('恢复默认背景', '去掉这个聊天的背景图', 'clearRoomBg()', true) : ''}
        ${cfoldHtml('css', 'CSS 样式', `
        <div class="css-box">
            <div class="css-hint">写在这里的样式只作用于这个聊天，例如 <code>.bubble{border-radius:4px}</code></div>
            <textarea id="roomCssInput" class="css-input" spellcheck="false" autocapitalize="off" placeholder="例如 .mrow.me .bubble{background:#111;color:#fff}" oninput="previewRoomCss(this.value)"></textarea>
            <div class="css-tpl">${Object.keys(CSS_TEMPLATES).map(k => `<button class="css-tpl-btn" type="button" onclick="fillRoomCss('${k}')">${CSS_TEMPLATE_LABELS[k]}</button>`).join('')}</div>
        </div>
        <div class="css-actions"><button class="css-clear" type="button" onclick="clearRoomCss()">清空</button><button class="css-save" type="button" onclick="saveRoomCss()">保存样式</button></div>`)}
        `;
}
function fillRoomCss(key) {
    const ta = document.getElementById('roomCssInput');
    if (!ta || !CSS_TEMPLATES[key]) return;
    ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/, '\n') : '') + CSS_TEMPLATES[key];
    previewRoomCss(ta.value);
}
function previewRoomCss(v) { applyChatCss(v); }
function saveRoomCss() {
    const c = CONTACTS.find(x => x.id === activeId);
    const ta = document.getElementById('roomCssInput');
    if (!c || !ta) return;
    c.beauty = Object.assign({}, c.beauty || {}, { css: ta.value });
    delete c.beauty.bubble;
    persistContacts();
    applyRoomBeauty(c);
    toast('样式已保存');
}
function clearRoomCss() {
    const ta = document.getElementById('roomCssInput');
    if (ta) ta.value = '';
    saveRoomCss();
}
function ensurePreviewStyle() {
    let st = document.getElementById('chatPreviewCss');
    if (!st) { st = document.createElement('style'); st.id = 'chatPreviewCss'; document.head.appendChild(st); }
    return st;
}
/* 预览：收成一个按钮，点开后是一段示例聊天，样式和真实聊天一样 */
function openCssPreview() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    const bg = c.beauty && c.beauty.bg ? `background-image:url("${c.beauty.bg}");` : '';
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span>预览效果</span></div>
        <div class="css-preview-box" id="cssPreviewScope" style="${bg}">
            <div class="mrow"><div class="bubble g-single">你今天想吃什么？</div></div>
            <div class="mrow me"><div class="bubble g-single">都可以，你来决定吧</div></div>
            <div class="mrow"><div class="bubble g-single">那就火锅吧！</div></div>
            <div class="mrow me"><div class="bubble g-single">好，我去订位</div></div>
        </div>
        <button class="identity-cancel" type="button" onclick="closeSheet()">关闭</button>`);
    ensurePreviewStyle().textContent = scopeCss(chatCssOf(c), '#cssPreviewScope');
}
function clearRoomBg() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    c.beauty = Object.assign({}, c.beauty || {});
    delete c.beauty.bg;
    persistContacts(); applyRoomBeauty(c); renderRoomPane(); toast('已恢复默认背景');
}
function compressImage(file, maxSide) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const s = Math.min(1, (maxSide || 900) / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * s));
                const h = Math.max(1, Math.round(img.height * s));
                const cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                cv.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(cv.toDataURL('image/jpeg', 0.82));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
function pickRoomBg() {
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        const c = CONTACTS.find(x => x.id === activeId);
        if (!file || !c) return;
        try {
            const url = await compressImage(file, 900);
            c.beauty = Object.assign({}, c.beauty || {}, { bg: url });
            persistContacts(); applyRoomBeauty(c); renderRoomPane();
            toast('背景已更新');
        } catch (e) { toast('图片读取失败，请换一张试试'); }
    };
    input.click();
}
function openRoomSettings() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    ensureRoomView();
    renderRoomHero(c);
    setRoomTab(0);
    roomEl.classList.add('open');
}
function roomAction(kind) {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) { closeRoomView(); return; }
    if (kind === 'persona') { closeRoomView(); openPersonaEditor(c.id); return; }
    if (kind === 'contact') { closeRoomView(); openContactEditor(c.id); return; }
    if (kind === 'clear') {
        askConfirm('清空聊天记录', `清空与「${c.name}」的全部消息？联系人会保留。`, '清空', () => {
            c.msgs = []; c.unread = 0; c.time = '';
            persistContacts(); renderThread(); renderChats(); renderRoomPane();
            toast('聊天记录已清空');
        });
        return;
    }
    if (kind === 'remove') {
        askConfirm('从消息列表移除', `「${c.name}」会从消息列表移除，联系人不会删除。`, '移除', () => {
            CHAT_IDS = CHAT_IDS.filter(x => x !== c.id); persistChatIds();
            closeRoomView(); closeChat(); toast('已从消息列表移除');
        });
    }
}

function renderRoomPane() {
    stopRoomTicker();
    const c = CONTACTS.find(x => x.id === activeId);
    const pane = document.getElementById('roomPane');
    if (!c || !pane) return;
    if (ROOM_TAB === 0) { pane.innerHTML = roomChatPane(c); startRoomTicker(); }
    else if (ROOM_TAB === 1) pane.innerHTML = roomPersonaPane(c);
    else {
        pane.innerHTML = roomBeautyPane(c);
        const ta = document.getElementById('roomCssInput');
        if (ta) ta.value = chatCssOf(c);
    }
}

function closeRoomView() {
    stopRoomTicker();
    if (roomEl) roomEl.classList.remove('open');
}

function roomChatPane(c) {
    const a = activeIdentity();
    const o = chatOptsOf(c);
    return `
        ${rpRow('记忆区', '上下文、自动总结与记忆', 'openMemoryPage()')}
        <div class="rp-label">消息条数</div>
        <div class="rp-opt">
            <div class="rp-opt-row">
                <div><div class="rp-opt-t">最少</div><div class="rp-opt-s">每次回复至少几条</div></div>
                <div class="rp-stepper"><button class="rp-step" type="button" onclick="stepRoomOpt('min', -1)">−</button><input class="rp-val" type="number" min="1" inputmode="numeric" value="${o.min}" onchange="setRoomOpt('min', this.value)" onkeydown="if(event.key==='Enter')this.blur()"><button class="rp-step" type="button" onclick="stepRoomOpt('min', 1)">+</button></div>
            </div>
            <div class="rp-opt-row">
                <div><div class="rp-opt-t">最多</div><div class="rp-opt-s">每次回复最多几条</div></div>
                <div class="rp-stepper"><button class="rp-step" type="button" onclick="stepRoomOpt('max', -1)">−</button><input class="rp-val" type="number" min="1" inputmode="numeric" value="${o.max}" onchange="setRoomOpt('max', this.value)" onkeydown="if(event.key==='Enter')this.blur()"><button class="rp-step" type="button" onclick="stepRoomOpt('max', 1)">+</button></div>
            </div>
            <div class="rp-opt-row">
                <div><div class="rp-opt-t">一次性发出</div><div class="rp-opt-s">${o.batch ? '一次全部出现，没有动画' : '一条一条出现'}</div></div>
                <button class="rp-switch ${o.batch ? 'on' : ''}" type="button" onclick="toggleRoomBatch()" aria-label="一次性发出"></button>
            </div>
        </div>
        <div class="rp-stats">
            <div class="rp-stat"><b>${c.msgs.length}</b><span>条消息</span></div>
            <div class="rp-stat"><b>${esc(a ? a.name : ME.name)}</b><span>当前身份</span></div>
        </div>
        <div class="rp-label">时间</div>
        ${roomTimerHtml(c)}
        <div class="rp-label">管理这段聊天</div>
        ${rpRow('清空聊天记录', '只删除消息，联系人会保留', "roomAction('clear')", true)}
        ${rpRow('从消息列表移除', '不会删除联系人', "roomAction('remove')", true)}`;
}

/* ---------------- 朋友圈 ---------------- */
function loadStoredMoments() { try { const v = JSON.parse(localStorage.getItem(MOMENT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
function persistMoments() { try { localStorage.setItem(MOMENT_KEY, JSON.stringify(POSTS)); } catch (e) { toast('保存失败：存储空间可能不足'); } }
function loadMomentBg() { try { return localStorage.getItem(MOMENT_BG_KEY) || ''; } catch (_) { return ''; } }
function loadMomentAvatar() { try { return localStorage.getItem(MOMENT_AVATAR_KEY) || ''; } catch (_) { return ''; } }
const DEFAULT_MOMENT_AVATAR = 'assets/朋友圈/朋友圈头像.jpg';
function momentAuthor(by) {
    if (by && by !== 'self') { const c = IDENTITIES.find(x => x.id === by); if (c) return { name: c.name, avatar: c.avatar }; }
    return { name: ME.name, avatar: MOMENT_AVATAR || DEFAULT_MOMENT_AVATAR };
}
function momentAvatarHtml(a, size) {
    const img = a.avatar ? `<img src="${a.avatar}" alt="" onerror="this.remove()">` : '';
    return `<div class="av ${size || 'md'} g1">${img}<span class="ini">${esc(initOf(a.name))}</span></div>`;
}
function fmtMoment(t) { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }




function pickMomentCover() {
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            MOMENT_BG = await compressImage(file, 1100);
            try { localStorage.setItem(MOMENT_BG_KEY, MOMENT_BG); } catch (_) { toast('背景太大，已只在本次生效'); }
            renderMoments(); toast('背景已更新');
        } catch (e) { toast('图片读取失败，请换一张试试'); }
    };
    input.click();
}

/* ---------------- 通讯录文件夹图标：填充的磨砂玻璃 + 包着成员头像 ---------------- */


/* ---------------- 聊天室设置：时间控制条（实时 / 自定义计时） ---------------- */
let ROOM_TICKER = null;
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtFullTime(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function toLocalInput(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function roomTimerHtml(c) {
    const t = c.timer || {};
    const mode = t.mode === 'count' ? 'count' : 'clock';
    const seg = `<div class="rt-seg"><button class="rt-seg-btn ${mode === 'clock' ? 'on' : ''}" type="button" onclick="setRoomTimerMode('clock')">实时时间</button><button class="rt-seg-btn ${mode === 'count' ? 'on' : ''}" type="button" onclick="setRoomTimerMode('count')">自定义计时</button></div>`;
    let body;
    if (mode === 'clock') {
        body = `<div class="rt-big" id="roomTimeBig">--:--:--</div><div class="rt-sub" id="roomTimeSub"></div>`;
    } else if (t.start) {
        body = `<div class="rt-big" id="roomTimeBig"></div><div class="rt-sub" id="roomTimeSub">从 ${fmtFullTime(t.start)} 开始计数</div>
            <div class="rt-set"><input id="roomTimerInput" class="rt-input" type="datetime-local" step="1" value="${toLocalInput(t.start)}"><button class="rt-save" type="button" onclick="saveRoomTimer()">修改并重新计数</button></div>`;
    } else {
        body = `<div class="rt-big" id="roomTimeBig">未设置</div><div class="rt-sub" id="roomTimeSub">选一个时间（精确到秒），保存后开始计数</div>
            <div class="rt-set"><input id="roomTimerInput" class="rt-input" type="datetime-local" step="1" value=""><button class="rt-save" type="button" onclick="saveRoomTimer()">开始计数</button></div>`;
    }
    return `${seg}<div class="rt-card">${body}</div>`;
}
function tickRoomTimer() {
    const c = CONTACTS.find(x => x.id === activeId);
    const big = document.getElementById('roomTimeBig');
    const sub = document.getElementById('roomTimeSub');
    if (!c || !big) return;
    const t = c.timer || {};
    if (t.mode !== 'count') {
        const d = new Date();
        big.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
        if (sub) sub.textContent = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} · 星期${'日一二三四五六'[d.getDay()]}`;
    } else if (t.start) {
        const diff = Date.now() - t.start;
        const s = Math.floor(Math.abs(diff) / 1000);
        const days = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
        big.textContent = `${diff < 0 ? '还有 ' : ''}${days}天 ${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
        if (sub) sub.textContent = `${diff < 0 ? '距离' : '已过去，'}从 ${fmtFullTime(t.start)} ${diff < 0 ? '开始' : '开始计数'}`;
    }
}
function startRoomTicker() { stopRoomTicker(); tickRoomTimer(); ROOM_TICKER = setInterval(tickRoomTimer, 1000); }
function stopRoomTicker() { if (ROOM_TICKER) { clearInterval(ROOM_TICKER); ROOM_TICKER = null; } }
function setRoomTimerMode(mode) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    c.timer = Object.assign({}, c.timer || {}, { mode });
    persistContacts(); renderRoomPane();
}
function saveRoomTimer() {
    const c = CONTACTS.find(x => x.id === activeId);
    const input = document.getElementById('roomTimerInput');
    if (!c || !input) return;
    const ms = input.value ? new Date(input.value).getTime() : NaN;
    if (isNaN(ms)) { toast('请先选择一个时间'); return; }
    c.timer = { mode: 'count', start: ms };
    persistContacts(); renderRoomPane(); toast('已开始计数');
}



function ensureFullMask() {
    let m = document.getElementById('fullMask');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'fullMask';
    m.innerHTML = '<div class="fm-body"></div>';
    (document.querySelector('.messages-app') || document.body).appendChild(m);
    return m;
}
function closeFullMask() {
    const m = document.getElementById('fullMask');
    if (m) m.classList.remove('show');
}




/* ---------------- 线条图标（替代手机上显示不出来的字符） ---------------- */
const ICO_PATHS = {
    bar: '<rect x="3" y="15" width="18" height="5" rx="2.5"/>',
    appearance: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>',
    clear: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>',
    id: '<rect x="3" y="6" width="18" height="12" rx="3"/><line x1="8" y1="12" x2="16" y2="12"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.3-3.6-8.5s1.2-6 3.6-8.5z"/>',
    lock2: '<rect x="5.5" y="10.5" width="13" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15.5" r="1.2"/>',
    users: '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0"/><circle cx="17.2" cy="9.2" r="2.6"/><path d="M16.6 13.5a5 5 0 0 1 4.9 5.2"/>',
    check: '<polyline points="5 12.5 10 17.5 19 7.5"/>',
    back: '<polyline points="15 18 9 12 15 6"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    person: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>'
};
function icoSvg(name) { return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_PATHS[name] || ''}</svg>`; }

/* ---------------- 添加聊天（选择方式） ---------------- */
function renderContactAddChoice() {
    contactIdShell('Add Chat', '添加聊天', `
        <p class="cid-desc">选择一种方式，开始新的对话</p>
        ${sheetRow(icoSvg('person'), '直接添加', '从已创建的联系人中选择', 'showDirectContactList()')}
        ${sheetRow(icoSvg('id'), '输入 ID 添加', '输入对方的 ID 并确认资料', 'showContactIdEntry()')}
        <div class="cid-footnote">联系人 ID 格式：ID- 加 8 位大写字母或数字</div>
        <button class="identity-cancel" type="button" onclick="closeContactIdModal()">取消</button>`);
}

/* ---------------- 聊天软件设置：图标改为线条图标 ---------------- */
function openChatsSettings() {
    const glass = document.getElementById('tabbar').classList.contains('glass');
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span>聊天软件设置</span></div>`
        + sheetRow(icoSvg('bar'), '底栏样式', glass ? '当前：玻璃底栏（点击切换为经典）' : '当前：经典黑色底栏（点击切换为玻璃）', "softAction('bar')")
        + sheetRow(icoSvg('appearance'), '外观设置', '消息页的样式（1 默认 / 2 标签页）', "softAction('appearance')")
        + sheetRow(icoSvg('clear'), '清空全部聊天记录', '保留联系人，删除所有消息', "softAction('clearAll')")
        + '<button class="identity-cancel" type="button" onclick="closeSheet()">关闭</button>');
}

/* ---------------- 发朋友圈：重新设计的白色全屏界面 ---------------- */
function updateMomentCount() {
    const t = document.getElementById('momentInput');
    const c = document.getElementById('momentCount');
    if (t && c) c.textContent = t.value.length + '/300';
}


/* ---------------- 文件夹：白色磨砂玻璃，标签角在正面，里面叠加成员卡片 ---------------- */


function folderTileIcon(fid) {
    const n = Math.min(folderMembers(fid).length, 4);
    let layers = '';
    for (let i = 0; i < n; i++) layers += `<i class="ft-layer" style="--k:${i}"></i>`;
    return `${layers}${FOLDER_SVG}<i class="ft-tab"></i><b class="ft-body"></b>`;
}







/* ---------------- 朋友圈：可见度 / 点赞 / 评论 ---------------- */

function toggleMomentLike(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    p.likes = p.likes || [];
    const i = p.likes.indexOf(ACTIVE_ID);
    if (i >= 0) p.likes.splice(i, 1); else p.likes.push(ACTIVE_ID);
    persistMoments(); renderMoments();
}
function revealMomentCover(el) {
    if (el) el.classList.add('tip-on');
}
/* 长按评论：删除（确认后） */
function bindCommentLongPress() {
    const root = document.querySelector('.messages-app'); if (!root || root.dataset.cmtBound) return;
    root.dataset.cmtBound = '1';
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { clearTimeout(timer); timer = null; };
    root.addEventListener('pointerdown', e => {
        const line = e.target.closest && e.target.closest('.mf-cmt-line[data-pid]');
        if (!line) return;
        sx = e.clientX; sy = e.clientY; cancel();
        timer = setTimeout(() => { timer = null; deleteCommentAt(line.dataset.pid, Number(line.dataset.ci)); }, 500);
    });
    root.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => root.addEventListener(t, cancel));
    root.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mf-cmt-line[data-pid]')) e.preventDefault(); });
}
function deleteCommentAt(pid, ci) {
    const p = POSTS.find(x => x.id === pid); if (!p || !p.comments || !p.comments[ci]) return;
    askConfirm('删除这条评论？', '删除后无法恢复', '删除', () => {
        p.comments.splice(ci, 1);
        persistMoments(); renderMoments();
    });
}
/* 朋友圈头像 / 背景：点击弹出玻璃框（恢复内置 / 本地上传） */
let MOMENT_PICK_KIND = null;
function openMomentPick(kind) {
    const host = document.querySelector('.messages-app'); if (!host) return;
    closeMomentPick();
    MOMENT_PICK_KIND = kind;
    const back = document.createElement('div'); back.id = 'momentPickBack';
    back.addEventListener('pointerdown', closeMomentPick);
    const box = document.createElement('div'); box.id = 'momentPick'; box.className = 'mp-pick';
    box.innerHTML = `<div class="mp-pick-t">${kind === 'avatar' ? '朋友圈头像' : '朋友圈背景'}</div>`
        + `<button class="mp-pick-b" type="button" onclick="momentRestore()">恢复内置</button>`
        + `<button class="mp-pick-b primary" type="button" onclick="momentUpload()">本地上传</button>`;
    host.appendChild(back); host.appendChild(box);
}
function closeMomentPick() { ['momentPickBack', 'momentPick'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); }); }
function momentRestore() {
    if (MOMENT_PICK_KIND === 'avatar') { MOMENT_AVATAR = ''; try { localStorage.removeItem(MOMENT_AVATAR_KEY); } catch (_) {} }
    else { MOMENT_BG = ''; try { localStorage.removeItem(MOMENT_BG_KEY); } catch (_) {} }
    closeMomentPick(); renderMoments(); toast('已恢复内置');
}
function momentUpload() {
    const kind = MOMENT_PICK_KIND;
    closeMomentPick();
    const input = makeFilePicker();
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
        const file = input.files && input.files[0]; if (!file) return;
        try {
            const url = await compressImage(file, kind === 'avatar' ? 512 : 1100);
            if (kind === 'avatar') { MOMENT_AVATAR = url; try { localStorage.setItem(MOMENT_AVATAR_KEY, url); } catch (_) { toast('头像太大，已只在本次生效'); } }
            else { MOMENT_BG = url; try { localStorage.setItem(MOMENT_BG_KEY, url); } catch (_) { toast('背景太大，已只在本次生效'); } }
            renderMoments(); toast(kind === 'avatar' ? '头像已更新' : '背景已更新');
        } catch (e) { toast('图片读取失败，请换一张试试'); }
    };
    input.click();
}
function toggleMomentCmt(id) {
    const pp = POSTS.find(x => x.id === id);
    const curOpen = MOMENT_CMT_OPEN[id] !== undefined ? MOMENT_CMT_OPEN[id] : !!(pp && pp.comments && pp.comments.length);
    MOMENT_CMT_OPEN[id] = !curOpen;
    renderMoments();
}
function sendMomentCommentInline(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    const input = document.getElementById('mfInl-' + id);
    const text = input ? input.value.trim() : '';
    if (!text) { toast('写点什么再发送吧'); return; }
    p.comments = p.comments || [];
    p.comments.push({ by: ACTIVE_ID, text, t: Date.now() });
    MOMENT_CMT_OPEN[id] = true;
    persistMoments(); renderMoments();
}
function openMomentComments(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    const list = (p.comments || []).map(c => {
        const a = momentAuthor(c.by);
        return `<div class="mf-cmt-row">${momentAvatarHtml(a, 'sm')}<div><b>${esc(a.name)}</b><p>${esc(c.text)}</p></div></div>`;
    }).join('') || '<div class="mf-cmt-empty">还没有评论，来说第一句吧</div>';
    openSheet(`<div class="sheet-title">评论</div>
        <div class="mf-cmt-list">${list}</div>
        <div class="mf-cmt-bar"><input id="mfCmtInput" class="mf-cmt-input" maxlength="120" placeholder="写评论…"><button class="mf-cmt-send" type="button" onclick="sendMomentComment('${id}')">发送</button></div>`);
}
function sendMomentComment(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    const input = document.getElementById('mfCmtInput');
    const text = input ? input.value.trim() : '';
    if (!text) { toast('写点什么再发送吧'); return; }
    p.comments = p.comments || [];
    p.comments.push({ by: ACTIVE_ID, text, t: Date.now() });
    persistMoments(); renderMoments(); openMomentComments(id);
}







/* ---------------- 朋友圈：谁可以看（可见度设置） ---------------- */
let MOMENT_VIS = 'public';        // public = 所有人，self = 仅自己，some = 部分联系人
let MOMENT_VIS_TO = [];
function visIcon() { return icoSvg(MOMENT_VIS === 'public' ? 'globe' : (MOMENT_VIS === 'self' ? 'lock2' : 'users')); }
function momentVisText(p) {
    if (p.vis === 'self') return '仅自己可见';
    if (p.vis === 'some') return `${(p.visTo || []).length} 位联系人可见`;
    return '';
}
function ensureVisPanel() {
    let p = document.getElementById('mcVisPanel');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'mcVisPanel';
    document.getElementById('fullMask').appendChild(p);
    return p;
}

function openMomentVisPanel() {
    renderMomentVisPanel();
    ensureVisPanel().classList.add('show');
}
function closeMomentVisPanel() {
    const p = document.getElementById('mcVisPanel');
    if (p) p.classList.remove('show');
    const b = document.getElementById('mcVis');
    if (b) b.innerHTML = visIcon();
}
function setMomentVis(k) { MOMENT_VIS = k; MV_ANIM = true; renderMomentVisPanel(); }
function toggleMomentVisTo(id) {
    const i = MOMENT_VIS_TO.indexOf(id);
    if (i >= 0) MOMENT_VIS_TO.splice(i, 1); else MOMENT_VIS_TO.push(id);
    renderMomentVisPanel();
}





let MOMENT_VIS_Q = '';
let MV_ANIM = false;
/* 长按消息菜单：天使图标 */
const MM_ICONS = {
    edit: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.2 17.8 3 21l3.3-1.1L18.9 7.3a2.15 2.15 0 0 0-3-3L4.2 17.8Z"/>
      <path d="m14.8 5.4 3.8 3.8"/>
      <path d="M7.2 15.1 9 16.9"/>
      <path d="M5.1 8.2c-1.2-1.1-1.1-2.8.1-3.7 1.2-.9 2.8-.5 3.4.8.5-1.3 2.2-1.7 3.4-.8"/>
      <path d="M8.3 5.3c.1 1.1-.3 1.8-1.1 2.5"/>
    </svg>`,
    copy: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8.2" y="8.2" width="11.2" height="12" rx="2.2"/>
      <path d="M15.2 8.1V5.7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9.1a2 2 0 0 0 2 2h2.1"/>
      <path d="M12 12.1h3.6M13.8 10.3v3.6"/>
      <path d="M16.7 3.2c.9.1 1.7.8 1.9 1.7"/>
    </svg>`,
    del: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 7.2h15"/>
      <path d="M9 7.2V5.1c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6v2.1"/>
      <path d="m6.4 7.5.8 11.4c.1 1.1.8 1.8 1.9 1.8h5.8c1.1 0 1.8-.7 1.9-1.8l.8-11.4"/>
      <path d="M10 10.5v6.3M14 10.5v6.3"/>
      <path d="M3.8 3.6c1.2-.7 2.5-.6 3.4.4"/>
      <path d="M4.1 2.5v2.1h2.1"/>
    </svg>`,
    multi: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3.3 7.1 1.8 1.8 3.2-3.4"/>
      <path d="M11.3 6.7h9.1"/>
      <path d="m3.3 13.1 1.8 1.8 3.2-3.4"/>
      <path d="M11.3 12.7h9.1"/>
      <path d="m3.3 19.1 1.8 1.8 3.2-3.4"/>
      <path d="M11.3 18.7h9.1"/>
      <path d="M15.8 2.8c1.1.1 2 .7 2.4 1.7"/>
    </svg>`
};
let MM_SHEET_TAG = false;
let CFOLD_OPEN = {};
const MM = { timer: null, sx: 0, sy: 0, mode: 'menu', sel: new Set(), idx: null, bound: false };
const MV_ICO = {
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16.4 13.5a5 5 0 0 1 4.8 5.2"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" x2="16.6" y1="21" y2="16.6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="5 12 10 17 19 7"/></svg>'
};
function mvListHtml() {
    const q = MOMENT_VIS_Q.trim().toLowerCase();
    const list = CONTACTS.filter(c => !q || String(c.name).toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q));
    if (!list.length) return '<div class="mv-empty">No records found.</div>';
    return list.map(c => {
        const on = MOMENT_VIS_TO.indexOf(c.id) >= 0;
        return `<div class="mv-row ${on ? 'on' : ''}" onclick="toggleMomentVisTo('${c.id}')">${avatar(c, 'sm')}<div class="mv-info"><div class="mv-name">${esc(c.name)}</div><div class="mv-sub">${esc(c.id)}</div></div><div class="mv-chk">${on ? '×' : ''}</div></div>`;
    }).join('');
}
function renderMomentVisPanel() {
    const p = ensureVisPanel();
    const tickets = [
        { k: 'public', zh: '公开', en: 'Public', no: 'NO.1', tag: 'PUB', ico: MV_ICO.globe, pm: 'Valid' },
        { k: 'some', zh: '部分', en: 'Limited', no: 'NO.2', tag: 'LTD', ico: MV_ICO.users, pm: 'Select' },
        { k: 'self', zh: '私密', en: 'Private', no: 'NO.3', tag: 'PRV', ico: MV_ICO.lock, pm: 'Sealed' }
    ];
    const animNow = MV_ANIM; MV_ANIM = false;
    const ticketHtml = tickets.map(t => `
        <div class="mv-ticket ${MOMENT_VIS === t.k ? 'on' : ''} ${animNow && MOMENT_VIS === t.k ? 'anim' : ''}" onclick="setMomentVis('${t.k}')">
            <div class="mv-stamp"><div class="mv-stamp-in">
                <div class="mv-hd"><span>${t.no}</span><span>${t.tag}</span></div>
                <div class="mv-ico">${t.ico}</div>
                <div class="mv-tx"><div class="mv-t">${t.zh}</div><div class="mv-s">${t.en}</div></div>
                <div class="mv-postmark">${t.pm}</div>
            </div></div>
        </div>`).join('');
    p.innerHTML = `
        <div class="mv-top"><button class="mv-back" type="button" onclick="closeMomentVisPanel()" aria-label="返回">${MV_ICO.back}</button><div class="mv-title">Visibility</div><div class="mv-sp"></div></div>
        <div class="mv-tickets">${ticketHtml}</div>
        <div class="mv-manifest ${MOMENT_VIS === 'some' ? 'show' : ''}">
            <div class="mv-mhead">
                <div><div class="mv-mt">Manifest</div><div class="mv-mc">Selected: <span>${String(MOMENT_VIS_TO.length).padStart(2, '0')}</span></div></div>
                <div class="mv-tools"><button class="mv-tool" type="button" onclick="selectAllMomentVis()">All</button><button class="mv-tool" type="button" onclick="clearMomentVis()">Clear</button></div>
            </div>
            <div class="mv-scroll">
                <div class="mv-search">${MV_ICO.search}<input id="mvSearch" placeholder="Search ID or Name..." value="${esc(MOMENT_VIS_Q)}" oninput="filterMomentVis(this.value)"></div>
                <div id="mvList">${mvListHtml()}</div>
            </div>
        </div>
        <div class="mv-foot"><button class="mv-save" type="button" onclick="closeMomentVisPanel()">${MV_ICO.check}<span>Confirm</span></button></div>`;
}
function filterMomentVis(q) {
    MOMENT_VIS_Q = String(q || '');
    const box = document.getElementById('mvList');
    if (box) box.innerHTML = mvListHtml();
}
function selectAllMomentVis() {
    MOMENT_VIS_TO.length = 0;
    CONTACTS.forEach(c => MOMENT_VIS_TO.push(c.id));
    renderMomentVisPanel();
}
function clearMomentVis() {
    MOMENT_VIS_TO.length = 0;
    renderMomentVisPanel();
}

/* ---------------- 朋友圈：真正的照片上传 ---------------- */
let PENDING_IMGS = [];            // 发布前选好的照片（压缩后的 dataURL）
const MOMENT_IMG_CACHE = {};      // 已经从数据库读出来的照片
function renderPendingPhotos() {
    const box = document.getElementById('mcPhotos');
    if (!box) return;
    const thumbs = PENDING_IMGS.map((u, i) => `<div class="mc-ph"><img src="${u}" alt=""><button class="mc-ph-x" type="button" onclick="removePendingPhoto(${i})" aria-label="移除">×</button></div>`).join('');
    const add = PENDING_IMGS.length < 9 ? `<button class="mc-ph-add" type="button" onclick="pickMomentPhotos()" aria-label="添加照片">${icoSvg('plus')}</button>` : '';
    box.innerHTML = thumbs + add;
}
function removePendingPhoto(i) {
    PENDING_IMGS.splice(i, 1);
    renderPendingPhotos();
}
function pickMomentPhotos() {
    const room = 9 - PENDING_IMGS.length;
    if (room <= 0) { toast('最多选 9 张照片'); return; }
    const input = makeFilePicker();
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
        const files = Array.from(input.files || []).slice(0, room);
        for (const f of files) {
            try { PENDING_IMGS.push(await compressImage(f, 1200)); }
            catch (e) { toast('有一张照片读取失败'); }
        }
        renderPendingPhotos();
    };
    input.click();
}
function hydrateMomentImages() {
    if (!window.DB) return;
    document.querySelectorAll('#momentsFrame img[data-mkey]').forEach(img => {
        const k = img.dataset.mkey;
        if (MOMENT_IMG_CACHE[k]) { img.src = MOMENT_IMG_CACHE[k]; return; }
        Promise.resolve(window.DB.load(k, '')).then(v => {
            if (v) { MOMENT_IMG_CACHE[k] = v; img.src = v; }
        });
    });
}

function renderMoments() {
    const frame = document.getElementById('momentsFrame');
    if (!frame) return;
    const who = momentAuthor(ACTIVE_ID);
    const bgStyle = MOMENT_BG ? `background-image:url('${MOMENT_BG}');` : '';
    const cards = POSTS.slice().sort((a, b) => b.t - a.t).map(p => {
        const a = momentAuthor(p.by);
        const likes = p.likes || [];
        const cmts = p.comments || [];
        const imgs = p.imgs || [];
        const liked = likes.indexOf(ACTIVE_ID) >= 0;
        const preview = cmts.slice(0, 2).map((c, ci) => `<div class="mf-cmt-line" data-pid="${p.id}" data-ci="${ci}"><b class="mf-cmt-name">${esc(momentAuthor(c.by).name)}</b><span class="mf-cmt-time">${fmtMoment(c.t)}</span><span class="mf-cmt-text">${esc(c.text)}</span></div>`).join('');
        const photos = imgs.length ? `<div class="mf-imgs n${Math.min(imgs.length, 3)}">${imgs.map(k => `<img class="mf-img" data-mkey="${k}" alt="">`).join('')}</div>` : '';
        const cmtOpen = MOMENT_CMT_OPEN[p.id] !== undefined ? MOMENT_CMT_OPEN[p.id] : cmts.length > 0;
        const cmtBlock = cmtOpen
            ? `<div class="mf-cmts mf-cmts-open">${cmts.map((c, ci) => `<div class="mf-cmt-line" data-pid="${p.id}" data-ci="${ci}"><b class="mf-cmt-name">${esc(momentAuthor(c.by).name)}</b><span class="mf-cmt-time">${fmtMoment(c.t)}</span><span class="mf-cmt-text">${esc(c.text)}</span></div>`).join('') || '<div class="mf-cmt-none">还没有评论，来说第一句吧</div>'}<div class="mf-inline-bar"><input id="mfInl-${p.id}" class="mf-inline-input" maxlength="120" placeholder="写评论…"><button class="mf-inline-send" type="button" onclick="sendMomentCommentInline('${p.id}')">发送</button></div></div>`
            : (cmts.length ? `<div class="mf-cmts" onclick="toggleMomentCmt('${p.id}')">${preview}${cmts.length > 2 ? `<span class="mf-cmt-more">查看全部 ${cmts.length} 条评论</span>` : ''}</div>` : '');
        return `<div class="mf-card">
            <div class="mf-card-head">${momentAvatarHtml(a, 'sm')}
                <div class="mf-card-who"><b>${esc(a.name)}</b><span>${fmtMoment(p.t)}${momentVisText(p) ? ' · ' + momentVisText(p) : ''}</span></div>
                <button class="mf-del" type="button" onclick="deleteMoment('${p.id}')">删除</button>
            </div>
            ${p.text ? `<div class="mf-card-text">${esc(p.text)}</div>` : ''}
            ${photos}
            <div class="mf-card-foot">
                <button class="mf-act ${liked ? 'on' : ''}" type="button" onclick="toggleMomentLike('${p.id}')">${HEART}<span>${likes.length || ''}</span></button>
                <button class="mf-act" type="button" onclick="toggleMomentCmt('${p.id}')">${CHAT_ICON}<span>${cmts.length || ''}</span></button>
            <span class="mf-time-br">${fmtMoment(p.t)}</span></div>
            ${cmtBlock}
        </div>`;
    }).join('');
    frame.innerHTML = `
        <div class="mf-cover" style="${bgStyle}" onclick="openMomentPick('cover')"></div>
        <div class="mf-me"><div class="mf-avatar" onclick="openMomentPick('avatar')">${momentAvatarHtml(who, 'lg')}</div><div class="mf-name">${esc(who.name)}</div></div>
        <div class="mf-posts">${cards || '<div class="mf-empty">还没有朋友圈，点右上角的加号发一条吧</div>'}</div>`;
    hydrateMomentImages();
}

function openMomentComposer() {
    const m = ensureFullMask();
    const who = momentAuthor(ACTIVE_ID);
    MOMENT_VIS = 'public';
    MOMENT_VIS_TO = [];
    PENDING_IMGS = [];
    m.querySelector('.fm-body').innerHTML = `
        <div class="mc-top"><span class="mc-title">${PLANE_SVG}<span>发朋友圈</span></span></div>
        <div class="mc-who">${momentAvatarHtml(who, 'sm')}<span class="mc-who-name">${esc(who.name)}</span></div>
        <textarea id="momentInput" class="mc-text" maxlength="300" placeholder="这一刻在想什么…" oninput="updateMomentCount()"></textarea>
        <div class="mc-photos" id="mcPhotos"></div>
        <div class="mc-count" id="momentCount">0/300</div>
        <div class="mc-line"></div>
        <div class="mc-rail">
            <button class="mc-tab" id="mcVis" type="button" onclick="openMomentVisPanel()" title="谁可以看">${visIcon()}</button>
            <button class="mc-tab" type="button" onclick="closeFullMask()" title="取消">${icoSvg('close')}</button>
            <button class="mc-tab mc-go" type="button" onclick="publishMoment()" title="发布">${PLANE_SVG}</button>
        </div>`;
    m.classList.add('show');
    renderPendingPhotos();
    setTimeout(() => { const t = document.getElementById('momentInput'); if (t) t.focus(); }, 150);
}

async function publishMoment() {
    const ta = document.getElementById('momentInput');
    const text = ta ? ta.value.trim() : '';
    if (!text && !PENDING_IMGS.length) { toast('写点什么或选张照片吧'); return; }
    const id = 'm' + Date.now();
    const imgs = [];
    for (let i = 0; i < PENDING_IMGS.length; i++) {
        const key = `mimg_${id}_${i}`;
        const ok = window.DB ? await window.DB.save(key, PENDING_IMGS[i]) : false;
        if (!ok) {
            for (const k of imgs) { if (window.DB) await window.DB.remove(k); }
            toast('照片保存失败，请试试少选几张');
            return;
        }
        imgs.push(key);
    }
    POSTS.unshift({ id, text, t: Date.now(), by: ACTIVE_ID, vis: MOMENT_VIS,
        visTo: MOMENT_VIS === 'some' ? MOMENT_VIS_TO.slice() : [],
        likes: [], comments: [], imgs });
    PENDING_IMGS = [];
    persistMoments(); closeFullMask(); renderMoments(); toast('已发布');
}

function deleteMoment(id) {
    askConfirm('删除朋友圈', '删除这条朋友圈？', '删除', async () => {
        const p = POSTS.find(x => x.id === id);
        if (p && p.imgs && window.DB) { for (const k of p.imgs) await window.DB.remove(k); }
        POSTS = POSTS.filter(x => x.id !== id);
        persistMoments(); renderMoments();
    });
}

/* ---------------- 初始化 ---------------- */
CONTACTS = CONTACTS.map(normalizeContact);
applyActiveThreads();
renderContacts();
applySelf();
syncSettingsMode();
loadProfileCard();
loadSettingsName();
preloadDefaultImages();
bindCommentLongPress();
bindMsgMenu();
bindChatDrop();
bindChatDropSwipe();
bindChatDropOutside();
applyTheme(THEME);
initComposerGesture();

const __messagesHandlers = {toast:toast, focusSearch:focusSearch, switchTab:switchTab, fabAction:fabAction, exitMessagesToHome:exitMessagesToHome, syncSettingsMode:syncSettingsMode, openContactEditor:openContactEditor, closeContactEditor:closeContactEditor, openPersonaEditor:openPersonaEditor, openNewContact:openNewContact, openNewContactFromCurrentFolder:openNewContactFromCurrentFolder, showPersona:showPersona, fillPersona:fillPersona, previewPersonaName:previewPersonaName, closePersonaEditor:closePersonaEditor, openAccountMgr:openAccountMgr, renderAccountList:renderAccountList, savePersona:savePersona, loadImage:loadImage, saveContact:saveContact, deleteContact:deleteContact, renderMoments:renderMoments, openChat:openChat, closeChat:closeChat, renderThread:renderThread, showTyping:showTyping, onKey:onKey, onTyping:onTyping, autoGrow:autoGrow, updateSend:updateSend, toggleQuickMenu:toggleQuickMenu, initComposerGesture:initComposerGesture, applyTheme:applyTheme, renderThemeList:renderThemeList, openAppearance:openAppearance, closeAppearance:closeAppearance, folderMembers:folderMembers, folderName:folderName, renderContacts:renderContacts, openFolderDetail:openFolderDetail, closeFolderDetail:closeFolderDetail, renderFolderDetail:renderFolderDetail, openFolderPicker:openFolderPicker, closeFolderPicker:closeFolderPicker, renderFolderPicker:renderFolderPicker, toggleFolderMember:toggleFolderMember, openFolderNew:openFolderNew, closeFolderNew:closeFolderNew, saveFolderNew:saveFolderNew, deleteFolder:deleteFolder, wheelList:wheelList, renderWheel:renderWheel, applyWheel:applyWheel, updateWheelUI:updateWheelUI, wheelAngle:wheelAngle, wheelDown:wheelDown, wheelMove:wheelMove, wheelUp:wheelUp, wheelTap:wheelTap, openWheelCard:openWheelCard, fdCards:fdCards, fdCurrentIndex:fdCurrentIndex, fdGo:fdGo, fdStep:fdStep, updateFdArrows:updateFdArrows, closeSync:closeSync, openApiSettings:openApiSettings, openContactIdModal:openContactIdModal, renderContactAddChoice:renderContactAddChoice, showContactIdEntry:showContactIdEntry, showDirectContactList:showDirectContactList, directAddContact:directAddContact, closeContactIdModal:closeContactIdModal, previewContactById:previewContactById, addChatByContactId:addChatByContactId, openRoomSettings:openRoomSettings, roomAction:roomAction, openChatsSettings:openChatsSettings, softAction:softAction, closeSheet:closeSheet, openSelfPersona:openSelfPersona, pullReply:pullReply, sendMessage:sendMessage, startSync:startSync, importDeviceContacts:importDeviceContacts, renderChats:renderChats, closeRoomView:closeRoomView, popupOk:popupOk, popupCancel:popupCancel, startProfileEdit:startProfileEdit, closeAccountMgr:closeAccountMgr, resetFrameScroll:resetFrameScroll, openSidebar:openSidebar, closeSidebar:closeSidebar, showLoginMask:showLoginMask, hideLoginMask:hideLoginMask, renderStrip:renderStrip, pickAccount:pickAccount, refreshAccounts:refreshAccounts, doLogin:doLogin, directLogin:directLogin, finishLogin:finishLogin, applyPersona:applyPersona, applySelf:applySelf, openIdentitySheet:openIdentitySheet, pickIdentity:pickIdentity, openIdentityEditor:openIdentityEditor, deleteIdentity:deleteIdentity, pickPersonaAvatar:pickPersonaAvatar, exitContactLogin:exitContactLogin, setRoomTab:setRoomTab, pickRoomBg:pickRoomBg, clearRoomBg:clearRoomBg, fillRoomCss:fillRoomCss, previewRoomCss:previewRoomCss, saveRoomCss:saveRoomCss, clearRoomCss:clearRoomCss, openCssPreview:openCssPreview, openMomentComposer:openMomentComposer, publishMoment:publishMoment, deleteMoment:deleteMoment, pickMomentCover:pickMomentCover, setRoomTimerMode:setRoomTimerMode, saveRoomTimer:saveRoomTimer, closeFullMask:closeFullMask, updateMomentCount:updateMomentCount, toggleMomentLike:toggleMomentLike, openMomentComments:openMomentComments, sendMomentComment:sendMomentComment, openMomentVisPanel:openMomentVisPanel, closeMomentVisPanel:closeMomentVisPanel, setMomentVis:setMomentVis, toggleMomentVisTo:toggleMomentVisTo, pickMomentPhotos:pickMomentPhotos, removePendingPhoto:removePendingPhoto, pickProfilePhoto:pickProfilePhoto, togglePersonaFold:togglePersonaFold, saveChatCount:saveChatCount, setRoomOpt:setRoomOpt, stepRoomOpt:stepRoomOpt, toggleRoomBatch:toggleRoomBatch, toggleMomentCmt:toggleMomentCmt, sendMomentCommentInline:sendMomentCommentInline, revealMomentCover:revealMomentCover, tapContactCard:tapContactCard, toggleRoomFold:toggleRoomFold, pickPersonaImport:pickPersonaImport, openMemoryPage:openMemoryPage, closeMemoryPage:closeMemoryPage, memSetNum:memSetNum, memToggleAuto:memToggleAuto, memSummarizeRange:memSummarizeRange, memSaveInstr:memSaveInstr, memRestoreDefault:memRestoreDefault, memSavePreset:memSavePreset, memUpdatePreset:memUpdatePreset, memDeletePreset:memDeletePreset, memSwitchPreset:memSwitchPreset, memSetPriority:memSetPriority, memDelete:memDelete, openMomentPick:openMomentPick, momentRestore:momentRestore, momentUpload:momentUpload, filterMomentVis:filterMomentVis, selectAllMomentVis:selectAllMomentVis, clearMomentVis:clearMomentVis, setAvOpt:setAvOpt, toggleCFold:toggleCFold, toggleChatPrompt:toggleChatPrompt, toggleChatDrop:toggleChatDrop};
for (const [name, fn] of Object.entries(__messagesHandlers)) window[name] = fn;
};
