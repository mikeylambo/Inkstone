import type { StorageAdapter } from "./StorageAdapter.js";
export interface SaveEnvelope<T> {
    schemaVersion: number;
    savedAt: string;
    data: T;
}
export type VersionMigration = (data: unknown) => unknown;
export type MigrationTable = Record<number, VersionMigration>;
export declare class SaveManager<T> {
    private readonly storage;
    private readonly key;
    private readonly schemaVersion;
    private readonly migrations;
    constructor(storage: StorageAdapter, key: string, schemaVersion: number, migrations?: MigrationTable);
    load(): Promise<T | null>;
    save(data: T): Promise<void>;
    delete(): Promise<void>;
}
