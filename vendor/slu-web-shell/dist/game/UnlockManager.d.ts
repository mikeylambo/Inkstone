import { EventBus } from "../core/EventBus.js";
import type { StorageAdapter } from "../persistence/StorageAdapter.js";
export interface UnlockEvents {
    "unlock:granted": {
        id: string;
    };
    "unlocks:loaded": {
        ids: string[];
    };
    [key: string]: unknown;
}
export declare class UnlockManager {
    private readonly storage?;
    private readonly key;
    readonly events: EventBus<UnlockEvents>;
    private unlocked;
    constructor(storage?: StorageAdapter | undefined, key?: string);
    load(): Promise<void>;
    has(id: string): boolean;
    unlock(id: string): Promise<boolean>;
    list(): string[];
    private persist;
}
