import { EventBus } from "../../core/EventBus.js";
export class ProgressionManager {
    xpForLevel;
    events = new EventBus();
    xp = 0;
    level = 1;
    constructor(xpForLevel = (level) => level * 100) {
        this.xpForLevel = xpForLevel;
    }
    addXp(amount) { this.xp += Math.max(0, amount); while (this.xp >= this.xpForLevel(this.level)) {
        this.level++;
        this.events.emit("level:up", { level: this.level });
    } this.events.emit("xp:changed", { xp: this.xp, level: this.level }); return this.level; }
    snapshot() { return { xp: this.xp, level: this.level, nextLevelXp: this.xpForLevel(this.level) }; }
}
