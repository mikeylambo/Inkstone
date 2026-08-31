import { EventBus } from "../core/EventBus.js";
import type { Reward } from "./Rewards.js";
export type ObjectiveKind = "counter" | "threshold" | "boolean" | "time" | "score" | "custom";
export interface ObjectiveDefinition {
    id: string;
    label: string;
    kind: ObjectiveKind;
    target?: number;
    optional?: boolean;
    hidden?: boolean;
    rewards?: Reward[];
}
export interface ObjectiveProgress {
    id: string;
    value: number;
    complete: boolean;
}
export interface ObjectiveEvents {
    "objective:changed": ObjectiveProgress;
    "objective:completed": {
        definition: ObjectiveDefinition;
        progress: ObjectiveProgress;
    };
    "objectives:reset": {
        ids: string[];
    };
    [key: string]: unknown;
}
export declare class ObjectiveManager {
    readonly events: EventBus<ObjectiveEvents>;
    private definitions;
    private progress;
    setObjectives(definitions: readonly ObjectiveDefinition[]): void;
    add(id: string, amount?: number): ObjectiveProgress;
    set(id: string, value: number): ObjectiveProgress;
    complete(id: string): ObjectiveProgress;
    get(id: string): ObjectiveProgress | undefined;
    definition(id: string): ObjectiveDefinition | undefined;
    allRequiredComplete(): boolean;
    snapshot(): ObjectiveProgress[];
    private requireDefinition;
}
