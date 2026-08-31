export class ContentRegistry {
    groups = new Map();
    register(group, entries) {
        const target = this.groups.get(group) ?? new Map();
        for (const entry of entries) {
            if (target.has(entry.id))
                throw new Error(`Duplicate ${group} content id: ${entry.id}`);
            target.set(entry.id, structuredClone(entry));
        }
        this.groups.set(group, target);
    }
    get(group, id) {
        const value = this.groups.get(group)?.get(id);
        return value === undefined ? undefined : structuredClone(value);
    }
    list(group) {
        return [...(this.groups.get(group)?.values() ?? [])]
            .map((x) => structuredClone(x));
    }
}
