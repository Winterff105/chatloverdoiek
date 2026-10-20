/* 快速巡航：LLM 调用观测悬浮球与联系人标签面板 */
(function () {
    const KEY = 'whatever_quick_cruise_enabled_v1';
    const POS_KEY = 'whatever_quick_cruise_position_v1';
    const IMG = 'assets/杂七杂八/悬浮球照片.png';
    const state = {
        enabled: localStorage.getItem(KEY) === '1',
        open: false,
        presetOpen: false,
        glowSide: 0,
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
            #quickCruiseBall.qc-glow-right::after,#quickCruiseBall.qc-glow-left::after{content:"";position:absolute;top:16%;bottom:16%;width:18px;border-radius:999px;pointer-events:none;filter:blur(5px);opacity:.72}
            #quickCruiseBall.qc-glow-right::after{display:none}
            #quickCruiseBall.qc-glow-left::after{left:-5px;background:radial-gradient(ellipse at left,rgba(255,255,255,.92) 0,rgba(255,255,255,.42) 38%,transparent 78%)}
            #quickCruisePresetPanel{position:fixed;z-index:2147483001;width:min(300px,calc(100vw - 20px));max-height:70vh;overflow:auto;padding:14px;color:#111;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.9);border-radius:20px;backdrop-filter:blur(20px);font:12px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
            .qcp-title{font-family:"Snell Roundhand","Segoe Script",cursive;font-size:23px;font-style:italic}.qcp-label{display:block;margin:8px 0 4px;font-size:10px;color:#555}.qcp-select,.qcp-input{width:100%;min-height:30px;border:1px solid rgba(0,0,0,.14);border-radius:9px;background:rgba(255,255,255,.65);padding:5px 8px;box-sizing:border-box}.qcp-row{display:flex;gap:6px;margin-top:8px}.qcp-btn{flex:1;border:0;border-radius:999px;padding:6px 8px;background:rgba(0,0,0,.1);font-size:11px}.qcp-btn.primary{background:#111;color:#fff}.qcp-hint{margin-top:8px;color:#666;font-size:10px}
            #quickCruiseBall.qc-busy{animation:none}
            @keyframes qcPulse{50%{filter:none}}
            #quickCruisePanel{position:fixed;z-index:2147483000;width:min(300px,calc(100vw - 20px));max-height:72vh;background:rgba(20,20,24,.96);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.42);backdrop-filter:blur(22px);display:none;overflow:hidden;font:13px/1.45 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
            #quickCruisePanel.open{display:flex;flex-direction:column;min-width:0;box-sizing:border-box}
            .qc-head{display:flex;flex:0 0 auto;min-width:0;align-items:center;justify-content:space-between;padding:12px 14px 8px}.qc-title{font-family:"Snell Roundhand","Segoe Script","Palace Script MT",cursive;font-size:24px;font-style:italic;letter-spacing:.4px;font-weight:600}.qc-sub{font-family:Georgia,serif;font-size:10px;font-style:italic;color:#aaa;margin-top:0}.qc-close,.qc-copy{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:4px 9px;font-size:11px;line-height:1.1}
            .qc-tabs{display:flex;flex:0 0 auto;align-items:center;gap:6px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:none;min-width:0}.qc-tabs::-webkit-scrollbar{display:none}.qc-tab{display:inline-flex;flex:0 0 auto;min-width:max-content;width:auto;white-space:nowrap;align-items:center;justify-content:center;border:0;background:rgba(255,255,255,.08);color:#bbb;border-radius:999px;padding:4px 9px;font-family:Georgia,serif;font-style:italic;font-size:11px;line-height:1.1}.qc-tab.on{background:#fff;color:#111}.qc-list{flex:1 1 auto;min-height:0;overflow:auto;padding:0 12px 14px}.qc-card{margin:7px 0;padding:10px;border-radius:15px;background:rgba(255,255,255,.08)}.qc-meta{display:flex;justify-content:space-between;gap:8px;color:#ddd;font-size:11px}.qc-meta b{color:#fff}.qc-stats{display:flex;gap:10px;flex-wrap:wrap;color:#aaa;font-size:11px;margin:6px 0}.qc-content{white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto;background:rgba(0,0,0,.2);border-radius:9px;padding:8px;font-size:12px;color:#eee}.qc-actions{text-align:right;margin-top:6px}.qc-empty{padding:32px 8px;text-align:center;color:#999}
        `; document.head.appendChild(s);
    }
    function mount() {
        ensureStyle(); installFetchProbe();
        let ball = document.getElementById('quickCruiseBall');
        if (!ball) { ball = document.createElement('button'); ball.id = 'quickCruiseBall'; ball.type = 'button'; ball.title = 'Quick Cruise'; ball.innerHTML = `<img src="${IMG}" alt="Quick Cruise">`; document.body.appendChild(ball); bindDrag(ball); ball.addEventListener('click', e => { e.preventDefault(); if (ball.dataset.moved) { delete ball.dataset.moved; return; } if (!state.glowSide || state.glowSide === 2) { state.glowSide = 1; state.presetOpen = true; state.open = false; } else { state.glowSide = 2; state.presetOpen = false; state.open = true; } render(); }); }
        if (state.pos) { ball.style.left = state.pos.x + 'px'; ball.style.top = state.pos.y + 'px'; ball.style.right = 'auto'; ball.style.bottom = 'auto'; } else { ball.style.right = '14px'; ball.style.bottom = '116px'; }
        render();
    }
    function unmount() { document.getElementById('quickCruiseBall')?.remove(); document.getElementById('quickCruisePanel')?.remove(); document.getElementById('quickCruisePresetPanel')?.remove(); state.open = false; state.presetOpen = false; }
    function placePresetPanel(ball, panel) {
        if (!ball || !panel) return;
        const r = ball.getBoundingClientRect();
        const w = Math.min(300, innerWidth - 20), h = Math.min(panel.scrollHeight || 260, innerHeight - 20), gap = 12;
        let left = r.right + gap;
        if (left + w > innerWidth - 10) left = r.left - w - gap;
        let top = Math.max(10, Math.min(innerHeight - h - 10, r.top + r.height / 2 - h / 2));
        panel.style.width = w + 'px'; panel.style.left = Math.max(10, left) + 'px'; panel.style.top = top + 'px'; panel.style.right='auto'; panel.style.bottom='auto';
    }
    function renderPresetPanel(ball) {
        let p = document.getElementById('quickCruisePresetPanel');
        if (!state.presetOpen) { if (p) p.remove(); return; }
        if (!p) { p = document.createElement('section'); p.id = 'quickCruisePresetPanel'; document.body.appendChild(p); }
        const presets = (window.settingsApiPresets || []).length ? window.settingsApiPresets : (() => { try { return JSON.parse(localStorage.getItem('forever_settings_api_presets_v1') || '[]'); } catch (_) { return []; } })();
        p.innerHTML = `<div class="qcp-title">Preset Control</div><label class="qcp-label">API Preset</label><select class="qcp-select" id="qcpPreset">${presets.map((x,i)=>`<option value="${i}">${esc(x.name)}</option>`).join('') || '<option>No presets</option>'}</select><label class="qcp-label">Model</label><select class="qcp-select" id="qcpModel"><option>${esc((JSON.parse(localStorage.getItem('whatever_settings_active_api_v1')||'{}').model)||'Current model')}</option></select><div class="qcp-row"><button class="qcp-btn primary" id="qcpUse">Use Globally</button><button class="qcp-btn" id="qcpFetch">Fetch Models</button></div><div class="qcp-hint">Choose a preset or model here. The selected API becomes the global active configuration.</div>`;
        placePresetPanel(ball, p);
        p.querySelector('#qcpPreset').onchange = () => { const x = presets[+p.querySelector('#qcpPreset').value]; if (x) { p.querySelector('#qcpModel').innerHTML = `<option>${esc(x.model || 'Current model')}</option>`; } };
        p.querySelector('#qcpUse').onclick = () => { const i = +p.querySelector('#qcpPreset').value; const x = presets[i]; if (!x) return; localStorage.setItem('whatever_settings_active_api_v1', JSON.stringify({name:x.name,url:x.url,key:x.key,model:p.querySelector('#qcpModel').value || x.model,temperature:x.temperature,thinking:x.thinking,updatedAt:Date.now()})); toast('Global preset updated'); };
        p.querySelector('#qcpFetch').onclick = async () => { const x = presets[+p.querySelector('#qcpPreset').value]; if (!x) return; try { const base=String(x.url||'').replace(/\/+$/,'').replace(/\/chat\/completions$/i,''); const res=await fetch(base+'/models',{headers:{Authorization:'Bearer '+String(x.key||'')}}); const data=await res.json(); const ids=(Array.isArray(data.data)?data.data:[]).map(m=>String(m.id||m)).filter(Boolean); p.querySelector('#qcpModel').innerHTML=ids.map(id=>`<option>${esc(id)}</option>`).join('')||`<option>${esc(x.model||'Current model')}</option>`; toast('Models loaded'); } catch(e) { toast('Model fetch failed'); } };
        const follow = () => { if (state.presetOpen) placePresetPanel(ball, p); };
        ball.addEventListener('pointermove', follow);
    }

    function placePanel(ball, panel, reset = false) {
        if (!ball || !panel) return;
        const r = ball.getBoundingClientRect();
        const gap = 12, pad = 10;
        const ballW = Math.max(1, r.width), ballH = Math.max(1, r.height);
        let side = reset ? null : panel.dataset.anchorSide;
        let maxW = reset ? 0 : parseFloat(panel.dataset.panelWidth || '0');
        let maxH = reset ? 0 : parseFloat(panel.dataset.panelHeight || '0');
        if (!side || !maxW || !maxH) {
            const sideW = Math.min(300, innerWidth - pad * 2);
            const naturalH = Math.min(panel.scrollHeight || 260, innerHeight - pad * 2);
            const spaces = {
                right: { w: innerWidth - r.right - gap - pad, h: innerHeight - pad * 2 },
                left: { w: r.left - gap - pad, h: innerHeight - pad * 2 },
                bottom: { w: innerWidth - pad * 2, h: innerHeight - r.bottom - gap - pad },
                top: { w: innerWidth - pad * 2, h: r.top - gap - pad }
            };
            const fits = key => spaces[key].w >= Math.min(sideW, 220) && spaces[key].h >= Math.min(naturalH, 180);
            side = ['right', 'left', 'bottom', 'top'].find(fits) || Object.keys(spaces).sort((a, b) => (spaces[b].w * spaces[b].h) - (spaces[a].w * spaces[a].h))[0];
            maxW = Math.max(160, Math.min(sideW, spaces[side].w));
            maxH = Math.max(120, Math.min(naturalH, spaces[side].h));
            panel.dataset.anchorSide = side;
            panel.dataset.panelWidth = String(maxW);
            panel.dataset.panelHeight = String(maxH);
            panel.style.width = maxW + 'px';
            panel.style.maxHeight = maxH + 'px';
        }
        let left, top;
        if (side === 'right') { left = r.right + gap; top = r.top + ballH / 2 - maxH / 2; }
        else if (side === 'left') { left = r.left - maxW - gap; top = r.top + ballH / 2 - maxH / 2; }
        else if (side === 'bottom') { left = r.left + ballW / 2 - maxW / 2; top = r.bottom + gap; }
        else { left = r.left + ballW / 2 - maxW / 2; top = r.top - maxH - gap; }
        left = Math.max(pad, Math.min(innerWidth - maxW - pad, left));
        top = Math.max(pad, Math.min(innerHeight - maxH - pad, top));
        panel.style.left = left + 'px'; panel.style.top = top + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
    }
    function bindDrag(ball) {
        let down = null, moved = false;
        ball.addEventListener('pointerdown', e => { down = {x:e.clientX,y:e.clientY}; moved = false; ball.setPointerCapture?.(e.pointerId); });
        ball.addEventListener('pointermove', e => { if (!down) return; const dx=e.clientX-down.x,dy=e.clientY-down.y; if(Math.hypot(dx,dy)<5)return; moved=true; ball.dataset.moved='1'; ball.style.left=Math.max(4,Math.min(innerWidth-76,e.clientX-36))+'px'; ball.style.top=Math.max(8,Math.min(innerHeight-76,e.clientY-36))+'px'; ball.style.right='auto'; ball.style.bottom='auto'; });
        const end = () => { if (moved) { const r=ball.getBoundingClientRect(); state.pos={x:r.left,y:r.top}; localStorage.setItem(POS_KEY,JSON.stringify(state.pos)); } down=null; };
        ball.addEventListener('pointerup',end); ball.addEventListener('pointercancel',end);
        ball.addEventListener('pointermove', () => { const p = document.getElementById('quickCruisePanel'); if (state.open && p) requestAnimationFrame(() => placePanel(ball, p)); });
        ball.addEventListener('pointerdown', () => { const p = document.getElementById('quickCruisePanel'); if (state.open && p) p.classList.add('qc-dragging'); });
        ball.addEventListener('pointerup', () => { const p = document.getElementById('quickCruisePanel'); if (p) p.classList.remove('qc-dragging'); });
    }
    function bindOutsideClose() {
        if (document.__qcOutsideBound) return;
        document.__qcOutsideBound = true;
        document.addEventListener('pointerdown', e => {
            const ball = document.getElementById('quickCruiseBall');
            const panel = document.getElementById('quickCruisePanel');
            const preset = document.getElementById('quickCruisePresetPanel');
            if (e.target === ball || e.target.closest?.('#quickCruiseBall') || e.target.closest?.('#quickCruisePanel') || e.target.closest?.('#quickCruisePresetPanel')) return;
            state.open = false; state.presetOpen = false;
            panel?.remove(); preset?.remove();
        }, true);
    }
    function render() {
        bindOutsideClose();
        const ball = document.getElementById('quickCruiseBall'); if (ball) { ball.classList.toggle('qc-busy', state.records.some(r=>r.status==='调取中')); ball.classList.toggle('qc-glow-right', state.glowSide === 1); ball.classList.toggle('qc-glow-left', state.glowSide === 2); }
        let panel = document.getElementById('quickCruisePanel');
        renderPresetPanel(ball);
        if (!state.open) { if (panel) panel.remove(); return; }
        if (!panel) { panel=document.createElement('section'); panel.id='quickCruisePanel'; document.body.appendChild(panel); }
        panel.classList.add('open');
        const ballForPanel = document.getElementById('quickCruiseBall');
        if (!panel.dataset.anchorSide) panel.dataset.anchorSide = '';

        const names = [...new Map(state.records.map(r=>[r.contactId || r.contactName || 'unknown', nameOf(r)])).entries()];
        const tabs = [['all','All'], ...names.map(x=>[x[0],x[1]])];
        const list = state.records.filter(r=>state.active==='all' || (r.contactId||r.contactName||'unknown')===state.active);
        panel.innerHTML = `<div class="qc-head"><div><div class="qc-title">Quick Cruise</div><div class="qc-sub">Latency · Response · Tokens</div></div><button class="qc-close" type="button">Close</button></div><div class="qc-tabs">${tabs.map(([k,n])=>`<button class="qc-tab ${state.active===k?'on':''}" data-qc-tab="${esc(k)}">${esc(n)}</button>`).join('')}</div><div class="qc-list">${list.length?list.map(card).join(''):'<div class="qc-empty">Model calls will appear here</div>'}</div>`;
        placePanel(ballForPanel, panel, !panel.dataset.panelWidth);
        panel.querySelector('.qc-close').onclick=()=>{state.open=false;render();};
        panel.querySelectorAll('[data-qc-tab]').forEach(b=>b.onclick=()=>{state.active=b.dataset.qcTab;render();});
        window.addEventListener('resize', () => { if (state.open) placePanel(ballForPanel, panel); }, { once: true });
        panel.querySelectorAll('[data-qc-copy]').forEach(b=>b.onclick=()=>{const r=state.records.find(x=>x.id===b.dataset.qcCopy); if(r) copy(r.content || r.raw);});
    }
    function card(r) { const t=r.tokens||{}; return `<article class="qc-card"><div class="qc-meta"><span><b>${esc(nameOf(r))}</b> · ${esc(r.model||'模型')}</span><span>${r.status==='调取中'?'调取中':(r.seconds==null?'—':r.seconds.toFixed(2)+' 秒')}</span></div><div class="qc-stats"><span>Status: ${esc(r.status)}</span><span>Total TK: ${t.total==null?'—':t.total}</span><span>Input: ${t.input==null?'—':t.input}</span><span>Output: ${t.output==null?'—':t.output}</span></div><div class="qc-content">${esc(r.content || r.raw || 'Waiting for response…')}</div><div class="qc-actions"><button class="qc-copy" data-qc-copy="${esc(r.id)}">Copy Full Response</button></div></article>`; }
    function copy(text) { if(navigator.clipboard?.writeText) navigator.clipboard.writeText(String(text)).then(()=>toast('Copied')).catch(()=>toast('Copy failed')); else toast('Clipboard unavailable'); }
    window.addEventListener('DOMContentLoaded', () => { const sw=document.getElementById('quickCruiseSwitch'); if(sw) sw.classList.toggle('active',state.enabled); if(state.enabled) mount(); });
    if (state.enabled) mount();
})();
