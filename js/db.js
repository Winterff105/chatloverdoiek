/* =========================================
   Forever · 本地持久化（IndexedDB 优先，不可用时回退 localStorage）
   对外接口保持不变：DB.save / DB.load / DB.remove，均返回 Promise
   ========================================= */
const DB = {
    dbName: 'NoirOS_Unlimited_DB',
    storeName: 'kv_store',
    version: 1,
    dbInstance: null,
    _opening: null,
    _lsPrefix: 'noir_os_',

    /* 所有调用共用同一个打开请求，避免并发时开出多个连接 */
    init() {
        if (this.dbInstance) return Promise.resolve(this.dbInstance);
        if (this._opening) return this._opening;
        this._opening = new Promise((resolve) => {
            if (!('indexedDB' in window)) { resolve(null); return; }
            let req;
            try {
                req = indexedDB.open(this.dbName, this.version);
            } catch (e) {
                console.warn('[DB] indexedDB.open 失败，使用 localStorage');
                resolve(null);
                return;
            }
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                // 版本升级或其他页面需要时主动让出连接，避免卡住
                db.onversionchange = () => { db.close(); this.dbInstance = null; this._opening = null; };
                this.dbInstance = db;
                this._requestPersist();
                resolve(db);
            };
            req.onerror = () => { console.warn('[DB] IndexedDB 打开失败，使用 localStorage'); resolve(null); };
            req.onblocked = () => console.warn('[DB] 数据库被其他页面占用，等待中');
        });
        // 打开失败时允许下一次调用重试
        this._opening.then((db) => { if (!db) this._opening = null; });
        return this._opening;
    },

    /* 请求持久存储，减少系统在存储紧张时清理数据的概率 */
    _requestPersist() {
        try {
            if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        } catch (_) {}
    },

    _lsSet(key, value) {
        try {
            localStorage.setItem(this._lsPrefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('[DB] localStorage 写入失败（可能超出容量）:', key);
            return false;
        }
    },

    _lsGet(key, defaultValue) {
        try {
            const raw = localStorage.getItem(this._lsPrefix + key);
            return raw === null ? defaultValue : JSON.parse(raw);
        } catch (e) {
            return defaultValue;
        }
    },

    async save(key, value) {
        try {
            const db = await this.init();
            if (!db) return this._lsSet(key, value);
            await new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                tx.objectStore(this.storeName).put(value, key);
                tx.oncomplete = () => resolve();                         // 等事务真正提交后才算保存成功
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
            });
            return true;
        } catch (e) {
            console.warn('[DB] 保存失败，改用 localStorage:', key, e && e.name);
            return this._lsSet(key, value);
        }
    },

    async load(key, defaultValue = null) {
        try {
            const db = await this.init();
            if (!db) return this._lsGet(key, defaultValue);
            const value = await new Promise((resolve, reject) => {
                const req = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            if (value !== undefined && value !== null) return value;
            return this._lsGet(key, defaultValue);
        } catch (e) {
            console.warn('[DB] 读取失败，改用 localStorage:', key, e && e.name);
            return this._lsGet(key, defaultValue);
        }
    },

    async remove(key) {
        try {
            const db = await this.init();
            if (db) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).delete(key);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }
        } catch (e) {
            console.warn('[DB] 删除失败:', key);
        }
        try { localStorage.removeItem(this._lsPrefix + key); } catch (_) {}
    }
};

window.DB = DB;
