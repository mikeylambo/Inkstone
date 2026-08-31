export class BrowserStorage {
    namespace;
    storage;
    constructor(namespace, storage = window.localStorage) {
        this.namespace = namespace;
        this.storage = storage;
    }
    key(key) {
        return `${this.namespace}:${key}`;
    }
    async get(key) {
        const raw = this.storage.getItem(this.key(key));
        if (raw === null)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async set(key, value) {
        this.storage.setItem(this.key(key), JSON.stringify(value));
    }
    async remove(key) {
        this.storage.removeItem(this.key(key));
    }
    async clear() {
        const prefix = `${this.namespace}:`;
        for (let i = this.storage.length - 1; i >= 0; i--) {
            const key = this.storage.key(i);
            if (key?.startsWith(prefix))
                this.storage.removeItem(key);
        }
    }
}
