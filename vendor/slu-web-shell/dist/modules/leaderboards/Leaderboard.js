export class LocalLeaderboardProvider {
    boards = new Map();
    async submit(board, entry) {
        const entries = this.boards.get(board) ?? [];
        entries.push(structuredClone(entry));
        entries.sort((a, b) => b.score - a.score);
        this.boards.set(board, entries);
    }
    async top(board, limit = 10) {
        return (this.boards.get(board) ?? []).slice(0, limit).map((entry) => structuredClone(entry));
    }
    async around(board, playerId, radius = 2) {
        const entries = this.boards.get(board) ?? [];
        const index = entries.findIndex((entry) => entry.playerId === playerId);
        if (index < 0)
            return [];
        return entries.slice(Math.max(0, index - radius), index + radius + 1).map((entry) => structuredClone(entry));
    }
}
export class LeaderboardManager {
    provider;
    constructor(provider = new LocalLeaderboardProvider()) {
        this.provider = provider;
    }
    submit(board, entry) {
        return this.provider.submit(board, { ...entry, submittedAt: new Date().toISOString() });
    }
    top(board, limit = 10) { return this.provider.top(board, limit); }
    around(board, playerId, radius = 2) {
        return this.provider.around?.(board, playerId, radius) ?? Promise.resolve([]);
    }
}
