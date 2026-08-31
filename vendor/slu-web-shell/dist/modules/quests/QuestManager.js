import { EventBus } from "../../core/EventBus.js";
export class QuestManager {
    events = new EventBus();
    defs = new Map();
    states = new Map();
    register(quests) { for (const q of quests) {
        this.defs.set(q.id, structuredClone(q));
        this.states.set(q.id, q.prerequisites?.length ? "locked" : "available");
    } }
    refresh() { for (const [id, q] of this.defs) {
        if (this.states.get(id) === "locked" && (q.prerequisites ?? []).every(p => this.states.get(p) === "completed"))
            this.states.set(id, "available");
    } }
    start(id) { this.refresh(); if (this.states.get(id) !== "available")
        throw new Error(`Quest not available: ${id}`); const q = this.require(id); this.states.set(id, "active"); this.events.emit("quest:started", structuredClone(q)); return structuredClone(q); }
    complete(id) { if (this.states.get(id) !== "active")
        throw new Error(`Quest not active: ${id}`); const q = this.require(id); this.states.set(id, "completed"); this.refresh(); this.events.emit("quest:completed", structuredClone(q)); return structuredClone(q); }
    state(id) { return this.states.get(id); }
    require(id) { const q = this.defs.get(id); if (!q)
        throw new Error(`Unknown quest: ${id}`); return q; }
}
