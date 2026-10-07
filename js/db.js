/* =========================================
   Studio Noir OS · 无容量限制的高性能持久化存储引擎 (db.js)
   基于 IndexedDB 架构，彻底打破 iOS Safari 5MB 限制，支持海量高清图片与状态秒存
   ========================================= */
const DB = {
    dbName: 'NoirOS_Unlimited_DB',
    storeName: 'kv_store',
    dbInstance: null,

    init() {
        return new Promise((resolve) => {
            if (this.dbInstance) {
                resolve(this.dbInstance);
                return;
            }
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => {
                console.warn('IndexedDB 初始化失败，自动降级至 LocalStorage');
                resolve(null);
            };
            request.onsuccess = (e) => {
                this.dbInstance = e.target.result;
                resolve(this.dbInstance);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    },

    async save(key, value) {
        console.log('🛠️ [DB SAVE] 准备保存键值 ->', key, value);
        try {
            const db = await this.init();
            if (!db) {
                localStorage.setItem(`noir_os_${key}`, JSON.stringify(value));
                console.log('⚠️ [DB SAVE] IndexedDB 未就绪，已回退至 LocalStorage 保存成功:', key);
                return true;
            }
            return new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(value, key);
                request.onsuccess = () => {
                    console.log('✅ [DB SAVE] IndexedDB 保存成功 ->', key, value);
                    resolve(true);
                };
                request.onerror = (err) => {
                    console.error('❌ [DB SAVE] IndexedDB 保存失败，尝试 LocalStorage 回退:', err);
                    try {
                        localStorage.setItem(`noir_os_${key}`, JSON.stringify(value));
                        resolve(true);
                    } catch (fallbackErr) {
                        console.error('❌ [DB SAVE] 回退 LocalStorage 同样失败:', fallbackErr);
                        resolve(false);
                    }
                };
            });
        } catch (e) {
            console.error('❌ [DB SAVE EXCEPTION]:', e);
            return false;
        }
    },

    async load(key, defaultValue = null) {
        console.log('🔍 [DB LOAD] 准备读取键 ->', key, '默认值:', defaultValue);
        try {
            const db = await this.init();
            if (!db) {
                const item = localStorage.getItem(`noir_os_${key}`);
                const parsed = item ? JSON.parse(item) : defaultValue;
                console.log('⚠️ [DB LOAD] IndexedDB 未就绪，从 LocalStorage 读取结果 ->', key, parsed);
                return parsed;
            }
            return new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = (e) => {
                    const result = e.target.result;
                    if (result !== undefined && result !== null) {
                        console.log('✅ [DB LOAD] IndexedDB 读取成功 ->', key, result);
                        resolve(result);
                    } else {
                        const fallback = localStorage.getItem(`noir_os_${key}`);
                        const parsedFallback = fallback ? JSON.parse(fallback) : defaultValue;
                        console.log('🔍 [DB LOAD] IndexedDB 无数据，读取 LocalStorage 备份 ->', key, parsedFallback);
                        resolve(parsedFallback);
                    }
                };
                request.onerror = (err) => {
                    console.error('❌ [DB LOAD ERROR] 读取出错，尝试 LocalStorage:', err);
                    const fallback = localStorage.getItem(`noir_os_${key}`);
                    resolve(fallback ? JSON.parse(fallback) : defaultValue);
                };
            });
        } catch (e) {
            console.error('❌ [DB LOAD EXCEPTION]:', e);
            return defaultValue;
        }
    },

    async remove(key) {
        try {
            const db = await this.init();
            if (db) {
                const transaction = db.transaction(this.storeName, 'readwrite');
                transaction.objectStore(this.storeName).delete(key);
            }
            localStorage.removeItem(`noir_os_${key}`);
        } catch (e) {
            console.error('DB Remove Error:', e);
        }
    }
};

window.DB = DB;
