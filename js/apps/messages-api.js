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
- Avoid greasy, cringeworthy, or overly patronizing terms of endearment (e.g., "小丫头", "小姑娘", "小野猫"). Such expressions can make your character feel artificial, clichéd, or insincere.

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
    return { endpoint, model: String(c.model || '').trim(), apiKey: String(c.key || c.apiKey || '').trim(), systemPrompt: BASE_PROMPT };
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
    const mems = (contact.memories || []).slice().sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 12);
    const memBlock = mems.length ? ['【记忆（按优先级排序，越靠前越重要）】'].concat(mems.map(x =>
        `${x.label || ''} ${fillU(x.text)}`
        + (x.points && x.points.length ? '\n' + x.points.map(p => '- ' + fillU(p)).join('\n') : '')
        + (x.relation ? '\n关系与感情：' + fillU(x.relation) : '')
        + (x.keys && x.keys.length ? '\n关键词：' + x.keys.join('、') : ''))).join('\n') : '';
    const system = [
      c.systemPrompt,
      memBlock,
      contact.name ? `你的名字：${contact.name}` : '',
      contact.persona ? `联系人设定：${contact.persona}` : '',
      contact.sig ? `签名：${contact.sig}` : '',
      contact.speech ? `说话风格：${contact.speech}` : '',
      contact.backstory ? `背景经历：${contact.backstory}` : '',
      contact.relation ? `与你的关系：${contact.relation}` : '',
      instruction || ''
    ].filter(Boolean).join('\n');
    const messages = [{ role: 'system', content: system }];
    for (const m of (contact.msgs || []).slice(-memCount)) messages.push({ role: m.me ? 'user' : 'assistant', content: String(m.text || '') });
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify({ model: c.model, messages, temperature: 0.8 }) }); }
    catch (_) { throw new Error('连接 API 失败：请检查网络、接口地址和跨域（CORS）设置'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((data.error && data.error.message) || `API 请求失败 (${response.status})`);
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const answer = Array.isArray(content) ? content.map(x => x.text || '').join('') : content;
    if (!answer || !String(answer).trim()) throw new Error('API 返回内容为空，请检查所选模型和接口兼容性');
    const parts = parseMessages(answer, contact.name, limit);
    if (!parts.length) throw new Error('模型没有返回可用的消息，请重试');
    return parts;
  }
  /* 记忆总结：单次请求，返回模型原文 */
  async function complete(systemText, userText) {
    const c = config(); if (!isConfigured()) throw new Error('请先在「设置 → API」保存接口配置');
    let response;
    try { response = await fetch(c.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.apiKey }, body: JSON.stringify({ model: c.model, messages: [{ role: 'system', content: systemText }, { role: 'user', content: userText }], temperature: 0.4 }) }); }
    catch (_) { throw new Error('连接 API 失败：请检查网络、接口地址和跨域（CORS）设置'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((data.error && data.error.message) || `API 请求失败 (${response.status})`);
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('API 返回内容为空');
    return Array.isArray(content) ? content.map(x => x.text || '').join('') : String(content);
  }
  window.MessagesAPI = { config, isConfigured, replyFor, parseMessages, complete };
})();
