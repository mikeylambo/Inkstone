import { EventBus } from "../../core/EventBus.js";
export class PlayerAssignmentManager {
    maxPlayers;
    events = new EventBus();
    players = new Map();
    constructor(maxPlayers = 4) {
        this.maxPlayers = maxPlayers;
    }
    join(deviceId, profileId) {
        const existing = [...this.players.values()].find(p => p.deviceId === deviceId);
        if (existing)
            return structuredClone(existing);
        for (let slot = 1; slot <= this.maxPlayers; slot++)
            if (!this.players.has(slot)) {
                const p = { slot, deviceId, profileId, ready: false };
                this.players.set(slot, p);
                this.events.emit("player:joined", structuredClone(p));
                return structuredClone(p);
            }
        throw new Error("No local player slots available");
    }
    leave(slot) { const p = this.players.get(slot); if (!p)
        return false; this.players.delete(slot); this.events.emit("player:left", structuredClone(p)); return true; }
    setReady(slot, ready = true) { const p = this.players.get(slot); if (!p)
        throw new Error(`Unknown player slot: ${slot}`); p.ready = ready; this.events.emit("player:ready", structuredClone(p)); return structuredClone(p); }
    allReady(minPlayers = 1) { return this.players.size >= minPlayers && [...this.players.values()].every(p => p.ready); }
    list() { return [...this.players.values()].map(p => structuredClone(p)); }
}
