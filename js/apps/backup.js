/* =======================================================
   Data Vault 备份应用核心逻辑 (js/apps/backup.js)
   包含拍立得洗照片交互、GitHub 恢复/备份与 WebGL 液态玻璃
   ======================================================= */

(function () {
    const BK_CFG_KEY = 'bk_github_cfg_v1';
    const BK_LAST_KEY = 'bk_last_backup_v1';
    const BK_JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    const BK_WALLPAPER_URL = encodeURI('assets/app/备份壁纸.jpg');

    let bkMode = 'stream';
    let bkSelectedRemote = null;
    let toastTimer = null;
    let isBusy = false;
    let zipLoadPromise = null;

    /* ---------- 界面 HTML 结构 ---------- */
    function getBackupAppHTML() {
        return `
        <div class="bk-root" id="bkAppRoot">
            <style>
                .bk-root * { box-sizing: border-box; }
                .bk-root {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    width: 100vw;
                    height: 100vh;
                    height: 100dvh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    overflow-x: hidden;
                    overflow-y: auto;
                    isolation: isolate;
                    background: #09090b;
                    color: #696d73;
                    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, "Microsoft YaHei", sans-serif;
                    -webkit-font-smoothing: antialiased;
                    padding-bottom: 0;
                }

                .bk-root::after {
                    content: "";
                    position: fixed;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                    background:
                        linear-gradient(
                            180deg,
                            rgba(0, 0, 0, 0.24) 0%,
                            rgba(0, 0, 0, 0.08) 32%,
                            rgba(0, 0, 0, 0.18) 100%
                        );
                }
                .bk-root button, .bk-root input { font-family: inherit; }
                .bk-root button { -webkit-tap-highlight-color: transparent; }
                .bk-wall-layer {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center center;
                    pointer-events: none;
                    opacity: 0.92;
                    filter: saturate(1.08) brightness(0.82) contrast(1.04);
                }
                .bk-head {
                    position: sticky; top: 0; z-index: 50; width: 100%; min-height: 68px; display: flex; align-items: center;
                    gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.22);
                    background: linear-gradient(135deg, rgba(16, 17, 19, 0.82), rgba(42, 43, 47, 0.66));
                    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.24);
                    backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); isolation: isolate;
                }
                .bk-head::before {
                    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
                    background: linear-gradient(115deg, rgba(255, 255, 255, 0.2), transparent 28%, rgba(255, 255, 255, 0.035) 63%, rgba(255, 255, 255, 0.13)), radial-gradient(circle at 18% 0, rgba(255, 255, 255, 0.12), transparent 28%);
                }
                .bk-head::after {
                    content: ""; position: absolute; left: 0; right: 0; bottom: -7px; height: 7px; z-index: 51; pointer-events: none;
                    background: radial-gradient(circle at 50% 0, rgba(255, 255, 255, 0.28) 4.2px, transparent 4.8px) 0 0 / 14px 7px repeat-x, radial-gradient(circle at 50% 0, rgba(0, 0, 0, 0.58) 5px, transparent 5.6px) 0 0 / 14px 7px repeat-x;
                }
                .bk-back {
                    width: 40px; height: 40px; flex: none; display: grid; place-items: center; border: 1px solid rgba(255, 255, 255, 0.28);
                    border-radius: 50%; color: #f1f1f2; background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.045));
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 5px 15px rgba(0, 0, 0, 0.24); cursor: pointer;
                    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); transition: transform 0.15s ease;
                }
                .bk-back:active { transform: scale(0.95); }
                .bk-back svg { width: 18px; height: 18px; }
                .bk-titles { min-width: 0; flex: 1; }
                .bk-title { display: block; color: #f2f2f3; font-size: 15px; font-weight: 700; letter-spacing: 0.08em; }
                .bk-sub { display: block; margin-top: 1px; color: #afb1b6; font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase; }
                .bk-head-badge {
                    display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid rgba(255, 255, 255, 0.24);
                    border-radius: 999px; color: #e8e8e9; font-size: 9px; background: rgba(255, 255, 255, 0.1);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16); backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%);
                }
                .bk-head-badge .dot { width: 5px; height: 5px; border-radius: 50%; background: #a9c0ad; box-shadow: 0 0 8px rgba(169, 192, 173, 0.5); }
                .bk-main {
                    position: relative;
                    z-index: 10;
                    flex: 0 0 auto;
                    width: min(100%, 440px);
                    min-height: calc(100dvh - 68px);
                    margin: 0 auto;
                    padding: 17px 18px 120px;
                    isolation: isolate;
                    background: transparent;
                }
                .bk-main::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    z-index: -1;
                    pointer-events: none;
                    background:
                        radial-gradient(
                            ellipse at 50% 35%,
                            rgba(0, 0, 0, 0.28) 0%,
                            rgba(0, 0, 0, 0.22) 34%,
                            rgba(0, 0, 0, 0.14) 62%,
                            rgba(0, 0, 0, 0.04) 84%,
                            transparent 100%
                        );
                }

                .bk-stats,
                .bk-section-label,
                .bk-card,
                .bk-sample-note {
                    position: relative;
                    z-index: 2;
                }

                .bk-stats {
                    background: rgba(17, 17, 18, 0.48);
                    border-color: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(16px) saturate(145%);
                    -webkit-backdrop-filter: blur(16px) saturate(145%);
                }

                .bk-card {
                    background: rgba(10, 10, 11, 0.5);
                    border-color: rgba(255, 255, 255, 0.28);
                    backdrop-filter: blur(18px) saturate(145%);
                    -webkit-backdrop-filter: blur(18px) saturate(145%);
                }

                .bk-camera-card {
                    background: rgba(10, 10, 11, 0.54);
                }

                .bk-status-card {
                    background: rgba(12, 12, 13, 0.48);
                }

                .bk-git-panel {
                    background: rgba(10, 10, 11, 0.54);
                }

                .bk-dock {
                    z-index: 60;
                    background: linear-gradient(
                        145deg,
                        rgba(58, 58, 61, 0.58),
                        rgba(9, 9, 11, 0.62)
                    );
                }

                .bk-root .lg-cv {
                    z-index: 0;
                }

                .bk-root .lg > *:not(.lg-cv) {
                    position: relative;
                    z-index: 1;
                }

                .bk-root button:disabled {
                    opacity: 0.55;
                    cursor: wait;
                }
                .bk-stats {
                    position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 8px 6px;
                    border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 16px; background: rgba(17, 17, 18, 0.62);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.17), 0 8px 24px rgba(0, 0, 0, 0.16);
                    backdrop-filter: blur(20px) saturate(145%); -webkit-backdrop-filter: blur(20px) saturate(145%); margin-bottom: 12px;
                }
                .bk-stat { position: relative; text-align: center; }
                .bk-stat:not(:last-child)::after { content: ""; position: absolute; top: 20%; right: 0; bottom: 20%; width: 1px; background: rgba(255, 255, 255, 0.2); }
                .bk-stat b { display: block; color: #f1f1f2; font-size: 13px; font-weight: 700; }
                .bk-stat span { display: block; margin-top: 2px; color: #b9bbc0; font-size: 8px; }
                .bk-section-label { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; margin: 7px 2px 6px; color: #e2e2e2; font-size: 9px; font-weight: 650; letter-spacing: 0.1em; }
                .bk-section-label::before { content: ""; width: 5px; height: 5px; border: 1px solid #bcbcbc; border-radius: 50%; }
                .bk-section-label::after { content: ""; height: 1px; flex: 1; background: linear-gradient(90deg, rgba(255, 255, 255, 0.42), transparent); }
                .bk-card {
                    position: relative; z-index: 2; border: 1px solid rgba(255, 255, 255, 0.19); border-radius: 18px;
                    background: rgba(10, 10, 11, 0.72); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 12px 32px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(22px) saturate(145%); -webkit-backdrop-filter: blur(22px) saturate(145%); margin-bottom: 12px;
                }
                .bk-card-heading { display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); }
                .bk-card-heading strong { color: #e8e8ea; font-size: 9px; font-weight: 650; letter-spacing: 0.06em; }
                .bk-card-heading code { color: #b7b8bc; font-size: 7px; font-family: ui-monospace, monospace; }
                .bk-camera-card { padding: 12px 13px 11px; overflow: hidden; }
                .bk-camera-stage { position: relative; display: flex; min-height: 180px; align-items: flex-end; justify-content: center; padding-top: 34px; isolation: isolate; }
                .bk-paper-slot { position: absolute; top: 29px; z-index: 5; width: 100px; height: 6px; border-radius: 99px; background: #555555; pointer-events: none; }
                .bk-polaroid {
                    position: absolute; top: 29px; left: 50%; z-index: 3; width: 82px; height: 94px; padding: 5px 5px 9px;
                    border: 1px solid #dedede; border-radius: 3px; background: #ffffff; opacity: 0; pointer-events: none;
                    transform: translate(-50%, 13px) rotate(2deg); transition: transform 0.65s cubic-bezier(0.2, 0.75, 0.25, 1), opacity 0.3s ease;
                }
                .bk-polaroid.eject { opacity: 1; transform: translate(-50%, -35px) rotate(-3deg); pointer-events: auto; cursor: pointer; }
                .bk-polaroid-image { height: 60px; display: grid; place-items: center; overflow: hidden; border: 1px solid #eeeeee; border-radius: 2px; background: linear-gradient(135deg, #e7e7e7, #fafafa); }
                .bk-polaroid-image svg { width: 22px; height: 22px; color: #929292; }
                .bk-sample-stamp { position: absolute; top: 7px; right: 7px; z-index: 2; display: flex; align-items: center; gap: 3px; padding: 3px 5px; border: 1px solid #e5e9e6; border-radius: 999px; color: #707070; font-size: 6px; background: rgba(255, 255, 255, 0.96); }
                .bk-sample-stamp i { width: 3px; height: 3px; border-radius: 50%; background: #888888; }
                .bk-polaroid-caption { margin-top: 4px; overflow: hidden; color: #777777; font-size: 6px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
                .bk-camera-body {
                    position: relative; z-index: 4; width: min(100%, 256px); padding: 10px 12px 11px; border: 1px solid rgba(255, 255, 255, 0.27);
                    border-radius: 22px; background: linear-gradient(145deg, rgba(92, 92, 96, 0.62), rgba(17, 17, 19, 0.82));
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), inset 0 -12px 25px rgba(0, 0, 0, 0.2), 0 12px 26px rgba(0, 0, 0, 0.22); overflow: hidden;
                }
                .bk-camera-body::before { content: ""; position: absolute; inset: 5px; z-index: 1; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 18px; pointer-events: none; }
                .bk-camera-body::after { content: ""; position: absolute; inset: 0; z-index: 2; border-radius: inherit; pointer-events: none; background: repeating-linear-gradient(135deg, transparent 0, transparent 4px, rgba(220, 220, 220, 0.09) 4px, rgba(220, 220, 220, 0.09) 5px); }
                .bk-camera-star { position: absolute; z-index: 5; color: rgba(255, 255, 255, 0.8); line-height: 1; pointer-events: none; text-shadow: 0 0 8px rgba(255, 255, 255, 0.25); }
                .bk-camera-star.s1 { top: 12px; left: 51px; font-size: 9px; }
                .bk-camera-star.s2 { top: 53px; left: 24px; font-size: 7px; color: rgba(255, 255, 255, 0.56); }
                .bk-camera-star.s3 { right: 24px; top: 54px; font-size: 8px; color: rgba(255, 255, 255, 0.72); }
                .bk-camera-star.s4 { bottom: 15px; left: 31px; font-size: 7px; color: rgba(255, 255, 255, 0.56); }
                .bk-camera-star.s5 { right: 31px; bottom: 15px; font-size: 7px; }
                .bk-camera-top { position: relative; z-index: 4; display: flex; align-items: center; justify-content: space-between; padding: 0 7px 7px; }
                .bk-flash { width: 17px; height: 10px; border: 1px solid rgba(255, 255, 255, 0.38); border-radius: 3px; background: rgba(255, 255, 255, 0.14); transition: background 0.12s, box-shadow 0.12s; }
                .bk-flash.lit { background: #ffffff; box-shadow: 0 0 18px 7px rgba(255, 255, 255, 0.54); }
                .bk-finder { width: 11px; height: 11px; border: 2px solid rgba(255, 255, 255, 0.58); border-radius: 50%; background: rgba(0, 0, 0, 0.68); }
                .bk-camera-serial { color: #d0d0d2; font: 6px/1 ui-monospace, monospace; letter-spacing: 0.12em; }
                .bk-lens-assembly { position: relative; z-index: 4; width: 78px; height: 78px; display: grid; place-items: center; margin: 0 auto; }
                .bk-lens-ticks { position: absolute; inset: 0; border: 1px solid rgba(255, 255, 255, 0.48); border-radius: 50%; background: repeating-conic-gradient(from -2deg, transparent 0deg 8deg, rgba(255, 255, 255, 0.62) 8.5deg 9deg, transparent 9.5deg 15deg); -webkit-mask: radial-gradient(circle, transparent 0 33px, #000 34px 38px, transparent 39px); mask: radial-gradient(circle, transparent 0 33px, #000 34px 38px, transparent 39px); pointer-events: none; }
                .bk-lens {
                    position: relative; z-index: 6; width: 61px; height: 61px; display: grid; place-items: center; margin: 0; padding: 0;
                    border: 3px solid rgba(255, 255, 255, 0.82); border-radius: 50%; background: radial-gradient(circle at 34% 28%, rgba(145, 145, 150, 0.94), rgba(45, 45, 49, 0.95) 53%, rgba(5, 5, 6, 0.98));
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.46), inset 0 1px 7px rgba(255, 255, 255, 0.22), 0 5px 16px rgba(0, 0, 0, 0.42);
                    cursor: pointer; touch-action: manipulation;
                }
                .bk-lens:active { transform: scale(0.96); }
                .bk-lens svg { position: relative; z-index: 1; width: 21px; height: 21px; color: #f1f1f1; pointer-events: none; }
                .bk-camera-rule { position: relative; z-index: 4; width: 100%; height: 1px; margin-top: 8px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.36) 18%, rgba(255, 255, 255, 0.36) 82%, transparent); }
                .bk-camera-buttons { position: relative; z-index: 7; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 9px; }
                .bk-camera-btn {
                    min-height: 30px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 0 6px;
                    border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 999px; color: #f0f0f1; font-size: 8px; font-weight: 600;
                    background: linear-gradient(140deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.065)); cursor: pointer; touch-action: manipulation;
                }
                .bk-camera-btn svg { width: 11px; height: 11px; pointer-events: none; }
                .bk-camera-btn.pink { border-color: rgba(255, 255, 255, 0.34); color: #f5f5f5; background: linear-gradient(140deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08)); }
                .bk-camera-btn:active { transform: scale(0.97); }
                .bk-sample-note { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 7px; color: #dedede; font-size: 7.5px; }
                .bk-sample-note svg { width: 11px; height: 11px; flex: none; }
                .bk-status-card { padding: 10px 12px; background: rgba(12, 12, 13, 0.65); }
                .bk-status-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; color: #c4c4c6; font-size: 8px; }
                .bk-status-top strong { color: #eeeeee; font-weight: 600; }
                .bk-progress { height: 4px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, 0.17); }
                .bk-progress-fill { width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #bcbcbc, #f0f0f0); transition: width 0.3s ease; }
                .bk-log {
                    margin-top: 8px; padding: 7px 9px; border: 1px solid rgba(255, 255, 255, 0.17); border-radius: 9px;
                    color: #d1d1d2; font: 7.5px/1.6 ui-monospace, monospace; white-space: pre-wrap; word-break: break-all;
                    background: rgba(0, 0, 0, 0.52); min-height: 42px;
                }
                .bk-git-panel { display: none; padding: 12px; animation: bkFade 0.2s ease both; }
                .bk-git-panel.active { display: block; }
                @keyframes bkFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
                .bk-fields { display: grid; gap: 5px; margin-top: 9px; }
                .bk-field { min-height: 33px; display: flex; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid rgba(255, 255, 255, 0.23); border-radius: 999px; background: rgba(0, 0, 0, 0.34); }
                .bk-field label { width: 49px; flex: none; color: #d0d0d1; font-size: 8.5px; }
                .bk-field input { width: 100%; min-width: 0; border: 0; outline: 0; color: #f2f2f2; font-size: 9px; text-align: right; background: transparent; }
                .bk-field input::placeholder { color: #999999; }
                .bk-mode-switch { display: flex; margin: 8px 0 7px; padding: 2px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 999px; background: rgba(0, 0, 0, 0.38); }
                .bk-mode-switch button { flex: 1; min-height: 26px; border: 0; border-radius: 999px; color: #c5c5c7; font-size: 8px; background: transparent; cursor: pointer; }
                .bk-mode-switch button.active { color: #171719; background: rgba(255, 255, 255, 0.94); box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2); }
                .bk-git-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
                .bk-git-btn { min-height: 32px; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; color: #eeeeee; font-size: 8.5px; font-weight: 600; background: rgba(255, 255, 255, 0.1); cursor: pointer; touch-action: manipulation; }
                .bk-git-btn.push { border-color: rgba(255, 255, 255, 0.34); color: #ffffff; background: rgba(255, 255, 255, 0.17); }
                .bk-git-btn.read, .bk-git-btn.restore { border-color: rgba(255, 255, 255, 0.28); color: #eeeeee; background: rgba(255, 255, 255, 0.12); }
                .bk-remote-list { display: grid; gap: 5px; margin-top: 9px; }
                .bk-remote-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border: 1px solid rgba(255, 255, 255, 0.17); border-radius: 10px; color: #e7e7e8; font-size: 8px; background: rgba(0, 0, 0, 0.35); cursor: pointer; }
                .bk-remote-item.selected { border-color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.12); }
                .bk-remote-item span:last-child { color: #bcbcc0; font-size: 7px; }
                .bk-dock {
                    position: fixed; left: 50%; bottom: 15px; z-index: 60; display: flex; align-items: center; gap: 3px; padding: 5px;
                    border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 999px; background: linear-gradient(145deg, rgba(58, 58, 61, 0.78), rgba(9, 9, 11, 0.86));
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.19);
                    backdrop-filter: blur(24px) saturate(155%); -webkit-backdrop-filter: blur(24px) saturate(155%); transform: translateX(-50%); isolation: isolate;
                }
                .bk-dock button {
                    position: relative; z-index: 1; min-height: 34px; display: flex; align-items: center; gap: 5px; padding: 0 12px;
                    border: 0; border-radius: 999px; color: #d0d0d2; font-size: 9px; background: transparent; cursor: pointer; white-space: nowrap;
                }
                .bk-dock button svg { width: 13px; height: 13px; pointer-events: none; }
                .bk-dock button.active { color: #171719; background: linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(220, 220, 222, 0.88)); box-shadow: inset 0 1px 0 #ffffff, 0 2px 7px rgba(0, 0, 0, 0.22); }
                .bk-dock .exit { padding: 0 10px; color: #d0d0d2; }
                .bk-toast {
                    position: fixed; left: 50%; bottom: 68px; z-index: 70; padding: 7px 13px; border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 999px; color: #ffffff; font-size: 9px; background: rgba(24, 24, 26, 0.82); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
                    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); opacity: 0; pointer-events: none; transform: translate(-50%, 6px);
                    transition: opacity 0.2s ease, transform 0.2s ease;
                }
                .bk-toast.show { opacity: 1; transform: translate(-50%, 0); }
                @media (max-width: 380px) {
                    .bk-main { padding-right: 12px; padding-left: 12px; }
                    .bk-camera-body { width: min(100%, 238px); padding-right: 10px; padding-left: 10px; }
                    .bk-camera-btn { font-size: 7.5px; }
                    .bk-dock button { padding-right: 9px; padding-left: 9px; }
                }
            </style>

            <img class="bk-wall-layer" id="bkWallImg" src="${BK_WALLPAPER_URL}" alt="备份背景" onerror="this.style.display='none'">

            <header class="bk-head" id="bkHeader">
                <button class="bk-back" id="bkBtnBack" aria-label="返回">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m15 18-6-6 6-6"></path>
                    </svg>
                </button>
                <div class="bk-titles">
                    <div class="bk-title">备份</div>
                    <div class="bk-sub">Data Vault · 数据备份与恢复</div>
                </div>
                <div class="bk-head-badge">
                    <i class="dot"></i>
                    <span id="bkHeadStatus">暗房就绪</span>
                </div>
            </header>

            <main class="bk-main">
                <div class="bk-stats">
                    <div class="bk-stat">
                        <b id="bkItemCount">0</b>
                        <span>LOCAL ENTRIES</span>
                    </div>
                    <div class="bk-stat">
                        <b id="bkItemSize">0 KB</b>
                        <span>STORAGE SIZE</span>
                    </div>
                    <div class="bk-stat">
                        <b id="bkLastTime">NEVER</b>
                        <span>LAST ARCHIVE</span>
                    </div>
                </div>

                <div class="bk-section-label">
                    <span class="bk-burst-tag l1"><i>#01</i> MEMORY CAPSULE</span>
                    <span class="bk-burst-script">Archive Snapshot</span>
                </div>

                <section class="bk-card bk-camera-card" id="bkLocalPanel">
                    <span class="bk-watermark-bg">DARKROOM</span>
                    <div class="bk-card-heading">
                        <div class="bk-head-group">
                            <strong class="bk-eng-title">POLAROID ARCHIVE</strong>
                            <span class="bk-sub-badge">SNAPSHOT LAB</span>
                        </div>
                        <code>SYS.REV // 001</code>
                    </div>

                    <div class="bk-camera-stage">
                        <div class="bk-paper-slot"></div>
                        <div class="bk-polaroid" id="bkPolaroid">
                            <span class="bk-sample-stamp"><i></i> PRINTED</span>
                            <div class="bk-polaroid-image"></div>
                            <div class="bk-polaroid-caption" id="bkPaperCaption">SNAPSHOT.ZIP</div>
                        </div>

                        <div class="bk-camera-body">
                            <span class="bk-camera-star s1">✦</span>
                            <span class="bk-camera-star s2">✧</span>
                            <span class="bk-camera-star s3">✦</span>
                            <span class="bk-camera-star s4">✦</span>
                            <span class="bk-camera-star s5">✧</span>

                            <div class="bk-camera-top">
                                <span class="bk-flash" id="bkFlash"></span>
                                <span class="bk-camera-serial">DV-01 // 24 EXP</span>
                                <span class="bk-finder"></span>
                            </div>

                            <div class="bk-lens-assembly">
                                <i class="bk-lens-ticks"></i>
                                <button class="bk-lens bk-heart-lens" id="bkLensBtn" type="button" aria-label="快门导出备份">
                                    <svg class="bk-heart-cutout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span class="bk-heart-glow"></span>
                                </button>
                            </div>

                            <div class="bk-camera-rule"></div>

                            <div class="bk-camera-buttons">
                                <button class="bk-camera-btn" id="bkBtnShootExport" type="button">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 4v11"></path>
                                        <path d="m7.5 10.5 4.5 4.5 4.5-4.5"></path>
                                        <path d="M5 19h14"></path>
                                    </svg>
                                    <span>EXPORT SHOT</span>
                                </button>
                                <button class="bk-camera-btn pink" id="bkBtnInsertImport" type="button">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 15V4"></path>
                                        <path d="m7.5 8.5 4.5-4.5 4.5 4.5"></path>
                                        <path d="M5 19h14"></path>
                                    </svg>
                                    <span>IMPORT FILM</span>
                                </button>
                            </div>
                            <div class="bk-export-ext-panel" id="bkExportExtPanel">
                                <span class="bk-export-ext-title">导出范围</span>
                                <div class="bk-export-ext-btns">
                                    <button class="bk-camera-btn bk-ext-btn" id="bkBtnScopeAll" type="button">全部数据</button>
                                    <button class="bk-camera-btn pink bk-ext-btn" id="bkBtnScopeDesktop" type="button">桌面与美化</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bk-sample-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m5 12 4 4L19 6"></path>
                        </svg>
                        <span id="bkSuccessMsg">Awaiting trigger. Tap the heart aperture to print snapshot.</span>
                    </div>
                    <input id="bkFileInput" type="file" accept=".zip,application/zip" hidden>
                </section>

                <div class="bk-section-label">
                    <span class="bk-burst-tag l2"><i>#02</i> SYNC METRICS</span>
                    <span class="bk-burst-script">Progress Monitor</span>
                </div>

                <section class="bk-card bk-status-card">
                    <span class="bk-watermark-bg">STATUS</span>
                    <div class="bk-card-heading">
                        <div class="bk-head-group">
                            <strong class="bk-eng-title">TELEMETRY & LOG</strong>
                            <span class="bk-sub-badge">LIVE THREAD</span>
                        </div>
                        <code>SYS.STAT</code>
                    </div>
                    <div class="bk-status-top">
                        <span id="bkProgressLabel">STANDBY</span>
                        <strong id="bkProgressPercent">0%</strong>
                    </div>
                    <div class="bk-progress">
                        <div class="bk-progress-fill" id="bkProgressFill"></div>
                    </div>
                    <div class="bk-log" id="bkLogOut">Data engine synchronized. Ready for backup dispatch.</div>
                </section>

                <section class="bk-card bk-git-panel" id="bkGitPanel">
                    <span class="bk-watermark-bg">REMOTE</span>
                    <div class="bk-card-heading">
                        <div class="bk-head-group">
                            <strong class="bk-eng-title">GITHUB REPOSITORY</strong>
                            <span class="bk-sub-badge">CLOUD SYNC</span>
                        </div>
                        <code>REMOTE VAULT</code>
                    </div>

                    <div class="bk-fields">
                        <div class="bk-field">
                            <label for="bkGhOwner">用户名</label>
                            <input id="bkGhOwner" placeholder="GitHub 用户名 / 组织名">
                        </div>
                        <div class="bk-field">
                            <label for="bkGhRepo">仓库名</label>
                            <input id="bkGhRepo" placeholder="备份存储的仓库名称">
                        </div>
                        <div class="bk-field">
                            <label for="bkGhBranch">分支</label>
                            <input id="bkGhBranch" value="main">
                        </div>
                        <div class="bk-field">
                            <label for="bkGhPath">保存目录</label>
                            <input id="bkGhPath" value="backup">
                        </div>
                        <div class="bk-field">
                            <label for="bkGhToken">Token</label>
                            <input id="bkGhToken" type="password" placeholder="ghp_… / github_pat_…">
                        </div>
                    </div>

                    <div class="bk-mode-switch" id="bkModeSwitch">
                        <button class="active" type="button" data-mode="stream">逐文件流式</button>
                        <button type="button" data-mode="bundle">整包 ZIP</button>
                    </div>

                    <div class="bk-git-actions">
                        <button class="bk-git-btn" id="bkBtnSaveGit" type="button">保存配置</button>
                        <button class="bk-git-btn push" id="bkBtnUploadGit" type="button">推送备份</button>
                        <button class="bk-git-btn read" id="bkBtnListGit" type="button">读取远程备份</button>
                        <button class="bk-git-btn restore" id="bkBtnRestoreGit" type="button">恢复所选版本</button>
                    </div>

                    <div class="bk-remote-list" id="bkRemoteList">
                        <div class="bk-remote-item">
                            <span>尚未读取远程备份</span>
                            <span>点击读取</span>
                        </div>
                    </div>
                </section>
            </main>

            <nav class="bk-dock" id="bkDockBar" aria-label="页面切换">
                <button class="active" id="bkDockLocal" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="4"></rect>
                        <path d="M3 9h18"></path>
                        <path d="M9 21V9"></path>
                    </svg>
                    <span>本地</span>
                </button>
                <button id="bkDockGit" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="4"></circle>
                        <path d="M12 2v6"></path>
                        <path d="M12 16v6"></path>
                        <path d="m4.93 4.93 4.24 4.24"></path>
                        <path d="m14.83 14.83 4.24 4.24"></path>
                    </svg>
                    <span>GitHub</span>
                </button>
                <button class="exit" id="bkDockExit" type="button" aria-label="返回桌面">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <path d="m16 17 5-5-5-5"></path>
                        <path d="M21 12H9"></path>
                    </svg>
                </button>
            </nav>

            <div class="bk-toast" id="bkToastNotice" role="status"></div>
        </div>
        `;
    }

    /* ---------- 工具函数 ---------- */
    function showToast(msg) {
        const el = document.getElementById('bkToastNotice');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
    }

    function setLog(msg) {
        const el = document.getElementById('bkLogOut');
        if (el) el.textContent = msg;
    }

    function appendLog(msg) {
        const el = document.getElementById('bkLogOut');
        if (el) {
            el.textContent += '\n' + msg;
            el.scrollTop = el.scrollHeight;
        }
    }

    function setProgress(percent, label) {
        const p = Math.max(0, Math.min(100, percent));
        const fill = document.getElementById('bkProgressFill');
        const pct = document.getElementById('bkProgressPercent');
        const lbl = document.getElementById('bkProgressLabel');
        if (fill) fill.style.width = p + '%';
        if (pct) pct.textContent = Math.round(p) + '%';
        if (lbl && label) lbl.textContent = label;
    }

    function setBusy(busy) {
        isBusy = busy;
        const ids = [
            'bkLensBtn', 'bkBtnShootExport', 'bkBtnInsertImport',
            'bkBtnSaveGit', 'bkBtnUploadGit', 'bkBtnListGit', 'bkBtnRestoreGit'
        ];
        ids.forEach(id => {
            const b = document.getElementById(id);
            if (b) b.disabled = busy;
        });
    }

    function formatTime(iso) {
        if (!iso) return '从未';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '从未';
        const p = n => String(n).padStart(2, '0');
        return `${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function collectLocalStorage() {
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            items.push({ key: k, value: localStorage.getItem(k) });
        }
        return items;
    }

    function refreshStats() {
        const items = collectLocalStorage();
        const bytes = items.reduce((s, it) => s + (it.key.length + (it.value || '').length) * 2, 0);
        const countEl = document.getElementById('bkItemCount');
        const sizeEl = document.getElementById('bkItemSize');
        const lastEl = document.getElementById('bkLastTime');

        if (countEl) countEl.textContent = items.length;
        if (sizeEl) sizeEl.textContent = bytes > 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.ceil(bytes / 1024)) + ' KB';
        if (lastEl) lastEl.textContent = formatTime(localStorage.getItem(BK_LAST_KEY));
    }

    function loadJSZip() {
        if (window.JSZip) return Promise.resolve(window.JSZip);
        if (zipLoadPromise) return zipLoadPromise;
        zipLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = BK_JSZIP_URL;
            s.onload = () => resolve(window.JSZip);
            s.onerror = () => reject(new Error('JSZip 加载失败，请检查网络'));
            document.body.appendChild(s);
        }).catch(err => {
            zipLoadPromise = null;
            throw err;
        });
        return zipLoadPromise;
    }

    function safeFileName(key, idx) {
        return String(idx).padStart(4, '0') + '_' + String(key).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60) + '.json';
    }

    function stamp() {
        const d = new Date(), p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    }

    async function buildZipBlob(items, onProgress) {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const manifest = {
            app: 'Whatever Backup',
            version: 1,
            createdAt: new Date().toISOString(),
            count: items.length,
            entries: []
        };
        items.forEach((it, idx) => {
            const file = 'data/' + safeFileName(it.key, idx);
            manifest.entries.push({ key: it.key, file });
            zip.file(file, JSON.stringify(it));
        });
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, meta => {
            if (onProgress) onProgress(meta.percent);
        });
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    function playShutterSound() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
            osc.onended = () => ctx.close();
        } catch (_) {}
    }

    /* ---------- 本地拍立得相机导出与导入 ---------- */
    function toggleExportExtension() {
        const panel = document.getElementById('bkExportExtPanel');
        if (panel) panel.classList.toggle('open');
    }

    function isDesktopThemeKey(k) {
        const key = String(k || '').toLowerCase();
        return key.includes('desktop') || key.includes('wallpaper') || key.includes('icon') || key.includes('widget') || key.includes('theme') || key.includes('dock') || key.includes('avatar') || key.includes('pwa') || key.includes('appearance') || key.includes('viewport');
    }

    async function doLocalExport(scope = 'all') {
        if (isBusy) return;
        setBusy(true);

        const panel = document.getElementById('bkExportExtPanel');
        if (panel) panel.classList.remove('open');

        const polaroid = document.getElementById('bkPolaroid');
        const flash = document.getElementById('bkFlash');
        const caption = document.getElementById('bkPaperCaption');
        const successMsg = document.getElementById('bkSuccessMsg');

        if (polaroid) polaroid.classList.remove('eject');
        if (flash) {
            flash.classList.add('lit');
            setTimeout(() => flash.classList.remove('lit'), 180);
        }
        playShutterSound();

        const scopeLabel = scope === 'desktop' ? '桌面与美化' : '全部数据';
        setProgress(0, `正在构图打包 (${scopeLabel})…`);
        setLog(`正在收集本地数据并生成快照清单 [${scopeLabel}]…`);

        try {
            let items = collectLocalStorage();
            if (scope === 'desktop') {
                items = items.filter(it => isDesktopThemeKey(it.key));
            }
            const nowStamp = stamp();
            const filename = scope === 'desktop' ? `whatever-desktop-theme-${nowStamp}.zip` : `whatever-backup-${nowStamp}.zip`;

            const blob = await buildZipBlob(items, p => setProgress(p * 0.8, '正在冲印相片…'));

            if (caption) caption.textContent = filename;
            if (polaroid) polaroid.classList.add('eject');

            localStorage.setItem(BK_LAST_KEY, new Date().toISOString());
            refreshStats();

            setProgress(100, '冲印完成');
            setLog(`✓ [${scopeLabel}] 已打包\n${items.length} 项 · ${(blob.size / 1024).toFixed(1)} KB\n文件：${filename}`);
            if (successMsg) successMsg.textContent = `冲印成功 [${scopeLabel}]：已打包 ${items.length} 项并生成 ZIP`;

            triggerDownload(blob, filename);
            showToast(`[${scopeLabel}] 备份照片已洗出并触发下载`);
        } catch (e) {
            setProgress(0, '导出失败');
            setLog('导出失败：' + e.message);
            showToast(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function doLocalImport(file) {
        if (!file || isBusy) return;
        setBusy(true);

        const polaroid = document.getElementById('bkPolaroid');
        const caption = document.getElementById('bkPaperCaption');
        const successMsg = document.getElementById('bkSuccessMsg');

        if (polaroid) polaroid.classList.remove('eject');
        setProgress(10, '正在读取底片…');
        setLog('正在解析底片：' + file.name);

        try {
            const JSZip = await loadJSZip();
            const zip = await JSZip.loadAsync(file);
            const mf = zip.file('manifest.json');
            if (!mf) throw new Error('这不是 Whatever 备份包（缺少 manifest.json）');

            const manifest = JSON.parse(await mf.async('string'));
            if (!confirm(`即将从底片还原 ${manifest.count || manifest.entries.length} 项数据，同名项将被覆盖。继续？`)) {
                setProgress(0, '已取消恢复');
                setLog('导入已取消。');
                return;
            }

            let count = 0;
            const entries = manifest.entries || [];
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const f = zip.file(entry.file);
                setProgress(10 + ((i + 1) / entries.length) * 80, '正在显影写回…');
                if (!f) continue;
                const it = JSON.parse(await f.async('string'));
                if (it.value !== null && it.value !== undefined) {
                    localStorage.setItem(it.key, it.value);
                    count++;
                }
            }

            localStorage.setItem(BK_LAST_KEY, new Date().toISOString());
            refreshStats();

            if (caption) caption.textContent = `RESTORED_${count}_ITEMS`;
            if (polaroid) polaroid.classList.add('eject');
            if (successMsg) successMsg.textContent = `显影成功：已还原 ${count} 项数据`;

            setProgress(100, '恢复完成');
            setLog(`✓ 底片还原成功\n已恢复 ${count} 项数据。\n页面即将平滑刷新…`);
            showToast('数据显影完成，页面即将刷新');
            setTimeout(() => location.reload(), 1200);
        } catch (e) {
            setProgress(0, '恢复失败');
            setLog('底片读取失败：' + e.message);
            showToast(e.message);
        } finally {
            setBusy(false);
        }
    }

    /* ---------- GitHub API 连接操作 ---------- */
    function readGitForm() {
        return {
            owner: document.getElementById('bkGhOwner').value.trim(),
            repo: document.getElementById('bkGhRepo').value.trim(),
            branch: document.getElementById('bkGhBranch').value.trim() || 'main',
            path: document.getElementById('bkGhPath').value.trim().replace(/^\/+|\/+$/g, ''),
            token: document.getElementById('bkGhToken').value.trim()
        };
    }

    function fillGitForm(c) {
        if (!c) return;
        if (c.owner) document.getElementById('bkGhOwner').value = c.owner;
        if (c.repo) document.getElementById('bkGhRepo').value = c.repo;
        if (c.branch) document.getElementById('bkGhBranch').value = c.branch;
        if (c.path) document.getElementById('bkGhPath').value = c.path;
        if (c.token) document.getElementById('bkGhToken').value = c.token;
    }

    function gitHeaders(cfg, json) {
        return {
            Authorization: 'Bearer ' + cfg.token,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(json ? { 'Content-Type': 'application/json' } : {})
        };
    }

    function gitApiUrl(cfg, path) {
        const enc = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
        return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${enc}`;
    }

    async function gitFetchContent(cfg, path) {
        const url = gitApiUrl(cfg, path) + '?ref=' + encodeURIComponent(cfg.branch);
        const res = await fetch(url, { headers: gitHeaders(cfg, false) });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 140)}`);
        return res.json();
    }

    function utf8ToB64(str) {
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        return btoa(bin);
    }

    function b64ToUtf8(b64) {
        const bin = atob(String(b64).replace(/\s/g, ''));
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    async function gitPutFile(cfg, path, b64Content, message) {
        const existing = await gitFetchContent(cfg, path);
        const body = { message, content: b64Content, branch: cfg.branch };
        if (existing && existing.sha) body.sha = existing.sha;

        const url = gitApiUrl(cfg, path);
        const res = await fetch(url, {
            method: 'PUT',
            headers: gitHeaders(cfg, true),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`提交失败 (${res.status}): ${(await res.text()).slice(0, 140)}`);
    }

    async function uploadToGitHub() {
        const cfg = readGitForm();
        if (!cfg.owner || !cfg.repo || !cfg.token) {
            showToast('请先完整填写 Owner、Repo 和 Token');
            setLog('请完善 GitHub 配置信息。');
            return;
        }

        if (isBusy) return;
        setBusy(true);

        const items = collectLocalStorage();
        const stampStr = new Date().toISOString();
        setProgress(0, '正在连接 GitHub…');
        setLog(`开始推送到 GitHub (${bkMode === 'stream' ? '逐文件流式' : '整包归档'})…`);

        try {
            if (bkMode === 'stream') {
                const manifest = {
                    app: 'Whatever Backup',
                    mode: 'stream',
                    createdAt: stampStr,
                    count: items.length,
                    entries: []
                };

                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const name = safeFileName(it.key, i);
                    const relPath = 'data/' + name;
                    manifest.entries.push({ key: it.key, file: relPath });

                    const filePath = cfg.path ? `${cfg.path}/${relPath}` : relPath;
                    setProgress(((i + 1) / items.length) * 90, `上传项 (${i + 1}/${items.length})`);
                    setLog(`正在推送: ${it.key}`);
                    await gitPutFile(cfg, filePath, utf8ToB64(JSON.stringify(it)), `backup: ${it.key}`);
                }

                const manifestPath = cfg.path ? `${cfg.path}/manifest.json` : 'manifest.json';
                await gitPutFile(cfg, manifestPath, utf8ToB64(JSON.stringify(manifest, null, 2)), `backup manifest ${stampStr}`);
            } else {
                setProgress(20, '正在生成 ZIP…');
                setLog('正在打包本地归档文件…');
                const blob = await buildZipBlob(items);

                setProgress(60, '正在上传 ZIP…');
                setLog(`正在推送整包归档 (${(blob.size / 1024).toFixed(1)} KB)…`);

                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i += 8192) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
                }

                const bundlePath = cfg.path ? `${cfg.path}/whatever-backup.zip` : 'whatever-backup.zip';
                await gitPutFile(cfg, bundlePath, btoa(binary), `backup bundle ${stampStr}`);
            }

            localStorage.setItem(BK_LAST_KEY, stampStr);
            refreshStats();

            setProgress(100, 'GitHub 同步完成');
            setLog(`✓ GitHub 推送成功\n已将 ${items.length} 项数据存储至 ${cfg.owner}/${cfg.repo}。`);
            showToast('已成功上传到 GitHub');
        } catch (e) {
            setProgress(0, '上传失败');
            setLog('上传失败：' + e.message);
            showToast(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function listRemoteBackups() {
        const cfg = readGitForm();
        if (!cfg.owner || !cfg.repo || !cfg.token) {
            showToast('请填写用户名、仓库名和 Token');
            return;
        }
                if (isBusy) return;
        setBusy(true);
        setProgress(0, '正在查询…');
        setLog('正在连接 GitHub 检索远程快照…');

        const listEl = document.getElementById('bkRemoteList');
        if (listEl) listEl.innerHTML = '';
        bkSelectedRemote = null;

        try {
            const root = cfg.path;
            const manifestPath = root ? `${root}/manifest.json` : 'manifest.json';
            const bundlePath = root ? `${root}/whatever-backup.zip` : 'whatever-backup.zip';

            const [manifestData, bundleData] = await Promise.all([
                gitFetchContent(cfg, manifestPath).catch(() => null),
                gitFetchContent(cfg, bundlePath).catch(() => null)
            ]);

            const cands = [];
            if (manifestData && manifestData.content) {
                try {
                    const mf = JSON.parse(b64ToUtf8(manifestData.content));
                    cands.push({
                        type: 'stream',
                        title: `流式备份 · ${mf.count || (mf.entries && mf.entries.length) || 0} 项`,
                        time: mf.createdAt ? formatTime(mf.createdAt) : '远程记录',
                        manifest: mf,
                        path: root
                    });
                } catch (_) {}
            }

            if (bundleData && bundleData.download_url) {
                cands.push({
                    type: 'bundle',
                    title: '整包归档 · whatever-backup.zip',
                    time: String(bundleData.sha || '').slice(0, 7),
                    downloadUrl: bundleData.download_url,
                    path: bundlePath
                });
            }

            if (!cands.length) {
            if (listEl) {
                listEl.innerHTML = '' +
                '<div class="bk-remote-item">' +
                    '<span>未找到任何备份文件</span>' +
                    '<span>检查路径/分支</span>' +
                '</div>';
            }
            setProgress(0, '无备份');
            setLog('当前目录下未检测到 manifest.json 或 whatever-backup.zip。');
            return;
        }

        if (listEl) {
            cands.forEach((cand, idx) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bk-remote-item' + (idx === 0 ? ' selected' : '');
                itemDiv.innerHTML = '<span>' + cand.title + '</span><span>' + cand.time + '</span>';
                itemDiv.onclick = () => {
                    document.querySelectorAll('.bk-remote-item').forEach(el => el.classList.remove('selected'));
                    itemDiv.classList.add('selected');
                    bkSelectedRemote = cand;
                    setLog('已选中：' + cand.title);
                };
                listEl.appendChild(itemDiv);
            });
        }
            bkSelectedRemote = cands[0];
            setProgress(100, '查询完成');
            setLog(`已获取 ${cands.length} 个远程快照版本。\n选择版本后点击【恢复所选版本】执行还原。`);
            showToast('已读取远程备份');
        } catch (e) {
            setProgress(0, '查询失败');
            setLog('读取远程快照失败：' + e.message);
            showToast(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function restoreFromGitHub() {
        if (!bkSelectedRemote) {
            showToast('请先点击【读取远程备份】并选择一个版本');
            return;
        }

        const cfg = readGitForm();
        if (isBusy) return;
        setBusy(true);

        setProgress(0, '准备还原…');
        setLog(`正在从 GitHub 拉取 ${bkSelectedRemote.title}…`);

        try {
            if (bkSelectedRemote.type === 'stream') {
                const mf = bkSelectedRemote.manifest;
                const entries = mf.entries || [];
                if (!confirm(`即将从 GitHub 还原 ${entries.length} 项数据，同名项将被覆盖。继续？`)) {
                    setProgress(0, '已取消');
                    setLog('已取消恢复。');
                    return;
                }

                let count = 0;
                for (let i = 0; i < entries.length; i++) {
                    const ent = entries[i];
                    const fullPath = bkSelectedRemote.path ? `${bkSelectedRemote.path}/${ent.file}` : ent.file;
                    setProgress(((i + 1) / entries.length) * 85, `拉取中 (${i + 1}/${entries.length})`);

                    const fileData = await gitFetchContent(cfg, fullPath);
                    if (fileData && fileData.content) {
                        const it = JSON.parse(b64ToUtf8(fileData.content));
                        if (it.value !== null && it.value !== undefined) {
                            localStorage.setItem(it.key, it.value);
                            count++;
                        }
                    }
                }

                localStorage.setItem(BK_LAST_KEY, new Date().toISOString());
                refreshStats();
                setProgress(100, '还原完成');
                setLog(`✓ 成功恢复 ${count} 项数据。\n页面即将平滑刷新…`);
                showToast('已恢复，页面即将刷新');
                setTimeout(() => location.reload(), 1200);
            } else {
                setProgress(20, '正在下载 ZIP…');
                const res = await fetch(bkSelectedRemote.downloadUrl);
                if (!res.ok) throw new Error(`下载快照包失败: HTTP ${res.status}`);
                const blob = await res.blob();

                setProgress(60, '正在解压还原…');
                const JSZip = await loadJSZip();
                const zip = await JSZip.loadAsync(blob);
                const mfFile = zip.file('manifest.json');
                if (!mfFile) throw new Error('远程压缩包缺少 manifest.json');

                const manifest = JSON.parse(await mfFile.async('string'));
                const entries = manifest.entries || [];

                if (!confirm(`即将从整包恢复 ${entries.length} 项数据。继续？`)) {
                    setProgress(0, '已取消');
                    setLog('已取消恢复。');
                    return;
                }

                let count = 0;
                for (let i = 0; i < entries.length; i++) {
                    const f = zip.file(entries[i].file);
                    if (!f) continue;
                    const it = JSON.parse(await f.async('string'));
                    if (it.value !== null && it.value !== undefined) {
                        localStorage.setItem(it.key, it.value);
                        count++;
                    }
                }

                localStorage.setItem(BK_LAST_KEY, new Date().toISOString());
                refreshStats();
                setProgress(100, '还原完成');
                setLog(`✓ 成功从整包恢复 ${count} 项数据。\n页面即将刷新…`);
                showToast('已恢复，页面即将刷新');
                setTimeout(() => location.reload(), 1200);
            }
        } catch (e) {
            setProgress(0, '还原失败');
            setLog('还原失败：' + e.message);
            showToast(e.message);
        } finally {
            setBusy(false);
        }
    }

    /* ---------- LiquidGlass 液态玻璃增强挂载 ---------- */
    function attachLiquidGlass() {
        if (!window.LiquidGlass) return;

        const root = document.getElementById('bkAppRoot');
        const dock = document.getElementById('bkDockBar');
        if (!root || !dock) return;

        const initialized = window.LiquidGlass.init({
            wallpaper: BK_WALLPAPER_URL,
            container: root
        });

        if (!initialized) return;

        let style = document.getElementById('bkGlassOverrideStyle');

        if (!style) {
            style = document.createElement('style');
            style.id = 'bkGlassOverrideStyle';
            document.head.appendChild(style);
        }

        style.textContent = `
            #bkAppRoot {
                background: #ffffff !important;
                color: #2b303a !important;
            }

            /* 超轻量透白遮罩：背景通透 */
            #bkAppRoot::after {
                content: "";
                position: fixed !important;
                inset: 0 !important;
                z-index: 1 !important;
                pointer-events: none !important;
                background: rgba(255, 255, 255, 0.35) !important;
            }

            #bkAppRoot .bk-wall-layer {
                z-index: 0 !important;
                opacity: 0.92 !important;
                filter: brightness(1.05) contrast(0.98) !important;
            }

            /* ===== 纯白顶栏 + 精致蕾丝花边 ===== */
            #bkAppRoot .bk-head {
                position: sticky !important;
                top: 0 !important;
                margin-top: 0 !important;
                z-index: 50 !important;
                background: #ffffff !important;
                border-bottom: 0 !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
                isolation: isolate !important;
                min-height: 113px !important;
                align-items: flex-end !important;
                padding-bottom: 14px !important;
            }

            #bkAppRoot .bk-head::before {
                display: none !important;
            }

            #bkAppRoot .bk-head::after {
                content: "" !important;
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                bottom: -8px !important;
                height: 8px !important;
                z-index: 52 !important;
                display: block !important;
                pointer-events: none !important;
                background:
                    radial-gradient(circle at 50% 0, #ffffff 4.8px, transparent 5.4px) 0 0 / 14px 8px repeat-x,
                    radial-gradient(circle at 50% 0, rgba(0, 0, 0, 0.05) 5.6px, transparent 6.2px) 0 0 / 14px 8px repeat-x !important;
            }

            #bkAppRoot .bk-head .bk-back {
                background: #f4f6f8 !important;
                border: 0 !important;
                color: #1a1d21 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-head .bk-title {
                color: #111317 !important;
                font-weight: 700 !important;
            }

            #bkAppRoot .bk-head .bk-sub {
                color: #8c939d !important;
            }

            #bkAppRoot .bk-head .bk-head-badge {
                background: #f4f6f8 !important;
                border: 0 !important;
                color: #495057 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-head .bk-head-badge .dot {
                background: #a9d6e5 !important;
                box-shadow: 0 0 6px rgba(169, 214, 229, 0.5) !important;
            }

            #bkAppRoot .bk-main::before {
                display: none !important;
            }

            /* ===== 英文花字破框与深浅多维排版 ===== */
            #bkAppRoot .bk-section-label {
                position: relative !important;
                display: flex !important;
                align-items: baseline !important;
                justify-content: flex-start !important;
                gap: 8px !important;
                margin: 18px 2px 7px !important;
                padding-left: 4px !important;
            }

            #bkAppRoot .bk-section-label::before,
            #bkAppRoot .bk-section-label::after {
                display: none !important;
            }

            #bkAppRoot .bk-burst-tag {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                font-size: 8.5px !important;
                font-weight: 800 !important;
                letter-spacing: 0.16em !important;
                padding: 3px 8px !important;
                border-radius: 999px !important;
                text-transform: uppercase !important;
            }

            #bkAppRoot .bk-burst-tag.l1 {
                background: #eef6fa !important;
                color: #3b6b85 !important;
            }

            #bkAppRoot .bk-burst-tag.l2 {
                background: #f4f6f8 !important;
                color: #6a7785 !important;
            }

            #bkAppRoot .bk-burst-tag i {
                font-style: normal !important;
                opacity: 0.55 !important;
                margin-right: 2px !important;
            }

            #bkAppRoot .bk-burst-script {
                font-family: "Georgia", "Baskerville", "Times New Roman", serif !important;
                font-size: 13.5px !important;
                font-style: italic !important;
                font-weight: 500 !important;
                letter-spacing: 0.02em !important;
                color: #8c9ba7 !important;
                transform: translateY(1px) !important;
            }

            /* 卡片内部英文破框水印大字 */
            #bkAppRoot .bk-card {
                position: relative !important;
                overflow: hidden !important;
            }

            #bkAppRoot .bk-watermark-bg {
                position: absolute !important;
                right: -6px !important;
                top: 0px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                font-size: 38px !important;
                font-weight: 900 !important;
                letter-spacing: -0.04em !important;
                color: rgba(140, 165, 185, 0.07) !important;
                pointer-events: none !important;
                user-select: none !important;
                z-index: 1 !important;
                line-height: 1 !important;
            }

            #bkAppRoot .bk-head-group {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
            }

            #bkAppRoot .bk-eng-title {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                font-size: 9.5px !important;
                font-weight: 750 !important;
                letter-spacing: 0.14em !important;
                color: #2b3540 !important;
            }

            #bkAppRoot .bk-sub-badge {
                font-size: 6.5px !important;
                font-weight: 700 !important;
                letter-spacing: 0.12em !important;
                color: #7b93a5 !important;
                background: #f0f5f8 !important;
                padding: 1.5px 5px !important;
                border-radius: 4px !important;
            }

            #bkAppRoot .bk-stats,
            #bkAppRoot .bk-status-card,
            #bkAppRoot .bk-git-panel {
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                box-sizing: border-box !important;
            }

            #bkAppRoot .bk-stats {
                background: #ffffff !important;
                border: 0 !important;
                border-radius: 18px !important;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04) !important;
            }

            #bkAppRoot .bk-stat b {
                color: #1a1d21 !important;
            }

            #bkAppRoot .bk-stat span {
                color: #868e96 !important;
            }

            #bkAppRoot .bk-stat:not(:last-child)::after {
                background: #f1f3f5 !important;
            }

            #bkAppRoot .bk-card {
                background: #ffffff !important;
                border: 0 !important;
                border-radius: 20px !important;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04) !important;
            }

            #bkAppRoot .bk-card-heading {
                border-bottom: 1px solid #f1f3f5 !important;
            }

            #bkAppRoot .bk-card-heading strong {
                color: #212529 !important;
            }

            #bkAppRoot .bk-card-heading code {
                color: #8fa0af !important;
            }

            #bkAppRoot .bk-sample-note {
                color: #8fa0af !important;
            }

            /* ===== 相机外壳：淡两倍透出背景图、婴儿蓝质感 ===== */
            #bkAppRoot .bk-camera-card {
                width: 100% !important;
                background: #ffffff !important;
            }

            #bkAppRoot .bk-camera-body {
                background: linear-gradient(145deg, rgba(186, 219, 237, 0.28), rgba(162, 204, 226, 0.35)) !important;
                border: 1px solid rgba(255, 255, 255, 0.55) !important;
                box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -4px 12px rgba(130, 175, 198, 0.15) !important;
                backdrop-filter: blur(12px) saturate(130%) !important;
                -webkit-backdrop-filter: blur(12px) saturate(130%) !important;
            }

            #bkAppRoot .bk-camera-body::before {
                border-color: rgba(255, 255, 255, 0.35) !important;
            }

            #bkAppRoot .bk-camera-body::after {
                background: repeating-linear-gradient(
                    135deg,
                    transparent 0,
                    transparent 4px,
                    rgba(255, 255, 255, 0.12) 4px,
                    rgba(255, 255, 255, 0.12) 5px
                ) !important;
            }

            #bkAppRoot .bk-camera-star {
                color: rgba(255, 255, 255, 0.9) !important;
                text-shadow: none !important;
            }

            #bkAppRoot .bk-flash {
                border-color: rgba(255, 255, 255, 0.55) !important;
                background: rgba(255, 255, 255, 0.3) !important;
            }

            #bkAppRoot .bk-finder {
                border-color: rgba(255, 255, 255, 0.65) !important;
                background: rgba(142, 185, 207, 0.35) !important;
            }

            #bkAppRoot .bk-camera-serial {
                color: #4b6e82 !important;
            }

            #bkAppRoot .bk-lens-ticks {
                border-color: rgba(255, 255, 255, 0.5) !important;
            }

            #bkAppRoot .bk-lens {
                border-color: rgba(255, 255, 255, 0.9) !important;
                background: radial-gradient(circle at 34% 28%, rgba(216, 234, 244, 0.75), rgba(158, 194, 214, 0.7) 55%, rgba(106, 150, 174, 0.8)) !important;
                box-shadow: none !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
            }

            #bkAppRoot .bk-lens svg {
                color: #ffffff !important;
            }

            #bkAppRoot .bk-camera-rule {
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5) 18%, rgba(255, 255, 255, 0.5) 82%, transparent) !important;
            }

            /* 相机胶囊操作按钮：去除阴影 */
            #bkAppRoot .bk-camera-buttons .bk-camera-btn {
                border: 0 !important;
                background: rgba(255, 255, 255, 0.45) !important;
                color: #2b556b !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-camera-buttons .bk-camera-btn.pink {
                background: rgba(255, 255, 255, 0.55) !important;
                color: #20475b !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-export-ext-panel {
                background: rgba(255, 255, 255, 0.92) !important;
                border: 1px solid rgba(210, 224, 235, 0.9) !important;
                border-radius: 14px !important;
                padding: 8px 10px !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 1px #ffffff !important;
            }

            #bkAppRoot .bk-export-ext-title {
                color: #4b6272 !important;
                font-size: 8px !important;
                font-weight: 700 !important;
            }

            #bkAppRoot .bk-ext-btn {
                background: #eef4f8 !important;
                color: #2b4555 !important;
                border: none !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
            }

            #bkAppRoot .bk-ext-btn.pink {
                background: #d8eaf4 !important;
                color: #1f3d4d !important;
            }

            /* ===== 状态面板：内容横向收窄居中，淡雅婴儿蓝进度条 ===== */
            #bkAppRoot .bk-status-card {
                background: #ffffff !important;
            }

            #bkAppRoot .bk-status-card > * {
                max-width: 86% !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }

            #bkAppRoot .bk-status-top {
                color: #8c96a0 !important;
            }

            #bkAppRoot .bk-status-top strong {
                color: #212529 !important;
            }

            #bkAppRoot .bk-progress {
                background: #f1f4f6 !important;
            }

            #bkAppRoot .bk-progress-fill {
                background: linear-gradient(90deg, #d8e9f2, #b8d9ea) !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-log {
                background: #f9fbfc !important;
                border: 0 !important;
                color: #555e68 !important;
            }

            /* ===== GitHub 面板：内容横向收窄居中，淡雅婴儿蓝交互 ===== */
            #bkAppRoot .bk-git-panel {
                background: #ffffff !important;
            }

            #bkAppRoot .bk-git-panel > * {
                max-width: 86% !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }

            #bkAppRoot .bk-field {
                background: #f5f8fa !important;
                border: 0 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-field label {
                color: #636e79 !important;
            }

            #bkAppRoot .bk-field input {
                color: #212529 !important;
            }

            #bkAppRoot .bk-field input::placeholder {
                color: #b0bdc8 !important;
            }

            #bkAppRoot .bk-mode-switch {
                background: #f0f4f7 !important;
                border: 0 !important;
            }

            #bkAppRoot .bk-mode-switch button {
                border: 0 !important;
                color: #636e79 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-mode-switch button.active {
                background: #ffffff !important;
                color: #2f5468 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-git-btn {
                background: #f2f6f8 !important;
                border: 0 !important;
                color: #414d56 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-git-btn.push {
                background: #c3ddec !important;
                border: 0 !important;
                color: #224354 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-remote-item {
                background: #f9fbfc !important;
                border: 0 !important;
                color: #212529 !important;
            }

            #bkAppRoot .bk-remote-item.selected {
                background: #eef6fa !important;
                border: 0 !important;
            }

            #bkAppRoot .bk-remote-item span:last-child {
                color: #9bb0be !important;
            }

            /* ===== 相机框架化：横向缩窄、浅灰线条微透框、透视底层背景 ===== */
            #bkAppRoot .bk-camera-card {
                width: 100% !important;
                background: #ffffff !important;
            }

            #bkAppRoot .bk-camera-body {
                width: min(84%, 220px) !important;
                margin: 0 auto !important;
                background: rgba(246, 248, 250, 0.28) !important;
                border: 1.5px solid rgba(200, 208, 216, 0.55) !important;
                box-shadow: none !important;
                backdrop-filter: blur(6px) !important;
                -webkit-backdrop-filter: blur(6px) !important;
            }

            #bkAppRoot .bk-camera-body::before {
                border-color: rgba(215, 222, 228, 0.45) !important;
            }

            #bkAppRoot .bk-camera-body::after {
                background: repeating-linear-gradient(
                    135deg,
                    transparent 0,
                    transparent 5px,
                    rgba(190, 200, 210, 0.12) 5px,
                    rgba(190, 200, 210, 0.12) 6px
                ) !important;
            }

            #bkAppRoot .bk-camera-star {
                color: rgba(165, 178, 190, 0.65) !important;
                text-shadow: none !important;
            }

            #bkAppRoot .bk-flash {
                border-color: rgba(185, 195, 205, 0.6) !important;
                background: rgba(255, 255, 255, 0.45) !important;
            }

            #bkAppRoot .bk-finder {
                border-color: rgba(180, 190, 200, 0.65) !important;
                background: rgba(210, 218, 225, 0.35) !important;
            }

            #bkAppRoot .bk-camera-serial {
                color: #8897a4 !important;
            }

            #bkAppRoot .bk-lens-ticks {
                border-color: rgba(195, 205, 215, 0.45) !important;
            }

            /* 镜头外圈透明化，中心爱心彻底穿透至全屏背景图 */
            #bkAppRoot .bk-lens {
                position: relative !important;
                border: 2px solid rgba(225, 232, 238, 0.85) !important;
                background: rgba(245, 248, 250, 0.15) !important;
                box-shadow: none !important;
                backdrop-filter: blur(2px) !important;
                -webkit-backdrop-filter: blur(2px) !important;
                overflow: hidden !important;
            }

            /* 核心心形镂空遮罩：爱心区域 100% 穿透显示真实背景图 */
            #bkAppRoot .bk-heart-cutout {
                position: relative !important;
                z-index: 2 !important;
                width: 26px !important;
                height: 26px !important;
                color: #5d7588 !important;
                filter: drop-shadow(0 2px 5px rgba(255, 255, 255, 0.8)) !important;
            }

            /* 爱心中央微晶透视窗：让背景在爱心中心清晰透出 */
            #bkAppRoot .bk-heart-glow {
                position: absolute !important;
                inset: 7px !important;
                z-index: 1 !important;
                border-radius: 50% !important;
                background: transparent url("${BK_WALLPAPER_URL}") center/cover no-repeat fixed !important;
                -webkit-mask: radial-gradient(circle at 50% 50%, #000 60%, transparent 85%) !important;
                mask: radial-gradient(circle at 50% 50%, #000 60%, transparent 85%) !important;
                opacity: 0.95 !important;
                pointer-events: none !important;
            }

            #bkAppRoot .bk-camera-rule {
                background: linear-gradient(90deg, transparent, rgba(195, 205, 215, 0.45) 20%, rgba(195, 205, 215, 0.45) 80%, transparent) !important;
            }

            #bkAppRoot .bk-camera-buttons .bk-camera-btn {
                border: 0 !important;
                background: rgba(240, 244, 247, 0.65) !important;
                color: #455562 !important;
                box-shadow: none !important;
            }

            #bkAppRoot .bk-camera-buttons .bk-camera-btn.pink {
                background: rgba(230, 240, 246, 0.8) !important;
                color: #324e5e !important;
                box-shadow: none !important;
            }

            /* ===== 拍立得照片：内部画布采样并显示背景图 ===== */
            #bkAppRoot .bk-polaroid {
                background: #ffffff !important;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08) !important;
            }

            #bkAppRoot .bk-polaroid-image {
                position: relative !important;
                background: #f0f2f5 url("${BK_WALLPAPER_URL}") center/cover no-repeat !important;
                border: 1px solid #eef1f4 !important;
            }

            #bkAppRoot .bk-polaroid-image svg {
                display: none !important;
            }

            /* ===== 底部悬浮液态玻璃 DOCK（实时通透折射底层实际内容） ===== */
            #bkAppRoot #bkDockBar {
                position: fixed !important;
                left: 50% !important;
                right: auto !important;
                bottom: 35px !important;
                z-index: 60 !important;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: center !important;
                width: max-content !important;
                min-width: 220px !important;
                max-width: calc(100vw - 24px) !important;
                height: 50px !important;
                min-height: 50px !important;
                margin: 0 !important;
                padding: 6px 7px !important;
                gap: 6px !important;
                transform: translateX(-50%) !important;
                border: 1px solid rgba(255, 255, 255, 0.72) !important;
                border-radius: 999px !important;
                background: rgba(255, 255, 255, 0.32) !important;
                box-shadow:
                    0 16px 32px rgba(0, 0, 0, 0.12),
                    inset 0 1px 2px rgba(255, 255, 255, 0.95),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.06) !important;
                backdrop-filter: blur(20px) saturate(190%) contrast(108%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(190%) contrast(108%) !important;
                overflow: hidden !important;
                isolation: isolate !important;
            }

            #bkAppRoot #bkDockBar::before {
                content: "" !important;
                position: absolute !important;
                inset: 0 !important;
                z-index: 0 !important;
                border-radius: inherit !important;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.22) 100%) !important;
                pointer-events: none !important;
            }

            #bkAppRoot #bkDockBar > .lg-cv {
                display: none !important;
            }

            #bkAppRoot #bkDockBar > button {
                position: relative !important;
                z-index: 1 !important;
                display: flex !important;
                flex: 0 0 auto !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                width: auto !important;
                min-width: 78px !important;
                height: 38px !important;
                min-height: 38px !important;
                margin: 0 !important;
                padding: 0 16px !important;
                border: 0 !important;
                border-radius: 999px !important;
                color: #4a5560 !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                background: transparent !important;
                box-shadow: none !important;
                white-space: nowrap !important;
                transform: none !important;
                transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
            }

            #bkAppRoot #bkDockBar > button.active {
                color: #ffffff !important;
                background: #1a1d21 !important;
                box-shadow: none !important;
            }

            #bkAppRoot #bkDockBar > button.exit {
                min-width: 44px !important;
                padding: 0 10px !important;
                color: #4a5560 !important;
                box-shadow: none !important;
            }

            /* ===== 底部浮现胶囊提示（Toast）：纵向压窄扁平、纯黑实色、轻微投影 ===== */
            #bkAppRoot .bk-toast {
                position: fixed !important;
                left: 50% !important;
                bottom: 94px !important;
                z-index: 99 !important;
                padding: 4px 14px !important;
                height: 24px !important;
                min-height: 24px !important;
                line-height: 16px !important;
                border: 0 !important;
                border-radius: 999px !important;
                color: #ffffff !important;
                font-size: 8px !important;
                font-weight: 500 !important;
                letter-spacing: 0.04em !important;
                background: #000000 !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                white-space: nowrap !important;
                pointer-events: none !important;
                transform: translate(-50%, 4px) !important;
                transition: opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
            }

            #bkAppRoot .bk-toast.show {
                opacity: 1 !important;
                transform: translate(-50%, 0) !important;
            }
        `;

        // 彻底移除阻挡底层动态元素的 WebGL 离线壁纸画布
        if (dock._lg && typeof dock._lg.destroy === 'function') {
            dock._lg.destroy();
            dock._lg = null;
        }
        const existingCv = dock.querySelector('.lg-cv');
        if (existingCv) existingCv.remove();

        requestAnimationFrame(() => {
            if (window.LiquidGlass && typeof window.LiquidGlass.wake === 'function') {
                window.LiquidGlass.wake();
            }
        });
    }

    /* ---------- 应用初始化启动 ---------- */
    function initBackupApp() {
        // 读取本地存储的 GitHub 配置
        try {
            const savedCfg = JSON.parse(localStorage.getItem(BK_CFG_KEY) || '{}');
            fillGitForm(savedCfg);
        } catch (_) {}

        refreshStats();
        setProgress(0, '就绪');

        // 本地拍立得相机交互绑定
        const lensBtn = document.getElementById('bkLensBtn');
        const shootBtn = document.getElementById('bkBtnShootExport');
        const insertBtn = document.getElementById('bkBtnInsertImport');
        const fileInput = document.getElementById('bkFileInput');

        if (lensBtn) lensBtn.onclick = toggleExportExtension;
        if (shootBtn) shootBtn.onclick = toggleExportExtension;
        const scopeAllBtn = document.getElementById('bkBtnScopeAll');
        const scopeDesktopBtn = document.getElementById('bkBtnScopeDesktop');
        if (scopeAllBtn) scopeAllBtn.onclick = () => doLocalExport('all');
        if (scopeDesktopBtn) scopeDesktopBtn.onclick = () => doLocalExport('desktop');
        if (insertBtn) insertBtn.onclick = () => fileInput && fileInput.click();
        if (fileInput) {
            fileInput.onchange = (e) => {
                const f = e.target.files && e.target.files[0];
                e.target.value = '';
                if (f) doLocalImport(f);
            };
        }

        // GitHub 区域事件绑定
        const saveCfgBtn = document.getElementById('bkBtnSaveGit');
        const uploadGitBtn = document.getElementById('bkBtnUploadGit');
        const listGitBtn = document.getElementById('bkBtnListGit');
        const restoreGitBtn = document.getElementById('bkBtnRestoreGit');

        if (saveCfgBtn) {
            saveCfgBtn.onclick = () => {
                const cfg = readGitForm();
                localStorage.setItem(BK_CFG_KEY, JSON.stringify(cfg));
                showToast('配置已保存在本地设备');
                setLog('GitHub 认证与仓库配置已写入设备私有缓存。');
            };
        }
        if (uploadGitBtn) uploadGitBtn.onclick = uploadToGitHub;
        if (listGitBtn) listGitBtn.onclick = listRemoteBackups;
        if (restoreGitBtn) restoreGitBtn.onclick = restoreFromGitHub;

        // GitHub 流式 / 整包分段切换
        const modeButtons = document.querySelectorAll('#bkModeSwitch button');
        modeButtons.forEach(btn => {
            btn.onclick = () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                bkMode = btn.dataset.mode;
                showToast(bkMode === 'stream' ? '备份方式：逐文件流式' : '备份方式：整包 ZIP 归档');
            };
        });

        // 底部 Dock 栏切换面板
        const dockLocal = document.getElementById('bkDockLocal');
        const dockGit = document.getElementById('bkDockGit');
        const dockExit = document.getElementById('bkDockExit');
        const localPanel = document.getElementById('bkLocalPanel');
        const gitPanel = document.getElementById('bkGitPanel');
        const headStatus = document.getElementById('bkHeadStatus');

        if (dockLocal && dockGit && localPanel && gitPanel) {
            dockLocal.onclick = () => {
                dockLocal.classList.add('active');
                dockGit.classList.remove('active');
                localPanel.style.display = 'block';
                gitPanel.classList.remove('active');
                if (headStatus) headStatus.textContent = '暗房就绪';

                requestAnimationFrame(() => {
                    if (window.LiquidGlass && typeof window.LiquidGlass.wake === 'function') {
                        window.LiquidGlass.wake();
                    }
                });
            };

            dockGit.onclick = () => {
                dockGit.classList.add('active');
                dockLocal.classList.remove('active');
                localPanel.style.display = 'none';
                gitPanel.classList.add('active');
                if (headStatus) headStatus.textContent = 'GitHub 模式';

                requestAnimationFrame(() => {
                    if (window.LiquidGlass && typeof window.LiquidGlass.wake === 'function') {
                        window.LiquidGlass.wake();
                    }
                });
            };
        }

        // 退出与返回桌面
        const btnBack = document.getElementById('bkBtnBack');
        if (btnBack) btnBack.onclick = () => { if (typeof closeApp === 'function') closeApp(); };
        if (dockExit) dockExit.onclick = () => { if (typeof closeApp === 'function') closeApp(); };

        // 挂载液态玻璃
        attachLiquidGlass();
    }

    // 暴露给宿主系统 (app-manager.js)
    window.getBackupAppHTML = getBackupAppHTML;
    window.initBackupApp = initBackupApp;
})();
