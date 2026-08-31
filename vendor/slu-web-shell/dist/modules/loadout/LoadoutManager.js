export class LoadoutManager {
    equipped = new Map();
    slots = new Map();
    constructor(slots = []) { this.define(slots); }
    define(slots) {
        for (const slot of slots)
            this.slots.set(slot.id, structuredClone(slot));
    }
    equip(slotId, item) {
        const slot = this.slots.get(slotId);
        if (!slot)
            throw new Error(`Unknown slot: ${slotId}`);
        if (slot.accepts?.length && !item.tags?.some((tag) => slot.accepts.includes(tag))) {
            throw new Error(`${item.id} is not valid for slot ${slotId}`);
        }
        this.equipped.set(slotId, structuredClone(item));
    }
    unequip(slotId) {
        const slot = this.slots.get(slotId);
        if (slot?.required)
            throw new Error(`Slot ${slotId} is required`);
        this.equipped.delete(slotId);
    }
    get(slotId) {
        const item = this.equipped.get(slotId);
        return item ? structuredClone(item) : undefined;
    }
    snapshot() {
        return Object.fromEntries([...this.equipped].map(([key, value]) => [key, structuredClone(value)]));
    }
}
