import { EventBus } from "../../core/EventBus.js";
export interface TrainingSettings {
    infiniteHealth: boolean;
    infiniteResources: boolean;
    slowMotion: number;
    dummyBehavior: string;
    showHitboxes: boolean;
    showInputHistory: boolean;
    showDamage: boolean;
}
export declare const defaultTrainingSettings: TrainingSettings;
export interface TrainingBookmark<T = unknown> {
    id: string;
    label?: string;
    state: T;
    createdAt: number;
}
export interface TrainingEvents<T = unknown> {
    "training:settings": TrainingSettings;
    "training:reset": undefined;
    "training:bookmark-saved": TrainingBookmark<T>;
    "training:bookmark-loaded": TrainingBookmark<T>;
    [key: string]: unknown;
}
export declare class TrainingManager<TState = unknown> {
    private readonly capture?;
    private readonly restore?;
    readonly events: EventBus<TrainingEvents<TState>>;
    private settings;
    private bookmarks;
    constructor(capture?: (() => TState) | undefined, restore?: ((state: TState) => void) | undefined);
    configure(patch: Partial<TrainingSettings>): TrainingSettings;
    snapshot(): TrainingSettings;
    reset(): void;
    saveBookmark(id: string, label?: string): TrainingBookmark<TState>;
    loadBookmark(id: string): TrainingBookmark<TState>;
}
