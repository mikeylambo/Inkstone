export class DifficultyManager {
    profiles = new Map();
    activeId = null;
    register(profiles) {
        for (const profile of profiles)
            this.profiles.set(profile.id, structuredClone(profile));
    }
    set(id) {
        const profile = this.profiles.get(id);
        if (!profile)
            throw new Error(`Unknown difficulty: ${id}`);
        this.activeId = id;
        return structuredClone(profile);
    }
    active() {
        return this.activeId ? structuredClone(this.profiles.get(this.activeId) ?? null) : null;
    }
    scalar(key, fallback = 1) {
        return this.active()?.multipliers?.[key] ?? fallback;
    }
}
