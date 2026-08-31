import { EventBus } from "../core/EventBus.js";
import type { ObjectiveDefinition } from "./Objectives.js";
import type { Reward } from "./Rewards.js";
export interface MedalThreshold {
    medal: string;
    threshold: number;
    direction?: "min" | "max";
}
export interface ChallengeDefinition {
    id: string;
    label: string;
    description?: string;
    category?: string;
    objectives: ObjectiveDefinition[];
    constraints?: string[];
    modifiers?: Record<string, unknown>;
    rewards?: Reward[];
    medals?: MedalThreshold[];
    leaderboardKey?: string;
    prerequisiteUnlocks?: string[];
}
export interface ChallengeEvents {
    "challenge:registered": {
        ids: string[];
    };
    "challenge:started": ChallengeDefinition;
    "challenge:completed": {
        challenge: ChallengeDefinition;
        score?: number;
        medal?: string | null;
    };
    [key: string]: unknown;
}
export declare class ChallengeManager {
    readonly events: EventBus<ChallengeEvents>;
    private challenges;
    private activeId;
    register(challenges: readonly ChallengeDefinition[]): void;
    get(id: string): ChallengeDefinition | undefined;
    list(category?: string): ChallengeDefinition[];
    start(id: string): ChallengeDefinition;
    complete(score?: number): {
        challenge: ChallengeDefinition;
        medal: string | null;
    } | null;
    medalFor(id: string, score: number): string | null;
    private require;
}
