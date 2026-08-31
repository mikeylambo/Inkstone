import { EventBus } from "../core/EventBus.js";
export interface AchievementDefinition {
    id: string;
    label: string;
    description?: string;
    hidden?: boolean;
}
export type AchievementProvider = {
    unlock(id: string): void | Promise<void>;
};
export interface AchievementEvents {
    "achievement:unlocked": AchievementDefinition;
    [key: string]: unknown;
}
export declare class AchievementManager {
    private readonly provider?;
    readonly events: EventBus<AchievementEvents>;
    private unlocked;
    private definitions;
    constructor(provider?: AchievementProvider | undefined);
    register(definitions: readonly AchievementDefinition[]): void;
    unlock(id: string): Promise<boolean>;
    has(id: string): boolean;
}
