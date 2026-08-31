import type { ItemDefinition } from "../inventory/InventoryManager.js";
export interface EquipmentSlot {
    id: string;
    acceptsTags?: string[];
}
export declare class EquipmentManager {
    private slots;
    private equipped;
    constructor(slots: readonly EquipmentSlot[]);
    equip(slotId: string, item: ItemDefinition): void;
    unequip(slotId: string): ItemDefinition | undefined;
    snapshot(): Record<string, ItemDefinition>;
}
