export class ResultsManager {
    ranking;
    constructor(ranking) {
        this.ranking = ranking;
    }
    build(stats, options = {}) {
        return { score: options.score, timeMs: options.timeMs, rank: options.score !== undefined && this.ranking ? this.ranking.evaluate(options.score, stats) : undefined, stats: { ...stats }, metadata: options.metadata ? { ...options.metadata } : undefined };
    }
}
