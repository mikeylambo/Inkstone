export interface ModeDefinition {
    id: string;
    label: string;
    description?: string;
    rules?: Record<string, unknown>;
    winCondition?: string;
    lossCondition?: string;
    timeLimitSeconds?: number;
    playerCount?: {
        min: number;
        max: number;
    };
    leaderboardKey?: string;
    rewardsTable?: string;
}
export declare class ModeManager {
    private modes;
    private activeId;
    register(modes: readonly ModeDefinition[]): void;
    activate(id: string): ModeDefinition;
    active(): ModeDefinition | null;
    list(): ModeDefinition[];
}
