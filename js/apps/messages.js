/* 本脚本的地址（在文件最外层读取，供找 assets 用） */
const MSG_SCRIPT_URL = (document.currentScript && document.currentScript.src) || '';
window.initMessagesModule = function(root) {
if (root) root.classList.add('messages-app');

/* ---------------- 数据（黑白灰） ---------------- */
let CONTACTS = loadStoredContacts();
/* ================= 朋友圈频率（设置 → 管理我 下方）================= */
const MF_KEY = 'whatever_messages_moment_freq_v1';
const mfEsc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const mfName = c => String((c && (c.remark || c.name)) || '');
const mfInitial = c => (mfName(c).trim().charAt(0) || '?').toUpperCase();
const MF_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/></svg>';
function mfLoad() {
    let c = null; try { c = JSON.parse(localStorage.getItem(MF_KEY) || 'null'); } catch (_) {}
    c = c || {};
    window.MESSAGES_PHOTO_WORDS = typeof c.words === 'number' ? c.words : 30;
    return {
        on: c.on !== false,
        pct: typeof c.pct === 'number' ? c.pct : 30,
        maxH: typeof c.maxH === 'number' ? c.maxH : 24,
        img: c.img !== false,
        words: typeof c.words === 'number' ? c.words : 30,
        per: c.per || {}
    };
}
function mfSave(cfg) { try { localStorage.setItem(MF_KEY, JSON.stringify(cfg)); } catch (_) {} }
function mfAllowed(c) {
    const cfg = mfLoad();
    return cfg.on && !(cfg.per[c.id] && cfg.per[c.id].on === false);
}
function mfField(c, f) {
    const cfg = mfLoad(); const p = cfg.per[c.id] || {};
    return typeof p[f] === 'number' ? p[f] : cfg[f];
}
function mfPctOf(c) { return mfField(c, 'pct'); }
function mfLastPostH(c) {
    const mine = POSTS.filter(p => p.by === c.id);
    if (!mine.length) return null;
    return (Date.now() - Math.max(...mine.map(p => p.t || 0))) / 3600000;
}

function postContactMoment(c, text, comments, meta) {
    const photos = ((meta && meta.photos) || []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 9);
    const post = { id: 'm' + Date.now() + Math.random().toString(36).slice(2, 5), text, t: Date.now(), by: c.id, vis: (meta && meta.vis) || 'all', visTo: ((meta && meta.visTo) || []).map(n => (CONTACTS.find(x => x.name === n) || {}).id).filter(Boolean), likes: [], comments: [], imgs: [], imgDesc: photos, interactionFetched: false };
    if (meta && meta.stolenKeys && meta.stolenKeys.length) {
        post.imgs = meta.stolenKeys.slice(0, 1); post.stolen = true;
        post.imgDesc = photos.map((d, i) => (i === 0 ? '' : d));
    }
    POSTS.unshift(post);
    persistMoments();
    renderMoments();
    if (meta && meta.chatShotKey) { post.chatShotKey = meta.chatShotKey; persistMoments(); renderMoments(); }
    else if (meta && meta.chatShot) { post.chatShot = snapshotChatRoom(c, meta.shotN); post.chatShotWith = meta.shotTitle || momentUserName(); persistMoments(); renderMoments(); }
    const excerpt = (text || '').trim() || '一张照片';
    addCommonMemory(c, `{char}发了一条朋友圈（${excerpt}）`, post.id);
    if (c.memories && c.memories[0]) c.memories[0].postLink = post.id;
    if (photos.length) addCommonMemory(c, post.stolen ? `{char}拿走了{user}的照片：${photos.join('；')}` : `{char}发的照片：${photos.join('；')}`, post.id);
    if (meta && (meta.chatShot || meta.chatShotKey) && c.memories && c.memories[0]) {
        c.memories[0].kind = 'shot';
        const log = snapshotChatRoom(c, meta.shotN);
        c.memories[0].chatLog = log;
        c.memories[0].text = '{char}发了一条朋友圈（聊天室截图：' + log.slice(-6).map(m => (m.me ? '{char}' : '{user}') + '：' + m.text).join(' | ') + '）';
    }
    persistContacts();
    if (Array.isArray(comments)) return applyAutoComments(post, comments);
    scheduleMomentFetch(post);
    return [];
}

/* 自主发帖的评论：和帖子一次请求生成，直接写入，不再额外调取 */
function applyAutoComments(post, list) {
    const commenters = [];
    (list || []).forEach(cm => {
        const v = CONTACTS.find(x => x.id !== post.by && x.name === cm.name && momentVisibleTo(post, x));
        if (!v) return;
        post.comments = post.comments || [];
        post.comments.push({ by: v.id, text: cm.text, t: Date.now() });
        recordCommentMemory(v, post, cm.text);
        commenters.push(v);
    });
    persistContacts(); persistMoments(); renderMoments();
    return commenters;
}

/* 评论计入共同记忆：评论者一定记；如果被评论的是联系人发的帖子，被评论的联系人也记 */
function recordCommentMemory(commenter, post, text) {
    const excerpt = momentTextWithNames(post.text).trim() || '一张照片';
    const author = CONTACTS.find(x => x.id === post.by && x.id !== commenter.id) || null;
    if (!author) {
        addCommonMemory(commenter, `{char}在{user}的朋友圈（${excerpt}）下评论：${text}`, post.id);
        return;
    }
    addCommonMemory(commenter, `{char}在${author.name}的朋友圈（${excerpt}）下评论：${text}`, post.id);
    addCommonMemory(author, `${commenter.name}在{char}的朋友圈（${excerpt}）下评论：${text}`, post.id);
}
/* 朋友圈互动在聊天室里显示为独立事件胶囊，不混入普通台词或旁白。 */
function applyChatMomentInteractions(c, list) {
    if (!c || !Array.isArray(list) || !list.length) return [];
    const byId = new Map(POSTS.map(p => [String(p.id), p]));
    let changed = false;
    let actedAny = false;
    list.forEach(it => {
        const p = byId.get(String(it.postId || '').trim());
        if (!p || !momentVisibleTo(p, c)) return;
        p.likes = p.likes || []; p.comments = p.comments || [];
        const already = p.comments.some(cm => String(cm.by) === String(c.id));
        let acted = false;
        if (it.like && !p.likes.includes(c.id)) { p.likes.push(c.id); addCommonMemory(c, `{char}在${momentAuthor(p.by).name}的朋友圈下点赞`, p.id); acted = true; }
        if (it.comment && !already) {
            const target = CONTACTS.find(x => x.name === it.to && x.id !== c.id && momentVisibleTo(p, x));
            p.comments.push({ by: c.id, text: String(it.comment), t: Date.now(), to: target ? target.id : undefined });
            recordCommentMemory(c, p, it.comment); acted = true;
        }
        if (acted) { addMomentChatEvent(c, `${dispName(c)}在${dispName(momentAuthor(p.by))}的朋友圈下${it.comment ? '评论了' : '点赞了'}`, p.id); changed = true; actedAny = true; }
    });
    if (changed) { persistContacts(); persistMoments(); renderMoments(); }
    return actedAny ? [c] : [];
}

function addMomentChatEvent(c, text, postId) {
    if (!c || !text) return;
    c.msgs = c.msgs || [];
    c.msgs.push({ me: false, text: String(text), t: nowTime(), ts: Date.now(), momentEvent: true, momentPostId: postId ? String(postId) : '' });
    c.time = nowTime();
    if (activeId !== c.id) c.unread = (c.unread || 0) + 1;
    persistContacts();
    if (activeId === c.id) renderThread({ noAnim: true });
    renderChats();
}

async function momentSyncAll() {
    const cfg = mfLoad();
    if (!cfg.on) { toast('朋友圈频率已关闭'); return; }
    if (!window.MessagesAPI || !MessagesAPI.isConfigured()) { toast('请先在「设置 → API」保存接口配置'); return; }
    const btn = document.getElementById('mfSyncBtn');
    if (btn) btn.classList.add('spin');
    MOMENT_UNSEEN = false;
    refreshChatBadge();
    showMomentLoading();
    let posted = 0;
    const allCommenters = [], allPosters = [];
    try {
        for (const c of CONTACTS) {
            if (!mfAllowed(c)) continue;
            const lastH = mfLastPostH(c);
            const pct = Math.round(mfPctOf(c));
            // 概率由代码掷骰子决定：中了才让模型发新朋友圈；没中也可能回看旧朋友圈做点赞评论
            const hitPost = Math.random() * 100 < pct;
            // 联系人之间没有世界连线时，互相不可见，也不能互相评论或回复。
            const viewers = CONTACTS.filter(x => x.id !== c.id && worldTiedPair(c.id, x.id)).map(x => ({ name: x.name, persona: x.persona || '' }));
            const oldOn = ((cfg.per[c.id] || {}).oldOn !== false) && cfg.oldOn !== false;
            const feed = oldOn ? POSTS.filter(p => momentVisibleTo(p, c)).slice(0, 20).map(p => ({
                id: p.id, imgKeys: keysOfPost(p), author: momentAuthor(p.by).name, text: plainMentions(p.text),
                comments: (p.comments || []).slice(-8).map(cm => `${momentAuthor(cm.by).name}：${plainMentions(cm.text)}`).join('；') || '无',
                commentItems: (p.comments || []).slice(-8).map(cm => ({ name: momentAuthor(cm.by).name, text: plainMentions(cm.text) }))
            })) : [];
            if (!hitPost && !feed.length) continue;
            const stealPool = stealPoolOf(c).slice(0, 4);
            await primeKeys([...stealPool.map(x => x.key), ...feed.flatMap(p => p.imgKeys || [])]);
            const r = await MessagesAPI.momentAutoPost(c, (c.msgs || []).slice(-30), pct, { lastH, viewers, feed, allowPhoto: cfg.img !== false, stealable: stealPool.map(x => x.desc || '一张照片'), stealableKeys: stealPool.map(x => x.key), decided: hitPost, recentPosts: POSTS.filter(p => p.by === c.id).slice(0, 5).map(p => plainMentions(p.text)).filter(Boolean) });
            if (r && (r.post || (r.interactions && r.interactions.length))) {
                const shotKey = r.post && r.chatShot ? await saveChatShot(c) : null;
                const stolen = r.post ? pickStolenPhoto(r, stealPool) : null;
                if (r.post && (r.text || (r.photos && r.photos.length) || r.chatShot || stolen)) allCommenters.push(...postContactMoment(c, r.text, r.comments || [], { vis: r.vis, visTo: r.visTo, photos: r.photos || [], chatShot: r.chatShot && !shotKey, chatShotKey: shotKey, shotN: r.shotN, shotTitle: r.shotTitle, stolenKeys: stolen ? stolen.imgs : null, stolenDesc: stolen ? stolen.desc : '' }));
                const byId = new Map(POSTS.map(p => [p.id, p]));
                (r.interactions || []).forEach(it => {
                    const p = byId.get(String(it.postId || '').trim());
                    if (!p || !momentVisibleTo(p, c)) return;
                    p.likes = p.likes || []; p.comments = p.comments || [];
                    const excerpt = momentTextWithNames(p.text).trim() || '一张照片';
                    let didLike = false;
                    let didComment = false;
                    const existingIds = new Set(p.comments.map(cm => cm.by));
                    if (it.like && !p.likes.includes(c.id)) {
                        p.likes.push(c.id);
                        addCommonMemory(c, `{char}在${momentAuthor(p.by).name}的朋友圈（${excerpt}）下点赞`, p.id);
                        didLike = true;
                    }
                    if (it.comment && !existingIds.has(c.id)) {
                        const target = CONTACTS.find(x => x.name === it.to && x.id !== c.id && momentVisibleTo(p, x));
                        p.comments.push({ by: c.id, text: String(it.comment).replace(/@\[user\]/g, '@[user]'), t: Date.now(), to: target ? target.id : undefined });
                        recordCommentMemory(c, p, it.comment);
                        if (target) addCommonMemory(target, `${c.name}在${momentAuthor(p.by).name}的朋友圈（${excerpt}）下回复了${target.name}：${it.comment}`, p.id);
                        didComment = true;
                    }
                    // 旧朋友圈互动也必须进入聊天室胶囊；点赞和评论都算一次新事件。
                    if (didLike || didComment) {
                        const action = didLike && didComment ? '点赞并评论了' : (didLike ? '点赞了' : '评论了');
                        addMomentChatEvent(c, `${dispName(c)}在${dispName(momentAuthor(p.by))}的朋友圈下${action}`, p.id);
                        allCommenters.push(c);
                    }
                });
                persistContacts(); persistMoments(); renderMoments();
                allPosters.push(c); posted++;
            }
        }
    } catch (e) { showApiError(e); }
    if (btn) btn.classList.remove('spin');
    notePosterDone([...new Map([...allPosters, ...allCommenters].map(c => [c.id, c])).values()]);
    toast(posted ? `调取完成，${posted} 位联系人发了朋友圈` : '调取完成，这次没有人发朋友圈');
}

function mfSliderHTML(k, f, label, val, lo, hi, unit, first) {
    const pct = ((val - lo) / (hi - lo) * 100).toFixed(1);
    return `<div class="mf-slide ${first ? '' : 'mf-dash'}"><div class="mf-slide-head"><span>${label}</span><b>${val}${unit}</b></div>
        <input type="range" min="${lo}" max="${hi}" value="${val}" data-mf-k="${k}" data-mf-f="${f}" data-mf-u="${unit}" style="--p:${pct}%"></div>`;
}
function mfBlockHTML(k, v) {
    return mfSliderHTML(k, 'pct', '发布概率 <button class="mf-info mf-pct-info" data-mf-info aria-label="说明">!</button>', v.pct, 0, 100, '%', true)
         + '<div class="mf-note" hidden>每次调取时，联系人按这个概率考虑要不要发朋友圈，最终还是要看聊天记录。</div>'
         + `<div class="mf-extra-row"><span>允许回看旧朋友圈</span><button class="mf-info" data-mf-old-info aria-label="会消耗额度">!</button><button class="mf-tg ${v.oldOn !== false ? 'on' : ''}" data-mf-old-tg="${k}" aria-label="允许回看旧朋友圈"></button></div>`
         + '<div class="mf-note" data-mf-old-note hidden>开启后，聊天过程中或空闲调取时，可能额外调用模型，让该联系人随机点赞或评论以前可见的朋友圈，会消耗 API 额度。</div>';
}
function mfRowHTML(c, cfg) {
    const per = cfg.per[c.id] || {};
    const on = per.on !== false;
    const v = { pct: mfField(c, 'pct'), oldOn: ((cfg.per[c.id] || {}).oldOn) !== false };
    return `<div class="mf-ctc ${on ? '' : 'off'}">
        <div class="mf-ctc-top"><div class="mf-ava mf-ava-img"><img src="${mfEsc(c.avatar || DEFAULT_CHAR_AVATAR)}" alt="" onerror="this.parentNode.textContent='${mfEsc(mfInitial(c))}'"></div>
          <div class="mf-ctc-name">${mfEsc(mfName(c))}</div>
          <button class="mf-tg ${on ? 'on' : ''}" data-mf-tg="${c.id}" aria-label="开关"></button></div>
        ${mfBlockHTML(c.id, v)}
      </div>`;
}
function renderMomentFreq() {
    const cfg = mfLoad();
    const body = document.getElementById('mfBody');
    if (!body) return;
    const g = { pct: cfg.pct, oldOn: cfg.oldOn !== false };
    window.MESSAGES_PHOTO_WORDS = cfg.words;
    body.innerHTML = `
        <div class="mf-label">全局默认</div>
        <div class="mf-panel">
          <div class="mf-row"><div class="mf-row-text"><div class="mf-row-t">允许联系人自主发朋友圈</div></div>
            <button class="mf-tg ${cfg.on ? 'on' : ''}" data-mf-tg="global" aria-label="开关"></button></div>
          ${mfBlockHTML('global', g)}
          <div class="mf-extra-row"><span>允许发图片</span><button class="mf-tg ${cfg.img !== false ? 'on' : ''}" data-mf-img-tg="1" aria-label="允许发图片"></button></div>
          ${mfSliderHTML('global', 'words', '照片字数', cfg.words, 5, 80, '字', false)}
        </div>
        <div class="mf-label">每个联系人</div>
        <div class="mf-panel">${CONTACTS.length ? CONTACTS.map((c, i) => (i ? '<div class="mf-dash-line"></div>' : '') + mfRowHTML(c, cfg)).join('') : '<div class="mf-empty">还没有联系人</div>'}</div>
        <div class="mf-hint">每次调取都会先读取聊天记录，再结合概率决定是否发。</div>`;
}

function openMomentFreq() {
    const panel = document.getElementById('mfPanel');
    if (!panel) { toast('朋友圈频率面板还没准备好，请稍等'); return; }
    panel.classList.add('open');
    const tb = document.getElementById('tabbar'); if (tb) tb.classList.add('hide');
    try { renderMomentFreq(); }
    catch (e) {
        console.error('[朋友圈频率]', e);
        const body = document.getElementById('mfBody');
        const msg = e && e.name ? `${e.name}: ${e.message}` : String(e);
        const where = e && e.stack ? String(e.stack).split('\n').slice(0, 2).join(' / ') : '';
        if (body) body.innerHTML = `<div class="mf-hint" style="word-break:break-all">加载失败<br>${mfEsc(msg)}<br>${mfEsc(where)}</div>`;
    }
}
function closeMomentFreq() {
    document.getElementById('mfPanel').classList.remove('open');
    document.getElementById('tabbar').classList.remove('hide');
}

function mfInit() {
    const host = document.getElementById('phone');
    if (!host) return;   // 手机外框还没渲染好，等下一次变化再挂
    const oldSec = document.getElementById('mfPanel');
    if (oldSec && oldSec.parentElement !== host) oldSec.remove();
    if (!document.getElementById('mfPanel')) {
        const sec = document.createElement('section');
        sec.className = 'edit-view'; sec.id = 'mfPanel';
        sec.innerHTML = `<header class="edit-header"><button class="action" onclick="closeMomentFreq()">返回</button><span class="title">朋友圈频率</span><span style="width:44px"></span></header>
          <div class="edit-body mf-body" id="mfBody"></div>`;
        host.appendChild(sec);
        sec.addEventListener('click', e => {
            const old = e.target.closest('[data-mf-old-tg]');
            if (old) {
                const cfg = mfLoad(), k = old.dataset.mfOldTg;
                if (k === 'global') cfg.oldOn = cfg.oldOn === false;
                else { cfg.per[k] = cfg.per[k] || {}; cfg.per[k].oldOn = cfg.per[k].oldOn === false; }
                mfSave(cfg); renderMomentFreq(); return;
            }
            const info = e.target.closest('[data-mf-old-info]');
            if (info) { const n = info.closest('.mf-ctc, .mf-panel').querySelector('[data-mf-old-note]'); if (n) n.hidden = !n.hidden; return; }
            const im = e.target.closest('[data-mf-img-tg]');
            if (im) { const cfg = mfLoad(); cfg.img = cfg.img === false; mfSave(cfg); renderMomentFreq(); return; }
            const t = e.target.closest('[data-mf-tg]'); if (!t) return;
            const cfg = mfLoad(), k = t.dataset.mfTg;
            if (k === 'global') cfg.on = !cfg.on;
            else { cfg.per[k] = cfg.per[k] || {}; cfg.per[k].on = cfg.per[k].on === false; }
            mfSave(cfg); renderMomentFreq();
        });
        sec.addEventListener('input', e => {
            const r = e.target.closest('[data-mf-k]'); if (!r) return;
            const cfg = mfLoad(), k = r.dataset.mfK, f = r.dataset.mfF, v = +r.value;
            const tgt = k === 'global' ? cfg : (cfg.per[k] = cfg.per[k] || {});
            tgt[f] = v;
            mfSave(cfg);
            const lo = +r.min, hi = +r.max;
            r.style.setProperty('--p', ((v - lo) / (hi - lo) * 100) + '%');
            r.parentElement.querySelector('b').textContent = v + r.dataset.mfU;
        });
        sec.addEventListener('click', e => {
            const info = e.target.closest('[data-mf-info]'); if (!info) return;
            const note = info.closest('.mf-panel').querySelector('.mf-note');
            if (note) note.hidden = !note.hidden;
        });
        sec.addEventListener('change', e => {
            if (e.target.closest('[data-mf-k]')) renderMomentFreq();
        });
    }
    const acctEl = document.querySelector('[onclick*="openAccountMgr"]');
    const acct = acctEl && (acctEl.closest('.settings-item') || acctEl);
    if (acct && !document.getElementById('mfRow')) {
        const row = document.createElement('div');
        row.id = 'mfRow'; row.className = 'settings-item mf-settings-row';
        row.setAttribute('onclick', 'openMomentFreq()');
        row.innerHTML = `<button class="mf-sync" id="mfSyncBtn" aria-label="调取" onclick="event.stopPropagation();momentSyncAll()">${MF_ICON}</button>
          <div class="mf-si-text"><div class="mf-si-title">朋友圈频率</div><div class="mf-si-sub">调取时，联系人发朋友圈的概率</div></div><span class="mf-chev">›</span>`;
        acct.insertAdjacentElement('afterend', row);
    }
}
mfInit();
new MutationObserver(() => mfInit()).observe(document.body, { childList: true, subtree: true });
let CHAT_IDS = loadStoredChatIds();
let CHAT_MAP = loadStoredChatMap();
const ME_DEFAULT = { name: 'Kitty Angel', id: '1004', status: '오늘도 날개를 펴는 중', sig: '작은 구름 위에서 안부를 전해요', avatar: '', persona: '', speech: '', relation: '', backstory: '', replies: [] };
let ME = loadStoredMe();
const SIDE = { open: false, pickedId: null, liveId: null };
const IDN_KEY = 'whatever_messages_identities_v2';
let IDENTITIES = loadStoredIdentities();
let pendingPersonaAvatar = null;
const ACTIVE_KEY = 'whatever_messages_active_identity_v1';
let ACTIVE_ID = 'self';
const DELETED_NAMES_KEY = 'whatever_messages_deleted_names_v1';
let DELETED_NAMES = (() => { try { return JSON.parse(localStorage.getItem(DELETED_NAMES_KEY) || '{}') || {}; } catch (_) { return {}; } })();
function saveDeletedNames() { try { localStorage.setItem(DELETED_NAMES_KEY, JSON.stringify(DELETED_NAMES)); } catch (_) {} }
const MOMENT_REPLY = {};   // 朋友圈 id -> 正在回复的那条评论 { by, t, text }
const MOMENT_CARD_HTML = new Map();   // 朋友圈 id -> 上一次渲染的卡片 html（没变就不重建）
const MOMENT_CMT_ENTER = {};          // 刚展开的评论区，只在这一刻播放展开动画
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
function loadStoredMe() {
    try {
        const v = JSON.parse(localStorage.getItem('whatever_messages_me_v1') || 'null');
        const res = Object.assign({}, ME_DEFAULT, v && typeof v === 'object' ? v : {});
        if (!res.avatar) {
            const extAv = localStorage.getItem('whatever_user_avatar') || localStorage.getItem('user_avatar') || '';
            if (extAv) res.avatar = extAv;
        }
        return res;
    } catch (_) { return Object.assign({}, ME_DEFAULT); }
}
function persistMe() {
    try {
        localStorage.setItem('whatever_messages_me_v1', JSON.stringify(ME));
        if (ME.avatar) localStorage.setItem('whatever_user_avatar', ME.avatar);
    } catch (e) { toast('保存失败：存储空间可能不足'); console.error(e); }
}


function loadStoredChatIds(){ try { const v=JSON.parse(localStorage.getItem('whatever_messages_chat_ids_v1')||'[]'); return Array.isArray(v)?v.map(String):[]; } catch(_){ return []; } }


const MOMENT_KEY = 'whatever_messages_moments_v1';
const MOMENT_BG_KEY = 'whatever_messages_moments_bg_v1';
const MOMENT_AVATAR_KEY = 'whatever_messages_moments_avatar_v1';
let POSTS = loadStoredMoments();
let MOMENT_BG = loadMomentBg();
let MOMENT_AVATAR = loadMomentAvatar();
let MOMENT_CMT_OPEN = {};
let MOMENT_INPUT_OPEN = {};   // 输入框与发送按钮是否显示（默认隐藏）
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

/* 所有防xx的默认开启列表（与 CHAT_PROMPT_OPTS 保持一致；放在函数里，避免启动时 TDZ 报错） */
function defaultPromptOpts() { return ['ai', 'greasy']; }
/* ---------------- 本地真实数据：没有内置假联系人 ---------------- */
function loadStoredContacts() {
    try {
        const raw = localStorage.getItem('whatever_messages_contacts_v1');
        let list = raw ? JSON.parse(raw) : [];
        // 一次性迁移：防油腻默认开启，已存在的联系人也补上（只改 promptOpts，其他字段原样保留）
        if (Array.isArray(list) && !localStorage.getItem('whatever_messages_greasy_default_v1')) {
            list.forEach(c => {
                if (!c || typeof c !== 'object') return;
                const opts = Array.isArray(c.promptOpts) ? c.promptOpts : [];
                if (!opts.includes('greasy')) c.promptOpts = opts.concat('greasy');
            });
            localStorage.setItem('whatever_messages_contacts_v1', JSON.stringify(list));
            localStorage.setItem('whatever_messages_greasy_default_v1', '1');
        }
        // 一次性迁移：所有防xx（防八股 / 防油腻 / 防威胁 / 防假性安慰 / 防超雄）默认开启，已存在的联系人补齐；之后手动关闭会正常保存
        if (Array.isArray(list) && !localStorage.getItem('whatever_messages_prompt_all_on_v1')) {
            list.forEach(c => {
                if (!c || typeof c !== 'object') return;
                const opts = Array.isArray(c.promptOpts) ? c.promptOpts : [];
                c.promptOpts = Array.from(new Set(opts.concat(defaultPromptOpts())));
            });
            localStorage.setItem('whatever_messages_contacts_v1', JSON.stringify(list));
            localStorage.setItem('whatever_messages_prompt_all_on_v1', '1');
        }
        // 一次性迁移 v2：防威胁 / 防假性安慰 / 防超雄 改为默认关闭，已存在的联系人统一重置为「只开防八股、防油腻」，之后手动开关会正常保存
        if (Array.isArray(list) && !localStorage.getItem('whatever_messages_prompt_defaults_v2')) {
            list.forEach(c => {
                if (!c || typeof c !== 'object') return;
                c.promptOpts = defaultPromptOpts();
            });
            localStorage.setItem('whatever_messages_contacts_v1', JSON.stringify(list));
            localStorage.setItem('whatever_messages_prompt_defaults_v2', '1');
        }
        return Array.isArray(list) ? list.map(normalizeContact) : [];
    } catch (e) { console.warn('[Messages] 联系人读取失败', e); return []; }
}
function normalizeContact(c) {
    return { id: String(c.id || ('contact-' + Date.now() + '-' + Math.random().toString(36).slice(2,8))), name: String(c.name || '未命名联系人'), avatar: c.avatar || '', ini: String(c.ini || c.name || '?').slice(0,1).toUpperCase(), g: c.g || 'g1', cover: c.cover || '', online: false, unread: Number(c.unread || 0), time: c.time || '', status: c.status || '联系人', beauty: (c.beauty && typeof c.beauty === 'object') ? c.beauty : {}, msgs: [], threads: (c.threads && typeof c.threads === 'object') ? c.threads : (Array.isArray(c.msgs) && c.msgs.length ? { self: c.msgs } : {}), replies: Array.isArray(c.replies) ? c.replies.map(String).filter(Boolean) : [], phone: c.phone || '', email: c.email || '', folder: c.folder || null, persona: c.persona || '', remark: c.remark || '', sig: c.sig || '', speech: c.speech || '', relation: c.relation || '', backstory: c.backstory || '', chatOpts: (c.chatOpts && typeof c.chatOpts === 'object') ? c.chatOpts : null, fresh: !!c.fresh, mem: (c.mem && typeof c.mem === 'object') ? c.mem : null, memories: Array.isArray(c.memories) ? c.memories : [], memCursor: Number(c.memCursor || 0), avOpts: (c.avOpts && typeof c.avOpts === 'object') ? c.avOpts : null, promptOpts: Array.isArray(c.promptOpts) ? c.promptOpts : defaultPromptOpts(), greasyEntries: Array.isArray(c.greasyEntries) ? c.greasyEntries : [], hearts: Array.isArray(c.hearts) ? c.hearts : [] };
}


function loadStoredFolders() { try { const v=JSON.parse(localStorage.getItem('whatever_messages_folders_v1') || '[]'); return Array.isArray(v) ? v.filter(x=>x && x.id && x.name).map(x=>({id:String(x.id),name:String(x.name)})) : []; } catch (_) { return []; } }
function persistFolders() { try { localStorage.setItem('whatever_messages_folders_v1', JSON.stringify(FOLDERS)); } catch(e) { console.warn('[Messages] 文件夹保存失败',e); } }
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
    preview.innerHTML = `<div class="contact-id-person">${avatar(c, 'md')}<div class="contact-id-preview-info"><strong>${esc(dispName(c))}</strong><span>${esc(c.status || '联系人')}</span><code>ID · ${esc(c.id)}</code></div><span class="contact-id-found">已匹配</span></div>`;
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
    if (name === 'moments') { renderMoments(); MOMENT_UNSEEN = false; refreshChatBadge(); if (!momentFetchBusy) hideMomentBubble(); }
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
            `<button class="story ${c.unread ? 'unread' : ''}" title="${esc(dispName(c))}" onclick="openChat('${c.id}')">${avatar(c, 'lg')}</button>`).join('');
    if (storyEl.dataset.html !== storyHtml) { storyEl.innerHTML = storyHtml; storyEl.dataset.html = storyHtml; }
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const list = chatContacts.filter(c => !q || c.name.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q) || c.msgs.some(m => m.text.toLowerCase().includes(q)));
    const unreadTotal = chatContacts.reduce((s, c) => s + c.unread, 0);
    document.querySelector('.messages-app').querySelectorAll('.chatsSub').forEach(el => el.textContent = unreadTotal ? `${unreadTotal} unread` : 'All caught up');
    document.getElementById('tabDot').style.display = unreadTotal ? 'block' : 'none';
    const box = document.getElementById('chatList');
    const setListHtml = h => { if (box.dataset.html !== h) { box.innerHTML = h; box.dataset.html = h; } };
    if (!list.length) { setListHtml('<div class="empty"><div style="font-size:28px;margin-bottom:12px">＋</div><strong>还没有聊天</strong><p style="margin-top:8px;line-height:1.7">先到「联系人」创建联系人并生成 ID，再点击右下角圆形按钮，粘贴 ID 添加聊天。</p></div>'); return; }
    ctEnsure();
    setListHtml(list.map(c => {
        const m = last(c) || {me:false,text:'还没有消息',t:''};
        return `
        <div class="row ${c.unread ? 'unread' : ''}" onclick="openChat('${c.id}')">
            ${avatar(c, 'lg')}
            <div class="info">
                <div class="top"><span class="name">${esc(dispName(c))}</span><span class="time">${esc(c.time)}</span></div>
                <div class="bottom">
                    ${c._typing ? ctSvgHtml('ct-list') : `<span class="preview">${m.me ? 'You: ' : ''}${esc(m.text)}</span>`}
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
                        <div class="cc-name">${esc(dispName(c))}</div>
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



/* 界面显示用的名字：有备注用备注，没有就用设定的名字（设定的名字才是发给 AI 的名字） */
function dispName(c) { return (c && (c.remark || c.name)) || ''; }
/* 编辑联系人页：原来的「名字」改成「备注」（只改标签文字，不动结构） */
function relabelRemarkField() {
    const ed = document.getElementById('contactEditor'); if (!ed) return;
    ed.querySelectorAll('label, span, div, p, small, strong').forEach(el => {
        if (el.children.length === 0 && /^(名字|名称|姓名)$/.test(el.textContent.trim())) el.textContent = '备注';
    });
    const input = document.getElementById('editName'); if (input) input.placeholder = '备注（留空则显示设定的名字）';
}
function openContactEditor(id) {
    editingContactId = id || null;
    relabelRemarkField();
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
        
        document.getElementById('editName').value = c.remark || '';
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
    const remark = document.getElementById('editName').value.trim();
    if (!remark && !editingContactId) { toast('备注不能为空'); return; }
    const name = remark;   // 新建时备注和设定名字先用同一个值，之后在「人设与信息」里改设定的名字
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
            c.remark = remark;
            c.status = status;
            c.ini = ((c.name || remark || '?')[0]).toUpperCase();
            if (pendingCover) c.cover = pendingCover;
            if (pendingAvatar) c.avatar = pendingAvatar;
        }
        toast('联系人已更新');
    } else {
        // Create
        const newContact = {
            id: id,
            name: name,
            remark: name,
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
            promptOpts: defaultPromptOpts(),
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
    const gone = CONTACTS.find(c => c.id === editingContactId);
    if (gone) { DELETED_NAMES[gone.id] = gone.name; saveDeletedNames(); }
    const keys = [];
    POSTS.filter(p => p.by === editingContactId).map(p => p.id).forEach(pid => keys.push(...dropPostLocal(pid)));
    CONTACTS = CONTACTS.filter(c => c.id !== editingContactId);
    persistContacts(); persistMoments(); renderMoments();
    removeDbKeys(keys);
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
let threadLimit = 35;
let threadLoadingMore = false;
function bindThreadScroll() {
    const box = document.getElementById('thread');
    if (!box || box.dataset.scrollBound) return;
    box.dataset.scrollBound = '1';
    box.addEventListener('scroll', () => {
        if (box.scrollTop <= 40 && !threadLoadingMore) {
            const c = CONTACTS.find(x => x.id === activeId);
            if (!c || threadLimit >= c.msgs.length) return;
            threadLoadingMore = true;
            const oldH = box.scrollHeight;
            const oldT = box.scrollTop;
            threadLimit = Math.min(c.msgs.length, threadLimit + 35);
            renderThread({ prepend: true, noAnim: true });
            box.scrollTop = box.scrollHeight - oldH + oldT;
            setTimeout(() => { threadLoadingMore = false; }, 80);
        }
    });
}
function openChat(id) {
    const c = CONTACTS.find(x => x.id === id);
    if (window.CruiseTrace && typeof window.CruiseTrace.setContext === 'function') window.CruiseTrace.setContext(c);
    if (!c) return;
    closeMqSheet();
    toggleQuickMenu(false);
    activeId = id;
    threadLimit = 35;
    threadLoadingMore = false;
    clearQuote(true); bindSwipeQuote(); bindThreadScroll();
    c.unread = 0;
    persistContacts();
    document.getElementById('headAv').outerHTML = avatar(c, 'md').replace('class="av ', 'id="headAv" class="av ');
    document.getElementById('headName').textContent = dispName(c);
    document.getElementById('headStatus').textContent = c.online ? '在线' : c.status;
    renderThread();
    applyRoomBeauty(c);
    const cap = document.querySelector('.messages-app .send-capsule');
    if (cap) cap.classList.toggle('pulling', !!c._typing);
    document.getElementById('chatView').classList.add('open');
    refreshChatBadge();
    document.getElementById('tabbar').classList.add('hide');
    renderChats();
}
function closeChat() {
    if (window.CruiseTrace && typeof window.CruiseTrace.setContext === 'function') window.CruiseTrace.setContext(null);
    clearTimeout(typingTimer);
    document.getElementById('chatView').classList.remove('open');
    refreshChatBadge();
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
const MEM_PRESET_KEY = 'whatever_memory_presets_v1';
const DEFAULT_SUMMARY_INSTR = [
    '你是聊天记录的记忆整理员。请阅读下面的对话，写出这段时间里发生的事情经过。',
    '【格式必须遵守】',
    '1. 用户消息里会给出“时间范围”，形如 [年月日时分—年月日时分]。summary 必须以这个时间范围原样开头，方括号一起保留，之后紧跟事情经过。',
    '2. 事情经过用第三人称、直白客观地叙述。角色一律写 {{char}}，用户一律写 {{user}}，原样输出这两个占位符，不要换成任何名字，不要用“他、她、我、你”指代他们。',
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
    // 说话人统一用占位符标注，模型不接触真名，避免名字与角色对不上导致人物错乱
    const transcript = '时间范围：' + label + '\n' + part.map(x => `${x.me ? '{{user}}' : '{{char}}'}：${x.text}`).join('\n');
    toast('正在总结…');
    try {
        const raw = await window.MessagesAPI.complete(m.instr || DEFAULT_SUMMARY_INSTR, transcript);
        const o0 = parseSummaryJson(raw) || {};
        // 默认指令（占位符版）下，总结里不允许出现真名：统一换成 {{char}} / {{user}}。
        // 用户自定义了指令（要求写真名）时则原样保存。
        const usePlaceholder = (m.instr || DEFAULT_SUMMARY_INSTR).includes('{{char}}');
        const fix = s => {
            let t = String(s == null ? '' : s);
            if (!usePlaceholder) return t;
            if (c.name) t = t.split(c.name).join('{{char}}');
            if (ME.name) t = t.split(ME.name).join('{{user}}');
            return t;
        };
        const o = {
            summary: fix(o0.summary),
            priority: o0.priority,
            points: Array.isArray(o0.points) ? o0.points.map(fix) : o0.points,
            relation: fix(o0.relation),
            keys: Array.isArray(o0.keys) ? o0.keys.map(fix) : o0.keys
        };
        const pr = Math.max(1, Math.min(10, parseInt(o.priority, 10) || 5));
        c.memories = c.memories || [];
        c.memories.unshift({
            id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            label,
            text: fix(o.summary || raw || '').trim().replace(/^\s*\[[^\]]*\]\s*/, ''),
            points: Array.isArray(o.points) ? o.points.map(String).slice(0, 6) : [],
            relation: String(o.relation || '').trim(),
            keys: Array.isArray(o.keys) ? o.keys.map(String).slice(0, 8) : [],
            priority: pr,
            sec: 'main', level: memLvlFromPrio(pr)
        });
        c.memCursor = to;
        persistContacts(); renderMemoryPage();
        toast('已生成记忆');
        return true;
    } catch (err) { showApiError(err); return false; }
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
/* ---------------- 记忆库：外壳只搭一次；点击只更新变化的部分，不整页重画 ---------------- */
let MEM_SEC = 'main';            // 当前分区：common / solo / main / extra
let MEM_ADD = null;              // 添加表单打开时：{sec, level}
let MEM_EDIT = null;             // 正在编辑内容的条目 id
const MEM_SEC_LIST = [
    { k: 'common', name: '共同' },
    { k: 'main',   name: '主' },
    { k: 'extra',  name: '番外' }
];
const MEM_SEC_NAME = { common: '共同记忆', solo: '单独记忆', main: '主记忆', extra: '番外记忆' };
const MEM_LVL_NAME = { high: '高', mid: '中', low: '低' };
const MEM_LVL_RANK = { high: 0, mid: 1, low: 2 };
function memSecOf(x) { return x && x.sec && x.sec !== 'solo' ? x.sec : 'main'; }   // 单独已去掉：旧的单独记忆并入主记忆
function memLvlFromPrio(p) { const n = parseInt(p, 10) || 5; return n >= 7 ? 'high' : (n >= 4 ? 'mid' : 'low'); }
function memLvlOf(x) { return (x && x.level) || memLvlFromPrio(x && x.priority); }
function memLvlPrio(l) { return l === 'high' ? 8 : (l === 'mid' ? 5 : 2); }
function memSortItems(list) {
    return list.slice().sort((a, b) => (MEM_LVL_RANK[memLvlOf(a)] - MEM_LVL_RANK[memLvlOf(b)]) || ((b.priority || 0) - (a.priority || 0)));
}
function memSecOptions(sel) {
    return MEM_SEC_LIST.filter(s => s.k !== 'extra')
        .map(s => `<option value="${s.k}" ${sel === s.k ? 'selected' : ''}>${MEM_SEC_NAME[s.k]}</option>`).join('');
}
function memLvlOptions(sel) {
    return ['high', 'mid', 'low'].map(l => `<option value="${l}" ${sel === l ? 'selected' : ''}>${MEM_LVL_NAME[l]}</option>`).join('');
}
function memPageEl() { return document.getElementById('memPage'); }

/* 外壳（背景层、页头、分段、滚动区）只搭一次；之后的操作都走事件委托 */
function memMount() {
    const page = memPageEl(); if (!page) return null;
    if (page.dataset.mounted === '1') return page;
    page.dataset.mounted = '1';
    page.innerHTML = `
        <div class="mem-bg"></div>
        <header class="mem-top"><button class="mem-back" type="button" data-act="close">返回</button><span class="mem-title">记忆</span><span class="mem-spacer"></span></header>
        <div class="mem-scroll">
            <div class="mem-seg">${MEM_SEC_LIST.map(x => `<button class="mem-seg-pill" type="button" data-act="sec" data-sec="${x.k}">${x.name}</button>`).join('')}</div>
            <div data-role="main-only">
                <div class="mem-sec">设置</div>
                <div class="mem-card mem-settings-card" data-role="settings"></div>
                <div class="mem-sec">总结指令</div>
                <div class="mem-card mem-settings-card" data-role="instr"></div>
            </div>
            <div data-role="body"></div>
        </div>`;
    page.addEventListener('click', memOnClick);
    page.addEventListener('change', memOnChange);
    return page;
}
function memOnClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
        case 'close': closeMemoryPage(); break;
        case 'sec': memSetSec(el.dataset.sec); break;
        case 'add': memOpenAdd(); break;
        case 'addCancel': memCloseAdd(); break;
        case 'addSave': memSaveNew(); break;
        case 'edit': memStartEdit(id); break;
        case 'editCancel': memCancelEdit(); break;
        case 'editSave': memSaveEdit(id); break;
        case 'delete': memDelete(id); break;
        case 'toggleAuto': memToggleAuto(); break;
        case 'sumRange': memSummarizeRange(); break;
        case 'instrSave': memSaveInstr(); break;
        case 'instrRestore': memRestoreDefault(); break;
        case 'presetSave': memSavePreset(); break;
        case 'presetUpdate': memUpdatePreset(); break;
        case 'presetDelete': memDeletePreset(); break;
    }
}
function memOnChange(e) {
    const el = e.target.closest('[data-chg]'); if (!el) return;
    const k = el.dataset.chg;
    if (k === 'setNum') memSetNum(el.dataset.key, el.value);
    else if (k === 'preset') memSwitchPreset(el.value);
    else if (k === 'lvl') memSetLevel(el.dataset.id, el.value);
    else if (k === 'itemSec') memSetItemSec(el.dataset.id, el.value);
}

/* 只更新分段按钮的选中状态和主记忆的设置区显示 */
function memRenderSeg() {
    const page = memMount(); if (!page) return;
    page.querySelectorAll('.mem-seg-pill').forEach(b => b.classList.toggle('active', b.dataset.sec === MEM_SEC));
    page.querySelector('[data-role="main-only"]').hidden = MEM_SEC !== 'main';
}
/* 设置卡片和总结指令卡片（只在需要时重写，且只重写这两块） */
function memRenderSettings() {
    const page = memMount(); const c = curMemContact(); if (!page || !c) return;
    const m = memOf(c);
    const presets = memPresets();
    const last = c.msgs.length;
    const presetOpts = '<option value="-1">默认指令</option>' + presets.map((p, i) => `<option value="${i}" ${m.presetIdx === i ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    page.querySelector('[data-role="settings"]').innerHTML = `
        <div class="mem-row"><span class="mem-lbl">上下文条数</span><input type="number" min="1" value="${m.ctx}" data-chg="setNum" data-key="ctx"></div>
        <div class="mem-row"><span class="mem-lbl">自动总结</span><button class="mem-switch ${m.auto ? 'on' : ''}" type="button" data-act="toggleAuto" aria-label="自动总结"></button></div>
        <div class="mem-row"><span class="mem-lbl">每到多少条总结一次</span><input type="number" min="1" value="${m.every}" data-chg="setNum" data-key="every"></div>
        <div class="mem-row"><span class="mem-lbl">手动总结：第几条到第几条</span><span class="mem-range"><input type="number" min="1" id="memFrom" value="${Math.max(1, last - 39)}"><i>—</i><input type="number" min="1" id="memTo" value="${last}"></span></div>
        <button class="mem-btn mem-primary" type="button" data-act="sumRange">${MEM_ICO.doc}<span>手动总结这段</span></button>`;
    page.querySelector('[data-role="instr"]').innerHTML = `
        <div class="mem-row"><span class="mem-lbl">预设</span><select class="mem-select" data-role="presetSelect" data-chg="preset">${presetOpts}</select></div>
        <textarea class="mem-instr" id="memInstr" rows="9">${esc(m.instr)}</textarea>
        <div class="mem-btns mem-foot">
            <button class="mem-btn" type="button" data-act="instrRestore">${MEM_ICO.restore}<span>恢复默认</span></button>
            <button class="mem-btn" type="button" data-act="presetSave" aria-label="存为预设" title="存为预设">${MEM_ICO.save}</button>
        </div>
        <div class="mem-btns">
            <button class="mem-btn mem-wide" type="button" data-act="instrSave">${MEM_ICO.save}<span>保存修改</span></button>
            <button class="mem-btn" type="button" data-act="presetUpdate" data-role="presetUpdate" ${m.presetIdx >= 0 ? '' : 'hidden'}>${MEM_ICO.refresh}<span>更新预设</span></button>
            <button class="mem-btn mem-danger" type="button" data-act="presetDelete" data-role="presetDelete" ${m.presetIdx >= 0 ? '' : 'hidden'}>${MEM_ICO.trash}<span>删除预设</span></button>
        </div>
        <div class="mem-hint">{{char}} 代表角色名，{{user}} 代表你的名字。</div>`;
}
/* 预设只更新下拉选项和两个按钮的显示，不重写指令文本框 */
function memRenderPresetBar() {
    const page = memMount(); const c = curMemContact(); if (!page || !c) return;
    const m = memOf(c);
    const sel = page.querySelector('[data-role="presetSelect"]');
    if (sel) {
        const presets = memPresets();
        sel.innerHTML = '<option value="-1">默认指令</option>' + presets.map((p, i) => `<option value="${i}" ${m.presetIdx === i ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    }
    const up = page.querySelector('[data-role="presetUpdate"]'); if (up) up.hidden = !(m.presetIdx >= 0);
    const del = page.querySelector('[data-role="presetDelete"]'); if (del) del.hidden = !(m.presetIdx >= 0);
}
function memSetInstrText(t) { const ta = document.getElementById('memInstr'); if (ta) ta.value = t; }
function memItemHtml(x) {
    const editing = MEM_EDIT === x.id;
    const body = editing
        ? `<textarea class="mem-edit-ta" id="memEditTa" rows="4">${esc(x.text)}</textarea>
           <div class="mem-btns"><button class="mem-btn" type="button" data-act="editCancel">取消</button><button class="mem-btn mem-primary-sm" type="button" data-act="editSave" data-id="${x.id}">保存</button></div>`
        : `${x.kind === 'shot' ? `<details class="mem-fold"><summary class="mem-fold-sum"><span class="mem-stamp">${esc(x.label || '')}</span> ${esc(String(x.text || '').slice(0, 30))}${String(x.text || '').length > 30 ? '…' : ''}</summary><div class="mem-fold-body"><div class="mem-text">${esc(x.text)}</div>${x.chatLog && x.chatLog.length ? chatLogMemHtml(x.chatLog) : ''}</div></details>` : `<div class="mem-plain"><span class="mem-plain-time">${esc(x.label || '')}</span><div class="mem-plain-text">${esc(x.text || '')}</div></div>`}
           ${x.points && x.points.length ? `<div class="mem-points">${x.points.map(p => `<div>- ${esc(p)}</div>`).join('')}</div>` : ''}
           ${x.relation ? `<div class="mem-rel"><span>关系与感情</span>${esc(x.relation)}</div>` : ''}
           ${x.keys && x.keys.length ? `<div class="mem-keys">${x.keys.map(k => `<em>${esc(k)}</em>`).join('')}</div>` : ''}`;
    return `<div class="mem-card mem-item">
        <div class="mem-head">
            <div class="mem-tags">
                <select class="mem-select" data-chg="lvl" data-id="${x.id}">${memLvlOptions(memLvlOf(x))}</select>
                <select class="mem-select" data-chg="itemSec" data-id="${x.id}">${memSecOptions(memSecOf(x))}</select>
            </div>
            <div class="mem-actions">
                <button class="mem-del mem-edit" type="button" data-act="edit" data-id="${x.id}">编辑</button>
                <button class="mem-del" type="button" data-act="delete" data-id="${x.id}">删除</button>
            </div>
        </div>
        ${body}
    </div>`;
}
function memAddFormHtml() {
    if (!MEM_ADD) return '';
    return `<div class="mem-card mem-form">
        <div class="mem-sec">添加记忆</div>
        <textarea class="mem-edit-ta" id="memNewTa" rows="4" placeholder="写下这段记忆…"></textarea>
        <div class="mem-row"><span class="mem-lbl">分区</span><select class="mem-select" id="memNewSec">${memSecOptions(MEM_ADD.sec)}</select></div>
        <div class="mem-row"><span class="mem-lbl">级别</span><select class="mem-select" id="memNewLvl">${memLvlOptions(MEM_ADD.level)}</select></div>
        <div class="mem-btns"><button class="mem-btn" type="button" data-act="addCancel">取消</button><button class="mem-btn mem-primary-sm" type="button" data-act="addSave">保存</button></div>
    </div>`;
}
/* 只重写滚动区里的内容，并保留主记忆各级的展开状态 */
/* 记忆里的聊天记录：右边是角色（自己），左边是 user */
function chatLogMemHtml(log) {
    return `<div class="mem-chatlog">${log.map(m => `<div class="mem-cl-row${m.me ? ' self' : ''}"><span class="mem-cl-bub">${esc(m.text)}</span></div>`).join('')}</div>`;
}
function memRenderBody() {
    const page = memMount(); const c = curMemContact(); if (!page || !c) return;
    const box = page.querySelector('[data-role="body"]');
    if (MEM_SEC === 'extra') { box.innerHTML = '<div class="mem-empty">番外记忆先空着，之后再来填。</div>'; return; }
    const openLvls = new Set([...box.querySelectorAll('details.mem-group[open]')].map(d => d.dataset.lvl));
    const firstRun = !box.dataset.ready; box.dataset.ready = '1';
    const items = (c.memories || []).filter(x => memSecOf(x) === MEM_SEC);
    const addBtn = `<button class="mem-btn mem-primary" type="button" data-act="add">${MEM_ICO.plus}<span>添加记忆</span></button>`;
    let list;
    if (MEM_SEC === 'main') {
        list = ['high', 'mid', 'low'].map(l => {
            const arr = memSortItems(items.filter(x => memLvlOf(x) === l));
            const open = firstRun ? l === 'high' : openLvls.has(l);
            return `<details class="mem-group" data-lvl="${l}" ${open ? 'open' : ''}>
                <summary><span>${MEM_LVL_NAME[l]}级</span><small>${arr.length} 条</small></summary>
                ${arr.map(memItemHtml).join('') || '<div class="mem-empty">这一级还没有记忆</div>'}
            </details>`;
        }).join('');
        list = `<div class="mem-sec">按高中低展开（高在提示词里排在最前）</div>` + list;
    } else {
        const hint = MEM_SEC === 'common'
            ? '还没有共同记忆。对方点赞、评论你的朋友圈，会直接出现在这里。'
            : '还没有单独记忆。点上面的添加，写下只有对方知道的私人记忆。';
        list = memSortItems(items).map(memItemHtml).join('') || `<div class="mem-empty">${hint}</div>`;
    }
    box.innerHTML = addBtn + memAddFormHtml() + list;
}
/* 外部调用（总结完成、朋友圈回复等）：整体刷新，但外壳不动 */
function renderMemoryPage() {
    const page = memMount(); if (!page) return;
    memRenderSeg(); memRenderSettings(); memRenderBody();
}

function memSetSec(k) { MEM_SEC = k; MEM_ADD = null; MEM_EDIT = null; memRenderSeg(); memRenderBody(); }
function memOpenAdd() { MEM_ADD = { sec: MEM_SEC === 'extra' ? 'main' : MEM_SEC, level: 'mid' }; memRenderBody(); }
function memCloseAdd() { MEM_ADD = null; memRenderBody(); }
function memSaveNew() {
    const c = curMemContact(); if (!c) return;
    const ta = document.getElementById('memNewTa');
    const text = ((ta && ta.value) || '').trim();
    if (!text) { toast('写点什么再保存吧'); return; }
    const sec = document.getElementById('memNewSec').value;
    const level = document.getElementById('memNewLvl').value;
    c.memories = c.memories || [];
    c.memories.unshift({
        id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        label: '手动添加 · ' + memStamp(Date.now()),
        text, points: [], relation: '', keys: [],
        priority: memLvlPrio(level), sec, level
    });
    MEM_SEC = sec; MEM_ADD = null;
    persistContacts(); memRenderSeg(); memRenderBody(); toast('已添加记忆');
}
function memSetItemSec(id, sec) {
    const c = curMemContact(); if (!c) return;
    const x = (c.memories || []).find(y => y.id === id); if (!x) return;
    x.sec = sec; persistContacts(); memRenderBody();
}
function memSetLevel(id, lvl) {
    const c = curMemContact(); if (!c) return;
    const x = (c.memories || []).find(y => y.id === id); if (!x) return;
    x.level = lvl; persistContacts(); memRenderBody();
}
function memStartEdit(id) { MEM_EDIT = id; memRenderBody(); }
function memCancelEdit() { MEM_EDIT = null; memRenderBody(); }
function memSaveEdit(id) {
    const c = curMemContact(); if (!c) return;
    const x = (c.memories || []).find(y => y.id === id); if (!x) return;
    const ta = document.getElementById('memEditTa');
    const text = ((ta && ta.value) || '').trim();
    if (!text) { toast('内容不能为空'); return; }
    x.text = text; MEM_EDIT = null; persistContacts(); memRenderBody(); toast('已保存');
}

/* 设置与总结指令：只保存数据，不重画卡片（数字输入、开关不会因此闪） */
function memSetNum(key, v) { const c = curMemContact(); if (!c) return; const m = memOf(c); m[key] = Math.max(1, parseInt(v, 10) || 1); persistContacts(); }
function memToggleAuto() {
    const c = curMemContact(); if (!c) return;
    const m = memOf(c); m.auto = !m.auto; persistContacts();
    const sw = memPageEl() && memPageEl().querySelector('.mem-switch'); if (sw) sw.classList.toggle('on', !!m.auto);
}
async function memSummarizeRange() {
    const c = curMemContact(); if (!c) return;
    const a = Math.max(1, parseInt(document.getElementById('memFrom').value, 10) || 1);
    const b = Math.min(c.msgs.length, parseInt(document.getElementById('memTo').value, 10) || c.msgs.length);
    if (b < a) { toast('结束条数不能小于开始条数'); return; }
    window.MESSAGES_USER_NAME = ME.name;
        window.MESSAGES_USER_PERSONA = ME.persona || '';
    await runSummary(c, a - 1, b);
}
function memSaveInstr() { const c = curMemContact(); if (!c) return; memOf(c).instr = document.getElementById('memInstr').value; persistContacts(); toast('已保存总结指令'); }
function memRestoreDefault() { const c = curMemContact(); if (!c) return; const m = memOf(c); m.instr = DEFAULT_SUMMARY_INSTR; m.presetIdx = -1; persistContacts(); memSetInstrText(m.instr); memRenderPresetBar(); }
function memSavePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const list = memPresets();
    list.push({ name: '预设 ' + (list.length + 1), text: document.getElementById('memInstr').value });
    saveMemPresets(list);
    m.presetIdx = list.length - 1; m.instr = list[m.presetIdx].text;
    persistContacts(); memRenderPresetBar(); toast('已存为预设');
}
function memUpdatePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const list = memPresets(); if (m.presetIdx < 0 || !list[m.presetIdx]) return;
    list[m.presetIdx].text = document.getElementById('memInstr').value; saveMemPresets(list);
    m.instr = list[m.presetIdx].text; persistContacts(); memRenderPresetBar(); toast('预设已更新');
}
function memSwitchPreset(v) {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    const i = parseInt(v, 10); const list = memPresets();
    if (i < 0 || !list[i]) { m.presetIdx = -1; m.instr = DEFAULT_SUMMARY_INSTR; }
    else { m.presetIdx = i; m.instr = list[i].text; }
    persistContacts(); memSetInstrText(m.instr); memRenderPresetBar();
}
function memSetPriority(id, v) {
    const c = curMemContact(); if (!c) return;
    const x = (c.memories || []).find(y => y.id === id); if (!x) return;
    x.priority = Math.max(1, Math.min(10, parseInt(v, 10) || 1)); persistContacts(); memRenderBody();
}
function memDeletePreset() {
    const c = curMemContact(); if (!c) return; const m = memOf(c);
    if (m.presetIdx < 0) { toast('当前是默认指令，不能删除'); return; }
    const idx = m.presetIdx;
    const list = memPresets(); list.splice(idx, 1); saveMemPresets(list);
    CONTACTS.forEach(x => { if (x.mem) { if (x.mem.presetIdx === idx) x.mem.presetIdx = -1; else if (x.mem.presetIdx > idx) x.mem.presetIdx -= 1; } });
    m.presetIdx = -1; m.instr = DEFAULT_SUMMARY_INSTR;
    persistContacts(); memSetInstrText(m.instr); memRenderPresetBar(); toast('已删除预设');
}
/* 聊天里选图：作为用户的照片消息发到当前聊天 */
function pickChatPhoto() {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const input = makeFilePicker();
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
        const f = input.files && input.files[0]; if (!f) return;
        try {
            const url = await compressImage(f, 800);
            const key = 'cphoto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
            let ok = window.DB ? await window.DB.saveLarge(key, url) : false;
            if (!ok && window.DB) ok = await window.DB.save(key, url);
            MOMENT_IMG_CACHE[key] = url;
            c.msgs.push({ me: true, text: '', photo: key, t: nowTime(), ts: Date.now() });
            c.time = nowTime(); persistContacts(); renderThread(); renderChats();
            if (!ok) toast('照片没存下，仅本次可见。原因：' + (!window.DB ? '页面没有加载 db.js（存储模块不存在）' : (window.DB.lastError || '存储失败但浏览器没有返回具体错误')));
        } catch (e) { toast('照片读取失败'); }
    };
    input.click();
}
function photoMsgHtml(m, i, c, avo) {
    const prev = c.msgs[i - 1] || null;
    const newGroup = !prev || prev.narr || prev.momentEvent || prev.me !== m.me;
    const showAv = avo.scope === 'all' || newGroup;
    let side;
    if (m.me) side = (avo.me && showAv) ? `<div class="av-col"><span class="avf">${selfAvatarHtml('sm')}</span></div>` : (avo.me ? '<div style="width:32px;flex-shrink:0"></div>' : '');
    else side = (avo.them && showAv) ? `<div class="av-col"><span class="avf">${avatar(c, 'sm')}</span></div>` : '<div class="sp"></div>';
    return `<div class="mrow${m.me ? ' me' : ''}" data-i="${i}">${side}<div class="bubble g-single chat-photo"><img data-ckey="${m.photo}" alt=""></div></div>`;
}
/* 发给模型前，把聊天里最近照片的图片数据读进内存 */
async function preloadChatPhotos(c) {
    if (!c || !Array.isArray(c.msgs)) return;
    const n = (c.mem && c.mem.ctx) || 30;
    const keys = c.msgs.slice(-n).filter(m => m && m.photo && !MOMENT_IMG_CACHE[m.photo]).map(m => m.photo);
    for (const k of keys) {
        try { const v = window.DB ? await window.DB.load(k, '') : ''; if (v) MOMENT_IMG_CACHE[k] = v; } catch (_) {}
    }
}
function hydrateChatPhotos(box) {
    box.querySelectorAll('img[data-ckey]').forEach(img => {
        const k = img.dataset.ckey;
        if (MOMENT_IMG_CACHE[k]) { img.src = MOMENT_IMG_CACHE[k]; return; }
        Promise.resolve(window.DB ? window.DB.load(k, '') : '').then(v => { if (v) { MOMENT_IMG_CACHE[k] = v; img.src = v; } });
    });
}
/* char 偷照片：从用户发过的朋友圈照片、用户在聊天里发的照片中随机挑一张 */
/* 朋友圈图片：帖子里的照片和截图 */
function keysOfPost(p) { return p ? [...(p.imgs || []), p.chatShotKey].filter(Boolean) : []; }
/* 把图片数据读进内存（数据库里读不到时也不影响文字请求），并让 messages-api 能取到 */
async function primeKeys(keys) {
    window.MESSAGES_PHOTO_GET = k => MOMENT_IMG_CACHE[k] || '';
    for (const k of keys || []) {
        if (!k || MOMENT_IMG_CACHE[k]) continue;
        try { const v = window.DB ? await window.DB.load(k, '') : ''; if (v) MOMENT_IMG_CACHE[k] = v; } catch (_) {}
    }
}
function stealPoolOf(c) {
    const pool = [];
    POSTS.forEach(p => { if (!CONTACTS.find(x => x.id === p.by)) (p.imgs || []).forEach((k, i) => pool.push({ key: k, desc: (p.imgDesc || [])[i] || '' })); });
    if (c && Array.isArray(c.msgs)) c.msgs.forEach(m => { if (m && m.me && m.photo) pool.push({ key: m.photo, desc: '聊天里用户发来的一张照片' }); });
    return pool;
}
function pickStolenPhoto(r, pool) {
    if (!r || !r.steal || !pool || !pool.length) return null;
    const idx = (Number.isInteger(r.stealIdx) && r.stealIdx >= 1 && r.stealIdx <= pool.length) ? r.stealIdx - 1 : Math.floor(Math.random() * pool.length);
    const pick = pool[idx];
    return { imgs: [pick.key], desc: (r.photos && r.photos[0]) || pick.desc || '' };
}
/* 朋友圈 ⇄ 记忆：角色发朋友圈时写入的那条记忆与朋友圈绑定 */
function isPostMemory(m) {
    return !!(m && m.src && (m.postLink || /^\{char\}发了一条朋友圈（/.test(m.text || '')));
}
/* 只在内存里移除一条朋友圈及其关联记忆、聊天提示，返回需要从数据库删除的照片 key */
function dropPostLocal(pid) {
    const p = POSTS.find(x => x.id === pid);
    if (!p) return [];
    const ownKeys = p.stolen ? [] : [...(p.imgs || [])];
    CONTACTS.forEach(x => {
        if (x.memories) x.memories = x.memories.filter(m => m.src !== pid);
        if (Array.isArray(x.msgs)) x.msgs = x.msgs.filter(m => !(m.momentEvent && String(m.momentPostId || '') === String(pid)));
    });
    POSTS = POSTS.filter(x => x.id !== pid);
    return [...ownKeys, ...(p.chatShotKey ? [p.chatShotKey] : [])];
}
async function removeDbKeys(keys) {
    if (!window.DB) return;
    for (const k of keys) await window.DB.remove(k);
}
function removePostCascade(pid) {
    const keys = dropPostLocal(pid);
    persistContacts(); persistMoments(); renderMoments(); renderChats();
    if (activeId) renderThread({ noAnim: true });
    removeDbKeys(keys);
}
function memDelete(id) {
    const c = curMemContact(); if (!c) return;
    const m = (c.memories || []).find(y => y.id === id);
    if (m && m.src && POSTS.some(p => p.id === m.src)) {
        askConfirm('删除记忆', '这条记忆对应一条朋友圈，删除后朋友圈也会一起删掉。', '删除', () => {
            removePostCascade(m.src); memRenderBody();
        });
        return;
    }
    c.memories = (c.memories || []).filter(y => y.id !== id); persistContacts(); memRenderBody();
}

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
    const isMulti = MM.mode === 'multi';
    const items = isMulti ? [
        { k: 'selectTo', label: '选择到这里', icon: MM_ICONS.range },
        { k: 'copy', label: '复制', icon: MM_ICONS.copy },
        { div: true },
        { k: 'del', label: '删除', icon: MM_ICONS.del, cls: 'del' }
    ] : [
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
    const bubble = row.querySelector('.bubble') || row.querySelector('.narr') || row.querySelector('.moment-event-row span') || row.querySelector('span');
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
function mmSelectTo(targetIdx) {
    const c = curMemContact();
    if (!c || targetIdx == null) return;
    const anchor = (MM.anchor != null) ? MM.anchor : (MM.sel.size ? Math.min(...MM.sel) : targetIdx);
    const from = Math.min(anchor, targetIdx);
    const to = Math.max(anchor, targetIdx);
    for (let idx = from; idx <= to; idx++) {
        if (c.msgs[idx]) MM.sel.add(idx);
    }
    MM.lastClicked = targetIdx;
    hideSelectToTip();
    hideMsgMenu();
    mmRefreshSel();
    mmBarUpdate();
}
function showSelectToTip(row, targetIdx) {
    hideSelectToTip();
    if (MM.anchor == null || MM.anchor === targetIdx) return;
    const tip = document.createElement('button');
    tip.id = 'mmSelectToTip';
    tip.className = 'mm-select-to-btn';
    tip.type = 'button';
    tip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>选择到这里</span>';
    tip.onclick = e => {
        e.stopPropagation();
        mmSelectTo(targetIdx);
    };
    row.style.position = 'relative';
    row.appendChild(tip);
    clearTimeout(showSelectToTip._t);
    showSelectToTip._t = setTimeout(hideSelectToTip, 4500);
}
function hideSelectToTip() {
    clearTimeout(showSelectToTip._t);
    const tip = document.getElementById('mmSelectToTip');
    if (tip) tip.remove();
}
function mmRun(k) {
    const i = MM.idx;
    hideMsgMenu();
    const c = curMemContact(); if (!c || i == null || !c.msgs[i]) return;
    if (k === 'selectTo') return mmSelectTo(i);
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
        const removedHids = new Set();
        list.forEach(i => {
            const m = c.msgs[i];
            if (m && m.hid) removedHids.add(m.hid);
        });
        list.forEach(i => c.msgs.splice(i, 1));
        if (removedHids.size && c.hearts) {
            c.hearts = c.hearts.filter(h => !removedHids.has(h.id));
        }
        persistContacts(); renderThread(); renderChats();
        if (MM.mode === 'multi') mmExitMulti();
    });
    MM_SHEET_TAG = false;
}
function mmEnterMulti(i) {
    MM.mode = 'multi';
    MM.sel = new Set([i]);
    MM.anchor = i;
    MM.lastClicked = i;
    const box = document.getElementById('thread');
    if (box) box.classList.add('mm-multi');
    mmBarEl().classList.add('show');
    mmRefreshSel(); mmBarUpdate();
}
function mmExitMulti() {
    MM.mode = 'menu'; MM.sel = new Set(); MM.anchor = null; MM.lastClicked = null;
    hideSelectToTip();
    const box = document.getElementById('thread');
    if (box) box.classList.remove('mm-multi');
    const bar = document.getElementById('mmBar'); if (bar) bar.classList.remove('show');
    mmRefreshSel();
}
function mmRefreshSel() {
    document.querySelectorAll('#thread .mrow, #thread .narr-row, #thread .moment-event-row').forEach(r => r.classList.toggle('sel', MM.sel.has(Number(r.dataset.i))));
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
        const row = e.target.closest && e.target.closest('.mrow, .narr-row, .moment-event-row');
        if (!row || row.classList.contains('typing')) return;
        MM.sx = e.clientX; MM.sy = e.clientY;
        cancel();
        MM.timer = setTimeout(() => { MM.timer = null; showMsgMenu(row); }, 400);
    });
    box.addEventListener('pointermove', e => {
        if (MM.timer && Math.hypot(e.clientX - MM.sx, e.clientY - MM.sy) > 8) cancel();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => box.addEventListener(t, cancel));
    box.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mrow, .narr-row, .moment-event-row')) e.preventDefault(); });
    box.addEventListener('click', e => {
        if (MM.mode !== 'multi') return;
        if (e.target.closest && e.target.closest('#mmSelectToTip')) return;
        const row = e.target.closest && e.target.closest('.mrow, .narr-row, .moment-event-row');
        if (!row) return;
        const i = Number(row.dataset.i);
        MM.lastClicked = i;
        if (MM.sel.has(i)) {
            MM.sel.delete(i);
            hideSelectToTip();
            if (MM.anchor === i) {
                MM.anchor = MM.sel.size ? Math.min(...MM.sel) : null;
            }
        } else {
            MM.sel.add(i);
            if (MM.anchor == null) {
                MM.anchor = i;
            } else {
                showSelectToTip(row, i);
            }
        }
        mmRefreshSel(); mmBarUpdate();
    });
    document.addEventListener('pointerdown', e => {
        if (!e.target.closest('.mm-menu') && !e.target.closest('.mrow, .narr-row, .moment-event-row') && !e.target.closest('#mmSelectToTip')) {
            hideMsgMenu();
            hideSelectToTip();
        }
    });
}
/* ---------------- 聊天室顶栏下滑面板：内置提示词 + 条数 + 大时间 ---------------- */
const CUSTOM_MODULES_KEY = 'whatever_chat_custom_modules_v2';
function getCustomModulesList() {
    try {
        const raw = localStorage.getItem(CUSTOM_MODULES_KEY);
        if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) return arr;
        }
        const old = JSON.parse(localStorage.getItem('whatever_chat_custom_module_v1') || 'null');
        if (old && old.prompt) {
            return [{
                id: 'cm_' + Date.now().toString(36),
                name: old.name || '自定义模块',
                prompt: old.prompt,
                targets: old.targets || ['char'],
                pos: old.pos || 'mid',
                enabled: true
            }];
        }
    } catch (_) {}
    return [];
}
window.getCustomModulesList = getCustomModulesList;
function saveCustomModulesList(list) {
    try {
        localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(list));
        return true;
    } catch (_) {
        return false;
    }
}

function getChatPromptOptions() {
    const list = getCustomModulesList();
    const activeCount = list.filter(x => x.enabled !== false).length;
    return [
        { k: 'ai', label: '防八股' },
        { k: 'greasy', label: '防油腻' },
        { k: 'threat', label: '防威胁' },
        { k: 'fake', label: '防假性安慰' },
        { k: 'macho', label: '防超雄' },
        { k: 'custom', label: activeCount > 0 ? `自定义(${activeCount})` : '自定义模块' }
    ];
}
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
    const opts = getChatPromptOptions();
    p.innerHTML = cdTitleHtml() + `<div class="cd-chips">${opts.map(o => `<div class="cd-option"><button class="cd-chip ${on.indexOf(o.k) >= 0 ? 'on' : ''}" type="button" onclick="toggleChatPrompt('${o.k}')">${esc(o.label)}</button><button class="cd-option-settings" type="button" aria-label="调整${esc(o.label)}" onclick="openChatPromptSettings('${o.k}')" title="调整提示词"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"/><path d="m19.4 13.5 1.1.85-1.1 1.9-1.35-.45a7.9 7.9 0 0 1-1.45.84l-.24 1.43h-2.2l-.24-1.43a7.9 7.9 0 0 1-1.45-.84l-1.35.45-1.1-1.9 1.1-.85a7.1 7.1 0 0 1 0-1.68l-1.1-.85 1.1-1.9 1.35.45a7.9 7.9 0 0 1 1.45-.84l.24-1.43h2.2l.24 1.43a7.9 7.9 0 0 1 1.45.84l1.35-.45 1.1 1.9-1.1.85a7.1 7.1 0 0 1 0 1.68Z" transform="translate(-1 -1) scale(1.05)"/></svg></button></div>`).join('')}</div>`
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
const CHAT_PROMPT_SETTINGS_KEY = 'whatever_chat_prompt_settings_v1';
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
    void box.offsetWidth; box.classList.add('is-visible');
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

function persistNewCustomWords(items) {
    if (!items || !items.length) return;
    const s = readChatPromptSettings();
    const words = (s.words || []).slice();
    const levels = Object.assign({}, s.priorityLevels || {});
    const customWords = (s.customWords || []).slice();
    const customReasons = Object.assign({}, s.customReasons || {});
    items.forEach(({ word, reason }) => {
        if (!words.includes(word)) { words.push(word); levels[word] = 'medium'; }
        if (!customWords.includes(word)) customWords.push(word);
        if (reason) customReasons[word] = reason;
    });
    saveChatPromptSettings({
        enabled: s.enabled !== false,
        words,
        priorityLevels: levels,
        disabledWords: s.disabledWords || [],
        customWords,
        customReasons,
        priority: words.filter(w => levels[w] === 'high')
    });
}
const CHAT_PROMPT_TEXT_KEY = 'whatever_chat_prompt_texts_v1';
const CHAT_PROMPT_TEXT_DEFAULTS = {
    threat: `{char}需要学会尊重user，不能说"你胆子肥了"，"长本事了吧"，这类像char扮演类似"父亲"角色的威胁式言论，user是个个体，不是必须要看char的眼色的。`,
    fake: `安慰人是有层级的弹窗
第一层：感知到user情绪低落→询问或者直接安慰→观察user状态
第二层：过了第一层还是没有好转→和user静下心谈论打开心结，说出自己的看点，不可以说"你这算啥"，"多大点事"，要知道既然伤心了肯定是有原因的，不是说有个人就能够脱离这种情绪的，你们需要深度聊天，而char需要深度思考user的心理状态
第三层：危机时，突然情绪崩溃时，在对话中深度思考找自己的错误，耐心询问user发生了什么，尝试投喂/投其所好式疗法。`,
    macho: `char和user不是敌人，不要对user有戒备心，不要不按照char设定中对待user`
};
const CHAT_PROMPT_TEXT_TITLES = {
    threat: ['No Threats', '防威胁'],
    fake: ['Real Comfort', '防假性安慰'],
    macho: ['Equal Footing', '防超雄']
};
function readChatPromptTexts() {
    try { const v = JSON.parse(localStorage.getItem(CHAT_PROMPT_TEXT_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; }
    catch (_) { return {}; }
}
window.getChatPromptText = function (k) {
    const saved = readChatPromptTexts();
    return typeof saved[k] === 'string' ? saved[k] : (CHAT_PROMPT_TEXT_DEFAULTS[k] || '');
};
function saveChatPromptText(k, text) {
    const v = readChatPromptTexts(); v[k] = text;
    try { localStorage.setItem(CHAT_PROMPT_TEXT_KEY, JSON.stringify(v)); return true; }
    catch (_) { return false; }
}
/* 防威胁 / 防假性安慰 / 防超雄：照搬大天使提示词弹窗（邮票框 + 保存 + 圆形恢复默认 + 关闭） */
function openChatPromptTextPopup(k) {
    const title = CHAT_PROMPT_TEXT_TITLES[k]; if (!title) return;
    const old = document.getElementById('cdPromptText'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'cdPromptText';
    wrap.className = 'cd-pt-root';
    wrap.innerHTML = `<div class="ar-sheet" id="cdPromptTextSheet"><div class="ar-sheet-card">
        <div class="ar-sheet-title ar-script">${escapeHtml(title[0])}</div>
        <div class="ar-sheet-title">${escapeHtml(title[1])}</div>
        <div class="ar-stamp">
            <div class="ar-stamp-label">提示词</div>
            <div class="ar-sec">开启「${escapeHtml(title[1])}」后，这段提示词会加入发给 AI 的内容</div>
            <textarea class="ar-mode-text" id="cdPromptTextArea" rows="9"></textarea>
        </div>
        <div class="ar-foot">
            <div class="cd-pt-row"><button type="button" class="ar-save" id="cdPromptTextSave">保存</button><button type="button" class="ar-reset" id="cdPromptTextReset" aria-label="恢复默认" title="恢复默认"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/></svg></button></div>
            <button type="button" class="ar-close" id="cdPromptTextClose">关闭</button>
        </div>
    </div></div>`;
    document.body.appendChild(wrap);
    const sheet = wrap.querySelector('#cdPromptTextSheet');
    const ta = wrap.querySelector('#cdPromptTextArea');
    ta.value = window.getChatPromptText(k);
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('show')));
    const close = () => { sheet.classList.remove('show'); setTimeout(() => wrap.remove(), 240); };
    wrap.querySelector('#cdPromptTextClose').onclick = close;
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    wrap.querySelector('#cdPromptTextReset').onclick = () => { ta.value = CHAT_PROMPT_TEXT_DEFAULTS[k] || ''; };
    wrap.querySelector('#cdPromptTextSave').onclick = () => {
        if (saveChatPromptText(k, ta.value)) { toast('已保存提示词'); close(); }
        else toast('保存失败：存储空间可能不足');
    };
}
function openCustomModulePopup() {
    const old = document.getElementById('cdCustomModulePopup'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'cdCustomModulePopup';
    wrap.className = 'cd-pt-root';
    wrap.innerHTML = `<div class="ar-sheet show" id="cdCustomModuleSheet">
      <div class="ar-sheet-card cd-custom-mod-card" id="cdCustomModCard"></div>
    </div>`;
    document.body.appendChild(wrap);

    const sheet = wrap.querySelector('#cdCustomModuleSheet');
    const card = wrap.querySelector('#cdCustomModCard');
    const close = () => { sheet.classList.remove('show'); setTimeout(() => wrap.remove(), 220); };
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });

    renderListView();

    // 视图 1：模块条目管理列表
    function renderListView() {
        const list = getCustomModulesList();
        card.innerHTML = `
          <div class="ar-sheet-title ar-script">Custom Modules</div>
          <div class="ar-sheet-title">自定义模块</div>
          <div class="cd-cm-bar">
            <span class="cd-cm-count">已创建 ${list.length} 个条目</span>
            <button type="button" class="cd-cm-add-btn" id="cdCmAddBtn">+ 新建模块</button>
          </div>
          <div class="cd-cm-list" id="cdCmList">
            ${list.length ? list.map(item => {
                const posLabel = item.pos === 'high' ? '前置(高)' : item.pos === 'low' ? '后置(低)' : '默认(中)';
                const tgts = Array.isArray(item.targets) ? item.targets : ['char'];
                const tgtsHtml = tgts.map(t => `<span class="cd-cm-target-badge">${t === 'narr' ? '旁白' : t === 'offline' ? '线下' : 'char'}</span>`).join('');
                return `
                  <div class="cd-cm-item ${item.enabled !== false ? 'active' : ''}" data-id="${item.id}">
                    <div class="cd-cm-item-main" data-act="edit">
                      <div class="cd-cm-item-top">
                        <span class="cd-cm-item-name">${esc(item.name || '未命名模块')}</span>
                        <span class="cd-cm-pos-tag">${posLabel}</span>
                      </div>
                      <div class="cd-cm-targets-row">${tgtsHtml}</div>
                      <div class="cd-cm-snippet">${esc(item.prompt || '暂无提示词正文')}</div>
                    </div>
                    <div class="cd-cm-item-ops">
                      <button type="button" class="cd-cm-toggle ${item.enabled !== false ? 'on' : ''}" data-act="toggle" title="启用/停用"></button>
                      <button type="button" class="cd-cm-edit-btn" data-act="edit" title="编辑">
                        <svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/></svg>
                      </button>
                      <button type="button" class="cd-cm-del-btn" data-act="del" title="删除">
                        <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>
                      </button>
                    </div>
                  </div>
                `;
            }).join('') : '<div class="cd-cm-empty">暂无自定义模块，点击上方「+ 新建模块」开始创建 ୨୧</div>'}
          </div>
          <div class="ar-foot" style="margin-top:10px;">
            <button type="button" class="ar-close" id="cdCmListClose">关闭</button>
          </div>
        `;

        card.querySelector('#cdCmListClose').onclick = close;
        card.querySelector('#cdCmAddBtn').onclick = () => renderEditView(null);

        card.querySelector('#cdCmList').onclick = e => {
            const row = e.target.closest('.cd-cm-item');
            if (!row) return;
            const id = row.dataset.id;
            const targetBtn = e.target.closest('[data-act]');
            const act = targetBtn ? targetBtn.dataset.act : 'edit';

            if (act === 'toggle') {
                const curList = getCustomModulesList();
                const it = curList.find(x => x.id === id);
                if (it) {
                    it.enabled = it.enabled === false ? true : false;
                    saveCustomModulesList(curList);
                    renderListView();
                    renderChatDrop();
                    toast(it.enabled ? `已启用「${it.name}」` : `已停用「${it.name}」`);
                }
                return;
            }

            if (act === 'del') {
                let curList = getCustomModulesList();
                curList = curList.filter(x => x.id !== id);
                saveCustomModulesList(curList);
                renderListView();
                renderChatDrop();
                toast('模块已删除');
                return;
            }

            if (act === 'edit') {
                renderEditView(id);
            }
        };
    }

    // 视图 2：新建或编辑具体模块
    function renderEditView(modId) {
        const list = getCustomModulesList();
        const isNew = !modId;
        const cur = (!isNew ? list.find(x => x.id === modId) : null) || {
            id: 'cm_' + Date.now().toString(36),
            name: '',
            prompt: '',
            targets: ['char'],
            pos: 'mid',
            enabled: true
        };

        let targets = Array.isArray(cur.targets) ? cur.targets.slice() : ['char'];
        let pos = cur.pos || 'mid';

        card.innerHTML = `
          <div class="ar-sheet-title ar-script">${isNew ? 'Create Module' : 'Edit Module'}</div>
          <div class="ar-sheet-title">${isNew ? '新建模块' : '编辑模块'}</div>
          <div class="cd-cm-field">
            <label class="cd-cm-label">模块名字</label>
            <input class="cd-cm-input" id="cdCmName" maxlength="16" value="${esc(cur.name || '')}" placeholder="例如：微动作强化 / 语气调节">
          </div>
          <div class="cd-cm-field">
            <label class="cd-cm-label">作用范围（可多选）</label>
            <div class="cd-cm-pills" id="cdCmTargets">
              <button type="button" class="cd-cm-pill ${targets.includes('narr') ? 'on' : ''}" data-target="narr">旁白</button>
              <button type="button" class="cd-cm-pill ${targets.includes('offline') ? 'on' : ''}" data-target="offline">线下</button>
              <button type="button" class="cd-cm-pill ${targets.includes('char') ? 'on' : ''}" data-target="char">char</button>
            </div>
          </div>
          <div class="cd-cm-field">
            <label class="cd-cm-label">在提示词中的位置</label>
            <div class="cd-cm-pills" id="cdCmPos">
              <button type="button" class="cd-cm-pill ${pos === 'high' ? 'on' : ''}" data-pos="high">高 (前置)</button>
              <button type="button" class="cd-cm-pill ${pos === 'mid' ? 'on' : ''}" data-pos="mid">中 (默认)</button>
              <button type="button" class="cd-cm-pill ${pos === 'low' ? 'on' : ''}" data-pos="low">低 (后置)</button>
            </div>
          </div>
          <div class="cd-cm-field">
            <label class="cd-cm-label">自定义提示词</label>
            <textarea class="cd-cm-textarea" id="cdCmPrompt" rows="5" placeholder="在此输入要注入给模型的指令或要求...">${esc(cur.prompt || '')}</textarea>
          </div>
          <div class="ar-foot" style="margin-top:12px;">
            <div class="cd-pt-row">
              <button type="button" class="ar-save" id="cdCmSave">保存</button>
              <button type="button" class="ar-close" id="cdCmCancel">返回</button>
            </div>
          </div>
        `;

        card.querySelector('#cdCmCancel').onclick = () => renderListView();

        card.querySelectorAll('#cdCmTargets .cd-cm-pill').forEach(btn => {
            btn.onclick = () => {
                const t = btn.dataset.target;
                if (targets.includes(t)) {
                    if (targets.length > 1) targets = targets.filter(x => x !== t);
                    else { toast('至少选择一项作用范围'); return; }
                } else {
                    targets.push(t);
                }
                btn.classList.toggle('on', targets.includes(t));
            };
        });

        card.querySelectorAll('#cdCmPos .cd-cm-pill').forEach(btn => {
            btn.onclick = () => {
                pos = btn.dataset.pos;
                card.querySelectorAll('#cdCmPos .cd-cm-pill').forEach(b => b.classList.toggle('on', b.dataset.pos === pos));
            };
        });

        card.querySelector('#cdCmSave').onclick = () => {
            const name = card.querySelector('#cdCmName').value.trim() || '自定义模块';
            const prompt = card.querySelector('#cdCmPrompt').value.trim();
            if (!prompt) { toast('请填写提示词内容'); return; }

            const curList = getCustomModulesList();
            if (isNew) {
                curList.push({
                    id: cur.id,
                    name,
                    prompt,
                    targets,
                    pos,
                    enabled: true
                });
            } else {
                const idx = curList.findIndex(x => x.id === cur.id);
                if (idx >= 0) {
                    curList[idx] = Object.assign(curList[idx], { name, prompt, targets, pos });
                } else {
                    curList.push({ id: cur.id, name, prompt, targets, pos, enabled: true });
                }
            }

            saveCustomModulesList(curList);
            renderChatDrop();
            toast('已保存模块 ୨୧');
            renderListView();
        };
    }
}

/* 防八股弹窗底部的导出 / 导入 */
const CD_ICO_EXPORT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
const CD_ICO_IMPORT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>';
function cdIoBar(modal) {
    const io = document.createElement('div');
    io.className = 'cd-io';
    io.innerHTML = `<button class="cd-io-btn" type="button" data-cdio="export" aria-label="导出" title="导出">${CD_ICO_EXPORT}</button><button class="cd-io-btn" type="button" data-cdio="import" aria-label="导入" title="导入">${CD_ICO_IMPORT}</button>`;
    io.addEventListener('click', e => {
        const b = e.target.closest('[data-cdio]'); if (!b) return;
        if (b.dataset.cdio === 'export') cdExportSettings();
        else cdImportSettings(modal);
    });
    return io;
}
function cdExportSettings() {
    const v = readChatPromptSettings();
    const blob = new Blob([JSON.stringify(Object.assign({ kind: 'anti-cliche-settings', version: 1 }, v), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '防八股设置.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出防八股设置');
}
function cdImportSettings(modal) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = async () => {
        const f = input.files && input.files[0]; if (!f) return;
        try {
            const d = JSON.parse(await f.text());
            if (!d || !Array.isArray(d.words)) throw new Error('文件格式不对');
            const lv = d.priorityLevels && typeof d.priorityLevels === 'object' ? d.priorityLevels : {};
            const levels = {};
            d.words.forEach(w => { levels[w] = ['high', 'medium', 'low'].includes(lv[w]) ? lv[w] : 'medium'; });
            saveChatPromptSettings({
                enabled: d.enabled !== false, words: d.words, priorityLevels: levels,
                disabledWords: (d.disabledWords || []).filter(w => d.words.includes(w)),
                customWords: (d.customWords || []).filter(w => d.words.includes(w)),
                customReasons: d.customReasons && typeof d.customReasons === 'object' ? d.customReasons : {},
                priority: d.words.filter(w => levels[w] === 'high')
            });
            modal.remove();
            openChatPromptSettings('ai');
            toast('防八股设置已导入');
        } catch (e) { toast('导入失败：' + ((e && e.message) || '文件不对')); }
    };
    input.click();
}
function openChatPromptSettings(k) {
    if (k === 'greasy') { openGreasyPanPopup(); return; }
    if (k === 'threat' || k === 'fake' || k === 'macho') { openChatPromptTextPopup(k); return; }
    if (k === 'custom') { openCustomModulePopup(); return; }
    if (k !== 'ai') { alert('这个选项暂时没有独立设置项。'); return; }
    const old = document.getElementById('cdPromptSettings'); if (old) old.remove();
    const v = readChatPromptSettings();
    const modal = document.createElement('div'); modal.id = 'cdPromptSettings'; modal.className = 'cd-settings-overlay';
    modal.innerHTML = `<section class="cd-settings" role="dialog" aria-modal="true" aria-label="防八股设置">
      <div class="cd-settings-main"><header><div><span class="cd-settings-kicker">CHAT STYLE / 01</span><strong>禁用词</strong><small>词条优先级决定它们在提示词中的排列位置。</small></div><button class="cd-settings-close" type="button" aria-label="关闭">×</button></header>
      <label class="cd-master"><input id="cdBanEnabled" type="checkbox" ${v.enabled?'checked':''}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.2 3.8 3.7L16 5.8"/></svg><span><b>启用禁用词</b><small>保留人设特点，优先选择自然、具体的表达</small></span></label>
      <div class="cd-settings-section"><div class="cd-settings-label">表达词条 <span>勾选启用 · 高 / 中 / 低控制提示词位置</span></div><div class="cd-word-list">${cdWordListHtml(v.words,v.disabledWords,v.priorityLevels,v.customWords,v.customReasons)}</div></div>
      <div class="cd-settings-section cd-add-section"><button class="cd-add-custom-trigger" type="button" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>添加自定义词条</span></button><textarea id="cdWordAdd" class="cd-word-add" placeholder="输入表达词条，每行一个；可写成 词条|原因" aria-label="自定义词条，每行一个"></textarea></div>
      <div class="cd-settings-hint"><span class="cd-hint-mark">✳</span><p>优先采用贴合角色性格、情境与说话习惯的具体表达。角色可以保留自己的复杂、强势或阴郁，不强迫角色变得善良或温柔。</p></div>
      </div><footer><button class="cd-settings-reset" type="button">恢复默认</button><button class="cd-settings-save" type="button" aria-label="保存设置" title="保存设置"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg></button></footer>
    </section>`;
    modal._cdCustomWords = new Set(v.customWords || []);
    modal._cdCustomReasons = Object.assign({}, v.customReasons || {});
    modal.appendChild(cdIoBar(modal));
    modal.classList.add('is-visible');
    document.body.appendChild(modal);
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
      const newItems=[];
      extra.map(parseWordLine).forEach(({word,reason})=>{if(!word)return;if(!words.includes(word)){words.push(word);levels[word]='medium';modal._cdCustomWords.add(word);if(reason)modal._cdCustomReasons[word]=reason;newItems.push({word,reason});added++;}});
      if(!added){toast('这些词条已经存在');return;}
      persistNewCustomWords(newItems);
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
        // 目标节点已被重绘移走，或点在下拉框范围内：都不算外部点击
        if (e.target && e.target.isConnected === false) return;
        const r = p.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
        if (e.target.closest && (e.target.closest('#chatDrop') || e.target.closest('.chat-head') || e.target.closest('#cdPromptSettings') || e.target.closest('#cdWordEdit') || e.target.closest('#gpPanOverlay') || e.target.closest('#gpPanOverlay') || e.target.closest('.cd-pt-root'))) return;
        p.classList.remove('show');
    });
}
function bindChatDrop() {
    const cap = document.querySelector('.messages-app #chatView .head-capsule');
    if (!cap || cap.dataset.dropBound) return;
    cap.dataset.dropBound = '1';
    cap.addEventListener('click', toggleChatDrop);
}
/* 聊天室时间分隔：间隔超过 10 分钟显示；旧消息没有时间戳时，可见范围第一条显示日期和时间 */
const CHAT_TIME_GAP = 10 * 60 * 1000;
function timeDivHtml(c, i, startIdx) {
    const m = c.msgs[i]; const prev = i > 0 ? c.msgs[i - 1] : null;
    if (m.ts) {
        if (prev && prev.ts && m.ts - prev.ts < CHAT_TIME_GAP) return '';
        return `<div class="tdiv">${esc(fmtMoment(m.ts))}</div>`;
    }
    if (i === startIdx) return `<div class="tdiv">${esc(memDateLabel())} ${esc(m.t || '')}</div>`;
    return '';
}
/* 聊天记录卡片：圆气泡 + 小圆尾巴 + 头像；右边是角色（me 为 true），左边是 user */
function cardAv(src, label, cls) {
    if (src) return `<span class="sc-av ${cls}"><img src="${esc(src)}" alt=""></span>`;
    return `<span class="sc-av ${cls}">${esc((String(label || '').trim().charAt(0) || '?').toUpperCase())}</span>`;
}
function chatCardHtml(list, withName, userName, timeText, withSrc, userSrc) {
    const rows = (list || []).map(m => `<div class="sc-row${m.me ? ' me' : ''}">${m.me ? '' : cardAv(userSrc, userName, 'them')}<span class="sc-bub">${esc(m.text)}</span>${m.me ? cardAv(withSrc, withName, 'self') : ''}</div>`).join('');
    return `<div class="sc-card"><div class="sc-top">${esc(withName || '')}</div><div class="sc-body">${rows}</div><div class="sc-time">${esc(timeText || '')}</div></div>`;
}
function shotMsgHtml(m, i, c) {
    return `<div class="mrow${m.me ? ' me' : ''}" data-i="${i}"><div class="sp"></div>${chatCardHtml(m.shot, m.shotWith, momentUserName(), m.t, (c && (c.avatar || DEFAULT_CHAR_AVATAR)), selfCardSrc())}</div>`;
}
function renderThread(opts) {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    const box = document.getElementById('thread');
    // 只有本次新增的消息播放进场动画；重绘已有消息时不闪
    const shownCount = (opts && opts.noAnim) || box.dataset.chat !== c.id ? c.msgs.length : Number(box.dataset.count || 0);
    const avo = avOptsOf(c);
    const latestHid = latestHeartId(c);
    let heartIdx = -1;
    if (latestHid) c.msgs.forEach((m, i) => { if (!m.me && !m.narr && m.hid === latestHid) heartIdx = i; });
    const fsInline = (c.beauty && Number(c.beauty.fontSize)) ? ` style="font-size:${Number(c.beauty.fontSize)}px !important"` : '';
    let html = '<div class="day">Today</div>';
    const totalMsgs = c.msgs.length;
    const startIdx = Math.max(0, totalMsgs - threadLimit);
    for (let i = startIdx; i < totalMsgs; i++) {
        const m = c.msgs[i];
        if (m.photo) { html += photoMsgHtml(m, i, c, avo); continue; }
        if (m.shot) { html += shotMsgHtml(m, i, c); continue; }
        if (m.momentEvent) {
            html += `<div class="moment-event-row ${i >= shownCount ? 'mrow-new' : ''}" data-i="${i}"><span>${esc(m.text)}</span></div>`;
            continue;
        }
        if (m.narr) {
            html += `<div class="narr-row ${i >= shownCount ? 'mrow-new' : ''}" data-i="${i}"><div class="narr" style="color:${NARR.color};font-size:${NARR.size}px;font-style:${NARR.italic ? 'italic' : 'normal'}">${esc(m.text)}</div></div>`;
            continue;
        }
        // 只看紧邻的前后一条消息。旁白也算分隔：旁白前后的气泡各自开始新的一轮样式，
        // 不会接着上一轮的形状继续连在一起。
        const prev = c.msgs[i - 1] || null;
        const next = c.msgs[i + 1] || null;
        const newGroup = !prev || prev.narr || prev.momentEvent || prev.me !== m.me;
        const lastInGroup = !next || next.narr || next.momentEvent || next.me !== m.me;
        const meta = lastInGroup ? `<span class="mt">${esc(m.t)}</span>` : '';
        const showAv = avo.scope === 'all' || newGroup;
        const hv = (i === heartIdx) ? `<span class="hv-stack"><span class="hv-line"></span>${HEART_SVG}</span>` : '';
        const sp = m.me ? '' : (avo.them && showAv ? `<div class="av-col"><span class="avf">${avatar(c, 'sm')}</span>${hv}</div>` : '<div class="sp"></div>');
        const spR = (m.me && avo.me) ? (showAv ? `<div class="av-col"><span class="avf">${selfAvatarHtml('sm')}</span></div>` : '<div style="width:32px;flex-shrink:0"></div>') : '';
        const pos = newGroup && lastInGroup ? 'g-single' : newGroup ? 'g-head' : lastInGroup ? 'g-tail' : 'g-mid';
        const grp = (pos === 'g-head') ? 'grp-head' : '';
        const qHtml = m.quote && m.quote.text ? `<div class="qt-in"><b>${esc(m.quote.me ? (ME.name || '我') : c.name)}</b>${esc(m.quote.text)}</div>` : '';
        const trc = transCfgOf(c);
        let trCls = '', trAttr = '', trHtml = '';
        if (m.trans && trc.on && !m.me) {
            if (trc.style === 'box') { trCls = ' tr-box'; trHtml = `<div class="trans-float${trc.auto ? ' open' : ''}" onclick="event.stopPropagation();this.classList.toggle('open')">${esc(m.trans)}</div>`; }
            else { trCls = ' tr-dash' + (trc.auto ? ' open' : ''); trAttr = ' onclick="this.classList.toggle(\'open\')"'; trHtml = `<div class="trans-dash">${esc(m.trans)}</div>`; }
        }
        html += timeDivHtml(c, i, startIdx) + `<div class="mrow ${m.me ? 'me' : ''} ${m.voice ? 'voice-row' : ''} ${newGroup && i > startIdx ? 'gap' : ''} ${grp} ${i >= shownCount ? 'mrow-new' : ''} ${hv ? 'has-hv' : ''}" data-i="${i}">${m.me ? spR : sp}<div class="bubble ${pos}${trCls}${m.voice ? ' voice-bubble' : ''}${m.polaroid ? ' cp-bubble' : ''}${m.loc ? ' lc-bubble' : ''}${m.file ? ' ff-bubble' : ''}"${fsInline}${trAttr}>${qHtml}${m.file ? ffCardHtml(m, i) : (m.loc ? locInnerHtml(m.text) : (m.polaroid ? polaroidInnerHtml(m.text) : (m.voice ? voiceInnerHtml(m.text) : esc(m.text))))}${trHtml}</div>${meta}</div>`;
    }
    if (c._typing) {
        html += `<div class="mrow typing mrow-new" id="typingRow"><div class="av-col"><span class="avf">${avatar(c, 'sm')}</span></div><div class="ct-bubble">${ctSvgHtml('ct-chat')}</div></div>`;
    }
    box.innerHTML = html;
    hydrateChatPhotos(box);
    box.dataset.chat = c.id;
    box.dataset.count = c.msgs.length;
    if (!opts || !opts.prepend) {
        box.scrollTop = box.scrollHeight;
    }
    if (c._typing) ctEnsure();
    if (MM.mode === 'multi') mmRefreshSel();
}
/* ---------------- 调取中：云朵气泡（呼吸 + 慢速滚动） ---------------- */
const CT_N = 10, CT_CX = 50, CT_CY = 44, CT_RX = 40, CT_RY = 32;
function ctCloudD(amp, phase, mods) {
    const pts = [];
    for (let i = 0; i < CT_N; i++) {
        const a = phase + i / CT_N * Math.PI * 2;
        pts.push([CT_CX + Math.cos(a) * CT_RX, CT_CY + Math.sin(a) * CT_RY]);
    }
    const f = 1 + amp * 2;
    let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i <= CT_N; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i % CT_N];
        const r = Math.hypot(x1 - x0, y1 - y0) / 2 * f * (mods ? mods[i - 1] : 1);
        d += `A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    }
    return d + 'Z';
}
function ctSvgHtml(cls) {
    return `<svg class="ct-svg ${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle class="ct-tail" cx="14" cy="84" r="5.5"/><path class="ct-shape" d=""/><circle class="ct-dot" cx="36" cy="44" r="5"/><circle class="ct-dot" cx="50" cy="44" r="5"/><circle class="ct-dot" cx="64" cy="44" r="5"/></svg>`;
}
let ctRaf = 0;
function ctTick(now) {
    const els = document.querySelectorAll('.messages-app .ct-svg');
    if (!els.length) { ctRaf = 0; return; }
    const t = now / 1000;
    const w = (x, s) => 0.5 + 0.5 * Math.sin(x * s);
    const amp = 0.05 + 0.05 * w(t, 1.1);
    const phase = t * 1.1;
    const mods = Array.from({ length: CT_N }, (_, i) => 1 + 0.08 * Math.cos(2 * Math.PI * i / CT_N - t * 1.1));
    const tailOp = 0.35 + 0.65 * w(t * 3, 1);
    const d = ctCloudD(amp, phase, mods);
    els.forEach(svg => {
        svg.querySelector('.ct-shape').setAttribute('d', d);
        svg.querySelector('.ct-tail').setAttribute('opacity', tailOp.toFixed(3));
        svg.querySelectorAll('.ct-dot').forEach((c, i) => c.setAttribute('opacity', (0.35 + 0.65 * w(t * 3 - i * 1.1, 1)).toFixed(3)));
    });
    ctRaf = requestAnimationFrame(ctTick);
}
function ctEnsure() { if (!ctRaf) ctRaf = requestAnimationFrame(ctTick); }
function showTyping(c) {
    const box = document.getElementById('thread');
    const el = document.createElement('div');
    el.className = 'mrow typing mrow-new'; el.id = 'typingRow';
    el.innerHTML = `<div class="av-col"><span class="avf">${avatar(c, 'sm')}</span></div><div class="ct-bubble">${ctSvgHtml('ct-chat')}</div>`;
    box.appendChild(el); box.scrollTop = box.scrollHeight;
    ctEnsure();
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
const CHAT_OPTS_KEY = 'whatever_messages_chat_opts_v1';
function coClamp(x, lo, hi, d) { const n = parseInt(x, 10); return Number.isFinite(n) ? Math.max(lo, n) : d; }
function loadChatOpts() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAT_OPTS_KEY) || 'null');
        if (v && typeof v === 'object') return { min: coClamp(v.min, 1, 10, 1), max: coClamp(v.max, 1, 10, 7), batch: !!v.batch };
    } catch (_) {}
    return { min: 1, max: 7, batch: false };
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
        max: o.max !== undefined ? coClamp(o.max, 1, 10, 7) : CHAT_OPTS.max,
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
    c.chatOpts = { ...(c.chatOpts || {}), min, max, batch: o.batch };
    persistContacts(); renderRoomPane();
}
function stepRoomOpt(key, delta) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const o = chatOptsOf(c);
    setRoomOpt(key, (key === 'min' ? o.min : o.max) + delta);
}
const TR_SRC = ['英文', '日文', '韩文', '法文', '德文', '西班牙文', '俄文', '自动识别'];
const TR_TGT = ['中文', '英文', '日文', '韩文'];
function transCfgOf(c) {
    const t = (c && c.chatOpts && c.chatOpts.trans) || {};
    return { on: !!t.on, src: t.src || '英文', tgt: t.tgt || '中文', style: t.style === 'box' ? 'box' : 'dash', auto: !!t.auto };
}
function autoFillBoxCss(c) {
    const cur = chatCssOf(c) || '';
    if (cur.includes(CSS_TEMPLATES.boxStyle)) return;
    const next = (cur.trim() ? cur.replace(/\s*$/, '\n') : '') + CSS_TEMPLATES.boxStyle;
    const ta = document.getElementById('roomCssInput');
    if (ta) ta.value = next;
    c.beauty = Object.assign({}, c.beauty || {}, { css: next });
    delete c.beauty.bubble;
    applyRoomBeauty(c);
}
function setTransOpt(key, val) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    c.chatOpts = { ...(c.chatOpts || {}), trans: { ...transCfgOf(c), [key]: val } };
    if (key === 'style' && val === 'box') autoFillBoxCss(c);
    persistContacts(); renderRoomPane();
}
/* 开启翻译时，追加给模型的格式要求：译文只放在 trans 字段里，不用任何符号分隔 */
function transLine(c) {
    const t = transCfgOf(c);
    if (!t.on) return '';
    return `\n【翻译｜本条优先于输出格式里 messages 为字符串的写法】对方用${t.src}说话（选择自动识别时自行判断语言）。messages 的每一项都必须是对象：{"text":"${t.src}原文","trans":"${t.tgt}译文"}，不能再写成普通字符串。text 里只写原文，译文只放在 trans 里，不要加任何符号、标记或括号。`;
}
function transSettingsHTML(c) {
    const t = transCfgOf(c);
    const opts = (arr, cur) => arr.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('');
    return `
        <div class="rp-label rp-center">翻译</div>
        <div class="rp-opt">
            <div class="rp-opt-row tr-row"><div><div class="rp-opt-t">开启翻译</div><div class="rp-opt-s">对面的回复会附带译文</div></div><button class="rp-switch ${t.on ? 'on' : ''}" type="button" onclick="setTransOpt('on', ${!t.on})" aria-label="开启翻译"></button></div>
            <div class="rp-opt-row tr-row"><div><div class="rp-opt-t">对面输出的原文语言</div></div><select class="tr-sel" onchange="setTransOpt('src', this.value)">${opts(TR_SRC, t.src)}</select></div>
            <div class="rp-opt-row tr-row"><div><div class="rp-opt-t">翻译成</div></div><select class="tr-sel" onchange="setTransOpt('tgt', this.value)">${opts(TR_TGT, t.tgt)}</select></div>
            <div class="rp-opt-row tr-row"><div><div class="rp-opt-t">显示样式</div></div><div class="tr-seg"><button type="button" class="${t.style === 'dash' ? 'on' : ''}" onclick="setTransOpt('style', 'dash')">虚线展开</button><button type="button" class="${t.style === 'box' ? 'on' : ''}" onclick="setTransOpt('style', 'box')">黑方块</button></div></div>
            <div class="rp-opt-row tr-row"><div><div class="rp-opt-t">自动展开翻译</div></div><button class="rp-switch ${t.auto ? 'on' : ''}" type="button" onclick="setTransOpt('auto', ${!t.auto})" aria-label="自动展开翻译"></button></div>
        </div>`;
}
function toggleRoomBatch() {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const o = chatOptsOf(c);
    c.chatOpts = { ...(c.chatOpts || {}), min: o.min, max: o.max, batch: !o.batch };
    persistContacts(); renderRoomPane();
}

/* 把联系人的一组消息发出来：一次性发出 = 一起出现、无动画；否则一条一条出现 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function deliverMsgs(c, parts, runToken) {
    if (runToken !== undefined && c._pullToken !== runToken) return;
    if (chatOptsOf(c).batch) {
        // 一次性发出：每一句都响一声，错开 150ms 免得叠在一起听不清
        parts.forEach((t, i) => {
            c.msgs.push(msgOf(t));
            if (activeId !== c.id) c.unread = (c.unread || 0) + 1;
            setTimeout(() => playSfx('recv'), i * 150);
        });
        c.time = nowTime(); persistContacts();
        if (activeId === c.id) renderThread({noAnim:true});
        renderChats();
        return;
    }
    for (let i = 0; i < parts.length; i++) {
        if (runToken !== undefined && c._pullToken !== runToken) return;
        if (i > 0) await sleep(650);
        if (runToken !== undefined && c._pullToken !== runToken) return;
        playSfx('recv');   // 每一句出现时都响一声
        c.msgs.push(msgOf(parts[i]));
        if (activeId !== c.id) c.unread = (c.unread || 0) + 1;
        c.time = nowTime(); persistContacts();
        if (activeId === c.id) renderThread();
        renderChats();
    }
}

/* 聊天回复时可供互动的旧朋友圈（受“允许回看旧朋友圈”开关控制） */
function oldMomentFeedOf(c) {
    const cfg = mfLoad();
    const oldOn = ((cfg.per[c.id] || {}).oldOn !== false) && cfg.oldOn !== false;
    if (!oldOn) return [];
    return POSTS.filter(p => momentVisibleTo(p, c)).slice(0, 20).map(p => ({
        id: p.id, imgKeys: keysOfPost(p), author: momentAuthor(p.by).name, text: plainMentions(p.text),
        comments: (p.comments || []).slice(-8).map(cm => `${momentAuthor(cm.by).name}：${plainMentions(cm.text)}`).join('；') || '无'
    }));
}
let pullTimer = null;
function stopPullReply(c) {
    if (!c) return;
    c._pullToken = (c._pullToken || 0) + 1;
    if (c._pullAbort) {
        try { c._pullAbort.abort(); } catch (_) {}
        c._pullAbort = null;
    }
    if (window.__activePullAbort === c._pullAbort) window.__activePullAbort = null;
    c._busy = false;
    c._typing = false;
    const row = document.getElementById('typingRow');
    if (row) row.remove();
    const capCur = document.querySelector('.messages-app .send-capsule');
    if (capCur) capCur.classList.remove('pulling');
    if (activeId === c.id) renderThread({ noAnim: true });
    renderChats();
    toast('已停止调取');
}
async function pullReply() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c) return;
    if (c._busy) {
        stopPullReply(c);
        return;
    }
    const runToken = (c._pullToken = (c._pullToken || 0) + 1);
    const o = chatOptsOf(c);
    const configured = !!(window.MessagesAPI && window.MessagesAPI.isConfigured());
    if (!configured) {
        // 没有接入 API：按顺序发送联系人的自动回复
        if (!c.replies || !c.replies.length) { toast('请先在「设置 → API」保存接口配置，或在联系人人设里填写自动回复'); return; }
        c._busy = true;
        const cap0 = document.querySelector('.messages-app .send-capsule'); if (cap0) cap0.classList.add('pulling');
        try { await deliverMsgs(c, c.replies.slice(0, o.max), runToken); }
        finally {
            if (c._pullToken === runToken) {
                c._busy = false;
                const capEnd = document.querySelector('.messages-app .send-capsule'); if (capEnd) capEnd.classList.remove('pulling');
            }
        }
        return;
    }
    c._busy = true;
    const abortCtrl = new AbortController();
    c._pullAbort = abortCtrl;
    window.__activePullAbort = abortCtrl;
    const cap = document.querySelector('.messages-app').querySelector('.send-capsule'); if (cap) cap.classList.add('pulling');
    showTyping(c);
    c._typing = true; renderChats();
    try {
        const countDesc = o.min === o.max ? `本次对话台词气泡必须精确输出 ${o.min} 条（指角色说出口的话；不含以【旁白】开头的项，旁白按需自由穿插在气泡前、中、后）` : `本次对话台词气泡必须输出 ${o.min} 到 ${o.max} 条（指角色说出口的话；不含以【旁白】开头的项，旁白按需自由穿插在气泡前、中、后）`;
        const instruction = `请结合上下文继续回复，严格按系统要求只输出 JSON。【台词气泡限制】：${countDesc}，严禁将多句话合并进同一个气泡。非人设影响的情况不要在每个气泡里面放很多句话，短的句子在条数允许的情况下就单发一条气泡。不要惊叹转移话题，不要复述user的话不要重复说自己说过的话，应该直接给出回复和反应，不要重复user说的话或者动作。` + VOICE_RULE + PHOTO_RULE + LOC_RULE + (mfAllowed(c) ? ' 【朋友圈】你可以自主决定这次回复要不要顺便发一条朋友圈：要发就在 JSON 顶层加上 \"moment\" 字段，值为朋友圈文字；不发就不要写这个字段。若这条朋友圈想配照片，moment 写成 {\"text\":\"朋友圈文字\",\"photos\":[\"每张照片的一句话描述\"]}，照片张数由你自己决定（0 到 9 张）；没有照片就直接写字符串。若想把你们的聊天室截图发到朋友圈，moment 写成 {\"text\":\"配文\",\"chatShot\":true}。' : '') + ' 【聊天室截图】如果你想把你们的聊天记录截图发给用户，在 JSON 顶层加上 "shot":true，并写 "shotN":截取最近几条（1 到 30，由你自己决定），"shotTitle":你给用户的备注（截图顶部显示的名字）；不发就不要写这些字段。' + narrInstruction();
        window.MESSAGES_USER_NAME = ME.name;
        window.MESSAGES_USER_PERSONA = ME.persona || '';
        await preloadChatPhotos(c);
        if (c._pullToken !== runToken) return;
        const stealPool = stealPoolOf(c).slice(0, 4);
        await primeKeys(stealPool.map(x => x.key));
        if (c._pullToken !== runToken) return;
        window.MESSAGES_STEAL_LIST = stealPool.map(x => x.desc || '一张照片');
        window.MESSAGES_STEAL_KEYS = stealPool.map(x => x.key);
        window.MESSAGES_PHOTO_GET = k => MOMENT_IMG_CACHE[k] || '';
        const replies = await Promise.race([
            window.MessagesAPI.replyFor(c, instruction + transLine(c), o.max + (NARR.on ? 3 : 0), oldMomentFeedOf(c)),
            new Promise((_, rej) => abortCtrl.signal.addEventListener('abort', () => {
                const err = new Error('已停止调取');
                err.name = 'AbortError';
                rej(err);
            }, { once: true }))
        ]);
        if (c._pullToken !== runToken) return;
        const heart = replies.heart || null;
        const stolen = (replies.moment && replies.moment.stealIdx) ? pickStolenPhoto({ steal: true, stealIdx: replies.moment.stealIdx, photos: replies.moment.photos }, stealPool) : null;
        if (stolen && replies.moment) { if (!(replies.moment.photos || []).length) replies.moment.photos = [stolen.desc || '']; replies.moment.stolenKeys = stolen.imgs; }
        if (replies.moment && (replies.moment.text || (replies.moment.photos || []).length || replies.moment.chatShot) && mfAllowed(c)) {
            let shotKey = null;
            try { shotKey = replies.moment.chatShot ? await saveChatShot(c) : null; }
            catch (err) { console.warn('[截图]', err); toast('截图出错：' + describeErr(err)); }
            if (c._pullToken !== runToken) return;
            postContactMoment(c, replies.moment.text, [], { stolenKeys: replies.moment.stolenKeys, photos: replies.moment.photos || [], chatShot: !!replies.moment.chatShot && !shotKey, chatShotKey: shotKey, shotN: replies.moment.shotN, shotTitle: replies.moment.shotTitle });
        }
        const acted = applyChatMomentInteractions(c, replies.momentInteractions || []) || [];
        if (acted.length) notePosterDone(acted);
        c._typing = false;
        const row = document.getElementById('typingRow'); if (row) row.remove();
        const capCur = document.querySelector('.messages-app .send-capsule'); if (capCur) capCur.classList.remove('pulling');
        const parts = replies.map((p, i) => { const pt = narrPart(p, c.name); if (pt && replies.trans && replies.trans[i]) pt.trans = replies.trans[i]; return pt; }).filter(Boolean);
        if (parts.some(pt => pt.voice || pt.polaroid || pt.loc)) vibrateTiny();
        parts.forEach(pt => { if (pt.quoteRaw) { pt.quote = resolveQuote(c, pt.quoteRaw); delete pt.quoteRaw; } });
        if (!parts.length) throw new Error('模型没有返回可用的消息，请重试');
        const startLen = c.msgs.length;
        await deliverMsgs(c, parts, runToken);
        if (c._pullToken !== runToken) return;
        attachHeart(c, heart, startLen); persistContacts();
        if (replies.shot) {
            const shotKey = await saveChatShot(c);
            if (c._pullToken !== runToken) return;
            const shotMsg = shotKey
                ? { me: false, text: '', photo: shotKey, t: nowTime(), ts: Date.now() }
                : { me: false, text: '', shot: snapshotChatRoom(c, replies.shotN), shotWith: replies.shotTitle || momentUserName(), t: nowTime(), ts: Date.now() };
            c.msgs.push(shotMsg); persistContacts();
        }
        if (activeId === c.id) renderThread({noAnim:true});
        maybeAutoSummary(c);
    } catch (e) {
        if (c._pullToken !== runToken || (e && e.name === 'AbortError')) return;
        c._typing = false;
        const row = document.getElementById('typingRow'); if (row) row.remove();
        showApiError(e);
    } finally {
        if (c._pullToken === runToken) {
            c._busy = false;
            c._typing = false;
            c._pullAbort = null;
            if (window.__activePullAbort === abortCtrl) window.__activePullAbort = null;
            const capCur = document.querySelector('.messages-app .send-capsule');
            if (capCur) capCur.classList.remove('pulling');
            renderChats();
        }
    }
}

/* ---------------- 底栏上拉菜单：重新回复 ---------------- */
// 删掉最后一条我发的消息之后，对方这一轮的所有回复，然后重新调取
function redoLastReply() {
    const c = CONTACTS.find(x => x.id === activeId);
    if (!c || c._busy) return;
    let lastMe = -1;
    c.msgs.forEach((m, i) => { if (m.me) lastMe = i; });
    if (lastMe < 0) { toast('还没有我发的消息，没法重新回复'); return; }
    c.msgs = c.msgs.slice(0, lastMe + 1);
    persistContacts(); renderThread(); renderChats();
    toggleQuickMenu(false);
    pullReply();
}

// 把「重新回复」插到上拉菜单的第一个（只插一次）
function ensureRedoQuickItem() {
    const menu = document.getElementById('quickMenu');
    if (!menu || menu.querySelector('[data-quick="redo"]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quick-item';
    b.dataset.quick = 'redo';
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8"/><path d="M20 3v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16"/><path d="M4 21v-5h5"/></svg><span>重新回复</span>';
    b.addEventListener('click', e => { e.stopPropagation(); redoLastReply(); });
    menu.insertBefore(b, menu.firstChild);
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
    const q = quoteDraft;
    c.msgs.push(Object.assign({me:true,text,t:nowTime(), ts: Date.now()}, narrInputMode ? {narr:true} : {}, q ? { quote: { me: q.me, text: q.text } } : {})); c.time=nowTime(); playSfx('send'); vibrateTiny();
    clearQuote(true);
    input.value=''; autoGrow(); updateSend(); persistContacts(); renderThread(); renderChats();
}
function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function onTyping() { autoGrow(); updateSend(); }
function autoGrow() { const t = document.getElementById('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }
function updateSend() { document.getElementById('sendBtn').classList.toggle('ready', document.getElementById('input').value.trim().length > 0); }

/* ---------------- 输入手势 ---------------- */
let touchStartY = 0;
let touchStartX = 0;
let touchStartInCap = false;

/* ---------------- 旁白：开启后 AI 会输出动作 / 神态 / 环境，以【旁白】开头单独成条 ---------------- */
const NARR_KEY = 'whatever_messages_narr_v1';
const NARR_DEFAULT = { on: false, person: '2', min: 10, max: 40, mode: 'free', size: 13.5, italic: true, color: '#9A9AA0' };
let NARR = (() => { try { return Object.assign({}, NARR_DEFAULT, JSON.parse(localStorage.getItem(NARR_KEY) || '{}')); } catch (_) { return Object.assign({}, NARR_DEFAULT); } })();
function saveNarr() { try { localStorage.setItem(NARR_KEY, JSON.stringify(NARR)); } catch (_) {} }
/* 一次性迁移：旁白默认关闭（之前存过 on:true 的会被重置为关闭，之后用户再开启不受影响） */
try {
    if (!localStorage.getItem('whatever_messages_narr_default_off_v1')) {
        NARR.on = false; saveNarr();
        localStorage.setItem('whatever_messages_narr_default_off_v1', '1');
    }
} catch (_) {}
function narrInstruction() {
    if (!NARR.on) return '';
    const person = NARR.person === '1' ? '第一人称（用“我”描写用户的动作）' : NARR.person === '2' ? '第二人称（用“你”描写用户的动作）' : `第三人称（用用户的名字“${window.MESSAGES_USER_NAME || '用户'}”描写用户的动作）`;
    const mode = NARR.mode === 'online' ? '线上聊天时的状态（比如正在打字、看手机、发语音）' : NARR.mode === 'offline' ? '线下面对面的场景和动作（比如靠近、递东西、看向远处）' : '情境相符即可，不限定场景';
    return `\n【旁白穿插与字数硬性规则】：\n`
        + `1. 本次回复必须包含旁白，旁白作为独立的数组项，可以且应当【自由穿插在台词气泡的前面、中间或末尾】（例如：[旁白, 气泡1, 旁白, 气泡2] 或 [气泡1, 旁白, 气泡2]），不占用台词条数计数。\n`
        + `2. 任何旁白数组项必须单独成条，且必须严格以【旁白】二字开头，例如："【旁白】详细的动作神态描写..."。\n`
        + `3. 【字数充实要求】：每条旁白字数必须丰富充实，严格落在 ${NARR.min} 到 ${NARR.max} 字之间（绝不可只有寥寥几个字敷衍带过！）。要细致描摹微表情、肢体动作细节、视线停顿、呼吸、当下环境氛围或心理停顿。\n`
        + `4. 旁白描写范围：${mode}；旁白中提到用户时使用：${person}。`;
}
document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.voice-btn');
    if (!b) return;
    const body = b.parentElement && b.parentElement.querySelector('.voice-body');
    if (!body) return;
    const open = body.hidden;
    body.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
    const ico = b.querySelector('i');
    if (ico) ico.className = open ? 'ti ti-player-pause' : 'ti ti-player-play';
});
/* 语音：AI 自己决定发不发，以【语音】开头单独成条；「」内是声音和氛围，其余是说出口的话 */
const PHOTO_RULE = '【照片】：你也可以发一张照片（照片不计入台词条数，只在情境自然时使用）。要发就在 messages 数组里放一个 JSON 对象项，格式为 {"photo":"照片描述"}，对象里不要加其他字段，例如：{"photo":"窗边的光落在桌上，一杯咖啡冒着热气"}。描述写照片里能看到的内容。';
const LOC_RULE = '【位置】：你也可以发一个位置（不计入台词条数，只在情境自然时使用）。要发就在 messages 数组里放一个 JSON 对象项，格式为 {"location":{"name":"地点名称","addr":"地址"}}，对象里不要加其他字段，例如：{"location":{"name":"静安嘉里中心","addr":"南京西路 1515 号"}}。';
const VOICE_RULE = '【语音】：你可以自主决定这次要不要发一条语音（语音不计入台词条数）。只在情境自然时使用，不要每次都发。要发就在 messages 数组里放一个 JSON 对象项，格式为 {"voice":"语音内容"}，对象里不要加其他字段，例如：{"voice":"「窗外传来雨声，他停了一下，声音压得很低：」你到了就好，路上还顺利吗？「椅子轻轻响了一声。」"}。语音中说出口的话直接写，声音、停顿、呼吸和周围氛围必须用「」括起来单独描述。普通台词仍然写成字符串。';
function voiceDurText(text) {
    const n = String(text || '').replace(/[「」]/g, '').replace(/\s/g, '').length;
    const sec = Math.max(1, Math.round(n / 4));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function voiceInnerHtml(text) {
    return `<button class="voice-btn" type="button" aria-expanded="false"><span class="voice-play" aria-hidden="true"></span><span class="voice-wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span><span class="voice-dur">${voiceDurText(text)}</span></button><div class="voice-body" hidden>${voiceBodyHtml(text)}</div>`;
}
function voiceBodyHtml(text) {
    return esc(text).replace(/「([^」]*)」/g, '<span class="voice-aside">「$1」</span>');
}
/* 解析单条回复：旁白保留，普通台词照旧清理 */
function narrPartBase(p, name) {
    const s = String(p || '').trim();
    const lo = s.match(/^【位置】\s*([\s\S]*)$/);
    if (lo) {
        const t = cleanMsgPart(lo[1].trim(), name);
        return t ? { text: t, narr: false, loc: true } : null;
    }
    const ph = s.match(/^【照片】\s*([\s\S]*)$/);
    if (ph) {
        const t = cleanMsgPart(ph[1].trim(), name);
        return t ? { text: t, narr: false, polaroid: true } : null;
    }
    const v = s.match(/^【语音】\s*([\s\S]*)$/);
    if (v) {
        const t = cleanMsgPart(v[1].trim(), name);
        return t ? { text: t, narr: false, voice: true } : null;
    }
    const m = s.match(/^【旁白】\s*([\s\S]*)$/);
    if (m) {
        const t = m[1].trim();
        if (!t) return null;
        return NARR.on ? { text: t, narr: true } : { text: t, narr: false };
    }
    const t = cleanMsgPart(s, name);
    return t ? { text: t, narr: false } : null;
}
/* 解析单条回复：先剥离开头的 <quote who="user|char">原话</quote>，再按旁白 / 普通台词处理 */
function narrPart(p, name) {
    const s = String(p || '').trim();
    const qm = s.match(/^<quote\s+who="(user|char)">([\s\S]*?)<\/quote>\s*([\s\S]*)$/);
    const r = narrPartBase(qm ? qm[3] : s, name);
    if (r && qm && qm[2].trim()) r.quoteRaw = { me: qm[1] === 'user', text: qm[2].trim() };
    return r;
}
/* 把模型给的引用原话对回聊天记录，存下原文快照 */
function resolveQuote(c, q) {
    const snip = String((q && q.text) || '').trim();
    if (!snip) return null;
    const hit = [...c.msgs].reverse().find(m => !m.narr && !!m.me === !!q.me && String(m.text || '').includes(snip));
    return { me: !!q.me, text: hit ? String(hit.text) : snip };
}
/* 旁白弹窗背景图：相对于本脚本位置（js/apps/messages.js → ../../assets/聊天室设置背景图/旁白弹窗.jpg） */
const NARR_BG_URL = new URL('../../assets/聊天室设置背景图/旁白弹窗.jpg', MSG_SCRIPT_URL || location.href).href;
/* 弹窗（参考大天使：浅色卡片 + 英文小标题 + 分段按钮 + 灰色胶囊按钮） */
function openMqSheet(innerHtml, cardClass, cardStyle) {
    const root = document.querySelector('.messages-app'); if (!root) return;
    const existing = document.getElementById('mqSheet');
    const existingCard = existing && existing.querySelector('.mq-sheet-card');
    /* 同类型弹窗原位更新：不移除遮罩层，不重复触发淡入；只有内容确实变化时才更新节点。 */
    if (existing && existingCard && existingCard.classList.contains(cardClass || '')) {
        const nextClass = `mq-sheet-card ${cardClass || ''}`.trim();
        if (existingCard.className !== nextClass) existingCard.className = nextClass;
        const nextStyle = cardStyle || '';
        if (existingCard.getAttribute('style') !== nextStyle) existingCard.setAttribute('style', nextStyle);
        if (existingCard.innerHTML !== innerHtml) {
            const scrollTop = existingCard.scrollTop;
            existingCard.innerHTML = innerHtml;
            existingCard.scrollTop = scrollTop;
        }
        return;
    }
    closeMqSheet();
    const s = document.createElement('div');
    s.id = 'mqSheet'; s.className = 'mq-sheet';
    s.innerHTML = `<div class="mq-sheet-card ${cardClass || ''}" style="${cardStyle || ''}">${innerHtml}</div>`;
    s.addEventListener('click', ev => { if (ev.target === s) closeMqSheet(); });
    root.appendChild(s);
    requestAnimationFrame(() => s.classList.add('show'));
}
function closeMqSheet() { const s = document.getElementById('mqSheet'); if (s) s.remove(); }
function openMoreSheet() {
    const slot = '<button class="quick-item mq-slot" type="button" disabled><svg viewBox="0 0 24 24"><path d="M12 7v10M7 12h10"/></svg><span>空位</span></button>';
    openMqSheet(`<div class="mq-sheet-title mq-script">More</div>
        <div class="more-grid">
            <button class="quick-item" type="button" onclick="openNarrSheet()"><svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h10M5 18h7"/></svg><span>旁白</span></button>
            ${slot}${slot}${slot}
        </div>
        <div class="mq-foot"><button class="mq-close" type="button" onclick="closeMqSheet()">关闭</button></div>`);
}
/* 旁白弹窗背景图：默认采用指定参数；通过密码入口可临时调整并保存 */
const NB_KEY = 'whatever_messages_narr_bg_v5';
const NB_DEFAULT = Object.freeze({ x: 29, y: -2, w: 350, h: 356, opacity: 0.75, overlay: 0.65 });
let NB = Object.assign({}, NB_DEFAULT);
let NB_PANEL = false;
let NB_UNLOCKED = false;
let NB_PASSWORD_OPEN = false;
function loadNB() {
    try {
        const saved = JSON.parse(localStorage.getItem(NB_KEY) || 'null');
        if (saved && typeof saved === 'object') {
            /* X 位置被锁定为 29，不读取任何旧值；其余参数仍可保存并恢复。 */
            ['y','w','h','opacity','overlay'].forEach(k => {
                const n = Number(saved[k]);
                if (Number.isFinite(n)) NB[k] = n;
            });
            NB.x = NB_DEFAULT.x;
        }
    } catch (_) {}
}
loadNB();
function saveNB() {
    try { localStorage.setItem(NB_KEY, JSON.stringify(NB)); } catch (_) {}
}
function nbStyle() {
    return `--nb-img:url('${NARR_BG_URL}');--nb-x:${NB.x}px;--nb-y:${NB.y}px;--nb-w:${NB.w}px;--nb-h:${NB.h}px;--nb-opacity:${NB.opacity};--nb-overlay:${NB.overlay};`;
}
function applyNB() {
    const c = document.querySelector('.mq-narr'); if (!c) return;
    c.style.setProperty('--nb-x', NB.x + 'px');
    c.style.setProperty('--nb-y', NB.y + 'px');
    c.style.setProperty('--nb-w', NB.w + 'px');
    c.style.setProperty('--nb-h', NB.h + 'px');
    c.style.setProperty('--nb-opacity', String(NB.opacity));
    c.style.setProperty('--nb-overlay', String(NB.overlay));
}
function nbShown(key) { return key === 'opacity' || key === 'overlay' ? NB[key].toFixed(2) : Math.round(NB[key]); }
function narrBgSet(key, value) {
    /* 左右位置 X 固定为 29，不允许控件或旧脚本修改。 */
    if (key === 'x') { NB.x = NB_DEFAULT.x; applyNB(); return; }
    if (!['y','w','h','opacity','overlay'].includes(key)) return;
    let n = Number(value);
    if (!Number.isFinite(n)) return;
    if (key === 'w' || key === 'h') n = Math.max(1, Math.min(1200, n));
    if (key === 'x' || key === 'y') n = Math.max(-1000, Math.min(1000, n));
    if (key === 'opacity' || key === 'overlay') n = Math.max(0, Math.min(1, n));
    NB[key] = n;
    applyNB(); saveNB();
    const out = document.getElementById('nb-val-' + key);
    if (out) out.textContent = nbShown(key) + ((key === 'opacity' || key === 'overlay') ? '' : 'px');
}
function narrBgFill() { /* 兼容旧调用 */ }
function narrBgReset() {
    NB = Object.assign({}, NB_DEFAULT); saveNB(); applyNB();
    /* 只同步控件数值，不重建旁白弹窗，避免背景图闪动。 */
    ['y','w','h','opacity','overlay'].forEach(key => {
        const input = document.querySelector(`#mqNbPanel [oninput="narrBgSet('${key}',this.value)"]`);
        if (input) input.value = NB[key];
        const out = document.getElementById('nb-val-' + key);
        if (out) out.textContent = nbShown(key) + ((key === 'opacity' || key === 'overlay') ? '' : 'px');
    });
    const x = document.getElementById('nb-val-x'); if (x) x.textContent = '29px';
}
function narrBgPanel() {
    const panel = document.getElementById('mqNbPanel');
    if (!panel) return;
    NB_PANEL = !NB_PANEL;
    panel.hidden = !NB_PANEL;
    const btn = document.getElementById('mqNbToggle');
    if (btn) btn.setAttribute('aria-expanded', String(NB_PANEL));
}
function nbRow(key, label, min, max, step) {
    if (key === 'x') {
        return `<div class="mq-nb-row mq-nb-locked"><span class="mq-nb-top"><span>${label}（已锁定）</span><span id="nb-val-x">29px</span></span></div>`;
    }
    return `<label class="mq-nb-row"><span class="mq-nb-top"><span>${label}</span><span id="nb-val-${key}">${nbShown(key)}${key === 'opacity' || key === 'overlay' ? '' : 'px'}</span></span><input type="number" class="mq-nb-input" value="${NB[key]}" min="${min}" max="${max}" step="${step}" oninput="narrBgSet('${key}',this.value)"></label>`;
}
function unlockNarrBg() {
    if (NB_UNLOCKED) {
        narrBgPanel();
        return;
    }
    NB_PASSWORD_OPEN = !NB_PASSWORD_OPEN;
    openNarrSheet();
}
function checkNarrBgPassword() {
    const input = document.getElementById('mqNbPassword');
    const error = document.getElementById('mqNbPasswordError');
    if (!input) return;
    if (input.value === '91235') {
        NB_UNLOCKED = true;
        NB_PASSWORD_OPEN = false;
        NB_PANEL = true;
        openNarrSheet();
    } else {
        if (error) error.textContent = '密码不正确，请重新输入';
        input.value = '';
        input.focus();
    }
}
function openNarrSheet() {
    const seg = (key, opts, cur) => `<div class="mq-seg">${opts.map(([v, t]) => `<button type="button" class="${cur === v ? 'on' : ''}" onclick="narrSet('${key}','${v}',true)">${t}</button>`).join('')}</div>`;
    const onOff = (key, cur) => `<div class="mq-seg mq-seg-sm"><button type="button" class="${!cur ? 'on' : ''}" onclick="narrSet('${key}',false,true)">关</button><button type="button" class="${cur ? 'on' : ''}" onclick="narrSet('${key}',true,true)">开</button></div>`;
    const pct = ((NARR.size - 11) / 7 * 100).toFixed(1);
    const passwordPanel = (!NB_UNLOCKED && NB_PASSWORD_OPEN) ? `<div class="mq-nb-password"><label for="mqNbPassword">输入密码以调整背景图</label><div class="mq-nb-password-row"><input id="mqNbPassword" type="password" inputmode="numeric" autocomplete="off" placeholder="密码" onkeydown="if(event.key==='Enter')checkNarrBgPassword()"><button type="button" onclick="checkNarrBgPassword()">确认</button></div><div id="mqNbPasswordError" class="mq-nb-password-error" aria-live="polite"></div></div>` : '';
    const bgPanel = NB_UNLOCKED ? `<div class="mq-nb-panel" id="mqNbPanel" ${NB_PANEL ? '' : 'hidden'}>
        <div class="mq-nb-heading">背景图位置与透明度</div>
        ${nbRow('x','左右位置 X',-1000,1000,1)}
        ${nbRow('y','上下位置 Y',-1000,1000,1)}
        ${nbRow('w','图片宽度',1,1200,1)}
        ${nbRow('h','图片高度',1,1200,1)}
        ${nbRow('opacity','图片透明度',0,1,0.05)}
        ${nbRow('overlay','遮罩浓度',0,1,0.05)}
        <div class="mq-nb-actions"><button type="button" class="mq-nb-reset" onclick="narrBgReset()">恢复默认数值</button></div>
    </div>` : '';
    openMqSheet(`<div class="mq-sheet-title mq-script mq-big">Narration</div>
        <div class="mq-row"><span class="mq-lbl">旁白模式</span>${onOff('on', NARR.on)}</div>
        <div class="mq-row"><span class="mq-lbl">字数</span>
            <div class="mq-nums"><input class="mq-num" type="number" min="1" max="200" value="${NARR.min}" onchange="narrSet('min',this.value,true)"><span class="mq-dash">–</span><input class="mq-num" type="number" min="1" max="200" value="${NARR.max}" onchange="narrSet('max',this.value,true)"></div></div>
        <div class="mq-row"><span class="mq-lbl">斜体</span>${onOff('italic', NARR.italic)}</div>
        <div class="mq-row"><span class="mq-lbl">字颜色</span><input class="mq-color" type="color" value="${NARR.color}" onchange="narrSet('color',this.value,true)"></div>
        <div class="mq-stack"><span class="mq-lbl">用户人称</span>${seg('person', [['1', '第一人称'], ['2', '第二人称'], ['3', '第三人称']], NARR.person)}</div>
        <div class="mq-stack"><span class="mq-lbl">模式</span>${seg('mode', [['online', '线上'], ['offline', '线下'], ['free', '自由']], NARR.mode)}</div>
        <div class="mq-row mq-slide-head"><span class="mq-lbl">字体大小</span><span class="mq-val" id="narrSizeTxt">${NARR.size}px</span></div>
        <input class="mq-range" type="range" min="11" max="18" step="0.5" value="${NARR.size}" style="--p:${pct}%" oninput="narrSet('size',this.value,false)">
        <div class="mq-nb-toggle"><button id="mqNbToggle" class="mq-nb-line" type="button" aria-label="调整旁白背景图" title="调整旁白背景图" aria-expanded="${NB_PASSWORD_OPEN || NB_PANEL}" onclick="unlockNarrBg()"><span></span></button></div>
        ${passwordPanel}
        ${bgPanel}
        <div class="mq-foot"><button class="mq-close" type="button" onclick="closeMqSheet()">关闭</button></div>`, 'mq-narr', nbStyle());
}

function narrSet(key, value, rerender) {
    if (key === 'min' || key === 'max') value = Math.max(1, Math.min(200, parseInt(value, 10) || 1));
    if (key === 'size') value = Math.max(11, Math.min(18, parseFloat(value) || 13.5));
    if (key === 'on' || key === 'italic') value = value === true || value === 'true';
    NARR[key] = value;
    if (NARR.min > NARR.max) { if (key === 'min') NARR.max = NARR.min; else NARR.min = NARR.max; }
    saveNarr();
    /* 原位同步状态，避免 openNarrSheet() 重建整张卡片造成闪屏/背景图重绘。 */
    const card = document.querySelector('.mq-sheet-card.mq-narr');
    if (!card) { if (rerender) openNarrSheet(); return; }
    if (key === 'size') {
        const o = document.getElementById('narrSizeTxt'); if (o) o.textContent = NARR.size + 'px';
        const r = card.querySelector('input[type="range"]:not([id])');
        if (r) { r.value = NARR.size; r.style.setProperty('--p', ((NARR.size - 11) / 7 * 100).toFixed(1) + '%'); }
        return;
    }
    if (key === 'min' || key === 'max') {
        const nums = card.querySelectorAll('.mq-nums .mq-num');
        if (nums[0]) nums[0].value = NARR.min;
        if (nums[1]) nums[1].value = NARR.max;
    } else if (key === 'color') {
        const color = card.querySelector('.mq-color'); if (color) color.value = NARR.color;
    } else if (key === 'on' || key === 'italic') {
        const rows = card.querySelectorAll('.mq-row');
        rows.forEach(row => {
            const label = row.querySelector('.mq-lbl');
            if (!label || label.textContent.trim() !== (key === 'on' ? '旁白模式' : '斜体')) return;
            row.querySelectorAll('.mq-seg button').forEach(btn => {
                const isOn = (btn.textContent.trim() === '开') === !!NARR[key];
                btn.classList.toggle('on', isOn);
            });
        });
    } else if (key === 'person' || key === 'mode') {
        const stacks = card.querySelectorAll('.mq-stack');
        stacks.forEach(stack => {
            const label = stack.querySelector('.mq-lbl');
            const target = key === 'person' ? '用户人称' : '模式';
            if (!label || label.textContent.trim() !== target) return;
            stack.querySelectorAll('.mq-seg button').forEach(btn => {
                const match = btn.getAttribute('onclick') || '';
                btn.classList.toggle('on', match.includes(`narrSet('${key}','${NARR[key]}'`));
            });
        });
    }
}
function msgOf(x) {
    const o = typeof x === 'string' ? { text: x, narr: false } : x;
    const out = { me: false, text: o.text, narr: !!o.narr, t: nowTime(), ts: Date.now() };
    if (o.voice) out.voice = true;
    if (o.polaroid) out.polaroid = true;
    if (o.loc) out.loc = true;
    if (o.quote && o.quote.text) out.quote = { me: !!o.quote.me, text: String(o.quote.text) };
    if (o.trans) out.trans = String(o.trans);
    return out;
}

/* ---------------- 引用：消息向左滑动即可引用 ---------------- */
let quoteDraft = null;
function quoteMessage(i) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const m = c.msgs[i]; if (!m || m.narr) return;
    quoteDraft = { me: !!m.me, text: String(m.text || '') };
    showQuoteBar();
}
function showQuoteBar() {
    const composer = document.getElementById('composer'); if (!composer || !quoteDraft) return;
    let bar = composer.querySelector('.quote-bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'quote-bar'; composer.insertBefore(bar, composer.firstChild); }
    const c = CONTACTS.find(x => x.id === activeId);
    const who = quoteDraft.me ? (ME.name || '我') : (c ? c.name : '');
    bar.innerHTML = `<span class="qb-who">${esc(who)}</span><span class="qb-txt">${esc(quoteDraft.text)}</span><button class="qb-x" type="button" onclick="clearQuote()" aria-label="取消引用">×</button>`;
    composer.classList.add('quoting');
}
function clearQuote(silent) {
    quoteDraft = null;
    const composer = document.getElementById('composer'); if (!composer) return;
    const bar = composer.querySelector('.quote-bar'); if (bar) bar.remove();
    composer.classList.remove('quoting');
}
function bindSwipeQuote() {
    const box = document.getElementById('thread'); if (!box || box.dataset.swipeQuote) return;
    box.dataset.swipeQuote = '1';
    let row = null, sx = 0, sy = 0, dx = 0, active = false;
    box.addEventListener('pointerdown', e => {
        if (MM && MM.mode === 'multi') return;
        const r = e.target.closest && e.target.closest('.mrow');
        if (!r || r.dataset.i === undefined) return;
        row = r; sx = e.clientX; sy = e.clientY; dx = 0; active = false;
    });
    box.addEventListener('pointermove', e => {
        if (!row) return;
        const ddx = sx - e.clientX, ddy = e.clientY - sy;
        if (!active) {
            if (Math.abs(ddy) > 12) { row = null; return; }
            if (ddx > 10) active = true;
            else return;
        }
        dx = Math.max(0, Math.min(ddx, 90));
        row.style.transition = 'none';
        row.style.transform = `translateX(-${dx}px)`;
    });
    const end = () => {
        if (!row) return;
        const r = row; row = null;
        r.style.transition = ''; r.style.transform = '';
        if (active && dx >= 50) { quoteMessage(Number(r.dataset.i)); if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} } }
        active = false; dx = 0;
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
}
function toggleQuickMenu(force) {
    const menu = document.getElementById('quickMenu');
    if (!menu) return;
    ensureRedoQuickItem();
    const show = typeof force === 'boolean' ? force : !menu.classList.contains('show');
    menu.classList.toggle('show', show);
}

/* ---------------- 旁白输入：左滑发送键出「输出旁白」；旁白模式下发出的内容以旁白显示 ---------------- */
let narrInputMode = false;
const NB_OFF_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h10M5 18h7"/></svg>';
const NB_ON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h10M5 18h7"/></svg>';
function setNarrInputMode(on) {
    const was = narrInputMode;
    narrInputMode = !!on;
    if (was !== narrInputMode) playSfx(narrInputMode ? 'narrOn' : 'narrOff');
    const composer = document.getElementById('composer'); if (!composer) return;
    composer.classList.toggle('narr-mode', narrInputMode);
    const cap = composer.querySelector('.send-capsule'); if (cap) cap.classList.remove('nb-swiped');
}
/* 底栏上方提示：每隔几个字带一个极浅灰，形成深浅不一的效果 */
const NM_GRAY_EVERY = 4;
function nbHintHtml(text) {
    let out = '';
    [...text].forEach((ch, i) => {
        out += (i % NM_GRAY_EVERY === NM_GRAY_EVERY - 1) ? `<span class="nm-g">${ch}</span>` : ch;
    });
    return out;
}
function ensureNarrInputUI() {
    const composer = document.getElementById('composer');
    const cap = composer && composer.querySelector('.send-capsule');
    if (!cap || cap.querySelector('.nb-entry')) return;
    const send = cap.querySelector('#sendBtn') || cap.querySelector('.send');
    const pull = cap.querySelector('.pull');
    const entry = document.createElement('button');
    entry.type = 'button'; entry.className = 'nb-entry'; entry.title = '输出旁白'; entry.innerHTML = NB_OFF_SVG;
    entry.addEventListener('click', e => { e.stopPropagation(); setNarrInputMode(true); });
    const sep = document.createElement('span'); sep.className = 'nb-sep';
    const tog = document.createElement('button');
    tog.type = 'button'; tog.className = 'nb-toggle'; tog.title = '退出旁白模式'; tog.innerHTML = NB_ON_SVG;
    tog.addEventListener('click', e => { e.stopPropagation(); setNarrInputMode(false); });
    if (send) { cap.insertBefore(entry, send); cap.insertBefore(sep, send); }
    else cap.insertBefore(entry, cap.firstChild);
    if (pull) cap.insertBefore(tog, pull); else cap.appendChild(tog);
    const hint = document.createElement('div');
    hint.className = 'nb-hint'; hint.innerHTML = nbHintHtml('旁白模式：你写的内容会以旁白发出');
    composer.insertBefore(hint, composer.firstChild);
    document.addEventListener('click', e => {
        const c = document.querySelector('#composer .send-capsule');
        if (c && !c.contains(e.target)) c.classList.remove('nb-swiped');
    });
}
function initComposerGesture() {
    const composer = document.getElementById('composer');
    if (!composer) return;
    ensureNarrInputUI();

    composer.addEventListener('touchstart', e => {
        const t = e.touches[0];
        touchStartY = t.clientY;
        touchStartX = t.clientX;
        touchStartInCap = !!(e.target.closest && e.target.closest('.send-capsule'));
    }, { passive: true });

    composer.addEventListener('touchend', e => {
        const t = e.changedTouches[0];
        const dy = touchStartY - t.clientY;
        const dx = Math.abs(t.clientX - touchStartX);
        const cap = composer.querySelector('.send-capsule');
        const dxs = t.clientX - touchStartX;
        if (cap && touchStartInCap && Math.abs(touchStartY - t.clientY) < 28) {
            if (dxs < -40 && !narrInputMode) cap.classList.add('nb-swiped');
            else if (dxs > 30) cap.classList.remove('nb-swiped');
            return;
        }
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
                <div class="fp-info"><div class="fp-name">${esc(dispName(c))}</div><div class="fp-sub">${esc(other)}</div></div>
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
    askConfirm('保存修改？', `把「${orig}」改为「${next}」`, 'SAVE', () => {
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
    askConfirm('保存修改？', isReset ? '恢复为默认名字（跟随当前身份）' : `把「${shown}」改为「${next}」`, 'SAVE', () => {
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
    const a = activeIdentity();
    const av = (a && a.avatar) || ME.avatar;
    const name = (a && a.name) || ME.name;
    const img = (av || DEFAULT_CHAT_AVATAR) ? `<img src="${av || DEFAULT_CHAT_AVATAR}" alt="" onerror="this.remove()">` : '';
    return `<div class="av ${size || 'lg'} g1">${img}<span class="ini">${esc(initOf(name))}</span></div>`;
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
    const list = CONTACTS.length ? CONTACTS.map(c => `<button class="contact-id-direct-row" type="button" onclick="directAddContact('${esc(c.id).replace(/'/g, '&#39;')}')">${avatar(c, 'md')}<span class="contact-id-direct-info"><strong>${esc(dispName(c))}</strong><small>${esc(c.status || '联系人')}</small><code>${esc(c.id)}</code></span><span class="cid-option-arrow">${CHAT_IDS.includes(c.id) ? '已添加' : '＋'}</span></button>`).join('') : '<div class="contact-id-preview-empty">还没有联系人，请先到「联系人」页面创建</div>';
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
        <button class="strip-acc ${SIDE.pickedId === c.id ? 'sel' : ''} ${SIDE.liveId === c.id ? 'live' : ''}" title="${esc(dispName(c))}" onclick="event.stopPropagation(); pickAccount('${c.id}')">${avatar(c, 'md')}</button>`).join('');
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
                <div class="acct-name">${esc(dispName(c))}</div>
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
            try { localStorage.setItem('whatever_user_avatar', url); } catch (_) {}
            window.dispatchEvent(new CustomEvent('messages-avatar-updated', { detail: { avatar: url } }));
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
            promptOpts: defaultPromptOpts(),
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
    try { localStorage.setItem('whatever_messages_chat_map_v2', JSON.stringify(CHAT_MAP)); }
    catch (e) { console.warn('[Messages] 聊天列表保存失败', e); }
}

function persistContacts() {
    try { if (typeof renderMoments === 'function') renderMoments(); } catch (_) {}
    CONTACTS.forEach(c => { c.threads = c.threads || {}; c.threads[ACTIVE_ID] = c.msgs; });
    try { localStorage.setItem('whatever_messages_contacts_v1', JSON.stringify(CONTACTS, (k, v) => (k === 'msgs' ? undefined : v))); }
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
        const v = JSON.parse(localStorage.getItem('whatever_messages_chat_map_v2') || 'null');
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
    b.classList.remove('fade-only');
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
    round: '.bubble{border-radius:4px !important}',
    roundOther: '.mrow:not(.me) .bubble{border-radius:20px !important}'
};
CSS_TEMPLATES.boxStyle = '.mrow:not(.me){margin-top:6px !important;margin-bottom:6px !important}\n.trans-float{border-radius:0 !important}';
const CSS_TEMPLATE_LABELS = { ink: '墨黑', mist: '雾灰', paper: '奶白', round: '方角', roundOther: '对面圆角' };
let ROOM_TAB = 0;
let ROOM_SCROLL = 0;   // 设置页上次退出时的滚动位置

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
    const scopes = ['.messages-app #chatView#chatView', '#extPanel', '#voiceCompose', '#mmMenu'];
    scopes.forEach((sc, i) => {
        const id = i ? 'chatCustomCss' + i : 'chatCustomCss';
        let st = document.getElementById(id);
        if (!st) { st = document.createElement('style'); st.id = id; document.head.appendChild(st); }
        st.textContent = scopeCss(css, sc);
    });
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
    if (b.fontSize) {
        v.style.setProperty('--bubble-fs', b.fontSize + 'px');
    } else {
        v.style.removeProperty('--bubble-fs');
    }
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
        `<div class="room-name">${esc(dispName(c))}</div><div class="room-id">ID · ${esc(c.id)}</div>` +
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
function setBubbleFontNow(fs) {
    document.querySelectorAll('#chatView .bubble').forEach(b => b.style.setProperty('font-size', fs + 'px', 'important'));
}
function onRoomFontSize(v) {
    const fs = parseFloat(v) || 13;
    const c = CONTACTS.find(x => x.id === activeId);
    if (c) {
        c.beauty = Object.assign({}, c.beauty || {}, { fontSize: fs });
        persistContacts();
        applyRoomBeauty(c);
        setBubbleFontNow(fs);
    }
    const valEl = document.getElementById('roomFsVal');
    if (valEl) valEl.textContent = fs + 'px';
    const range = document.querySelector('.css-fs-range');
    if (range) {
        const pct = ((fs - 11) / (20 - 11) * 100).toFixed(1);
        range.style.setProperty('--p', pct + '%');
    }
}
function roomBeautyPaneInner(c) {
    const hasBg = !!(c.beauty && c.beauty.bg);
    const fs = (c.beauty && c.beauty.fontSize) || 13;
    const pct = ((fs - 11) / (20 - 11) * 100).toFixed(1);
    return `
        <div class="rp-label">预览</div>
        ${rpRow('预览效果', '点开看看这段聊天的样子', 'openCssPreview()')}
        <div class="rp-label">聊天背景</div>
        ${rpRow(hasBg ? '更换背景图片' : '选择背景图片', '会自动压缩，适合手机', 'pickRoomBg()')}
        ${hasBg ? rpRow('恢复默认背景', '去掉这个聊天的背景图', 'clearRoomBg()', true) : ''}
        ${cfoldHtml('css', 'CSS 样式', `
        <div class="css-box">
            <div class="css-hint"><button class="css-help-btn" type="button" onclick="openCssHelp()" aria-label="查看可控制的样式">!</button><span class="css-hint-l1">写在这里的样式只作用于这个聊天，</span><span class="css-hint-l2">例如 <code>.bubble{border-radius:4px}</code></span></div>
            <textarea id="roomCssInput" class="css-input" spellcheck="false" autocapitalize="off" placeholder="例如 .mrow.me .bubble{background:#111;color:#fff}" oninput="previewRoomCss(this.value)"></textarea>
            <div class="css-tpl"><button class="css-tpl-add" type="button" onclick="addPresetFromInput()" aria-label="添加预设"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><div class="preset-pick" id="presetPick"><button class="css-tpl-btn" type="button" onclick="togglePresetPick()">选择预设</button><div class="preset-list" id="presetList"></div></div><input id="presetNameInput" class="css-tpl-name" type="text" maxlength="20" aria-label="预设名字" onkeydown="presetNameKey(event)">${['round', 'roundOther'].map(k => `<button class="css-tpl-btn" type="button" onclick="fillRoomCss('${k}')">${CSS_TEMPLATE_LABELS[k]}</button>`).join('')}</div>
            <div class="css-fs-row">
                <div class="css-fs-head"><span class="css-fs-lbl">气泡字号</span><span class="css-fs-val" id="roomFsVal">${fs}px</span></div>
                <input class="mq-range css-fs-range" type="range" min="11" max="20" step="0.5" value="${fs}" style="--p:${pct}%" oninput="onRoomFontSize(this.value)">
            </div>
            </div>
        </div>
        <div class="css-actions"><button class="css-clear" type="button" onclick="clearRoomCss()">清空</button><button class="css-save" type="button" onclick="saveRoomCss()">保存样式</button></div>`)}
        `;
}
const CSS_HELP_ITEMS = [
    ['#chatView', '整个聊天室页面'],
    ['.chat-head', '顶部栏'],
    ['.glass-btn', '顶部圆形按钮'],
    ['.gear-btn', '设置按钮'],
    ['.thread', '消息区域（gap 控制消息之间的间距）'],
    ['.mrow', '每一行消息（头像 + 气泡）'],
    ['.mrow.me', '我发的消息行'],
    ['.mrow:not(.me)', '对方的消息行'],
    ['.mrow.gap', '换人说话时的间距'],
    ['.bubble', '所有气泡'],
    ['.mrow.me .bubble', '我的气泡'],
    ['.mrow:not(.me) .bubble', '对方的气泡'],
    ['.bubble.g-single / .g-head / .g-mid / .g-tail', '同一人连续说话时，气泡在组里的位置'],
    ['.narr', '旁白'],
    ['.day', '日期'],
    ['.mt', '消息时间'],
    ['.avf', '头像外框'],
    ['.av', '头像'],
    ['.hv-stack', '心声爱心（含连接线）'],
    ['.hv-heart', '心声爱心图标'],
    ['.composer', '底部输入栏'],
    ['.quote-bar', '输入框上方的引用条'],
    ['.nb-hint', '旁白模式的提示字'],
    ['.moment-event-row', '朋友圈互动胶囊'],
    ['.voice-msg', '语音气泡整体'],
    ['.voice-btn', '语音气泡按钮'],
    ['.voice-wave', '语音波形'],
    ['.voice-dur', '语音时长'],
    ['.voice-body', '展开的语音内容'],
    ['.voice-aside', '语音里「」中的声音和氛围'],
    ['#extPanel', '＋ 面板'],
    ['.ext-item', '＋ 面板里的每个按钮'],
    ['#voiceCompose', '发语音面板'],
    ['.vc-block', '发语音面板里的每一块'],
    ['.vc-ta', '发语音面板里的输入框'],
    ['#mmMenu', '长按消息的菜单'],
    ['.mm-item', '长按菜单里的每一项'],
];
function cssHelpText() {
    return '/* 可以控制的选择器（写在这里的样式只作用于这个聊天室） */\n'
        + CSS_HELP_ITEMS.map(([sel, desc]) => `${sel} { }   /* ${desc} */`).join('\n')
        + '\n\n/* 示例：对面圆角气泡 */\n.mrow:not(.me) .bubble { border-radius: 20px !important; }\n'
        + '/* 样式不生效时，请在末尾加 !important */';
}
function openCssHelp() {
    openSheet(`<div class="sheet-title"><span>可控制的样式</span></div>
        <textarea id="cssHelpText" class="css-input" readonly spellcheck="false" style="height:300px;width:100%;box-sizing:border-box"></textarea>
        <button class="identity-cancel" type="button" onclick="copyCssHelp()">复制全部</button>`);
    document.getElementById('cssHelpText').value = cssHelpText();
    ensureSheet().classList.add('fade-only');
}
function copyCssHelp() {
    const t = document.getElementById('cssHelpText'); if (!t) return;
    const text = t.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('已复制'), () => fallbackCopy(t));
    } else fallbackCopy(t);
}
function fallbackCopy(t) {
    t.focus(); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    toast(ok ? '已复制' : '复制失败，请手动全选复制');
}
/* ---------------- CSS 预设（直接在按钮行里操作，不用弹窗） ---------------- */
const CSS_PRESET_KEY = 'whatever_messages_css_presets_v1';
function loadCssPresets() { try { const v = JSON.parse(localStorage.getItem(CSS_PRESET_KEY) || '[]'); return Array.isArray(v) ? v.filter(x => x && x.name) : []; } catch (_) { return []; } }
function saveCssPresets(list) { try { localStorage.setItem(CSS_PRESET_KEY, JSON.stringify(list)); } catch (e) { toast('保存失败：存储空间可能不足'); } }
/* 添加预设：名字取输入框，CSS 取上面的输入框，点一下就保存 */
function addPresetFromInput() {
    const nameEl = document.getElementById('presetNameInput');
    const ta = document.getElementById('roomCssInput');
    const name = nameEl ? nameEl.value.trim() : '';
    const css = ta ? ta.value : '';
    if (!name) { toast('先在输入框写一个名字'); return; }
    if (!css.trim()) { toast('先在上面写一些 CSS'); return; }
    const list = loadCssPresets().filter(x => x.name !== name);
    list.unshift({ name, css });
    saveCssPresets(list);
    nameEl.value = '';
    refreshPresetList();
    toast('已添加预设「' + name + '」');
}
function presetNameKey(e) { if (e.key === 'Enter') { e.preventDefault(); addPresetFromInput(); } }
/* 选择预设：按钮展开成一个框，框里列出预设 */
function togglePresetPick() {
    const box = document.getElementById('presetPick'); if (!box) return;
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    if (open) refreshPresetList();
}
function refreshPresetList() {
    const el = document.getElementById('presetList'); if (!el) return;
    const list = loadCssPresets();
    el.innerHTML = list.length
        ? list.map((p, i) => `<button class="preset-item" type="button" onclick="pickCssPreset(${i})">${esc(p.name)}</button>`).join('')
        : '<div class="preset-empty">还没有预设</div>';
}
function pickCssPreset(i) {
    const p = loadCssPresets()[i]; if (!p) return;
    const ta = document.getElementById('roomCssInput');
    if (ta) { ta.value = p.css; previewRoomCss(p.css); }
    const box = document.getElementById('presetPick'); if (box) box.classList.remove('open');
    toast('已套用「' + p.name + '」，记得点保存样式');
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
    const fsv = c.beauty && c.beauty.fontSize;
    const fsStyle = fsv ? `--bubble-fs:${fsv}px;` : '';
    openSheet(`<div class="sheet-title sheet-title-plane">${PLANE_SVG}<span>预览效果</span></div>
        <div class="css-preview-box" id="cssPreviewScope" style="${bg}${fsStyle}">
            <div class="mrow"><div class="bubble g-single">你今天想吃什么？</div></div>
            <div class="mrow me"><div class="bubble g-single">都可以，你来决定吧</div></div>
            <div class="mrow"><div class="bubble g-single">那就火锅吧！</div></div>
            <div class="mrow me"><div class="bubble g-single">好，我去订位</div></div>
        </div>
        <button class="identity-cancel" type="button" onclick="closeSheet()">关闭</button>`);
    ensurePreviewStyle().textContent = scopeCss(chatCssOf(c), '.messages-app #cssPreviewScope#cssPreviewScope');
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
    setRoomTab(ROOM_TAB);
    roomEl.classList.add('open');
    const body = roomEl.querySelector('.room-body');
    if (body) body.scrollTop = ROOM_SCROLL;
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

/* 设置面板是整块重建的，所以先记住开关 / 切换的旧状态，重建后再把变化的那一个播放动画 */
function rpCaptureStates(pane) {
    const st = {};
    if (!pane) return st;
    pane.querySelectorAll('.rp-switch[aria-label]').forEach(b => { st[b.getAttribute('aria-label')] = b.classList.contains('on'); });
    pane.querySelectorAll('.tr-seg, .rt-seg').forEach((g, gi) => { st['seg' + gi] = [...g.querySelectorAll('button')].findIndex(b => b.classList.contains('on')); });
    return st;
}
function rpPlayStates(pane, st) {
    if (!pane) return;
    pane.querySelectorAll('.rp-switch[aria-label]').forEach(b => {
        const k = b.getAttribute('aria-label');
        if (!(k in st)) return;
        const want = b.classList.contains('on');
        if (st[k] === want) return;
        b.classList.toggle('on', st[k]); void b.offsetWidth; b.classList.toggle('on', want);
    });
    pane.querySelectorAll('.tr-seg, .rt-seg').forEach((g, gi) => {
        const k = 'seg' + gi;
        if (!(k in st)) return;
        const btns = [...g.querySelectorAll('button')];
        const nowIdx = btns.findIndex(b => b.classList.contains('on'));
        const prevIdx = st[k];
        if (prevIdx < 0 || prevIdx === nowIdx) return;
        btns.forEach((b, i) => b.classList.toggle('on', i === prevIdx)); void g.offsetWidth;
        btns.forEach((b, i) => b.classList.toggle('on', i === nowIdx));
    });
}
function renderRoomPane() {
    stopRoomTicker();
    const c = CONTACTS.find(x => x.id === activeId);
    const pane = document.getElementById('roomPane');
    if (!c || !pane) return;
    const st = rpCaptureStates(pane);
    if (ROOM_TAB === 0) { pane.innerHTML = roomChatPane(c); startRoomTicker(); }
    else if (ROOM_TAB === 1) pane.innerHTML = roomPersonaPane(c);
    else {
        pane.innerHTML = roomBeautyPane(c);
        const ta = document.getElementById('roomCssInput');
        if (ta) ta.value = chatCssOf(c);
    }
    rpPlayStates(pane, st);
}

function closeRoomView() {
    stopRoomTicker();
    const body = roomEl && roomEl.querySelector('.room-body');
    if (body) ROOM_SCROLL = body.scrollTop;
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
        ${rpRow('从消息列表移除', '不会删除联系人', "roomAction('remove')", true)}
        ${transSettingsHTML(c)}`;
}

/* ---------------- 朋友圈 ---------------- */
function loadStoredMoments() { try { const v = JSON.parse(localStorage.getItem(MOMENT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
function persistMoments() { try { localStorage.setItem(MOMENT_KEY, JSON.stringify(POSTS)); } catch (e) { toast('保存失败：存储空间可能不足'); } }
function loadMomentBg() { try { return localStorage.getItem(MOMENT_BG_KEY) || ''; } catch (_) { return ''; } }
function loadMomentAvatar() { try { return localStorage.getItem(MOMENT_AVATAR_KEY) || ''; } catch (_) { return ''; } }
const DEFAULT_MOMENT_AVATAR = 'assets/朋友圈/朋友圈头像.jpg';
function momentAuthor(by) {
    if (by && by !== 'self') { const c = IDENTITIES.find(x => x.id === by); if (c) return { name: c.name, avatar: c.avatar || ME.avatar || DEFAULT_CHAT_AVATAR }; }
    const ct = CONTACTS.find(x => x.id === by); if (ct) return { name: ct.name, avatar: ct.avatar || DEFAULT_CHAR_AVATAR };
    if (by && DELETED_NAMES[by]) return { name: `${DELETED_NAMES[by]}（已删除）`, avatar: '' };
    if (by && by !== 'self' && by !== ACTIVE_ID) return { name: '未知联系人', avatar: DEFAULT_CHAR_AVATAR };
    const a = activeIdentity();
    const myAv = (a && a.avatar) || ME.avatar;
    const myName = (a && a.name) || ME.name;
    return { name: myName, avatar: MOMENT_AVATAR || myAv || DEFAULT_MOMENT_AVATAR };
}
function posterView(p, c) {
    const kind = p.by === c.id ? 'me' : (CONTACTS.find(x => x.id === p.by) ? 'other' : 'user');
    return Object.assign({}, p, { posterKind: kind, posterName: momentAuthor(p.by).name, text: plainMentions(p.text) });
}
function momentAvatarHtml(a, size) {
    const src = a.avatar || DEFAULT_CHAR_AVATAR;
    const img = `<img src="${src}" alt="" onerror="this.remove()">`;
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
/* 评论回复：单击展开区里的一条评论即可回复；再点同一条取消 */
function startMomentReply(pid, ci) {
    const p = POSTS.find(x => x.id === pid); const cm = p && p.comments && p.comments[ci]; if (!cm) return;
    const cur = MOMENT_REPLY[pid];
    if (cur && cur.by === cm.by && cur.t === cm.t) delete MOMENT_REPLY[pid];
    else MOMENT_REPLY[pid] = { by: cm.by, t: cm.t, text: cm.text };
    MOMENT_INPUT_OPEN[pid] = true;
    renderMoments();
    setTimeout(() => { const el = document.getElementById('mfInl-' + pid); if (el) el.focus(); }, 0);
}
function momentInlinePh(pid) {
    const rt = MOMENT_REPLY[pid];
    return rt ? `回复 ${momentAuthor(rt.by).name}` : '写评论…';
}
/* 角色收到用户在评论区的回复后，单独私聊回复用户（聊天列表里出现新消息） */
async function charPrivateReply(cid, p, userText, quoteText) {
    const c = CONTACTS.find(x => x.id === cid);
    if (!c || !window.MessagesAPI || !window.MessagesAPI.isConfigured()) return;
    await sleep(2000 + Math.random() * 2000);
    const o = chatOptsOf(c);
    const ctxN = (c.mem && c.mem.ctx) || 30;   // 上下文条数跟聊天一样
    try {
        await primeKeys(keysOfPost(p));
        const r = await window.MessagesAPI.momentDmReply(c, p, userText, quoteText, (c.msgs || []).slice(-ctxN), { min: o.min, max: o.max });
        if (!r || !r.send || !r.texts.length) return;
        deliverMsgs(c, r.texts);
    } catch (e) { showApiError(e); }
}

/* 长按朋友圈卡片：重新调取（清掉之前角色的评论、点赞和对应的共同记忆） */
function momentRefetch(p) {
    const excerpt = (p.text || '').trim() || '一张照片';
    const isAI = id => id !== ACTIVE_ID && id !== 'self' && !!CONTACTS.find(x => x.id === id);
    p.comments = (p.comments || []).filter(cm => !isAI(cm.by));
    p.likes = (p.likes || []).filter(id => !isAI(id));
    CONTACTS.forEach(c => {
        if (!c.memories) return;
        c.memories = c.memories.filter(m => !(m.src ? m.src === p.id : (m.text || '').includes(`朋友圈（${excerpt}）下`)));
    });
    persistContacts(); persistMoments(); renderMoments();
    momentFetchFor(p);
}
function bindCardLongPress() {
    const root = document.querySelector('.messages-app'); if (!root || root.dataset.cardBound) return;
    root.dataset.cardBound = '1';
    let timer = null, sx = 0, sy = 0, card = null;
    const cancel = () => { clearTimeout(timer); timer = null; };
    root.addEventListener('pointerdown', e => {
        const el = e.target.closest && e.target.closest('.mf-card[data-pid]');
        if (!el || e.target.closest('button, input, textarea, .mf-cmts, .mf-cmt-line, .mf-cmt-row, .mf-inline-bar, .mf-card-foot')) return;
        card = el; sx = e.clientX; sy = e.clientY; cancel();
        timer = setTimeout(() => {
            timer = null;
            const pid = card.dataset.pid;
            askConfirm('重新调取', '清掉这条朋友圈之前角色的评论和共同记忆，再重新调取一次？', '重新调取', () => {
                const p = POSTS.find(x => x.id === pid); if (p) momentRefetch(p);
            });
        }, 600);
    });
    root.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => root.addEventListener(t, cancel));
}

/* 长按评论：删除（确认后） */
function bindCommentLongPress() {
    const root = document.querySelector('.messages-app'); if (!root || root.dataset.cmtBound) return;
    root.dataset.cmtBound = '1';
    let timer = null, sx = 0, sy = 0;
    const cancel = () => { clearTimeout(timer); timer = null; };
    let suppressTap = false;
    root.addEventListener('pointerdown', e => {
        suppressTap = false;
        const line = e.target.closest && e.target.closest('.mf-cmt-line[data-pid]');
        if (!line) return;
        sx = e.clientX; sy = e.clientY; cancel();
        timer = setTimeout(() => { timer = null; suppressTap = true; deleteCommentAt(line.dataset.pid, Number(line.dataset.ci)); }, 500);
    });
    root.addEventListener('click', e => {
        if (suppressTap) { suppressTap = false; return; }
        const line = e.target.closest && e.target.closest('.mf-cmts-open .mf-cmt-line[data-pid]');
        if (line) startMomentReply(line.dataset.pid, Number(line.dataset.ci));
    });
    root.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => root.addEventListener(t, cancel));
    root.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mf-cmt-line[data-pid]')) e.preventDefault(); });
}
function deleteCommentAt(pid, ci) {
    const p = POSTS.find(x => x.id === pid); if (!p || !p.comments || !p.comments[ci]) return;
    askConfirm('删除这条评论？', '删除后无法恢复', '删除', () => {
        removeCommentMemory(p, p.comments[ci]);
        p.comments.splice(ci, 1);
        persistContacts(); persistMoments(); renderMoments();
    });
}
/* 删除 AI 评论时，同时删掉它生成的那条共同记忆（朋友圈 id + 评论内容匹配，只删这一条；用户自己的评论没有对应记忆，自动跳过） */
function removeCommentMemory(p, cm) {
    const c = CONTACTS.find(x => x.id === cm.by);
    if (!c || !c.memories) return;
    const tail = `下评论：${cm.text}`;
    const i = c.memories.findIndex(m => m.src === p.id && (m.text || '').endsWith(tail));
    if (i >= 0) c.memories.splice(i, 1);
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
    MOMENT_INPUT_OPEN[id] = !MOMENT_INPUT_OPEN[id];   // 点评论图标：显示 / 隐藏输入框
    MOMENT_CMT_OPEN[id] = true;                       // 评论列表保持展开
    renderMoments();
}
function sendMomentCommentInline(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    const input = document.getElementById('mfInl-' + id);
    const text = input ? input.value.trim() : '';
    if (!text) { toast('写点什么再发送吧'); return; }
    p.comments = p.comments || [];
    const rt = MOMENT_REPLY[id]; delete MOMENT_REPLY[id];
    const box = document.getElementById('mfInl-' + id); if (box) box.value = '';
    p.comments.push({ by: ACTIVE_ID, text, t: Date.now(), ...(rt ? { to: rt.by } : {}) });
    noteMentionMemory(text, p.id, 'comment');
    MOMENT_CMT_OPEN[id] = true;
    persistMoments(); renderMoments();
    const author = CONTACTS.find(x => x.id === p.by);
    if (author) recordUserCommentMemory(author, p, text);
    if (rt && rt.by !== ACTIVE_ID) {
        const target = CONTACTS.find(x => x.id === rt.by);
        if (target && target.id !== (author && author.id)) recordUserCommentMemory(target, p, text);
        momentCommentAiReply(rt.by, p);
        charPrivateReply(rt.by, p, plainMentions(text), plainMentions(rt.text));
    } else if (author) {
        momentCommentAiReply(author.id, p);
    }
}
/* 用户在联系人的朋友圈下评论：计入共同记忆。帖子作者记一条；被回复的那位联系人也记一条 */
function recordUserCommentMemory(contact, p, text) {
    const author = CONTACTS.find(x => x.id === p.by);
    if (!author || !contact) return;
    const excerpt = momentTextWithNames(p.text).trim() || '一张照片';
    const who = contact.id === author.id ? '{char}' : author.name;
    const body = momentTextWithNames(text);
    addCommonMemory(contact, `{user}在${who}的朋友圈（${excerpt}）下评论：${body}`, p.id);
}
/* 调取完成气泡：有人评论或发了朋友圈、用户还没看，就显示完成；用户在朋友圈页则短暂显示后收起 */
function notePosterDone(list) {
    if (!list || !list.length) { hideMomentBubble(); refreshChatBadge(); return; }
    showMomentDone(list);
    if (activeTab === 'moments') setTimeout(() => { if (activeTab === 'moments' && !momentFetchBusy) hideMomentBubble(); }, 2000);
    else MOMENT_UNSEEN = true;
    refreshChatBadge();
}

/* 用户回复了 AI 的评论：AI 在朋友圈评论区接着回一句（底栏显示调取中，完成后显示角标） */
async function momentCommentAiReply(cid, p) {
    const c = CONTACTS.find(x => x.id === cid);
    if (!c || !window.MessagesAPI || !window.MessagesAPI.isConfigured()) return;
    if (cid !== p.by && !worldTiedPair(cid, p.by)) return;
    if (momentFetchBusy) return;
    momentFetchBusy = true;
    MOMENT_UNSEEN = false;
    refreshChatBadge();
    showMomentLoading();
    const excerpt = (p.text || '').trim() || '一张照片';
    let replied = false;
    try {
        const existing = (p.comments || []).map(cm => ({ id: cm.by, name: momentAuthor(cm.by).name, text: plainMentions(cm.text) }));
        await primeKeys(keysOfPost(p));
        const r = await window.MessagesAPI.momentWordReply(c, posterView(p, c), (c.msgs || []).slice(-30), existing);
        if (r.comment) {
            p.comments = p.comments || [];
            p.comments.push({ by: c.id, text: r.comment, t: Date.now(), to: ACTIVE_ID });
            recordCommentMemory(c, p, r.comment);
            persistContacts(); persistMoments(); renderMoments();
            replied = true;
        }
    } catch (e) { showApiError(e); }
    momentFetchBusy = false;
    if (!replied) { hideMomentBubble(); refreshChatBadge(); return; }
    showMomentDone([c]);
    if (activeTab === 'moments') {
        setTimeout(() => { if (activeTab === 'moments' && !momentFetchBusy) hideMomentBubble(); }, 2000);
    } else {
        MOMENT_UNSEEN = true;
    }
    refreshChatBadge();
}
function openMomentComments(id) {
    const p = POSTS.find(x => x.id === id); if (!p) return;
    const list = (p.comments || []).map(c => {
        const a = momentAuthor(c.by);
        return `<div class="mf-cmt-row">${momentAvatarHtml(a, 'sm')}<div>${cmtNameHtml(c)}<p>${esc(c.text)}</p></div></div>`;
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
    noteMentionMemory(text, p.id, 'comment');
    persistMoments(); renderMoments(); openMomentComments(id);
    const author = CONTACTS.find(x => x.id === p.by);
    if (author) { recordUserCommentMemory(author, p, text); momentCommentAiReply(author.id, p); }
}







/* ---------------- 朋友圈：谁可以看（可见度设置） ---------------- */
let MOMENT_VIS = 'public';        // public = 所有人，self = 仅自己，some = 部分联系人
let MOMENT_VIS_TO = [];
function visIcon() { return icoSvg(MOMENT_VIS === 'public' ? 'globe' : (MOMENT_VIS === 'self' ? 'lock2' : 'users')); }
/* 联系人发的朋友圈：分割线下方中间的小胶囊，显示可见范围；仅部分可以点开看是谁 */
function momentCapsuleHTML(p) {
    if (!CONTACTS.find(x => x.id === p.by)) return '';
    const label = { all: '公开', some: '仅部分', self: '仅自己', user: '仅你可看' }[p.vis] || '公开';
    const click = p.vis === 'some' ? ` onclick="showVisPeek('${p.id}')"` : '';
    return `<div class="mf-vis-row"><button class="mf-vis-cap" type="button"${click}>${label}</button></div>`;
}
function showVisPeek(pid) {
    const p = POSTS.find(x => x.id === pid); if (!p) return;
    const names = (p.visTo || []).map(id => { const c = CONTACTS.find(x => x.id === id); return c ? c.name : ''; }).filter(Boolean);
    const old = document.getElementById('mfVisPeek'); if (old) old.remove();
    const mask = document.createElement('div');
    mask.id = 'mfVisPeek'; mask.className = 'mf-vis-mask';
    mask.innerHTML = `<div class="mf-vis-pop"><div class="mf-vis-pop-t">仅部分可见</div><div class="mf-vis-pop-s">这条朋友圈只给下面这些人看</div>${names.length ? names.map(n => `<div class="mf-vis-pop-n">${esc(n)}</div>`).join('') : '<div class="mf-vis-pop-n">没有选中的联系人</div>'}<button class="mf-vis-pop-x" type="button" onclick="document.getElementById('mfVisPeek').remove()">关闭</button></div>`;
    mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
    (document.querySelector('.messages-app') || document.body).appendChild(mask);
}
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
    if (!worldTiedPair(ACTIVE_ID, id)) { toast('没有和你连线，不能选择'); return; }
    const i = MOMENT_VIS_TO.indexOf(id);
    if (i >= 0) MOMENT_VIS_TO.splice(i, 1); else MOMENT_VIS_TO.push(id);
    renderMomentVisPanel();
}





let MOMENT_VIS_Q = '';
let MV_ANIM = false;
/* 长按消息菜单：天使图标 */
const MM_ICONS = {
    range: `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 12h10M5 17h14M17 10l3 2-3 2"/>
    </svg>`,
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
const MM = { timer: null, sx: 0, sy: 0, mode: 'menu', sel: new Set(), idx: null, bound: false, anchor: null, lastClicked: null };
const MV_ICO = {
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16.4 13.5a5 5 0 0 1 4.8 5.2"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" x2="16.6" y1="21" y2="16.6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="5 12 10 17 19 7"/></svg>'
};
/* ---------------- @ 联系人：输入 @ 弹出列表，存的是 ID 标记，显示随备注/名字变化 ---------------- */
let MENTION_ST = null;
function mentionPicker() {
    let el = document.getElementById('mentionPicker');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mentionPicker';
        el.className = 'mention-pop';
        el.style.display = 'none';
        el.addEventListener('pointerdown', e => {
            const it = e.target.closest && e.target.closest('.mention-item');
            if (!it) return;
            e.preventDefault();
            mentionPick(it.dataset.id);
        });
        document.body.appendChild(el);
    }
    return el;
}
function mentionClose() {
    MENTION_ST = null;
    const el = document.getElementById('mentionPicker');
    if (el) { el.classList.remove('open'); el.style.display = 'none'; }
}
function mentionCaretRect(el, caret) {
    if (!el || typeof el.selectionStart !== 'number') return el ? el.getBoundingClientRect() : null;
    const cs = getComputedStyle(el);
    const mirror = document.createElement('div');
    mirror.style.cssText = `position:fixed;left:${el.getBoundingClientRect().left}px;top:${el.getBoundingClientRect().top}px;width:${el.clientWidth}px;height:auto;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;word-break:${cs.wordBreak};box-sizing:border-box;`;
    ['font','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','padding','border','textAlign','textIndent'].forEach(k => { mirror.style[k] = cs[k]; });
    const before = document.createTextNode(el.value.slice(0, caret));
    const marker = document.createElement('span'); marker.textContent = '\u200b';
    mirror.appendChild(before); mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const mr = marker.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const out = { left: er.left, top: mr.top, bottom: mr.bottom, right: er.right };
    mirror.remove();
    return out;
}
function mentionRender() {
    const st = MENTION_ST; if (!st) return;
    const q = st.query.trim().toLowerCase();
    const list = CONTACTS.filter(c => !q || String(c.name).toLowerCase().includes(q) || String(c.remark || '').toLowerCase().includes(q));
    const box = mentionPicker();
    const item = c => {
        const src = c.avatar || DEFAULT_CHAR_AVATAR;
        const img = src ? `<img src="${esc(src)}" alt="" onerror="this.remove()">` : '';
        const ini = esc(c.ini || String(c.remark || c.name || '?').slice(0, 1));
        const sub = c.remark ? `<i>${esc(c.name)}</i>` : '';
        return `<button type="button" class="mention-item" data-id="${esc(c.id)}"><span class="mention-txt"><b>${esc(c.remark || c.name)}</b>${sub}</span><span class="mention-av">${img}<span class="mention-ini">${ini}</span></span></button>`;
    };
    box.innerHTML = `<div class="mention-head">提及联系人</div>` + (list.length
        ? list.map(item).join('')
        : '<div class="mention-empty">没有匹配的联系人</div>');
    // 以当前光标所在的文字行作为定位点，列表紧贴“输入 @ 后的文字”下面。
    const r = mentionCaretRect(st.el, st.caret) || st.el.getBoundingClientRect();
    const W = Math.min(176, window.innerWidth - 16);
    box.style.width = W + 'px';
    box.style.left = Math.min(Math.max(8, r.left), window.innerWidth - W - 8) + 'px';
    box.style.display = 'block';
    box.classList.add('open');
    // 优先放在输入框下方；如果输入框贴近屏幕底部，则限制在可视区域内，确保列表能看到。
    const H = Math.min(box.scrollHeight, 200);
    const maxTop = Math.max(8, window.innerHeight - H - 8);
    box.style.top = Math.min(r.bottom + 6, maxTop) + 'px';
    box.style.bottom = 'auto';
}
function mentionPick(id) {
    const st = MENTION_ST; if (!st) return;
    const el = st.el, v = el.value;
    const token = `@[${id}] `;
    el.value = v.slice(0, st.start) + token + v.slice(st.caret);
    const pos = st.start + token.length;
    try { el.focus(); el.setSelectionRange(pos, pos); } catch (_) {}
    if (typeof updateMomentCount === 'function' && el.id === 'momentInput') updateMomentCount();
    mentionClose();
}
function isMentionInput(el) {
    return !!el && (el.id === 'momentInput' || el.id === 'mfCmtInput' || (el.classList && (el.classList.contains('mf-inline-input') || el.classList.contains('mf-cmt-input'))));
}
if (!window.__mentionBound) {
    window.__mentionBound = true;
    function refreshMentionFromCaret(el) {
        if (!isMentionInput(el)) return;
        const pos = el.selectionStart == null ? el.value.length : el.selectionStart;
        const m = el.value.slice(0, pos).match(/(^|\s)@([^\s@\[\]]{0,12})$/);
        if (!m) { mentionClose(); return; }
        MENTION_ST = { el, start: pos - m[2].length - 1, caret: pos, query: m[2] };
        mentionRender();
    }
    document.addEventListener('input', e => refreshMentionFromCaret(e.target));
    document.addEventListener('keyup', e => refreshMentionFromCaret(e.target));
    document.addEventListener('click', e => {
        if (isMentionInput(e.target)) setTimeout(() => refreshMentionFromCaret(e.target), 0);
    });
    document.addEventListener('pointerdown', e => {
        const t = e.target;
        if (t && t.closest && t.closest('#mentionPicker')) return;
        if (isMentionInput(t)) return;
        mentionClose();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') mentionClose(); });
}
/* 界面显示：用户看到的是备注（没有备注用名字） */
function mentionHtml(str) {
    const src = String(str == null ? '' : str);
    let out = '', last = 0, m;
    const re = /@\[([^\]]+)\]/g;
    while ((m = re.exec(src))) {
        out += esc(src.slice(last, m.index));
        const id = m[1];
        const c = id === 'user' ? { remark: momentUserName(), name: momentUserName() } : CONTACTS.find(x => String(x.id) === id);
        out += `<span class="mf-at">@${esc(c ? (c.remark || c.name) : '未知')}</span>`;
        last = re.lastIndex;
    }
    return out + esc(src.slice(last));
}
/* 给角色看的文字：标记换成名字（不是备注） */
function plainMentions(str) {
    return String(str == null ? '' : str).replace(/@\[([^\]]+)\]/g, (_, id) => {
        return '@' + mentionTargetName(id);
    });
}
function mvListHtml() {
    const q = MOMENT_VIS_Q.trim().toLowerCase();
    const list = CONTACTS.filter(c => !q || String(c.name).toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q));
    if (!list.length) return '<div class="mv-empty">No records found.</div>';
    return list.map(c => {
        const on = MOMENT_VIS_TO.indexOf(c.id) >= 0;
        const linked = worldTiedPair(ACTIVE_ID, c.id);
        return `<div class="mv-row ${on ? 'on' : ''} ${linked ? '' : 'mv-off'}" onclick="toggleMomentVisTo('${c.id}')">${avatar(c, 'sm')}<div class="mv-info"><div class="mv-name">${esc(dispName(c))}</div><div class="mv-sub">${linked ? esc(c.id) : '未连线 · 不可见'}</div></div><div class="mv-chk">${on ? '×' : ''}</div></div>`;
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
    CONTACTS.filter(c => worldTiedPair(ACTIVE_ID, c.id)).forEach(c => MOMENT_VIS_TO.push(c.id));
    renderMomentVisPanel();
}
function clearMomentVis() {
    MOMENT_VIS_TO.length = 0;
    renderMomentVisPanel();
}

/* ---------------- 朋友圈：真正的照片上传 ---------------- */
let PENDING_IMGS = [];            // 发布前选好的照片（压缩后的 dataURL）
let PENDING_DESCS = [];           // 与 PENDING_IMGS 一一对应的照片描述（可为空）
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
    PENDING_DESCS.splice(i, 1);
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
            try {
                const img = await compressImage(f, 1200);
                const d = window.prompt('给这张照片写一句描述（可留空）', '');
                PENDING_IMGS.push(img);
                PENDING_DESCS.push(String(d || '').trim().slice(0, 30));
            }
            catch (e) { toast('有一张照片读取失败'); }
        }
        renderPendingPhotos();
    };
    input.click();
}
/* 邮票：自动加「」，输入里的括号会去掉 */
function fmtStamp(t) { return '「' + String(t || '').replace(/[「」（）()]/g, '') + '」'; }
function stampInner(t) {
    const img = t && t.k ? `<img data-mkey="${t.k}" alt="">` : '';
    const txt = t && t.d ? `<div class="mf-stamp-text">${esc(fmtStamp(t.d))}</div>` : '';
    return img + txt;
}
/* 点开照片：左右滑动查看每一张邮票 */
function openMomentPhoto(pid, start) {
    const p = POSTS.find(x => x.id === pid);
    if (!p) return;
    const imgs = p.imgs || [], descs = p.imgDesc || [];
    const n = Math.max(imgs.length, descs.length);
    if (!n) return;
    const old = document.getElementById('mfPhotoView'); if (old) old.remove();
    const root = document.querySelector('.messages-app') || document.body;
    const m = document.createElement('div');
    m.id = 'mfPhotoView'; m.className = 'mf-pv';
    const slides = Array.from({ length: n }, (_, x) => {
        const k = imgs[x];
        const img = k ? `<img data-pvkey="${k}" alt="">` : '';
        const txt = descs[x] ? `<div class="mf-stamp-text">${esc(fmtStamp(descs[x]))}</div>` : '';
        return `<div class="mf-pv-slide"><div class="mf-stamp mf-pv-stamp">${img}${txt}</div></div>`;
    }).join('');
    m.innerHTML = `<div class="mf-pv-track">${slides}</div><div class="mf-pv-count">${(start || 0) + 1} / ${n}</div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    root.appendChild(m);
    const track = m.querySelector('.mf-pv-track');
    const count = m.querySelector('.mf-pv-count');
    track.addEventListener('scroll', () => {
        const idx = Math.round(track.scrollLeft / (track.clientWidth || 1));
        count.textContent = (idx + 1) + ' / ' + n;
    });
    requestAnimationFrame(() => {
        const sl = track.children[start || 0];
        if (sl) track.scrollLeft = sl.offsetLeft;
    });
    m.querySelectorAll('img[data-pvkey]').forEach(img => {
        const k = img.dataset.pvkey;
        if (MOMENT_IMG_CACHE[k]) { img.src = MOMENT_IMG_CACHE[k]; return; }
        Promise.resolve(window.DB ? window.DB.load(k, '') : '').then(v => {
            if (v) { MOMENT_IMG_CACHE[k] = v; img.src = v; }
        });
    });
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

/* API 报错弹窗：显示接口返回的原始内容 */
/* 把任意抛出的东西变成可读的文字（不再只显示“未知错误”） */
function describeErr(e) {
    if (e instanceof Error) return (e.name || 'Error') + ': ' + (e.message || '(无消息)') + (e.stack ? '\n' + String(e.stack).split('\n').slice(0, 3).join('\n') : '');
    if (e && typeof e === 'object') { if (e.message) return String(e.message); try { return JSON.stringify(e).slice(0, 300); } catch (_) { return Object.prototype.toString.call(e); } }
    return e === undefined ? '抛出了 undefined（没有错误信息）' : (e === null ? '抛出了 null（没有错误信息）' : String(e));
}
function showApiError(e) {
    const msg = describeErr(e);
    const root = document.querySelector('.messages-app');
    if (!root) { toast(msg); return; }
    const old = document.getElementById('apiErrMask'); if (old) old.remove();
    const m = document.createElement('div');
    m.id = 'apiErrMask'; m.className = 'api-err-mask';
    m.innerHTML = `<div class="api-err-box"><button class="api-err-title" type="button">API 报错</button><div class="api-err-stamp"><pre class="api-err-raw">${esc(msg)}</pre></div></div>`;
    m.addEventListener('click', ev => { if (ev.target === m || ev.target.classList.contains('api-err-title')) m.remove(); });
    root.appendChild(m);
}

/* 评论名字胶囊；有回复关系时显示“名字 回复 名字” */
function cmtNameHtml(c) {
    const a = momentAuthor(c.by).name;
    if (!c.to || c.to === c.by) return `<b class="mf-cmt-name">${esc(a)}</b>`;
    return `<b class="mf-cmt-name">${esc(a)}</b><span class="mf-cmt-to">回复</span><b class="mf-cmt-name">${esc(momentAuthor(c.to).name)}</b>`;
}
/* 聊天室截图：取最近几条真实聊天（去掉旁白），发帖时存下快照 */
function snapshotChatRoom(c, n) {
    const cnt = Math.max(1, Math.min(30, parseInt(n, 10) || 8));
    return (c.msgs || [])
        .filter(m => m && m.text && !m.narr && !m.momentEvent && !/^【旁白】/.test(String(m.text)))
        .slice(-cnt)
        .map(m => ({ me: !m.me, text: plainMentions(String(m.text)).replace(/[\r\n]+/g, ' ') }));
}
/* 真截图：加载 html2canvas（cdnjs，版本固定 1.4.1） */
function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        sc.onload = () => (window.html2canvas ? res(window.html2canvas) : rej(new Error('html2canvas 未就绪')));
        sc.onerror = () => rej(new Error('html2canvas 加载失败'));
        document.head.appendChild(sc);
    });
}
/* 在屏幕外临时画一张聊天室（不带遮罩和毛玻璃），拍成 PNG 后立即移除 */
async function captureChatShot(c, q = 0.9) {
    // 不依赖外部脚本：直接用画布把聊天室画成一张 JPEG 图片
    const rows = snapshotChatRoom(c);
    const W = 300, S = 2, PAD = 10, HEAD = 40, LH = 18, BUB_MAX = 210;
    const FONT = '12px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = FONT;
    const wrap = text => {
        const lines = []; let line = '';
        for (const ch of String(text || '')) {
            const t = line + ch;
            if (line && meas.measureText(t).width > BUB_MAX - 20) { lines.push(line); line = ch; } else line = t;
        }
        lines.push(line);
        return lines;
    };
    const items = []; let y = HEAD + 10;
    for (const m of rows) {
        const lines = wrap(m.text);
        const tw = Math.max(...lines.map(l => meas.measureText(l).width));
        const bw = Math.min(BUB_MAX, tw + 20), bh = lines.length * LH + 12;
        items.push({ m, lines, bw, bh, y });
        y += bh + 6;
    }
    const H = y + 28;
    const cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d');
    ctx.scale(S, S);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#F4F4F6'; ctx.fillRect(0, 0, W, HEAD);
    ctx.fillStyle = '#EDEDF0'; ctx.fillRect(0, HEAD - 1, W, 1);
    ctx.fillStyle = '#111111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 ' + FONT;
    ctx.fillText(String(dispName(c) || ''), W / 2, HEAD / 2);
    const rr = (x, y0, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y0);
        ctx.arcTo(x + w, y0, x + w, y0 + h, r);
        ctx.arcTo(x + w, y0 + h, x, y0 + h, r);
        ctx.arcTo(x, y0 + h, x, y0, r);
        ctx.arcTo(x, y0, x + w, y0, r);
        ctx.closePath();
    };
    ctx.font = FONT; ctx.textAlign = 'left';
    for (const it of items) {
        const x = it.m.me ? W - PAD - it.bw : PAD;
        ctx.fillStyle = it.m.me ? '#111111' : '#EFEFF2';
        rr(x, it.y, it.bw, it.bh, 12); ctx.fill();
        ctx.fillStyle = it.m.me ? '#FFFFFF' : '#111111';
        it.lines.forEach((l, i) => ctx.fillText(l, x + 10, it.y + 6 + LH * i + LH / 2));
    }
    ctx.fillStyle = '#A0A0A6';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtMoment(Date.now()), W - PAD, H - 12);
    return cv.toDataURL('image/jpeg', q);
}
/* 拍照并存入数据库；失败返回 null，由调用方退回模拟卡片 */
/* 真截图：拍下聊天室存入本地数据库，返回 key；失败返回 null，调用方退回文字卡片 */
async function saveChatShot(c) {
    try {
        const url = await captureChatShot(c);
        if (!url) return null;
        const key = 'cphoto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
        const ok = window.DB ? await window.DB.saveLarge(key, url) : false;
        if (!ok) return null;
        MOMENT_IMG_CACHE[key] = url;
        return key;
    } catch (err) {
        console.warn('[截图]', err);
        return null;
    }
}
/* 聊天室截图卡片：模拟聊天室样式（顶部对方名字，我方黑色靠右，对方浅灰靠左） */
function chatShotHtml(p) {
    const c = CONTACTS.find(x => x.id === p.by);
    return chatCardHtml(p.chatShot, p.chatShotWith, momentUserName(), fmtMoment(p.t), (c && (c.avatar || DEFAULT_CHAR_AVATAR)), selfCardSrc());
}
function selfCardSrc() {
    const a = activeIdentity();
    return (a && a.avatar) || ME.avatar || '';
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
        const preview = cmts.slice(0, 2).map((c, ci) => `<div class="mf-cmt-line" data-pid="${p.id}" data-ci="${ci}">${cmtNameHtml(c)}<span class="mf-cmt-time">${fmtMoment(c.t)}</span><span class="mf-cmt-text">${mentionHtml(c.text)}</span></div>`).join('');
        const descs = p.imgDesc || [];
        const cnt = Math.max(imgs.length, descs.length);
        const tickets = Array.from({ length: cnt }, (_, ii) => ({ k: imgs[ii], d: descs[ii] }));
        const photos = cnt ? (cnt > 4
            ? `<div class="mf-fold" onclick="openMomentPhoto('${p.id}', 0)">${[0, 1, 2].filter(x => x < cnt).map(x => `<div class="mf-stamp mf-l${x}${p.stolen && tickets[x].k && !tickets[x].d ? ' mf-plain' : ''}">${stampInner(tickets[x])}</div>`).join('')}<span class="mf-fold-badge">${cnt} 张</span></div>`
            : `<div class="mf-grid">${tickets.map((t, ii) => `<button class="mf-stamp${p.stolen && t.k && !t.d ? ' mf-plain' : ''}" type="button" onclick="openMomentPhoto('${p.id}', ${ii})">${stampInner(t)}</button>`).join('')}</div>`) : '';
        const cmtOpen = MOMENT_CMT_OPEN[p.id] !== undefined ? MOMENT_CMT_OPEN[p.id] : cmts.length > 0;
        const inlineBar = MOMENT_INPUT_OPEN[p.id] ? `<div class="mf-inline-bar"><input id="mfInl-${p.id}" class="mf-inline-input" maxlength="120" placeholder="${esc(momentInlinePh(p.id))}"><button class="mf-inline-send" type="button" onclick="sendMomentCommentInline('${p.id}')">发送</button></div>` : '';
        const cmtBlock = cmtOpen
            ? `<div class="mf-cmts mf-cmts-open${MOMENT_CMT_ENTER[p.id] ? ' mf-cmts-enter' : ''}">${cmts.map((c, ci) => `<div class="mf-cmt-line" data-pid="${p.id}" data-ci="${ci}">${cmtNameHtml(c)}<span class="mf-cmt-time">${fmtMoment(c.t)}</span><span class="mf-cmt-text">${mentionHtml(c.text)}</span></div>`).join('') || '<div class="mf-cmt-none">还没有评论，来说第一句吧</div>'}${inlineBar}</div>`
            : (cmts.length ? `<div class="mf-cmts" onclick="toggleMomentCmt('${p.id}')">${preview}${cmts.length > 2 ? `<span class="mf-cmt-more">查看全部 ${cmts.length} 条评论</span>` : ''}</div>` : '');
        return `<!--mf:${p.id}--><div class="mf-card" data-pid="${p.id}">
            <div class="mf-card-head">${momentAvatarHtml(a, 'sm')}
                <div class="mf-card-who"><b>${esc(a.name)}</b><span>${fmtMoment(p.t)}${momentVisText(p) ? ' · ' + momentVisText(p) : ''}</span></div>
                <button class="mf-del" type="button" onclick="deleteMoment('${p.id}')">删除</button>
            </div>
            ${p.text ? `<div class="mf-card-text">${mentionHtml(p.text)}</div>` : ''}
            ${photos}${p.chatShotKey ? `<div class="mf-shot-real"><img data-mkey="${p.chatShotKey}" alt=""></div>` : (p.chatShot ? chatShotHtml(p) : '')}
            ${momentCapsuleHTML(p)}
            <div class="mf-card-foot">
                <button class="mf-act ${liked ? 'on' : ''}" type="button" onclick="toggleMomentLike('${p.id}')">${HEART}<span>${likes.length || ''}</span></button>
                <button class="mf-act" type="button" onclick="toggleMomentCmt('${p.id}')">${CHAT_ICON}<span>${cmts.length || ''}</span></button>
            <span class="mf-time-br">${fmtMoment(p.t)}</span></div>
            ${cmtBlock}
        </div>`;
    }).join('');
    const head = `
        <div class="mf-cover" style="${bgStyle}" onclick="openMomentPick('cover')"></div>
        <div class="mf-me"><div class="mf-avatar" onclick="openMomentPick('avatar')">${momentAvatarHtml(who, 'lg')}</div><div class="mf-name">${esc(who.name)}</div></div>`;
    if (frame.__mfHead !== head || !frame.querySelector('.mf-posts')) {
        frame.innerHTML = head + '<div class="mf-posts"></div>';
        frame.__mfHead = head;
        MOMENT_CARD_HTML.clear();
    }
    const posts = frame.querySelector('.mf-posts');
    const items = cards ? cards.split('<!--mf:').filter(Boolean).map(seg => {
        const i = seg.indexOf('-->');
        return { id: seg.slice(0, i), html: seg.slice(i + 3) };
    }) : [];
    if (!items.length) {
        posts.innerHTML = '<div class="mf-empty">还没有朋友圈，点右上角的加号发一条吧</div>';
        MOMENT_CARD_HTML.clear();
        return;
    }
    // 正在输入的评论先记下来，重建后再放回去
    const typed = {};
    posts.querySelectorAll('.mf-inline-input').forEach(i => { typed[i.id] = { v: i.value, focus: document.activeElement === i }; });
    const oldEls = new Map([...posts.children].filter(el => el.dataset && el.dataset.pid).map(el => [el.dataset.pid, el]));
    const keep = [];
    const liveIds = new Set(items.map(x => x.id));
    [...MOMENT_CARD_HTML.keys()].forEach(id => { if (!liveIds.has(id)) MOMENT_CARD_HTML.delete(id); });
    items.forEach(({ id, html }) => {
        const prev = oldEls.get(id);
        if (prev && MOMENT_CARD_HTML.get(id) === html) { keep.push(prev); return; }
        const t = document.createElement('div');
        t.innerHTML = html.trim();
        if (t.firstElementChild) keep.push(t.firstElementChild);
        MOMENT_CARD_HTML.set(id, html);
    });
    posts.replaceChildren(...keep);
    Object.entries(typed).forEach(([id, st]) => {
        const el = document.getElementById(id);
        if (el) { el.value = st.v; if (st.focus) el.focus(); }
    });
    hydrateMomentImages();
}

function openMomentComposer() {
    const m = ensureFullMask();
    const who = momentAuthor(ACTIVE_ID);
    MOMENT_VIS = 'public';
    MOMENT_VIS_TO = [];
    PENDING_IMGS = []; PENDING_DESCS = [];
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
        const ok = window.DB ? await window.DB.saveLarge(key, PENDING_IMGS[i]) : false;
        if (!ok) {
            for (const k of imgs) { if (window.DB) await window.DB.remove(k); }
            toast('照片保存失败，请试试少选几张');
            return;
        }
        imgs.push(key);
    }
    const post = { id, text, t: Date.now(), by: ACTIVE_ID, vis: MOMENT_VIS,
        visTo: MOMENT_VIS === 'some' ? MOMENT_VIS_TO.filter(x => worldTiedPair(ACTIVE_ID, x)) : [],
        likes: [], comments: [], imgs, imgDesc: PENDING_DESCS.slice(0, imgs.length) };
    POSTS.unshift(post);
    noteMentionMemory(text, post.id, 'post');
    // 用户发帖本身也要进入能看到这条朋友圈的联系人共同记忆。
    const excerpt = momentTextWithNames(text).trim() || '一张照片';
    momentViewerList(post).forEach(c => addCommonMemory(c, `{user}在朋友圈发了一条动态（${excerpt}）`, post.id));
    persistContacts();
    PENDING_IMGS = []; PENDING_DESCS = [];
    persistMoments(); closeFullMask(); renderMoments(); toast('已发布');
    scheduleMomentFetch(post);   // 发完 3 秒后开始调取，能看到的联系人各回一个词
}

/* ---------------- 朋友圈回复逻辑：点赞 / 评论 → 直接进入共同记忆 ---------------- */
/* 连线：世界关系图里两个人（联系人或用户）有直接连线才算相连 */
function tieNodesOf(id) {
    const key = v => String(v).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (CONTACTS.some(x => x.id === id)) return ['node-c-' + key(id)];
    if (IDENTITIES.some(x => x.id === id)) return ['node-i-' + key(id)];
    const nodes = ['node-user'];
    if (ACTIVE_ID && ACTIVE_ID !== 'self') nodes.push('node-i-' + key(ACTIVE_ID));
    return nodes;
}
function worldTiedPair(a, b) {
    if (a === b) return false;
    // 用户和任何人之间不限制；只有角色和角色之间才需要连线
    if (!CONTACTS.some(x => x.id === a) || !CONTACTS.some(x => x.id === b)) return true;
    let ties = [];
    try { ties = JSON.parse(localStorage.getItem('world_tethers_v1') || '[]'); } catch (_) {}
    if (!Array.isArray(ties) || !ties.length) return false;
    const A = tieNodesOf(a), B = tieNodesOf(b);
    return ties.some(r => r && ((A.includes(r.from) && B.includes(r.to)) || (B.includes(r.from) && A.includes(r.to))));
}
function momentAuthorIsContact(p) {
    return !!p && CONTACTS.some(x => String(x.id) === String(p.by));
}
/* 一条朋友圈对联系人可见的统一规则：先看帖子范围，再看角色之间是否连线。 */
function momentViewerList(p) {
    if (!p) return [];
    if (p.vis === 'self' || p.vis === 'user') return [];
    let viewers = CONTACTS.slice();
    if (p.vis === 'some') viewers = viewers.filter(c => (p.visTo || []).includes(c.id));
    if (momentAuthorIsContact(p)) {
        viewers = viewers.filter(c => String(c.id) === String(p.by) || worldTiedPair(p.by, c.id));
    }
    return viewers;
}
function momentVisibleTo(p, c) {
    return !!c && momentViewerList(p).some(x => String(x.id) === String(c.id));
}
/* 把朋友圈正文中的内部 @ 标记还原成永久保存的联系人名字；删除帖子后也不会丢名字。 */
function momentUserName() { return window.MESSAGES_USER_NAME || ME.name || '用户'; }
function mentionTargetName(id) {
    if (String(id) === 'user' || String(id) === String(ME.id)) return momentUserName();
    const c = CONTACTS.find(x => String(x.id) === String(id));
    return c ? c.name : '未知联系人';
}
function momentTextWithNames(text) {
    return String(text || '').replace(/@\[([^\]]+)\]/g, (_, id) => '@' + mentionTargetName(id));
}
/* 朋友圈 @：被艾特的人看到 {char}；同一条朋友圈的其他可见联系人也记录被@到的具体联系人 */
function noteMentionMemory(text, src, kind) {
    const ids = [];
    String(text || '').replace(/@\[([^\]]+)\]/g, (_, id) => { if (!ids.includes(id)) ids.push(id); return _; });
    const targets = ids.map(id => id === 'user' ? { id: 'user', name: momentUserName() } : CONTACTS.find(x => String(x.id) === id)).filter(Boolean);
    if (!targets.length) return;
    const post = POSTS.find(p => p.id === src);
    const viewers = post ? momentViewerList(post) : targets;
    const where = kind === 'post' ? '在朋友圈发的动态里' : '在朋友圈评论里';
    for (const viewer of viewers) {
        const body = String(text).replace(/@\[([^\]]+)\]/g, (_, id) => {
            const mentioned = id === 'user' ? { id: 'user', name: momentUserName() } : CONTACTS.find(x => String(x.id) === id);
            if (!mentioned) return '@未知联系人';
            return String(mentioned.id) === String(viewer.id) ? '@{char}' : '@' + mentioned.name;
        });
        const mentionedNames = targets.map(c => String(c.id) === String(viewer.id) ? '{char}' : c.name).join('、');
        addCommonMemory(viewer, `{user}${where}@了${mentionedNames}：${body}`, src);
    }
    persistContacts();
}
function addCommonMemory(c, text, src) {
    c.memories = c.memories || [];
    c.memories.unshift({
        id: 'mc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        label: memStamp(Date.now()),
        text, src: src || null, points: [], relation: '', keys: [],
        priority: 8, sec: 'common', level: 'high'
    });
}
/* ---------------- 朋友圈调取：发完 3 秒后，能看到的联系人各回一个词 ---------------- */
const MOMENT_FETCH_DELAY = 3000;
let MOMENT_UNSEEN = false;      // 调取完成后，用户还没去朋友圈看过
let momentFetchTimer = null;
let momentFetchBusy = false;
let momentHideTimer = null;

function scheduleMomentFetch(p) {
    clearTimeout(momentFetchTimer);
    momentFetchTimer = setTimeout(() => momentFetchFor(p), MOMENT_FETCH_DELAY);
}
async function momentFetchFor(p) {
    momentFetchTimer = null;
    if (!window.MessagesAPI || !window.MessagesAPI.isConfigured()) { toast('朋友圈没有调取：请先在「设置 → API」保存接口配置'); return; }
    if (p && p.interactionFetched) { toast('这条朋友圈已经调取过评论区'); return; }
    if (momentFetchBusy) { scheduleMomentFetch(p); return; }
    const who = momentViewerList(p).filter(x => x.id !== p.by && !((p.comments || []).some(cm => cm.by === x.id)));
    if (!who.length) { toast('朋友圈没有调取：没有新的联系人可以评论'); return; }
    momentFetchBusy = true;
    MOMENT_UNSEEN = false;
    refreshChatBadge();
    showMomentLoading();
    const excerpt = momentTextWithNames(p.text).trim() || '一张照片';
    const fresh = [];
    try {
        const actors = who.map(c => ({ id: c.id, name: c.name, persona: c.persona || '' }));
        const recentMap = Object.fromEntries(who.map(c => [c.id, (c.msgs || []).slice(-30).map(m => `${m.me ? momentUserName() : c.name}：${m.text}`).join('\n')]));
        const existing = (p.comments || []).map(cm => ({ id: cm.by, name: momentAuthor(cm.by).name, text: plainMentions(cm.text) }));
        await primeKeys(keysOfPost(p));
        const results = await window.MessagesAPI.momentBatchWordReply(Object.assign({}, posterView(p, who[0]), { text: plainMentions(p.text) }), actors, recentMap);
        const byId = new Map(who.map(c => [String(c.id), c]));
        p.likes = p.likes || []; p.comments = p.comments || [];
        results.forEach(r => {
            const c = byId.get(String(r.actorId)); if (!c) return;
            if (r.like && !p.likes.includes(c.id)) { p.likes.push(c.id); addCommonMemory(c, `{char}在${momentAuthor(p.by).name}的朋友圈（${excerpt}）下点赞`, p.id); }
            if (!r.comment) return;
            const cand = existing.filter(e => e.id !== c.id && e.name);
            const normN = x => String(x || '').replace(/\s+/g, '').toLowerCase();
            const hit = r.to ? cand.find(e => normN(e.name) === normN(r.to)) || null : null;
            p.comments.push({ by: c.id, text: r.comment, t: Date.now(), to: hit ? hit.id : undefined });
            fresh.push(c); recordCommentMemory(c, p, r.comment);
            addMomentChatEvent(c, `${c.name}在${momentAuthor(p.by).name}的朋友圈下评论了`);
            if (hit) { const target = CONTACTS.find(x => x.id === hit.id); if (target && target.id !== c.id) addCommonMemory(target, `${c.name}在${momentAuthor(p.by).name}的朋友圈（${excerpt}）下回复了${target.name}：${r.comment}`, p.id); }
        });
        p.interactionFetched = true;
        persistContacts(); persistMoments(); renderMoments();
    } catch (e) { showApiError(e); }
    momentFetchBusy = false;
    if (!fresh.length) { toast('这次调取没有人评论'); const poster = CONTACTS.find(x => x.id === p.by); notePosterDone(poster ? [poster] : []); return; }
    showMomentDone(fresh);
    if (activeTab === 'moments') {
        setTimeout(() => { if (activeTab === 'moments' && !momentFetchBusy) hideMomentBubble(); }, 2000);
    } else {
        MOMENT_UNSEEN = true;
    }
    refreshChatBadge();
}

/* 底栏朋友圈图标上的调取气泡 */
function momentBubbleEl() {
    const root = document.querySelector('.messages-app');
    const tab = document.querySelector('#tabbar .tab[data-tab="moments"]');
    if (!root || !tab) return null;
    let t = document.getElementById('mcThought');
    if (t && t.parentNode === root) return t;
    t = document.createElement('div');
    t.id = 'mcThought'; t.className = 'mq-thought';
    t.innerHTML = `<div class="mq-pill">
        <span class="mq-wait"><span class="mq-ld"><svg viewBox="0 0 24 24"><circle class="trk" cx="12" cy="12" r="9"/><circle class="arc" cx="12" cy="12" r="9"/></svg></span><span>调取中</span></span>
        <span class="mq-rest"><span class="mq-stack" id="mcStack"></span><span class="mq-nmsg" id="mcNmsg"></span></span>
      </div><i class="mq-dot"></i>`;
    root.appendChild(t);
    return t;
}
/* 把气泡对齐到朋友圈图标正上方（气泡在应用根层，不受底栏层级限制） */
function placeMomentBubble(t) {
    const root = document.querySelector('.messages-app');
    const tab = document.querySelector('#tabbar .tab[data-tab="moments"]');
    if (!root || !tab || !t) return;
    const rr = root.getBoundingClientRect(), tr = tab.getBoundingClientRect();
    t.style.left = (tr.left + tr.width / 2 - rr.left) + 'px';
    t.style.bottom = (rr.bottom - tr.top - 1) + 'px';
}
function showMomentLoading() {
    const t = momentBubbleEl(); if (!t) return;
    placeMomentBubble(t);
    requestAnimationFrame(() => placeMomentBubble(t));
    clearTimeout(momentHideTimer);
    t.classList.remove('mq-fade', 'mq-done');
    t.classList.add('mq-on');
}
function showMomentDone(list) {
    const t = momentBubbleEl(); if (!t) return;
    placeMomentBubble(t);
    requestAnimationFrame(() => placeMomentBubble(t));
    const TILT = ['-7deg', '5deg', '-3deg'], MASK = [0, .6, .35];
    document.getElementById('mcStack').innerHTML = list.slice(0, 3).map((c, i) =>
        `<span class="mq-sa ${i === 0 ? 'mq-lead' : 'mq-bk'}" style="--r:${TILT[i]};--m:${MASK[i]};z-index:${3 - i}">${avatar(c, 'sm')}</span>`
    ).join('');
    document.getElementById('mcNmsg').textContent = `你有 ${list.length} 条新消息`;
    t.classList.remove('mq-fade');
    t.classList.add('mq-on', 'mq-done');
}
window.addEventListener('resize', () => {
    const t = document.getElementById('mcThought');
    if (t && t.classList.contains('mq-on')) placeMomentBubble(t);
});
function hideMomentBubble() {
    const t = document.getElementById('mcThought');
    if (!t || !t.classList.contains('mq-on')) return;
    t.classList.add('mq-fade');
    clearTimeout(momentHideTimer);
    momentHideTimer = setTimeout(() => t.classList.remove('mq-on', 'mq-done', 'mq-fade'), 300);
}

/* 聊天室左上角返回键的角标：调取完成、用户没看朋友圈时出现 */
function ensureChatBadge() {
    const back = document.querySelector('#chatView .chat-head .glass-btn');
    if (back && !document.getElementById('mcChatBadge')) back.insertAdjacentHTML('beforeend', '<i class="mq-cbadge" id="mcChatBadge"></i>');
}
function refreshChatBadge() {
    ensureChatBadge();
    const b = document.getElementById('mcChatBadge'); if (!b) return;
    const inChat = document.getElementById('chatView').classList.contains('open');
    b.classList.toggle('on', inChat && MOMENT_UNSEEN);
}

function deleteMoment(id) {
    askConfirm('删除朋友圈', '删除这条朋友圈？', '删除', async () => {
        const p = POSTS.find(x => x.id === id);
        if (p) {
            if (CONTACTS.find(x => x.id === p.by)) {
                // 联系人发的朋友圈：删除后不留痕迹，和它相关的记忆（发帖、点赞、评论）全部清掉
                CONTACTS.forEach(x => { if (x.memories) x.memories = x.memories.filter(m => m.src !== p.id); });
            } else {
                // 用户自己的朋友圈：照旧告诉能看到的角色用户已删除
                const excerpt = momentTextWithNames(p.text).trim() || '一张照片';
                momentViewerList(p).forEach(x => addCommonMemory(x, `{user}删除了自己的朋友圈（${excerpt}）`));
            }
            persistContacts();
        }
        if (p && p.imgs && !p.stolen && window.DB) { for (const k of p.imgs) await window.DB.remove(k); }
        // 用户删除朋友圈时，聊天室里由这条朋友圈产生的提示胶囊也一并移除。
        CONTACTS.forEach(x => {
            if (Array.isArray(x.msgs)) x.msgs = x.msgs.filter(m => !(m.momentEvent && String(m.momentPostId || '') === String(id)));
        });
        persistContacts();
        POSTS = POSTS.filter(x => x.id !== id);
        persistMoments(); renderMoments();
        if (activeId) renderThread({ noAnim: true });
        renderChats();
    });
}

/* 输入时防止整个应用容器被浏览器滚动（overflow:hidden 的容器仍会被滚动，导致底部滑轮被顶上去） */
function resetHiddenScroll(from) {
    let n = from;
    while (n && n !== document.body) {
        if (n.scrollTop || n.scrollLeft) {
            const ov = getComputedStyle(n).overflow + getComputedStyle(n).overflowY;
            if (/hidden/.test(ov)) { n.scrollTop = 0; n.scrollLeft = 0; }
        }
        n = n.parentElement;
    }
}
function freezeRoomForTyping() {
    const rv = document.getElementById('roomView'); if (!rv) return;
    rv.classList.add('typing');
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}
document.addEventListener('focusin', e => {
    const t = e.target;
    if (!t || !t.closest || !t.closest('.messages-app')) return;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const app = document.querySelector('.messages-app');
    const inRoom = !!t.closest('#roomView');
    if (inRoom) freezeRoomForTyping();
    [0, 120, 300, 600].forEach(ms => setTimeout(() => {
        if (app) resetHiddenScroll(app);
        resetHiddenScroll(t);
        if (inRoom) { window.scrollTo(0, 0); if (document.scrollingElement) document.scrollingElement.scrollTop = 0; }
    }, ms));
});
document.addEventListener('focusout', e => {
    const t = e.target;
    if (!t || !t.closest || !t.closest('#roomView')) return;
    setTimeout(() => {
        const a = document.activeElement;
        if (!a || !a.closest || !a.closest('#roomView')) {
            const rv = document.getElementById('roomView'); if (rv) rv.classList.remove('typing');
        }
    }, 300);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('scroll', () => {
        const a = document.activeElement;
        if (a && a.closest && a.closest('.messages-app') && /^(INPUT|TEXTAREA)$/.test(a.tagName)) {
            const app = document.querySelector('.messages-app'); if (app) resetHiddenScroll(app);
            if (a.closest('#roomView')) { window.scrollTo(0, 0); if (document.scrollingElement) document.scrollingElement.scrollTop = 0; }
        }
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
if (ME.avatar) { try { localStorage.setItem('whatever_user_avatar', ME.avatar); } catch (_) {} }
window.getMessagesUserAvatar = function() {
    const a = activeIdentity();
    if (a && a.avatar) return a.avatar;
    if (ME && ME.avatar) return ME.avatar;
    try {
        const v = JSON.parse(localStorage.getItem('whatever_messages_me_v1') || 'null');
        if (v && v.avatar) return v.avatar;
        return localStorage.getItem('whatever_user_avatar') || '';
    } catch (_) { return ''; }
};
preloadDefaultImages();
bindCommentLongPress();
bindCardLongPress();
bindMsgMenu();
bindChatDrop();
bindChatDropSwipe();
ensureChatBadge();
bindChatDropOutside();
applyTheme(THEME);
/* ---------------- 聊天里的保存 / 取消按钮：英文 Save / Cancel，SF Mono 字体（记忆页不处理） ---------------- */
function markSaveCancelButtons() {
    const LABEL = { '完成': 'SAVE', '保存': 'SAVE', '保存样式': 'SAVE', '取消': 'Cancel', 'Save': 'SAVE', 'SAVE': 'SAVE', 'Cancel': 'Cancel' };
    const scan = (root) => {
        if (!root || !root.querySelectorAll) return;
        if (root.closest && root.closest('#cdPromptSettings, #cdWordEdit')) return;
        const list = (root.matches && root.matches('button')) ? [root, ...root.querySelectorAll('button')] : root.querySelectorAll('button');
        list.forEach(b => {
            if (b.closest('#memPage, #cdPromptSettings, #cdWordEdit')) return;
            if (b.closest('#gpPanOverlay')) {
                const PAN = { 'gp-editSave': '保存', 'gp-doneBtn': '完成', 'gp-mgrClose': '完成' };
                if (PAN[b.id]) { if (b.textContent.trim() !== PAN[b.id]) b.textContent = PAN[b.id]; return; }
            }
            if (!b.closest('.messages-app') && !b.closest('#gpPanOverlay')) return;            const t = (b.textContent || '').trim();
            if (!LABEL[t]) return;
            const oc = b.getAttribute('onclick') || '';
            const want = /saveContact\(/.test(oc) ? 'Save' : (/savePersona\(/.test(oc) ? 'SAVE' : LABEL[t]);
            b.classList.add('sv-mono');
            if (b.childElementCount === 0 && t !== want) b.textContent = want;
        });
    };
    scan(document.body);
    new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); }));
    }).observe(document.body, { childList: true, subtree: true });
}
markSaveCancelButtons();
initComposerGesture();
setTimeout(initExtPanel, 0);

/* 输入框：“+”按钮 → 输入框上方滑出的透明白面板（占位按钮，以后做功能） */
const EXT_ITEMS = [['图片','M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4'],['拍照','M4 8h4l2-3h4l2 3h4v11H4z M12 11a3 3 0 1 0 0.01 0'],['语音','M12 4v10M8 10v2a4 4 0 0 0 8 0v-2M12 18v3'],['位置','M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z M12 11a2 2 0 1 0 0.01 0'],['红包','M5 4h14v16H5z M5 11h14'],['转账','M4 9h16M4 15h16M8 5l-4 4 4 4M16 11l4 4-4 4'],['文件','M7 3h7l5 5v13H7z M14 3v5h5'],['更多','M5 12h.01M12 12h.01M19 12h.01']];
function ensureExtPanel() {
    if (document.getElementById('extPanel')) return true;
    const menu = document.getElementById('quickMenu');
    if (!document.querySelector('.messages-app') || !menu) return false;

    const panel = document.createElement('div');
    panel.className = "ext-panel ext-panel-pinned"; panel.id = 'extPanel';
    panel.innerHTML = EXT_ITEMS.map(([label, d]) => `<button class="ext-item" type="button" data-ext="${label}"><span class="ext-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span><span>${label}</span></button>`).join('');
    document.body.appendChild(panel);

    // 位置：固定在输入框上方；只在能拿到输入框位置时才更新，拿不到则保持上一次的位置
    const place = () => {
        const comp = document.querySelector('.messages-app .composer');
        if (!comp) return;
        const r = comp.getBoundingClientRect();
        if (!r || !r.height) return;
        const vv = window.visualViewport;
        const bottomEdge = vv ? vv.offsetTop + vv.height : window.innerHeight;
        panel.style.bottom = Math.max(0, bottomEdge - r.top + 24) + 'px';
    };
    // 面板状态：不再只由菜单 class 决定，由 sync 统一维护
    const sync = () => {
        const m = document.getElementById('quickMenu');
        const show = !!(m && m.classList.contains('show'));
        if (show) place();
        panel.classList.toggle('open', show);
    };
    const repos = () => { if (panel.classList.contains('open')) place(); };

    new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', repos);
    window.addEventListener('scroll', repos, true);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', repos);

    panel.addEventListener('click', e => {
        const b = e.target.closest('[data-ext]'); if (!b) return;
        if (b.dataset.ext === '图片') { toggleQuickMenu(false); pickChatPhoto(); return; }
        if (b.dataset.ext === '语音') { toggleQuickMenu(false); openVoiceCompose(); return; }
        if (b.dataset.ext === '拍照') { toggleQuickMenu(false); openPhotoCompose(); return; }
        if (b.dataset.ext === '位置') { toggleQuickMenu(false); openLocationCompose(); return; }
        if (b.dataset.ext === '文件') { toggleQuickMenu(false); pickChatFile(); return; }
        toast(b.dataset.ext + '即将推出');
    });
    place();
    sync();
    return true;
}
function initExtPanel(tries = 0) {
    if (ensureExtPanel() || tries > 60) return;
    setTimeout(() => initExtPanel(tries + 1), 250);
}

/* ---------------- 发语音：面板里可以加环境、音色，正文一块；每块可编辑、上下移动、删除 ---------------- */
let VC_BLOCKS = [];
const VC_LABEL = { env: '环境', voice: '音色', body: '正文' };
const VC_SHADES = ['#111111', '#8A8A8A', '#333333', '#B8B8B8', '#555555'];
function vcShade(str) {
    return [...String(str)].map((ch, i) => `<span style="color:${VC_SHADES[i % VC_SHADES.length]}">${esc(ch)}</span>`).join('');
}
const VC_HINT = { env: '声音和氛围，比如：雨声、椅子轻响', voice: '音色描述，比如：低沉、温柔', body: '要说的话' };
function openVoiceCompose() {
    if (!activeId) { toast('先打开一个聊天'); return; }
    if (!VC_BLOCKS.length) VC_BLOCKS = [{ type: 'env', text: '' }, { type: 'body', text: '' }];
    let el = document.getElementById('voiceCompose');
    if (!el) {
        el = document.createElement('div');
        el.id = 'voiceCompose'; el.className = 'voice-compose';
        document.body.appendChild(el);
        el.addEventListener('click', vcClick);
        el.addEventListener('input', vcInput);
        el.addEventListener('pointerdown', vcPointerDown);
    }
    VC_EDIT = -1;
    renderVoiceCompose();
    el.classList.add('show');
}
function closeVoiceCompose() {
    const el = document.getElementById('voiceCompose');
    if (el) el.classList.remove('show');
}
const VC_GRIP = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/></svg>';
const VC_PENCIL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
const VC_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
let VC_EDIT = -1;
let VC_DRAG = null;
function renderVoiceCompose() {
    const el = document.getElementById('voiceCompose'); if (!el) return;
    el.innerHTML = `<div class="vc-sheet">
        <div class="vc-title"><span class="vc-script">${vcShade('Voice Note')}</span><span class="vc-cap">${vcShade('发语音')}</span></div>
        <div class="vc-hint">拖动左侧图标排序，点铅笔编辑</div>
        <div class="vc-list">${VC_BLOCKS.map((b, i) => {
            const editing = VC_EDIT === i;
            const shown = b.text
                ? (b.type === 'body' ? esc(b.text) : `「${esc(b.text)}」`)
                : `<span class="vc-empty">${VC_HINT[b.type]}</span>`;
            return `<div class="vc-block vc-${b.type}${editing ? ' editing' : ''}" data-i="${i}">
                <span class="vc-grip" data-vc="grip" data-i="${i}" aria-label="拖动排序">${VC_GRIP}</span>
                <div class="vc-main">
                    <span class="vc-label">${VC_LABEL[b.type]}</span>
                    ${editing
                        ? `<textarea class="vc-ta" data-i="${i}" rows="2" placeholder="${VC_HINT[b.type]}">${esc(b.text)}</textarea>`
                        : `<div class="vc-text">${shown}</div>`}
                </div>
                <div class="vc-side">
                    ${editing
                        ? `<button type="button" class="vc-done" data-vc="done">完成</button>`
                        : `<button type="button" class="vc-icon" data-vc="edit" data-i="${i}" aria-label="编辑">${VC_PENCIL}</button>`}
                    <button type="button" class="vc-icon" data-vc="del" data-i="${i}" aria-label="删除">${VC_X}</button>
                </div>
            </div>`;
        }).join('')}</div>
        <div class="vc-add">
            <button type="button" data-vc="add-env">＋ 环境</button>
            <button type="button" data-vc="add-voice">＋ 音色</button>
            <button type="button" data-vc="add-body">＋ 正文</button>
        </div>
        <div class="vc-actions">
            <button type="button" data-vc="cancel">取消</button>
            <button type="button" data-vc="send">发送语音</button>
        </div>
    </div>`;
}
function vcInput(e) {
    const ta = e.target.closest && e.target.closest('.vc-ta'); if (!ta) return;
    const b = VC_BLOCKS[Number(ta.dataset.i)]; if (b) b.text = ta.value;
}
function vcInsertBeforeBody(block) {
    const idx = VC_BLOCKS.findIndex(b => b.type === 'body');
    if (idx < 0) VC_BLOCKS.push(block); else VC_BLOCKS.splice(idx, 0, block);
}
let VC_FALLING = false;
function vcClick(e) {
    if (VC_FALLING) return;
    const btn = e.target.closest && e.target.closest('[data-vc]');
    if (!btn) { if (e.target.id === 'voiceCompose') closeVoiceCompose(); return; }
    const act = btn.dataset.vc, i = Number(btn.dataset.i);
    if (act === 'del' && VC_BLOCKS[i]) {
        const el = btn.closest('.vc-block');
        if (el) {
            VC_FALLING = true;
            el.classList.add('vc-falling');
            setTimeout(() => {
                VC_FALLING = false;
                VC_BLOCKS.splice(i, 1);
                VC_EDIT = VC_EDIT === i ? -1 : (VC_EDIT > i ? VC_EDIT - 1 : VC_EDIT);
                renderVoiceCompose();
            }, 260);
            return;
        }
    }
    if (act === 'grip') return;
    if (act === 'cancel') { VC_EDIT = -1; closeVoiceCompose(); return; }
    if (act === 'send') { vcSend(); return; }
    if (act === 'add-env' || act === 'add-voice') {
        const blk = { type: act === 'add-env' ? 'env' : 'voice', text: '' };
        vcInsertBeforeBody(blk); VC_EDIT = VC_BLOCKS.indexOf(blk);
    }
    else if (act === 'add-body') { const blk = { type: 'body', text: '' }; VC_BLOCKS.push(blk); VC_EDIT = VC_BLOCKS.indexOf(blk); }
    else if (act === 'edit') VC_EDIT = i;
    else if (act === 'done') VC_EDIT = -1;
    renderVoiceCompose();
}
/* 拖动排序：按住左侧图标上下拖，松手后落到对应位置 */
function vcPointerDown(e) {
    const g = e.target.closest && e.target.closest('.vc-grip'); if (!g) return;
    e.preventDefault();
    const from = Number(g.dataset.i);
    VC_DRAG = { from, to: from, startY: e.clientY };
    const block = g.closest('.vc-block');
    if (block) block.classList.add('dragging');
    document.addEventListener('pointermove', vcDragMove);
    document.addEventListener('pointerup', vcDragEnd);
    document.addEventListener('pointercancel', vcDragEnd);
}
function vcDragMove(e) {
    if (!VC_DRAG) return;
    const blocks = [...document.querySelectorAll('#voiceCompose .vc-block')];
    let to = blocks.length - 1;
    for (let k = 0; k < blocks.length; k++) {
        const r = blocks[k].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { to = k; break; }
    }
    VC_DRAG.to = to;
    const dragged = blocks[VC_DRAG.from];
    if (dragged) dragged.style.transform = `translateY(${e.clientY - VC_DRAG.startY}px)`;
}
function vcDragEnd() {
    document.removeEventListener('pointermove', vcDragMove);
    document.removeEventListener('pointerup', vcDragEnd);
    document.removeEventListener('pointercancel', vcDragEnd);
    if (!VC_DRAG) return;
    const { from, to } = VC_DRAG; VC_DRAG = null;
    if (to !== from) {
        const [item] = VC_BLOCKS.splice(from, 1);
        VC_BLOCKS.splice(to, 0, item);
        if (VC_EDIT === from) VC_EDIT = to;
    }
    renderVoiceCompose();
}
function vibrateTiny() { if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} } }
function vcSend() {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    // 环境和音色都是描述，用「」包起来；正文直接写
    const text = VC_BLOCKS.map(b => {
        const t = String(b.text || '').trim(); if (!t) return '';
        return b.type === 'body' ? t : `「${t}」`;
    }).join('');
    if (!text) { toast('先写点内容'); return; }
    c.msgs = c.msgs || [];
    c.msgs.push({ me: true, text, voice: true, t: nowTime(), ts: Date.now() });
    c.time = nowTime(); playSfx('send');
    vibrateTiny();
    persistContacts(); renderThread(); renderChats();
    VC_BLOCKS = [];
    closeVoiceCompose();
}
/* ---------------- 拍照：只写照片描述，发出后是一张拍立得，点击翻面看描述 ---------------- */
function openPhotoCompose() {
    if (!activeId) { toast('先打开一个聊天'); return; }
    const old = document.getElementById('cpPhotoPop'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'cpPhotoPop';
    wrap.className = 'cd-pt-root';
    wrap.innerHTML = `<div class="ar-sheet" id="cpPhotoSheet"><div class="ar-sheet-card">
        <div class="ar-sheet-title ar-script">Snapshot</div>
        <div class="ar-sheet-title">拍照</div>
        <div class="ar-stamp">
            <div class="ar-stamp-label">照片描述</div>
            <div class="ar-sec">写下这张照片的内容，发出后是一张拍立得</div>
            <textarea class="ar-mode-text" id="cpPhotoTa" rows="6" placeholder="比如：窗边的光落在桌上，一杯咖啡冒着热气"></textarea>
        </div>
        <div class="ar-foot">
            <button type="button" class="ar-save" id="cpPhotoSend">发送</button>
            <button type="button" class="ar-close" id="cpPhotoClose">关闭</button>
        </div>
    </div></div>`;
    document.body.appendChild(wrap);
    const sheet = wrap.querySelector('#cpPhotoSheet');
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('show')));
    const close = () => { sheet.classList.remove('show'); setTimeout(() => wrap.remove(), 240); };
    wrap.querySelector('#cpPhotoClose').onclick = close;
    sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
    wrap.querySelector('#cpPhotoSend').onclick = () => {
        const ta = wrap.querySelector('#cpPhotoTa');
        const text = ta ? ta.value.trim() : '';
        if (!text) { toast('先写一段照片描述'); return; }
        if (sendPhotoDesc(text)) close();
    };
}
function sendPhotoDesc(text) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return false;
    c.msgs = c.msgs || [];
    c.msgs.push({ me: true, text, polaroid: true, t: nowTime(), ts: Date.now() });
    c.time = nowTime(); playSfx('send'); vibrateTiny();
    persistContacts(); renderThread(); renderChats();
    return true;
}
function polaroidInnerHtml(text) {
    return `<div class="cp-photo" role="button" tabindex="0" aria-pressed="false"><div class="cp-flip"><div class="cp-face cp-front"><div class="cp-img"><svg class="cp-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.1C1.1 8.6 3.2 5 6.8 5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.6 0 5.7 3.6 4.3 6.9C19.5 16.4 12 21 12 21z"/></svg></div><div class="cp-cap">a moment</div></div><div class="cp-face cp-back"><div class="cp-tag">PHOTO</div><div class="cp-desc">${esc(text)}</div></div></div></div>`;
}
document.addEventListener('click', e => {
    const pol = e.target.closest && e.target.closest('.cp-photo');
    if (!pol) return;
    const on = !pol.classList.contains('cp-flipped');
    pol.classList.toggle('cp-flipped', on);
    pol.setAttribute('aria-pressed', String(on));
});
/* ---------------- 位置：纸片感选位置界面，发出后是一张带邮票齿边的小纸条 ---------------- */
const LC_PIN = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 27S3 17.5 3 10.5a9 9 0 0 1 18 0C21 17.5 12 27 12 27z" fill="#FADCE8"/><circle cx="12" cy="10.5" r="3.2" fill="#FFFFFF"/></svg>';
function openLocationCompose() {
    if (!activeId) { toast('先打开一个聊天'); return; }
    const old = document.getElementById('locPop'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'locPop'; wrap.className = 'lc-root';
    wrap.innerHTML = `<div class="lc-paper">
        <span class="lc-tape"></span>
        <div class="lc-head">
            <button type="button" class="lc-btn" id="lcCancel">取消</button>
            <span class="lc-title">Location</span>
            <button type="button" class="lc-btn lc-send" id="lcSend">发送</button>
        </div>
        <div class="lc-map"><span class="lc-pin">${LC_PIN}</span></div>
        <label class="lc-lbl" for="lcName">地点名称</label>
        <input class="lc-input" id="lcName" type="text" placeholder="比如：静安嘉里中心" autocomplete="off">
        <label class="lc-lbl" for="lcAddr">地址</label>
        <input class="lc-input" id="lcAddr" type="text" placeholder="比如：南京西路 1515 号" autocomplete="off">
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
    const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 220); };
    wrap.querySelector('#lcCancel').onclick = close;
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('#lcSend').onclick = () => {
        const name = wrap.querySelector('#lcName').value.trim();
        const addr = wrap.querySelector('#lcAddr').value.trim();
        if (!name) { toast('先写一个地点名称'); return; }
        if (sendLocation(name, addr)) close();
    };
}
function sendLocation(name, addr) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return false;
    c.msgs = c.msgs || [];
    c.msgs.push({ me: true, text: addr ? name + '｜' + addr : name, loc: true, t: nowTime(), ts: Date.now() });
    c.time = nowTime(); playSfx('send'); vibrateTiny();
    persistContacts(); renderThread(); renderChats();
    return true;
}
function locInnerHtml(text) {
    const parts = String(text || '').split('｜');
    const name = parts[0] || '', addr = parts.slice(1).join('｜');
    return `<div class="lc-strip"><span class="lc-ico">${LC_PIN}</span><span class="lc-txt"><span class="lc-name">${esc(name)}</span>${addr ? `<span class="lc-addr">${esc(addr)}</span>` : ''}</span></div>`;
}
/* ---------------- 文件：选 txt / docx 后直接发出一张加长卡片；点击出文件夹，再点展开看内容 ---------------- */
function pickChatFile() {
    if (!activeId) { toast('先打开一个聊天'); return; }
    let inp = document.getElementById('ffInput');
    if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file'; inp.id = 'ffInput'; inp.accept = '.txt,.docx'; inp.hidden = true;
        document.body.appendChild(inp);
        inp.addEventListener('change', async () => {
            const f = inp.files && inp.files[0]; inp.value = '';
            if (!f) return;
            try { await ffSendFile(f); } catch (err) { toast('文件读取失败：' + (err && err.message || err)); }
        });
    }
    inp.click();
}
function ffLoadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        sc.onload = () => resolve(window.JSZip);
        sc.onerror = () => reject(new Error('无法加载 docx 解析库'));
        document.head.appendChild(sc);
    });
}
async function ffSendFile(f) {
    const c = CONTACTS.find(x => x.id === activeId); if (!c) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    let text = '';
    if (ext === 'txt') {
        text = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = () => rej(new Error('读取失败')); r.readAsText(f); });
    } else if (ext === 'docx') {
        const JSZip = await ffLoadJSZip();
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const entry = zip.file('word/document.xml');
        if (!entry) throw new Error('不是有效的 docx');
        const xml = await entry.async('string');
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        text = [...doc.getElementsByTagName('w:p')].map(p => [...p.getElementsByTagName('w:t')].map(t => t.textContent).join('')).join('\n');
    } else { toast('只支持 txt 和 docx'); return; }
    const MAX = 200000;
    if (text.length > MAX) { text = text.slice(0, MAX); toast('文件过长，已截取前一部分'); }
    c.msgs = c.msgs || [];
    c.msgs.push({ me: true, text: f.name, file: true, fileExt: ext.toUpperCase(), fileSize: Math.max(1, Math.round(f.size / 1024)), fileText: text, t: nowTime(), ts: Date.now() });
    c.time = nowTime(); playSfx('send'); vibrateTiny();
    persistContacts(); renderThread(); renderChats();
}
function ffCardHtml(m, i) {
    return `<div class="ff-card" role="button" tabindex="0" data-ffi="${i}"><span class="ff-mini"><span class="ff-mini-tab"></span><span class="ff-mini-body"></span></span><span class="ff-txt"><span class="ff-n">${esc(m.text)}</span><span class="ff-m">${esc(m.fileExt)} · ${m.fileSize} KB</span></span></div>`;
}
function ffOpen(m) {
    const old = document.getElementById('ffPop'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'ffPop'; wrap.className = 'ff-root';
    wrap.innerHTML = `<div class="ff-stage"><div class="ff-folder" id="ffFolder">
        <div class="ff-tab"></div><div class="ff-back"></div>
        <div class="ff-page"><div class="ff-page-in">${esc(m.fileText || '（空文件）')}</div></div>
        <div class="ff-front"><span class="ff-name">${esc(m.text)}</span><span class="ff-meta">${esc(m.fileExt)} · ${m.fileSize} KB</span></div>
    </div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
    const folder = wrap.querySelector('#ffFolder');
    folder.addEventListener('click', e => { e.stopPropagation(); folder.classList.toggle('ff-open'); });
    wrap.addEventListener('click', e => { if (e.target === wrap) { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 220); } });
}
document.addEventListener('click', e => {
    const card = e.target.closest && e.target.closest('.ff-card'); if (!card) return;
    const c = CONTACTS.find(x => x.id === activeId); const m = c && c.msgs && c.msgs[Number(card.dataset.ffi)];
    if (m && m.file) ffOpen(m);
});
const __messagesHandlers = {toast:toast, focusSearch:focusSearch, switchTab:switchTab, fabAction:fabAction, exitMessagesToHome:exitMessagesToHome, syncSettingsMode:syncSettingsMode, openContactEditor:openContactEditor, closeContactEditor:closeContactEditor, openPersonaEditor:openPersonaEditor, openNewContact:openNewContact, openNewContactFromCurrentFolder:openNewContactFromCurrentFolder, showPersona:showPersona, fillPersona:fillPersona, previewPersonaName:previewPersonaName, closePersonaEditor:closePersonaEditor, openAccountMgr:openAccountMgr, renderAccountList:renderAccountList, savePersona:savePersona, loadImage:loadImage, saveContact:saveContact, deleteContact:deleteContact, renderMoments:renderMoments, openChat:openChat, closeChat:closeChat, renderThread:renderThread, showTyping:showTyping, onKey:onKey, onTyping:onTyping, autoGrow:autoGrow, updateSend:updateSend, toggleQuickMenu:toggleQuickMenu, initComposerGesture:initComposerGesture, applyTheme:applyTheme, renderThemeList:renderThemeList, openAppearance:openAppearance, closeAppearance:closeAppearance, folderMembers:folderMembers, folderName:folderName, renderContacts:renderContacts, openFolderDetail:openFolderDetail, closeFolderDetail:closeFolderDetail, renderFolderDetail:renderFolderDetail, openFolderPicker:openFolderPicker, closeFolderPicker:closeFolderPicker, renderFolderPicker:renderFolderPicker, toggleFolderMember:toggleFolderMember, openFolderNew:openFolderNew, closeFolderNew:closeFolderNew, saveFolderNew:saveFolderNew, deleteFolder:deleteFolder, wheelList:wheelList, renderWheel:renderWheel, applyWheel:applyWheel, updateWheelUI:updateWheelUI, wheelAngle:wheelAngle, wheelDown:wheelDown, wheelMove:wheelMove, wheelUp:wheelUp, wheelTap:wheelTap, openWheelCard:openWheelCard, fdCards:fdCards, fdCurrentIndex:fdCurrentIndex, fdGo:fdGo, fdStep:fdStep, updateFdArrows:updateFdArrows, closeSync:closeSync, openApiSettings:openApiSettings, openContactIdModal:openContactIdModal, renderContactAddChoice:renderContactAddChoice, showContactIdEntry:showContactIdEntry, showDirectContactList:showDirectContactList, directAddContact:directAddContact, closeContactIdModal:closeContactIdModal, previewContactById:previewContactById, addChatByContactId:addChatByContactId, openRoomSettings:openRoomSettings, roomAction:roomAction, openChatsSettings:openChatsSettings, softAction:softAction, closeSheet:closeSheet, openSelfPersona:openSelfPersona, pullReply:pullReply, sendMessage:sendMessage, startSync:startSync, importDeviceContacts:importDeviceContacts, renderChats:renderChats, closeRoomView:closeRoomView, popupOk:popupOk, popupCancel:popupCancel, startProfileEdit:startProfileEdit, closeAccountMgr:closeAccountMgr, resetFrameScroll:resetFrameScroll, openSidebar:openSidebar, closeSidebar:closeSidebar, showLoginMask:showLoginMask, hideLoginMask:hideLoginMask, renderStrip:renderStrip, pickAccount:pickAccount, refreshAccounts:refreshAccounts, doLogin:doLogin, directLogin:directLogin, finishLogin:finishLogin, applyPersona:applyPersona, applySelf:applySelf, openIdentitySheet:openIdentitySheet, pickIdentity:pickIdentity, openIdentityEditor:openIdentityEditor, deleteIdentity:deleteIdentity, pickPersonaAvatar:pickPersonaAvatar, exitContactLogin:exitContactLogin, setRoomTab:setRoomTab, pickRoomBg:pickRoomBg, clearRoomBg:clearRoomBg, fillRoomCss:fillRoomCss, previewRoomCss:previewRoomCss, saveRoomCss:saveRoomCss, clearRoomCss:clearRoomCss, openCssPreview:openCssPreview, openMomentComposer:openMomentComposer, publishMoment:publishMoment, deleteMoment:deleteMoment, pickMomentCover:pickMomentCover, setRoomTimerMode:setRoomTimerMode, saveRoomTimer:saveRoomTimer, closeFullMask:closeFullMask, updateMomentCount:updateMomentCount, toggleMomentLike:toggleMomentLike, openMomentComments:openMomentComments, sendMomentComment:sendMomentComment, openMomentVisPanel:openMomentVisPanel, closeMomentVisPanel:closeMomentVisPanel, setMomentVis:setMomentVis, toggleMomentVisTo:toggleMomentVisTo, pickMomentPhotos:pickMomentPhotos, removePendingPhoto:removePendingPhoto, pickProfilePhoto:pickProfilePhoto, togglePersonaFold:togglePersonaFold, saveChatCount:saveChatCount, setRoomOpt:setRoomOpt, stepRoomOpt:stepRoomOpt, toggleRoomBatch:toggleRoomBatch, toggleMomentCmt:toggleMomentCmt, sendMomentCommentInline:sendMomentCommentInline, revealMomentCover:revealMomentCover, tapContactCard:tapContactCard, toggleRoomFold:toggleRoomFold, pickPersonaImport:pickPersonaImport, openMemoryPage:openMemoryPage, closeMemoryPage:closeMemoryPage, memSetNum:memSetNum, memToggleAuto:memToggleAuto, memSummarizeRange:memSummarizeRange, memSaveInstr:memSaveInstr, memRestoreDefault:memRestoreDefault, memSavePreset:memSavePreset, memUpdatePreset:memUpdatePreset, memDeletePreset:memDeletePreset, memSwitchPreset:memSwitchPreset, memSetPriority:memSetPriority, memDelete:memDelete, openMomentPick:openMomentPick, momentRestore:momentRestore, momentUpload:momentUpload, filterMomentVis:filterMomentVis, selectAllMomentVis:selectAllMomentVis, clearMomentVis:clearMomentVis, setAvOpt:setAvOpt, toggleCFold:toggleCFold, toggleChatPrompt:toggleChatPrompt, toggleChatDrop:toggleChatDrop};
Object.assign(__messagesHandlers, {clearQuote, onRoomFontSize, openCssHelp, copyCssHelp, closeHeartPop, addPresetFromInput, presetNameKey, togglePresetPick, pickCssPreset, openMoreSheet, openNarrSheet, narrSet, narrBgSet, narrBgFill, narrBgReset, narrBgPanel, unlockNarrBg, checkNarrBgPassword, openMqSheet, closeMqSheet, memSetSec, memOpenAdd, memCloseAdd, memSaveNew, memSetItemSec, memSetLevel, memStartEdit, memCancelEdit, memSaveEdit});
__messagesHandlers.setTransOpt = setTransOpt;
for (const [name, fn] of Object.entries(__messagesHandlers)) window[name] = fn;
Object.assign(window, { openMomentFreq, closeMomentFreq, momentSyncAll });
Object.assign(window, { openMomentPhoto, showVisPeek });

/* ---------------- 心声：头像下的爱心 · 心声弹窗 · 波浪线切换 · 收藏柜 · 设置 ---------------- */
const HEART_SET_KEY = 'heart_popup_settings_v1';
const HEART_SVG = '<svg class="hv-heart" viewBox="0 0 24 24" aria-label="心声"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
const HP_ICON = {
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    like: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.4-7.5-9.5A4.2 4.2 0 0 1 12 8.3a4.2 4.2 0 0 1 7.5 2.7c0 5.1-7.5 9.5-7.5 9.5z"/></svg>',
    set: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>'
};
function heartSettings(){ try { return JSON.parse(localStorage.getItem(HEART_SET_KEY) || '{}') || {}; } catch (_) { return {}; } }
function saveHeartSettings(v){ try { localStorage.setItem(HEART_SET_KEY, JSON.stringify(v)); } catch (_) {} }
function applyHeartCss(){
    let st = document.getElementById('hpUserCss');
    if (!st) { st = document.createElement('style'); st.id = 'hpUserCss'; document.head.appendChild(st); }
    st.textContent = heartSettings().css || '';
}
function heartRoundsOf(c){ return Array.isArray(c.hearts) ? c.hearts : []; }
function latestHeartId(c){ const h = heartRoundsOf(c); return h.length ? h[h.length - 1].id : null; }
/* 这一轮回复的心声：挂在这一轮最后一条对方消息上（头像下面的爱心跟着最新一轮走） */
function attachHeart(c, heart, fromIdx){
    if (!heart) return;
    c.hearts = heartRoundsOf(c);
    // 挂在这一轮的第一条对方消息上：它前面是我发的消息，一定是气泡组的第一条，头像才会显示
    const first = c.msgs.slice(fromIdx || 0).find(m => !m.me && !m.narr);
    if (!first) return;
    const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    c.hearts.push(Object.assign({ id, ts: Date.now(), t: nowTime(), liked: false }, heart));
    first.hid = id;
}

/* 心声弹窗结构 */
function ensureHeartPop(){
    if (document.getElementById('hpMask')) return;
    const root = document.querySelector('.messages-app') || document.body;
    const mask = document.createElement('div');
    mask.id = 'hpMask'; mask.className = 'hp-mask';
    mask.innerHTML = `
    <div class="hp-pop" id="hpPop">
      <div class="hp-view hp-voice">
        <div class="hp-card" id="hpCard">
          <div class="hp-script">HEART VOICE</div>
          <div class="hp-title" id="hpTitle"></div>
          <div class="hp-stamp"><div class="hp-stamp-label">心声</div><div class="hp-said" id="hpSaid"></div></div>
        </div>
        <div class="hp-shot hp-s1"><div class="hp-ph" id="hpEnv"></div><div class="hp-tt">当前环境</div></div>
        <div class="hp-shot hp-s2"><div class="hp-ph" id="hpMood"></div><div class="hp-tt">心情</div></div>
        <div class="hp-shot hp-s3"><div class="hp-ph" id="hpOutfit"></div><div class="hp-tt">穿着</div></div>
        <div class="hp-shot hp-s4"><div class="hp-ph" id="hpAff"></div><div class="hp-tt">好感度</div></div>
        <div class="hp-foot">
          <button class="hp-qbtn" type="button" id="hpClose" aria-label="关闭">${HP_ICON.close}</button>
          <button class="hp-qbtn hp-like" type="button" id="hpLike" aria-label="点赞">${HP_ICON.like}</button>
          <button class="hp-qbtn" type="button" id="hpSet" aria-label="设置">${HP_ICON.set}</button>
        </div>
        <div class="hp-wave" id="hpWave">
          <svg viewBox="0 0 300 44" preserveAspectRatio="none"><path id="hpW1" d=""/><path id="hpW2" d=""/></svg>
          <div class="hp-wave-label" id="hpWaveLabel"></div>
        </div>
        <button class="hp-wave-del" type="button" id="hpWaveDel">删除这一轮</button>
        <button class="hp-wave-del-all" type="button" id="hpWaveDelAll">删除全部</button>
      </div>
      <div class="hp-view hp-set-view">
        <div class="hp-card">
          <div class="hp-script">SETTINGS</div>
          <div class="hp-title">心声设置</div>
          <label class="hp-label">弹窗样式（CSS，类名：.hp-card 卡片 · .hp-stamp 邮票框 · .hp-shot 拍立得 · .hp-said 心声正文 · .hp-foot 底部按钮）</label>
          <textarea class="hp-ta" id="hpCssBox" placeholder=".hp-card{border-radius:28px}"></textarea>
          <label class="hp-label">给 AI 的输出格式（说明它怎样输出匹配内容的 HTML，填了之后 AI 会额外返回 html，弹窗里用它代替心声正文）</label>
          <textarea class="hp-ta" id="hpFmtBox" placeholder='例如：心声正文放进 <div class="said">，每句话用 <p> 包起来'></textarea>
        </div>
        <div class="hp-set-foot">
          <button class="hp-qbtn" type="button" id="hpBack" aria-label="返回">${HP_ICON.back}</button>
          <button class="hp-save" type="button" id="hpApply">保存</button>
        </div>
      </div>
      <div class="hp-view hp-fav-view">
        <div class="hp-card">
          <div class="hp-script">COLLECTION</div>
          <div class="hp-title">收藏柜</div>
          <div class="hp-fav-list" id="hpFavList"></div>
        </div>
        <div class="hp-set-foot"><button class="hp-qbtn" type="button" id="hpFavBack" aria-label="返回">${HP_ICON.back}</button></div>
      </div>
    </div>`;
    root.appendChild(mask);
    applyHeartCss();

    mask.addEventListener('click', e => { if (e.target === mask) mask.classList.remove('show'); });
    document.getElementById('hpClose').onclick = () => closeHeartPop();
    document.getElementById('hpSet').onclick = () => {
        const s = heartSettings();
        document.getElementById('hpCssBox').value = s.css || '';
        document.getElementById('hpFmtBox').value = s.fmt || '';
        document.getElementById('hpPop').classList.add('is-set');
    };
    document.getElementById('hpBack').onclick = () => document.getElementById('hpPop').classList.remove('is-set');
    document.getElementById('hpApply').onclick = () => {
        saveHeartSettings({ css: document.getElementById('hpCssBox').value, fmt: document.getElementById('hpFmtBox').value.trim() });
        applyHeartCss();
        document.getElementById('hpPop').classList.remove('is-set');
        toast('心声设置已保存');
    };
    document.getElementById('hpFavBack').onclick = () => document.getElementById('hpPop').classList.remove('is-fav');
    document.getElementById('hpFavList').addEventListener('click', e => {
        const item = e.target.closest('.hp-fav-item'); if (!item) return;
        const [cid, rid] = item.dataset.key.split('|');
        document.getElementById('hpPop').classList.remove('is-fav');
        openHeart(cid, rid);
    });
    bindHeartWave();
    bindHeartLike();
}

let HP = { cid: null, rid: null };
function hpContact(){ return CONTACTS.find(x => x.id === HP.cid) || null; }
function hpRoundIndex(){ const c = hpContact(); if (!c) return -1; const h = heartRoundsOf(c); const i = h.findIndex(r => r.id === HP.rid); return i >= 0 ? i : h.length - 1; }
function hpRound(){ const c = hpContact(); if (!c) return null; const h = heartRoundsOf(c); return h[hpRoundIndex()] || null; }

/* 照片：读取 assets/心声/<名字>.jpg，加载失败时只显示文字 */
function hpPhoto(id, name, text, raw){
    const el = document.getElementById(id);
    el.innerHTML = `<img src="assets/心声/${name}.jpg" alt="" onerror="this.remove()"><span class="hp-cap">${raw ? text : esc(text || '—')}</span>`;
}
function renderHeartPop(){
    const c = hpContact(); const h = c ? heartRoundsOf(c) : []; const r = hpRound(); const i = hpRoundIndex();
    document.getElementById('hpTitle').textContent = `${c ? dispName(c) : ''}的心声`;
    const said = document.getElementById('hpSaid');
    if (r && r.html) said.innerHTML = r.html; else said.textContent = r ? (r.said || '') : '暂无心声';
    hpPhoto('hpEnv', '环境', r ? r.env : '');
    hpPhoto('hpMood', '心情', r ? r.mood : '');
    hpPhoto('hpOutfit', '穿着', r ? r.outfit : '');
    hpPhoto('hpAff', '好感度', r ? `<b>${String(r.aff).replace(/%$/, '')}%</b>` : '', true);
    document.getElementById('hpWaveLabel').textContent = h.length ? `第 ${i + 1} / ${h.length} 轮` : '没有心声了';
    document.getElementById('hpLike').classList.toggle('on', !!(r && r.liked));
    drawHeartWave();
}
function drawHeartWave(){
    const W = 300, period = 30, amp = 5;
    const mk = (phase, cy) => { let d = `M0 ${cy}`; for (let x = 0; x <= W; x += 2) d += ` L${x} ${(cy + Math.sin((x / period) * Math.PI * 2 + phase) * amp).toFixed(2)}`; return d; };
    document.getElementById('hpW1').setAttribute('d', mk(0, 16));
    document.getElementById('hpW2').setAttribute('d', mk(Math.PI * 0.6, 28));
}
function openHeart(cid, rid){
    ensureHeartPop();
    const c = CONTACTS.find(x => x.id === cid); if (!c) return;
    HP.cid = cid; HP.rid = rid || latestHeartId(c);
    const pop = document.getElementById('hpPop');
    pop.classList.remove('is-set', 'is-fav');
    renderHeartPop();
    const mk = document.getElementById('hpMask'); clearTimeout(mk._closeT); mk.classList.remove('closing'); mk.classList.add('show');
}
function closeHeartPop(){
    const mask = document.getElementById('hpMask'); if (!mask || !mask.classList.contains('show')) return;
    mask.classList.add('closing');
    clearTimeout(mask._closeT);
    mask._closeT = setTimeout(() => { mask.classList.remove('show', 'closing'); }, 250);
}
/* 切换上一轮 / 下一轮 */
function hpGo(delta){
    const c = hpContact(); if (!c) return;
    const h = heartRoundsOf(c); if (!h.length) return;
    const next = Math.min(h.length - 1, Math.max(0, hpRoundIndex() + delta));
    if (next === hpRoundIndex()) return;
    HP.rid = h[next].id;
    const card = document.getElementById('hpCard');
    card.classList.add('fade');
    setTimeout(() => { renderHeartPop(); card.classList.remove('fade'); }, 200);
}
function bindHeartWave(){
    const wave = document.getElementById('hpWave'), del = document.getElementById('hpWaveDel'), delAll = document.getElementById('hpWaveDelAll');
    let x0 = 0, dragging = false, moved = false, timer = null, longed = false;
    wave.addEventListener('pointerdown', e => {
        dragging = true; moved = false; longed = false; x0 = e.clientX;
        wave.setPointerCapture(e.pointerId);
        timer = setTimeout(() => {
            if (!moved && heartRoundsOf(hpContact() || {}).length) {
                longed = true;
                if (del) del.classList.add('show');
                if (delAll) delAll.classList.add('show');
            }
        }, 550);
    });
    wave.addEventListener('pointermove', e => { if (dragging && Math.abs(e.clientX - x0) > 6) { moved = true; clearTimeout(timer); } });
    const end = e => {
        if (!dragging) return;
        dragging = false; clearTimeout(timer);
        if (longed) return;
        const dx = e.clientX - x0;
        if (dx < -36) hpGo(1); else if (dx > 36) hpGo(-1);
    };
    wave.addEventListener('pointerup', end);
    wave.addEventListener('pointercancel', () => { dragging = false; clearTimeout(timer); });
    if (del) del.addEventListener('click', () => {
        if (del) del.classList.remove('show');
        if (delAll) delAll.classList.remove('show');
        const c = hpContact(); const r = hpRound(); if (!c || !r) return;
        c.hearts = heartRoundsOf(c).filter(x => x.id !== r.id);
        const m = c.msgs.find(x => x.hid === r.id); if (m) delete m.hid;
        HP.rid = null;
        persistContacts();
        if (activeId === c.id) renderThread({ noAnim: true });
        renderHeartPop();
    });
    if (delAll) delAll.addEventListener('click', () => {
        if (del) del.classList.remove('show');
        if (delAll) delAll.classList.remove('show');
        const c = hpContact(); if (!c) return;
        const hearts = heartRoundsOf(c);
        if (!hearts.length) return;
        const unlikedIds = new Set(hearts.filter(h => !h.liked).map(h => h.id));
        if (!unlikedIds.size) {
            toast('所有心声均已点赞收藏，未做删除');
            return;
        }
        c.msgs.forEach(m => { if (m.hid && unlikedIds.has(m.hid)) delete m.hid; });
        c.hearts = hearts.filter(h => h.liked);
        HP.rid = null;
        persistContacts();
        if (activeId === c.id) renderThread({ noAnim: true });
        renderHeartPop();
        toast('已删除所有未点赞心声');
    });
    document.addEventListener('pointerdown', e => {
        if (!e.target.closest || (!e.target.closest('#hpWave') && !e.target.closest('#hpWaveDel') && !e.target.closest('#hpWaveDelAll'))) {
            if (del) del.classList.remove('show');
            if (delAll) delAll.classList.remove('show');
        }
    });
}
/* 点赞：短按切换并收藏这一轮；长按打开收藏柜 */
function bindHeartLike(){
    const btn = document.getElementById('hpLike');
    let timer = null, longed = false;
    btn.addEventListener('pointerdown', () => { longed = false; timer = setTimeout(() => { longed = true; openHeartCabinet(); }, 500); });
    btn.addEventListener('pointerup', () => {
        clearTimeout(timer);
        if (longed) return;
        const c = hpContact(), r = hpRound(); if (!c || !r) return;
        r.liked = !r.liked;
        persistContacts(); renderHeartPop();
    });
    btn.addEventListener('pointerleave', () => clearTimeout(timer));
    btn.addEventListener('pointercancel', () => clearTimeout(timer));
}
/* 收藏柜：所有联系人里点过赞的心声 */
function openHeartCabinet(){
    const items = [];
    CONTACTS.forEach(c => heartRoundsOf(c).forEach((r, i) => { if (r.liked) items.push({ c, r, i }); }));
    const list = document.getElementById('hpFavList');
    list.innerHTML = items.length
        ? items.map(x => `<div class="hp-fav-item" data-key="${esc(x.c.id)}|${esc(x.r.id)}"><b>${esc(dispName(x.c))} · 第 ${x.i + 1} 轮 · 好感 ${x.r.aff}</b><span>${esc(x.r.said || '')}</span></div>`).join('')
        : '<div class="hp-fav-empty">还没有收藏的心声</div>';
    document.getElementById('hpPop').classList.remove('is-set');
    document.getElementById('hpPop').classList.add('is-fav');
    document.getElementById('hpMask').classList.add('show');
}
/* 点头像下的爱心或对面头像打开心声 */
document.addEventListener('click', e => {
    if (!activeId) return;
    if (typeof MM !== 'undefined' && MM.mode === 'multi') return;
    const hv = e.target.closest && e.target.closest('.hv-heart');
    if (hv) {
        openHeart(activeId);
        return;
    }
    const themAv = e.target.closest && e.target.closest('#thread .mrow:not(.me) .av-col');
    if (themAv) {
        const row = themAv.closest('.mrow');
        const c = CONTACTS.find(x => x.id === activeId);
        if (!c) return;
        const i = row ? Number(row.dataset.i) : -1;
        let targetHid = null;
        if (i >= 0 && c.msgs && c.msgs[i]) {
            if (c.msgs[i].hid) {
                targetHid = c.msgs[i].hid;
            } else {
                for (let k = i; k >= 0 && !c.msgs[k].me && !c.msgs[k].narr; k--) {
                    if (c.msgs[k].hid) { targetHid = c.msgs[k].hid; break; }
                }
                if (!targetHid) {
                    for (let k = i; k < c.msgs.length && !c.msgs[k].me && !c.msgs[k].narr; k++) {
                        if (c.msgs[k].hid) { targetHid = c.msgs[k].hid; break; }
                    }
                }
            }
        }
        openHeart(activeId, targetHid);
    }
});
};

/* ---------------- 音效：点击 / 发送 / 收到消息 / 开启旁白 / 关闭旁白（Web Audio 合成，音量已调低） ---------------- */
var SFX_AC = null;
function sfxCtx() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    SFX_AC = SFX_AC || new C();
    if (SFX_AC.state === 'suspended') SFX_AC.resume();
    return SFX_AC;
}
function sfxTone(ac, t, freq, toFreq, dur, peak, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
}
function sfxSweep(ac, t, from, to, dur, peak) {
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(t); src.stop(t + dur + 0.02);
}
var SFX_LIB = {
    tap(ac, t) { sfxTone(ac, t, 1100, 420, 0.07, 0.025); },
    send(ac, t) { sfxTone(ac, t, 620, 900, 0.07, 0.05, 'triangle'); sfxTone(ac, t + 0.06, 900, 1300, 0.08, 0.045, 'triangle'); },
    recv(ac, t) { sfxTone(ac, t, 880, 880, 0.30, 0.06); sfxTone(ac, t + 0.09, 1320, 1320, 0.35, 0.045); },
    narrOn(ac, t) { sfxSweep(ac, t, 300, 2200, 0.22, 0.05); },
    narrOff(ac, t) { sfxSweep(ac, t, 2200, 300, 0.22, 0.05); }
};
function playSfx(name) {
    try { const ac = sfxCtx(); if (!ac || !SFX_LIB[name]) return; SFX_LIB[name](ac, ac.currentTime + 0.01); } catch (_) {}
}
(function initTapFeedback() {
    if (window.__msgTapFeedback) return;
    window.__msgTapFeedback = true;
    let lastAt = 0;
    document.addEventListener('pointerdown', e => {
        const t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('textarea, input, select')) return;
        if (!t.closest('.messages-app')) return;
        if (!t.closest('.nb-entry, .nb-toggle, .pull, .mm-item, #tabbar .tab, #tabbar .fab')) return;   // 只有这几处有点击音（含主界面底栏）
        const now = Date.now();
        if (now - lastAt < 60) return;
        lastAt = now;
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
        playSfx('tap');
    }, true);

})();
