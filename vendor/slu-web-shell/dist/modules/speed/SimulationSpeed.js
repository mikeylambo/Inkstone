import { EventBus } from "../../core/EventBus.js";
export class SimulationSpeed {
    allowed;
    events = new EventBus();
    multiplier = 1;
    constructor(allowed = [0, 0.25, 0.5, 1, 2, 3]) {
        this.allowed = allowed;
    }
    set(value) {
        if (!this.allowed.includes(value))
            throw new Error(`Unsupported simulation speed: ${value}`);
        this.multiplier = value;
        this.events.emit("speed:changed", { multiplier: value });
        return value;
    }
    get() { return this.multiplier; }
    options() { return [...this.allowed]; }
}
