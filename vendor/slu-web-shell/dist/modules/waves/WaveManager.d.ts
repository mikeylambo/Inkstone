import { EventBus } from "../../core/EventBus.js";
export interface SpawnDefinition {
    type: string;
    count: number;
    intervalMs?: number;
    metadata?: Record<string, unknown>;
}
export interface WaveDefinition {
    id: string;
    spawns: SpawnDefinition[];
    delayBeforeMs?: number;
    rewardId?: string;
}
export interface WaveEvents {
    "wave:started": {
        index: number;
        wave: WaveDefinition;
    };
    "wave:completed": {
        index: number;
        wave: WaveDefinition;
    };
    "waves:completed": undefined;
    [key: string]: unknown;
}
export declare class WaveManager {
    readonly events: EventBus<WaveEvents>;
    private waves;
    private index;
    private active;
    setWaves(waves: readonly WaveDefinition[]): void;
    startNext(): WaveDefinition | null;
    completeCurrent(): void;
    current(): WaveDefinition | null;
}
