import { EventBus } from "../core/EventBus.js";
export class ChallengeManager {
    events = new EventBus();
    challenges = new Map();
    activeId = null;
    register(challenges) {
        for (const c of challenges)
            this.challenges.set(c.id, structuredClone(c));
        this.events.emit("challenge:registered", { ids: challenges.map(c => c.id) });
    }
    get(id) { const v = this.challenges.get(id); return v ? structuredClone(v) : undefined; }
    list(category) { return [...this.challenges.values()].filter(x => !category || x.category === category).map(x => structuredClone(x)); }
    start(id) { const c = this.require(id); this.activeId = id; const copy = structuredClone(c); this.events.emit("challenge:started", copy); return copy; }
    complete(score) {
        if (!this.activeId)
            return null;
        const c = this.require(this.activeId);
        const medal = score === undefined ? null : this.medalFor(c.id, score);
        const payload = { challenge: structuredClone(c), score, medal };
        this.events.emit("challenge:completed", payload);
        this.activeId = null;
        return { challenge: payload.challenge, medal };
    }
    medalFor(id, score) {
        const c = this.challenges.get(id);
        if (!c?.medals?.length)
            return null;
        let earned = null;
        for (const m of c.medals) {
            const dir = m.direction ?? "min";
            if (dir === "min" ? score >= m.threshold : score <= m.threshold)
                earned = m.medal;
        }
        return earned;
    }
    require(id) { const c = this.challenges.get(id); if (!c)
        throw new Error(`Unknown challenge: ${id}`); return c; }
}
