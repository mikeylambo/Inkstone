import { EventBus } from "../core/EventBus.js";
import type { StorageAdapter } from "./StorageAdapter.js";
export interface CoreSettings {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    uiVolume: number;
    muted: boolean;
    reducedMotion: boolean;
    screenShake: number;
    vibration: boolean;
    fullscreen: boolean;
    language: string;
}
export declare const defaultCoreSettings: CoreSettings;
export declare class SettingsStore<T extends object = CoreSettings> {
    private readonly storage;
    private readonly key;
    private value;
    readonly events: EventBus<{
        changed: T;
    }>;
    constructor(storage: StorageAdapter, key: string, value: T);
    static core(storage: StorageAdapter, key?: string): SettingsStore<CoreSettings>;
    load(): Promise<T>;
    get<K extends keyof T>(key: K): T[K];
    snapshot(): T;
    patch(patch: Partial<T>): Promise<T>;
    reset(defaults: T): Promise<T>;
}
