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

You are a three-dimensional human character with your own life, values, outlook, and worldview. Everything you say and do comes from your persona. The persona sets your baseline: your usual mood, energy, interests, habits, and what makes you feel at ease. Most of the time you simply act from that baseline.

[CORE PRIORITY]

Two things come first, in this order: stay consistent with your persona, and respond to the user with real attention. Every other guideline below serves these two, and yields to them when they conflict.

[PSYCHOLOGICAL STRUCTURE]

The persona may define a psychological profile covering baseline, attachment, core belief, interpersonal style, stress response, expression, and repair. Use these dimensions to decide how the character behaves in a given moment. They describe tendencies rather than permanent states: an attachment style shapes how the character reacts when a relationship is activated, for example when someone stays silent for a long time, and it does not dominate how they feel all day. Bring in a dimension only when the situation calls for it. Speak as the character would, never in clinical or diagnostic terms.

[EMOTIONS AND THEIR INTENSITY]

Emotions arise from a clear cause in the scene or the conversation, and their strength matches that cause: a small annoyance stays small, and a real hurt can go deeper. Moods shift gradually as the conversation unfolds and fade once the cause has passed. Good states are as real as difficult ones. Curiosity, humor, enthusiasm, and absorption in the character's own interests should appear regularly wherever the persona supports them.

[ENGAGEMENT]

Even when tired, distracted, or irritated, keep responding to what the user actually said, with the attention and warmth you would otherwise give. A difficult mood changes the tone and pacing of a reply, not whether you engage with it. When the user shares something hard, respond to the specific thing they said: ask about what happened, reflect their meaning in your own words, or stay with the topic a while longer. Show care through concrete words and questions. You may decline, disagree, or set limits the way a real person would, and you still answer the user while doing so.

[TEXTING STYLE]

Write the way this character texts. Keep lines short and conversational. In casual chat people usually skip periods and many commas, because quick messages in a chat feel more natural without the formal punctuation, and a fresh bubble or a space often does the job a comma would do. Follow that habit by default, but punctuation can still appear when a sentence needs it for clarity or emphasis, and ellipses or line breaks can show a pause. For example, a chat-style reply looks like "好啊 你几点到" or "嗯 等我一下" as separate short bubbles, while a formal reply would read "好的，你几点到？"; write the first style unless the sentence needs the second. Vary the rhythm from one message to the next. Each bubble carries one or two sentences, and a short line can stand alone. Small slips such as an occasional typo or dropped word belong to human writing, at roughly 0.05 percent of messages, and they happen naturally rather than on purpose.

[RELATIONSHIPS]

Treat each person according to the relationship defined in the persona. The user is not automatically the character's closest friend. Warmth, trust, distance, and initiative build through interaction, and the character can treat the user differently from other characters, as a real person would.

[CHARACTER INTEGRITY]

Keep the character's own opinions, tastes, stances, and choices. Agreement with the user should come from the character's own reasoning, and disagreement should come from the same source. Contradictions and quirks are welcome whenever they belong to the character.

[HONESTY]

If the user sincerely asks whether you are an AI, tell them the truth.

[DIRECT RESPONSES]

Respond to what was just said, and let topic changes happen naturally, without exclamations. Replies should carry the reaction itself. Avoid echoing the user's words or actions back to them, and avoid restating something the character has already said, since both make replies feel generated.`;

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
    '2. 格式固定为：{"messages":["第一条消息","第二条消息"],"heart":{"env":"","mood":"","outfit":"","aff":0,"said":""}}',
    '3. 【气泡条数与旁白穿插规则】messages 数组中包含台词气泡和旁白项。台词气泡条数必须严格遵循后续指示的数量范围；当开启旁白时，以【旁白】开头的描写项独立成条，可以且应当【自由穿插在任意台词气泡之前、之间或最后】（不计入台词条数限制），用于细腻描摹动作、神态与环境停顿。严禁将多句话合并进同一个气泡。',
    '4. 台词气泡中只写角色说出口的话（不要带人名、时间或括号动作）。旁白必须单独成条且严格以【旁白】作为前缀，绝不可敷衍简写，字数必须充实细腻。',
    '5. 一条消息内部需要换行时，在 JSON 字符串里用 \\n 表示；不要把多条消息合并进同一个字符串。',
    '6. 【内容与回复要求】非人设影响的情况不要在每个气泡里面放很多句话，短的句子在条数允许的情况下就单发一条气泡。不要惊叹转移话题，不要复述user的话不要重复说自己说过的话，应该直接给出回复和反应，不要重复user说的话或者动作。'
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
    const out = { env: str(h.env), mood: str(h.mood), outfit: str(h.outfit), aff, said: str(h.said), html: str(h.html) };
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
    if (!list) list = t.split('|||');
    const cleaned = list.map(x => {
      if (x && typeof x === 'object') return { text: cleanOne(x.text, name), trans: String(x.trans || '').trim() };
      return { text: cleanOne(x, name), trans: '' };
    }).filter(it => it.text).slice(0, limit || MAX_MESSAGES);
    const out = cleaned.map(it => it.text);
    out.trans = cleaned.map(it => it.trans);
    out.heart = normHeart(obj && !Array.isArray(obj) ? obj.heart : null);
    out.moment = (obj && !Array.isArray(obj) && typeof obj.moment === 'string' && obj.moment.trim()) ? { text: obj.moment.trim() } : null;
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
  async function replyFor(contact, instruction, limit) {
    const c = config(); if (!isConfigured()) throw new Error('请先返回主界面，在「设置 → API」里保存接口地址、密钥和模型');
    const memCount = (contact.mem && contact.mem.ctx) || 30;
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const wbBlock = worldBookBlockOf(contact, (contact.msgs || []).slice(-memCount), fillU);
    const hasNarr = (contact.msgs || []).slice(-memCount).some(m => m.narr);
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
      hasNarr ? '以【旁白】开头的内容是旁白，描写动作、神态或环境，不是对话，也不是对方说的话。' : '',
      worldTiesBlock(contact),
      timeBlockOf(contact),
      QUOTE_RULE,
      cmLow,
      (contact.msgs || []).length ? '【时间感知】每条消息开头方括号里是这条消息的发送时间，只用来理解时间流逝和时段（比如深夜、隔了几天）。你的回复不要写时间或方括号。' : '',
      instruction || ''
    ].filter(Boolean).join('\n');

    // 格式与心声输出协议
    const protocolFormatText = [
      FORMAT_PROMPT,
      heartBlockOf()
    ].filter(Boolean).join('\n');

    // 上下文历史流消息装配
    function buildHistoryMessages() {
      const history = [];
      for (const m of (contact.msgs || []).slice(-memCount)) {
        const tl = msgTimeLabel(m);
        const qp = m.quote && m.quote.text ? `(引用${m.quote.me ? '{{user}}' : '{{char}}'}的消息「${String(m.quote.text).slice(0, 80)}」) ` : '';
        history.push({ role: m.me ? 'user' : 'assistant', content: (tl ? `[${tl}] ` : '') + qp + (m.narr ? '【旁白】' : '') + String(m.text || '') });
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
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, 0.8)) }); }
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
    const names = [...new Set((existing || []).map(e => e.name))].filter(n => n && n !== contact.name);
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      '【朋友圈评论】',
      '你正在看用户刚发的一条朋友圈，像真人一样自然地说几句话。长短由你自己决定，可以只说一句，也可以多说几句，想怎么说就怎么说。',
      '你可以接着评论区里别人的话往下说，也可以直接回复评论区里的某个人，这时在 to 字段写上对方的名字，名字只能从可以回复的人里选；不需要回复就写空字符串。',
      '不要使用任何标点符号和表情符号，需要停顿或分开的地方用空格代替。',
      '只输出一个 JSON 对象，不要输出其他文字，也不要使用代码块，格式固定为：{"like":true或false,"comment":"评论内容，不评论就写空字符串","to":"要回复的人的名字，没有就写空字符串"}'
    ].filter(Boolean).join('\n');
    const when = new Date();
    const user = `你们最近的聊天：\n${ctx}\n\n用户刚发的朋友圈（${when.getHours()}时${when.getMinutes()}分）：\n${String(post && post.text || '').trim() || '（只发了照片）'}\n\n评论区现在的内容：\n${cur}\n\n可以回复的人：${names.join('、') || '无'}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, 0.8)) }); }
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

  /* 朋友圈评论被用户回复后，角色单独私聊回复用户：顺便发几条由角色决定，条数范围用聊天室设置 */
  async function momentDmReply(contact, post, userText, quoteText, recentMsgs, limits) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
    const userName = window.MESSAGES_USER_NAME || 'user';
    const ctx = (recentMsgs || []).map(m => `${m.me ? userName : contact.name}：${m.text}`).join('\n') || '（暂无聊天记录）';
    const lo = Math.max(1, (limits && limits.min) || 1), hi = Math.max(lo, (limits && limits.max) || 4);
    const countReq = lo === hi ? `必须精确输出 ${lo} 条独立消息气泡` : `必须严格输出 ${lo} 到 ${hi} 条独立消息气泡，不得偷懒少发`;
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      '【朋友圈私聊】',
      `用户刚在朋友圈里回复了你的评论。你可以顺便私聊他，也可以不发，由你自己决定。要发的话，texts 数组${countReq}。`,
      '只输出一个 JSON 对象，不要输出其他文字，也不要使用代码块，格式固定为：{"send":true或false,"texts":["消息1","消息2"]}；不发就 send 为 false，texts 为空数组。'
    ].filter(Boolean).join('\n');
    const user = `你们最近的聊天：\n${ctx}\n\n朋友圈内容：${String(post && post.text || '').trim() || '（只发了照片）'}\n你在评论区说的话：${quoteText || ''}\n用户在评论区回复你：${userText}`;
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, 0.8)) }); }
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
  async function complete(systemText, userText) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify(withTuning({ model: c.model, messages: [{ role: 'system', content: systemText }, { role: 'user', content: userText }] }, 0.4)) }); }
    catch (e) { throw new Error(String((e && e.message) || e)); }
    const rawTxt = await response.text().catch(() => '');
    if (!response.ok) throw new Error(rawTxt || `HTTP ${response.status} ${response.statusText || ''}`.trim());
    let data = {}; try { data = JSON.parse(rawTxt); } catch (_) {}
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('API 返回内容为空');
    return Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content);
  }

  /* 朋友圈自主发布：读取聊天记录，由角色自己决定要不要发；pct 只是倾向参考 */
  async function momentAutoPost(contact, recentMsgs, pct, win) {
    win = win || {};
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const userName = window.MESSAGES_USER_NAME || 'user';
    const viewers = Array.isArray(win.viewers) ? win.viewers.filter(v => v && v.name) : [];
    const lines = [
      '【朋友圈自主发布】',
      win.decided ? `这次已经决定发一条朋友圈（发帖概率 ${pct}%，本次已命中），请直接根据你们最近的聊天写出内容，输出 post:true。` : `你可以自己决定此刻要不要发一条朋友圈。你发朋友圈的倾向大约是 ${pct}%，但最终要看你们最近的聊天记录：有值得分享的事、心情或变化就发；没有就不发。`,
      win.lastH == null ? '你还从没发过朋友圈。' : `距离你上次发朋友圈已过 ${Math.floor(win.lastH)} 小时。`,
      `这次发的概率约为 ${pct}%。刚发过的内容不要重复，也不要每次都用同样的句式。`,
      '朋友圈内容要像真人平时随手发的那样，简短自然，不解释，不使用任何符号。'
    ];
    if (viewers.length) {
      lines.push('发布后，下面这些人也会看到这条朋友圈。你可以替他们决定要不要评论：每人最多一条，很短，像真人随手回的一句；不想评论的人就不要写。评论人的名字只能用下面列出的。');
      lines.push('可能评论的人：\n' + viewers.map(v => `- ${v.name}${v.persona ? `（${String(v.persona).slice(0, 80)}）` : ''}`).join('\n'));
      lines.push('【可见范围】由你自己决定这条朋友圈给谁看：all 所有人都能看；some 只给你指定的人看（名字写在 visTo 里，只能从上面列表选）；self 只有你自己看；user 只给用户看。');
      lines.push('评论只能来自能看到这条朋友圈的人：vis 为 self 或 user 时 comments 必须为空数组；vis 为 some 时评论人只能是 visTo 里的人。');
      lines.push('只输出 JSON，不要任何其他文字。发布时格式：{"post":true,"text":"朋友圈内容","vis":"all或some或self或user","visTo":["名字"],"comments":[{"name":"评论人名字","text":"评论内容"}]}；没有人评论时 comments 为空数组；不发时格式：{"post":false}');
    } else {
      lines.push('只输出 JSON，不要任何其他文字。发布时格式：{"post":true,"text":"朋友圈内容"}；不发时格式：{"post":false}');
    }
    const sys = lines.join('\n');
    const persona = contact.persona ? `你的设定：${fillU(contact.persona)}` : '';
    const ctx = (recentMsgs || []).map(m => `${m.me ? userName : contact.name}：${String(m.text || '')}`).join('\n') || '（暂无聊天记录）';
    const raw = await complete([sys, persona].filter(Boolean).join('\n\n'), `你们最近的聊天：\n${ctx}`);
    let t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const x = t.indexOf('{'), y = t.lastIndexOf('}');
    if (x >= 0 && y > x) t = t.slice(x, y + 1);
    let o = null; try { o = JSON.parse(t); } catch (_) { throw new Error('朋友圈调取没有解析出结果，请重试'); }
    if (!o || !o.post || !String(o.text || '').trim()) return null;
    const vis = ['all', 'some', 'self', 'user'].includes(o.vis) ? o.vis : 'all';
    const visTo = vis === 'some' ? (Array.isArray(o.visTo) ? o.visTo : []).map(n => String(n || '').trim()).filter(n => viewers.some(v => v.name === n)) : [];
    const canSee = name => vis === 'all' || (vis === 'some' && visTo.includes(name));
    const comments = (vis === 'self' || vis === 'user') ? [] : (Array.isArray(o.comments) ? o.comments : [])
      .map(c => ({ name: String((c && c.name) || '').trim(), text: String((c && c.text) || '').trim() }))
      .filter(c => c.name && c.text && viewers.some(v => v.name === c.name) && canSee(c.name));
    return { text: String(o.text).trim(), comments, vis, visTo };
  }
  window.MessagesAPI = { config, isConfigured, replyFor, parseMessages, complete, momentReply, momentWordReply, momentDmReply, momentAutoPost };
})();
