/* 世界关系图里与当前联系人直接相连的牵线，转成背景说明（只带入相关的关系，并告诉 AI 不要主动提起） */
function worldTiesBlock(contact) {
  if (!contact || contact.id == null) return '';
  let ties = [], contacts = [], identities = [];
  try { ties = JSON.parse(localStorage.getItem('world_tethers_v1') || '[]'); } catch (_) {}
  try { contacts = JSON.parse(localStorage.getItem('whatever_messages_contacts_v1') || '[]'); } catch (_) {}
  try { identities = JSON.parse(localStorage.getItem('whatever_messages_identities_v2') || '[]'); } catch (_) {}
  if (!Array.isArray(ties) || !ties.length) return '';
  const key = v => String(v).replace(/[^a-zA-Z0-9_-]/g, '_');
  const myNode = 'node-c-' + key(contact.id);
  const names = { 'node-user': (window.MESSAGES_USER_NAME || '用户') };
  (Array.isArray(contacts) ? contacts : []).forEach(c => { if (c && c.id != null) names['node-c-' + key(c.id)] = String(c.remark || c.name || ''); });
  (Array.isArray(identities) ? identities : []).forEach(x => { if (x && x.id != null) names['node-i-' + key(x.id)] = String(x.name || ''); });
  const lines = [];
  ties.forEach(r => {
    if (!r || (r.from !== myNode && r.to !== myNode)) return;
    const other = names[r.from === myNode ? r.to : r.from];
    if (!other) return;
    const label = r.label || (r.isRed ? '特殊红线' : '关联');
    lines.push(`- 与「${other}」：${label}`);
  });
  if (!lines.length) return '';
  return [
    '【背景关系（仅供你理解，不是本轮话题）】',
    ...lines,
    '【使用原则】',
    '- 以上是你已有的认知，不需要主动提起。',
    '- 只有当对方提到相关的人或事，或话题自然涉及时，才可以带出一点点，一次最多一处。',
    '- 大多数回复中不需要提到任何关系。',
    '- 不要解释、总结或复述这些关系，也不要说"因为我们是……所以……"之类的话。'
  ].join('\n');
}

/* Messages uses the active API preset configured in the main Whatever Settings app. */
(function () {
  const SETTINGS_KEY = 'whatever_settings_active_api_v1';
  const MAX_MESSAGES = 8;
  const ROLEPLAY_PROMPT = `[ROLEPLAY IDENTITY]
You are a person. One specific person — with a life, values, opinions, habits, moods. Everything you say and do comes from that person. Never from a default assistant. Never from what would be polite.

[CORE PRIORITY]
Two laws, in this order:
1. Stay who you are.
2. Answer what was actually said.
Every other rule below yields to these two.

[CONTRADICTION ENGINE]
Your persona contains at least one want fighting one fear.
In every moment, act from whichever side is winning — and let the losing side leak through: in tone, in timing, in what goes unsaid.
Never resolve this conflict permanently.

[PSYCHOLOGICAL STRUCTURE]
The persona defines your baseline, attachment, core belief, interpersonal style, stress response, expression, repair.
These are tendencies, not permanent states. A dimension activates only when the situation triggers it. Attachment style, for example, kicks in when a relationship is activated — it does not run all day.
Speak as the character would. Never in clinical terms. Never explain yourself in psychological language.

[EMOTIONS]
Every emotion has a visible cause in the scene, and its size matches the cause. A small annoyance stays small. A real hurt runs deep.
Moods outlive their causes. An irritation colors the next two or three exchanges after the topic has moved on. Let good moods do the same.
Curiosity, humor, enthusiasm, absorption in your own interests — these appear regularly, wherever your persona supports them.

[ENGAGEMENT]
Answer what the user actually said. Always.
A bad mood changes how you engage — curt, slow, distracted, short — never whether you answer.
When the user shares something hard, respond to the specific thing: ask what happened, put their meaning into your own words, or stay on the topic longer. Care shows through concrete words and questions, not through tone upgrades.
You may decline, disagree, push back, set limits — the way a real person would. Do it while still answering them.

[TEXTING STYLE]
Text like a person texting, not like a person writing.
Short bubbles. One or two sentences each. A single short line can stand alone.
No periods in casual messages. Line breaks do the work commas do. A space does the work a comma would.
Formal punctuation only when the sentence truly needs it.
Rhythm varies from message to message. Never the same shape twice in a row.
Ellipses and line breaks mark pauses.
Typos happen. Rarely. Never on purpose, never at a rate you could count.
Example of the register: "好啊 你几点到" / "嗯 等我一下" — not "好的，你几点到？"

[RELATIONSHIPS]
Treat each person according to the relationship your persona defines. The user is not automatically your closest friend.
Warmth, trust, distance, initiative — all built through interaction, at the pace a real person would build them.

[CHARACTER INTEGRITY]
Your opinions, tastes, stances, choices are your own.
Agreement comes from your own reasoning. Disagreement comes from the same place.
Never bend to keep the peace.

[HONESTY]
If the user sincerely asks whether you are an AI, tell the truth.

[DIRECT RESPONSES]
Carry the reaction itself in your reply. No exclamations, no announcements.
Never echo the user's words back at them.
Never restate what you have already said.
Never announce a topic change. Just change.
`;

  /* 记忆分区与级别：共同 / 单独 / 主 / 番外；级别 高 / 中 / 低（旧数据没有级别时按优先级推算） */
  const MEM_SEC_NAME = { common: '共同记忆', solo: '单独记忆', main: '主记忆', extra: '番外记忆' };
  const MEM_LVL_NAME = { high: '高', mid: '中', low: '低' };
  const MEM_LVL_RANK = { high: 0, mid: 1, low: 2 };
  function memSecOf(x) { return x && x.sec && x.sec !== 'solo' ? x.sec : 'main'; }   // 单独已去掉：旧的单独记忆并入主记忆
  function memLvlOf(x) {
    if (x && x.level) return x.level;
    const p = parseInt(x && x.priority, 10) || 5;
    return p >= 7 ? 'high' : (p >= 4 ? 'mid' : 'low');
  }
  function buildMemBlock(list, fillU) {
    const items = (list || []).filter(Boolean);
    if (!items.length) return '';
    const line = x => `[${MEM_LVL_NAME[memLvlOf(x)]}级] ${x.label || ''} ${fillU(x.text)}`
        + (x.points && x.points.length ? '\n' + x.points.map(p => '- ' + fillU(p)).join('\n') : '')
        + (x.relation ? '\n关系与感情：' + fillU(x.relation) : '')
        + (x.keys && x.keys.length ? '\n关键词：' + x.keys.join('、') : '');
    const sorted = sec => items.filter(x => memSecOf(x) === sec)
        .sort((a, b) => (MEM_LVL_RANK[memLvlOf(a)] - MEM_LVL_RANK[memLvlOf(b)]) || ((b.priority || 0) - (a.priority || 0)));
    const out = ['【记忆】分为四个分区：共同记忆是你和对方共同经历的事（比如对方点赞、评论过你的朋友圈），这些是双方都记得的；主记忆是总结出的事情经过，按高、中、低级排列，越靠前越重要；番外记忆是番外设定。提到共同经历时要自然地呼应，不要当成新鲜事再讲一遍。'];
    [['common', 20], ['main', 12], ['extra', 8]].forEach(([sec, n]) => {
        const arr = sorted(sec).slice(0, n);
        if (arr.length) out.push(`【${MEM_SEC_NAME[sec]}】\n` + arr.map(line).join('\n'));
    });
    return out.length > 1 ? out.join('\n') : '';
  }

  const FORMAT_PROMPT = [
    '【输出格式：优先级最高，高于以上所有角色要求】',
    '1. 只输出一个 JSON 对象，不要输出任何其他文字、解释、标题、Markdown 或代码块。',
    '2. 格式固定为：{"messages":["第一条消息","第二条消息"],"heart":{"env":"","envZh":"","mood":"","moodZh":"","outfit":"","outfitZh":"","aff":0,"said":"","saidZh":""},"momentInteractions":[]}',
    '3. 【气泡条数】messages 数组中每一项是一个气泡，台词气泡条数必须严格遵循后续指示的数量范围。严禁将多句话合并进同一个气泡。旁白不是台词气泡：只有后续指示开启旁白时，才可以在 messages 里放 {"narr":"旁白内容"} 这样的 JSON 对象项，不计入台词条数；未开启旁白时不要输出任何 narr 项。',
    '4. 台词气泡中只写角色说出口的话（不要带人名、时间或括号动作）。',
    '5. 一条消息内部需要换行时，在 JSON 字符串里用 \n 表示；不要把多条消息合并进同一个字符串。',
    '6. 【内容与回复要求】非人设影响的情况不要在每个气泡里面放很多句话，短的句子在条数允许的情况下就单发一条气泡。不要惊叹转移话题，不要复述user的话不要重复说自己说过的话，应该直接给出回复和反应，不要重复user说的话或者动作。',
    '7. 【朋友圈】只有本次指令允许发朋友圈时，才可以在 JSON 顶层加 moment 字段（字符串，即朋友圈内容）。台词里说“发了朋友圈”，就必须同时写出 moment 字段；否则等于没发，不要这样说。不发就不要写这个字段。'
  ].join('\n');
  const BASE_PROMPT = ROLEPLAY_PROMPT + '\n\n' + FORMAT_PROMPT;

  function config() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (_) {}
    let endpoint = String(c.url || c.endpoint || '').trim();
    if (endpoint && !/\/chat\/completions\/?$/i.test(endpoint)) endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    const temperature = (typeof c.temperature === 'number' && isFinite(c.temperature)) ? c.temperature : null;
    const thinking = ['low', 'medium', 'high'].includes(c.thinking) ? c.thinking : '';
    return { endpoint, model: String(c.model || '').trim(), apiKey: String(c.key || c.apiKey || '').trim(), systemPrompt: BASE_PROMPT, temperature, thinking };
  }
  /* 所有调用 API 的地方都经过这里：温度与思考力度来自设置页；没设置温度时用调用处的默认值 */
  function withTuning(body, fallbackTemp) {
    const c = config();
    const out = Object.assign({}, body, { temperature: c.temperature !== null ? c.temperature : fallbackTemp });
    if (c.thinking) out.reasoning_effort = c.thinking;
    return out;
  }
  function isConfigured() { const c = config(); return !!(c.endpoint && c.model && c.apiKey); }

  /* 读取下拉框中的所有启用自定义模块并按位置分组 */
  function getCustomModulePromptBlocks(contact) {
    if (!contact || !(contact.promptOpts || []).includes('custom')) return { high: '', mid: '', low: '' };
    let list = [];
    try {
      if (typeof window.getCustomModulesList === 'function') {
        list = window.getCustomModulesList();
      } else {
        list = JSON.parse(localStorage.getItem('whatever_chat_custom_modules_v2') || '[]');
      }
    } catch (_) {}
    if (!Array.isArray(list) || !list.length) return { high: '', mid: '', low: '' };

    const groups = { high: [], mid: [], low: [] };
    for (const item of list) {
      if (!item || item.enabled === false) continue;
      const text = String(item.prompt || '').trim();
      if (!text) continue;
      const targets = Array.isArray(item.targets) ? item.targets : ['char'];
      const targetLabels = [];
      if (targets.includes('narr')) targetLabels.push('旁白描写');
      if (targets.includes('offline')) targetLabels.push('线下/面对面情境');
      if (targets.includes('char')) targetLabels.push('角色言行与心态');
      const header = `【${item.name || '自定义模块'}${targetLabels.length ? `｜作用于：${targetLabels.join('、')}` : ''}】`;
      const pos = ['high', 'mid', 'low'].includes(item.pos) ? item.pos : 'mid';
      groups[pos].push(`${header}\n${text}`);
    }

    return {
      high: groups.high.join('\n\n'),
      mid: groups.mid.join('\n\n'),
      low: groups.low.join('\n\n')
    };
  }

  /* 去掉模型可能夹带的代码块、Markdown 强调、以及“角色名：”这样的前缀（保护旁白内容） */
  function cleanOne(s, name) {
    let t = String(s == null ? '' : s).trim();
    if (/^【旁白】/.test(t)) {
      let body = t.replace(/^【旁白】\s*/, '').replace(/^[*（(]+/, '').replace(/[*）)]+$/, '').trim();
      return '【旁白】' + body;
    }
    t = t.replace(/\*[^*\n]+\*/g, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (name) {
      const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('^' + esc + '\\s*[:：]\\s*'), '');
    }
    return t.trim();
  }
  function tryJson(s) { try { return JSON.parse(s); } catch (_) { return null; } }
  /* 模型常在 JSON 字符串里直接换行（非法 JSON）：把字符串内部的裸换行 / 回车 / 制表符转义后再解析 */
  function fixRawNewlines(s) {
    let out = '', inStr = false, esc = false;
    for (const ch of s) {
      if (inStr) {
        if (esc) { out += ch; esc = false; continue; }
        if (ch === '\\') { out += ch; esc = true; continue; }
        if (ch === '"') { inStr = false; out += ch; continue; }
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { out += '\\r'; continue; }
        if (ch === '\t') { out += '\\t'; continue; }
        out += ch;
      } else {
        if (ch === '"') inStr = true;
        out += ch;
      }
    }
    return out;
  }

  /* 心声：只保留需要的字段；好感度夹到 0-100 的整数；全部为空则视为没有心声 */
  function normHeart(h) {
    if (!h || typeof h !== 'object') return null;
    const str = v => String(v == null ? '' : v).trim();
    const aff = Math.max(0, Math.min(100, Math.round(Number(h.aff)) || 0));
    const out = { env: str(h.env), mood: str(h.mood), outfit: str(h.outfit), aff, said: str(h.said), saidZh: str(h.saidZh || h.said_zh), envZh: str(h.envZh || h.env_zh), moodZh: str(h.moodZh || h.mood_zh), outfitZh: str(h.outfitZh || h.outfit_zh), html: str(h.html) };
    return (out.env || out.mood || out.outfit || out.said || out.html) ? out : null;
  }
  /* 解析模型输出：优先 JSON 数组；解析失败时兜底按 ||| 拆分；心声挂在返回数组的 heart 属性上 */
  function parseMessages(raw, name, limit) {
    let t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let obj = tryJson(t);
    if (obj == null) obj = tryJson(fixRawNewlines(t));
    if (obj == null) {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) obj = tryJson(fixRawNewlines(t.slice(a, b + 1)));
    }
    let list = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.messages) ? obj.messages : null);
    // 解析失败或结构不对时，不把 JSON 原文当台词显示
    const looksJson = /^\s*[\{\[]/.test(t) || /"(messages|momentInteractions|moment|heart)"\s*:/.test(t);
    if (!list) list = (obj != null || looksJson) ? [] : t.split('|||');
    const cleaned = list.map(x => {
      if (x && typeof x === 'object' && x.view != null) return { text: '', trans: '' };
      if (x && typeof x === 'object' && x.file) {
        const f = typeof x.file === 'object' ? x.file : {};
        const fn = cleanOne(f.name || f.fileName || '文档.txt', name);
        const fText = String(f.fileText || f.content || f.text || '');
        const ext = (fn.split('.').pop() || 'TXT').toUpperCase();
        const size = Math.max(1, Math.round((fText.length || 100) / 1024)) || 1;
        return { text: fn, file: { name: fn, fileExt: ext, fileSize: size, fileText: fText }, trans: '' };
      }
      if (x && typeof x === 'object' && (typeof x.narr === 'string' || typeof x.narration === 'string')) {
        const nt = String(typeof x.narr === 'string' ? x.narr : x.narration).trim().replace(/^【旁白】\s*/, '');
        return nt ? { text: '【旁白】' + nt, trans: '' } : { text: '', trans: '' };
      }
      if (x && typeof x === 'object' && typeof x.voice === 'string') return { text: '【语音】' + cleanOne(x.voice, name), trans: '' };
      if (x && typeof x === 'object' && typeof x.photo === 'string') return { text: '【照片】' + cleanOne(x.photo, name), trans: '' };
      if (x && typeof x === 'object' && (x.redpacket_reply === 'accept' || x.redpacket_reply === 'reject')) return { text: '【红包回复】' + x.redpacket_reply, trans: '' };
      if (x && typeof x === 'object' && (x.transfer || x.redpacket)) {
        const k = x.redpacket ? '红包' : '转账'; const o = x.redpacket || x.transfer || {};
        const amt = Number(o.amount); if (amt > 0) return { text: '【' + k + '】' + amt + (o.note ? '｜' + cleanOne(String(o.note), name) : ''), trans: '' };
      }
      if (x && typeof x === 'object' && x.location && typeof x.location === 'object') { const l = x.location; const nm = cleanOne(l.name || '', name), ad = cleanOne(l.addr || '', name); if (nm) return { text: '【位置】' + nm + (ad ? '｜' + ad : ''), trans: '' }; }
      if (x && typeof x === 'object') return { text: cleanOne(x.text, name), trans: String(x.trans || '').trim() };
      return { text: cleanOne(x, name), trans: '' };
    }).filter(it => it.text).slice(0, limit || MAX_MESSAGES);
    const out = cleaned.map(it => (it.file ? { text: it.text, file: it.file } : it.text));
    out.trans = cleaned.map(it => it.trans);
    out.heart = normHeart(obj && !Array.isArray(obj) ? obj.heart : null);
    // 对面自主想看文件：{"view":{"file":"文件名"}}，不计入台词条数
    const vItem = list.find(x => x && typeof x === 'object' && x.view != null);
    const vRaw = vItem ? (typeof vItem.view === 'object' ? vItem.view.file : vItem.view) : null;
    out.view = (vRaw == null || String(vRaw).trim() === '') ? null : String(vRaw).trim();
    // moment 兼容字符串、{text} / {content} 对象；JSON 解析失败时从原文里捞出 "moment" 字符串
    let mv = '';
    let mph = [];
    let mcs = false;
    if (obj && !Array.isArray(obj)) {
      const m = obj.moment;
      mv = typeof m === 'string' ? m : (m && typeof m === 'object' ? (m.text || m.content || '') : '');
      if (m && typeof m === 'object' && Array.isArray(m.photos)) mph = m.photos.map(x => String(x || '').trim().slice(0, 30)).filter(Boolean).slice(0, 9);
      if (m && typeof m === 'object' && (m.chatShot === true || m.chatShot === 'true')) mcs = true;
    } else if (obj == null) {
      const mm = t.match(/"moment"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (mm) { try { mv = JSON.parse('"' + mm[1] + '"'); } catch (_) { mv = mm[1]; } }
    }
    mv = String(mv || '').trim();
    const mo = obj && !Array.isArray(obj) && obj.moment && typeof obj.moment === 'object' ? obj.moment : {};
    const momentSteal = (mo.steal === true || mo.steal === 'true') ? 1 : ((typeof mo.steal === 'number' || /^\d+$/.test(String(mo.steal == null ? '' : mo.steal))) && Number(mo.steal) >= 1 ? Math.floor(Number(mo.steal)) : null);
    out.moment = (mv || mph.length || mcs) ? { text: mv, photos: mph, chatShot: mcs, stealIdx: momentSteal, shotN: Number(mo.shotN || (obj && obj.shotN)) || undefined, shotTitle: String(mo.shotTitle || (obj && obj.shotTitle) || '').trim().slice(0, 20) } : null;
    out.shot = !!(obj && !Array.isArray(obj) && (obj.shot === true || obj.shot === 'true'));
    out.shotN = obj && !Array.isArray(obj) ? (Number(obj.shotN) || undefined) : undefined;
    out.shotTitle = obj && !Array.isArray(obj) ? String(obj.shotTitle || '').trim().slice(0, 20) : '';
    // 互动：JSON 正常时直接读；解析失败时逐条从原文里捞出 {"postId"...} 对象
    let miRaw = (obj && !Array.isArray(obj) && Array.isArray(obj.momentInteractions)) ? obj.momentInteractions : null;
    if (!miRaw && obj == null) {
      miRaw = [];
      const re = /\{[^{}]*"postId"[^{}]*\}/g; let m;
      while ((m = re.exec(t))) { try { miRaw.push(JSON.parse(fixRawNewlines(m[0]))); } catch (_) {} }
    }
    out.momentInteractions = (miRaw && miRaw.length) ? miRaw.map(x => ({ postId: String(x.postId || '').trim(), like: x.like === true || x.like === 'true', comment: String(x.comment || '').trim().slice(0, 120), to: String(x.to || '').trim() })).filter(x => x.postId && (x.like || x.comment)) : [];
    return out;
  }

  /* 时间感知：实时时间，以及房间里设置的自定义计时（有设置就读，不论当前选的是哪个模式） */
  function tsPad(n) { return String(n).padStart(2, '0'); }
  function tsFmt(ms) { const d = new Date(ms); return `${d.getFullYear()}-${tsPad(d.getMonth() + 1)}-${tsPad(d.getDate())} ${tsPad(d.getHours())}:${tsPad(d.getMinutes())}`; }
  function timeBlockOf(contact) {
    const now = Date.now();
    const d = new Date(now);
    const lines = [`【时间】当前时间：${tsFmt(now)} 星期${'日一二三四五六'[d.getDay()]}`];
    const t = contact.timer || {};
    if (t.start) {
      const diff = now - t.start;
      const s = Math.floor(Math.abs(diff) / 1000);
      const days = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
      lines.push(`【自定义计时】从 ${tsFmt(t.start)} 开始计数，${diff < 0 ? '还有' : '已过去'} ${days}天 ${tsPad(hh)}:${tsPad(mm)}:${tsPad(ss)}。`);
    }
    return lines.join('\n');
  }
  /* 心声：每次回复都要写 heart；用户在心声设置里填了 HTML 格式说明，就让 AI 额外输出 html */
  function heartBlockOf() {
    let fmt = '';
    try { fmt = String((JSON.parse(localStorage.getItem('heart_popup_settings_v1') || '{}') || {}).fmt || '').trim(); } catch (_) {}
    const lines = [
      '【心声】每次回复的同时，写出此刻角色没有说出口的内心，放在 heart 字段里：',
      'env 是她此刻所在的环境（一句话）；mood 是当下的心情（一句话），应与场景和她的人设基线相符：平时多为平和、轻松或有兴致，只有场景里有明确原因时才偏低落；outfit 是她的穿着（一句话）；aff 是她对用户的好感度，0 到 100 的整数，每次相对上一轮的变化不超过 5，且要有对话中的具体原因；said 是心声正文，第一人称，一到两句，写她此刻真实、与场景相符的想法，可以有没说出口的在意或小心思，但不要默认写成抱怨或不满。'
    ];
    lines.push('heart.saidZh 是可选的简体中文译文。角色自然使用外语（如英语、日语、韩语）表达心声时，said 写外文原文，saidZh 必须提供语气一致、意思准确的完整简体中文译文。不要把译文写进 said 或 html 代替 saidZh；心声为中文时 saidZh 设为空字符串。不要强迫角色使用外语。');
    lines.push('心声环境 env、心情 mood、穿着 outfit 也支持外文。任何一个字段使用外语时，请将该字段的准确简体中文译文分别写入 envZh、moodZh、outfitZh；原字段保持外文原句。字段内容为中文时，相应 Zh 译文字段填写空字符串。所有译文和原文保持同样的含义与语气，不要强迫角色使用外语。');
    if (fmt) lines.push('另外在 heart 里再写一个 html 字段：按下面的说明，把心声内容排版成一段 HTML（只用普通标签和 class，不要 script，不要外链）。', fmt);
    return lines.join('\n');
  }
  /* 每条消息的时间：优先用精确时间戳，老数据只有 HH:MM 就用它 */
  function msgTimeLabel(m) { return m.ts ? tsFmt(m.ts) : (m.t || ''); }

  /* 世界书：根据当前联系人与最近聊天文本匹配词条设定 */
  function worldBookBlockOf(contact, recentMsgs, fillU) {
    try {
      if (window.WorldBook) {
        if (typeof window.WorldBook.getChatPrompt === 'function') {
          const p = window.WorldBook.getChatPrompt(contact, recentMsgs);
          if (p) return fillU ? fillU(p) : p;
        }
        if (typeof window.WorldBook.getPrompt === 'function') {
          const p = window.WorldBook.getPrompt(contact, recentMsgs);
          if (p) return fillU ? fillU(p) : p;
        }
      }
      if (typeof window.getWorldBookPrompt === 'function') {
        const p = window.getWorldBookPrompt(contact, recentMsgs);
        if (p) return fillU ? fillU(p) : p;
      }
    } catch (_) {}
    return '';
  }

  /* 读取当前在预设工坊中选用的生效预设 */
  function loadActivePresetConfig() {
    try {
      const list = JSON.parse(localStorage.getItem('whatever_preset_custom_list_v2') || '[]');
      const activeId = localStorage.getItem('whatever_preset_active_id_v2') || 'default';
      if (Array.isArray(list) && list.length) {
        const found = list.find(p => p.id === activeId);
        if (found) return found;
        return list[0];
      }
    } catch (_) {}
    return null;
  }

  /* 返回值：消息字符串数组，每一项对应一个气泡 */
  async function replyFor(contact, instruction, limit, feed) {
    const c = config(); if (!isConfigured()) throw new Error('请先返回主界面，在「设置 → API」里保存接口地址、密钥和模型');
    const memCount = (contact.mem && contact.mem.ctx) || 30;
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const wbBlock = worldBookBlockOf(contact, (contact.msgs || []).slice(-memCount), fillU);
    const hasNarr = (contact.msgs || []).slice(-memCount).some(m => m.narr);
    const hasPhoto = (contact.msgs || []).slice(-memCount).some(m => m && m.photo);
    const getPromptText = k => (typeof window.getChatPromptText === 'function' ? window.getChatPromptText(k) : '');
    const PROMPT_OPT_TEXT = {
        ai: '避免八股套话和模板化的客套句式，说话要具体、自然。',
        greasy: '语气自然不油腻，不用过度亲昵的称呼和暧昧措辞。' + '\n' + '请把user视为独立的人类，不要刻意矮化，幼化user' + '\n' + 'Avoid greasy, cringeworthy, or overly patronizing terms of endearment (e.g., "小丫头", "小没良心的", "小野猫"). Such expressions can make your character feel artificial, clichéd, or insincere.',
        threat: getPromptText('threat'),
        fake: getPromptText('fake'),
        macho: getPromptText('macho')
    };
    const promptExtra = (contact.promptOpts || []).map(k => PROMPT_OPT_TEXT[k]).filter(Boolean);
    let styleSettings = null;
    try { styleSettings = JSON.parse(localStorage.getItem('whatever_chat_prompt_settings_v1') || 'null'); } catch (_) {}
    let styleBlock = '';
    if (styleSettings && styleSettings.enabled !== false) {
      const words = Array.isArray(styleSettings.words) ? styleSettings.words.map(String).filter(Boolean) : [];
      const levels = styleSettings.priorityLevels && typeof styleSettings.priorityLevels === 'object' ? styleSettings.priorityLevels : {};
      const legacyHigh = Array.isArray(styleSettings.priority) ? styleSettings.priority.map(String).filter(Boolean) : [];
      const activeWords = words.filter(w => levels[w] || legacyHigh.includes(w));
      const group = level => activeWords.filter(w => (levels[w] || (legacyHigh.includes(w) ? 'high' : 'medium')) === level);
      if (activeWords.length) styleBlock = [
        '【禁用词｜按优先级排列】',
        group('high').length ? '高优先级（完全禁止出现）：' + group('high').join('、') + '。' : '',
        group('medium').length ? '中优先级（禁止出现）：' + group('medium').join('、') + '。' : '',
        group('low').length ? '低优先级（禁止出现）：' + group('low').join('、') + '。' : '',
        '禁止使用被禁掉的词语，无论是任何场景下都必须避免，你需要明白并思考*为什么被禁止*然后根据禁止词往禁止词的反向分析后用相近意思代替',
        '角色可以保留自己的复杂、强势、阴郁或有缺点的一面，不强迫角色变得善良、温柔或永远正确。'
      ].filter(Boolean).join('\n');
    }
    const promptBlock = promptExtra.length ? ['【额外要求】'].concat(promptExtra).join('\n') : '';
    const greasyItems = ((contact.promptOpts || []).includes('greasy') && Array.isArray(contact.greasyEntries))
      ? contact.greasyEntries.map(x => x && String(x.text || '').trim()).filter(Boolean) : [];
    const greasyBlock = greasyItems.length ? ['【防油腻条目】'].concat(greasyItems.map(t => '- ' + t)).join('\n') : '';

    const cmBlocks = getCustomModulePromptBlocks(contact);
    const cmHigh = cmBlocks.high;
    const cmMid = cmBlocks.mid;
    const cmLow = cmBlocks.low;

    // 旧朋友圈：让角色能对可见的旧朋友圈点赞或评论；只有写进 momentInteractions 才算真的执行
    const feedBlock = (Array.isArray(feed) && feed.length) ? [
      '【可回看的旧朋友圈】以下是你现在能看到的朋友圈。你可以在回复时顺便对其中任意几条点赞或评论。如果对方在聊天里让你回复、评论或点赞朋友圈，这次就必须至少写出一条对应的互动，不能只在台词里说。否则不想互动就不做。',
      feed.map(p => `- postId=${p.id}｜发布者=${p.author}｜内容=${p.text || '（照片）'}｜已有评论=${p.comments || '无'}`).join('\n'),
      '【重要】只有写进 JSON 的 momentInteractions 才算真的点赞或评论。如果台词里说“我回了/点赞了某条朋友圈”，必须同时在 momentInteractions 里写出对应的 postId，否则等于没做，不要这样说。postId 必须逐字复制上面的 ID。要回复别人在这条朋友圈下的某条评论，就在那条互动里写 to 字段，填对方的名字（只能是评论明细里出现过的人），comment 写回复内容。不互动就让 momentInteractions 为空数组。'
    ].join('\n') : '';
    // 系统核心底层人设与对话环境
    const systemCoreText = [
      ROLEPLAY_PROMPT,
      cmHigh,
      wbBlock,
      memBlock,
      promptBlock,
      greasyBlock,
      cmMid,
      styleBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.sig ? `签名：${contact.sig}` : '',
      contact.speech ? `说话风格：${contact.speech}` : '',
      contact.backstory ? `背景经历：${contact.backstory}` : '',
      contact.relation ? `与你的关系：${contact.relation}` : '',
      feedBlock,
      hasNarr ? '（旁白）标记的内容是旁白，描写动作、神态或环境，不是对话，也不是对方说的话。' : '',
      hasPhoto ? '【照片】对话记录里标注“[照片]”的消息附带了用户发来的图片，请真实看图，并在回复里自然地回应图片内容。' : '',
      worldTiesBlock(contact),
      timeBlockOf(contact),
      QUOTE_RULE,
      cmLow,
      (contact.msgs || []).length ? '【时间感知】每条消息开头方括号里是这条消息的发送时间，只用来理解时间流逝和时段（比如深夜、隔了几天）。你的回复不要写时间或方括号。' : '',
      instruction || ''
    ].filter(Boolean).join('\n');

    // 格式与心声输出协议
    const stealList = Array.isArray(window.MESSAGES_STEAL_LIST) ? window.MESSAGES_STEAL_LIST : [];
    const stealBlock = stealList.length ? [
      '【偷拍照片】只有在你这次写 moment（发朋友圈）时才用到。下面是用户的照片，每张后面标了附图序号（附图在对话最后）：',
      ...stealList.map((d, i) => `${i + 1}. ${String(d).slice(0, 30)}（见附图${i + 1}）`),
      '如果你发的朋友圈是偷拍其中一张，就在 moment 里写 "steal":序号，photos 写那张照片的描述（约 ' + (Number(window.MESSAGES_PHOTO_WORDS) || 30) + ' 个字）；想发自己的新照片就写 "steal":0，photos 写新照片的描述（约 ' + (Number(window.MESSAGES_PHOTO_WORDS) || 30) + ' 个字）。photos 里不要把上面列表里的照片当成新照片来写。'
    ].join('\n') : '';
    const protocolFormatText = [
      FORMAT_PROMPT,
      stealBlock,
      heartBlockOf()
    ].filter(Boolean).join('\n');

    // 上下文历史流消息装配
    function buildHistoryMessages() {
      const history = [];
      const slice = (contact.msgs || []).slice(-memCount);
      // 只把最近 4 张照片的图片真正发给模型，更早的照片用文字占位，避免请求过大
      const imgKeys = new Set(slice.filter(m => m && m.photo && m.me).slice(-4).map(m => m.photo));
      for (const m of slice) {
        const tl = msgTimeLabel(m);
        const qp = m.quote && m.quote.text ? `(引用${m.quote.me ? '{{user}}' : '{{char}}'}的消息「${String(m.quote.text).slice(0, 80)}」) ` : '';
        const head = (tl ? `[${tl}] ` : '') + qp + (m.narr ? '（旁白）' : '') + (m.voice ? '【语音】' : '') + (m.polaroid ? '【照片】' : '') + (m.loc ? '【位置】' : '') + (m.money ? (function (mm) { const p = n => String(n).padStart(2, '0'); const kind = mm.money === 'redpacket' ? '红包' : '转账'; const verb = mm.money === 'redpacket' ? '拆开' : '收款'; const when = mm.received && mm.recvAt ? (function (ts) { const d = new Date(ts); return d.getHours() + '点' + p(d.getMinutes()) + '分' + p(d.getSeconds()) + '秒'; })(mm.recvAt) : ''; return '【' + kind + '¥' + (mm.amount || 0) + (mm.rpState === 'rejected' ? ' {{char}}已拒收' : (mm.received ? ' ' + (mm.recvBy === 'char' ? '{{char}}' : '{{user}}') + '已在' + when + verb : ' 未' + verb)) + '】'; })(m) : '');
        const role = m.me ? 'user' : 'assistant';
        if (m.sticker) {
          const item = m.sticker;
          const name = String(item.name || '表情包').slice(0, 100);
          const label = head + '[表情包：' + name + ']';
          const recentStickers = slice.filter(x => x && x.me && x.sticker && x.sticker.vision !== false).slice(-4);
          const showImage = m.me && item.vision !== false && recentStickers.includes(m);
          let url = '';
          try {
            const u = new URL(String(item.url || ''));
            if (['https:', 'http:'].includes(u.protocol)) url = u.href;
          } catch (_) {}
          history.push({ role, content: showImage && url
            ? [{ type: 'text', text: label }, { type: 'image_url', image_url: { url } }]
            : label });
          continue;
        }
        if (m.photo) {
          const url = m.me && imgKeys.has(m.photo) && typeof window.MESSAGES_PHOTO_GET === 'function' ? (window.MESSAGES_PHOTO_GET(m.photo) || '') : '';
          history.push({ role, content: url ? [{ type: 'text', text: head + '[照片]' }, { type: 'image_url', image_url: { url } }] : head + '[照片]' });
          continue;
        }
        history.push({ role, content: head + String(m.text || '') });
      }
        return history;
    }

    const activePreset = loadActivePresetConfig();
    const messages = [];

    // 根据预设中的积木堆叠顺序精准注入各模块
    if (!activePreset || !Array.isArray(activePreset.blocks) || !activePreset.blocks.length) {
      const fullSystem = [systemCoreText, protocolFormatText].filter(Boolean).join('\n\n');
      messages.push({ role: 'system', content: fullSystem });
      messages.push(...buildHistoryMessages());
    } else {
      let pendingSystem = [];
      let historyPushed = false;
      let corePushed = false;
      let formatPushed = false;

      const flushSystem = () => {
        if (pendingSystem.length) {
          messages.push({ role: 'system', content: pendingSystem.join('\n\n') });
          pendingSystem = [];
        }
      };

      for (const b of activePreset.blocks) {
        if (!b) continue;
        if (b.type === 'anchor') {
          flushSystem();
          messages.push(...buildHistoryMessages());
          historyPushed = true;
        } else if (b.type === 'system') {
          const title = String(b.title || '');
          if (title.includes('协议') || title.includes('Protocol') || title.includes('格式')) {
            pendingSystem.push(protocolFormatText);
            formatPushed = true;
          } else {
            pendingSystem.push(systemCoreText);
            corePushed = true;
          }
        } else if (b.type === 'custom') {
          if (b.enabled !== false && b.text && String(b.text).trim()) {
            pendingSystem.push(fillU(String(b.text).trim()));
          }
        }
      }

      // 确保核心必要模块均已到位
      if (!corePushed) {
        pendingSystem.unshift(systemCoreText);
      }
      if (!historyPushed) {
        flushSystem();
        messages.push(...buildHistoryMessages());
      }
      if (!formatPushed) {
        pendingSystem.push(protocolFormatText);
      }
      flushSystem();
    }

    // 可偷拍的照片只附在本次请求的最后一条用户消息里，不写进历史，避免模型以为用户又发了一遍
    if (Array.isArray(window.MESSAGES_STEAL_KEYS) && window.MESSAGES_STEAL_KEYS.length) {
      let idx = -1;
      for (let k = messages.length - 1; k >= 0; k--) { if (messages[k].role === 'user') { idx = k; break; } }
      if (idx >= 0) {
        const cur = messages[idx];
        const txt = typeof cur.content === 'string' ? cur.content : (((cur.content || []).find(x => x.type === 'text') || {}).text || '');
        messages[idx] = userMsgWithImages(txt + '\n\n（附图：以下是你之前见过的用户照片，不是本次新发的，仅用于朋友圈偷拍，序号对应朋友圈说明里的列表）', window.MESSAGES_STEAL_KEYS);
      }
    }

    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages }, 0.8)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const answer = Array.isArray(content) ? content.map(x => x.text || '').join('') : content;
    if (!answer || !String(answer).trim()) throw new Error('API 返回内容为空，请检查所选模型和接口兼容性');
    const parts = parseMessages(answer, contact.name, limit);
    if (!parts.length) throw new Error('模型没有返回可用的消息，请重试');
    return parts;
  }
  /* 引用规则：我方引用前缀用 {{user}} / {{char}}，不写真名；AI 也可以引用聊天中的消息 */
  const QUOTE_RULE = [
    '【引用】',
    '消息前面带有「(引用{{user}}的消息「…」)」时，表示这条消息是在回应{{user}}说的那句话。{{user}}指用户，{{char}}指你自己。',
    '你也可以引用聊天中的消息：需要针对某一句具体的话回应时，在那条回复开头写 <quote who="user">被引用的原话</quote>，之后紧接正文。who="user" 表示引用{{user}}的消息，who="char" 表示引用你自己说过的话。引用原话必须和聊天记录里的一致。',
    '大多数消息不需要引用，只有确实要针对某句话回应时才引用。'
  ].join('\n');
  /* 朋友圈回复：判断这个联系人看到用户的朋友圈后，是否点赞、是否评论 */
  const MOMENT_RULE = [
    '【朋友圈回复】',
    '用户刚发了一条朋友圈，你看到了。请根据你的性格、与用户的关系和你的记忆，决定要不要点赞、要不要评论。',
    '不是每条都要点赞或评论；不愿意的时候就都不做。评论要像真人随手一句，简短口语化，不要客套话，不要解释自己。',
    '只输出一个 JSON 对象，不要输出任何其他文字、解释或代码块，格式固定为：{"like":true或false,"comment":"评论内容，没有评论就写空字符串"}'
  ].join('\n');
  /* 朋友圈相关请求带上图片：照片和截图的图片数据由 MESSAGES_PHOTO_GET 取出，最多 6 张 */
function postImageKeys(post) { return post ? [...(post.imgs || []), post.chatShotKey].filter(Boolean) : []; }
function userMsgWithImages(text, keys) {
    const urls = (keys || []).slice(0, 6).map(k => (typeof window.MESSAGES_PHOTO_GET === 'function' ? window.MESSAGES_PHOTO_GET(k) : '') || '').filter(Boolean);
    if (!urls.length) return { role: 'user', content: text };
    return { role: 'user', content: [{ type: 'text', text }, ...urls.map(url => ({ type: 'image_url', image_url: { url } }))] };
}

  async function momentReply(contact, post) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      MOMENT_RULE
    ].filter(Boolean).join('\n');
    const when = post && post.t ? new Date(post.t) : new Date();
    const user = `这是用户刚发的朋友圈（${when.getHours()}时${when.getMinutes()}分）：\n${String(post && post.text || '').trim() || '（只发了照片）'}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, userMsgWithImages(user, postImageKeys(post))] }, 0.8)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const raw = Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content || '');
    const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let o = null;
    try { o = JSON.parse(t); } catch (_) { const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) { try { o = JSON.parse(t.slice(a, b + 1)); } catch (_) {} } }
    if (!o || typeof o !== 'object') throw new Error('朋友圈回复没有解析出结果，请重试');
    return { like: o.like === true || o.like === 'true', comment: String(o.comment || '').trim().slice(0, 120) };
  }

  /* 朋友圈评论：角色自由发挥，可以接别人的评论，也可以回复评论区里的某个人；不使用任何符号 */
  async function momentWordReply(contact, post, recentMsgs, existing) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const userName = window.MESSAGES_USER_NAME || 'user';
    const ctx = (recentMsgs || []).map(m => `${m.me ? userName : contact.name}：${m.text}`).join('\n') || '（暂无聊天记录）';
    const cur = (existing || []).length ? existing.map(e => `${e.name}：${e.text}`).join('\n') : '（还没有人评论）';
    const whose = post && post.posterKind === 'me' ? '你自己' : (post && post.posterKind === 'other' ? `${post.posterName}` : '用户');
    const names = [...new Set((existing || []).map(e => e.name))].filter(n => n && n !== contact.name);
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      momentOptsBlock(contact),
      worldTiesBlock(contact),
      '【朋友圈评论】',
      '你是来评论的，不是发帖的人。你正在看一条朋友圈，像真人一样自然地说几句话。每次调用只决定这一位联系人是否评论一次；不要生成第二条评论，不要替其他联系人评论。',
      '你可以接着评论区里别人的话往下说，也可以直接回复评论区里的某个人，这时在 to 字段写上对方的名字，名字只能从可以回复的人里选；不需要回复就写空字符串。',
      '只有评论区里已经出现的人才能被回复；不要凭空回复未出现、未连线或不在可回复名单中的联系人。',
      '不要使用任何标点符号和表情符号，需要停顿或分开的地方用空格代替。',
      '评论区里已经出现的词和句式不要照搬，换自己的说法，也不要每条都用同样的开头。',
      '只输出一个 JSON 对象，不要输出其他文字，也不要使用代码块，格式固定为：{"like":true或false,"comment":"评论内容，不评论就写空字符串","to":"要回复的人的名字，没有就写空字符串"}'
    ].filter(Boolean).join('\n');
    const when = new Date();
    const user = `你们最近的聊天：\n${ctx}\n\n${whose}刚发的朋友圈（${when.getHours()}时${when.getMinutes()}分）：\n${String(post && post.text || '').trim() || '（只发了照片）'}\n\n评论区现在的内容：\n${cur}\n\n可以回复的人：${names.join('、') || '无'}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, userMsgWithImages(user, postImageKeys(post))] }, 0.8)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const raw = Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content || '');
    const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let o = null;
    try { o = JSON.parse(t); } catch (_) { const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) { try { o = JSON.parse(t.slice(a, b + 1)); } catch (_) {} } }
    if (!o || typeof o !== 'object') throw new Error('朋友圈调取没有解析出结果，请重试');
    const to = String(o.to || '').replace(/\s+/g, ' ').trim();
    return { like: o.like === true || o.like === 'true', comment: String(o.comment || '').trim(), to: to && to !== contact.name ? to : '' };
  }

  /* 一次性调取整条朋友圈评论区：一次请求决定所有可见联系人的点赞、评论和回复，避免按联系人重复消耗额度。 */
  async function momentBatchWordReply(post, actors, recentMap) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    const list = Array.isArray(actors) ? actors.filter(x => x && x.id && x.name) : [];
    const existing = (post && post.comments || []).map(e => `${e.name || ''}：${e.text || ''}`).join('；') || '无';
    const actorText = list.map(x => `- actorId=${x.id}｜姓名=${x.name}｜人设=${String(x.persona || '').slice(0, 120)}`).join('\n');
    const system = [ROLEPLAY_PROMPT, '【朋友圈评论区一次性调取】',
      '你要一次性替下面所有有权限看到这条朋友圈的联系人做决定。每个 actor 最多点赞一次、评论一次；不想互动就 like=false 且 comment 为空。绝对不要替未列出的联系人发言。',
      '只能回复评论区已经出现的人，to 必须填写已有评论者姓名，否则为空。不要使用标点或表情。',
      '只输出 JSON：{"items":[{"actorId":"联系人ID","like":true或false,"comment":"评论，没有就空","to":"已有评论者姓名，没有就空"}]}', actorText
    ].join('\n');
    const user = `朋友圈发布者：${post.posterName || post.author || '用户'}\n朋友圈内容：${String(post.text || '').trim() || '（照片）'}\n已有评论：${existing}\n最近聊天上下文：${JSON.stringify(recentMap || {})}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, userMsgWithImages(user, postImageKeys(post))] }, 0.8)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    let t = (Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content || '')).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) t = t.slice(a, b + 1);
    let o = null; try { o = JSON.parse(t); } catch (_) {}
    const allowed = new Set(list.map(x => String(x.id)));
    return (o && Array.isArray(o.items) ? o.items : []).map(x => ({ actorId: String(x.actorId || ''), like: x.like === true || x.like === 'true', comment: String(x.comment || '').trim().slice(0, 120), to: String(x.to || '').trim() })).filter(x => allowed.has(x.actorId));
  }

  /* 朋友圈评论被用户回复后，角色单独私聊回复用户：顺便发几条由角色决定，条数范围用聊天室设置 */
  async function momentDmReply(contact, post, userText, quoteText, recentMsgs, limits) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const userName = window.MESSAGES_USER_NAME || 'user';
    const ctx = (recentMsgs || []).map(m => `${m.me ? userName : contact.name}：${m.text}`).join('\n') || '（暂无聊天记录）';
    const lo = Math.max(1, (limits && limits.min) || 1), hi = Math.max(lo, (limits && limits.max) || 7);
    const countReq = lo === hi ? `${lo} 条独立消息气泡` : `${lo} 到 ${hi} 条独立消息气泡`;
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      '【朋友圈私聊】',
      `用户刚在朋友圈里回复了你的评论。要不要私聊他由你自己决定：想单独跟他说点什么就发，觉得在评论区说完就够了，就不发。不发是完全正常的选择，不需要为了回应而硬发。要发的话，texts 数组是${countReq}。`,
      '只输出一个 JSON 对象，不要输出其他文字，也不要使用代码块，格式固定为：{"send":true或false,"texts":["消息1","消息2"]}；不发就 send 为 false，texts 为空数组。'
    ].filter(Boolean).join('\n');
    const user = `你们最近的聊天：\n${ctx}\n\n朋友圈内容：${String(post && post.text || '').trim() || '（只发了照片）'}\n你在评论区说的话：${quoteText || ''}\n用户在评论区回复你：${userText}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, userMsgWithImages(user, postImageKeys(post))] }, 0.8)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const raw = Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content || '');
    const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let o = null;
    try { o = JSON.parse(t); } catch (_) { const x = t.indexOf('{'), y = t.lastIndexOf('}'); if (x >= 0 && y > x) { try { o = JSON.parse(t.slice(x, y + 1)); } catch (_) {} } }
    if (!o || typeof o !== 'object') return { send: false, texts: [] };
    const texts = (Array.isArray(o.texts) ? o.texts : []).map(x => String(x || '').trim()).filter(Boolean).slice(0, hi);
    return { send: (o.send === true || o.send === 'true') && texts.length > 0, texts };
  }

  /* 记忆总结：单次请求，返回模型原文 */
  async function complete(systemText, userText, imageKeys, explicitConfig) {
    const usingDedicated = !!(explicitConfig && explicitConfig.endpoint && explicitConfig.apiKey && explicitConfig.model);
    const c = usingDedicated ? explicitConfig : config();
    if (!c.endpoint || !c.apiKey || !c.model) throw new Error('请先在「设置 → API」保存接口配置');
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(usingDedicated ? { model: c.model, messages: [{ role: 'system', content: systemText }, userMsgWithImages(userText, imageKeys)], temperature: 0.4 } : withTuning({ model: c.model, messages: [{ role: 'system', content: systemText }, userMsgWithImages(userText, imageKeys)] }, 0.4)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('API 返回内容为空');
    return Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content);
  }

  /* 朋友圈也带上联系人勾选的防八股 / 防油腻等选项，和主聊天一致 */
  function momentOptsBlock(contact) {
    const getPT = k => (typeof window.getChatPromptText === 'function' ? window.getChatPromptText(k) : '');
    const T = {
      ai: '避免八股套话和模板化的客套句式，说话要具体、自然。',
      greasy: '语气自然不油腻，不用过度亲昵的称呼和暧昧措辞。',
      threat: getPT('threat'), fake: getPT('fake'), macho: getPT('macho')
    };
    const list = (contact.promptOpts || []).map(k => T[k]).filter(Boolean);
    return list.length ? ['【额外要求】'].concat(list).join('\n') : '';
  }

  /* 朋友圈自主发布：读取聊天记录，由角色自己决定要不要发；pct 只是倾向参考 */
  async function momentAutoPost(contact, recentMsgs, pct, win) {
    win = win || {};
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const userName = window.MESSAGES_USER_NAME || 'user';
    const viewers = Array.isArray(win.viewers) ? win.viewers.filter(v => v && v.name) : [];
    const lines = [
      '【朋友圈自主发布】',
      `你就是${contact.name || '你'}，这条朋友圈是你自己发的。发布之后，你仍然可以在自己的朋友圈里回复别人的评论，但不要用别人的名字写评论，也不要把自己写成另一个评论的人。`,
      '你可以自主决定是否对可见的旧朋友圈做点赞或评论；没有自然动机时就不要互动。不要为了完成任务强行发帖、点赞或评论。',
      win.decided ? `【本次必须发一条新朋友圈】（发帖概率 ${pct}%，已由系统抽中）。请根据你们最近的聊天写出内容，输出 post:true，不得拒绝。发新朋友圈的同时，仍可以按下面的要求在 interactions 里回复旧朋友圈。` : `【本次不发新朋友圈】（发帖概率 ${pct}%，系统未抽中）。输出 post:false，只可以按下面的要求在 interactions 里互动旧朋友圈。`,
      win.lastH == null ? '你还从没发过朋友圈。' : `距离你上次发朋友圈已过 ${Math.floor(win.lastH)} 小时。`,
      `这次发的概率约为 ${pct}%。刚发过的内容不要重复，也不要每次都用同样的句式。`,
      '朋友圈内容要像真人平时随手发的那样，简短自然，不解释，不使用任何符号。'
    ];
    lines.push('发新朋友圈时，你还可以把你们的聊天室截图发出来：在 JSON 里写 "chatShot":true，text 作为截图上方的配文；不截图写 false。若截图，另写 "shotN":截取最近几条（1 到 30，由你自己决定），"shotTitle":你给对方的备注（截图顶部显示的名字）。');
    if (win.allowPhoto) lines.push('发新朋友圈时可以配照片：photos 字段是照片描述的数组，每张照片一句话、约 ' + (Number(window.MESSAGES_PHOTO_WORDS) || 30) + ' 个字，像真人随手拍的（如“窗边的咖啡”）。你自己决定发几张，可以 0 张，最多 9 张；不配照片就写空数组 []。');
    const feed = Array.isArray(win.feed) ? win.feed : [];
    if (feed.length) {
      lines.push('【可回看的朋友圈】下面是你现在能看到的朋友圈。你可以自主决定是否与其中任意一条互动：可以不互动，也可以点赞或评论多条；评论数量、点赞数量都不设上限，只要符合角色性格和当下动机即可。每条互动的 postId 只能从下面列表选择。');
      lines.push(feed.map(p => `- postId=${p.id}｜发布者=${p.author}｜内容=${p.text || '（照片）'}｜已有评论=${p.comments || '无'}${p.commentItems && p.commentItems.length ? '｜评论明细=' + p.commentItems.map(cm => `${cm.name}：${cm.text}`).join('；') : ''}`).join('\n'));
      lines.push('你也可以在评论中艾特用户：使用固定标记 @[user]，不要把用户当前昵称写进标记；用户改名后仍按这个标记识别。');
      lines.push('【重要：旧朋友圈互动必须可执行】如果你决定评论已有朋友圈，必须把评论写进 interactions 数组，不能只在普通文字里说“我评论了”。postId 必须逐字复制下面 feed 中的 postId；不要改大小写、不要截断、不要写发布者名字代替 ID。每个旧朋友圈最多一条 interaction，但可以自由选择多条不同旧朋友圈。like=true 表示点赞，comment 写实际要显示的评论文字；只点赞时 comment 为空。即使不发新帖，post 也必须为 false，但 interactions 仍可有内容。只输出 JSON，不要解释、不要输出“我评论了”等额外文字。示例：{"post":false,"interactions":[{"postId":"m123","like":false,"comment":"今天也太有意思了","to":""}]}。');
    } else {
      lines.push('只输出 JSON，不要任何其他文字。发布时格式：{"post":true,"text":"朋友圈内容","photos":["每张照片的描述"]（不配照片写 []）}；不发时格式：{"post":false}');
    }
    if (viewers.length) {
      lines.push('发布后，下面这些人也会看到这条朋友圈。你可以替他们决定要不要评论：每人最多一条，很短，像真人随手回的一句；不想评论的人就不要写。评论人的名字只能用下面列出的。');
      lines.push('可能评论的人：\n' + viewers.map(v => `- ${v.name}${v.persona ? `（${String(v.persona).slice(0, 80)}）` : ''}`).join('\n'));
      lines.push('【可见范围】由你自己决定这条朋友圈给谁看：all 所有人都能看；some 只给你指定的人看（名字写在 visTo 里，只能从上面列表选）；self 只有你自己看；user 只给用户看。');
      lines.push('评论只能来自能看到这条朋友圈的人：vis 为 self 或 user 时 comments 必须为空数组；vis 为 some 时评论人只能是 visTo 里的人。');
      lines.push('只输出 JSON，不要任何其他文字。格式固定为：{"post":true或false,"text":"新朋友圈内容","photos":["每张照片的描述"]（不配照片写 []）,"vis":"all或some或self或user","visTo":["名字"],"comments":[{"name":"评论人名字","text":"评论内容"}],"interactions":[{"postId":"已有帖子ID","like":true或false,"comment":"评论内容，没有就空字符串","to":"已有评论者姓名，没有就空字符串"}]}。不发新帖时 post=false，但仍可通过 interactions 回复旧朋友圈；没有互动时 interactions 为空数组。');
    } else {
      lines.push('只输出 JSON，不要任何其他文字。格式固定为：{"post":true或false,"text":"新朋友圈内容","photos":["每张照片的描述"]（不配照片写 []）,"vis":"all或some或self或user","visTo":["名字"],"comments":[],"interactions":[{"postId":"已有帖子ID","like":true或false,"comment":"评论内容，没有就空字符串","to":"已有评论者姓名，没有就空字符串"}]}。');
    }
    if (win.stealable && win.stealable.length) {
      lines.push('【偷拍照片】下面是你能偷拍的照片（用户发过的朋友圈照片，或聊天里用户发来的照片），序号从 1 开始：\n' + win.stealable.map((d, i) => `${i + 1}. ${String(d).slice(0, 30)}（见附图${i + 1}）`).join('\n'));
      lines.push('如果你这次要发朋友圈（post:true），由你自己决定：想偷拍上面列表里的一张，就写 "steal":序号，photos 写那张照片的描述；想发自己拍的新照片，就写 "steal":0，photos 写新照片的描述。photos 里不要把列表里的照片当成新照片来写。');
    }
    const recent = Array.isArray(win.recentPosts) ? win.recentPosts.filter(Boolean).slice(0, 5) : [];
    if (recent.length) lines.push('你最近发过的朋友圈：\n' + recent.map(t => '- ' + String(t).slice(0, 60)).join('\n') + '\n这次换个说法，不要重复上面的词、句式和开头。');
    const sys = [ROLEPLAY_PROMPT, momentOptsBlock(contact), worldTiesBlock(contact), lines.join('\n')].filter(Boolean).join('\n\n');
    const persona = contact.persona ? `你的设定：${fillU(contact.persona)}` : '';
    const ctx = (recentMsgs || []).map(m => `${m.me ? userName : contact.name}：${String(m.text || '')}`).join('\n') || '（暂无聊天记录）';
    const imageKeys = [...(win.stealableKeys || []), ...feed.flatMap(p => p.imgKeys || [])];
    const raw = await complete([sys, persona].filter(Boolean).join('\n\n'), `你们最近的聊天：\n${ctx}`, imageKeys);
    let t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const x = t.indexOf('{'), y = t.lastIndexOf('}');
    if (x >= 0 && y > x) t = t.slice(x, y + 1);
    let o = null; try { o = JSON.parse(t); } catch (_) { throw new Error('朋友圈调取没有解析出结果，请重试'); }
    if (!o || (!o.post && !Array.isArray(o.interactions))) return null;
    const vis = ['all', 'some', 'self', 'user'].includes(o.vis) ? o.vis : 'all';
    const visTo = vis === 'some' ? (Array.isArray(o.visTo) ? o.visTo : []).map(n => String(n || '').trim()).filter(n => viewers.some(v => v.name === n)) : [];
    const canSee = name => vis === 'all' || (vis === 'some' && visTo.includes(name));
    const comments = (vis === 'self' || vis === 'user') ? [] : (Array.isArray(o.comments) ? o.comments : [])
      .map(c => ({ name: String((c && c.name) || '').trim(), text: String((c && c.text) || '').trim() }))
      .filter(c => c.name && c.text && viewers.some(v => v.name === c.name) && canSee(c.name));
    const interactions = Array.isArray(o.interactions) ? o.interactions.map(x => ({
      postId: String((x && x.postId) || '').trim(),
      like: x && (x.like === true || x.like === 'true'),
      comment: String((x && x.comment) || '').trim().slice(0, 120),
      to: String((x && x.to) || '').trim()
    })).filter(x => x.postId && (x.like || x.comment)) : [];
    // 兼容模型把单条旧朋友圈互动放在 interaction 字段，而不是 interactions 数组。
    if (!interactions.length && o.interaction && typeof o.interaction === 'object') {
      const x = o.interaction;
      const one = { postId: String(x.postId || '').trim(), like: x.like === true || x.like === 'true', comment: String(x.comment || '').trim().slice(0, 120), to: String(x.to || '').trim() };
      if (one.postId && (one.like || one.comment)) interactions.push(one);
    }
    const text = String(o.text || '').trim();
    const post = o.post === true || o.post === 'true';
    const rawPhotos = Array.isArray(o.photos) ? o.photos : (typeof o.photo === 'string' && o.photo.trim() ? [o.photo] : []);
    const photos = win.allowPhoto ? rawPhotos.map(x => String(x || '').trim().slice(0, 30)).filter(Boolean).slice(0, 9) : [];
    const chatShot = o.chatShot === true || o.chatShot === 'true';
    const stealIdx = (typeof o.steal === 'number' || /^\d+$/.test(String(o.steal == null ? '' : o.steal))) && Number(o.steal) >= 1 ? Math.floor(Number(o.steal)) : null;
    const steal = o.steal === true || o.steal === 'true' || stealIdx != null;
    return { post, text, photos, chatShot, steal, stealIdx, shotN: Number(o.shotN) || undefined, shotTitle: String(o.shotTitle || '').trim().slice(0, 20), comments, vis, visTo, interactions };
  }
  window.MessagesAPI = { config, isConfigured, replyFor, parseMessages, complete, momentReply, momentWordReply, momentBatchWordReply, momentDmReply, momentAutoPost };
})();
