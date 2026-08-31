import type { RankResult, RankingSystem } from "../ranking/RankingSystem.js";
export interface RunResult {
    score?: number;
    timeMs?: number;
    rank?: RankResult;
    stats: Record<string, number>;
    metadata?: Record<string, unknown>;
}
export declare class ResultsManager {
    private readonly ranking?;
    constructor(ranking?: RankingSystem | undefined);
    build(stats: Record<string, number>, options?: {
        score?: number;
        timeMs?: number;
        metadata?: Record<string, unknown>;
    }): RunResult;
}
