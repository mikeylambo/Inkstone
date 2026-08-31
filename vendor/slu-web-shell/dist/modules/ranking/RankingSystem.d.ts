export interface RankBand {
    id: string;
    label: string;
    minimum: number;
}
export interface RankResult {
    rank: RankBand;
    score: number;
    breakdown: Record<string, number>;
}
export declare class RankingSystem {
    private readonly bands;
    constructor(bands: readonly RankBand[]);
    evaluate(score: number, breakdown?: Record<string, number>): RankResult;
    static letterGrades(): RankingSystem;
}
