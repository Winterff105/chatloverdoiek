/* Little Lace · Archangel 工作台（由 index.html 拆分而来）
   挂载：window.initArchangelApp(容器)；容器需要 class="archangel-app"，样式在 css/archangel.css。
   所有查询都限定在容器里，不使用 document 全局选择器。 */
(function () {
    /* AI 接口超时（毫秒）。非流式接口要等模型把整段回复生成完才返回，改文件时输出较长，需要留足时间。停止按钮仍可随时中断。 */
    const AI_TIMEOUT = 600000;

    /* 并发执行：最多 n 个同时进行 */
    async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const x=items[i++];await fn(x)}}))}
    /* 从需求里提取可用于代码搜索的关键词（英文标识符 + 中文片段） */
    function searchTerms(text){
        const STOP=new Set(['the','and','for','with','this','that','make','add','fix','change','file','code','please','page','button','function','want','need','update','modify']);
        const out=[];const push=w=>{w=String(w||'').trim();if(w.length>=2&&!STOP.has(w.toLowerCase())&&!out.includes(w))out.push(w)};
        const t=String(text||'');
        (t.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g)||[]).forEach(push);
        (t.match(/[\u4e00-\u9fa5]{2,6}/g)||[]).forEach(push);
        return out.slice(0,6);
    }
    /* 读取模型响应：流式（SSE）时边收边拼；若接口直接返回普通 JSON 则照常解析。统一返回 OpenAI 的 JSON 结构。 */
    async function readAiResponse(r){
        const ct=(r.headers&&r.headers.get&&r.headers.get('content-type'))||'';
        if(!ct.includes('event-stream'))return await r.json();
        const reader=r.body.getReader(), dec=new TextDecoder();
        /* 空闲超时：连续 AI_TIMEOUT 毫秒没有收到任何新数据就报错断开，避免无限等待。 */
        const withIdle=(p,rd)=>new Promise((res,rej)=>{
            const t=setTimeout(()=>{try{rd.cancel()}catch(e){}rej(new Error('AI 回复中断：超过 '+Math.round(AI_TIMEOUT/60000)+' 分钟没有新内容'))},AI_TIMEOUT);
            p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)});
        });

        let buf='', content='', reasoning='', usage=null;
        const handle=line=>{
            if(!line.startsWith('data:'))return;
            const data=line.slice(5).trim();
            if(!data||data==='[DONE]')return;
            let j;try{j=JSON.parse(data)}catch(e){return}
            if(j.usage)usage=j.usage;
            const dl=(j.choices&&j.choices[0]&&j.choices[0].delta)||{};
            if(typeof dl.content==='string')content+=dl.content;
            if(typeof dl.reasoning_content==='string')reasoning+=dl.reasoning_content;
        };
        for(;;){
            const {done,value}=await withIdle(reader.read(),reader);
            if(done)break;
            buf+=dec.decode(value,{stream:true});
            let i;while((i=buf.indexOf('\n'))>=0){handle(buf.slice(0,i).replace(/\r$/,''));buf=buf.slice(i+1)}
        }
        buf+=dec.decode();if(buf)handle(buf.replace(/\r$/,''));
        return {choices:[{message:{content,reasoning_content:reasoning}}],usage};
    }
    const ARCHANGEL_MARKUP = `
<div class="app">
  <div class="sidebar-backdrop closed" id="ar-sideBackdrop"></div>
  <header class="top">
    <button id="ar-menu" aria-label="侧边栏">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="ar-glassGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"></stop>
            <stop offset="100%" stop-color="#cbd3dd" stop-opacity="0.72"></stop>
          </linearGradient>
        </defs>
        <path d="M5 8.5C5 6.57 6.57 5 8.5 5h7C17.43 5 19 6.57 19 8.5S17.43 12 15.5 12h-7C6.57 12 5 10.43 5 8.5Z" fill="url(#ar-glassGradient)"></path>
        <path d="M5 15.5C5 13.57 6.57 12 8.5 12h7c1.93 0 3.5 1.57 3.5 3.5S17.43 19 15.5 19h-7C6.57 19 5 17.43 5 15.5Z" fill="none" stroke="#727c87" stroke-width="1.4"></path>
        <circle cx="8.7" cy="8.5" r="1.4" fill="#727c87"></circle>
        <circle cx="15.3" cy="15.5" r="1.4" fill="#727c87"></circle>
      </svg>
    </button>
    <button type="button" id="ar-set" aria-label="设置"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
            <div class="title">Welcome Archangel</div>
  </header>
  <main class="main collapsed" id="ar-main">
    <aside class="closed" id="ar-side"><div class="sin">
<h3>GitHub 仓库</h3>
<button type="button" class="tok-link" id="ar-tokHelp">怎么找 Token？</button>
<label><span>Token</span><input id="ar-gToken" type="password" autocomplete="off" placeholder="ghp_..."></label>

<label><span>Owner</span><input id="ar-gOwner" placeholder="仓库所有者"></label>
<label><span>Repository</span><input id="ar-gRepo" placeholder="仓库名称"></label>
<label><span>Branch</span><input id="ar-gBranch" placeholder="main"></label>
<div class="row"><button id="ar-gSave">保存</button><button id="ar-gTree">读取文件树</button></div>
<small id="ar-treeInfo">未读取文件树</small>
<h3>AI 接口</h3>
<div class="api-src" id="ar-apiSrc"><button type="button" data-src="inherit">继承设置 API</button><button type="button" data-src="own">单独设置 API</button></div>
<small id="ar-apiSrcInfo"></small>
<label><span>API Base URL</span><input id="ar-aBase" placeholder="https://api.openai.com/v1"></label>
<label><span>API Key</span><input id="ar-aKey" type="password" autocomplete="off" placeholder="sk-..."></label>
<label><span>模型</span><select id="ar-aModel"><option value="">请先获取模型</option></select></label>
<div class="row"><button id="ar-aFetch">获取模型</button><button id="ar-aSave">保存</button></div>
<details class="side-fold" id="ar-chatFold"><summary>对话<span class="fold-ic" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M6.5 8.5 10 12l3.5-3.5"/></svg></span></summary>
<button class="full" id="ar-newChat">新对话</button>
<div class="history-title">历史对话</div>
<div class="history-list" id="ar-historyList"></div>
</details></div></aside>
    <section id="ar-chat"><div class="hint">先在左侧填好 GitHub 和 AI 设置并读取文件树。发送需求（可连发），再点底栏“调取”开始处理。长按消息可重回、编辑或多选删除。</div></section>
  </main>
  <footer class="bottom"><span class="ar-grip" id="ar-grip" aria-label="控制台把手"></span><div class="ar-upp" id="ar-upp"><div class="ar-upp-in"><div class="ar-upp-head"><b id="ar-uppCount">0 个文件</b><span class="sp"></span><button type="button" id="ar-uppMulti">多选</button><button type="button" id="ar-uppDel" disabled>删除所选</button><button type="button" id="ar-uppClear">全部清空</button></div><div class="ar-upp-cards" id="ar-uppCards"></div></div></div><div class="comp">
    <input id="ar-prompt" type="text" placeholder="告诉 AI 你想修改什么…" />
    <div class="act"><button id="ar-send">发送</button><span></span><button id="ar-fetch">调取</button></div>
  </div></footer>
</div>
<div id="ar-selbar"><span id="ar-selcount">已选 0 条</span><div><button id="ar-seldel">删除</button><button id="ar-selcancel">取消</button></div></div>
<div class="lace-frame"></div>
<div id="ar-toast"></div>
<div class="ar-cgroup" id="ar-cgroup" hidden><button type="button" id="ar-console" class="ar-cbtn" aria-label="控制台"></button><button type="button" id="ar-upload" class="ar-cbtn" aria-label="上传文件"></button></div>
<input type="file" id="ar-file" multiple hidden accept="image/*,.zip,.txt,.md,.markdown,.js,.jsx,.ts,.tsx,.json,.html,.htm,.css,.py,.java,.c,.h,.cpp,.hpp,.go,.rs,.rb,.php,.sh,.xml,.yml,.yaml,.ini,.toml,.csv,.sql,.vue,.svg,.log">
<div class="ar-sheet ar-cons" id="ar-consoleSheet" hidden>
    <div class="ar-cons-card">
        <div class="ar-cons-top"><span class="ar-cons-led"></span><span class="ar-cons-title">CONSOLE // 对面输出</span><span class="ar-cons-count" id="ar-consCount"></span></div>
        <div class="ar-cons-rounds" id="ar-consRounds"></div>
        <div class="ar-cons-detail" id="ar-consDetail"></div>
        <div class="ar-foot"><button type="button" class="ar-close" id="ar-consClose">关闭</button></div>
    </div>
</div>
<div class="ar-sheet ar-tokguide" id="ar-tokGuide" hidden>
    <div class="ar-sheet-card">
        <div class="ar-sheet-title">怎么找 GitHub Token</div>
        <ol class="tok-steps">
            <li>打开 GitHub，点右上角头像，进入 <b>Settings</b>（设置）。</li>
            <li>左边最下面找到 <b>Developer settings</b>（开发者设置）。</li>
            <li>依次点 <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b>。</li>
            <li><b>Repository access</b> 选 <b>Only select repositories</b>，勾选你要改的那个仓库。</li>
            <li>在 <b>Repository permissions</b> 里找到 <b>Contents</b>，改成 <b>Read and write</b>。不开这一项就只能读，不能上传。</li>
            <li>点 <b>Generate token</b>，复制生成的 token（以 github_pat_ 开头），粘贴到这里。token 只显示一次，记得先存好。</li>
        </ol>
        <div class="tok-note">菜单名字可能随 GitHub 改版略有不同，大致路径就是这样。</div>
        <button type="button" class="ar-close" id="ar-tokGuideClose">知道了</button>
    </div>
</div>
<div class="ar-sheet" id="ar-sheet" hidden>
    <div class="ar-sheet-card">
        <div class="ar-sheet-title ar-script">Settings</div>
        <div class="ar-sec">短消息模式</div>
        <div class="ar-seg" id="ar-shortSeg">
            <button type="button" data-v="off">关</button>
            <button type="button" data-v="on">开</button>
        </div>
        <div class="ar-sec">小尾巴（只给我的气泡用）</div>
        <div class="ar-seg" id="ar-tailSeg">
            <button type="button" data-v="off">关</button>
            <button type="button" data-v="first">第一条</button>
            <button type="button" data-v="all">每一条</button>
        </div>
        <div class="ar-sec">头像（点击上传）</div>
        <div class="ar-avrow">
            <label class="ar-av" id="ar-avAi"><img id="ar-sheetAvAi" alt=""><span>对面</span><input type="file" accept="image/*" hidden></label>
            <div class="ar-meWrap"><label class="ar-av" id="ar-avMe"><img id="ar-sheetAvMe" alt=""><span>我</span><input type="file" accept="image/*" hidden></label><input id="ar-meName" class="ar-meName" maxlength="12" placeholder="我的名字" autocomplete="off"></div>
        </div>
        <div class="ar-foot">
            <button type="button" class="ar-exit" id="ar-exit">退出</button>
            <button type="button" class="ar-close" id="ar-sheetClose">关闭</button>
        </div>
    </div>
</div>
<div class="ar-sheet" id="ar-modeSheet" hidden>
    <div class="ar-sheet-card">
        <div class="ar-sheet-title ar-script">Angel Selection</div>
        <div class="ar-seg" id="ar-modeSeg">
            <button type="button" data-v="work">工作天使</button>
            <button type="button" data-v="healer">治疗天使</button>
            <button type="button" data-v="assist">辅助天使</button>
        </div>
        <div class="ar-stamp" id="ar-stamp">
            <div class="ar-stamp-label">提示词</div>
            <div class="ar-sec" id="ar-modeHint"></div>
            <textarea class="ar-mode-text" id="ar-modeText" rows="8"></textarea>
        </div>
        <div class="ar-foot">
            <button type="button" class="ar-save" id="ar-modeSave">保存</button>
            <button type="button" class="ar-close" id="ar-modeClose">关闭</button>
        </div>
    </div>
</div>
`;


    /* ---------------- 音效：进入时轻柔钢琴曲（音色更亮、音量减半）；点击时空灵铃音 ---------------- */
    let archAC = null;
    function archCtx(){
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
        archAC = archAC || new C(); if (archAC.state === 'suspended') archAC.resume(); return archAC;
    }
    function archReverb(ac, seconds, decay){
        const len = Math.floor(ac.sampleRate * seconds);
        const buf = ac.createBuffer(2, len, ac.sampleRate);
        for (let ch = 0; ch < 2; ch++){
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay);
        }
        const conv = ac.createConvolver(); conv.buffer = buf; return conv;
    }
    /* 钢琴音：高次泛音更强、衰减更慢 → 声音更亮、更尖 */
    function archPianoNote(ac, dest, t, freq, dur, peak){
        const partials = [[1,1.0,1.0],[2,0.75,0.8],[3,0.5,0.55],[4,0.3,0.4],[5,0.2,0.3],[6,0.1,0.2]];
        partials.forEach(([mult, amp, tau]) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = 'sine'; o.frequency.value = freq * mult;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(peak * amp, t + 0.006);
            g.gain.setTargetAtTime(0.0001, t + 0.006, tau * dur);
            o.connect(g); g.connect(dest);
            o.start(t); o.stop(t + dur + 0.2);
        });
    }
    /* 鸟叫：三到四声短促的啁啾，音高起伏 */
    function archBirdChirp(ac, dest, t, vol){
        const pitches = [2700, 2950, 2600, 3100];
        pitches.forEach((f0, i) => {
            const tt = t + i * 0.11;
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f0, tt);
            o.frequency.exponentialRampToValueAtTime(f0 * 1.35, tt + 0.05);
            o.frequency.exponentialRampToValueAtTime(f0 * 1.1, tt + 0.085);
            g.gain.setValueAtTime(0.0001, tt);
            g.gain.exponentialRampToValueAtTime(vol, tt + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09);
            o.connect(g); g.connect(dest);
            o.start(tt); o.stop(tt + 0.1);
        });
    }
    /* 钢琴曲：约 66 BPM 的旋律加左手和弦，混响较轻、尾音较短，穿插五次鸟叫 */
    function archPlayEnter(ac){
        const beat = 60 / 66, t0 = ac.currentTime + 0.05;
        const master = ac.createGain(); master.gain.value = 0.225;
        const rev = archReverb(ac, 2.4, 2.4); const wet = ac.createGain(); wet.gain.value = 0.22;
        master.connect(ac.destination); master.connect(rev); rev.connect(wet); wet.connect(ac.destination);
        const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99 };
        const melody = [
            ['E5',.5],['D5',.5],['C5',.5],['D5',.5],['E5',.5],['E5',.5],['E5',1],
            ['D5',.5],['D5',.5],['D5',1],
            ['E5',.5],['G5',.5],['G5',1],
            ['E5',.5],['D5',.5],['C5',.5],['D5',.5],['E5',.5],['E5',.5],['E5',.5],['E5',.5],
            ['D5',.5],['D5',.5],['E5',.5],['D5',.5],['C5',2]
        ];
        const bass = [130.81, 110.0, 87.31, 98.0];
        const chordLen = 4;
        const total = melody.reduce((s,[,b]) => s + b, 0);
        for (let b = 0; b < total; b += chordLen){
            const root = bass[(b / chordLen) % 4];
            const tt = t0 + b * beat;
            archPianoNote(ac, master, tt, root, chordLen * beat * 1.6, 0.030);
            archPianoNote(ac, master, tt, root * 2, chordLen * beat * 1.6, 0.012);
        }
        let t = t0;
        melody.forEach(([name, beats]) => {
            archPianoNote(ac, master, t, N[name], beats * beat * 1.3, 0.036);
            t += beats * beat;
        });
        [5, 9, 13, 17, 24].forEach(k => archBirdChirp(ac, master, t0 + k * beat, 0.02));
        return function stopEnter(){
            const now = ac.currentTime;
            try { master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(0, now, 0.06); } catch (_) {}
            setTimeout(() => { try { master.disconnect(); } catch (_) {} }, 500);
        };
    }
    /* 点击 A：空灵铃（高频铃音 + 八度泛音，长回声） */
    function archTapA(ac){
        const t0 = ac.currentTime + 0.01;
        const master = ac.createGain(); master.gain.value = 0.6;
        const delay = ac.createDelay(1.0); delay.delayTime.value = 0.28;
        const fb = ac.createGain(); fb.gain.value = 0.38;
        master.connect(ac.destination); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(ac.destination);
        [[1318.5, 0.030, 1.1], [1977.0, 0.012, 0.8]].forEach(([f, peak, dur]) => {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.connect(g); g.connect(master);
            o.start(t0); o.stop(t0 + dur + 0.05);
        });
    }
    /* 点击 B：泛音滑落（短回声） */
    function archTapB(ac){
        const t0 = ac.currentTime + 0.01;
        const master = ac.createGain(); master.gain.value = 0.5;
        const delay = ac.createDelay(1.0); delay.delayTime.value = 0.16;
        const fb = ac.createGain(); fb.gain.value = 0.25;
        master.connect(ac.destination); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(ac.destination);
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1760, t0);
        o.frequency.exponentialRampToValueAtTime(1174.7, t0 + 0.35);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + 0.5);
    }
    function archPlayTap(kind){ try { const ac = archCtx(); if (!ac) return; (kind === 'B' ? archTapB : archTapA)(ac); } catch (_) {} }
    const ARCH_ENTER_KEY = 'archangel_enter_music_played';
    let archEnterStop = null;
    function archStopEnterMusic(){ if (archEnterStop) { try { archEnterStop(); } catch (_) {} archEnterStop = null; } }
    function archPlayEnterSound(){
        try { if (sessionStorage.getItem(ARCH_ENTER_KEY)) return; sessionStorage.setItem(ARCH_ENTER_KEY, '1'); } catch (_) {}
        try { const ac = archCtx(); if (!ac) return; archEnterStop = archPlayEnter(ac); } catch (_) {}
    }
    function archBindSfx(host){
        if (host.__archSfx) return; host.__archSfx = true;
        let lastAt = 0;
        host.addEventListener('pointerdown', e => {
            const t = e.target;
            if (!t || !t.closest || t.closest('input, textarea, select')) return;
            const hit = t.closest('#ar-send, #ar-fetch, #ar-menu');   // 只有发送、调取与左上角菜单按钮有点击音
            if (!hit) return;
            const now = Date.now(); if (now - lastAt < 60) return; lastAt = now;
            archPlayTap(hit.id === 'ar-send' ? 'B' : 'A');   // 发送用泛音 B，调取与菜单用空灵铃 A
        }, true);
    }

    window.initArchangelApp = function (host) {
        host.innerHTML = ARCHANGEL_MARKUP;
        archBindSfx(host);
        archPlayEnterSound();
        const exitBtn = host.querySelector('#ar-exit');
        if (exitBtn) exitBtn.addEventListener('click', archStopEnterMusic);
        const exitWatch = new MutationObserver(() => { if (!host.isConnected) { archStopEnterMusic(); exitWatch.disconnect(); } });
        exitWatch.observe(document.body, { childList: true, subtree: true });

        const $=s=>host.querySelector(s), chat=$('#ar-chat'), input=$('#ar-prompt');
        const sleep=ms=>new Promise(r=>setTimeout(r,ms));

        const databaseState={
          database:null,
          ready:null
        };

        function openDatabase(){
          if(databaseState.ready){
            return databaseState.ready;
          }

          databaseState.ready=new Promise((resolve,reject)=>{
            const request=indexedDB.open('archangel-database',1);

            request.onupgradeneeded=()=>{
              const database=request.result;

              if(!database.objectStoreNames.contains('app')){
                database.createObjectStore('app');
              }

              if(!database.objectStoreNames.contains('conversations')){
                database.createObjectStore('conversations',{
                  keyPath:'id'
                });
              }
            };

            request.onsuccess=()=>{
              databaseState.database=request.result;
              resolve(databaseState.database);
            };

            request.onerror=()=>{
              reject(new Error('IndexedDB 初始化失败'));
            };
          });

          return databaseState.ready;
        }

        async function databaseGet(storeName,key){
          const database=await openDatabase();

          return new Promise((resolve,reject)=>{
            const transaction=database.transaction(storeName,'readonly');
            const request=transaction.objectStore(storeName).get(key);

            request.onsuccess=()=>{
              resolve(request.result);
            };

            request.onerror=()=>{
              reject(new Error('读取数据库失败'));
            };
          });
        }

        async function databasePut(storeName,value,key){
          const database=await openDatabase();

          return new Promise((resolve,reject)=>{
            const transaction=database.transaction(storeName,'readwrite');
            const request=key===undefined
              ? transaction.objectStore(storeName).put(value)
              : transaction.objectStore(storeName).put(value,key);

            request.onsuccess=()=>{
              resolve(value);
            };

            request.onerror=()=>{
              reject(new Error('写入数据库失败'));
            };
          });
        }

        async function databaseDelete(storeName,key){
          const database=await openDatabase();

          return new Promise((resolve,reject)=>{
            const transaction=database.transaction(storeName,'readwrite');
            const request=transaction.objectStore(storeName).delete(key);

            request.onsuccess=()=>{
              resolve();
            };

            request.onerror=()=>{
              reject(new Error('删除数据库记录失败'));
            };
          });
        }

        async function databaseGetAll(storeName){
          const database=await openDatabase();

          return new Promise((resolve,reject)=>{
            const transaction=database.transaction(storeName,'readonly');
            const request=transaction.objectStore(storeName).getAll();

            request.onsuccess=()=>{
              resolve(request.result||[]);
            };

            request.onerror=()=>{
              reject(new Error('读取数据库列表失败'));
            };
          });
        }
        const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
        const escA=s=>esc(s).replace(/"/g,'&quot;');
        const newMid=()=>`m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
        function ensureIds(conv){(conv.messages||[]).forEach(m=>{if(!m.id)m.id=newMid()});return conv}
        function msgById(id){return currentConversation?currentConversation.messages.find(m=>m.id===id):null}
        function bubbleText(b){return (b.innerText||b.textContent||'').trim()}
        function forgetRows(nodes){
          if(!currentConversation)return;
          const gone=new Set();
          nodes.forEach(n=>{
            if(n.dataset&&n.dataset.mid)gone.add(n.dataset.mid);
            if(n.querySelectorAll)n.querySelectorAll('[data-mid]').forEach(x=>gone.add(x.dataset.mid));
          });
          if(!gone.size)return;
          currentConversation.messages=currentConversation.messages.filter(m=>!gone.has(m.id));
          saveCurrentConversation();
        }
        function meName(){try{return (localStorage.getItem('archangel.me.name')||'').trim()||'我'}catch(e){return '我'}}
        function heartHTML(){return `<svg class="ar-heart" viewBox="0 0 24 24" aria-label="没有步骤">${IC[0]}</svg>`}
        function attachTextOf(a){
          if(a.type==='image')return `\n\n【图片：${a.name}】`;
          if(a.type==='zip')return `\n\n【压缩包：${a.name}，共 ${a.files.length} 个文件】`+a.files.map(f=>`\n\n【${a.name} 里的 ${f.name}】\n${f.content}`).join('');
          return `\n\n【附件：${a.name}】\n${a.content}`;
        }
        function histOf(m,withImages){
          if(m.role==='assistant')return {role:'assistant',content:m.text||''};
          let t=(m.role==='system'?'【系统提示】':'')+(m.text||'');
          const atts=m.attach||[];
          atts.forEach(a=>{if(a.type==='image'&&withImages)return;t+=attachTextOf(a)});
          const imgs=withImages?atts.filter(a=>a.type==='image'):[];
          if(!imgs.length)return {role:'user',content:t};
          return {role:'user',content:[{type:'text',text:t},...imgs.map(a=>({type:'image_url',image_url:{url:a.dataUrl}}))]};
        }
        function shrinkImage(file){
          return new Promise((resolve,reject)=>{
            const url=URL.createObjectURL(file);
            const img=new Image();
            img.onload=()=>{
              const k=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));
              const c=document.createElement('canvas');
              c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));
              c.getContext('2d').drawImage(img,0,0,c.width,c.height);
              URL.revokeObjectURL(url);
              resolve(c.toDataURL('image/jpeg',0.82));
            };
            img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('图片读取失败'))};
            img.src=url;
          });
        }
        function fileTreeHTML(files){
          const groups=new Map();
          (files||[]).forEach(f=>{
            if(f.folder){if(!groups.has(f.name))groups.set(f.name,[]);return}
            const i=f.name.lastIndexOf('/');
            const dir=i>=0?f.name.slice(0,i):'';
            const base=f.name.slice(i+1);
            if(!groups.has(dir))groups.set(dir,[]);
            groups.get(dir).push({base,size:String(f.content||'').length});
          });
          const fmt=n=>n<1024?n+' B':(n/1024).toFixed(1)+' KB';
          return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([dir,items])=>
            `<div class="fdir"><span class="fdir-tab"></span><button type="button" class="fdir-head" aria-expanded="false"><span class="fdir-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/></svg></span><span class="fdir-name"><b>${esc(dir||'（根目录）')}</b></span><span class="fdir-count">${items.length}</span><span class="fdir-chev" aria-hidden="true"></span></button><div class="fdir-body"><div><ul class="ffiles">${items.map(it=>`<li><span class="fdot"></span><span class="ffname">${esc(it.base)}</span><span class="ffsize">${fmt(it.size)}</span></li>`).join('')}</ul></div></div></div>`
          ).join('');
        }
        function fileCardHTML(mid,files,pack){
          const list=files||[];
          const names=list.slice(0,3).map(f=>esc(f.name)).join('、')+(list.length>3?` 等 ${list.length} 个`:'');
          const isZip=pack==='zip'||(pack!=='folder'&&!list.some(f=>f.name.includes('/')));
          if(isZip){
            return `<div class="fc-wrap"><div class="file-card" data-mid="${escA(mid)}" data-kind="zip"><span class="fc-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5z"/><path d="M11 4.5v2M11 8.5v2M11 12.5v2M10 16.5h2"/></svg></span><span class="fc-main"><b>下载 zip</b><small>${names}</small></span></div><div class="fc-tree">${fileTreeHTML(list)}</div></div>`;
          }
          return `<div class="fc-wrap"><div class="file-card" data-mid="${escA(mid)}" data-kind="folder"><span class="fc-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z"/></svg></span><span class="fc-main"><b>保存为文件夹</b><small>${names}</small></span><button type="button" class="fc-alt">逐个下载</button></div><div class="fc-tree">${fileTreeHTML(list)}</div></div>`;
        }
        const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
        function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
        function makeZip(files){
          const enc=new TextEncoder(),parts=[],central=[];let offset=0;
          const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
          files.forEach(f=>{
            const dirName=f.folder?f.name+'/':f.name;
            const name=enc.encode(dirName),data=enc.encode(f.folder?'':f.content),crc=crc32(data);
            const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
            parts.push(local,name,data);
            central.push({name,crc,size:data.length,offset});
            offset+=local.length+name.length+data.length;
          });
          const cdStart=offset;let cdSize=0;
          central.forEach(c=>{
            const rec=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c.crc),...u32(c.size),...u32(c.size),...u16(c.name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(c.offset)]);
            parts.push(rec,c.name);cdSize+=rec.length+c.name.length;
          });
          parts.push(new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(central.length),...u16(central.length),...u32(cdSize),...u32(cdStart),...u16(0)]));
          const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;
          parts.forEach(p=>{out.set(p,o);o+=p.length});
          return out;
        }
        function downloadZip(files){
          const url=URL.createObjectURL(new Blob([makeZip(files)],{type:'application/zip'}));
          const a=document.createElement('a');a.href=url;a.download=`archangel-files-${Date.now()}.zip`;
          document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),4000);
        }
        function changeCardHTML(f){
          const k=(f.lines||[]).filter(l=>l[0]=='+').length;
          return `<div class="fitem${f.uploaded?' ok':''}" data-path="${escA(f.path)}"><button type="button" class="card hc"><b>${esc(f.path)}</b><em>${esc(f.why||'')}</em><i>${f.uploaded?'已上传':k+' 行新增'}</i></button><div class="fdiff"><div><div class="diff">${(f.lines||[]).map(([t,x])=>`<div class="ln ${t=='-'?'del':t=='+'?'add':''}"><span>${t=='-'?'−':t=='+'?'+':''}</span><code>${esc(x)}</code></div>`).join('')}</div></div></div></div>`;
        }
        async function uploadChanges(ch,btn,mid){
          const g=G();
          btn.disabled=true;
          try{
            need(g);
            for(const f of ch){
              if(f.uploaded)continue;
              btn.textContent='上传中：'+f.path;
              const r=await req(cu(g,f.path),{method:'PUT',headers:gh(g,true),body:JSON.stringify({message:`Update ${f.path} from Archangel AI`,content:b64(f.edit),branch:g.branch,sha:f.sha})});
              if(!r.ok)throw new Error(`上传 ${f.path} 失败（${r.status}）：${await err(r)}。${ghHint(r.status)}`);
              const j=await r.json();f.sha=(j.content&&j.content.sha)||f.sha;f.uploaded=true;
              if(ST.files[f.path]){ST.files[f.path].sha=f.sha;ST.files[f.path].orig=f.edit}
              const card=[...host.querySelectorAll('.fitem')].find(x=>x.dataset.path===f.path);
              if(card){card.classList.add('ok');const i=card.querySelector('i');if(i)i.textContent='已上传'}
              const m=msgById(mid);
              if(m&&m.changes){const c=m.changes.find(x=>x.path===f.path);if(c){c.uploaded=true;c.sha=f.sha}saveCurrentConversation()}
            }
            btn.textContent='已全部上传';toast('已上传到 GitHub');
            recordSystem('已上传到 GitHub：'+ch.map(f=>f.path).join('、'));
          }catch(e){btn.disabled=false;btn.textContent='重试上传';toast(e.message);explainError('上传失败：'+e.message)}
        }
        async function readZip(buf){
          const u8=new Uint8Array(buf),dv=new DataView(buf);
          let eocd=-1;
          for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}}
          if(eocd<0)throw new Error('不是有效的 zip 文件');
          const count=dv.getUint16(eocd+10,true),cdOff=dv.getUint32(eocd+16,true);
          const dec=new TextDecoder('utf-8');
          const out=[];let p=cdOff;
          for(let n=0;n<count&&out.length<60;n++){
            if(dv.getUint32(p,true)!==0x02014b50)break;
            const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),usize=dv.getUint32(p+24,true);
            const nlen=dv.getUint16(p+28,true),xlen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
            const name=dec.decode(u8.subarray(p+46,p+46+nlen));
            p+=46+nlen+xlen+clen;
            if(name.endsWith('/')){if(out.length<60)out.push({name:name.replace(/\/+$/,'').replace(/\\/g,'/'),content:'',folder:true});continue}
            if(usize>200*1024)continue;
            const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true);
            const raw=u8.subarray(start,start+csize);
            let data;
            if(method===0)data=raw;
            else if(method===8){
              if(typeof DecompressionStream==='undefined')throw new Error('这个浏览器不支持解压');
              data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
            }else continue;
            if(data.includes(0))continue;
            out.push({name:name.replace(/\\/g,'/'),content:dec.decode(data)});
          }
          return out;
        }
        function cleanOutFile(f){
          const raw=String(f.name||'file.txt').replace(/\\/g,'/');
          const folder=f.type==='folder'||/\/$/.test(raw);
          const name=raw.replace(/^\/+/,'').split('/').filter(x=>x&&x!=='..').join('/')||(folder?'folder':'file.txt');
          return folder?{name,content:'',folder:true}:{name,content:String(f.content)};
        }
        function eachDownload(files){
          files.forEach(f=>{
            const url=URL.createObjectURL(new Blob([f.content],{type:'text/plain;charset=utf-8'}));
            const a=document.createElement('a');a.href=url;a.download=f.name.replace(/\//g,'_');
            document.body.appendChild(a);a.click();a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),4000);
          });
        }
        async function saveFolder(files){
          if(typeof window.showDirectoryPicker!=='function'){
            eachDownload(files);
            toast('这个浏览器不能直接保存文件夹（手机上通常也不行），已改为逐个下载');
            return;
          }
          try{
            const root=await window.showDirectoryPicker({mode:'readwrite'});
            for(const f of files){
              const parts=f.name.split('/').filter(Boolean),fname=parts.pop()||'file.txt';
              let dir=root;
              for(const p of parts)dir=await dir.getDirectoryHandle(p,{create:true});
              const fh=await dir.getFileHandle(fname,{create:true});
              const w=await fh.createWritable();await w.write(f.content);await w.close();
            }
            toast(`已保存 ${files.length} 个文件到文件夹`);
          }catch(e){if(e&&e.name==='AbortError')return;toast('保存文件夹失败：'+(e.message||e))}
        }
        function stepTag(t){return String(t||'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24)}
        function b64Bytes(b64){const bin=atob(b64);return Uint8Array.from(bin,c=>c.charCodeAt(0))}
        async function expandZips(list){
          const out=[];let zipRaw=null;
          for(const f of (list||[])){
            if(!/\.zip$/i.test(String(f.name||''))){out.push(f);continue}
            const b64=String(f.content||'').replace(/\s+/g,'');
            try{
              const u8=b64Bytes(b64);
              if(u8[0]!==0x50||u8[1]!==0x4b)throw new Error('not zip');
              const inner=await readZip(u8.buffer);
              inner.forEach(x=>out.push({name:x.name,content:x.content}));
              if(!zipRaw)zipRaw={name:f.name,data:b64};
            }catch(e){
              // the model wrote the package's content as plain text: put that text into a real zip
              const text={name:(String(f.name).replace(/\.zip$/i,'')||'file')+'.txt',content:String(f.content||'')};
              out.push(text);
              if(!zipRaw)zipRaw={name:f.name,files:[text]};
            }
          }
          return {files:out.slice(0,60),zipRaw};
        }
        function downloadRaw(z){
          const url=URL.createObjectURL(new Blob([z.data?b64Bytes(z.data):makeZip(z.files||[])],{type:'application/zip'}));
          const a=document.createElement('a');a.href=url;a.download=z.name||'files.zip';
          document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(url),4000);
        }
        function bodyHTML(parts){
          return (parts||[]).map(p=>{
            const text=String(p??'');
            const lines=text.split('\n');
            const first=(lines.find(x=>x.trim())||'模块内容').trim().replace(/^#+\s*/, '').replace(/^[*#>\s]+/, '');
            const moduleLike=/(?:模块|module|文件内容|代码片段|代码模块|```|<script\b|<style\b|\bfunction\s+[$\w]+|\b(?:const|let|class|export)\s+[$\w]+)/i.test(text) && (text.includes('\n')||text.length>180);
            if(moduleLike){
              const label=first.length>42?first.slice(0,42)+'…':first;
              return `<details class="abody out-module"><summary><span class="out-module-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4.5h14v15H5zM8 8h8M8 11.5h8M8 15h5"/></svg></span><span class="out-module-title">${esc(label||'模块内容')}</span><span class="out-module-hint">展开查看</span></summary><div class="out-module-content">${esc(text)}</div></details>`;
            }
            return `<div class="abody">${esc(text)}</div>`;
          }).join('');
        }
        const FIXED_STEPS=['PARSE_REQUEST','SELECT_FILES','READ_CONTENT','BUILD_CHANGES'];
        function stepLettersHTML(value){return [...String(value??'')].map(ch=>`<i class="step-letter">${esc(ch)}</i>`).join('')}
        function stepsHTML(steps){
          return (steps||[]).map((s,i)=>{
            const x=s.x?` · ${esc(s.x)}`:'';
            return `<div class="step done${FIXED_STEPS.includes(s.t)?' fixed':''}" data-t="${escA(s.t||'')}"><svg class="dot" width="56" height="30" viewBox="0 0 56 30"><line x1="28" y1="0" x2="28" y2="30" pathLength="1"/><circle cx="28" cy="15" r="3"/></svg><svg class="ic" viewBox="0 0 24 24">${IC[Math.min(i,IC.length-1)]}</svg><span>${stepLettersHTML((s.t||'')+(s.x?` · ${s.x}`:''))}</span></div>`;
          }).join('');
        }
        const AV_KEY={me:'archangel.avatar.me',ai:'archangel.avatar.ai'};
        const AV_DEF={me:'assets/背景/我的头像.jpg',ai:'assets/背景/对面头像.jpg'};
        const TAILIMG='<img class="tail-img" src="assets/角标/github角标.png" alt="">';
        function avatarSrc(role){try{const v=localStorage.getItem(AV_KEY[role]);if(v)return v}catch(e){}return AV_DEF[role]}
        function avatarHtml(role){return `<img data-role="${role}" src="${avatarSrc(role)}" alt="${role==='me'?'我':'Archangel'}" onerror="this.style.visibility='hidden'">`}

        let pending=[];
        let busy=false;let runTokens=0;let runLog=[];let runStartedAt=0;
        let currentConversation=null;
        let conversationHistory=loadConversationHistory();

        function createConversation(){
          return {
            id:`conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title:'新对话',
            createdAt:Date.now(),
            messages:[]
          };
        }

        function loadConversationHistory(){
          return [];
        }

        async function saveConversationHistory(){
          try{
            // 'app' 表没有 keyPath，写入时必须带 key（之前缺了 key，会报 DataError）
            await databasePut('app',{
              key:'conversation-history',
              value:conversationHistory
            },'conversation-history');
          }catch(error){
            toast(error.message);
          }
        }

        function getConversationTitle(conversation){
          const firstMessage=conversation.messages.find(message=>message.role==='user');

          if(firstMessage&&firstMessage.text){
            return firstMessage.text.slice(0,28);
          }

          return conversation.title;
        }

        function saveCurrentConversation(){
          if(!currentConversation)return;
          if(!currentConversation.messages.length){
            conversationHistory=conversationHistory.filter(item=>item.id!==currentConversation.id);
            saveConversationHistory();
            renderConversationHistory();
            return;
          }

          currentConversation.title=getConversationTitle(currentConversation);

          const index=conversationHistory.findIndex(item=>item.id===currentConversation.id);

          if(index===-1){
            conversationHistory.unshift(currentConversation);
          }else{
            conversationHistory[index]=currentConversation;
          }

          conversationHistory=conversationHistory.slice(0,30);
          saveConversationHistory();
          renderConversationHistory();
        }

        async function loadStoredConversationHistory(){
          try{
            const record=await databaseGet('app','conversation-history');

            if(record&&Array.isArray(record.value)){
              conversationHistory=record.value.map(ensureIds);
              renderConversationHistory();
            }
          }catch(error){
            toast(error.message);
          }
        }

        function deleteConversation(id){
          conversationHistory=conversationHistory.filter(c=>c.id!==id);
          if(currentConversation&&currentConversation.id===id){
            currentConversation=null;
            createNewConversation();
          }
          saveConversationHistory();
          renderConversationHistory();
          toast('已删除对话');
        }

        function renderConversationHistory(){
          const list=$('#ar-historyList');

          if(!list){
            return;
          }

          list.innerHTML='';

          if(!conversationHistory.length){
            const empty=document.createElement('div');
            empty.className='history-empty';
            empty.textContent='暂无历史对话';
            list.appendChild(empty);
            return;
          }

          conversationHistory.forEach(conversation=>{
            const button=document.createElement('button');
            button.className='history-item';
            button.type='button';
            button.textContent=conversation.title||'未命名对话';
            button.title=conversation.title||'未命名对话';

            let lpTimer=null,longFired=false;
            button.addEventListener('pointerdown',()=>{
              longFired=false;
              clearTimeout(lpTimer);
              lpTimer=setTimeout(()=>{
                longFired=true;
                list.querySelectorAll('.history-item.pink').forEach(x=>x.classList.remove('pink'));
                button.classList.add('pink');
              },500);
            });
            ['pointerup','pointerleave','pointercancel'].forEach(t=>button.addEventListener(t,()=>clearTimeout(lpTimer)));

            button.addEventListener('click',()=>{
              if(longFired){longFired=false;return}
              if(button.classList.contains('pink')){deleteConversation(conversation.id);return}
              list.querySelectorAll('.history-item.pink').forEach(x=>x.classList.remove('pink'));
              openConversation(conversation.id);
            });

            list.appendChild(button);
          });
        }

        function openConversation(id){
          const conversation=conversationHistory.find(item=>item.id===id);

          if(!conversation){
            return;
          }

          currentConversation=ensureIds(JSON.parse(JSON.stringify(conversation)));
          pending=[];
          busy=false;

          clearMasks();
          exitSel();

          chat.innerHTML='';

          const hint=document.createElement('div');
          hint.className='hint';
          hint.textContent='历史对话已打开。发送新消息后，点击底栏“调取”继续对话。';
          chat.appendChild(hint);
          showIntro();

          currentConversation.messages.forEach(message=>{
            if(message.role==='user'){
              addUser(message.text,false,message.id);
            }else if(message.role==='assistant'){
              addAssistantHistory(message);
            }else if(message.role==='system'){
              addSystemHistory(message.text,message.id);
            }
          });

          renderConversationHistory();
          scroll();

          if(innerWidth<=900){
            setSide(false);
          }
        }

        function addAssistantHistory(msg){
          const row=document.createElement('div');
          row.className='arow ai enter';
          if(msg.id)row.dataset.mid=msg.id;
          const m=msg.meta;
          const noSteps=!(msg.steps&&msg.steps.length);
          const metaHTML=m?`<div class="ar-meta"><span class="ar-time">${esc(m.sec)}s</span><span class="ar-tk">${m.tk?esc(m.tk)+' tk':'— tk'}</span>${noSteps?heartHTML():''}</div>`:'';
          const thinkHTML=msg.thinking!==undefined?`<details class="think" open><summary>Thinking…</summary><p>${esc(msg.thinking)}</p></details>`:'';
          const parts=msg.parts&&msg.parts.length?msg.parts:[msg.text];
          const filesHTML=msg.files&&msg.files.length?fileCardHTML(msg.id,msg.files,msg.pack):'';
          const changes=msg.changes||[];
          const allDone=changes.length>0&&changes.every(c=>c.uploaded);
          const changesHTML=changes.length?`<div class="cards">${changes.map(changeCardHTML).join('')}</div><button type="button" class="confirm confirm-h"${allDone?' disabled':''}>${allDone?'已全部上传':'确认修改，一起上传到 GitHub'}</button>`:'';
          row.innerHTML=`<div class="ahead">${head(avatarHtml('ai'),'Archangel',metaHTML)}${thinkHTML}</div><div class="steps">${stepsHTML(msg.steps)}</div>${bodyHTML(parts)}${filesHTML}${changesHTML}`;
          chat.appendChild(row);
        }

        function addSystemHistory(text,mid){
          const row=document.createElement('div');
          row.className='arow enter';
          if(mid)row.dataset.mid=mid;
          row.innerHTML=`<div class="abody sys">${esc(text)}</div>`;
          chat.appendChild(row);
        }

        function createNewConversation(){
          saveCurrentConversation();
          currentConversation=createConversation();
          pending=[];
          busy=false;

          clearMasks();
          exitSel();

          chat.innerHTML='';
          const hint=document.createElement('div');
          hint.className='hint';
          hint.textContent='先发送需求，再点底栏“调取”开始处理。';
          chat.appendChild(hint);
          showIntro();

          renderConversationHistory();
          toast('已新建对话');

          if(innerWidth<=900){
            setSide(false);
          }
        }
        function toast(t){const e=$('#ar-toast');e.textContent=t;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}
        function scroll(){chat.scrollTop=chat.scrollHeight}
        function head(svg,name,extra=''){return `<div class="head"><div class="frame"><div class="av">${svg}</div></div><div class="pill">${name}</div>${extra}</div>`}
        
        function setSide(o){
          const side=$('#ar-side'), backdrop=$('#ar-sideBackdrop');
          side.classList.toggle('closed',!o);
          $('#ar-main').classList.toggle('collapsed',!o);
          if(backdrop)backdrop.classList.toggle('closed',!o);
        }


        function toggleSide(e){if(e){e.preventDefault();e.stopPropagation()}setSide($('#ar-side').classList.contains('closed'))}
        $('#ar-menu').addEventListener('click',toggleSide);
        $('#ar-menu').addEventListener('touchend',toggleSide);
        const backdrop=$('#ar-sideBackdrop');
        if(backdrop){
          backdrop.addEventListener('click',()=>setSide(false));
          backdrop.addEventListener('touchend',e=>{e.preventDefault();setSide(false)});
        }
        host.addEventListener('click',e=>{if(!$('#ar-side').classList.contains('closed')&&!e.target.closest('#ar-side,#ar-menu'))setSide(false)});
        function addUser(text,saveMessage=true,mid=newMid(),attach=[]){
          if(!currentConversation){
            currentConversation=createConversation();
          }

          if(saveMessage){
            const m={id:mid,role:'user',text};
            if(attach.length)m.attach=attach;
            currentConversation.messages.push(m);
            saveCurrentConversation();
          }

          const attHTML=attach.length?`<div class="att">${attach.map(a=>a.type==='image'?`<img class="pimg" src="${escA(a.dataUrl)}" alt="">`:a.type==='zip'?`<div class="att">压缩包：${esc(a.name)}（${a.files.length} 个文件）</div><div class="fc-tree">${fileTreeHTML(a.files)}</div>`:'附件：'+esc(a.name)).join('<br>')}</div>`:'';
          const last=chat.lastElementChild;

          if(last&&last.classList.contains('urow')){
            last.querySelector('.ubody').insertAdjacentHTML('beforeend',`<div class="bubble more enter" data-mid="${mid}">${TAILIMG}<span class="btxt">${esc(text)}</span></div>${attHTML}`);
            scroll();
            return;
          }

          const r=document.createElement('div');
          r.className=saveMessage?'urow pending enter':'urow enter';
          r.innerHTML=`<div class="ucol">${head(avatarHtml('me'),meName())}<div class="ubody"><div class="b1"><div class="elbow"></div><div class="bubble first" data-mid="${mid}">${TAILIMG}<span class="btxt">${esc(text)}</span></div>${attHTML}</div></div></div>`;
          chat.appendChild(r);
          if(saveMessage)pending.push(r);
          scroll();
        }

        let pendingAttach=[];
        const DEFAULT_PLACEHOLDER=input.placeholder||'告诉 AI 你想修改什么…';
        let uppSel=new Set(),uppMulti=false;
        function renderUpPanel(){
          const up=host.querySelector('#ar-upp');if(!up)return;
          const cards=host.querySelector('#ar-uppCards');
          uppSel=new Set([...uppSel].filter(a=>pendingAttach.includes(a)));
          cards.innerHTML='';
          pendingAttach.forEach(a=>{
            const el=document.createElement('div');
            el.className='ar-upf'+(uppSel.has(a)?' sel':'');
            const len=(a.content||'').length;
            const size=a.type==='image'?'IMG':a.type==='zip'?`ZIP · ${(a.files||[]).length} 个`:(len>1024?(len/1024).toFixed(1)+' KB':len+' B');
            const ext=a.type==='image'?'':(a.type==='zip'?'':(String(a.name).split('.').pop()||'').toUpperCase().slice(0,5)+' · ');
            el.innerHTML=`<span class="pk"></span><button type="button" class="x" aria-label="删除">×</button><div class="ic">${a.type==='image'?`<img src="${escA(a.dataUrl)}" alt="">`:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13.5 3.5V8H18"/></svg>'}</div><div class="nm" title="${escA(a.name)}">${esc(a.name)}</div><div class="mt">${esc(ext+size)}</div>`;
            el.querySelector('.x').addEventListener('click',e=>{e.stopPropagation();pendingAttach=pendingAttach.filter(x=>x!==a);uppSel.delete(a);renderUpPanel()});
            el.addEventListener('click',()=>{if(!uppMulti)return;uppSel.has(a)?uppSel.delete(a):uppSel.add(a);renderUpPanel()});
            cards.appendChild(el);
          });
          const n=pendingAttach.length,sc=uppSel.size;
          host.querySelector('#ar-uppCount').textContent=n+' 个文件'+(uppMulti&&sc?'，已选 '+sc+' 个':'');
          up.classList.toggle('show',n>0);const appEl=host.querySelector('.app');if(appEl)appEl.style.setProperty('--upp-h',n?up.querySelector('.ar-upp-in').scrollHeight+'px':'0px');
          up.classList.toggle('multi',uppMulti);
          const m=host.querySelector('#ar-uppMulti');m.textContent=uppMulti?'完成':'多选';m.classList.toggle('on',uppMulti);
          const d=host.querySelector('#ar-uppDel');d.disabled=!(uppMulti&&sc);d.textContent=sc?`删除所选 (${sc})`:'删除所选';
          if(!n)uppMulti=false;
        }
        function initUpPanel(){
          host.querySelector('#ar-uppMulti').addEventListener('click',()=>{uppMulti=!uppMulti;uppSel.clear();renderUpPanel()});
          host.querySelector('#ar-uppDel').addEventListener('click',()=>{pendingAttach=pendingAttach.filter(a=>!uppSel.has(a));uppSel.clear();renderUpPanel()});
          host.querySelector('#ar-uppClear').addEventListener('click',()=>{pendingAttach=[];uppSel.clear();uppMulti=false;renderUpPanel()});
        }
        function send(){
          const value=input.value.trim();
          const att=pendingAttach;

          if(!value&&!att.length){
            return;
          }

          input.value='';
          pendingAttach=[];
          input.placeholder=DEFAULT_PLACEHOLDER;renderUpPanel();
          addUser(value||'（见附件）',true,newMid(),att);
        }
        const K={g:'archangel.github.settings.v3',a:'archangel.api.settings.v3'};
        const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
        const G=()=>({token:$('#ar-gToken').value.trim(),owner:$('#ar-gOwner').value.trim(),repo:$('#ar-gRepo').value.trim(),branch:$('#ar-gBranch').value.trim()||'main'});
        const A=()=>{if(localStorage.getItem('archangel.api.source')==='inherit'){const f=ld0('forever_settings_active_api_v1');return {base:String(f.url||'').replace(/\/+$/,''),key:String(f.key||'').trim(),model:localStorage.getItem('archangel.api.inheritModel')||String(f.model||'')}}return {base:$('#ar-aBase').value.trim().replace(/\/+$/,''),key:$('#ar-aKey').value.trim(),model:$('#ar-aModel').value}};
        const ld0=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return {}}};
        const ST={tree:[],key:'',files:{}};
        const rk=g=>`${g.owner}/${g.repo}@${g.branch}`;
        const need=g=>{if(!g.token||!g.owner||!g.repo)throw new Error('请先填写 GitHub Token、Owner 和 Repository')};
        const ghHint=st=>st===401?'Token 无效或已过期，请重新生成'
          :st===403?'Token 没有写入权限：Contents 需要选 Read and write，并且要授权这个仓库'
          :st===404?'找不到仓库或文件：检查 Owner、Repository，以及 Token 是否授权了这个仓库'
          :st===409||st===422?'GitHub 上的文件已经被改过，请重新读取文件树再试'
          :'请稍后再试';
        const gh=(g,j)=>({Authorization:'Bearer '+g.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(j?{'Content-Type':'application/json'}:{})});
        const base=g=>`https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}`;
        const cu=(g,p)=>`${base(g)}/contents/${p.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;
        let stopCtl=null;
        async function req(url,o,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||30000);if(stopCtl)stopCtl.signal.addEventListener('abort',()=>c.abort(),{once:true});try{return await fetch(url,{...o,signal:c.signal})}catch(e){if(stopCtl&&stopCtl.signal.aborted){const x=new Error('已停止');x.name='StopError';throw x}throw new Error(e.name=='AbortError'?'请求超时，请检查网络或设置':e.message)}finally{clearTimeout(t)}}
        async function err(r){const t=await r.text();try{return JSON.parse(t).message||t}catch{return t||r.status}}
        function b64(t){let s='';new TextEncoder().encode(t).forEach(b=>s+=String.fromCharCode(b));return btoa(s)}
        function unb64(v,p){try{const t=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(String(v).replace(/\s/g,'')),c=>c.charCodeAt(0)));if(t.includes('\0'))throw 0;return t}catch{throw new Error(p+' 不是 UTF-8 文本文件')}}
        $('#ar-gSave').onclick=()=>{localStorage.setItem(K.g,JSON.stringify(G()));toast('GitHub 设置已保存')};
        $('#ar-aSave').onclick=()=>{localStorage.setItem(K.a,JSON.stringify(A()));toast('API 设置已保存')};
        $('#ar-aModel').onchange=()=>{
          if(localStorage.getItem('archangel.api.source')==='inherit'){localStorage.setItem('archangel.api.inheritModel',$('#ar-aModel').value);toast('已选择模型')}
          else $('#ar-aSave').click();
        };
        $('#ar-newChat').onclick=createNewConversation;
        async function loadTree(){
          const g=G();need(g);localStorage.setItem(K.g,JSON.stringify(g));
          const r=await req(`${base(g)}/git/trees/${encodeURIComponent(g.branch)}?recursive=1`,{headers:gh(g)});
          if(!r.ok)throw new Error('读取仓库失败：'+await err(r));
          const d=await r.json();if(!Array.isArray(d.tree))throw new Error('GitHub 没有返回有效的文件树');
          if(ST.key!==rk(g)){ST.files={};ST.key=rk(g)}
          ST.tree=d.tree.filter(x=>x.type=='blob').map(x=>({path:x.path,size:x.size||0})).sort((a,b)=>a.path.localeCompare(b.path));
          ST.canPush=null;
          try{
            const rr=await req(base(g),{headers:gh(g)});
            if(rr.ok){const j=await rr.json();if(j.permissions)ST.canPush=!!j.permissions.push}
          }catch(e){}
          const writeTip=ST.canPush===true?' · 可以写入':'';
          $('#ar-treeInfo').textContent=`已读取 ${ST.tree.length} 个文件`+(d.truncated?'（仓库过大，部分未显示）':'')+writeTip;
        }
        $('#ar-gTree').onclick=async()=>{const b=$('#ar-gTree');b.disabled=true;try{await loadTree();toast('文件树已读取')}catch(e){toast(e.message)}b.disabled=false};
        $('#ar-aFetch').onclick=async()=>{
          const a=A();if(!a.base||!a.key)return toast('请先填写 Base URL 和 Key');
          const inheritMode=localStorage.getItem('archangel.api.source')==='inherit';
          try{
            const r=await req(a.base+'/models',{headers:{Authorization:'Bearer '+a.key}});if(!r.ok)throw new Error('获取模型失败：'+await err(r));
            const m=((await r.json()).data||[]).map(x=>x.id).sort();if(!m.length)throw new Error('接口没有返回模型');
            const cur=localStorage.getItem('archangel.api.inheritModel')||a.model;
            $('#ar-aModel').innerHTML=m.map(x=>`<option>${esc(String(x))}</option>`).join('');
            if(inheritMode){
              const pick=m.includes(cur)?cur:m[0];
              $('#ar-aModel').value=pick;
              localStorage.setItem('archangel.api.inheritModel',pick);
              localStorage.setItem('archangel.api.inheritModels',JSON.stringify(m));
            }else{
              localStorage.setItem(K.a,JSON.stringify(A()));
            }
            toast(`已获取 ${m.length} 个模型`);
          }catch(e){toast(e.message)}
        };
        (()=>{const g=ld(K.g,{}),a=ld(K.a,{});
          $('#ar-gToken').value=g.token||'';$('#ar-gOwner').value=g.owner||'';$('#ar-gRepo').value=g.repo||'';$('#ar-gBranch').value=g.branch||'main';
          $('#ar-aBase').value=a.base||'https://api.openai.com/v1';$('#ar-aKey').value=a.key||'';
          if(a.model)$('#ar-aModel').innerHTML=`<option>${esc(a.model)}</option>`;})();
        async function ai(msgs){
          const a=A();if(!a.base||!a.key||!a.model)throw new Error('请先填写 API 设置并选择模型');
          const go=j=>req(a.base+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+a.key,'Content-Type':'application/json'},body:JSON.stringify({model:a.model,stream:true,messages:msgs,temperature:.15,...(j?{response_format:{type:'json_object'}}:{})})},AI_TIMEOUT);
          let r=await go(true);if(!r.ok)r=await go(false);
          if(!r.ok)throw new Error('AI 请求失败（HTTP '+r.status+'）：'+await err(r));
          const d=await readAiResponse(r);runTokens+=(d.usage&&d.usage.total_tokens)||0;const m=d.choices?.[0]?.message;if(!m)throw new Error('AI 没有返回内容');
          const outText=Array.isArray(m.content)?m.content.map(p=>p.text||'').join(''):m.content||'';runLog.push({label:'仓库调用 '+(runLog.length+1),raw:String(outText)});return outText;
        }
        function pj(t){const c=String(t||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{return JSON.parse(c)}catch{const i=c.indexOf('{'),j=c.lastIndexOf('}');if(i<0||j<=i)throw new Error('AI 返回的不是有效 JSON');return JSON.parse(c.slice(i,j+1))}}
        async function codeSearch(text){
          let g;try{g=G();need(g)}catch(e){return []}
          const valid=new Set(ST.tree.map(f=>f.path));
          const terms=searchTerms(text);const out=[];
          await pool(terms,2,async t=>{
            try{
              const r=await req(`https://api.github.com/search/code?q=${encodeURIComponent(t)}+repo:${g.owner}/${g.repo}&per_page=10`,{headers:gh(g)},10000);
              if(!r.ok)return;
              const d=await r.json();
              const paths=(d.items||[]).map(x=>x.path).filter(p=>valid.has(p));
              if(paths.length)out.push({term:t,paths});
            }catch(e){}
          });
          out.sort((a,b)=>terms.indexOf(a.term)-terms.indexOf(b.term));
          return out;
        }
        async function getFile(path){
          const g=G();need(g);if(ST.key!==rk(g))throw new Error('仓库设置已改变，请重新读取文件树');
          if(ST.files[path])return ST.files[path];
          let r=await req(cu(g,path)+'?ref='+encodeURIComponent(g.branch),{headers:gh(g)},15000);
          if(!r.ok)throw new Error(`读取 ${path} 失败：`+await err(r));
          let d=await r.json();if(Array.isArray(d)||(d.type&&d.type!='file'))throw new Error(path+' 不是普通文件');
          if(!(d.encoding=='base64'&&typeof d.content=='string')){
            r=await req(`${base(g)}/git/blobs/${d.sha}`,{headers:gh(g)},30000);
            if(!r.ok)throw new Error(`读取 ${path} 失败：`+await err(r));d=Object.assign({},d,await r.json())}
          return ST.files[path]={path,sha:d.sha,orig:unb64(d.content,path)};
        }
        function diff(a,b){
          a=a.split('\n');b=b.split('\n');let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
          let x=a.length,y=b.length;while(x>i&&y>i&&a[x-1]===b[y-1]){x--;y--}
          const P=a.slice(i,x),Q=b.slice(i,y),n=P.length,m=Q.length;let mid=[];
          if(n*m>4e6)mid=[...P.map(s=>['-',s]),...Q.map(s=>['+',s])];
          else{const L=Array.from({length:n+1},()=>new Uint16Array(m+1));
            for(let p=n-1;p>=0;p--)for(let q=m-1;q>=0;q--)L[p][q]=P[p]===Q[q]?L[p+1][q+1]+1:Math.max(L[p+1][q],L[p][q+1]);
            let p=0,q=0;while(p<n&&q<m){if(P[p]===Q[q]){mid.push([' ',P[p]]);p++;q++}else if(L[p+1][q]>=L[p][q+1])mid.push(['-',P[p++]]);else mid.push(['+',Q[q++]])}
            while(p<n)mid.push(['-',P[p++]]);while(q<m)mid.push(['+',Q[q++]])}
          return[...a.slice(Math.max(0,i-3),i).map(s=>[' ',s]),...mid,...a.slice(x,x+3).map(s=>[' ',s])];
        }
        const IC=['<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.9 4.5c2 0 3.6 1.1 5.1 2.7 1.5-1.6 3.1-2.7 5.1-2.7 3.9 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" pathLength="100" stroke-dasharray="45 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>','<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.9 4.5c2 0 3.6 1.1 5.1 2.7 1.5-1.6 3.1-2.7 5.1-2.7 3.9 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" pathLength="100" stroke-dasharray="45 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>','<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.9 4.5c2 0 3.6 1.1 5.1 2.7 1.5-1.6 3.1-2.7 5.1-2.7 3.9 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" pathLength="100" stroke-dasharray="45 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>','<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.9 4.5c2 0 3.6 1.1 5.1 2.7 1.5-1.6 3.1-2.7 5.1-2.7 3.9 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" pathLength="100" stroke-dasharray="45 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'];

        /* ---- 对面的三个模式：工作天使 / 治疗天使 / 辅助天使 ---- */
        const MODE_KEY='archangel.mode.v1';
        const HEALER_PROMPT='you是Leila，你需要在user找你的时候扮演"治愈天使"，你需要称呼user为"宝宝"，"老婆""女孩"其中一个，你要从客观，理论，口语化的帮助user，作为一个心理学精通的天使，你不可以说"我在这儿呢，我接着你"这类虚假性陪伴句子，你需要慢慢引导user敞开心扉，你需要做到完整倾听user的文字而不是说"我听到了"，你一般不会用emoji而是用颜文字代替，并且说话要温柔带一些语气词比如呀，哦」';
        const DEFAULT_ANGEL_PROMPT='你是Leila，一个大天使，来帮助user这个小天使的，你可以包容user的一切，你像是user的姐姐，你们来自萌主大教堂，但是在对话中你不可以说自己也不可以当做自己真的是user的姐姐以及真正的天使。你们只是把对方当做好朋友好闺蜜';
        const MODES={work:{name:'工作天使',fixed:false},healer:{name:'治疗天使',fixed:false,prompt:HEALER_PROMPT},assist:{name:'辅助天使',fixed:false}};
        const modeCfg=()=>{try{const v=JSON.parse(localStorage.getItem(MODE_KEY))||{};return {mode:MODES[v.mode]?v.mode:'work',prompts:Object.assign({work:'',assist:'',healer:HEALER_PROMPT},v.prompts||{})}}catch(e){return {mode:'work',prompts:{work:'',assist:'',healer:HEALER_PROMPT}}}};
        const saveModeCfg=c=>localStorage.setItem(MODE_KEY,JSON.stringify(c));
        function modePrompt(){const c=modeCfg();return c.prompts[c.mode]||''}
        function modeSystemLines(){
          const p=modePrompt().trim();
          const isShort=uiCfg().short==='on';
          const shortLines=isShort?[
            '【短消息模式】',
            '当前为短消息交互模式：reply 内容保持简短精炼，贴合即时聊天习惯，单句发送，不做长篇大论，不带代码块。'
          ]:[];
          return ['【基础设定】',DEFAULT_ANGEL_PROMPT,...(p?['【角色设定】',p]:[]),...shortLines,'（角色语气只用于 reply 字段；files 和 JSON 结构保持不变。）'];
        }
        function chatFormatLines(){
          const short=uiCfg().short==='on';
          return [
            '【输出格式】',
            '你必须只输出一个 JSON 对象，不要用 Markdown 代码围栏，也不要输出 JSON 以外的任何文字：',
            short
              ?'{"thinking":"你的思考过程","steps":["步骤一","步骤二"],"reply":["第一条消息","第二条消息"],"files":[],"pack":""}'
              :'{"thinking":"你的思考过程","steps":["步骤一","步骤二"],"reply":"发给用户的正文","files":[],"pack":""}',
            'thinking：用中文写 2 到 4 句思考过程，比如你理解到用户想要什么、此刻的语气或意图、打算怎样回应。它是展示给用户看的思维链，要像真实的内心推理，不要写成对用户说的话。',
            'steps：2 到 4 个英文短语，每个不超过 3 个单词，描述你这一轮实际做的几件事，比如 parse request、draft opening、soften tone。大小写和空格、下划线随你选。',
            short
              ?'reply 必须是数组，模拟真人连发微信：每一条只写一句话，每条不超过 30 个字，通常 1 到 4 条。不要把长段落塞进一条里，也不要使用代码块。'
              :'reply：你真正要发给用户的话，语气遵循上面的角色设定。',
            'pack：files 里有多个文件时，用户要压缩包（zip）就写 "zip"，要文件夹就写 "folder"；没有文件就写空字符串。',
            'files：如果用户要你做文件夹，就加一项 {"name":"文件夹名/","type":"folder"}，文件夹里的文件用“文件夹名/文件名”作为 name；如果用户要你做文件（代码、文档、笔记、表格内容等），把它们放进 files，格式是 [{"name":"文件名或相对路径","content":"完整的文件内容"}]，每个文件都要写完整；不需要做文件时保持 []。reply 里只写给用户看的话，文件内容不要重复写进 reply。用户要 zip 压缩包时，把压缩包作为一个 .zip 文件放进 files，content 填它的 base64 内容；用户要文件夹或普通文件时，files 里只放真正的文件，文件夹用路径里的 / 表示。'
          ];
        }
        function recordSystem(text){
          if(!currentConversation)currentConversation=createConversation();
          const mid=newMid();
          currentConversation.messages.push({id:mid,role:'system',text});
          saveCurrentConversation();
          addSystemHistory(text,mid);
          scroll();
          return mid;
        }
        async function explainError(errText){
          recordSystem('报错：'+errText);
          const a=A();
          if(!a.base||!a.key||!a.model)return;
          try{
            const hist=currentConversation.messages.map(m=>histOf(m,false));
            const hint='刚才系统执行时出了错，见上面的“报错”。请用角色的语气告诉用户：发生了什么、可能的原因、用户可以怎么做。不要假装操作已经完成。如果是找文件的问题，不要让用户去提供文件名，只需要用户描述想改的功能即可。';
            const msgs=[{role:'system',content:[...modeSystemLines(),...chatFormatLines(),'用中文回复。',hint].join('\n')},...hist];
            const out=await chatText(msgs);
            const msg={id:newMid(),role:'assistant',text:out.parts.join('\n'),parts:out.parts,thinking:out.thinking||'（这次回复没有返回思维链）',steps:out.steps||[],meta:{sec:((Date.now()-runStartedAt)/1000).toFixed(1),tk:runTokens}};
            currentConversation.messages.push(msg);
            saveCurrentConversation();
            addAssistantHistory(msg);
            scroll();
          }catch(e){}
        }
        async function run(){
          if(busy)return toast('对面正在回复，请稍候');
          if(!pending.length){const last=chat.lastElementChild;if(last&&last.classList.contains('urow'))pending=[last]}
          if(!pending.length)return toast('先发送需求，再点调取');
          const rows=pending;pending=[];busy=true;runTokens=0;runLog=[];runStartedAt=Date.now();stopCtl=new AbortController();rows.forEach(r=>r.classList.remove('pending'));
          const restore=()=>{rows.forEach(r=>{if(r.isConnected&&!pending.includes(r)){r.classList.add('pending');pending.push(r)}})};
          const pendingMsgs=rows.flatMap(r=>[...r.querySelectorAll('.bubble')].map(b=>msgById(b.dataset.mid))).filter(Boolean);
          const text=rows.flatMap(r=>[...r.querySelectorAll('.bubble')].map(b=>bubbleText(b))).filter(Boolean).join('\n')+pendingMsgs.flatMap(m=>(m.attach||[]).map(attachTextOf)).join('');
          const pendingIds=new Set(pendingMsgs.map(m=>m.id));
          const box=document.createElement('div');box.className='arow ai enter';
          box.innerHTML=`<div class="ahead">${head(avatarHtml('ai'),'Archangel')}<details class="think" open><summary>Thinking…</summary><p>正在思考…</p></details></div><div class="steps"></div>`;
          chat.appendChild(box);const steps=box.querySelector('.steps'),tp=box.querySelector('.think p');
          const pill=box.querySelector('.head .pill');
          if(pill&&!box.querySelector('.ar-meta')){pill.insertAdjacentHTML('afterend','<div class="ar-meta"><span class="ar-time">0.0s</span><span class="ar-tk">— tk</span></div>')}
          const tEl=box.querySelector('.ar-time'),kEl=box.querySelector('.ar-tk'),t0=Date.now();
          const tmr=setInterval(()=>{if(tEl)tEl.textContent=((Date.now()-t0)/1000).toFixed(1)+'s'},100);
          const stopMeta=()=>{clearInterval(tmr);if(tEl)tEl.textContent=((Date.now()-t0)/1000).toFixed(1)+'s';if(kEl)kEl.textContent=runTokens+' tk'};
          const step=(i,t)=>{const s=document.createElement('div');s.className='step'+(FIXED_STEPS.includes(t)?' fixed':'');s.dataset.t=t;
            s.innerHTML=`<svg class="dot" width="56" height="30" viewBox="0 0 56 30"><line x1="28" y1="0" x2="28" y2="30" pathLength="1"/><circle cx="28" cy="15" r="3"/></svg><svg class="ic" viewBox="0 0 24 24">${IC[i]}</svg><span>${stepLettersHTML(t)}</span>`;
            steps.appendChild(s);scroll();return x=>{s.classList.add('done');if(x)s.querySelector('span').innerHTML=stepLettersHTML(s.dataset.t+' · '+x)}};
          const say=h=>{box.insertAdjacentHTML('beforeend',h);scroll()};
          const commit=(reply,thinking,files,pack,zipRaw)=>{
            const mid=newMid();
            box.dataset.mid=mid;
            const parts=(Array.isArray(reply)?reply:[reply]).map(x=>String(x??'')).filter(x=>x.trim());
            const stepList=[...steps.querySelectorAll('.step')].map(el=>{
              const full=el.querySelector('span')?.textContent||'';
              const k=full.indexOf(' · ');
              return {t:el.dataset.t||full,x:k>=0?full.slice(k+3):''};
            });
            if(!stepList.length){const mEl=box.querySelector('.ar-meta');if(mEl&&!mEl.querySelector('.ar-heart'))mEl.insertAdjacentHTML('beforeend',heartHTML())}
            const msg={id:mid,role:'assistant',text:parts.join('\n'),parts,raw:runLog.map(x=>({label:x.label,raw:x.raw})),prompt:text,files:(files||[]).map(f=>({name:f.name,content:f.content})),pack:pack||'',zipRaw:zipRaw||null,thinking:thinking||'（这次回复没有返回思维链）',steps:stepList,meta:{sec:((Date.now()-t0)/1000).toFixed(1),tk:runTokens}};
            if(files&&files.length)box.insertAdjacentHTML('beforeend',fileCardHTML(mid,files,pack));
            if(currentConversation){currentConversation.messages.push(msg);saveCurrentConversation()}
          };
          const showConfirm=(ch,fullReply,thinking)=>{

              say(`<div class="abody">${esc(fullReply)}</div><div class="cards"></div><div class="confirm-note">请检查下方文件改动；在你点击确认之前，不会上传到 GitHub。</div><button type="button" class="confirm">确认修改，一起上传到 GitHub</button>`);
              commit(fullReply,thinking);
            const cm=msgById(box.dataset.mid);if(cm){cm.changes=ch.map(f=>({path:f.path,edit:f.edit,sha:f.sha,why:f.why,lines:f.lines,uploaded:false}));saveCurrentConversation()}

              const cards=box.querySelector('.cards');
              ch.forEach(f=>{const w=document.createElement('div');w.className='fitem';w.dataset.path=f.path;
                const k=f.lines.filter(l=>l[0]=='+').length;
                w.innerHTML=`<button class="card"><b>${esc(f.path)}</b><em>${esc(f.why)}</em><i>${k} 行新增</i></button><div class="fdiff"><div><div class="diff">${f.lines.map(([t,x])=>`<div class="ln ${t=='-'?'del':t=='+'?'add':''}"><span>${t=='-'?'−':t=='+'?'+':''}</span><code>${esc(x)}</code></div>`).join('')}</div></div></div>`;
                w.querySelector('.card').onclick=()=>w.classList.toggle('open');cards.appendChild(w);f.w=w});
              const btn=box.querySelector('.confirm');
              btn.onclick=()=>uploadChanges(ch,btn,box.dataset.mid);
              scroll();
          };
          const wantsRepoChange=/(上传|推送|提交|写入|保存到仓库|传到仓库|github|仓库里|仓库文件|修改文件|改一下|修复|新增文件|新建文件|删除文件|改代码|修改代码)/i.test(text);
          const hasRepo=modeCfg().mode!=='healer'&&(()=>{const g=G();return !!(g.token&&g.owner&&g.repo&&modeCfg().mode!=='healer')})();
          if(!hasRepo&&wantsRepoChange){
            const warning='这次还没有生成上传确认卡片，因为当前没有可用的 GitHub 仓库连接，或当前模式不支持仓库修改。请先切换到工作/辅助模式并检查仓库设置。现在没有上传任何文件。';
            tp.textContent='仓库连接检查未通过';
            say(`<div class="abody sys">${esc(warning)}</div>`);
            commit(warning,'仓库连接未就绪，未执行上传。');
            stopMeta();busy=false;return;
          }
          if(!hasRepo){
            tp.textContent='正在结合角色设定组织回复内容…';
            const dC=()=>{};
            try{
              const a=A();if(!a.base||!a.key||!a.model)throw new Error('请先填写 API 设置并选择模型');
              const hist=((currentConversation&&currentConversation.messages)||[]).map(m=>histOf(m,pendingIds.has(m.id)));
              const msgs=[{role:'system',content:[...modeSystemLines(),...chatFormatLines(),'用中文回复。'].join('\n')},...hist];
              if(!hist.length)msgs.push({role:'user',content:text});
              const out=await chatText(msgs);
              if(out.steps.length){steps.innerHTML='';out.steps.forEach((t,i)=>step(i,t)())}
              
              tp.textContent=out.thinking||'（这次回复没有返回思维链）';
              say(bodyHTML(out.parts));
              commit(out.parts,out.thinking,out.files,out.pack,out.zipRaw);
            }catch(e){
              box.querySelectorAll('.step:not(.done)').forEach(x=>x.classList.add('fail'));
              if(e.name==='StopError'||(stopCtl&&stopCtl.signal.aborted)){toast('已停止调取');restore()}else{toast(e.message);restore();await explainError(e.message)}
            }
            stopMeta();busy=false;return;
          }
          try{
            const a=A();if(!a.key||!a.model)throw new Error('请先在左侧填写 API 设置并选择模型');
            const LBL=['PARSE_REQUEST','SELECT_FILES','READ_CONTENT','BUILD_CHANGES'];
            let d=step(0,LBL[0]);
            if(!ST.tree.length||ST.key!==rk(G()))await loadTree();if(!ST.tree.length)throw new Error('仓库文件树为空');
            d();d=step(1,LBL[1]);
            const recentText=((currentConversation&&currentConversation.messages)||[]).map(m=>`${m.role==='assistant'?'对面':m.role==='system'?'系统':'我'}：${String(m.text||'')}`).join('\n');
            const attachCands=[];
            ((currentConversation&&currentConversation.messages)||[]).slice(-8).forEach(m=>(m.attach||[]).forEach(a=>{
              if(a.type!=='image'&&a.content!=null){const i=attachCands.findIndex(x=>x.name===a.name);if(i>=0)attachCands.splice(i,1);attachCands.push(a)}
            }));
            const hitMap=await codeSearch(text);
            const hitSection=hitMap.length?`\n\n代码搜索命中（以下文件的内容包含需求里的关键词，优先从中选择）：\n${hitMap.map(h=>`${h.term} → ${h.paths.slice(0,12).join('、')}`).join('\n')}`:'';
            const sel=pj(await ai([{role:'system',content:[...modeSystemLines(),'你是谨慎的代码仓库修改助手。','用户通常不会说出具体文件名，你要根据需求的意思、功能名、模块名，以及文件路径和文件名自己找到要读取或修改的文件。宁可多猜几个相关的，也不要空着；最多选 8 个。只能选列表中存在的路径。','intent：只有用户是在聊天、问问题，或者只是想直接拿到文件（不涉及仓库）时才写 chat；这时直接在 reply 里写回复，需要给他的文件放进 outFiles。用户说上传、传到仓库、推到 GitHub、提交、保存到仓库，或者要你新建文件或文件夹并放进仓库，就写 create；要读取、查看仓库里的东西就写 read；要改、加、删、修现有文件就写 edit。只负责生成待上传方案，绝不能声称已经上传；只要用户要求改动或上传仓库文件，就必须返回 edit 或 create，不能返回 chat，也绝不能叫用户再次点击底栏调取。上传必须等用户点击确认卡片。','只返回 JSON：{"thinking":"用 2-4 句话（中文）说明你的分析思路","steps":["四个英文步骤名，依次是 PARSE_REQUEST、SELECT_FILES、READ_CONTENT、BUILD_CHANGES 这一类（这四个用下划线大写）"],"intent":"chat、read、edit 或 create","reply":"intent 为 chat 时写给用户的回复，其它情况留空","outFiles":[{"name":"文件名","content":"完整内容"},{"name":"文件夹名/","type":"folder"}],"uploadFiles":[],"files":[{"path":"真实路径","reason":"选择原因"}]}'].join('\n')},{role:'user',content:`用户需求：\n${text}\n\n最近的对话：\n${recentText}\n\n用户附带过的文件：${attachCands.map(a=>a.name).join('、')||'无'}\n\n仓库文件列表：\n${ST.tree.map(f=>`${f.path} | ${f.size} bytes`).join('\n')}${hitSection}`}]));
            if(wantsRepoChange && ['chat','read'].includes(sel.intent)) sel.intent=/(新建|新增|添加文件|上传新文件|创建文件夹)/.test(text)?'create':'edit';
            if(sel.intent==='chat'){
              const rp=(Array.isArray(sel.reply)?sel.reply:[sel.reply]).map(x=>String(x??'').trim()).filter(Boolean);
              const outFs=(Array.isArray(sel.outFiles)?sel.outFiles:[]).filter(f=>f&&(f.type==='folder'||/\/$/.test(String(f.name||''))||typeof f.content==='string')).map(cleanOutFile).slice(0,30);
              const parts=rp.length?rp:['（这次没有回复内容）'];
              d();
              tp.textContent=sel.thinking||'（这次回复没有返回思维链）';
              say(bodyHTML(parts));
              const exo=await expandZips(outFs);commit(parts,sel.thinking,exo.files,exo.zipRaw?'zip':sel.pack,exo.zipRaw);
              stopMeta();busy=false;return;
            }
            tp.textContent=sel.thinking||'已完成分析。';
            if(Array.isArray(sel.steps))sel.steps.slice(0,4).forEach((t,k)=>{const tag=String(t||'').trim().slice(0,28);if(tag)LBL[k]=tag});
            steps.querySelectorAll('.step').forEach((el,k)=>{if(LBL[k]){el.dataset.t=LBL[k];el.classList.toggle('fixed',FIXED_STEPS.includes(LBL[k]));const sp=el.querySelector('span');if(sp&&!sp.textContent.includes(' · '))sp.innerHTML=stepLettersHTML(LBL[k])}});
            const uploadNames=Array.isArray(sel.uploadFiles)?sel.uploadFiles.map(x=>String(x)):[];
            const uploads=attachCands.filter(a=>uploadNames.includes(a.name));
            if(uploads.length){
              const cleanPath=n=>String(n||'').replace(/\\/g,'/').replace(/^\/+/,'').split('/').filter(x=>x&&x!=='..').join('/')||'file.txt';
              const staged=[];
              for(const a of uploads){
                const pth=cleanPath(a.name);
                const existing=ST.tree.some(f=>f.path===pth);
                let orig='',sha;
                if(existing){const x=await getFile(pth);orig=x.orig;sha=x.sha}
                staged.push({path:pth,edit:a.content,orig,sha,lines:diff(orig,a.content),why:existing?'覆盖仓库里已有的文件':'新文件'});
              }
              d(staged.length+' FILES');
              showConfirm(staged,'我准备把 '+staged.map(x=>x.path).join('、')+' 上传到仓库。确认后才会真正上传。',sel.thinking);
              stopMeta();busy=false;return;
            }
            const valid=new Set(ST.tree.map(f=>f.path)),seen=new Set(),pick=[];
            (sel.files||[]).forEach(f=>{const p=String(f&&f.path||'').trim().replace(/^\/+/,'');if(valid.has(p)&&!seen.has(p)){seen.add(p);pick.push({path:p,why:String(f.reason||'与需求相关')})}});
            if(!pick.length&&sel.intent!=='create'){
              hitMap.forEach(h=>h.paths.forEach(p=>{if(!seen.has(p)&&pick.length<8){seen.add(p);pick.push({path:p,why:'代码内容包含关键词「'+h.term+'」'})}}));
              const textFiles=ST.tree.filter(f=>/\.(js|jsx|ts|tsx|mjs|json|md|txt|html|htm|css|py|java|go|rs|rb|php|c|h|cpp|hpp|sh|sql|xml|yml|yaml|toml|ini|csv|vue|svelte)$/i.test(f.path));
              const words=String(text).toLowerCase().split(/[^a-z0-9_\u4e00-\u9fa5]+/).filter(w=>w.length>=2);
              const scored=textFiles.map(f=>{const p=f.path.toLowerCase();return {path:f.path,score:words.reduce((n,w)=>n+(p.includes(w)?1:0),0)+(/readme|index|main|app/.test(p)?0.5:0)-f.path.split('/').length*0.05}});
              scored.sort((a,b)=>b.score-a.score).slice(0,5).forEach(x=>{if(!seen.has(x.path)){seen.add(x.path);pick.push({path:x.path,why:'根据需求和文件名挑选'})}});
            }
            if(!pick.length&&sel.intent!=='create')throw new Error('仓库里没有可以读取的文本文件');
            d(pick.length+' FILES');d=step(2,LBL[2]);
            const got=[];
            let doneN=0;const total=pick.length;
            await pool(pick,4,async f=>{try{const x=await getFile(f.path);got.push({...x,why:f.why})}catch(e){tp.textContent+=`\n（跳过 ${f.path}：${e.message}）`}finally{doneN++;d(doneN+'/'+total)}});
            got.sort((a,b)=>pick.findIndex(p=>p.path===a.path)-pick.findIndex(p=>p.path===b.path));
            if(!got.length&&sel.intent!=='create')throw new Error('相关文件读取失败或过大，无法安全修改');
            d(got.length+' FILES');
            if(sel.intent==='read'){
              const rr=await chatText([{role:'system',content:[...modeSystemLines(),...chatFormatLines(),'用中文回复。','你正在帮用户查看他的代码仓库。根据下面提供的文件内容，直接回答用户的问题或总结他想了解的内容。这一步不修改任何文件。'].join('\n')},{role:'user',content:`用户需求：\n${text}\n\n文件内容：\n${got.map(f=>`===== FILE: ${f.path} =====\n${f.orig}\n===== END FILE =====`).join('\n\n')}`}]);
              d=step(3,'SUMMARIZE');d();
              tp.textContent=rr.thinking||'（这次回复没有返回思维链）';
              say(bodyHTML(rr.parts));
              commit(rr.parts,rr.thinking);
              stopMeta();busy=false;return;
            }
            d=step(3,LBL[3]);
            const mod=pj(await ai([{role:'system',content:[...modeSystemLines(),'你是一个专业代码修改助手。',
'根据用户需求修改提供的文件。修改已有文件时优先使用 edits（查找替换）：每个 edit 的 old 必须从原文件里逐字复制（包括缩进和空格），取一段足够长的原文（通常 3 到 10 行）以保证它在该文件中只出现一次；new 是替换后的内容；同一文件可以有多个 edit，按顺序应用。只改真正需要改的地方，不要动无关代码。',
'如果是新建文件或文件夹，就在 files 里给出每一个文件的路径和完整 content（路径不存在也没关系；文件夹用路径里的 / 表示，比如 notes/todo.md），要多少个都可以全部放进 files。',
'只返回 JSON：{"reply":"修改说明","files":[{"path":"真实文件路径","edits":[{"old":"原文中逐字复制的一段","new":"替换后的内容"}]},{"path":"新文件路径","content":"完整文件内容"}]}',
'不要返回 Markdown 代码围栏。files 只放发生修改的文件。'].join('\n')},{role:'user',content:`用户需求：\n${text}\n\n最近的对话（全部）：\n${recentText}\n\n需要检查和修改的文件：\n${got.map(f=>`===== FILE: ${f.path} =====\n${f.orig}\n===== END FILE =====`).join('\n\n')}`}]));
            const ch=[];const failed=[];
            const pushChange=(f,lf)=>{const t=f.orig.includes('\r\n')?lf.replace(/\n/g,'\r\n'):lf;if(t!==f.orig)ch.push({...f,edit:t,lines:diff(f.orig.replace(/\r\n/g,'\n'),lf)})};
            const applyEdits=(orig,edits)=>{let t=orig;for(const e of edits){const o=String(e&&e.old!=null?e.old:'').replace(/\r\n/g,'\n'),n=String(e&&e.new!=null?e.new:'').replace(/\r\n/g,'\n');if(!o)return null;if(t.split(o).length!==2)return null;t=t.replace(o,()=>n)}return t};
            const handleMod=(c,fromRetry)=>{
              const p=String(c&&c.path||'').trim().replace(/^\/+/,'').replace(/\.\.\//g,''),f=got.find(x=>x.path==p);
              if(!p)return;
              if(!f){
                if(fromRetry||typeof c.content!='string'||!c.content)return;
                if(ST.tree.some(x=>x.path===p))return;
                const nl=c.content.replace(/\r\n/g,'\n');
                ch.push({path:p,edit:nl,orig:'',sha:undefined,lines:diff('',nl),why:'新文件'});
                return;
              }
              if(!fromRetry&&Array.isArray(c.edits)&&c.edits.length){
                const r2=applyEdits(f.orig.replace(/\r\n/g,'\n'),c.edits);
                if(r2===null){failed.push(p);return}
                pushChange(f,r2);return;
              }
              if(typeof c.content=='string'&&c.content)pushChange(f,c.content.replace(/\r\n/g,'\n'));
            };
            (mod.files||[]).forEach(c=>handleMod(c,false));
            if(failed.length){
              d('补救 '+failed.length+' 个文件');
              const fix=pj(await ai([{role:'system',content:[...modeSystemLines(),'你是代码修改助手。上一次用查找替换的方式没能套用到部分文件，现在请直接给出这些文件修改后的完整内容。','必须保留原文件的完整内容，不能用省略号、占位符或说明文字代替代码。','只返回 JSON：{"files":[{"path":"真实文件路径","content":"修改后的完整文件内容"}]}，不要返回 Markdown 代码围栏。'].join('\n')},{role:'user',content:`用户需求：\n${text}\n\n修改说明：${mod.reply||''}\n\n需要修改的文件：\n${got.filter(f=>failed.includes(f.path)).map(f=>`===== FILE: ${f.path} =====\n${f.orig}\n===== END FILE =====`).join('\n\n')}`}]));
              (fix.files||[]).forEach(c=>handleMod(c,true));
            }
            d(ch.length+' FILES');

            const assistantReply=String(mod.reply||'已生成修改。');

            if(!ch.length){
              const noChangeReply='我读取了相关文件，但没有生成可以安全应用的修改，可以把需求描述得更具体些。';
              const noChangeText=String(mod.reply||'我看了一下，这次不需要改动任何文件。');say(bodyHTML([noChangeText]));commit(noChangeText,sel.thinking);
              
              stopMeta();busy=false;
              return;
            }

            const fullReply=assistantReply+'\n\n'+`共修改 ${ch.length} 个文件，点开卡片查看改动（红色是删除，绿色是新增）。确认后才会一起上传到 GitHub。`;
            showConfirm(ch,fullReply,sel.thinking);
          }catch(e){
            box.querySelectorAll('.step:not(.done)').forEach(x=>x.classList.add('fail'));
            if(e.name==='StopError'||(stopCtl&&stopCtl.signal.aborted)){toast('已停止调取');restore()}else{toast(e.message);restore();await explainError('操作失败：'+e.message)}
          }
          stopMeta();busy=false;
        }
        let lpT,lpX=0,lpY=0,lpAt=0;
        const IS=()=>host.classList.contains('sel');
        function clearMasks(){host.querySelectorAll('.mask').forEach(m=>m.remove())}
        function showMask(b){
          clearMasks();const m=document.createElement('div');m.className='mask';
          const isUser=b.classList.contains('urow');
          const hasMid=!!(b.dataset.mid||b.querySelector('[data-mid]'));
          const canEdit=isUser?hasMid:!!b.dataset.mid;
          m.innerHTML='<button data-a="back">重回</button>'+(hasMid?'<button data-a="copy">复制</button>':'')+(canEdit?'<button data-a="edit">编辑</button>':'')+'<button data-a="multi">多选删除</button>';
          (b.querySelector('.ucol')||b).appendChild(m);
          m.onclick=e=>{const a=e.target.dataset.a;if(!a)return;clearMasks();if(a=='back')rewind(b);else if(a=='copy')copyRow(b);else if(a=='edit')editRow(b);else enterSel(b)};
        }
        function copyText(t){
          const done=()=>toast('已复制');
          const fallback=()=>{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();done()};
          if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,fallback)}else fallback();
        }
        function copyRow(b){
          let t='';
          if(b.classList.contains('urow'))t=[...b.querySelectorAll('.bubble')].map(bubbleText).join('\n');
          else{const m=msgById(b.dataset.mid);t=m?(m.text||''):[...b.querySelectorAll('.abody')].map(bubbleText).join('\n')}
          copyText(t);
        }
        function editRow(b){
          const isArow=b.classList.contains('arow');
          const bs=[...b.querySelectorAll(isArow?'.abody':'.bubble .btxt')];
          if(!bs.length)return;
          b.classList.add('editing');
          bs.forEach(x=>x.contentEditable='true');bs[0].focus();
          const d=document.createElement('button');d.className='edone';d.textContent='完成';
          d.onclick=()=>{
            bs.forEach(x=>x.contentEditable='false');b.classList.remove('editing');d.remove();
            if(isArow){
              const m=msgById(b.dataset.mid);
              if(m){m.parts=bs.map(x=>bubbleText(x));m.text=m.parts.join('\n')}
              if(currentConversation)saveCurrentConversation();
              toast('已修改');
            }else{
              bs.forEach(x=>{const m=msgById(x.closest('.bubble').dataset.mid);if(m)m.text=bubbleText(x)});
              if(currentConversation)saveCurrentConversation();
              toast('已修改，点“重回”可按新内容重新回复');
            }
          };
          (b.querySelector('.ucol')||b).appendChild(d);
        }
        function mark(r){if(!pending.includes(r)){r.classList.add('pending');pending.push(r)}}
        function rewind(b){
          if(busy)return toast('对面正在回复，请稍候');
          const after=[];let n=b.nextElementSibling;
          while(n){after.push(n);n=n.nextElementSibling}
          forgetRows(b.classList.contains('arow')?[b,...after]:after);
          after.forEach(x=>{pending=pending.filter(r=>r!==x);x.remove()});
          if(b.classList.contains('arow')){const p=b.previousElementSibling;pending=pending.filter(r=>r!==b);b.remove();if(p&&p.classList.contains('urow'))mark(p)}
          else mark(b);
          scroll();run();
        }
        function upd(){$('#ar-selcount').textContent='已选 '+host.querySelectorAll('.picked').length+' 条'}
        function enterSel(b){host.classList.add('sel');b.classList.add('picked');upd()}
        function exitSel(){host.classList.remove('sel');host.querySelectorAll('.picked').forEach(x=>x.classList.remove('picked'))}
        $('#ar-seldel').onclick=()=>{const picked=[...host.querySelectorAll('.picked')];forgetRows(picked);picked.forEach(x=>{pending=pending.filter(r=>r!==x);x.remove()});exitSel();toast('已删除')};
        $('#ar-selcancel').onclick=exitSel;
        chat.addEventListener('pointerdown',e=>{
          if(IS()||e.target.closest('.mask,.editing'))return;
          const b=e.target.closest('.urow,.arow');if(!b)return;
          lpX=e.clientX;lpY=e.clientY;lpT=setTimeout(()=>{lpAt=Date.now();showMask(b)},550);
        });
        const stopLP=()=>clearTimeout(lpT);
        ['pointerup','pointercancel','pointerleave'].forEach(t=>chat.addEventListener(t,stopLP));
        chat.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-lpX)>8||Math.abs(e.clientY-lpY)>8)stopLP()});
        host.addEventListener('contextmenu',e=>{if(!e.target.closest('input,[contenteditable=true]'))e.preventDefault()});
        host.addEventListener('dragstart',e=>e.preventDefault());
        host.addEventListener('gesturestart',e=>e.preventDefault());
        host.addEventListener('click',e=>{
          if(Date.now()-lpAt<500){e.stopPropagation();e.preventDefault();return}
          if(IS()){const b=e.target.closest('.urow,.arow');if(b&&chat.contains(b)){e.stopPropagation();e.preventDefault();b.classList.toggle('picked');upd()}return}
          if(!e.target.closest('.mask'))clearMasks();
        },true);
        host.addEventListener('keydown',e=>{if(e.key=='Escape'){clearMasks();exitSel()}});
        $('#ar-send').onclick=send;$('#ar-fetch').onclick=()=>{if(busy){stopCtl&&stopCtl.abort();return}run()};
        setInterval(()=>{const f=$('#ar-fetch');const on=busy?'1':'0';if(f.dataset.on!==on){f.dataset.on=on;f.innerHTML=busy?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>':'调取';f.title=busy?'停止调取':'调取'}},120);
        input.addEventListener('keydown',e=>{if(e.key=='Enter'&&!e.isComposing){e.preventDefault();send()}});
        async function bootApplication(){
          if(!currentConversation){
            currentConversation=createConversation();
          }

          renderConversationHistory();
          setSide(false);

          try{
            await openDatabase();
            await loadStoredConversationHistory();
          }catch(error){
            toast(error.message);
          }
        }

        bootApplication();

        /* ---- 控制台：底栏上滑后出现，点开查看每一轮对面的原始输出 ---- */
        const consoleBtn=host.querySelector('#ar-console');
        const uploadBtn=host.querySelector('#ar-upload');
        const cgroup=host.querySelector('#ar-cgroup');
        const fileInput=host.querySelector('#ar-file');
        consoleBtn.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[0]}</svg>`;
        uploadBtn.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[0].replace('<path ','<path class="hrt" ')}<path d="M12 10v5M9.5 12.5h5"/></svg>`;
        uploadBtn.addEventListener('click',()=>fileInput.click());
        const ATT_MAX=200*1024;
        fileInput.addEventListener('change',async e=>{
          const picked=[...e.target.files];
          e.target.value='';
          for(const f of picked){
            if(pendingAttach.some(a=>a.name===f.name))continue;
            if(pendingAttach.length>=6){toast('一次最多 6 个附件');break}
            if(/\.zip$/i.test(f.name)){
              if(f.size>5*1024*1024){toast(`${f.name} 太大了（最大 5MB）`);continue}
              try{const zf=await readZip(await f.arrayBuffer());if(!zf.length){toast(`${f.name} 里没有可以读的文本文件`);continue}pendingAttach.push({name:f.name,type:'zip',files:zf})}
              catch(err){toast(`${f.name} 读不了：${err.message}`)}
              continue;
            }
            if(f.type.startsWith('image/')){
              try{pendingAttach.push({name:f.name,type:'image',dataUrl:await shrinkImage(f)})}
              catch(err){toast(`${f.name} 读不了`)}
              continue;
            }
            if(f.size>ATT_MAX){toast(`${f.name} 太大了（最大 200KB）`);continue}
            let text='';
            try{text=await f.text()}catch(err){toast(`${f.name} 读不了`);continue}
            if(text.includes('\u0000')){toast(`${f.name} 不是文本文件，暂不支持`);continue}
            pendingAttach.push({name:f.name,content:text.slice(0,60000)});
          }
          if(pendingAttach.length){
            input.placeholder=`已附加 ${pendingAttach.length} 个：${pendingAttach.map(a=>a.name).join('、')}`.slice(0,60);
            toast(`已附加 ${pendingAttach.length} 个，发送时一起带上`);renderUpPanel();
          }
        });
        const consoleSheet=host.querySelector('#ar-consoleSheet');
        let consoleIdx=-1;
        function consoleRoundsList(){
          const out=[];let acc=[];
          ((currentConversation&&currentConversation.messages)||[]).forEach(m=>{
            if(m.role==='user')acc.push(m.text);
            else if(m.role==='assistant'){out.push({msg:m,prompt:acc.join('\n')});acc=[]}
          });
          return out;
        }
        function consoleDetailHTML(r,i){
          const raws=r.msg.raw||[];
          const rawHTML=raws.length
            ?raws.map(x=>`<div class="ar-cd-raw"><div class="ar-cd-rl">${esc(x.label)}</div><pre>${esc(x.raw)}</pre></div>`).join('')
            :'<div class="ar-cd-none">（这一轮没有保存原始输出，可能是旧记录）</div>';
          return `<section class="ar-cd-sec"><h4>RAW OUTPUT · 原始输出</h4>${rawHTML}</section>`;
        }
        function renderConsole(){
          const rounds=consoleRoundsList();
          host.querySelector('#ar-consCount').textContent=rounds.length?`${rounds.length} ROUND${rounds.length>1?'S':''}`:'NO DATA';
          if(!rounds.length)consoleIdx=-1;
          else if(consoleIdx<0||consoleIdx>=rounds.length)consoleIdx=rounds.length-1;
          const sel=host.querySelector('#ar-consRounds');
          sel.innerHTML=rounds.map((r,i)=>`<button type="button" class="ar-cr${i===consoleIdx?' on':''}" data-i="${i}">${String(i+1).padStart(2,'0')}</button>`).join('');
          sel.querySelectorAll('button').forEach(b=>b.onclick=()=>{consoleIdx=+b.dataset.i;renderConsole()});
          host.querySelector('#ar-consDetail').innerHTML=rounds.length?consoleDetailHTML(rounds[consoleIdx],consoleIdx):'<div class="ar-cd-none">还没有对面的输出</div>';
        }
        function openConsole(){renderConsole();fadeSheet(consoleSheet,true)}
        consoleBtn.addEventListener('click',openConsole);
        host.querySelector('#ar-consClose').addEventListener('click',()=>fadeSheet(consoleSheet,false));
        consoleSheet.addEventListener('click',e=>{if(e.target.id==='ar-consoleSheet')fadeSheet(consoleSheet,false)});
        const bottomBar=host.querySelector('.bottom');
        /* ---- 待确认卡片：横向滑动文字时，才去掉省略号露出完整内容 ---- */
        host.addEventListener('scroll',e=>{
          const t=e.target;
          if(!t||!t.matches||!t.matches('.fitem .card b,.fitem .card em'))return;
          t.classList.toggle('scrolled',t.scrollLeft>0);
        },true);

        /* ---- 文件夹：点一下展开 / 收起 ---- */
        host.addEventListener('click',e=>{
          const h=e.target.closest&&e.target.closest('.fdir-head');
          if(!h)return;
          const open=!h.parentElement.classList.contains('open');
          h.parentElement.classList.toggle('open',open);
          h.setAttribute('aria-expanded',String(open));
        });

        /* ---- 重新打开后的修改卡片：展开，以及确认上传 ---- */
        host.addEventListener('click',e=>{
          const cardBtn=e.target.closest&&e.target.closest('.card.hc');
          if(cardBtn){cardBtn.parentElement.classList.toggle('open');return}
          const up=e.target.closest&&e.target.closest('.confirm-h');
          if(up&&!up.disabled){
            const row=up.closest('.arow');
            const m=msgById(row.dataset.mid);
            if(m&&m.changes)uploadChanges(m.changes,up,row.dataset.mid);
          }
        });

        /* ---- 文件卡片：点一下下载 zip ---- */
        host.addEventListener('click',e=>{
          const c=e.target.closest&&e.target.closest('.file-card');
          if(!c)return;
          const m=msgById(c.dataset.mid);
          if(!m||!m.files||!m.files.length)return;
          if(e.target.closest('.fc-alt'))eachDownload(m.files);else if(c.dataset.kind==='zip'){if(m.zipRaw)downloadRaw(m.zipRaw);else downloadZip(m.files)}else saveFolder(m.files);
        });

        host.querySelector('#ar-tokHelp').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fadeSheet(host.querySelector('#ar-tokGuide'),true)});
        host.querySelector('#ar-tokGuideClose').addEventListener('click',()=>fadeSheet(host.querySelector('#ar-tokGuide'),false));
        host.querySelector('#ar-tokGuide').addEventListener('click',e=>{if(e.target.id==='ar-tokGuide')fadeSheet(host.querySelector('#ar-tokGuide'),false)});

        /* ---- 思维链：点一下展开 / 收起 ---- */
        host.addEventListener('click',e=>{
          const p=e.target.closest&&e.target.closest('.arow .think > p');
          if(p){p.classList.toggle('open');e.stopPropagation()}
        });
        const gripBtn=host.querySelector('#ar-grip');
        gripBtn.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[0]}</svg>`;
        let swipe=null;
        const swipeStart=y=>{swipe={y,done:false}};
        const swipeMove=y=>{
          if(!swipe||swipe.done)return;
          const dy=y-swipe.y;
          if(dy<-28){cgroup.hidden=false;swipe.done=true}
          else if(dy>28){cgroup.hidden=true;swipe.done=true}
        };
        const swipeEnd=()=>{swipe=null};
        bottomBar.addEventListener('pointerdown',e=>swipeStart(e.clientY));
        bottomBar.addEventListener('touchstart',e=>swipeStart(e.touches[0].clientY),{passive:true});
        host.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')swipeMove(e.clientY)});
        host.addEventListener('touchmove',e=>{if(swipe)swipeMove(e.touches[0].clientY)},{passive:true});
        ['pointerup','pointercancel'].forEach(t=>host.addEventListener(t,swipeEnd));
        ['touchend','touchcancel'].forEach(t=>host.addEventListener(t,swipeEnd));
        gripBtn.addEventListener('click',e=>{e.stopPropagation();cgroup.hidden=!cgroup.hidden});

        /* ---- 设置：短消息模式 / 小尾巴 / 头像 / 退出 ---- */
        const UI_KEY='archangel.ui.v1';
        const uiCfg=()=>{try{return Object.assign({tail:'first',short:'on'},JSON.parse(localStorage.getItem(UI_KEY))||{})}catch(e){return {tail:'first',short:'on'}}};
        function applyTail(){const t=uiCfg().tail;host.dataset.tail=t;host.querySelectorAll('#ar-tailSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===t))}
        function setTail(v){const c=uiCfg();c.tail=v;localStorage.setItem(UI_KEY,JSON.stringify(c));applyTail()}
        function applyShortMode(){
          const s=uiCfg().short;
          host.dataset.short=s;
          host.querySelectorAll('#ar-shortSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===s));
        }
        function setShortMode(v){
          const c=uiCfg();
          c.short=v;
          localStorage.setItem(UI_KEY,JSON.stringify(c));
          applyShortMode();
        }
        function openSheet(o){
          const sh=host.querySelector('#ar-sheet');
          clearTimeout(sh._t);
          if(o){
            applyTail();
            applyShortMode();
            refreshSheetAvatars();
            sh.hidden=false;
            requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add('show')));
          }else{
            sh.classList.remove('show');
            sh._t=setTimeout(()=>{sh.hidden=true},240);
          }
        }
        function refreshSheetAvatars(){host.querySelector('#ar-sheetAvMe').src=avatarSrc('me');host.querySelector('#ar-sheetAvAi').src=avatarSrc('ai')}
        function setAvatarFile(role,file){
          if(!file)return;
          const fr=new FileReader();
          fr.onload=()=>{
            try{localStorage.setItem(AV_KEY[role],fr.result)}catch(e){toast('图片太大，请换一张小一点的');return}
            host.querySelectorAll('img[data-role="'+role+'"]').forEach(i=>i.src=fr.result);
            refreshSheetAvatars();toast('头像已更新');
          };
          fr.readAsDataURL(file);
        }
        host.querySelector('#ar-set').addEventListener('click',()=>openSheet(true));
        host.querySelector('#ar-sheetClose').addEventListener('click',()=>openSheet(false));
        host.querySelector('#ar-sheet').addEventListener('click',e=>{if(e.target.id==='ar-sheet')openSheet(false)});
        host.querySelectorAll('#ar-shortSeg button').forEach(b=>b.addEventListener('click',()=>setShortMode(b.dataset.v)));
        host.querySelectorAll('#ar-tailSeg button').forEach(b=>b.addEventListener('click',()=>setTail(b.dataset.v)));
        host.querySelector('#ar-avMe input').addEventListener('change',e=>setAvatarFile('me',e.target.files[0]));
        host.querySelector('#ar-avAi input').addEventListener('change',e=>setAvatarFile('ai',e.target.files[0]));
        host.querySelector('#ar-exit').addEventListener('click',()=>{openSheet(false);if(typeof closeApp==='function')closeApp()});
        initUpPanel();
        applyTail();applyShortMode();refreshSheetAvatars();
        const meInput=host.querySelector('#ar-meName');
        meInput.value=meName();
        meInput.addEventListener('change',()=>{
          const v=meInput.value.replace(/\s+/g,' ').trim().slice(0,12)||'我';
          meInput.value=v;
          try{localStorage.setItem('archangel.me.name',v)}catch(err){}
          host.querySelectorAll('.urow .pill').forEach(p=>{p.textContent=v});
          toast('名字已保存');
        });
        meInput.addEventListener('keydown',e=>{if(e.key==='Enter')meInput.blur()});

        /* ---- 开场：头像框 + 胶囊 + HI 字样 + 三个胶囊（点胶囊把提示词填进输入框） ---- */
        const INTRO_CHIPS=[['讲个小故事','讲一个关于萌主大教堂的小故事'],['帮我想个名字','帮我想一个好听的名字'],['陪我聊聊天','陪我聊聊天吧']];
        function showIntro(){
          if(chat.querySelector('.ar-intro'))return;
          const el=document.createElement('div');
          el.className='ar-intro';
          el.innerHTML=head(avatarHtml('ai'),'Archangel')
            +`<div class="ar-hi">「HI, I'm <span class="ar-name">Leila</span>」</div>`
            +`<div class="ar-chips">${INTRO_CHIPS.map(([label,prompt])=>`<button type="button" class="ar-chip" data-prompt="${prompt}">${label}</button>`).join('')}</div>`;
          el.querySelectorAll('.ar-chip').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.prompt;input.focus()}));
          chat.prepend(el);
        }
        function hideIntro(){chat.querySelector('.ar-intro')?.remove()}
        showIntro();

        /* ---- 点对面头像：选模式、编辑提示词 ---- */
        let modeTab=null;
        function fadeSheet(sh,o){
          clearTimeout(sh._t);
          if(o){sh.hidden=false;requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add('show')))}
          else{sh.classList.remove('show');sh._t=setTimeout(()=>{sh.hidden=true},240)}
        }
        function renderModeSheet(){
          const c=modeCfg(),m=MODES[c.mode],ta=host.querySelector('#ar-modeText');
          host.querySelectorAll('#ar-modeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===c.mode));
          host.querySelector('#ar-modeHint').textContent=c.mode==='work'?'工作天使默认没有提示词，可以自己写':(c.mode==='healer'?'治疗天使的提示词可以编辑，默认是温柔的心理陪伴设定':'辅助天使的提示词由你自己编辑');
          ta.value=c.prompts[c.mode]||'';
          ta.placeholder=c.mode==='work'?'写下工作天使的提示词…':(c.mode==='healer'?'写下治疗天使的提示词…':'写下辅助天使的提示词…');
          ta.readOnly=false;
          ta.disabled=false;
          ta.classList.remove('locked');
          host.querySelector('#ar-modeSave').disabled=false;
        }
        host.addEventListener('click',e=>{if(e.target.closest('.ahead .frame, .ar-intro .frame')){renderModeSheet();fadeSheet(host.querySelector('#ar-modeSheet'),true)}});
        host.querySelector('#ar-modeClose').addEventListener('click',()=>fadeSheet(host.querySelector('#ar-modeSheet'),false));
        host.querySelector('#ar-modeSheet').addEventListener('click',e=>{if(e.target.id==='ar-modeSheet')fadeSheet(host.querySelector('#ar-modeSheet'),false)});
        host.querySelectorAll('#ar-modeSeg button').forEach(b=>b.addEventListener('click',()=>{const c=modeCfg();c.mode=b.dataset.v;saveModeCfg(c);renderModeSheet()}));
        host.querySelector('#ar-modeSave').addEventListener('click',()=>{const c=modeCfg();c.prompts[c.mode]=host.querySelector('#ar-modeText').value;saveModeCfg(c);toast('已保存模式提示词')});

        /* ---- AI 接口：继承设置 API / 单独设置 API ---- */
        const API_SRC_KEY='archangel.api.source';
        const inheritApi=()=>{try{const v=JSON.parse(localStorage.getItem('forever_settings_active_api_v1'))||{};return {base:String(v.url||'').replace(/\/+$/,''),key:String(v.key||''),model:String(v.model||'')}}catch(e){return {base:'',key:'',model:''}}};
        function applyApiSource(){
          const src=localStorage.getItem(API_SRC_KEY)==='inherit'?'inherit':'own', inh=inheritApi(), own=ld(K.a,{});
          host.querySelectorAll('#ar-apiSrc button').forEach(b=>b.classList.toggle('on',b.dataset.src===src));
          const inherit=src==='inherit';
          const base=host.querySelector('#ar-aBase'),key=host.querySelector('#ar-aKey'),model=host.querySelector('#ar-aModel');
          const chosen=localStorage.getItem('archangel.api.inheritModel')||inh.model;
          base.disabled=inherit;key.disabled=inherit;
          host.querySelector('#ar-aSave').disabled=inherit;
          host.querySelector('#ar-aFetch').disabled=false;
          model.disabled=false;
          if(inherit){
            base.value=inh.base;key.value=inh.key;
            const list=ld('archangel.api.inheritModels',[]);
            const opts=[...new Set([chosen,...(Array.isArray(list)?list:[])].filter(Boolean))];
            if(opts.length)model.innerHTML=opts.map(x=>`<option>${esc(x)}</option>`).join('');
            if(chosen)model.value=chosen;
          }else{base.value=own.base||'https://api.openai.com/v1';key.value=own.key||''}
          host.querySelector('#ar-apiSrcInfo').textContent=inherit
            ?(chosen?`正在使用手机设置里的 API（${chosen}）`:'手机设置里还没有 API，请先在设置里保存')
            :'正在使用单独设置的 API';
        }
        host.querySelectorAll('#ar-apiSrc button').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(API_SRC_KEY,b.dataset.src);applyApiSource()}));
        applyApiSource();

        async function chatText(msgs){
          const a=A();
          const short=uiCfg().short==='on';
          const go=j=>req(a.base+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+a.key,'Content-Type':'application/json'},body:JSON.stringify({model:a.model,stream:true,messages:msgs,temperature:.8,...(j?{response_format:{type:'json_object'}}:{})})},AI_TIMEOUT);
          let r=await go(true);if(!r.ok)r=await go(false);
          if(!r.ok)throw new Error('AI 请求失败（HTTP '+r.status+'）：'+await err(r));
          const d=await readAiResponse(r);runTokens+=(d.usage&&d.usage.total_tokens)||0;
          const m=d.choices?.[0]?.message;if(!m)throw new Error('AI 没有返回内容');
          const rawOut=Array.isArray(m.content)?m.content.map(p=>p.text||'').join(''):(m.content||'');runLog.push({label:'聊天输出',raw:String(rawOut)});

          // 模型把思考写在 <think>…</think> / <thinking>…</thinking> 里时，取出来当思维链，并从正文里去掉
          const tagged=[];
          const raw=String(rawOut).replace(/<(think|thinking)>([\s\S]*?)<\/\1>/gi,(_m,_t,inner)=>{tagged.push(inner.trim());return ''}).trim();

          let thinking=typeof m.reasoning_content==='string'?m.reasoning_content.trim():'';
          if(!thinking&&tagged.length)thinking=tagged.join('\n').trim();

          const toList=(v,max,len)=>(Array.isArray(v)?v:[v]).map(x=>String(x??'').trim()).filter(Boolean).slice(0,max).map(x=>x.slice(0,len));
          let steps=[];let files=[];let pack='';
          let parts=null;
          try{
            const o=pj(raw);
            if(o&&typeof o==='object'){
              if(!thinking&&typeof o.thinking==='string')thinking=o.thinking.trim();
              if(Array.isArray(o.steps))steps=toList(o.steps,4,28);
              if(typeof o.pack==='string')pack=o.pack.trim();
              if(Array.isArray(o.files)||Array.isArray(o.outFiles)){
                const cn=n=>String(n||'').replace(/\\/g,'/').split('/').filter(x=>x&&x!=='.'&&x!=='..').join('/').slice(0,120)||'file.txt';
                files=[...(Array.isArray(o.files)?o.files:[]),...(Array.isArray(o.outFiles)?o.outFiles:[])].filter(f=>f&&(f.type==='folder'||/\/$/.test(String(f.name||''))||typeof f.content==='string')).map(cleanOutFile).slice(0,30);
              }
              if(o.reply!==undefined){
                const p=toList(o.reply,6,2000);
                if(p.length)parts=p;
              }
            }
          }catch(e){}
          if(!parts){
            const t=raw;
            const lines=short?t.split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,6):[];
            parts=lines.length>1?lines:[t||'（模型没有返回内容）'];
          }
          const ex=await expandZips(files);
          return {thinking,steps,parts,files:ex.files,pack:ex.zipRaw?'zip':pack,zipRaw:ex.zipRaw};
        }

    };
})();
