import type { StorageAdapter } from "../../persistence/StorageAdapter.js";
export interface ReplayFrame<TInput = unknown, TState = unknown> {
    t: number;
    input: TInput;
    state?: TState;
}
export interface ReplayTape<TInput = unknown, TState = unknown> {
    id: string;
    gameVersion: string;
    levelId?: string;
    seed?: string | number;
    durationMs: number;
    sampleHz: number;
    createdAt: string;
    frames: ReplayFrame<TInput, TState>[];
    metadata?: Record<string, unknown>;
}
export declare class ReplayRecorder<TInput = unknown, TState = unknown> {
    private readonly sampleHz;
    private frames;
    private startedAt;
    constructor(sampleHz?: number);
    start(now?: number): void;
    record(input: TInput, state?: TState, now?: number): void;
    finish(id: string, gameVersion: string, meta?: Partial<Omit<ReplayTape<TInput, TState>, "id" | "gameVersion" | "durationMs" | "sampleHz" | "createdAt" | "frames">>, now?: number): ReplayTape<TInput, TState>;
}
export declare class ReplayStore<TInput = unknown, TState = unknown> {
    private readonly storage;
    private readonly prefix;
    constructor(storage: StorageAdapter, prefix?: string);
    save(tape: ReplayTape<TInput, TState>): Promise<void>;
    load(id: string): Promise<ReplayTape<TInput, TState> | null>;
    remove(id: string): Promise<void>;
}
export declare class GhostPlayback<TState = unknown> {
    private readonly tape;
    private index;
    constructor(tape: ReplayTape<unknown, TState>);
    reset(): void;
    sample(timeMs: number): ReplayFrame<unknown, TState> | null;
}
