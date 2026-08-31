import type { StorageAdapter } from "../persistence/StorageAdapter.js";
export type StatValue = number | string | boolean;
export declare class StatsManager {
    private readonly storage?;
    private readonly key;
    private stats;
    constructor(storage?: StorageAdapter | undefined, key?: string);
    load(): Promise<void>;
    get<T extends StatValue = number>(key: string, fallback?: T): T;
    set(key: string, value: StatValue): Promise<void>;
    increment(key: string, amount?: number): Promise<number>;
    snapshot(): Readonly<Record<string, StatValue>>;
    private persist;
}
