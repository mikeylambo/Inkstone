import { EventBus } from "../../core/EventBus.js";
export interface EconomyEvents {
    "currency:changed": {
        id: string;
        balance: number;
        delta: number;
    };
    [key: string]: unknown;
}
export declare class EconomyManager {
    readonly events: EventBus<EconomyEvents>;
    private balances;
    balance(id: string): number;
    credit(id: string, amount: number): number;
    canAfford(id: string, amount: number): boolean;
    trySpend(id: string, amount: number): boolean;
    spend(id: string, amount: number): number;
    set(id: string, amount: number): number;
    private change;
    private assertAmount;
}
