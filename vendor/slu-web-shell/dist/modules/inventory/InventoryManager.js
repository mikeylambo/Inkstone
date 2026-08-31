export class InventoryManager {
    definitions = new Map();
    stacks = new Map();
    register(items) { for (const i of items)
        this.definitions.set(i.id, structuredClone(i)); }
    add(id, quantity = 1) {
        const d = this.require(id);
        const current = this.stacks.get(id) ?? 0;
        const max = d.stackable === false ? 1 : (d.maxStack ?? Number.MAX_SAFE_INTEGER);
        const next = Math.min(max, current + quantity);
        this.stacks.set(id, next);
        return next;
    }
    remove(id, quantity = 1) { const current = this.stacks.get(id) ?? 0; const next = Math.max(0, current - quantity); if (next === 0)
        this.stacks.delete(id);
    else
        this.stacks.set(id, next); return next; }
    count(id) { return this.stacks.get(id) ?? 0; }
    has(id, q = 1) { return this.count(id) >= q; }
    list() { return [...this.stacks].map(([itemId, quantity]) => ({ itemId, quantity })); }
    definition(id) { const d = this.definitions.get(id); return d ? structuredClone(d) : undefined; }
    require(id) { const d = this.definitions.get(id); if (!d)
        throw new Error(`Unknown item: ${id}`); return d; }
}
