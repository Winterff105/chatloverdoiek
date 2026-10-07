/* =========================================
   3. 空间检测与防穿模核心算法
   ========================================= */
function getOccupiedSlots(slot, span, rowSpan) {
    const startRow = Math.floor(slot / 4);
    const startCol = slot % 4;

    if (startCol + span > 4 || startRow + rowSpan > 5) {
        return null;
    }

    const slots = [];
    for (let r = 0; r < rowSpan; r++) {
        for (let c = 0; c < span; c++) {
            slots.push((startRow + r) * 4 + (startCol + c));
        }
    }
    return slots;
}

function buildPageOccupancyMap(pageIdx, excludeItemId) {
    const map = Array(20).fill(null);
    desktopItems.forEach(item => {
        if (item.page === pageIdx && item.id !== excludeItemId) {
            const occ = getOccupiedSlots(item.slot, item.span, item.rowSpan);
            if (occ) {
                occ.forEach(s => {
                    map[s] = item;
                });
            }
        }
    });
    return map;
}
