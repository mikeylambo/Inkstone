export interface ItemDefinition {
    id: string;
    label: string;
    stackable?: boolean;
    maxStack?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface InventoryStack {
    itemId: string;
    quantity: number;
}
export declare class InventoryManager {
    private definitions;
    private stacks;
    register(items: readonly ItemDefinition[]): void;
    add(id: string, quantity?: number): number;
    remove(id: string, quantity?: number): number;
    count(id: string): number;
    has(id: string, q?: number): boolean;
    list(): InventoryStack[];
    definition(id: string): ItemDefinition | undefined;
    private require;
}
