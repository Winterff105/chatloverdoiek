/* =========================================
   预设工坊 · Preset Atelier 业务逻辑脚本
   ========================================= */
(function() {
  const PRESET_STORAGE_KEY = 'forever_preset_custom_list_v2';
  const ACTIVE_PRESET_KEY = 'forever_preset_active_id_v2';

  // 默认仅保留一个锁定只选的「默认提示词」
  const INITIAL_PRESETS = [
    {
      id: 'default',
      name: '默认提示词',
      desc: '系统内置全量底座 · 核心格式规范',
      isDefault: true,
      blocks: [
        { type: 'system', locked: true, title: '默认人设底层规范 (System Core)', sub: '独立三维人格 · 说话习惯 · 真实瑕疵' },
        { type: 'anchor', locked: true, title: '聊天上下文流 (Chat History Stream)', sub: '最近滑动记录与对话气泡由此注入' },
        { type: 'system', locked: true, title: '格式与输出协议 (JSON Protocol)', sub: '气泡条数限制 · 心声字段约束' }
      ]
    }
  ];

  let PRESETS = [];
  let ACTIVE_ID = 'default';
  let CURRENT_EDITING_ID = null;

  function loadPresets() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        PRESETS = saved;
      } else {
        PRESETS = JSON.parse(JSON.stringify(INITIAL_PRESETS));
      }
    } catch (_) {
      PRESETS = JSON.parse(JSON.stringify(INITIAL_PRESETS));
    }
    ACTIVE_ID = localStorage.getItem(ACTIVE_PRESET_KEY) || 'default';
  }

  function savePresets() {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(PRESETS));
      localStorage.setItem(ACTIVE_PRESET_KEY, ACTIVE_ID);
    } catch (_) {}
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  window.initPresetModule = function(container) {
    loadPresets();

    container.innerHTML = `
      <div class="toast" id="presetToast">提示信息</div>

      <!-- 隐藏的文件导入通道 -->
      <input type="file" id="presetFileInput" accept=".json,application/json" style="display:none;">

      <!-- 第一屏：主界面（顶部圆环 + 连接带 + 卡包） -->
      <section class="view" id="view-home">
        <header class="top-nav">
          <button class="round-action-btn" id="btnExitPresetApp" title="退出应用">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div class="nav-title-group">
            <h2>预设 <span class="k-ribbon">୨୧</span></h2>
            <span class="sub">PRESET ARCHITECTURE</span>
          </div>
          <button class="round-action-btn" id="btnImportPreset" title="导入预设">
            <svg viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </header>

        <main class="content-scroll">
          <!-- 顶部圆形框与连接带 -->
          <div class="hanger-connector">
            <div class="top-circle-frame" title="卡包挂环">
              <div class="top-circle-inner-dot"></div>
            </div>
            <div class="pouch-hanger-straps"></div>
          </div>

          <!-- 核心：立体卡包容器 (Card Wallet Pouch) -->
          <div class="wallet-card-pouch">
            <div class="wallet-pouch-lip"></div>

            <div class="hero-banner">
              <div class="hero-main">
                <b>当前装配预设 ♡</b>
                <span id="currentPresetLabel">默认提示词</span>
              </div>
              <span class="hero-tag">生效中</span>
            </div>

            <div class="section-label">
              <span>WALLET SLOTS (点击选用 · 右侧编辑)</span>
              <em id="presetCountText">1 个预设</em>
            </div>

            <!-- 插入卡包的预设卡片列表 -->
            <div class="preset-card-list" id="presetListContainer"></div>
          </div>
        </main>

        <!-- 底部新建预设按钮 -->
        <div class="bottom-bar">
          <button class="pill-create-btn" id="btnBottomCreate">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="btn-text">新建预设 ୨୧</span>
          </button>
        </div>
      </section>

      <!-- 第二屏：详情装配栈 -->
      <section class="view" id="view-detail">
        <header class="top-nav">
          <div class="nav-left">
            <button class="nav-back-btn" id="btnBackToHome">
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>预设</span>
            </button>
          </div>
          <div class="nav-title-group" style="text-align: right;">
            <h2 id="detailNavTitle" style="font-size: 15.5px;"><span class="highlight-title">装配栈</span></h2>
            <span class="sub">STACK BUILDER</span>
          </div>
        </header>

        <main class="content-scroll">
          <div class="detail-hint">
            <h3><span class="highlight-title">装配栈</span></h3>
            <span class="drag-gesture-tip">按住左侧手柄自由拖动换位 ·</span>
          </div>

          <div class="blocks-stack" id="blocksStack"></div>
        </main>

        <!-- 详情页底部操作 -->
        <div class="detail-bottom-bar">
          <button class="add-block-capsule" id="btnOpenAddBlock">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="btn-text">添加提示词 ୨୧</span>
          </button>
          <button class="round-export-btn" id="btnExportPreset" title="导出预设文件">
            <svg viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- 弹窗 1：新建条目 -->
      <div class="modal-overlay" id="addBlockModal">
        <div class="modal-box">
          <div class="modal-head">
            <h4>新建提示词条目</h4>
            <span class="modal-en-sub">NEW INJECT ITEM</span>
            <p>支持按住随时上下拖拽调整层级</p>
          </div>
          <div class="modal-field">
            <label>条目名称</label>
            <input type="text" id="newBlockTitle" placeholder="例如：性格偏好微调 / 场景设定" maxlength="24">
          </div>
          <div class="modal-field">
            <label>备注说明</label>
            <input type="text" id="newBlockSub" placeholder="例如：在对话历史前注入背景" maxlength="30">
          </div>
          <div class="modal-field">
            <label>提示词内容 (Prompt)</label>
            <textarea id="newBlockPrompt" rows="4" placeholder="在此写入将注入给 AI 的提示词内容..."></textarea>
          </div>
          <div class="modal-btns">
            <button class="m-cancel" id="btnCancelAddBlock">取消</button>
            <button class="m-confirm" id="btnConfirmAddBlock">添加条目</button>
          </div>
        </div>
      </div>

      <!-- 弹窗 2：新建预设 -->
      <div class="modal-overlay" id="newPresetModal">
        <div class="modal-box">
          <div class="modal-head">
            <h4>新建预设</h4>
            <span class="modal-en-sub">PRESET ARCHITECTURE</span>
            <p>创建一组专属的提示词堆叠预设</p>
          </div>
          <div class="modal-field">
            <label>预设名称</label>
            <input type="text" id="newPresetName" placeholder="例如：慢热小说向" maxlength="20">
          </div>
          <div class="modal-field">
            <label>预设简述</label>
            <input type="text" id="newPresetDesc" placeholder="简短描述该预设特征" maxlength="60">
          </div>
          <div class="modal-btns">
            <button class="m-cancel" id="btnCancelAddPreset">取消</button>
            <button class="m-confirm" id="btnConfirmAddPreset">确认创建</button>
          </div>
        </div>
      </div>
    `;

    function showToast(text) {
      const t = container.querySelector('#presetToast');
      if (!t) return;
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 1600);
    }

    // 渲染卡包内的预设卡片
    function renderPresetList() {
      const listEl = container.querySelector('#presetListContainer');
      const countEl = container.querySelector('#presetCountText');
      const activeLabelEl = container.querySelector('#currentPresetLabel');

      countEl.textContent = `${PRESETS.length} 个预设`;
      const cur = PRESETS.find(p => p.id === ACTIVE_ID) || PRESETS[0];
      if (cur) activeLabelEl.textContent = cur.name;

      listEl.innerHTML = PRESETS.map(p => {
        const isActive = p.id === ACTIVE_ID;
        const count = p.blocks ? p.blocks.length : 0;
        const actionHtml = p.isDefault
          ? `<button class="preset-card-action-btn is-lock" data-act="lock" title="系统锁定">
              <svg viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="11" rx="3.5" ry="3.5"/>
                <path d="M8 10V6.5a4 4 0 0 1 8 0V10"/>
                <circle cx="12" cy="15" r="1.2" fill="currentColor"/>
                <path d="M12 16.2v1.6"/>
              </svg>
            </button>`
          : `<button class="preset-card-action-btn" data-act="edit" data-id="${p.id}" title="进入编辑条目">
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>`;

        return `
          <div class="preset-card ${isActive ? 'is-active' : ''}" data-id="${p.id}">
            <div class="preset-card-body">
              <div class="preset-card-row-top">
                <span class="preset-ribbon">·</span>
                <span class="preset-card-title"><span class="highlight-title">${escapeHtml(p.name)}</span></span>
                ${isActive ? '<span class="active-chip">ACTIVE</span>' : ''}
              </div>
              ${p.desc ? `<div class="preset-card-desc">${escapeHtml(p.desc)}</div>` : ''}
              <div class="preset-card-row-sub">
                <span>${p.isDefault ? '系统内置 · 锁定只选' : count + ' 个提示词条目'}</span>
              </div>
            </div>
            ${actionHtml}
          </div>
        `;
      }).join('');
    }

    // 渲染详情页条目
    function renderDetailBlocks(preset) {
      const stack = container.querySelector('#blocksStack');
      container.querySelector('#detailNavTitle').innerHTML = `<span class="highlight-title">${escapeHtml(preset.name)}</span>`;

      stack.innerHTML = (preset.blocks || []).map((b, idx) => {
        if (b.locked) {
          const badgeClass = b.type === 'anchor' ? 'badge-anchor' : 'badge-system';
          const badgeName = b.type === 'anchor' ? 'ANCHOR' : 'SYSTEM';
          return `
            <div class="block is-locked" data-index="${idx}" draggable="true">
              <div class="block-studs"><span class="stud"></span><span class="stud"></span><span class="stud"></span></div>
              <div class="block-header" data-act="locked-tip">
                <div class="drag-handle" title="按住可拖动换位"><span></span><span></span><span></span></div>
                <span class="block-badge ${badgeClass}">${badgeName}</span>
                <div class="block-info">
                  <div class="block-title">${escapeHtml(b.title)}</div>
                  <div class="block-sub">${escapeHtml(b.sub)}</div>
                </div>
                <div class="lock-tag" title="系统核心规范，秘密锁定">
                  <svg viewBox="0 0 24 24">
                    <rect x="5" y="10" width="14" height="11" rx="3.5" ry="3.5"/>
                    <path d="M8 10V6.5a4 4 0 0 1 8 0V10"/>
                    <circle cx="12" cy="15" r="1.2" fill="currentColor"/>
                    <path d="M12 16.2v1.6"/>
                  </svg>
                  <span>锁定</span>
                </div>
              </div>
            </div>
          `;
        }

        return `
          <div class="block" data-index="${idx}" draggable="true">
            <div class="block-studs"><span class="stud"></span><span class="stud"></span><span class="stud"></span></div>
            <div class="block-header">
              <div class="drag-handle" title="按住可拖动换位"><span></span><span></span><span></span></div>
              <span class="block-badge badge-custom">INJECT</span>
              <div class="block-info">
                <div class="block-title"><span class="highlight-title">${escapeHtml(b.title)}</span></div>
                <div class="block-sub">${escapeHtml(b.sub)}</div>
              </div>
              <button class="switch ${b.enabled !== false ? 'on' : ''}" data-act="toggle"></button>
            </div>
            <div class="block-body">
              <div class="block-field-group">
                <label class="block-field-label">条目名称</label>
                <input type="text" class="block-title-input" value="${escapeHtml(b.title)}" placeholder="输入条目名称...">
              </div>
              <div class="block-field-group">
                <label class="block-field-label">提示词内容</label>
                <textarea class="block-textarea">${escapeHtml(b.text || '')}</textarea>
              </div>
              <div class="block-actions">
                <button class="del-btn" data-act="delete">删除条目</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      initDragEvents();
    }

    // 全员拖拽换位
    let draggedBlock = null;
    function initDragEvents() {
      const stack = container.querySelector('#blocksStack');
      const blocks = stack.querySelectorAll('.block');

      blocks.forEach(block => {
        block.ondragstart = (e) => {
          draggedBlock = block;
          block.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
        };

        block.ondragend = () => {
          if (draggedBlock) {
            draggedBlock.classList.remove('is-dragging');
            draggedBlock = null;
          }
          stack.querySelectorAll('.block').forEach(b => b.classList.remove('drag-over'));
          syncBlocksOrder();
          showToast('条目顺序已更新 ୨୧');
        };

        block.ondragover = (e) => {
          e.preventDefault();
          if (!draggedBlock || draggedBlock === block) return;
          const rect = block.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          block.classList.add('drag-over');

          if (e.clientY < midY) {
            stack.insertBefore(draggedBlock, block);
          } else {
            stack.insertBefore(draggedBlock, block.nextSibling);
          }
        };

        block.ondragleave = () => {
          block.classList.remove('drag-over');
        };

        // 移动端 Touch 拖拽
        const handle = block.querySelector('.drag-handle');
        if (handle && !handle._touchBound) {
          handle._touchBound = true;
          let isTouchDragging = false;

          handle.addEventListener('touchstart', (e) => {
            draggedBlock = block;
            isTouchDragging = true;
            block.classList.add('is-dragging');
          }, { passive: true });

          handle.addEventListener('touchmove', (e) => {
            if (!isTouchDragging) return;
            const currentY = e.touches[0].clientY;
            const targetEl = document.elementFromPoint(e.touches[0].clientX, currentY);
            const targetBlock = targetEl ? targetEl.closest('.block') : null;

            if (targetBlock && targetBlock !== draggedBlock && targetBlock.parentNode === stack) {
              const rect = targetBlock.getBoundingClientRect();
              if (currentY < rect.top + rect.height / 2) {
                stack.insertBefore(draggedBlock, targetBlock);
              } else {
                stack.insertBefore(draggedBlock, targetBlock.nextSibling);
              }
            }
          }, { passive: true });

          const touchEnd = () => {
            if (isTouchDragging) {
              isTouchDragging = false;
              if (draggedBlock) {
                draggedBlock.classList.remove('is-dragging');
                draggedBlock = null;
              }
              syncBlocksOrder();
              showToast('条目顺序已更新 ୨୧');
            }
          };
          handle.addEventListener('touchend', touchEnd);
          handle.addEventListener('touchcancel', touchEnd);
        }
      });
    }

    function syncBlocksOrder() {
      const preset = PRESETS.find(p => p.id === CURRENT_EDITING_ID);
      if (!preset || !preset.blocks) return;
      const stack = container.querySelector('#blocksStack');
      const newBlocks = [];
      stack.querySelectorAll('.block').forEach(b => {
        const oldIdx = parseInt(b.dataset.index, 10);
        if (preset.blocks[oldIdx]) newBlocks.push(preset.blocks[oldIdx]);
      });
      preset.blocks = newBlocks;
      savePresets();
      renderDetailBlocks(preset);
    }

    // 退出按钮绑定
    const exitBtn = container.querySelector('#btnExitPresetApp');
    if (exitBtn) {
      exitBtn.onclick = () => {
        if (typeof window.closeApp === 'function') {
          window.closeApp();
        } else if (window.parent && typeof window.parent.closeApp === 'function') {
          window.parent.closeApp();
        } else {
          showToast('已退出预设');
        }
      };
    }

    // 主列表交互
    container.querySelector('#presetListContainer').addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.preset-card-action-btn');
      const card = e.target.closest('.preset-card');
      if (!card) return;

      const pid = card.dataset.id;
      const p = PRESETS.find(x => x.id === pid);
      if (!p) return;

      if (actionBtn) {
        if (actionBtn.dataset.act === 'lock') {
          showToast('系统默认提示词已锁定，仅可选用，不可编辑 ୨୧');
        } else if (actionBtn.dataset.act === 'edit') {
          CURRENT_EDITING_ID = p.id;
          renderDetailBlocks(p);
          container.querySelector('#view-detail').classList.add('is-open');
        }
        return;
      }

      ACTIVE_ID = p.id;
      savePresets();
      renderPresetList();
      showToast(`已选用「${p.name}」`);
    });

    // 详情页条目操作
    container.querySelector('#blocksStack').addEventListener('click', (e) => {
      const block = e.target.closest('.block');
      if (!block) return;
      const preset = PRESETS.find(p => p.id === CURRENT_EDITING_ID);
      if (!preset || !preset.blocks) return;
      const idx = parseInt(block.dataset.index, 10);

      if (e.target.closest('.drag-handle')) return;

      const sw = e.target.closest('.switch');
      if (sw) {
        sw.classList.toggle('on');
        const on = sw.classList.contains('on');
        block.style.opacity = on ? '1' : '0.45';
        if (preset.blocks[idx]) preset.blocks[idx].enabled = on;
        savePresets();
        showToast(on ? '已启用该条目注入' : '已停用该条目注入');
        return;
      }

      const del = e.target.closest('.del-btn');
      if (del) {
        preset.blocks.splice(idx, 1);
        savePresets();
        renderDetailBlocks(preset);
        showToast('条目已移除');
        return;
      }

      if (e.target.closest('[data-act="locked-tip"]')) {
        showToast('系统核心规范已锁定保护，不可查看 ୨୧');
        return;
      }

      if (e.target.closest('.block-header')) {
        block.classList.toggle('is-expanded');
      }
    });

    // 实时修改条目名称与正文
    container.querySelector('#blocksStack').addEventListener('input', (e) => {
      const block = e.target.closest('.block');
      if (!block) return;
      const idx = parseInt(block.dataset.index, 10);
      const preset = PRESETS.find(p => p.id === CURRENT_EDITING_ID);
      if (!preset || !preset.blocks || !preset.blocks[idx]) return;

      const titleInput = e.target.closest('.block-title-input');
      if (titleInput) {
        preset.blocks[idx].title = titleInput.value;
        const titleEl = block.querySelector('.block-title');
        if (titleEl) titleEl.innerHTML = `<span class="highlight-title">${escapeHtml(titleInput.value.trim() || '未命名条目')}</span>`;
        savePresets();
        return;
      }

      const ta = e.target.closest('.block-textarea');
      if (ta) {
        preset.blocks[idx].text = ta.value;
        savePresets();
      }
    });

    // 返回主界面
    container.querySelector('#btnBackToHome').onclick = () => {
      container.querySelector('#view-detail').classList.remove('is-open');
      renderPresetList();
    };

    // 弹窗：新建条目
    container.querySelector('#btnOpenAddBlock').onclick = () => {
      container.querySelector('#newBlockTitle').value = '';
      container.querySelector('#newBlockSub').value = '';
      container.querySelector('#newBlockPrompt').value = '';
      container.querySelector('#addBlockModal').classList.add('is-active');
      setTimeout(() => container.querySelector('#newBlockTitle').focus(), 50);
    };
    container.querySelector('#btnCancelAddBlock').onclick = () => {
      container.querySelector('#addBlockModal').classList.remove('is-active');
    };
    container.querySelector('#addBlockModal').onclick = (e) => {
      if (e.target === container.querySelector('#addBlockModal')) {
        container.querySelector('#addBlockModal').classList.remove('is-active');
      }
    };
    container.querySelector('#btnConfirmAddBlock').onclick = () => {
      let title = container.querySelector('#newBlockTitle').value.trim() || '新提示词条目';
      let sub = container.querySelector('#newBlockSub').value.trim() || '自定义注入条目';
      let prompt = container.querySelector('#newBlockPrompt').value.trim();

      const preset = PRESETS.find(p => p.id === CURRENT_EDITING_ID);
      if (preset) {
        preset.blocks = preset.blocks || [];
        preset.blocks.push({
          type: 'custom',
          locked: false,
          title,
          sub,
          enabled: true,
          text: prompt
        });
        savePresets();
        renderDetailBlocks(preset);
        container.querySelector('#addBlockModal').classList.remove('is-active');
        showToast('条目已添加 ୨୧');
      }
    };

    // 弹窗：新建预设
    const openPresetModal = () => {
      container.querySelector('#newPresetName').value = '';
      container.querySelector('#newPresetDesc').value = '';
      container.querySelector('#newPresetModal').classList.add('is-active');
      setTimeout(() => container.querySelector('#newPresetName').focus(), 50);
    };
    container.querySelector('#btnBottomCreate').onclick = openPresetModal;
    container.querySelector('#btnCancelAddPreset').onclick = () => {
      container.querySelector('#newPresetModal').classList.remove('is-active');
    };
    container.querySelector('#newPresetModal').onclick = (e) => {
      if (e.target === container.querySelector('#newPresetModal')) {
        container.querySelector('#newPresetModal').classList.remove('is-active');
      }
    };
    container.querySelector('#btnConfirmAddPreset').onclick = () => {
      let name = container.querySelector('#newPresetName').value.trim();
      let desc = container.querySelector('#newPresetDesc').value.trim();

      if (!name) name = '预设 ' + (PRESETS.length + 1);
      if (!desc) desc = '自定义装配预设';

      const newId = 'preset_' + Date.now().toString(36);
      const newPlan = {
        id: newId,
        name,
        desc,
        isDefault: false,
        blocks: [
          { type: 'system', locked: true, title: '默认人设底层规范 (System Core)', sub: '独立三维人格 · 说话习惯 · 真实瑕疵' },
          { type: 'anchor', locked: true, title: '聊天上下文流 (Chat History Stream)', sub: '最近滑动记录与对话气泡由此注入' },
          { type: 'system', locked: true, title: '格式与输出协议 (JSON Protocol)', sub: '气泡条数限制 · 心声字段约束' }
        ]
      };
      PRESETS.push(newPlan);
      ACTIVE_ID = newId;
      savePresets();
      renderPresetList();
      container.querySelector('#newPresetModal').classList.remove('is-active');
      showToast(`已成功创建「${name}」୨୧`);
    };

    // 导入功能
    const fileInput = container.querySelector('#presetFileInput');
    const importBtn = container.querySelector('#btnImportPreset');
    importBtn.onclick = () => {
      fileInput.value = '';
      fileInput.click();
    };
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const imported = Array.isArray(data) ? data[0] : data;
          if (!imported || typeof imported !== 'object' || !imported.name) throw new Error();

          const newId = 'preset_' + Date.now().toString(36);
          const newPreset = {
            id: newId,
            name: imported.name,
            desc: imported.desc || '已导入的预设',
            isDefault: false,
            blocks: Array.isArray(imported.blocks) && imported.blocks.length ? imported.blocks : [
              { type: 'system', locked: true, title: '默认人设底层规范 (System Core)', sub: '独立三维人格 · 说话习惯 · 真实瑕疵' },
              { type: 'anchor', locked: true, title: '聊天上下文流 (Chat History Stream)', sub: '最近滑动记录与对话气泡由此注入' },
              { type: 'system', locked: true, title: '格式与输出协议 (JSON Protocol)', sub: '气泡条数限制 · 心声字段约束' }
            ]
          };

          PRESETS.push(newPreset);
          ACTIVE_ID = newId;
          savePresets();
          renderPresetList();
          showToast(`已成功导入预设「${newPreset.name}」୨୧`);
        } catch (_) {
          showToast('导入失败：文件格式不兼容 ୨୧');
        }
      };
      reader.readAsText(file);
    };

    // 导出功能
    container.querySelector('#btnExportPreset').onclick = () => {
      const preset = PRESETS.find(p => p.id === CURRENT_EDITING_ID);
      if (!preset) return;

      const exportData = {
        version: '1.0',
        name: preset.name,
        desc: preset.desc || '',
        blocks: preset.blocks || []
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `${preset.name || 'preset'}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast(`已导出「${preset.name}」୨୧`);
    };

    // 首次渲染
    renderPresetList();
  };
})();
