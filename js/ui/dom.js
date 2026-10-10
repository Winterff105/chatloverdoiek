/* =========================================
   5. DOM 生成函数
   ========================================= */
function createAppElement(appId, location, index, page) {
    const def = APPS[appId];
    const el = document.createElement('div');
    el.className = 'app-item';
    el.dataset.id = appId;
    el.dataset.type = 'app';
    el.dataset.location = location;
    el.dataset.index = index;
    el.dataset.page = page;

    el.innerHTML = `
        <div class="app-icon">
            <div class="floating-glyph">
                ${def.svg}
            </div>
        </div>
        <div class="app-label">${def.name}</div>
    `;

    attachDragAndHoldEvents(el, { id: appId, type: 'app', span: 1, rowSpan: 1, location, index, page });
    return el;
}

function createPolaroidWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="polaroid-widget">
            <div class="polaroid-tape"></div>
            <div class="polaroid-photo-frame">
                <div class="polaroid-img-area">
                    <svg viewBox="0 0 24 24"><path d="M12 8c-2 0-2.8 2-2.8 3.2 0 2 2.8 3.3 2.8 3.3s2.8-1.3 2.8-3.3c0-1.2-.8-3.2-2.8-3.2z"/><path d="M12 14.5v4.5"/></svg>
                </div>
            </div>
            <div class="polaroid-info">
                <div class="polaroid-title">Daily Moment ${COMPONENT_HEART_SVG}</div>
                <div class="polaroid-sub">May 28 · sunny day</div>
            </div>
        </div>
    `;

    attachDragAndHoldEvents(el, item);
    return el;
}

function createHeartbeatWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="heartbeat-widget">
            <div class="hb-avatar-wrap hb-left" title="点击更换左侧头像">
                <img class="hb-avatar-img" src="${currentUploadedAvatar}" alt="Avatar1">
            </div>

            <div class="hb-bridge">
                <svg class="hb-ecg-svg" viewBox="0 0 110 30" preserveAspectRatio="none">
                    <path class="hb-ecg-line" d="M0,15 L32,15 L38,8 L44,22 L48,12 L52,18 L56,15 L110,15"/>
                </svg>
                <svg class="hb-heart-svg" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </div>

            <div class="hb-avatar-wrap hb-right" title="点击更换右侧头像">
                <img class="hb-avatar-img" src="${currentCoupleAvatar}" alt="Avatar2">
            </div>
        </div>
    `;

    const leftAvatar = el.querySelector('.hb-left');
    const rightAvatar = el.querySelector('.hb-right');

    leftAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    rightAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        coupleAvatarInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}

function createProfileWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="profile-widget">
            <div class="profile-avatar-stage">
                <img class="profile-wing wing-left" src="assets/wing-left.png" alt="Left Wing">
                <img class="profile-wing wing-right" src="assets/wing-right.png" alt="Right Wing">
                <div class="profile-avatar-wrap" title="点击上传自定义头像照片">
                    <img class="profile-avatar-img" src="${currentUploadedAvatar}" alt="Avatar">
                    <div class="avatar-frosted-edge"></div>
                </div>
            </div>
            <div class="profile-name">MINJI ${COMPONENT_HEART_SVG}</div>
            <div class="profile-capsules">
                <span class="black-capsule">Hanni</span>
                <span class="black-capsule">Danielle</span>
                <span class="black-capsule">Haerin</span>
            </div>
        </div>
    `;

    const avatarWrap = el.querySelector('.profile-avatar-wrap');
    avatarWrap.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}

function createMp3WidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="mp3-widget">
            <div class="mp3-top-engraved">
                <span class="mp3-engraved-logo">DIGITAL AUDIO</span>
                <span class="mp3-engraved-play">PLAY ■</span>
            </div>

            <div class="mp3-screen-top">
                <div class="mp3-track-title">Ditto - NewJeans ♪</div>
                <div class="mp3-progress-row">
                    <div class="mp3-bar-bg">
                        <div class="mp3-bar-fill"></div>
                    </div>
                    <span class="mp3-time">02:14</span>
                </div>
            </div>

            <div class="mp3-screen-middle">
                <div class="pixel-art-container">
                    <div class="pixel-eq">
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                        <div class="pixel-eq-col"></div>
                    </div>

                    <svg class="pixel-heart-svg" viewBox="0 0 16 14">
                        <rect x="3" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="1" width="2" height="2" fill="#48373D" />
                        <rect x="1" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="13" y="3" width="2" height="2" fill="#48373D" />
                        <rect x="1" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="13" y="5" width="2" height="2" fill="#48373D" />
                        <rect x="3" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="11" y="7" width="2" height="2" fill="#48373D" />
                        <rect x="5" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="9" y="9" width="2" height="2" fill="#48373D" />
                        <rect x="7" y="11" width="2" height="2" fill="#48373D" />
                    </svg>

                    <div class="pixel-song-text">
                        <span>Ditto.mp3</span>
                        <span style="opacity:0.65;">128kbps</span>
                    </div>
                </div>
            </div>

            <div class="mp3-wheel-oval">
                <span class="mp3-nav-icon mp3-nav-top">MENU</span>
                <span class="mp3-nav-icon mp3-nav-bottom">▶❚❚</span>
                <span class="mp3-nav-icon mp3-nav-left">|◀◀</span>
                <span class="mp3-nav-icon mp3-nav-right">▶▶|</span>
                <div class="mp3-center-oval-btn">
                    <svg viewBox="0 0 24 24"><polygon points="6 4 18 12 6 20 6 4"/></svg>
                </div>
            </div>
        </div>
    `;

    attachDragAndHoldEvents(el, item);
    return el;
}

// 胶囊对话流组件 (全新无边框无底色，内嵌头像胶囊)
function createDialogueWidgetElement(item) {
    const el = document.createElement('div');
    el.className = 'widget-item';
    el.dataset.id = item.id;
    el.dataset.type = item.type;
    el.dataset.location = 'desktop';
    el.dataset.index = item.slot;
    el.dataset.page = item.page;

    el.innerHTML = `
        <div class="dialogue-widget-2x2">
            <div class="chat-chip left" id="leftChipBtn_${item.id}" title="点击更换头像">
                <img class="chip-avatar hb-dialogue-left" src="${currentUploadedAvatar}" alt="avatar1">
                <span class="chip-text">今天开心吗？</span>
            </div>
            
            <div class="chip-timestamp">Today 09:41</div>
            
            <div class="chat-chip right" id="rightChipBtn_${item.id}" title="点击更换头像">
                <span class="chip-text">超开心 
                    <svg viewBox="0 0 24 16" width="14" height="10" style="display:inline-block; vertical-align:middle; stroke:none; fill:#ffffff; margin-bottom: 1px;">
                        <path d="M 12 15.2 C 7.5 12.2 3.5 10.2 3.5 6.8 A 4.2 3.4 0 0 1 12 5 A 4.2 3.4 0 0 1 20.5 6.8 C 20.5 10.2 16.5 12.2 12 15.2 Z"/>
                    </svg>
                </span>
                <img class="chip-avatar hb-dialogue-right" src="${currentCoupleAvatar}" alt="avatar2">
            </div>
        </div>
    `;

    const leftAvatar = el.querySelector('.hb-dialogue-left');
    const rightAvatar = el.querySelector('.hb-dialogue-right');

    leftAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarFileInput.click();
    });

    rightAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        coupleAvatarInput.click();
    });

    attachDragAndHoldEvents(el, item);
    return el;
}
