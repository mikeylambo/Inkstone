export interface DifficultyProfile {
    id: string;
    label: string;
    description?: string;
    multipliers?: {
        playerDamage?: number;
        enemyDamage?: number;
        enemyHealth?: number;
        enemySpeed?: number;
        score?: number;
        resources?: number;
    };
    rules?: Record<string, number | boolean | string>;
    enemyCompositionTag?: string;
    prerequisiteUnlock?: string;
}
export declare class DifficultyManager {
    private profiles;
    private activeId;
    register(profiles: readonly DifficultyProfile[]): void;
    set(id: string): DifficultyProfile;
    active(): DifficultyProfile | null;
    scalar(key: keyof NonNullable<DifficultyProfile["multipliers"]>, fallback?: number): number;
}
