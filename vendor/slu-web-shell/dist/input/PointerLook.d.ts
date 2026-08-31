import { EventBus } from "../core/EventBus.js";
export interface PointerDelta {
    x: number;
    y: number;
    movementX: number;
    movementY: number;
}
export interface PointerLookEvents {
    delta: PointerDelta;
    lockchange: {
        locked: boolean;
    };
    [key: string]: unknown;
}
/**
 * Raw relative pointer stream for FPS/camera look.
 * Kept separate from semantic action values because mouse deltas are unbounded
 * per-frame motion, not normalized [-1,1] button/axis state.
 */
export declare class PointerLook {
    private readonly target;
    readonly events: EventBus<PointerLookEvents>;
    private dx;
    private dy;
    private attached;
    constructor(target: HTMLElement);
    attach(): () => void;
    requestLock(): void;
    consume(): {
        x: number;
        y: number;
    };
    get locked(): boolean;
}
