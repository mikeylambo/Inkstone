import { EventBus } from "../../core/EventBus.js";
export interface Checkpoint<T = unknown> {
    id: string;
    state: T;
    createdAt: number;
}
export interface CheckpointEvents<T = unknown> {
    "checkpoint:saved": Checkpoint<T>;
    "checkpoint:restored": Checkpoint<T>;
    "checkpoints:cleared": undefined;
    [key: string]: unknown;
}
export declare class CheckpointManager<TState = unknown> {
    private readonly capture?;
    private readonly restore?;
    readonly events: EventBus<CheckpointEvents<TState>>;
    private checkpoints;
    private activeId;
    constructor(capture?: (() => TState) | undefined, restore?: ((state: TState) => void) | undefined);
    save(id: string, state?: TState): Checkpoint<TState>;
    restoreCheckpoint(id?: string | null, restore?: ((state: TState) => void) | undefined): boolean;
    get(id: string): Checkpoint<TState> | null;
    active(): string | null;
    clear(): void;
}
