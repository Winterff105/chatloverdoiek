/* 数据迁移：把旧的 forever_* 本地存储键复制到 whatever_* 下（只复制新键不存在的情况，可重复执行） */
(function () {
    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.forEach(function (oldKey) {
            if (!oldKey || oldKey.indexOf('forever') === -1) return;
            const newKey = oldKey.replace(/forever/g, 'whatever');
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, localStorage.getItem(oldKey));
            }
        });
    } catch (e) { console.warn('[migrate] 数据迁移失败', e); }
})();
