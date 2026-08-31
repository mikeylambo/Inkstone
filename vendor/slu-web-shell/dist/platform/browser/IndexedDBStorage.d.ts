import type { StorageAdapter } from "../../persistence/StorageAdapter.js";
/** Async storage for replay tapes, ghosts, larger profiles and other data that should not live in localStorage. */
export declare class IndexedDBStorage implements StorageAdapter {
    private readonly dbName;
    private readonly storeName;
    private dbPromise;
    constructor(dbName: string, storeName?: string, version?: number);
    private transaction;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}
