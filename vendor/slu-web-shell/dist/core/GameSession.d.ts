import { EventBus } from "./EventBus.js";
import type { GamePhase } from "./types.js";
export interface SessionEvents {
    "phase:changed": {
        from: GamePhase;
        to: GamePhase;
    };
    "session:started": {
        startedAt: number;
    };
    "session:ended": {
        endedAt: number;
        durationMs: number;
    };
    [key: string]: unknown;
}
export declare class GameSession {
    readonly events: EventBus<SessionEvents>;
    phase: GamePhase;
    startedAt: number;
    endedAt: number;
    start(now?: number): void;
    setPhase(next: GamePhase): void;
    pause(): void;
    resume(): void;
    end(now?: number): void;
}
