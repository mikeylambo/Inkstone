export class RulesetManager {
    rules = new Map();
    activeId = null;
    register(rules) { for (const r of rules)
        this.rules.set(r.id, structuredClone(r)); }
    activate(id) { const r = this.rules.get(id); if (!r)
        throw new Error(`Unknown ruleset: ${id}`); this.activeId = id; return structuredClone(r); }
    active() { return this.activeId ? structuredClone(this.rules.get(this.activeId) ?? null) : null; }
}
