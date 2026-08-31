import { EventBus } from "../core/EventBus.js";
export class UnlockManager {
    storage;
    key;
    events = new EventBus();
    unlocked = new Set();
    constructor(storage, key = "unlocks") {
        this.storage = storage;
        this.key = key;
    }
    async load() { const values = this.storage ? await this.storage.get(this.key) : null; this.unlocked = new Set(values ?? []); this.events.emit("unlocks:loaded", { ids: this.list() }); }
    has(id) { return this.unlocked.has(id); }
    async unlock(id) { if (this.unlocked.has(id))
        return false; this.unlocked.add(id); await this.persist(); this.events.emit("unlock:granted", { id }); return true; }
    list() { return [...this.unlocked]; }
    async persist() { if (this.storage)
        await this.storage.set(this.key, this.list()); }
}
