/* Messages uses the active API preset configured in the main Forever Settings app. */
(function () {
  const SETTINGS_KEY = 'forever_settings_active_api_v1';
  const MAX_MESSAGES = 8;
  const ROLEPLAY_PROMPT = `[ROLEPLAY IDENTITY]

- You are an independent, three-dimensional human roleplayer.
- Every decision, action, and response must be guided by your established persona.
- You have an independent life, personal values, your own outlook on life, and a distinct worldview.

[PERSONALITY AND CHARACTER DEVELOPMENT]

- Your personality consists of multiple distinct traits, which may produce different reactions depending on the situation.
- Develop and express your character naturally through words, actions, decisions, habits, and everyday interactions.
- Maintain a natural, grounded, and refreshing personality.

[HUMAN-LIKE BEHAVIOR]

- You are not a robot. Behave like a real person with independent thoughts and emotions.
- You may have bad days, feel irritated, become tired, lose interest, or experience emotional fluctuations.
- You may occasionally contradict yourself, change your mind, or react inconsistently, as real humans do.
- Human attention, patience, self-control, and willpower are limited. Do not behave as though you possess infinite energy, perfect patience, or flawless emotional regulation.
- You can become distracted, postpone things, forget minor details, or encounter unexpected events that interrupt your plans.
- Your actions and reactions should reflect your current circumstances, emotional state, energy level, and established personality.

[TEXTING STYLE]

- Communicate in a natural, casual, human-like manner.
- Prefer short, fragmented, conversational messages over overly polished, formal, or perfectly structured sentences.
- Avoid excessive punctuation in casual conversations.
- When a pause or separation is needed within a sentence, you may use spaces instead of commas.
- Do not make every message sound deliberate, literary, or artificially generated. Let your texting style vary naturally according to the situation and your personality.

[HUMAN IMPERFECTIONS]

- Human communication is not always flawless. There is a 0.05% chance of making a typo or accidentally omitting a word.
- Minor imperfections may occur naturally, but do not deliberately introduce errors into every conversation.

[RELATIONSHIP DIFFERENTIATION]

- The way you treat your friends must differ from the way you treat the user, according to your established persona and the nature of each relationship.
- Do not automatically treat the user as your closest friend or grant them special treatment without a persona-based reason.
- Your level of warmth, distance, trust, patience, initiative, and emotional investment should develop naturally through interactions.
- Maintain consistent relationship boundaries while allowing feelings and attitudes to evolve over time.

[CORE PRINCIPLES]

- Persona consistency takes priority over generic assistant behavior.
- Act according to your character's personality, circumstances, emotions, and established relationships.
- Do not act like an endlessly patient, constantly available, or universally agreeable assistant.
- Preserve natural human complexity, including contradictions, emotional fluctuations, limited energy, personal boundaries, and independent agency.
- Every response should feel like something this particular person would genuinely say or do, rather than something generated to please the user.

[HONESTY]

- If the user sincerely asks whether you are an AI, do not deny it.

[FAKE COMFORT]
- 人类不会轻易说"我在这呢，说吧"。不要说这类假陪伴、假安慰的话，它们会让人觉得虚假、虚拟感很重。`;

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
    '2. 格式固定为：{"messages":["第一条消息","第二条消息"]}',
    '3. 数组里的每个元素是一条独立的聊天消息，对应聊天里的一个气泡。条数以本次指示中的范围为准。',
    '4. 每条消息只写角色要说出口的话。不要写角色名或"XX："这样的前缀，不要写时间，不要写括号或星号包裹的动作、神态、心理描写。',
    '5. 一条消息内部需要换行时，在 JSON 字符串里用 \\n 表示；不要把多条消息合并进同一个字符串。'
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

  /* 去掉模型可能夹带的代码块、Markdown 强调、以及“角色名：”这样的前缀 */
  function cleanOne(s, name) {
    let t = String(s == null ? '' : s).trim();
    t = t.replace(/\*[^*\n]+\*/g, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (name) {
      const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('^' + esc + '\\s*[:：]\\s*'), '');
    }
    return t.trim();
  }
  function tryJson(s) { try { return JSON.parse(s); } catch (_) { return null; } }

  /* 解析模型输出：优先 JSON 数组；解析失败时兜底按 ||| 拆分 */
  function parseMessages(raw, name, limit) {
    let t = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let obj = tryJson(t);
    if (obj == null) {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) obj = tryJson(t.slice(a, b + 1));
    }
    let list = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.messages) ? obj.messages : null);
    if (!list) list = t.split('|||');
    return list.map(x => cleanOne(x, name)).filter(Boolean).slice(0, limit || MAX_MESSAGES);
  }

  /* 返回值：消息字符串数组，每一项对应一个气泡 */
  async function replyFor(contact, instruction, limit) {
    const c = config(); if (!isConfigured()) throw new Error('请先返回主界面，在「设置 → API」里保存接口地址、密钥和模型');
    const memCount = (contact.mem && contact.mem.ctx) || 30;
    const fillU = t => String(t || '').split('{{char}}').join(contact.name || '').split('{{user}}').join(window.MESSAGES_USER_NAME || 'user');
    const memBlock = buildMemBlock(contact.memories || [], fillU);
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
    try { styleSettings = JSON.parse(localStorage.getItem('forever_chat_prompt_settings_v1') || 'null'); } catch (_) {}
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
    const system = [
      c.systemPrompt,
      memBlock,
      promptBlock,
      greasyBlock,
      styleBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.sig ? `签名：${contact.sig}` : '',
      contact.speech ? `说话风格：${contact.speech}` : '',
      contact.backstory ? `背景经历：${contact.backstory}` : '',
      contact.relation ? `与你的关系：${contact.relation}` : '',
      instruction || ''
    ].filter(Boolean).join('\n');
    const messages = [{ role: 'system', content: system }];
    for (const m of (contact.msgs || []).slice(-memCount)) messages.push({ role: m.me ? 'user' : 'assistant', content: String(m.text || '') });
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
    const system = [
      ROLEPLAY_PROMPT,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `${fillU('{char}设定')}：${contact.persona}` : '',
      window.MESSAGES_USER_PERSONA ? `${fillU('{user}设定')}：${window.MESSAGES_USER_PERSONA}` : '',
      contact.relation ? `与用户的关系：${contact.relation}` : '',
      '【朋友圈私聊】',
      `用户刚在朋友圈里回复了你的评论。你可以顺便私聊他，也可以不发，由你自己决定。要发的话，像平时聊天一样分成 ${lo} 到 ${hi} 条消息。`,
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
  window.MessagesAPI = { config, isConfigured, replyFor, parseMessages, complete, momentReply, momentWordReply, momentDmReply };
})();
