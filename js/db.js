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
            if (!('indexedDB' in window)) { this.lastError = 'IndexedDB 不存在（当前环境不支持）'; resolve(null); return; }
            let settled = false;
            const done = (db) => { if (settled) return; settled = true; resolve(db); };
            const finish = (db) => {
                db.onversionchange = () => { db.close(); this.dbInstance = null; this._opening = null; };
                this.dbInstance = db;
                this._requestPersist();
                done(db);
            };
            const openAt = (version) => {
                let req;
                try {
                    req = version ? indexedDB.open(this.dbName, version) : indexedDB.open(this.dbName);
                } catch (e) {
                    this.lastError = 'indexedDB.open 抛错: ' + ((e && e.name) || '') + ' ' + ((e && e.message) || '');
                    done(null); return;
                }
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
                };
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    if (db.objectStoreNames.contains(this.storeName)) { finish(db); return; }
                    // 旧数据库里没有我们的表：升一个版本把表建上
                    const next = db.version + 1;
                    db.close();
                    openAt(next);
                };
                req.onerror = () => {
                    const name = (req.error && req.error.name) || '';
                    // 库里已经是更高版本（旧版本留下的）：不指定版本，直接打开现有的库
                    if (name === 'VersionError' && version) { openAt(0); return; }
                    this.lastError = 'indexedDB.open 失败: ' + name + ' ' + ((req.error && req.error.message) || '');
                    done(null);
                };
                req.onblocked = () => {
                    // 被其他标签页占着：最多等 6 秒，之后给出提示，下次调用再重试
                    setTimeout(() => {
                        if (!this.dbInstance && !settled) {
                            this.lastError = 'indexedDB 被其他页面占用，请关闭其他标签页后刷新';
                            this._opening = null;
                            done(null);
                        }
                    }, 6000);
                };
            };
            // 不指定版本号：打开任何已有版本的库；缺表时再自动升级
            openAt(0);
        });
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

    /* 大文件（如聊天室截图）只写 IndexedDB，不回退 localStorage（容量只有几 MB，很容易满） */
    async saveLarge(key, value) {
        try {
            const db = await this.init();
            if (!db) { this.lastError = this.lastError || 'IndexedDB 无法打开'; return false; }
            await new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, 'readwrite');
                tx.objectStore(this.storeName).put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
            });
            this.lastError = '';
            return true;
        } catch (e) {
            this.lastError = '写入失败: ' + ((e && e.name) || '') + ' ' + ((e && e.message) || '');
            console.warn('[DB] 大文件保存失败:', key, this.lastError);
            return false;
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
