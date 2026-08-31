import type { StorageAdapter } from "../../persistence/StorageAdapter.js";
export declare class BrowserStorage implements StorageAdapter {
    private readonly namespace;
    private readonly storage;
    constructor(namespace: string, storage?: Storage);
    private key;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}
