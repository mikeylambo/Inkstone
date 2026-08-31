export interface SlotDefinition {
    id: string;
    accepts?: string[];
    required?: boolean;
}
export interface Equipable {
    id: string;
    tags?: string[];
}
export declare class LoadoutManager<T extends Equipable = Equipable> {
    private equipped;
    private slots;
    constructor(slots?: readonly SlotDefinition[]);
    define(slots: readonly SlotDefinition[]): void;
    equip(slotId: string, item: T): void;
    unequip(slotId: string): void;
    get(slotId: string): T | undefined;
    snapshot(): Record<string, T>;
}
