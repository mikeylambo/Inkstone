import { EventBus } from "../../core/EventBus.js";
export interface ProgressionEvents {
    "xp:changed": {
        xp: number;
        level: number;
    };
    "level:up": {
        level: number;
    };
    [key: string]: unknown;
}
export declare class ProgressionManager {
    private readonly xpForLevel;
    readonly events: EventBus<ProgressionEvents>;
    private xp;
    private level;
    constructor(xpForLevel?: (level: number) => number);
    addXp(amount: number): number;
    snapshot(): {
        xp: number;
        level: number;
        nextLevelXp: number;
    };
}
