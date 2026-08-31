/** Async storage for replay tapes, ghosts, larger profiles and other data that should not live in localStorage. */
export class IndexedDBStorage {
    dbName;
    storeName;
    dbPromise;
    constructor(dbName, storeName = "slu", version = 1) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);
            request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName))
                request.result.createObjectStore(storeName); };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async transaction(mode) {
        const db = await this.dbPromise;
        return db.transaction(this.storeName, mode).objectStore(this.storeName);
    }
    async get(key) {
        const store = await this.transaction("readonly");
        return new Promise((resolve, reject) => { const r = store.get(key); r.onsuccess = () => resolve((r.result ?? null)); r.onerror = () => reject(r.error); });
    }
    async set(key, value) {
        const store = await this.transaction("readwrite");
        return new Promise((resolve, reject) => { const r = store.put(value, key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
    }
    async remove(key) {
        const store = await this.transaction("readwrite");
        return new Promise((resolve, reject) => { const r = store.delete(key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
    }
    async clear() {
        const store = await this.transaction("readwrite");
        return new Promise((resolve, reject) => { const r = store.clear(); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
    }
}
