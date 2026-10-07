/* =========================================
   4. 渲染系统
   ========================================= */
function renderUI(animateTargetId = null) {
    desktopTrack.innerHTML = '';
    for (let p = 0; p < totalPages; p++) {
        const pageEl = document.createElement('div');
        pageEl.className = 'desktop-page';
        pageEl.dataset.pageIndex = p;

        const itemsOnThisPage = desktopItems.filter(item => item.page === p);

        itemsOnThisPage.forEach(item => {
            const row = Math.floor(item.slot / 4) + 1;
            const col = (item.slot % 4) + 1;

            let el;
            if (item.type === 'app') {
                el = createAppElement(item.id, 'desktop', item.slot, p);
            } else if (item.type === 'widget-polaroid') {
                el = createPolaroidWidgetElement(item);
            } else if (item.type === 'widget-heartbeat') {
                el = createHeartbeatWidgetElement(item);
            } else if (item.type === 'widget-profile') {
                el = createProfileWidgetElement(item);
            } else if (item.type === 'widget-mp3') {
                el = createMp3WidgetElement(item);
            } else if (item.type === 'widget-dialogue') {
                el = createDialogueWidgetElement(item);
            }

            el.style.gridRow = `${row} / span ${item.rowSpan || 1}`;
            el.style.gridColumn = `${col} / span ${item.span || 1}`;

            if (item.id === animateTargetId) {
                el.classList.add('just-swapped');
            }

            pageEl.appendChild(el);
        });

        desktopTrack.appendChild(pageEl);
    }

    updateTrackPosition();
    renderPaginationDots();

    // 渲染 Dock 栏
    dockBar.innerHTML = '';
    dockData.forEach((appId, index) => {
        const dockSlot = document.createElement('div');
        dockSlot.className = 'dock-slot';
        
        const appEl = createAppElement(appId, 'dock', index, -1);
        if (appId === animateTargetId) {
            appEl.classList.add('just-swapped');
        }
        dockSlot.appendChild(appEl);
        dockBar.appendChild(dockSlot);
    });

    checkDockAnimation();
    
    // 渲染完成后触发逐个图标精准背景亮度采样
    requestAnimationFrame(() => {
        if (typeof updateAllElementsAdaptiveContrast === 'function') {
            updateAllElementsAdaptiveContrast();
        }
    });
}

function updateTrackPosition() {
    desktopTrack.style.transform = `translateX(-${currentPageIndex * 100}%)`;
}

function renderPaginationDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `page-dot ${i === currentPageIndex ? 'active' : ''}`;
        dot.onclick = (e) => {
            e.stopPropagation();
            goToPage(i);
        };
        dotsContainer.appendChild(dot);
    }
}

function goToPage(pageIdx) {
    currentPageIndex = Math.max(0, Math.min(totalPages - 1, pageIdx));
    updateTrackPosition();
    renderPaginationDots();
}

/* 测量桌面网格宽度，同步 Dock 栏尺寸与间距 */
function checkDockAnimation() {
    const currentCount = dockData.length;
    const containerRect = phoneContainer.getBoundingClientRect();
    const colWidth = (containerRect.width - 32 - 30) / 4;
    const colGap = 10;

    document.querySelectorAll('.dock-slot').forEach(slot => {
        slot.style.width = `${colWidth}px`;
    });

    const targetWidth = currentCount === 0 ? 90 : (currentCount * colWidth + (currentCount - 1) * colGap + 16);
    dockBar.style.gap = `${colGap}px`;
    dockBar.style.width = `${targetWidth}px`;
}
