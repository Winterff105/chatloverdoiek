/* Chérie Music · Whatever API 桥接
 * 将原版「一起听」的虚拟恋人机制接到小手机当前设置。
 * 不内置 API Key、不内置模型、不另存一份设置；主 App 负责提供 getSettings 或 callAI。
 * 没有真实 API 时明确提示，不伪装成 AI 回复。
 */
(function () {
  'use strict';

  const LS_KEYS = [
    'whatever_api_settings', 'whatever_ai_settings', 'whatever_settings',
    'whatever_api_config', 'whatever_api', 'apiSettings', 'apiConfig'
  ];
  let generation = 0;
  let history = [];
  let inFlight = Promise.resolve();
  let lastTrack = null;

  function hostWindow() {
    try { if (window.parent && window.parent !== window && window.parent.location.origin === location.origin) return window.parent; }
    catch (_) { /* 跨域不读取父窗口 */ }
    return window;
  }

  function readStoredSettings() {
    for (const key of LS_KEYS) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') return { value: parsed, source: 'localStorage:' + key };
        }
      } catch (_) { /* 忽略非 JSON 的历史键 */ }
    }
    return null;
  }

  function chooseConfig(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    if (Array.isArray(raw)) return raw.find(x => x && (x.active || x.selected || x.isDefault)) || raw[0];
    // 读取设置当前选中的配置；只读取当前选择，不将密钥复制到新的存储键。
    const list = raw.apiConfigs || raw.providers || raw.profiles || raw.configs;
    if (Array.isArray(list) && list.length) {
      const chosenId = raw.activeApiId || raw.currentApiId || raw.selectedApiId || raw.selectedProviderId;
      return list.find(x => x && (String(x.id || x.name) === String(chosenId))) ||
             list.find(x => x && (x.active || x.isActive || x.selected)) || list[0];
    }
    return raw.activeConfig || raw.currentConfig || raw.selectedConfig || raw.apiConfig || raw.aiConfig || raw.api || raw;
  }

  function normalizeConfig(raw) {
    const main = raw || {};
    const sel = chooseConfig(main) || {};
    const extra = sel.parameters || sel.generation || main.parameters || {};
    const pick = (...keys) => {
      for (const o of [sel, extra, main]) {
        for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
      }
      return undefined;
    };
    return {
      baseURL: pick('baseURL', 'baseUrl', 'apiBase', 'apiBaseUrl', 'apiUrl', 'apiEndpoint', 'endpoint', 'url'),
      apiKey: pick('apiKey', 'api_key', 'key', 'token', 'apikey'),
      model: pick('model', 'modelName', 'modelId', 'selectedModel'),
      temperature: pick('temperature', 'temp'),
      top_p: pick('top_p', 'topP'),
      max_tokens: pick('max_tokens', 'maxTokens', 'maxOutputTokens'),
      frequency_penalty: pick('frequency_penalty', 'frequencyPenalty'),
      presence_penalty: pick('presence_penalty', 'presencePenalty'),
      systemPrompt: pick('systemPrompt', 'system_prompt', 'persona', 'prompt'),
      headers: pick('headers', 'customHeaders'),
      stream: false
    };
  }

  async function getSettingsWithSource() {
    const parent = hostWindow();
    const bridge = parent.WhateverMusicApp || {};
    if (typeof bridge.getSettings === 'function') {
      const settings = await bridge.getSettings();
      if (settings) return { settings, source: '主 App 设置接口' };
    }
    const functionCandidates = ['getCurrentAPIConfig', 'getActiveAPIConfig', 'getApiSettings', 'getAPISettings', 'getAIConfig'];
    for (const key of functionCandidates) {
      try {
        if (typeof parent[key] === 'function') {
          const settings = await parent[key]();
          if (settings) return { settings, source: '主 App ' + key };
        }
      } catch (_) { /* 继续寻找 */ }
    }
    for (const name of ['AppSettings', 'SettingsManager', 'APISettings', 'AISettings']) {
      const obj = parent[name];
      if (!obj) continue;
      for (const method of ['getActiveAPI', 'getActiveApiConfig', 'getCurrentAPI', 'getAPISettings']) {
        try {
          if (typeof obj[method] === 'function') {
            const settings = await obj[method]();
            if (settings) return { settings, source: name + '.' + method };
          }
        } catch (_) { /* 继续 */ }
      }
    }
    const local = readStoredSettings();
    if (local) return { settings: local.value, source: local.source };
    return { settings: null, source: '未找到主 App 设置参数' };
  }

  function apiPath(base) {
    const url = String(base || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\//i.test(url) && !/^http:\/\/localhost(?::\d+)?/i.test(url) && !/^http:\/\/127\.0\.0\.1(?::\d+)?/i.test(url)) {
      throw new Error('设置中的 API 地址必须使用 HTTPS（或本地 localhost）');
    }
    if (/\/chat\/completions$/i.test(url)) return url;
    if (/\/v1$/i.test(url)) return url + '/chat/completions';
    // 若设置使用 OpenAI 兼容根地址，这里与配置保持同一个站点。
    return url + '/chat/completions';
  }

  function extractText(result) {
    if (typeof result === 'string') return result;
    if (typeof result?.output_text === 'string') return result.output_text;
    const content = result?.choices?.[0]?.message?.content ?? result?.message?.content ?? result?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(x => x.text || '').join('\n');
    return '';
  }

  async function requestAI(messages, opts = {}) {
    const host = hostWindow();
    const bridge = host.WhateverMusicApp || {};
    const { settings, source } = await getSettingsWithSource();
    const config = normalizeConfig(settings);
    // 优先继承主 App 设置里的系统提示词，保留音乐上下文。
    const preparedMessages = messages.map(m => ({ role: m.role, content: m.content }));
    if (config.systemPrompt) {
      if (preparedMessages[0]?.role === 'system') preparedMessages[0].content = String(config.systemPrompt) + '\n\n' + preparedMessages[0].content;
      else preparedMessages.unshift({ role: 'system', content: String(config.systemPrompt) });
    }
    // 如果主 App 已有统一的请求函数，应由其处理所有模型差异与 CORS。
    if (typeof bridge.callAI === 'function') {
      const output = await bridge.callAI({ messages: preparedMessages, settings, config, purpose: opts.purpose || 'music-chat', signal: opts.signal });
      const text = extractText(output).trim();
      if (!text) throw new Error('主 App API 没有返回文本');
      return text;
    }
    if (!config.baseURL || !config.model || !config.apiKey) {
      throw new Error(source === '未找到主 App 设置参数'
        ? '未读取到小手机设置中的 API，请在主 App 提供 getSettings() 桥接'
        : '当前设置缺少 API 地址、模型或密钥');
    }
    const payload = { model: config.model, messages: preparedMessages, stream: false };
    for (const key of ['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty']) {
      if (config[key] !== undefined) payload[key] = config[key];
    }
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey };
    if (config.headers && typeof config.headers === 'object' && !Array.isArray(config.headers)) {
      Object.assign(headers, config.headers);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(apiPath(config.baseURL), {
        method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal
      });
      if (!response.ok) throw new Error('音乐 AI 请求失败：HTTP ' + response.status);
      const data = await response.json();
      const text = extractText(data).trim();
      if (!text) throw new Error('音乐 AI 返回内容为空');
      return text;
    } finally { clearTimeout(timer); }
  }

  function errUI(err) {
    console.warn('[Chérie Music AI]', err?.message || err);
    if (typeof showToast === 'function') showToast(String(err?.message || err));
  }

  function baseMessages(extra) {
    const partner = window.ListenTogether?.partnerName() || '恋人';
    const track = lastTrack ? `正在听：《${lastTrack.title}》— ${lastTrack.artist || ''}` : '暂未播放歌曲';
    return [{ role: 'system', content:
      `你是音乐 App「一起听」里的${partner}，像真实恋人那样自然、亲切、有性格地交谈。` +
      `正在一起听歌。${track}。回复简短自然，不要冒充系统通知。` + (extra ? '\n' + extra : '') },
      ...history.slice(-18)];
  }

  async function respondChat(text, gen) {
    history.push({ role: 'user', content: text });
    const response = await requestAI(baseMessages(), { purpose: 'music-chat' });
    if (gen !== generation || !window.ListenTogether?.isActive()) return;
    history.push({ role: 'assistant', content: response });
    window.ListenTogether.receive(response.slice(0, 200));
  }

  async function respondPick(gen) {
    // 从原本 JS 的公共 API 获取真实曲目列表，不创建假的曲目。
    const songs = typeof currentTrackList !== 'undefined' ? currentTrackList : [];
    if (!songs.length) return;
    const options = songs.slice(0, 80).map(t => ({ id: String(t.id), title: t.title, artist: t.artist }));
    const messages = baseMessages(`现在请从以下曲目中挑选一首，必须只返回一行 JSON：{"id":"歌曲ID","reply":"对恋人说的一句选歌理由"}。不得编造 ID。\n${JSON.stringify(options)}`);
    messages.push({ role: 'user', content: '你来选下一首歌吧。' });
    const raw = await requestAI(messages, { purpose: 'music-pick' });
    if (gen !== generation || !window.ListenTogether?.isActive()) return;
    let found = null; let reply = '';
    try {
      const m = raw.match(/\{[\s\S]*?\}/);
      if (m) { const json = JSON.parse(m[0]); found = options.find(t => t.id === String(json.id)); reply = String(json.reply || ''); }
    } catch (_) { /* 严格验证而非随机补选 */ }
    if (!found) found = options.find(t => raw.includes(t.id) || raw.includes('《' + t.title + '》'));
    if (!found) throw new Error('恋人没有选出列表中的歌曲，请重试');
    window.ListenTogether.receive((reply || `我想听《${found.title}》～`).slice(0, 200));
    window.ListenTogether.partnerPick(found.id);
  }

  async function process(msg, gen) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'leave') { generation++; history = []; lastTrack = null; return; }
    if (msg.type === 'join') { generation++; history = []; lastTrack = null; return; }
    if (msg.type === 'track') {
      if (typeof currentTrackList !== 'undefined') lastTrack = currentTrackList.find(t => String(t.id) === String(msg.id)) || null;
      return;
    }
    if (msg.type === 'chat') await respondChat(String(msg.text || ''), gen);
    else if (msg.type === 'pick-request') await respondPick(gen);
  }

  function install() {
    if (!window.ListenTogether || typeof window.ListenTogether.setTransport !== 'function') {
      console.warn('[Chérie Music AI] 未找到 ListenTogether'); return;
    }
    window.ListenTogether.setTransport({
      send(msg) {
        if (msg?.type === 'leave' || msg?.type === 'join') { generation++; history = []; lastTrack = null; return; }
        const gen = generation;
        inFlight = inFlight.catch(() => {}).then(() => process(msg, gen)).catch(errUI);
      }
    });
    window.MusicApiBridge = {
      getStatus: async () => {
        const { settings, source } = await getSettingsWithSource();
        const c = normalizeConfig(settings);
        return { source, model: c.model || null, baseURL: c.baseURL || null, hasApiKey: !!c.apiKey,
          hasCustomCallAI: typeof hostWindow().WhateverMusicApp?.callAI === 'function' };
      },
      configure: (provider) => { hostWindow().WhateverMusicApp = Object.assign(hostWindow().WhateverMusicApp || {}, provider); }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
