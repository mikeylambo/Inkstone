import { EventBus } from "../../core/EventBus.js";
export class WaveManager {
    events = new EventBus();
    waves = [];
    index = -1;
    active = false;
    setWaves(waves) { this.waves = waves.map(w => structuredClone(w)); this.index = -1; this.active = false; }
    startNext() { if (this.index + 1 >= this.waves.length) {
        this.events.emit("waves:completed", undefined);
        return null;
    } this.index++; this.active = true; const wave = structuredClone(this.waves[this.index]); this.events.emit("wave:started", { index: this.index, wave }); return wave; }
    completeCurrent() { if (!this.active || this.index < 0)
        return; const wave = structuredClone(this.waves[this.index]); this.active = false; this.events.emit("wave:completed", { index: this.index, wave }); }
    current() { return this.index >= 0 ? structuredClone(this.waves[this.index] ?? null) : null; }
}
