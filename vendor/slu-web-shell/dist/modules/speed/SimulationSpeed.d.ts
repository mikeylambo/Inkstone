import { EventBus } from "../../core/EventBus.js";
export interface SimulationSpeedEvents {
    "speed:changed": {
        multiplier: number;
    };
    [key: string]: unknown;
}
export declare class SimulationSpeed {
    private readonly allowed;
    readonly events: EventBus<SimulationSpeedEvents>;
    private multiplier;
    constructor(allowed?: readonly number[]);
    set(value: number): number;
    get(): number;
    options(): readonly number[];
}
