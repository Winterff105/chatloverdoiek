/* 快速巡航：LLM 调用观测悬浮球与联系人标签面板 */
(function () {
    const KEY = 'whatever_quick_cruise_enabled_v1';
    const POS_KEY = 'whatever_quick_cruise_position_v1';
    const IMG = 'assets/杂七杂八/悬浮球照片.png';
    const state = {
        enabled: localStorage.getItem(KEY) === '1',
        open: false,
        records: [],
        active: 'all',
        context: null,
        pos: null
    };
    try { state.pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (_) {}

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function toast(text) {
        if (typeof window.toast === 'function') window.toast(text);
        else console.info('[快速巡航]', text);
    }
    function nameOf(r) { return r.contactName || r.contactId || '未指定联系人'; }
    function setEnabled(on) {
        state.enabled = !!on;
        localStorage.setItem(KEY, state.enabled ? '1' : '0');
        const sw = document.getElementById('quickCruiseSwitch');
        if (sw) sw.classList.toggle('active', state.enabled);
        if (state.enabled) mount(); else unmount();
    }
    function toggleQuickCruise(el) { setEnabled(!state.enabled); if (el) el.classList.toggle('active', state.enabled); }
    window.toggleQuickCruise = toggleQuickCruise;
    window.setQuickCruiseEnabled = setEnabled;

    function currentContext() { return state.context || window.__cruiseCurrentContact || null; }
    function setContext(c) { state.context = c ? { id: String(c.id || ''), name: String(c.name || c.remark || '') } : null; }
    window.CruiseTrace = { setContext, currentContext, records: state.records };

    function installFetchProbe() {
        if (window.__quickCruiseFetchProbe) return;
        window.__quickCruiseFetchProbe = true;
        const rawFetch = window.fetch.bind(window);
        window.fetch = async function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const body = init && init.body;
            let parsed = null;
            try { parsed = typeof body === 'string' ? JSON.parse(body) : body; } catch (_) {}
            const looksLikeModel = /chat\/completions|responses/i.test(url) && parsed && (parsed.messages || parsed.input || parsed.model);
            if (!looksLikeModel || !state.enabled) return rawFetch(input, init);
            const ctx = currentContext() || {};
            const rec = { id: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), contactId: ctx.id || '', contactName: ctx.name || '', startedAt: Date.now(), seconds: null, status: '调取中', tokens: null, content: '', raw: '', model: parsed.model || '', request: parsed, response: null };
            state.records.unshift(rec); if (state.records.length > 120) state.records.length = 120;
            render();
            const started = performance.now();
            try {
                const response = await rawFetch(input, init);
                rec.seconds = (performance.now() - started) / 1000;
                rec.status = response.ok ? '完成' : `HTTP ${response.status}`;
                try {
                    const text = await response.clone().text();
                    rec.raw = text;
                    let data = null; try { data = JSON.parse(text); } catch (_) {}
                    rec.response = data;
                    const u = data && data.usage;
                    if (u) rec.tokens = { total: u.total_tokens ?? u.totalTokens ?? null, input: u.prompt_tokens ?? u.input_tokens ?? u.promptTokens ?? null, output: u.completion_tokens ?? u.output_tokens ?? u.completionTokens ?? null };
                    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                    rec.content = Array.isArray(content) ? content.map(x => x.text || '').join('') : (content || text);
                } catch (e) { rec.raw = String(e && e.message || e); rec.content = rec.raw; }
                render();
                return response;
            } catch (e) {
                rec.seconds = (performance.now() - started) / 1000;
                rec.status = '失败'; rec.content = String(e && e.message || e); rec.raw = rec.content;
                render(); throw e;
            }
        };
    }

    function ensureStyle() {
        if (document.getElementById('quickCruiseStyle')) return;
        const s = document.createElement('style'); s.id = 'quickCruiseStyle'; s.textContent = `
            #quickCruiseBall{position:fixed;z-index:99990;width:72px;height:72px;padding:0;border:0;border-radius:0;overflow:visible;box-shadow:none;touch-action:none;cursor:grab;background:transparent;appearance:none;-webkit-appearance:none}
            #quickCruiseBall img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;filter:none}
            #quickCruiseBall.qc-busy{animation:qcPulse 1.1s infinite}
            @keyframes qcPulse{50%{filter:drop-shadow(0 0 8px rgba(255,255,255,.45)) drop-shadow(0 8px 12px rgba(0,0,0,.28))}}
            #quickCruisePanel{position:fixed;z-index:2147483000;left:10px;right:10px;bottom:82px;max-height:72vh;background:rgba(20,20,24,.96);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.42);backdrop-filter:blur(22px);display:none;overflow:hidden;font:13px/1.45 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
            #quickCruisePanel.open{display:flex;flex-direction:column}
            .qc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px}.qc-title{font-weight:700}.qc-sub{font-size:10px;color:#aaa;margin-top:2px}.qc-close,.qc-copy{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:7px 10px}
            .qc-tabs{display:flex;gap:7px;overflow-x:auto;padding:0 12px 10px;scrollbar-width:none}.qc-tab{white-space:nowrap;border:0;background:rgba(255,255,255,.08);color:#bbb;border-radius:999px;padding:7px 11px}.qc-tab.on{background:#fff;color:#111}.qc-list{overflow:auto;padding:0 12px 16px}.qc-card{margin:8px 0;padding:11px;border-radius:15px;background:rgba(255,255,255,.08)}.qc-meta{display:flex;justify-content:space-between;gap:8px;color:#ddd;font-size:11px}.qc-meta b{color:#fff}.qc-stats{display:flex;gap:10px;flex-wrap:wrap;color:#aaa;font-size:11px;margin:6px 0}.qc-content{white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto;background:rgba(0,0,0,.2);border-radius:9px;padding:8px;font-size:12px;color:#eee}.qc-actions{text-align:right;margin-top:7px}.qc-empty{padding:32px 8px;text-align:center;color:#999}
        `; document.head.appendChild(s);
    }
    function mount() {
        ensureStyle(); installFetchProbe();
        let ball = document.getElementById('quickCruiseBall');
        if (!ball) { ball = document.createElement('button'); ball.id = 'quickCruiseBall'; ball.type = 'button'; ball.title = '快速巡航'; ball.innerHTML = `<img src="${IMG}" alt="快速巡航">`; document.body.appendChild(ball); bindDrag(ball); ball.addEventListener('pointerup', e => { if (ball.dataset.moved) { delete ball.dataset.moved; return; } state.open = !state.open; render(); }); }
        if (state.pos) { ball.style.left = state.pos.x + 'px'; ball.style.top = state.pos.y + 'px'; ball.style.right = 'auto'; ball.style.bottom = 'auto'; } else { ball.style.right = '14px'; ball.style.bottom = '116px'; }
        render();
    }
    function unmount() { document.getElementById('quickCruiseBall')?.remove(); document.getElementById('quickCruisePanel')?.remove(); state.open = false; }
    function bindDrag(ball) {
        let down = null, moved = false;
        ball.addEventListener('pointerdown', e => { down = {x:e.clientX,y:e.clientY}; moved = false; ball.setPointerCapture?.(e.pointerId); });
        ball.addEventListener('pointermove', e => { if (!down) return; const dx=e.clientX-down.x,dy=e.clientY-down.y; if(Math.hypot(dx,dy)<5)return; moved=true; ball.dataset.moved='1'; ball.style.left=Math.max(4,Math.min(innerWidth-76,e.clientX-36))+'px'; ball.style.top=Math.max(8,Math.min(innerHeight-76,e.clientY-36))+'px'; ball.style.right='auto'; ball.style.bottom='auto'; });
        const end = () => { if (moved) { const r=ball.getBoundingClientRect(); state.pos={x:r.left,y:r.top}; localStorage.setItem(POS_KEY,JSON.stringify(state.pos)); } down=null; };
        ball.addEventListener('pointerup',end); ball.addEventListener('pointercancel',end);
    }
    function render() {
        const ball = document.getElementById('quickCruiseBall'); if (ball) ball.classList.toggle('qc-busy', state.records.some(r=>r.status==='调取中'));
        let panel = document.getElementById('quickCruisePanel');
        if (!state.open) { if (panel) panel.remove(); return; }
        if (!panel) { panel=document.createElement('section'); panel.id='quickCruisePanel'; document.body.appendChild(panel); }
        panel.classList.add('open');
        const names = [...new Map(state.records.map(r=>[r.contactId || r.contactName || 'unknown', nameOf(r)])).entries()];
        const tabs = [['all','全部'], ...names.map(x=>[x[0],x[1]])];
        const list = state.records.filter(r=>state.active==='all' || (r.contactId||r.contactName||'unknown')===state.active);
        panel.innerHTML = `<div class="qc-head"><div><div class="qc-title">快速巡航</div><div class="qc-sub">每轮耗时 · 返回内容 · Token</div></div><button class="qc-close" type="button">关闭</button></div><div class="qc-tabs">${tabs.map(([k,n])=>`<button class="qc-tab ${state.active===k?'on':''}" data-qc-tab="${esc(k)}">${esc(n)}</button>`).join('')}</div><div class="qc-list">${list.length?list.map(card).join(''):'<div class="qc-empty">开启后会在这里记录每次模型调取</div>'}</div>`;
        panel.querySelector('.qc-close').onclick=()=>{state.open=false;render();};
        panel.querySelectorAll('[data-qc-tab]').forEach(b=>b.onclick=()=>{state.active=b.dataset.qcTab;render();});
        panel.querySelectorAll('[data-qc-copy]').forEach(b=>b.onclick=()=>{const r=state.records.find(x=>x.id===b.dataset.qcCopy); if(r) copy(r.content || r.raw);});
    }
    function card(r) { const t=r.tokens||{}; return `<article class="qc-card"><div class="qc-meta"><span><b>${esc(nameOf(r))}</b> · ${esc(r.model||'模型')}</span><span>${r.status==='调取中'?'调取中':(r.seconds==null?'—':r.seconds.toFixed(2)+' 秒')}</span></div><div class="qc-stats"><span>状态：${esc(r.status)}</span><span>总 TK：${t.total==null?'—':t.total}</span><span>输入：${t.input==null?'—':t.input}</span><span>输出：${t.output==null?'—':t.output}</span></div><div class="qc-content">${esc(r.content || r.raw || '等待返回…')}</div><div class="qc-actions"><button class="qc-copy" data-qc-copy="${esc(r.id)}">复制全部返回</button></div></article>`; }
    function copy(text) { if(navigator.clipboard?.writeText) navigator.clipboard.writeText(String(text)).then(()=>toast('已复制全部返回')).catch(()=>toast('复制失败')); else toast('当前浏览器不支持复制'); }
    window.addEventListener('DOMContentLoaded', () => { const sw=document.getElementById('quickCruiseSwitch'); if(sw) sw.classList.toggle('active',state.enabled); if(state.enabled) mount(); });
    if (state.enabled) mount();
})();
