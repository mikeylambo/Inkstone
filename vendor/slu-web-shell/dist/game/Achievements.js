import { EventBus } from "../core/EventBus.js";
export class AchievementManager {
    provider;
    events = new EventBus();
    unlocked = new Set();
    definitions = new Map();
    constructor(provider) {
        this.provider = provider;
    }
    register(definitions) { for (const d of definitions)
        this.definitions.set(d.id, structuredClone(d)); }
    async unlock(id) {
        const def = this.definitions.get(id);
        if (!def)
            throw new Error(`Unknown achievement: ${id}`);
        if (this.unlocked.has(id))
            return false;
        this.unlocked.add(id);
        await this.provider?.unlock(id);
        this.events.emit("achievement:unlocked", structuredClone(def));
        return true;
    }
    has(id) { return this.unlocked.has(id); }
}
