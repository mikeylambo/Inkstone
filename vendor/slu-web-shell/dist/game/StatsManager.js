export class StatsManager {
    storage;
    key;
    stats = {};
    constructor(storage, key = "stats") {
        this.storage = storage;
        this.key = key;
    }
    async load() {
        if (!this.storage)
            return;
        this.stats = (await this.storage.get(this.key)) ?? {};
    }
    get(key, fallback) {
        return (this.stats[key] ?? fallback ?? 0);
    }
    async set(key, value) {
        this.stats[key] = value;
        await this.persist();
    }
    async increment(key, amount = 1) {
        const next = Number(this.stats[key] ?? 0) + amount;
        this.stats[key] = next;
        await this.persist();
        return next;
    }
    snapshot() {
        return structuredClone(this.stats);
    }
    async persist() {
        if (this.storage)
            await this.storage.set(this.key, this.stats);
    }
}
