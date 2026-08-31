export class MemoryStorage {
    data = new Map();
    async get(key) {
        return (this.data.has(key) ? this.data.get(key) : null);
    }
    async set(key, value) {
        this.data.set(key, structuredClone(value));
    }
    async remove(key) {
        this.data.delete(key);
    }
    async clear() {
        this.data.clear();
    }
}
