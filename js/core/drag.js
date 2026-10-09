/* =========================================
   6. 拖拽引擎
   ========================================= */
let dragSession = null;
let dragListenersCleanup = null;

// 统一收尾：不管怎么结束（正常松手 / 被系统打断 / 下一次按下），都清理干净
function resetDragState() {
    if (dragListenersCleanup) {
        dragListenersCleanup();
        dragListenersCleanup = null;
    }
    if (dragSession) {
        dragSession.avatar.remove();
        dragSession.sourceEl.classList.remove('dragging');
        dragSession = null;
    }
    document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));
    window.isGlobalDragging = false;
}

function attachDragAndHoldEvents(el, itemData) {
    let startX = 0, startY = 0;
    let isDragging = false;
    let holdTimer = null;
    let didTriggerHold = false;

    el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.profile-avatar-wrap, .hb-avatar-wrap, .chip-avatar')) return;

        // 新的按下之前，先清掉上一次残留的拖拽状态
        resetDragState();

        startX = e.clientX;
        startY = e.clientY;
        isDragging = false;
        didTriggerHold = false;

        holdTimer = setTimeout(() => {
            didTriggerHold = true;
            phoneContainer.classList.add('edit-mode');
            if (navigator.vibrate) navigator.vibrate(40);

            let existingToast = document.getElementById('globalEditToast');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.id = 'globalEditToast';
            toast.className = 'global-edit-toast mono-font';
            toast.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>已进入编辑模式…</span>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 20);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, 1600);
        }, 500);

        const removeListeners = () => {
            clearTimeout(holdTimer);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
        };

        const onMove = (moveEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 7) clearTimeout(holdTimer);

            if (!isDragging && dist > 7) {
                isDragging = true;
                window.isGlobalDragging = true;
                el.classList.add('dragging');

                const avatar = el.cloneNode(true);
                const colorModeClass = el.classList.contains('adaptive-light') ? 'adaptive-light' : 'adaptive-dark';
                avatar.className = `drag-avatar ${colorModeClass}`;
                avatar.style.width = `${el.offsetWidth}px`;
                avatar.style.height = `${el.offsetHeight}px`;
                document.body.appendChild(avatar);

                dragSession = { sourceEl: el, item: itemData, avatar: avatar };
            }

            if (isDragging && dragSession) {
                // 用 transform 移动，比改 left/top 更流畅，且以手指为中心
                dragSession.avatar.style.transform =
                    `translate(${moveEvent.clientX}px, ${moveEvent.clientY}px) translate(-50%, -50%)`;

                checkEdgePageFlip(moveEvent.clientX);

                // 跟随图标 pointer-events:none，elementFromPoint 会自动穿透它，不需要隐藏再显示
                const hoverEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));

                const hoverTarget = hoverEl ? hoverEl.closest('.app-item') : null;
                if (hoverTarget && hoverTarget !== el && itemData.span === 1 && hoverTarget.dataset.type === 'app') {
                    hoverTarget.classList.add('target-hover');
                }
            }
        };

        const onUp = (upEvent) => {
            removeListeners();
            dragListenersCleanup = null;

            if (isDragging && dragSession) {
                const session = dragSession;
                dragSession = null;
                session.avatar.remove();
                el.classList.remove('dragging');
                document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));

                const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                executeDrop(dropTarget, session, upEvent);

                setTimeout(() => {
                    window.isGlobalDragging = false;
                    if (typeof updateAllElementsAdaptiveContrast === 'function') {
                        updateAllElementsAdaptiveContrast();
                    }
                }, 300);
            } else {
                window.isGlobalDragging = false;
                const isEditMode = phoneContainer.classList.contains('edit-mode');
                if (itemData.type === 'app' && !didTriggerHold) {
                    // Normal tap must open the Information app too; previously only Settings
                    // opened outside edit mode, making the Chat/Information icon look dead.
                    if (itemData.id === 'settings' || itemData.id === 'chat' || isEditMode) {
                        phoneContainer.classList.remove('edit-mode');
                        if (typeof openApp === 'function') openApp(itemData.id);
                    }
                }
            }
            isDragging = false;
        };

        // 被系统打断（比如浏览器接管了滚动）：只清理，不执行放置
        const onCancel = () => {
            removeListeners();
            dragListenersCleanup = null;
            isDragging = false;
            resetDragState();
            if (typeof renderUI === 'function') renderUI();
        };

        dragListenersCleanup = removeListeners;
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
    });
}

let flipThrottle = false;
function checkEdgePageFlip(clientX) {
    if (flipThrottle) return;
    const containerRect = phoneContainer.getBoundingClientRect();

    if (clientX < containerRect.left + 35 && currentPageIndex > 0) {
        flipThrottle = true;
        goToPage(currentPageIndex - 1);
        setTimeout(() => { flipThrottle = false; }, 600);
    } else if (clientX > containerRect.right - 35 && currentPageIndex < totalPages - 1) {
        flipThrottle = true;
        goToPage(currentPageIndex + 1);
        setTimeout(() => { flipThrottle = false; }, 600);
    }
}

function executeDrop(targetEl, session, upEvent) {
    const { item } = session;
    const fromLoc = item.location;
    const fromIdx = item.index;

    // 1. 拖入 Dock 栏 (仅允许 1×1 软件)
    const dockTarget = targetEl ? targetEl.closest('#dockBar') : null;
    if (dockTarget && item.span === 1) {
        if (fromLoc === 'desktop' && dockData.length < 4) {
            desktopItems = desktopItems.filter(x => x.id !== item.id);
            dockData.push(item.id);
            renderUI(item.id);
            return;
        }
    }

            // 2. 落在当前页的网格槽位中
            const activePageEl = document.querySelector(`.desktop-page[data-page-index="${currentPageIndex}"]`);
            if (activePageEl) {
                const pageRect = activePageEl.getBoundingClientRect();
                if (
                    upEvent.clientX >= pageRect.left && upEvent.clientX <= pageRect.right &&
                    upEvent.clientY >= pageRect.top && upEvent.clientY <= pageRect.bottom
                ) {
                    const style = window.getComputedStyle(activePageEl);
                    const padLeft = parseFloat(style.paddingLeft) || 16;
                    const padRight = parseFloat(style.paddingRight) || 16;
                    const colGap = parseFloat(style.columnGap || style.gridColumnGap) || 10;
                    const rowGap = parseFloat(style.rowGap || style.gridRowGap) || 12;

                    const rowHeight = 88;
                    const totalGridHeight = 5 * rowHeight + 4 * rowGap;
                    const gridTopOffset = Math.max(0, (pageRect.height - totalGridHeight) / 2);

                    const contentWidth = pageRect.width - padLeft - padRight;
                    const colWidth = (contentWidth - 3 * colGap) / 4;

                    const relX = upEvent.clientX - (pageRect.left + padLeft);
                    const relY = upEvent.clientY - (pageRect.top + gridTopOffset);

                    let targetCol = Math.floor((relX + colGap / 2) / (colWidth + colGap));
                    let targetRow = Math.floor((relY + rowGap / 2) / (rowHeight + rowGap));

                    targetCol = Math.max(0, Math.min(4 - item.span, targetCol));
                    targetRow = Math.max(0, Math.min(5 - item.rowSpan, targetRow));

                    const targetSlot = targetRow * 4 + targetCol;
                    const neededSlots = getOccupiedSlots(targetSlot, item.span, item.rowSpan);


            if (!neededSlots) {
                renderUI();
                return;
            }

            const occupancyMap = buildPageOccupancyMap(currentPageIndex, item.id);

            const obstacles = [];
            neededSlots.forEach(s => {
                if (occupancyMap[s] && !obstacles.includes(occupancyMap[s])) {
                    obstacles.push(occupancyMap[s]);
                }
            });

            // 空间完全空白 -> 放置成功
            if (obstacles.length === 0) {
                if (fromLoc === 'dock') {
                    dockData.splice(fromIdx, 1);
                    desktopItems.push({
                        id: item.id,
                        type: item.type,
                        page: currentPageIndex,
                        slot: targetSlot,
                        span: item.span,
                        rowSpan: item.rowSpan
                    });
                } else {
                    const cur = desktopItems.find(x => x.id === item.id);
                    if (cur) {
                        cur.slot = targetSlot;
                        cur.page = currentPageIndex;
                    }
                }
                renderUI(item.id);
                return;
            }

            // 仅与一个 1×1 软件重叠 -> 允许对调 (Swap)
            if (obstacles.length === 1 && item.span === 1 && obstacles[0].span === 1 && obstacles[0].rowSpan === 1) {
                const obstacleItem = obstacles[0];
                if (fromLoc === 'desktop') {
                    const cur = desktopItems.find(x => x.id === item.id);
                    if (cur) {
                        const tempSlot = cur.slot;
                        const tempPage = cur.page;
                        cur.slot = obstacleItem.slot;
                        cur.page = obstacleItem.page;
                        obstacleItem.slot = tempSlot;
                        obstacleItem.page = tempPage;
                    }
                } else if (fromLoc === 'dock') {
                    dockData[fromIdx] = obstacleItem.id;
                    obstacleItem.id = item.id;
                }
                renderUI(item.id);
                return;
            }

            // 空间不足 -> 拒绝穿模，自动还原
            renderUI();
            return;
        }
    }

    renderUI();
}
