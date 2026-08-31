import type { Equipable } from "../loadout/LoadoutManager.js";
export interface VehicleDefinition extends Equipable {
    label: string;
    stats?: Record<string, number>;
    unlockedByDefault?: boolean;
}
export declare class GarageManager {
    private vehicles;
    private owned;
    private selectedId;
    register(vehicles: readonly VehicleDefinition[]): void;
    acquire(id: string): void;
    owns(id: string): boolean;
    select(id: string): VehicleDefinition;
    selected(): VehicleDefinition | null;
    get(id: string): VehicleDefinition | undefined;
    listOwned(): VehicleDefinition[];
}
