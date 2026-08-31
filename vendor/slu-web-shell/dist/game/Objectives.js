import { EventBus } from "../core/EventBus.js";
export class ObjectiveManager {
    events = new EventBus();
    definitions = new Map();
    progress = new Map();
    setObjectives(definitions) {
        this.definitions.clear();
        this.progress.clear();
        for (const definition of definitions) {
            this.definitions.set(definition.id, structuredClone(definition));
            this.progress.set(definition.id, { id: definition.id, value: 0, complete: false });
        }
        this.events.emit("objectives:reset", { ids: definitions.map(d => d.id) });
    }
    add(id, amount = 1) {
        const current = this.progress.get(id);
        return this.set(id, current.value + amount);
    }
    set(id, value) {
        const definition = this.requireDefinition(id);
        const previous = this.progress.get(id);
        const next = { id, value, complete: value >= (definition.target ?? 1) };
        this.progress.set(id, next);
        this.events.emit("objective:changed", { ...next });
        if (next.complete && !previous.complete) {
            this.events.emit("objective:completed", {
                definition: structuredClone(definition), progress: { ...next }
            });
        }
        return { ...next };
    }
    complete(id) { const d = this.requireDefinition(id); return this.set(id, d.target ?? 1); }
    get(id) { const v = this.progress.get(id); return v ? { ...v } : undefined; }
    definition(id) { const d = this.definitions.get(id); return d ? structuredClone(d) : undefined; }
    allRequiredComplete() {
        return [...this.definitions.values()].filter(x => !x.optional).every(x => this.progress.get(x.id)?.complete);
    }
    snapshot() { return [...this.progress.values()].map(x => ({ ...x })); }
    requireDefinition(id) {
        const d = this.definitions.get(id);
        if (!d)
            throw new Error(`Unknown objective: ${id}`);
        return d;
    }
}
