/* =========================================
   6. 拖拽引擎
   ========================================= */
let dragSession = null;

function attachDragAndHoldEvents(el, itemData) {
    let startX = 0, startY = 0;
    let isDragging = false;
    let holdTimer = null;

    el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.profile-avatar-wrap, .hb-avatar-wrap, .chip-avatar')) return; // 阻止点击头像区域拖拽

        startX = e.clientX;
        startY = e.clientY;
        isDragging = false;

        holdTimer = setTimeout(() => {
            phoneContainer.classList.add('edit-mode');
            if (navigator.vibrate) navigator.vibrate(40);
        }, 500);

        const onMove = (moveEvent) => {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            
            if (dist > 7) {
                clearTimeout(holdTimer);
            }

            if (!isDragging && dist > 7) {
                isDragging = true;
                window.isGlobalDragging = true; // 锁定检测，拖拽期间禁止全局色彩误判与闪烁
                el.classList.add('dragging');

                const avatar = el.cloneNode(true);
                // 继承当前固定的明暗色彩类，防止浮空变色
                const colorModeClass = el.classList.contains('adaptive-light') ? 'adaptive-light' : 'adaptive-dark';
                avatar.className = `drag-avatar ${colorModeClass}`;
                avatar.style.width = `${el.offsetWidth}px`;
                avatar.style.height = `${el.offsetHeight}px`;
                avatar.style.left = `${moveEvent.clientX}px`;
                avatar.style.top = `${moveEvent.clientY}px`;
                document.body.appendChild(avatar);

                dragSession = {
                    sourceEl: el,
                    item: itemData,
                    avatar: avatar
                };
            }

            if (isDragging && dragSession) {
                dragSession.avatar.style.left = `${moveEvent.clientX}px`;
                dragSession.avatar.style.top = `${moveEvent.clientY}px`;

                checkEdgePageFlip(moveEvent.clientX);

                dragSession.avatar.style.display = 'none';
                const hoverEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                dragSession.avatar.style.display = '';

                document.querySelectorAll('.app-item.target-hover, .widget-item.target-hover').forEach(node => node.classList.remove('target-hover'));
                
                const hoverTarget = hoverEl ? hoverEl.closest('.app-item') : null;
                if (hoverTarget && hoverTarget !== el && itemData.span === 1 && hoverTarget.dataset.type === 'app') {
                    hoverTarget.classList.add('target-hover');
                }
            }
        };

        const onUp = (upEvent) => {
            clearTimeout(holdTimer);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);

            if (isDragging && dragSession) {
                dragSession.avatar.remove();
                el.classList.remove('dragging');
                document.querySelectorAll('.target-hover').forEach(node => node.classList.remove('target-hover'));

                const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                executeDrop(dropTarget, dragSession, upEvent);
                dragSession = null;

                // 释放后等待 300ms 停稳，解除拖拽锁定并平滑单次重测
                setTimeout(() => {
                    window.isGlobalDragging = false;
                    if (typeof updateAllElementsAdaptiveContrast === 'function') {
                        updateAllElementsAdaptiveContrast();
                    }
                }, 300);
            } else {
                window.isGlobalDragging = false;
                if (itemData.type === 'app') {
                    openApp(itemData.id);
                }
            }
            isDragging = false;
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
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
