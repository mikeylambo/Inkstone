export interface LeaderboardEntry {
    playerId: string;
    displayName: string;
    score: number;
    metadata?: Record<string, unknown>;
    submittedAt: string;
}
export interface LeaderboardProvider {
    submit(board: string, entry: LeaderboardEntry): Promise<void>;
    top(board: string, limit?: number): Promise<LeaderboardEntry[]>;
    around?(board: string, playerId: string, radius?: number): Promise<LeaderboardEntry[]>;
}
export declare class LocalLeaderboardProvider implements LeaderboardProvider {
    private boards;
    submit(board: string, entry: LeaderboardEntry): Promise<void>;
    top(board: string, limit?: number): Promise<LeaderboardEntry[]>;
    around(board: string, playerId: string, radius?: number): Promise<LeaderboardEntry[]>;
}
export declare class LeaderboardManager {
    private readonly provider;
    constructor(provider?: LeaderboardProvider);
    submit(board: string, entry: Omit<LeaderboardEntry, "submittedAt">): Promise<void>;
    top(board: string, limit?: number): Promise<LeaderboardEntry[]>;
    around(board: string, playerId: string, radius?: number): Promise<LeaderboardEntry[]>;
}
