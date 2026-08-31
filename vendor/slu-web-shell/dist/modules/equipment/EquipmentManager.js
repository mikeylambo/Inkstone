export class EquipmentManager {
    slots = new Map();
    equipped = new Map();
    constructor(slots) { for (const s of slots)
        this.slots.set(s.id, structuredClone(s)); }
    equip(slotId, item) { const s = this.slots.get(slotId); if (!s)
        throw new Error(`Unknown equipment slot: ${slotId}`); if (s.acceptsTags?.length && !item.tags?.some(t => s.acceptsTags.includes(t)))
        throw new Error(`${item.id} cannot equip to ${slotId}`); this.equipped.set(slotId, structuredClone(item)); }
    unequip(slotId) { const i = this.equipped.get(slotId); this.equipped.delete(slotId); return i ? structuredClone(i) : undefined; }
    snapshot() { return Object.fromEntries([...this.equipped].map(([k, v]) => [k, structuredClone(v)])); }
}
