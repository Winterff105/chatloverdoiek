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
            if (looksLikeModel && window.__activePullAbort && init && !init.signal) {
                init = Object.assign({}, init, { signal: window.__activePullAbort.signal });
            }
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
            #quickCruiseBall{position:fixed;z-index:99990;width:96px;height:96px;padding:12px;box-sizing:border-box;border:0;border-radius:0;overflow:visible;box-shadow:none;touch-action:none;cursor:grab;background:transparent;appearance:none;-webkit-appearance:none}
            #quickCruiseBall img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;filter:none}
            #quickCruiseBall.qc-glow-right::after,#quickCruiseBall.qc-glow-left::after{content:"";position:absolute;top:16%;bottom:16%;width:18px;border-radius:999px;pointer-events:none;filter:blur(5px);opacity:.72}
            #quickCruiseBall.qc-glow-right::after{display:none}
            #quickCruiseBall.qc-glow-left::after{left:-5px;background:radial-gradient(ellipse at left,rgba(255,255,255,.92) 0,rgba(255,255,255,.42) 38%,transparent 78%)}
            #quickCruisePresetPanel{position:fixed;z-index:2147483001;width:min(300px,calc(100vw - 20px));max-height:70vh;overflow:auto;padding:14px;color:#111;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.9);border-radius:20px;backdrop-filter:blur(20px);font:12px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
            .qcp-title{font-family:"Snell Roundhand","Segoe Script",cursive;font-size:23px;font-style:italic}.qcp-label{display:block;margin:8px 0 4px;font-size:10px;color:#555}.qcp-select,.qcp-input{width:100%;min-height:30px;border:1px solid rgba(0,0,0,.14);border-radius:9px;background:rgba(255,255,255,.65);padding:5px 8px;box-sizing:border-box}.qcp-row{display:flex;gap:6px;margin-top:8px}.qcp-btn{flex:1;border:0;border-radius:999px;padding:6px 8px;background:rgba(0,0,0,.1);font-size:11px;cursor:pointer}.qcp-btn.primary{background:#111;color:#fff}.qcp-hint{margin-top:8px;color:#666;font-size:10px}.qcp-dd{position:relative}.qcp-dd-btn{width:100%;min-height:30px;border:1px solid rgba(0,0,0,.14);border-radius:9px;background:rgba(255,255,255,.65);padding:5px 26px 5px 8px;box-sizing:border-box;text-align:left;font:inherit;color:#111;position:relative;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qcp-dd-btn::after{content:"";position:absolute;right:11px;top:50%;width:5px;height:5px;border-right:1.5px solid #111;border-bottom:1.5px solid #111;transform:translateY(-70%) rotate(45deg)}.qcp-dd-list{margin-top:4px;max-height:180px;overflow:auto;border-radius:10px;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.08);padding:4px}.qcp-dd-list[hidden]{display:none}.qcp-dd-item{padding:6px 8px;border-radius:7px;cursor:pointer;font-size:11px} .qcp-dd-item:hover{background:rgba(0,0,0,.06)}.qcp-dd-item.on{background:#111;color:#fff}.qcp-think-seg{display:flex;gap:5px;padding:3px;border-radius:999px;background:rgba(0,0,0,.06);border:1px solid rgba(0,0,0,.08);box-sizing:border-box}.qcp-think-btn{flex:1;border:0;border-radius:999px;padding:5px 0;background:transparent;color:#444;font-size:11px;font-weight:600;cursor:pointer;transition:all .18s ease;outline:none;-webkit-tap-highlight-color:transparent;text-align:center}.qcp-think-btn.on{background:#111;color:#fff;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.22)}
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
        if (state.pos) { ball.style.left = state.pos.x + 'px'; ball.style.top = state.pos.y + 'px'; ball.style.right = 'auto'; ball.style.bottom = 'auto'; } else { ball.style.right = '2px'; ball.style.bottom = '104px'; }
        render();
    }
    function unmount() { document.getElementById('quickCruiseBall')?.remove(); document.getElementById('quickCruisePanel')?.remove(); document.getElementById('quickCruisePresetPanel')?.remove(); state.open = false; state.presetOpen = false; }
    function placePresetPanel(ball, panel) {
        if (!ball || !panel) return;
        const r = ball.getBoundingClientRect();
        const w = Math.min(300, innerWidth - 20), gap = 8;
        const h = Math.min(panel.scrollHeight || 260, innerHeight - 20);
        // 水平：与悬浮球中心对齐，并限制在屏幕内
        let left = r.left + r.width / 2 - w / 2;
        left = Math.max(10, Math.min(innerWidth - w - 10, left));
        // 垂直：优先放在悬浮球正上方；上方放不下就放到下方
        let top = r.top - h - gap;
        if (top < 10) top = r.bottom + gap;
        top = Math.max(10, Math.min(innerHeight - h - 10, top));
        panel.style.width = w + 'px';
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }
    /* ---- 预设面板：只创建一次，之后只更新选项，不再整块重建（避免选择被重置） ---- */
    let qcpSel = { preset: 0, model: '', thinking: '' };
    let qcpModelCache = {};
    /* 预设只认设置页存的那一份（每次都从存储读，不缓存） */
    function qcpPresets() {
        try { return JSON.parse(localStorage.getItem('forever_settings_api_presets_v1') || '[]') || []; } catch (_) { return []; }
    }
    /* 按全局生效的 API 配置，把悬浮球面板的选择对齐（按名字匹配，不用索引） */
    function qcpSyncFromActive() {
        let act = null;
        try { act = JSON.parse(localStorage.getItem('whatever_settings_active_api_v1') || localStorage.getItem('forever_settings_active_api_v1') || 'null'); } catch (_) {}
        if (!act) return;
        const presets = qcpPresets();
        const idx = presets.findIndex(x => x.name === act.name);
        if (idx >= 0) {
            qcpSel.preset = idx;
            qcpSel.model = act.model || presets[idx].model || '';
            const th = act.thinking !== undefined ? act.thinking : presets[idx].thinking;
            qcpSel.thinking = ['low', 'medium', 'high'].includes(th) ? th : '';
        } else {
            qcpSel.thinking = ['low', 'medium', 'high'].includes(act.thinking) ? act.thinking : '';
        }
    }
    function qcpModelsFor(i, presets) {
        const x = presets[i] || {};
        const list = (qcpModelCache[i] || []).slice();
        if (x.model && !list.includes(x.model)) list.unshift(x.model);
        return list.length ? list : ['Current model'];
    }
    function qcpDdHtml(key) {
        return `<div class="qcp-dd"><button type="button" class="qcp-dd-btn" data-dd-btn="${key}"></button><div class="qcp-dd-list" data-dd-list="${key}" hidden></div></div>`;
    }
    function qcpApplyGlobal(presets, idx, useModel, useThinking, silent) {
        const x = presets[idx];
        if (!x) return;
        const finalModel = useModel || x.model || '';
        const finalThinking = ['low', 'medium', 'high'].includes(useThinking) ? useThinking : '';
        const payloadObj = {
            name: x.name,
            url: x.url,
            key: x.key,
            model: finalModel,
            temperature: (typeof x.temperature === 'number' && isFinite(x.temperature)) ? x.temperature : 0.8,
            thinking: finalThinking,
            updatedAt: Date.now()
        };
        const payload = JSON.stringify(payloadObj);
        try {
            localStorage.setItem('whatever_settings_active_api_v1', payload);
            localStorage.setItem('forever_settings_active_api_v1', payload);
        } catch (_) {}
        const list = qcpPresets();
        const at = list.findIndex(y => y.name === x.name);
        if (at >= 0) {
            if (finalModel) list[at].model = finalModel;
            list[at].thinking = finalThinking;
            try { localStorage.setItem('forever_settings_api_presets_v1', JSON.stringify(list)); } catch (_) {}
        }
        if (typeof window.syncThinkingSeg === 'function') window.syncThinkingSeg(finalThinking);
        const thInput = document.getElementById('settingsThinking');
        if (thInput) thInput.value = finalThinking;
        window.dispatchEvent(new Event('settings-api-changed'));
        if (!silent) toast('Global preset updated');
    }
    function qcpRefresh(p) {
        const presets = qcpPresets();
        if (qcpSel.preset >= presets.length || qcpSel.preset < 0) qcpSel.preset = 0;
        const curPreset = presets[qcpSel.preset] || {};
        const models = presets.length ? qcpModelsFor(qcpSel.preset, presets) : ['Current model'];
        if (!models.includes(qcpSel.model)) qcpSel.model = models[0];
        if (qcpSel.thinking === undefined) {
            qcpSel.thinking = ['low', 'medium', 'high'].includes(curPreset.thinking) ? curPreset.thinking : '';
        }
        const fill = (key, pairs, selected) => {
            const hit = pairs.find(pr => pr[0] === selected) || pairs[0];
            p.querySelector(`[data-dd-btn="${key}"]`).textContent = hit ? hit[1] : '—';
            p.querySelector(`[data-dd-list="${key}"]`).innerHTML = pairs.map(([v, label]) =>
                `<div class="qcp-dd-item${v === selected ? ' on' : ''}" data-dd-item="${key}" data-v="${esc(v)}">${esc(label)}</div>`).join('');
        };
        const presetPairs = presets.length ? presets.map((x, i) => [String(i), x.name || 'Untitled']) : [['-1', 'No presets']];
        fill('preset', presetPairs, String(qcpSel.preset));
        fill('model', models.map(m => [m, m]), qcpSel.model);
        p.querySelectorAll('[data-qcp-think]').forEach(b => {
            b.classList.toggle('on', (b.dataset.qcpThink || '') === (qcpSel.thinking || ''));
        });
    }
    function qcpBuild(ball) {
        let p = document.getElementById('quickCruisePresetPanel');
        if (p) return p;
        p = document.createElement('section'); p.id = 'quickCruisePresetPanel';
        p.innerHTML = `<div class="qcp-title">Preset Control</div>`
            + `<div class="qcp-label">API Preset</div>${qcpDdHtml('preset')}`
            + `<div class="qcp-label">Model</div>${qcpDdHtml('model')}`
            + `<div class="qcp-label">思考力度 · Thinking</div>`
            + `<div class="qcp-think-seg" id="qcpThinkSeg">`
            + `<button type="button" class="qcp-think-btn" data-qcp-think="">关</button>`
            + `<button type="button" class="qcp-think-btn" data-qcp-think="low">低</button>`
            + `<button type="button" class="qcp-think-btn" data-qcp-think="medium">中</button>`
            + `<button type="button" class="qcp-think-btn" data-qcp-think="high">高</button>`
            + `</div>`
            + `<div class="qcp-row"><button class="qcp-btn primary" id="qcpUse">Use Globally</button><button class="qcp-btn" id="qcpFetch">Fetch Models</button></div>`
            + `<div class="qcp-hint">Choose a preset, model, or thinking level here.</div>`;
        document.body.appendChild(p);
        p.addEventListener('click', async e => {
            const thBtn = e.target.closest('[data-qcp-think]');
            if (thBtn) {
                const val = thBtn.dataset.qcpThink || '';
                qcpSel.thinking = val;
                qcpRefresh(p);
                const presets = qcpPresets();
                if (presets[qcpSel.preset]) {
                    qcpApplyGlobal(presets, qcpSel.preset, qcpSel.model || presets[qcpSel.preset].model, val, true);
                } else if (typeof window.tuneThinkingPick === 'function') {
                    window.tuneThinkingPick(val);
                }
                return;
            }
            const btn = e.target.closest('[data-dd-btn]');
            if (btn) {
                const list = p.querySelector(`[data-dd-list="${btn.dataset.ddBtn}"]`);
                const willOpen = list.hidden;
                p.querySelectorAll('[data-dd-list]').forEach(l => l.hidden = true);
                list.hidden = !willOpen;
                return;
            }
            const item = e.target.closest('[data-dd-item]');
            if (item) {
                if (item.dataset.ddItem === 'preset') {
                    const i = +item.dataset.v;
                    if (i < 0) return;
                    qcpSel.preset = i; qcpSel.model = '';
                    const presets = qcpPresets();
                    const picked = presets[i] || {};
                    qcpSel.thinking = ['low', 'medium', 'high'].includes(picked.thinking) ? picked.thinking : '';
                } else {
                    qcpSel.model = item.dataset.v;
                }
                p.querySelectorAll('[data-dd-list]').forEach(l => l.hidden = true);
                qcpRefresh(p);
                return;
            }
            if (e.target.closest('#qcpUse')) {
                const presets = qcpPresets(); const x = presets[qcpSel.preset];
                if (!x) { toast('No presets'); return; }
                qcpApplyGlobal(presets, qcpSel.preset, qcpSel.model || x.model, qcpSel.thinking, false);
                return;
            }
            if (e.target.closest('#qcpFetch')) {
                const presets = qcpPresets(); const i = qcpSel.preset; const x = presets[i];
                if (!x) return;
                try {
                    const base = String(x.url || '').replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
                    const res = await fetch(base + '/models', { headers: { Authorization: 'Bearer ' + String(x.key || '') } });
                    const data = await res.json();
                    const ids = (Array.isArray(data.data) ? data.data : []).map(m => String(m.id || m)).filter(Boolean);
                    qcpModelCache[i] = ids;
                    qcpSel.model = ids[0] || qcpSel.model;
                    qcpRefresh(p);
                    toast('Models loaded');
                } catch (err) { toast('Model fetch failed'); }
            }
        });
        if (!window.__qcpFollowBound) {
            window.__qcpFollowBound = true;
            // 悬浮球被拖动时，预设面板跟着走（全局只绑定一次）
            const reflow = () => {
                const pp = document.getElementById('quickCruisePresetPanel'); const bb = document.getElementById('quickCruiseBall');
                if (pp && bb && state.presetOpen) placePresetPanel(bb, pp);
            };
            document.addEventListener('pointermove', reflow, true);
            window.addEventListener('resize', reflow);
        }
        return p;
    }
    window.addEventListener('settings-api-changed', () => {
        qcpSyncFromActive();
        const pp = document.getElementById('quickCruisePresetPanel'); if (pp) qcpRefresh(pp);
    });
    window.addEventListener('storage', e => {
        if (e.key === 'whatever_settings_active_api_v1' || e.key === 'forever_settings_api_presets_v1') window.dispatchEvent(new Event('settings-api-changed'));
    });
    function renderPresetPanel(ball) {
        let p = document.getElementById('quickCruisePresetPanel');
        if (!state.presetOpen) { if (p) p.remove(); return; }
        const isNew = !p;
        p = qcpBuild(ball);
        if (isNew) qcpSyncFromActive();
        qcpRefresh(p);
        placePresetPanel(ball, p);
    }

    /* 固定只放在悬浮球上方或下方，不再左右弹出 */
    function placePanel(ball, panel) {
        if (!ball || !panel) return;
        const r = ball.getBoundingClientRect();
        const gap = 8, pad = 10;
        const w = Math.min(300, innerWidth - pad * 2);
        const topSpace = r.top - gap - pad;
        const bottomSpace = innerHeight - r.bottom - gap - pad;
        const side = (topSpace >= 220 || topSpace >= bottomSpace) ? 'top' : 'bottom';
        const availH = Math.max(150, side === 'top' ? topSpace : bottomSpace);
        const maxH = Math.min(Math.round(innerHeight * 0.68), availH);

        panel.dataset.anchorSide = side;
        panel.style.width = w + 'px';
        panel.style.maxHeight = maxH + 'px';

        const actualH = Math.min(panel.offsetHeight || panel.scrollHeight || 220, maxH);
        let left = r.left + r.width / 2 - w / 2;
        left = Math.max(pad, Math.min(innerWidth - w - pad, left));

        let top = side === 'top' ? (r.top - actualH - gap) : (r.bottom + gap);
        top = Math.max(pad, Math.min(innerHeight - actualH - pad, top));

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }
    // ================= 长按悬浮球：云端时长监控与凭证兑换系统 =================
    const SUPABASE_URL = "https://tjgxfyblzgqwxwfwvfol.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ3hmeWJsemdxd3h3Znd2Zm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDQ0ODEsImV4cCI6MjEwODM4MDQ4MX0.BtNqx4DIoXQBCU7sPxlSonrfwY-rnrmxlfqQX8H7dLE";

    function getAuthedQQ() {
        try {
            const raw = localStorage.getItem('whatever_phone_auth');
            if (raw) {
                const o = JSON.parse(raw);
                return o && o.qq ? o.qq : null;
            }
        } catch(e) {}
        return null;
    }

    async function openDurationVaultModal() {
        const curQQ = getAuthedQQ();
        if (!curQQ) {
            toast('请先通过登录页认证 QQ');
            return;
        }

        // 移除旧弹窗
        document.getElementById('durationVaultModal')?.remove();

        const mask = document.createElement('div');
        mask.id = 'durationVaultModal';
        mask.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(4,4,6,0.58);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Plus Jakarta Sans",-apple-system,sans-serif;opacity:0;transition:opacity 0.28s cubic-bezier(0.16,1,0.3,1);';
        
        mask.innerHTML = `
            <style>
                @keyframes angelCardPop {
                    0% { transform: scale(0.93) translateY(6px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes angelWingFlutter {
                    0% { transform: translateY(0px) rotate(0deg); opacity: 0.65; }
                    50% { transform: translateY(-1.5px) rotate(1.2deg); opacity: 0.95; }
                    100% { transform: translateY(0px) rotate(0deg); opacity: 0.65; }
                }
                .angel-wing-left { animation: angelWingFlutter 4.8s ease-in-out infinite; transform-origin: right center; }
                .angel-wing-right { animation: angelWingFlutter 4.8s ease-in-out infinite reverse; transform-origin: left center; }
                .angel-code-input::placeholder { color: #5a5a68; }

                /* 圣所邮票锯齿齿孔边缘 */
                .stamp-edge-pod {
                    position: relative;
                    width: 100%;
                    max-width: 292px;
                    background: linear-gradient(170deg, rgba(24,24,30,0.96) 0%, rgba(12,12,16,0.98) 100%);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 20px;
                    padding: 18px 16px 14px;
                    color: #fff;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                    animation: angelCardPop 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
                    box-sizing: border-box;
                }
                .stamp-edge-pod::before {
                    content: "";
                    position: absolute;
                    inset: -5px;
                    border-radius: 22px;
                    background: radial-gradient(circle, transparent 3px, #000 3.5px);
                    background-size: 11px 11px;
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    padding: 5px;
                    opacity: 0.28;
                    pointer-events: none;
                }
            </style>
            <div class="stamp-edge-pod">
                
                <!-- 顶层圣洁天使微型羽翼勋章 + 关闭叉 -->
                <div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;padding:0 2px;">
                    <div style="display:inline-flex;align-items:center;gap:6px;">
                        <svg viewBox="0 0 54 18" style="width:40px;height:14px;overflow:visible;" fill="none">
                            <g class="angel-wing-left" stroke="rgba(255,255,255,0.75)" stroke-width="0.8" stroke-linecap="round">
                                <path d="M21 9 C15 3 7 4 2 9 C8 12 16 11 21 9 Z" fill="rgba(255,255,255,0.08)"/>
                                <path d="M18 9 C13 5 8 6 4 9"/>
                                <path d="M15 10 C11 8 7 9 5 11"/>
                            </g>
                            <circle cx="27" cy="9" r="2.2" fill="#ffffff" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
                            <circle cx="27" cy="9" r="5" stroke="rgba(255,255,255,0.25)" stroke-width="0.5" stroke-dasharray="1.5 2"/>
                            <g class="angel-wing-right" stroke="rgba(255,255,255,0.75)" stroke-width="0.8" stroke-linecap="round">
                                <path d="M33 9 C39 3 47 4 52 9 C46 12 38 11 33 9 Z" fill="rgba(255,255,255,0.08)"/>
                                <path d="M36 9 C41 5 46 6 50 9"/>
                                <path d="M39 10 C43 8 47 9 49 11"/>
                            </g>
                        </svg>
                        <span style="font-size:7.5px;font-weight:700;letter-spacing:1.8px;color:#e2e2ec;font-family:'Cinzel Decorative',serif;text-transform:uppercase;">ANGELIC ARCHIVE</span>
                    </div>
                    <button type="button" id="btnVaultClose" style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#a2a2b0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;line-height:1;transition:all 0.2s;">✕</button>
                </div>

                <!-- 纯白高定天使微晶中岛舱：纯白底质感、时分秒实时跳动 -->
                <div style="position:relative;z-index:2;background:#ffffff;border-radius:18px;padding:12px 14px 11px;display:flex;flex-direction:column;align-items:center;gap:3px;box-shadow:0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9);color:#111116;">
                    <div style="display:flex;align-items:center;gap:4px;font-size:7.5px;color:#787884;letter-spacing:0.8px;">
                        <span>SERAPH • QQ</span>
                        <span style="color:#000000;font-weight:700;font-variant-numeric:tabular-nums;">${curQQ}</span>
                    </div>

                    <!-- 时分秒大字阶排版 -->
                    <div style="display:flex;align-items:baseline;justify-content:center;gap:2px;margin:2px 0 3px;">
                        <span style="font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#09090b;line-height:1;font-variant-numeric:tabular-nums;font-family:'Plus Jakarta Sans',monospace;" id="vaultDurationHMS">--h --m --s</span>
                    </div>

                    <!-- 纯白舱体下的高定黑色纤细进度条 -->
                    <div style="width:100%;margin-top:2px;">
                        <div style="display:flex;justify-content:space-between;font-size:7.5px;color:#555562;margin-bottom:3px;letter-spacing:0.2px;">
                            <span id="vaultCycleRound" style="font-weight:600;">当前时长 (--/--m)</span>
                            <span id="vaultProgressPct" style="color:#000000;font-weight:800;">0%</span>
                        </div>
                        <div style="width:100%;height:3px;background:#e8e8ee;border-radius:999px;overflow:hidden;">
                            <div id="vaultProgressBar" style="width:0%;height:100%;background:#000000;border-radius:999px;transition:width 0.4s ease;"></div>
                        </div>
                    </div>
                </div>

                <!-- 纯白字阶提示：动态跟随后台目标时长，满额自动续时保活 -->
                <div style="position:relative;z-index:2;text-align:center;padding:1px 4px 2px;">
                    <div style="font-size:8px;color:#ffffff;line-height:1.4;letter-spacing:0.3px;font-weight:600;" id="vaultCycleRemark">
                        * 正在同步云端周时长目标...
                    </div>
                </div>

                <!-- 极窄胶囊凭证兑换栏 -->
                <div style="position:relative;z-index:2;display:flex;flex-direction:column;gap:4px;">
                    <div style="display:flex;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:999px;padding:2px 2px 2px 10px;">
                        <input type="text" id="vaultVoucherCode" class="angel-code-input" placeholder="输入投喂凭证码..." style="flex:1;background:transparent;border:none;outline:none;font-size:8.5px;color:#ffffff;font-family:inherit;letter-spacing:0.8px;text-transform:uppercase;">
                        <button type="button" id="btnVaultRedeem" style="height:24px;padding:0 11px;border-radius:999px;background:#ffffff;color:#09090b;border:none;font-size:8px;font-weight:700;letter-spacing:0.8px;cursor:pointer;box-shadow:0 2px 8px rgba(255,255,255,0.18);transition:transform 0.15s;white-space:nowrap;">REDEEM</button>
                    </div>
                    <div id="vaultVoucherMsg" style="font-size:7.5px;min-height:10px;line-height:1.2;text-align:center;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        requestAnimationFrame(() => mask.style.opacity = '1');

        let liveTickerTimer = null;
        let baseTotalSeconds = 0;
        let dynamicTargetMinutes = 60; // 默认 60，从云端动态覆盖

        // 关闭弹窗清除计时器
        function closeVault() {
            clearInterval(liveTickerTimer);
            mask.remove();
        }
        mask.querySelector('#btnVaultClose').onclick = closeVault;
        mask.onclick = (e) => { if (e.target === mask) closeVault(); };

        function formatHMS(totalSec) {
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            const pad = (n) => String(n).padStart(2, '0');
            return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
        }

        function updateUI(totalSec) {
            const hmsEl = document.getElementById('vaultDurationHMS');
            const progBar = document.getElementById('vaultProgressBar');
            const pctEl = document.getElementById('vaultProgressPct');
            const cycleEl = document.getElementById('vaultCycleRound');
            const remarkEl = document.getElementById('vaultCycleRemark');

            if (hmsEl) hmsEl.textContent = formatHMS(totalSec);

            const targetSec = dynamicTargetMinutes * 60;
            const currentCycleSec = totalSec % targetSec;
            const cycleRound = Math.floor(totalSec / targetSec) + 1;
            const pct = Math.min(100, Math.round((currentCycleSec / targetSec) * 100));

            if (progBar) progBar.style.width = (totalSec >= targetSec && currentCycleSec === 0 ? 100 : pct) + '%';
            if (pctEl) pctEl.textContent = (totalSec >= targetSec ? '已达标 · ' : '') + pct + '%';
            if (cycleEl) {
                const curM = Math.floor(currentCycleSec / 60);
                cycleEl.textContent = `第 ${cycleRound} 周期 (${curM}/${dynamicTargetMinutes}m)`;
            }

            if (remarkEl) {
                const checkIconSvg = `<svg viewBox="0 0 24 24" style="width:10px;height:10px;vertical-align:-1px;display:inline-block;stroke:#ffffff;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round;margin-right:2px;"><polyline points="20 6 9 17 4 12"/></svg>`;
                const hourglassSvg = `<svg viewBox="0 0 24 24" style="width:9px;height:9px;vertical-align:-1px;display:inline-block;stroke:rgba(255,255,255,0.7);stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;margin-right:2px;"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>`;

                if (totalSec >= targetSec) {
                    remarkEl.innerHTML = `${checkIconSvg}已达成 <span style="color:#ffffff;font-weight:700;">${Math.floor(totalSec / targetSec)}</span> 轮，自动续时保活中`;
                } else {
                    const remainSec = targetSec - currentCycleSec;
                    const rH = Math.floor(remainSec / 3600);
                    const rM = Math.floor((remainSec % 3600) / 60);
                    const rS = remainSec % 60;
                    const remainStr = (rH > 0 ? `${rH}小时` : '') + `${rM}分${rS}秒`;
                    remarkEl.innerHTML = `${hourglassSvg}还差 <span style="color:#ffffff;font-weight:700;">${remainStr}</span> 达到目标时长 (${dynamicTargetMinutes}m)`;
                }
            }
        }

        // 动态读取后台设置的最新周达标目标 + 真实时长
        async function fetchCloudData() {
            try {
                // 1. 同步后台最新自定义周目标时长
                const cfgRes = await fetch(`${SUPABASE_URL}/rest/v1/system_configs?key=eq.weekly_quota_minutes&select=value`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const cfgList = await cfgRes.json();
                if (cfgList && cfgList.length > 0) {
                    dynamicTargetMinutes = parseInt(cfgList[0].value, 10) || 60;
                }

                // 2. 读取当前 QQ 真实累计时长
                const res = await fetch(`${SUPABASE_URL}/rest/v1/member_durations?qq=eq.${curQQ}&select=*`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const list = await res.json();
                let durMinutes = 0;
                if (list && list.length > 0) durMinutes = list[0].duration || 0;

                baseTotalSeconds = durMinutes * 60;
                updateUI(baseTotalSeconds);

                // 启动跳秒实时递增
                clearInterval(liveTickerTimer);
                liveTickerTimer = setInterval(() => {
                    baseTotalSeconds++;
                    updateUI(baseTotalSeconds);
                }, 1000);
            } catch(e) {
                console.error(e);
            }
        }
        // 长按面板：已绑定浏览器数量 + 每台设备卡片（类型 / 登录 IP / 最后活跃）
        function deviceTypeOf(ua) {
            if (!ua) return '未知设备';
            if (/iPhone|iPad|iPod/.test(ua)) return 'iPhone';
            if (/Android/.test(ua)) return 'Android';
            if (/Windows|Macintosh|Linux/.test(ua)) return '电脑浏览器';
            return '其他设备';
        }
        function fmtActive(iso) {
            if (!iso) return '待更新';
            const d = new Date(iso);
            return isNaN(d) ? '待更新' : d.toLocaleString();
        }
        async function fetchBoundDevices() {
            try {
                const bar = document.getElementById('vaultProgressBar');
                if (!bar) return;
                let el = document.getElementById('vaultBoundDevices');
                if (!el) {
                    bar.parentElement.parentElement.insertAdjacentHTML('afterend',
                        '<div id="vaultBoundDevices" style="width:100%;margin-top:6px;"></div>');
                    el = document.getElementById('vaultBoundDevices');
                }
                el.innerHTML = '<div style="font-size:8px;color:#555562;">已绑定浏览器：读取中...</div>';
                const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_credentials?qq=eq.${curQQ}&select=bound_devices`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const list = await res.json();
                const devices = (list && list[0] && Array.isArray(list[0].bound_devices)) ? list[0].bound_devices : [];
                const myId = localStorage.getItem('whatever_device_fingerprint');
                const cards = devices.map(d => {
                    const isMe = d.id === myId;
                    return `<div style="background:#ffffff;border:1px solid #ececf2;border-radius:10px;padding:7px 9px;margin-top:5px;">
                        <div style="font-size:8px;font-weight:700;color:#000;">${deviceTypeOf(d.ua)}${isMe ? ' · 本机' : ''}</div>
                        <div style="font-size:7.5px;color:#555562;margin-top:3px;">登录 IP：${d.ip || '待更新'}</div>
                        <div style="font-size:7.5px;color:#555562;margin-top:1px;">最后活跃：${fmtActive(d.last_active)}</div>
                    </div>`;
                }).join('');
                el.innerHTML = `<div style="font-size:8px;color:#555562;">已绑定浏览器：${devices.length} / 2 台</div>${cards}`;
            } catch(e) {
                const el = document.getElementById('vaultBoundDevices');
                if (el) el.innerHTML = '<div style="font-size:8px;color:#555562;">已绑定浏览器：读取失败</div>';
            }
        }
        fetchBoundDevices();
        fetchCloudData();

        // 兑换凭证
        const btnRedeem = mask.querySelector('#btnVaultRedeem');
        const codeInput = mask.querySelector('#vaultVoucherCode');
        const msgEl = mask.querySelector('#vaultVoucherMsg');

        btnRedeem.onclick = async () => {
            const code = codeInput.value.trim().toUpperCase();
            if (!code) {
                msgEl.textContent = "请输入凭证码";
                msgEl.style.color = "#ff6b6b";
                return;
            }
            btnRedeem.disabled = true;
            btnRedeem.textContent = "...";
            try {
                // 1. 查询凭证
                const vRes = await fetch(`${SUPABASE_URL}/rest/v1/time_vouchers?code=eq.${code}&is_active=eq.true&select=*`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const vList = await vRes.json();
                if (!vList || vList.length === 0) {
                    msgEl.textContent = "凭证码无效或已过期";
                    msgEl.style.color = "#ff6b6b";
                    btnRedeem.disabled = false;
                    btnRedeem.textContent = "兑换";
                    return;
                }

                const voucher = vList[0];
                const claimed = voucher.claimed_by || [];
                if (claimed.includes(curQQ)) {
                    msgEl.textContent = "您已兑换过此凭证，不可重复领取";
                    msgEl.style.color = "#ff6b6b";
                    btnRedeem.disabled = false;
                    btnRedeem.textContent = "兑换";
                    return;
                }

                // 2. 加时长
                const mRes = await fetch(`${SUPABASE_URL}/rest/v1/member_durations?qq=eq.${curQQ}&select=duration`, {
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                });
                const mList = await mRes.json();
                const cur = (mList && mList.length > 0) ? (mList[0].duration || 0) : 0;
                const nextDur = cur + voucher.bonus_minutes;

                await fetch(`${SUPABASE_URL}/rest/v1/member_durations?qq=eq.${curQQ}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duration: nextDur, updated_at: new Date().toISOString() })
                });

                // 3. 标记领过
                claimed.push(curQQ);
                await fetch(`${SUPABASE_URL}/rest/v1/time_vouchers?code=eq.${code}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ claimed_by: claimed })
                });

                const sparkleSvg = `<svg viewBox="0 0 24 24" style="width:9px;height:9px;vertical-align:-1px;display:inline-block;fill:#ffffff;margin-right:3px;"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>`;
                msgEl.innerHTML = `${sparkleSvg}兑换成功！已为您增加 +${voucher.bonus_minutes} 分钟时长！`;
                msgEl.style.color = "#ffffff";
                codeInput.value = '';
                fetchCloudData();
            } catch(e) {
                msgEl.textContent = "兑换失败，请检查网络";
                msgEl.style.color = "#ff6b6b";
            } finally {
                btnRedeem.disabled = false;
                btnRedeem.textContent = "兑换";
            }
        };
    }

    function bindDrag(ball) {
        let down = null, moved = false;
        let longPressTimer = null;
        let isLongPressTriggered = false;

        ball.addEventListener('pointerdown', e => {
            down = { x: e.clientX, y: e.clientY };
            moved = false;
            isLongPressTriggered = false;
            delete ball.dataset.moved;
            ball.setPointerCapture?.(e.pointerId);

            // 500ms 长按识别：弹出云端时长监控与兑换面板
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (!moved) {
                    isLongPressTriggered = true;
                    if (navigator.vibrate) { try { navigator.vibrate(40); } catch(_) {} }
                    openDurationVaultModal();
                }
            }, 500);
        });

        ball.addEventListener('pointermove', e => {
            if (!down) return;
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (Math.hypot(dx, dy) < 8) return;
            moved = true;
            clearTimeout(longPressTimer); // 发生拖拽取消长按
            ball.dataset.moved = '1';
            ball.style.left = Math.max(4, Math.min(innerWidth - 100, e.clientX - 48)) + 'px';
            ball.style.top = Math.max(8, Math.min(innerHeight - 100, e.clientY - 48)) + 'px';
            ball.style.right = 'auto';
            ball.style.bottom = 'auto';
        });

        const end = () => {
            clearTimeout(longPressTimer);
            if (moved) {
                const r = ball.getBoundingClientRect();
                state.pos = { x: r.left, y: r.top };
                localStorage.setItem(POS_KEY, JSON.stringify(state.pos));
            }
            down = null;
        };

        ball.addEventListener('pointerup', end);
        ball.addEventListener('pointercancel', end);

        // 如果长按触发了，则阻止后续短按点击动作
        ball.addEventListener('click', e => {
            if (isLongPressTriggered) {
                e.preventDefault();
                e.stopImmediatePropagation();
                isLongPressTriggered = false;
            }
        }, true);

        ball.addEventListener('pointermove', () => {
            const p = document.getElementById('quickCruisePanel');
            if (state.open && p) requestAnimationFrame(() => placePanel(ball, p));
        });
        ball.addEventListener('pointerdown', () => {
            const p = document.getElementById('quickCruisePanel');
            if (state.open && p) p.classList.add('qc-dragging');
        });
        ball.addEventListener('pointerup', () => {
            const p = document.getElementById('quickCruisePanel');
            if (p) p.classList.remove('qc-dragging');
        });
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
