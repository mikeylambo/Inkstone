import { EventBus } from "../../core/EventBus.js";
import type { ObjectiveDefinition } from "../../game/Objectives.js";
import type { Reward } from "../../game/Rewards.js";
export type QuestState = "locked" | "available" | "active" | "completed";
export interface QuestDefinition {
    id: string;
    label: string;
    objectives: ObjectiveDefinition[];
    rewards?: Reward[];
    prerequisites?: string[];
}
export interface QuestEvents {
    "quest:started": QuestDefinition;
    "quest:completed": QuestDefinition;
    [key: string]: unknown;
}
export declare class QuestManager {
    readonly events: EventBus<QuestEvents>;
    private defs;
    private states;
    register(quests: readonly QuestDefinition[]): void;
    refresh(): void;
    start(id: string): QuestDefinition;
    complete(id: string): QuestDefinition;
    state(id: string): QuestState | undefined;
    private require;
}
