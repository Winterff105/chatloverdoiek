// 统一获取公网 IP：优先站内 /api/ip（服务器端读取），失败再用第三方
async function getClientIP() {
    try {
        const r = await fetch('/api/ip', { cache: 'no-store' });
        const d = await r.json();
        if (d && d.ip && d.ip !== '未知') return d.ip;
    } catch(e) {}
    try {
        const r = await fetch('https://api.ipify.org?format=json');
        const d = await r.json();
        if (d && d.ip) return d.ip;
    } catch(e) {}
    return '未知';
}

// ================= Whatever 小手机前置认证门禁控制器 =================
(function initSanctuaryGate() {
    const SUPABASE_URL = "https://tjgxfyblzgqwxwfwvfol.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ3hmeWJsemdxd3h3Znd2Zm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDQ0ODEsImV4cCI6MjEwODM4MDQ4MX0.BtNqx4DIoXQBCU7sPxlSonrfwY-rnrmxlfqQX8H7dLE";
    
    // 初始化 SDK
    const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    // 注入门禁 DOM 结构
    const gateHTML = `
        <div class="sanctuary-gate-portal" id="sanctuaryGatePortal">
            <div class="gate-card-pod">
                <div class="gate-avatar-halo">
                    <img src="assets/杂七杂八/开头头像.jpg" class="gate-avatar-img" id="gateUserAvatar" alt="avatar" onerror="this.src='assets/杂七杂八/开头头像.jpg'">
                </div>
                
                <div style="text-align:center;">
                    <div style="font-size:12px; font-weight:700; letter-spacing:1px; color:#fff;">WHATEVER ACCESS</div>
                    <div style="font-size:7.5px; color:#787886; letter-spacing:1.2px; text-transform:uppercase; margin-top:2px;">Seraphim Identity Gateway</div>
                </div>

                <div class="gate-mode-switch-row">
                    <button type="button" class="gate-tab-btn active" id="tabGateLogin">密码登录</button>
                    <button type="button" class="gate-tab-btn" id="tabGateActivate">激活设密</button>
                    <button type="button" class="gate-tab-btn" id="tabGateVoucher">兑换时长</button>
                </div>

                <!-- 表单容器 C：输入群福利加时凭证 -->
                <div class="gate-field-group" id="formPodVoucher" style="display: none;">
                    <div class="gate-input-wrapper">
                        <input type="text" class="gate-text-input" id="vouchInputQQ" placeholder="输入您的 QQ 号...">
                    </div>
                    <div class="gate-input-wrapper">
                        <input type="text" class="gate-text-input" id="vouchInputCode" placeholder="输入群发放的加时凭证码...">
                    </div>
                    <button type="button" class="gate-action-btn-main" id="btnActionRedeem">REDEEM TIME →</button>
                </div>

                <!-- 表单容器 A：已激活用户密码直接登录 -->
                <div class="gate-field-group" id="formPodLogin">
                    <div class="gate-input-wrapper">
                        <input type="text" class="gate-text-input" id="loginInputQQ" placeholder="输入已通过审核的 QQ 号...">
                    </div>
                    <div class="gate-input-wrapper">
                        <input type="password" class="gate-text-input" id="loginInputPwd" placeholder="输入您的登录密码...">
                    </div>
                    <button type="button" class="gate-action-btn-main" id="btnActionLogin">LOG IN →</button>
                </div>

                <!-- 表单容器 B：初次使用获取 QQ 邮箱验证码并设置独立密码 -->
                <div class="gate-field-group" id="formPodActivate" style="display: none;">
                    <div class="gate-input-wrapper">
                        <input type="text" class="gate-text-input" id="actInputQQ" placeholder="输入已通过审核的 QQ 号...">
                    </div>
                    <div class="gate-input-wrapper">
                        <input type="text" class="gate-text-input" id="actInputCode" placeholder="输入激活码 (如 WH-...)">
                        <button type="button" class="gate-send-code-btn" id="btnSendMailCode">发送激活码</button>
                    </div>
                    <div class="gate-input-wrapper">
                        <input type="password" class="gate-text-input" id="actInputNewPwd" placeholder="设置您的小手机登录密码...">
                    </div>
                    <button type="button" class="gate-action-btn-main" id="btnActionActivate">ACTIVATE & ENTER →</button>
                </div>

                <div class="gate-toast-pill" id="gateToastNotice">
                    * 仅限通过前台资质审核并经管理员同意的 QQ 号登录使用
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', gateHTML);

    const portal = document.getElementById('sanctuaryGatePortal');
    const tabLogin = document.getElementById('tabGateLogin');
    const tabActivate = document.getElementById('tabGateActivate');
    const formLogin = document.getElementById('formPodLogin');
    const formActivate = document.getElementById('formPodActivate');
    const gateUserAvatar = document.getElementById('gateUserAvatar');
    const gateToast = document.getElementById('gateToastNotice');

    const loginQQ = document.getElementById('loginInputQQ');
    const loginPwd = document.getElementById('loginInputPwd');
    const btnLogin = document.getElementById('btnActionLogin');

    const actQQ = document.getElementById('actInputQQ');
    const actCode = document.getElementById('actInputCode');
    const actPwd = document.getElementById('actInputNewPwd');
    const btnSendCode = document.getElementById('btnSendMailCode');
    const btnActivate = document.getElementById('btnActionActivate');

    // 本地持久化凭据自动快速免登
    const localSavedAuth = localStorage.getItem('whatever_phone_auth');
    if (localSavedAuth) {
        try {
            const authObj = JSON.parse(localSavedAuth);
            if (authObj && authObj.qq && authObj.token) {
                // 已有合法登录记录，平滑解锁进入小手机
                unlockPortal();
            }
        } catch(e) {}
    }

    function setToast(msg, isError = false) {
        gateToast.textContent = msg;
        gateToast.style.color = isError ? '#ff6b6b' : '#92929e';
    }

    // 启动小手机真实心跳与时长累计上报引擎
    function startUserHeartbeat(qq) {
        if (!supabase) return;
        
        // 探测设备系统与真实公网 IP
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const osName = isIOS ? 'iOS' : 'Android';

        async function pulse() {
            try {
                let clientIP = "未知";
                clientIP = await getClientIP();

                // 查询当前已有分钟数
                const { data } = await supabase.from('member_durations').select('duration').eq('qq', qq).limit(1);
                let curDur = 0;
                if (data && data.length > 0) curDur = data[0].duration || 0;

                // 每发一次心跳加 1 分钟时长并刷新最后心跳时间
                await supabase.from('member_durations').upsert({
                    qq: qq,
                    os: osName,
                    duration: curDur + 1,
                    last_heartbeat: new Date().toISOString(),
                    ip: clientIP,
                    updated_at: new Date().toISOString()
                });
                window.__pulseN = (window.__pulseN || 0) + 1;
                if (window.__pulseN % 5 === 1) {
                    const myId = localStorage.getItem('whatever_device_fingerprint');
                    const { data: cred } = await supabase.from('auth_credentials').select('bound_devices').eq('qq', qq).limit(1);
                    const list = (cred && cred[0] && Array.isArray(cred[0].bound_devices)) ? cred[0].bound_devices : [];
                    const me = list.find(d => d.id === myId);
                    if (me) {
                        me.ip = clientIP;
                        me.last_active = new Date().toISOString();
                        await supabase.from('auth_credentials').update({ bound_devices: list }).eq('qq', qq);
                    }
                }
            } catch(e) {}
        }

        // 登录立即打点一次
        pulse();
        // 之后每 60 秒发送一次心跳
        setInterval(pulse, 60000);
    }

    // ================= 小手机进入后必须阅读15秒的高定严肃免责声明 =================
    function showDisclaimerGate(onAgreed) {
        const modal = document.createElement('div');
        modal.id = 'sanctuaryDisclaimerModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(4,4,6,0.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Plus Jakarta Sans",-apple-system,sans-serif;opacity:0;transition:opacity 0.35s cubic-bezier(0.16,1,0.3,1);';
        
        modal.innerHTML = `
            <style>
                @keyframes angelSheetPop {
                    0% { transform: scale(0.92) translateY(16px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                
                .ar-disclaim-card {
                    position: relative;
                    width: 100%;
                    max-width: 326px;
                    background: #ffffff;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 26px;
                    padding: 22px 18px 16px;
                    color: #111116;
                    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.28);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    animation: angelSheetPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
                }

                .ar-script-title {
                    font-family: "Cinzel Decorative", "Italiana", "Cormorant Garamond", serif;
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    color: #111116;
                    text-align: center;
                    line-height: 1.1;
                    margin-bottom: 2px;
                }
                .ar-script-sub {
                    font-size: 8.5px;
                    letter-spacing: 1.5px;
                    color: #888894;
                    text-transform: uppercase;
                    text-align: center;
                    font-weight: 600;
                }

                .ar-seg-row {
                    display: flex;
                    gap: 5px;
                    padding: 3.5px;
                    border-radius: 999px;
                    background: #f2f2f6;
                    box-sizing: border-box;
                    margin: 2px 0 4px;
                }
                .ar-seg-btn {
                    flex: 1;
                    border: none;
                    border-radius: 999px;
                    padding: 6px 0;
                    background: transparent;
                    color: #666672;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.25s ease;
                }
                .ar-seg-btn.active {
                    background: #ffffff;
                    color: #111116;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    font-weight: 700;
                }

                .ar-stamp-box {
                    position: relative;
                    border: 1px dashed #d8d8e2;
                    background: #fbfbfd;
                    border-radius: 14px;
                    padding: 16px 13px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .ar-stamp-tag {
                    position: absolute;
                    top: -7px;
                    left: 14px;
                    background: #111116;
                    color: #ffffff;
                    font-size: 7.5px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    padding: 1.5px 7px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .ar-stamp-hint {
                    font-size: 8.5px;
                    color: #8e8e9c;
                    letter-spacing: 0.2px;
                    margin-bottom: 2px;
                }

                .ar-section-content {
                    min-height: 180px;
                    max-height: 40vh;
                    overflow-y: auto;
                    display: none;
                    flex-direction: column;
                    gap: 8px;
                    padding-right: 2px;
                }
                .ar-section-content.active {
                    display: flex;
                }
                .ar-section-content::-webkit-scrollbar { width: 3px; }
                .ar-section-content::-webkit-scrollbar-thumb { background: #d0d0dc; border-radius: 999px; }

                .ar-clause-para {
                    font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft JhengHei", "Noto Serif SC", sans-serif;
                    font-size: 9.8px;
                    line-height: 1.75;
                    letter-spacing: 0.35px;
                    font-weight: 400;
                    color: #484852;
                    text-align: justify;
                    text-justify: inter-ideograph;
                }
                
                .ar-hl {
                    background: #f4f4f8;
                    color: #1a1a22;
                    font-weight: 600;
                    padding: 1px 5px;
                    border-radius: 999px;
                    border: none;
                    letter-spacing: 0.2px;
                    box-decoration-break: clone;
                    -webkit-box-decoration-break: clone;
                }

                .ar-clause-header {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-bottom: 4px;
                }

                .ar-clause-num {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #18181e;
                    color: #ffffff;
                    font-size: 8px;
                    font-weight: 600;
                    font-family: "Cinzel Decorative", "Cormorant Garamond", serif;
                    flex-shrink: 0;
                    line-height: 1;
                }

                .ar-clause-title {
                    font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif;
                    font-size: 10.5px;
                    font-weight: 600;
                    color: #16161d;
                    letter-spacing: 0.4px;
                }

                .ar-modal-foot {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-top: 4px;
                }
                .ar-btn-main {
                    width: 100%;
                    height: 38px;
                    border-radius: 999px;
                    background: #e6e6ed;
                    color: #92929e;
                    border: none;
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    transition: all 0.25s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    cursor: not-allowed;
                }
                .ar-btn-main.ready {
                    background: #111116 !important;
                    color: #ffffff !important;
                    cursor: pointer !important;
                    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.22);
                }
                .ar-btn-main.ready:active {
                    transform: scale(0.97);
                }
            </style>
            
            <div class="ar-disclaim-card">
                
                <div>
                    <div class="ar-script-title">Sanctuary Protocol</div>
                    <div class="ar-script-sub">Seraphim Archive · 准入与免责协议</div>
                </div>

                <!-- 三大板块独立切换区 -->
                <div class="ar-seg-row" id="arSegRow">
                    <button type="button" class="ar-seg-btn active" data-sec="sec1">用户知情 (1/3)</button>
                    <button type="button" class="ar-seg-btn" data-sec="sec2">版权溯源 (2/3)</button>
                    <button type="button" class="ar-seg-btn" data-sec="sec3">法律隔离 (3/3)</button>
                </div>

                <div class="ar-stamp-box">
                    <span class="ar-stamp-tag" id="arStampTag">ZONE 1</span>
                    <div class="ar-stamp-hint" id="arStampHint">系统正在按顺序轮播展示条款，可随时点击上方切换阅读：</div>
                    
                    <!-- 分区 1：用户知情 -->
                    <div class="ar-section-content active" id="sec1">
                        <div class="ar-clause-header">
                            <span class="ar-clause-num">1</span>
                            <span class="ar-clause-title">准入资质与心理健康绝对免责</span>
                        </div>
                        <div class="ar-clause-para">
                            进入并使用本小手机系统，<span class="ar-hl">即默认您确认为年满 18 周岁成年女性，且具备完全民事行为能力与健全心智</span>。
                        </div>
                        <div class="ar-clause-para">
                            使用者明确知悉本项目仅供私人娱乐、虚构角色扮演（AI RP）与文学沉浸互动使用。对话内容均为算法根据提示词演变生成的虚构拟态文本，绝非现实映照。
                        </div>
                        <div class="ar-clause-para">
                            若在交互过程中因 AI 生成内容诱发任何心理焦虑、情绪依赖、崩溃或现实认知混淆等极端生理与心理不适，<span class="ar-hl">均由使用者本人独立审慎承担，开发者及管理团队在法律与道德层面均不承担任何连带责任、心理干预义务或赔偿责任</span>。
                        </div>
                    </div>

                    <!-- 分区 2：版权溯源与自研归属 -->
                    <div class="ar-section-content" id="sec2">
                        <div class="ar-clause-header">
                            <span class="ar-clause-num">2</span>
                            <span class="ar-clause-title">视觉素材溯源与侵权归责申明</span>
                        </div>
                        <div class="ar-clause-para">
                            本项目内所搜集、展示的部分非原创 UI 装饰素材、意境插图及设计背景，<span class="ar-hl">均来源整理于 Pinterest 等公开网络设计交流平台</span>，版权归属原作者所有。本项目仅作非营利性技术展示交流，无任何商业侵权蓄意。
                        </div>
                        <div class="ar-clause-para">
                            若相关权利方对素材引用提出异议，<span class="ar-hl">核实后开发者承诺第一时间无条件彻底删除下架并郑重公开赔礼道歉</span>。<span class="ar-hl">坚决杜绝任何未经授权的恶意溶图、拼贴冒充原创、或私自将他人画作投喂进 AI 训练等侵害原作者合法权益的不良行径</span>。
                        </div>
                        <div class="ar-clause-header" style="margin-top: 10px;">
                            <span class="ar-clause-num">3</span>
                            <span class="ar-clause-title">原创 UI 与底层源码知识产权保护</span>
                        </div>
                        <div class="ar-clause-para">
                            本项目的<span class="ar-hl">全套原创 UI 视觉体系、排版布局、自研架构逻辑以及底层协同源码，均属开发者独立投入心力构筑的智力成果</span>。严禁任何个人或第三方组织进行逆向工程、源码扒取、换壳二开、盗用牟利，<span class="ar-hl">严禁倒卖、二传、二贩或私自打包流传</span>。一经核实，开发者将全平台公开侵权者信息并永久吊销通行权限。
                        </div>
                    </div>

                    <!-- 分区 3：法律隔离与底线申明 -->
                    <div class="ar-section-content" id="sec3">
                        <div class="ar-clause-header">
                            <span class="ar-clause-num">4</span>
                            <span class="ar-clause-title">内容自律、破限交互与法律边界隔离</span>
                        </div>
                        <div class="ar-clause-para">
                            使用者在使用第三方模型 API 接口交互过程中，<span class="ar-hl">所有自行输入诱导、越狱破限、所触及的任何 NSFW（成人限制级情节）或触犯公序良俗与法律底线的言论</span>，纯系使用者个人单方意志与第三方模型独立生成的虚构产物。
                        </div>
                        <div class="ar-clause-para">
                            开发者及管理员团队从未参与、从未诱导，<span class="ar-hl">因个人违规行为引发的一切法律责任、行政处罚或纠纷后果，均由使用者自行独立全额承担，与开发者及管理人员无任何干涉与关联</span>。
                        </div>
                    </div>
                </div>

                <div class="ar-modal-foot">
                    <button type="button" id="btnAgreeDisclaimer" class="ar-btn-main">
                        仔细阅读完整条款 (15s)
                    </button>
                    <div style="font-size:8px;color:#92929e;text-align:center;">
                        * 必须阅读满 15 秒并确认同意方可登入小手机
                    </div>
                </div>

            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.style.opacity = '1');

        const secBtns = modal.querySelectorAll('.ar-seg-btn');
        const sections = [modal.querySelector('#sec1'), modal.querySelector('#sec2'), modal.querySelector('#sec3')];
        const stampTag = modal.querySelector('#arStampTag');

        // 分区手动与轮播切换逻辑
        function switchSection(index) {
            secBtns.forEach((btn, idx) => btn.classList.toggle('active', idx === index));
            sections.forEach((sec, idx) => sec.classList.toggle('active', idx === index));
            stampTag.textContent = `ZONE ${index + 1}`;
        }

        let hasUserManuallySwitched = false;

        secBtns.forEach((btn, idx) => {
            btn.onclick = () => {
                hasUserManuallySwitched = true; // 只要点击过一次，立刻永久停止轮播
                switchSection(idx);
            };
        });

        // 15 秒倒计时；若未手动切换，则每 5 秒自动轮播一次
        let remainingSeconds = 15;
        let isAgreementReady = false;
        const btnAgree = modal.querySelector('#btnAgreeDisclaimer');

        const countdownInterval = setInterval(() => {
            remainingSeconds--;
            
            // 未手动点击过才自动轮播
            if (!hasUserManuallySwitched) {
                if (remainingSeconds === 10) {
                    switchSection(1);
                } else if (remainingSeconds === 5) {
                    switchSection(2);
                }
            }

            if (remainingSeconds > 0) {
                btnAgree.textContent = `仔细阅读完整条款 (${remainingSeconds}s)`;
            } else {
                clearInterval(countdownInterval);
                isAgreementReady = true;
                btnAgree.classList.add('ready');
                btnAgree.textContent = '我已满 18 周岁并同意协议 →';
            }
        }, 1000);

        // 原生可靠点击事件绑定
        btnAgree.onclick = function() {
            if (!isAgreementReady) return;
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                if (typeof onAgreed === 'function') onAgreed();
            }, 350);
        };
    }

    // 门禁解锁成功后，退场并在进入桌面时强制激活15秒免责声明
    function unlockPortal(authedQQ) {
        if (authedQQ) startUserHeartbeat(authedQQ);
        portal.classList.add('unlocked');
        setTimeout(() => {
            portal.remove();
            // 唤起强制15秒免责声明，完全同意后才放行开屏动画与主界面
            showDisclaimerGate(() => {
                if (typeof window.startPhotoLoader === 'function') {
                    window.startPhotoLoader();
                } else if (document.getElementById('photoLoaderScreen')) {
                    const loader = document.getElementById('photoLoaderScreen');
                    loader.style.display = 'flex';
                }
            });
        }, 600);
    }

    // 选项卡切换
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabActivate.classList.remove('active');
        formLogin.style.display = 'flex';
        formActivate.style.display = 'none';
        setToast("* 输入 QQ 与密码直接进入");
    });

    const tabVoucher = document.getElementById('tabGateVoucher');
    const formVoucher = document.getElementById('formPodVoucher');
    const vouchQQ = document.getElementById('vouchInputQQ');
    const vouchCode = document.getElementById('vouchInputCode');
    const btnRedeem = document.getElementById('btnActionRedeem');

    // 统一三个选项卡的互斥切换
    function switchGateTab(targetTab) {
        // 重置所有 Tab 高亮
        tabLogin.classList.remove('active');
        tabActivate.classList.remove('active');
        if (tabVoucher) tabVoucher.classList.remove('active');

        // 隐藏所有表单
        formLogin.style.display = 'none';
        formActivate.style.display = 'none';
        if (formVoucher) formVoucher.style.display = 'none';

        if (targetTab === 'login') {
            tabLogin.classList.add('active');
            formLogin.style.display = 'flex';
            setToast("* 输入 QQ 与密码直接进入");
        } else if (targetTab === 'activate') {
            tabActivate.classList.add('active');
            formActivate.style.display = 'flex';
            setToast("* 初次进入：获取 QQ 邮箱激活码并设立密码");
        } else if (targetTab === 'voucher') {
            if (tabVoucher) tabVoucher.classList.add('active');
            if (formVoucher) formVoucher.style.display = 'flex';
            setToast("* 输入管理员投喂的全员福利凭证码增加时长");
        }
    }

    tabLogin.addEventListener('click', () => switchGateTab('login'));
    tabActivate.addEventListener('click', () => switchGateTab('activate'));
    if (tabVoucher) {
        tabVoucher.addEventListener('click', () => switchGateTab('voucher'));
    }

    if (btnRedeem) {
        btnRedeem.addEventListener('click', async () => {
            const qq = vouchQQ.value.trim();
            const code = vouchCode.value.trim().toUpperCase();

            if (!qq || !code) {
                setToast("请输入 QQ 号和凭证兑换码！", true);
                return;
            }

            btnRedeem.textContent = "REDEEMING...";
            try {
                // 查询该凭证是否存在且有效
                const { data, error } = await supabase
                    .from('time_vouchers')
                    .select('*')
                    .eq('code', code)
                    .eq('is_active', true)
                    .limit(1);

                if (error || !data || data.length === 0) {
                    setToast("凭证码不存在或已过期！", true);
                    btnRedeem.textContent = "REDEEM TIME →";
                    return;
                }

                const voucher = data[0];
                const claimedList = voucher.claimed_by || [];

                if (claimedList.includes(qq)) {
                    setToast("您已领取过该凭证，不可重复兑换！", true);
                    btnRedeem.textContent = "REDEEM TIME →";
                    return;
                }

                // 查出该成员已有数据
                const { data: memberData } = await supabase.from('member_durations').select('duration').eq('qq', qq).limit(1);
                const curDur = (memberData && memberData.length > 0) ? (memberData[0].duration || 0) : 0;
                const newDur = curDur + voucher.bonus_minutes;

                // 1. 给该 QQ 加时长
                await supabase.from('member_durations').upsert({
                    qq: qq,
                    duration: newDur,
                    status: 'normal',
                    updated_at: new Date().toISOString()
                });

                // 2. 将该 QQ 加入已领取列表防刷
                claimedList.push(qq);
                await supabase.from('time_vouchers').update({ claimed_by: claimedList }).eq('code', code);

                setToast(`兑换成功！已为您增加 +${voucher.bonus_minutes} 分钟时长！`);
                btnRedeem.textContent = "SUCCESS ✓";
            } catch(e) {
                setToast("兑换失败，请检查网络！", true);
                btnRedeem.textContent = "REDEEM TIME →";
            }
        });
    }

    // QQ 输入框输入时自动切换预览头像（支持 test+QQ 测试号，如 test12345678 自动解析 12345678 头像）
    function bindAvatarPreview(inputEl) {
        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim();
            const pureQQ = val.toLowerCase().startsWith('test') ? val.slice(4) : val;
            if (pureQQ.length >= 5 && !isNaN(pureQQ)) {
                gateUserAvatar.src = `https://q1.qlogo.cn/g?b=qq&nk=${pureQQ}&s=100`;
            } else {
                gateUserAvatar.src = 'assets/杂七杂八/开头头像.jpg';
            }
        });
    }
    bindAvatarPreview(loginQQ);
    bindAvatarPreview(actQQ);

    // 1. 发送邮箱激活码逻辑
    let countdownTimer = null;
    // 1. 发送激活码：由 Supabase 生成并发送邮件（邮件模板里需包含 {{ .Token }}）
    btnSendCode.addEventListener('click', async () => {
        const qq = actQQ.value.trim();
        if (!qq || qq.length < 5 || isNaN(qq)) {
            setToast("请输入正确的 QQ 号码", true);
            return;
        }

        btnSendCode.disabled = true;
        setToast("正在核验审核白名单并发送邮件...");

        try {
            // 核对 applications 表该 QQ 是否通过了审核
            const { data: appData, error: appErr } = await supabase
                .from('applications')
                .select('id')
                .eq('applicant_qq', qq)
                .eq('status', 'approved')
                .limit(1);

            if (appErr || !appData || appData.length === 0) {
                setToast("该 QQ 尚未通过审核或未提交，禁止激活！", true);
                btnSendCode.disabled = false;
                return;
            }

            const email = `${qq}@qq.com`;
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true }
            });

            if (error) {
                console.error(error);
                setToast("激活码发送失败：" + error.message, true);
                btnSendCode.disabled = false;
                return;
            }

            setToast(`激活码已发送至 ${email}，请查收（如未收到请检查垃圾箱）`);

            // 倒计时
            let seconds = 60;
            btnSendCode.textContent = `${seconds}s`;
            clearInterval(countdownTimer);
            countdownTimer = setInterval(() => {
                seconds--;
                btnSendCode.textContent = `${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(countdownTimer);
                    btnSendCode.disabled = false;
                    btnSendCode.textContent = "重新获取";
                }
            }, 1000);
        } catch (err) {
            console.error(err);
            setToast("网络异常，无法核验", true);
            btnSendCode.disabled = false;
        }
    });

    // 2. 激活并首次设置密码：由 Supabase 校验激活码
    btnActivate.addEventListener('click', async () => {
        const qq = actQQ.value.trim();
        const code = actCode.value.trim();
        const pwd = actPwd.value.trim();

        if (!qq || !code || !pwd) {
            setToast("请完整填写 QQ、激活码及新密码！", true);
            return;
        }

        btnActivate.textContent = "VERIFYING...";
        try {
            const email = `${qq}@qq.com`;
            const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });

            if (error) {
                setToast("激活码不正确或已过期，请重新获取", true);
                btnActivate.textContent = "ACTIVATE & ENTER →";
                return;
            }

            // 激活码校验通过，保存密码并标记已激活
            const { error: credErr } = await supabase
                .from('auth_credentials')
                .upsert({
                    qq: qq,
                    email: email,
                    password_hash: pwd,
                    is_activated: true,
                    last_login_at: new Date().toISOString()
                });

            if (credErr) {
                console.error(credErr);
                setToast("保存密码失败，请稍后重试", true);
                btnActivate.textContent = "ACTIVATE & ENTER →";
                return;
            }

            localStorage.setItem('whatever_phone_auth', JSON.stringify({ qq, token: btoa(qq + ':' + pwd) }));
            setToast("激活并设置密码成功，正在进入...");
            setTimeout(() => unlockPortal(qq), 500);
        } catch (e) {
            console.error(e);
            setToast("系统故障，无法完成激活", true);
            btnActivate.textContent = "ACTIVATE & ENTER →";
        }
    });

    // 3. 登录判定（专属规则：仅 3793947089ismy 可免密秒通，若若/猫猫羽/79 等其余管理员均必须走发码与激活流程）
    btnLogin.addEventListener('click', async () => {
        const qq = loginQQ.value.trim();
        const pwd = loginPwd.value.trim();

        if (!qq) {
            setToast("请输入 QQ 号！", true);
            return;
        }

        // 仅限苦临潭(开发者本人)特权暗号秒通
        if (qq === "3793947089ismy" || (qq === "3793947089" && pwd === "3793947089ismy")) {
            setToast("开发者【苦临潭】身份确认，免审直通中...");
            localStorage.setItem('whatever_phone_auth', JSON.stringify({ qq: "3793947089", token: "super_root" }));
            setTimeout(unlockPortal, 400);
            return;
        }

        if (!pwd) {
            setToast("请输入登录密码！", true);
            return;
        }

        btnLogin.textContent = "LOGGING IN...";
        try {
            const { data, error } = await supabase
                .from('auth_credentials')
                .select('*')
                .eq('qq', qq)
                .limit(1);

            if (error || !data || data.length === 0) {
                setToast("该账号未激活，请先点击上方【激活与设置密码】", true);
                btnLogin.textContent = "LOG IN →";
                return;
            }

            const user = data[0];
            if (!user.is_activated) {
                setToast("账号尚未激活，请先获取激活码激活", true);
                btnLogin.textContent = "LOG IN →";
                return;
            }

            if (user.password_hash !== pwd) {
                setToast("密码错误，请重新输入！", true);
                btnLogin.textContent = "LOG IN →";
                return;
            }

            // ================= 严格设备风控：限绑2个浏览器，超额阻断上报 =================
            function getBrowserFingerprint() {
                let did = localStorage.getItem('whatever_device_fingerprint');
                if (!did) {
                    did = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
                    localStorage.setItem('whatever_device_fingerprint', did);
                }
                return did;
            }

            const currentDevice = getBrowserFingerprint();
            const boundDevices = Array.isArray(user.bound_devices) ? user.bound_devices : [];

            // 检查当前浏览器是否已在白名单内
            const isKnownDevice = boundDevices.some(d => d.id === currentDevice);
            let loginIP = "未知";
            loginIP = await getClientIP();
            const loginNow = new Date().toISOString();

            if (!isKnownDevice) {
                // 如果是新设备，且已有设备数已满 2 个，阻断并上报给管理员确认
                if (boundDevices.length >= 2) {
                    btnLogin.textContent = "WAITING AUDIT...";
                    
                    // 获取当前网络公网 IP
                    let clientIP = "未知";
                    clientIP = await getClientIP();

                    // 向后台推送换绑审批申请单
                    await supabase.from('device_requests').insert([{
                        applicant_qq: qq,
                        device_fingerprint: currentDevice,
                        user_agent: navigator.userAgent,
                        ip: clientIP,
                        status: 'pending'
                    }]);

                    setToast("尝试绑定第三个浏览器 已发送给管理员确认 请向管理员说明", true);
                    return;
                } else {
                    // 未满 2 个，自动将当前浏览器登记为新设备
                    boundDevices.push({
                        id: currentDevice,
                        ua: navigator.userAgent,
                        ip: loginIP,
                        last_active: loginNow,
                        bound_at: loginNow
                    });
                    await supabase.from('auth_credentials').update({
                        bound_devices: boundDevices
                    }).eq('qq', qq);
                }
            }

            if (isKnownDevice) {
                const updated = boundDevices.map(d => d.id === currentDevice ? { ...d, ip: loginIP, last_active: loginNow } : d);
                await supabase.from('auth_credentials').update({ bound_devices: updated }).eq('qq', qq);
            }

            // 登录成功
            await supabase
                .from('auth_credentials')
                .update({ last_login_at: new Date().toISOString() })
                .eq('qq', qq);

            localStorage.setItem('whatever_phone_auth', JSON.stringify({ qq, token: btoa(qq + ':' + pwd) }));
            setToast("登录验证通过，正在进入...");
            setTimeout(() => unlockPortal(qq), 400);
        } catch (e) {
            setToast("登录核验超时", true);
            btnLogin.textContent = "LOG IN →";
        }
    });
})();
