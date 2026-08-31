import { EventBus } from "./core/EventBus.js";
import { GameSession } from "./core/GameSession.js";
import type { BuildInfo } from "./core/types.js";
import { InputManager } from "./input/InputManager.js";
import { ModeManager } from "./game/Modes.js";
import { ObjectiveManager } from "./game/Objectives.js";
import { ChallengeManager } from "./game/Challenges.js";
import { DifficultyManager } from "./game/Difficulty.js";
import { RewardManager } from "./game/Rewards.js";
import { UnlockManager } from "./game/UnlockManager.js";
import { StatsManager } from "./game/StatsManager.js";
import { ContentRegistry } from "./content/ContentRegistry.js";
import type { RendererAdapter } from "./adapters/RendererAdapter.js";
import type { SettingsStore } from "./persistence/SettingsStore.js";
export interface ShellEvents {
    "game:pause": undefined;
    "game:resume": undefined;
    "game:restart": undefined;
    "game:quit": undefined;
    "level:load": {
        id: string;
        payload?: unknown;
    };
    "level:loaded": {
        id: string;
    };
    [key: string]: unknown;
}
export interface ShellOptions<TSettings extends object> {
    build: BuildInfo;
    renderer: RendererAdapter;
    settings: SettingsStore<TSettings>;
    unlocks?: UnlockManager;
    stats?: StatsManager;
}
export declare class SLUWebShell<TSettings extends object> {
    readonly options: ShellOptions<TSettings>;
    readonly events: EventBus<ShellEvents>;
    readonly session: GameSession;
    readonly input: InputManager;
    readonly modes: ModeManager;
    readonly objectives: ObjectiveManager;
    readonly challenges: ChallengeManager;
    readonly difficulty: DifficultyManager;
    readonly rewards: RewardManager;
    readonly unlocks: UnlockManager;
    readonly stats: StatsManager;
    readonly content: ContentRegistry;
    constructor(options: ShellOptions<TSettings>);
    get build(): BuildInfo;
    get renderer(): RendererAdapter;
    get settings(): SettingsStore<TSettings>;
    boot(): Promise<void>;
    pause(): void;
    resume(): void;
    loadLevel(id: string, payload?: unknown): Promise<void>;
    restart(): void;
    quit(): void;
}
