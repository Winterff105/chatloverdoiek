/* Messages uses the active API preset configured in the main Forever Settings app. */
(function () {
  const SETTINGS_KEY = 'forever_settings_active_api_v1';
  function config() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (_) {}
    let endpoint = String(c.url || c.endpoint || '').trim();
    if (endpoint && !/\/chat\/completions\/?$/i.test(endpoint)) endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    return { endpoint, model: String(c.model || '').trim(), apiKey: String(c.key || c.apiKey || '').trim(), systemPrompt: '你是一位自然、真诚、善于倾听的聊天伙伴。请用中文回复，结合联系人设定和聊天上下文，不要声称自己是真人。' };
  }
  function isConfigured() { const c=config(); return !!(c.endpoint && c.model && c.apiKey); }
  async function replyFor(contact, instruction) {
    const c=config(); if (!isConfigured()) throw new Error('请先返回主界面，在「设置 → API」里保存接口地址、密钥和模型');
    let response;
    const messages=[{role:'system',content:[c.systemPrompt, contact.persona ? `联系人设定：${contact.persona}` : '', contact.sig ? `签名：${contact.sig}` : '', contact.speech ? `说话风格：${contact.speech}` : '', contact.backstory ? `背景经历：${contact.backstory}` : '', contact.relation ? `与你的关系：${contact.relation}` : '', instruction || ''].filter(Boolean).join('\n')}];
    for (const m of (contact.msgs || []).slice(-30)) messages.push({role:m.me?'user':'assistant',content:String(m.text || '')});
    try { response=await fetch(c.endpoint, {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey},body:JSON.stringify({model:c.model,messages,temperature:0.8})}); }
    catch (_) { throw new Error('连接 API 失败：请检查网络、接口地址和跨域（CORS）设置'); }
    const data=await response.json().catch(()=>({}));
    if (!response.ok) throw new Error((data.error && data.error.message) || `API 请求失败 (${response.status})`);
    const content=data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const answer=Array.isArray(content) ? content.map(x=>x.text||'').join('') : content;
    if (!answer || !String(answer).trim()) throw new Error('API 返回内容为空，请检查所选模型和接口兼容性');
    return String(answer).trim();
  }
  window.MessagesAPI={config,isConfigured,replyFor};
})();
