/* =========================================
   7. 桌面手势滑屏切页
   ========================================= */
let swipeStartX = 0;
let swipeStartY = 0;

document.addEventListener('DOMContentLoaded', () => {
    const desktopViewport = document.getElementById('desktopViewport');
    
    desktopViewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('.app-item, .widget-item')) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    desktopViewport.addEventListener('touchend', (e) => {
        if (e.target.closest('.app-item, .widget-item')) return;
        const diffX = e.changedTouches[0].clientX - swipeStartX;
        const diffY = e.changedTouches[0].clientY - swipeStartY;

        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0 && currentPageIndex < totalPages - 1) {
                goToPage(currentPageIndex + 1);
            } else if (diffX > 0 && currentPageIndex > 0) {
                goToPage(currentPageIndex - 1);
            }
        }
    }, { passive: true });
});
