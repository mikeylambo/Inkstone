export class GarageManager {
    vehicles = new Map();
    owned = new Set();
    selectedId = null;
    register(vehicles) {
        for (const vehicle of vehicles) {
            this.vehicles.set(vehicle.id, structuredClone(vehicle));
            if (vehicle.unlockedByDefault)
                this.owned.add(vehicle.id);
        }
    }
    acquire(id) {
        if (!this.vehicles.has(id))
            throw new Error(`Unknown vehicle: ${id}`);
        this.owned.add(id);
    }
    owns(id) { return this.owned.has(id); }
    select(id) {
        if (!this.owned.has(id))
            throw new Error(`Vehicle not owned: ${id}`);
        this.selectedId = id;
        return this.get(id);
    }
    selected() { return this.selectedId ? this.get(this.selectedId) ?? null : null; }
    get(id) { const v = this.vehicles.get(id); return v ? structuredClone(v) : undefined; }
    listOwned() { return [...this.owned].map((id) => this.get(id)).filter(Boolean); }
}
