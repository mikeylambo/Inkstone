import { EventBus } from "../core/EventBus.js";
/**
 * Raw relative pointer stream for FPS/camera look.
 * Kept separate from semantic action values because mouse deltas are unbounded
 * per-frame motion, not normalized [-1,1] button/axis state.
 */
export class PointerLook {
    target;
    events = new EventBus();
    dx = 0;
    dy = 0;
    attached = false;
    constructor(target) {
        this.target = target;
    }
    attach() {
        if (this.attached)
            return () => { };
        this.attached = true;
        const move = (event) => {
            if (document.pointerLockElement !== this.target)
                return;
            this.dx += event.movementX;
            this.dy += event.movementY;
            this.events.emit("delta", {
                x: this.dx, y: this.dy,
                movementX: event.movementX,
                movementY: event.movementY
            });
        };
        const lock = () => this.events.emit("lockchange", {
            locked: document.pointerLockElement === this.target
        });
        document.addEventListener("mousemove", move);
        document.addEventListener("pointerlockchange", lock);
        return () => {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("pointerlockchange", lock);
            this.attached = false;
            this.dx = 0;
            this.dy = 0;
        };
    }
    requestLock() {
        this.target.requestPointerLock?.();
    }
    consume() {
        const result = { x: this.dx, y: this.dy };
        this.dx = 0;
        this.dy = 0;
        return result;
    }
    get locked() {
        return document.pointerLockElement === this.target;
    }
}
