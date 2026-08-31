import { EventBus } from "../../core/EventBus.js";
export class CheckpointManager {
    capture;
    restore;
    events = new EventBus();
    checkpoints = new Map();
    activeId = null;
    constructor(capture, restore) {
        this.capture = capture;
        this.restore = restore;
    }
    save(id, state) {
        const captured = state !== undefined ? state : this.capture?.();
        if (captured === undefined) {
            throw new Error("CheckpointManager.save requires explicit state or a capture() hook");
        }
        const checkpoint = { id, state: structuredClone(captured), createdAt: Date.now() };
        this.checkpoints.set(id, checkpoint);
        this.activeId = id;
        const copy = structuredClone(checkpoint);
        this.events.emit("checkpoint:saved", copy);
        return copy;
    }
    restoreCheckpoint(id = this.activeId, restore = this.restore) {
        if (!id)
            return false;
        const checkpoint = this.checkpoints.get(id);
        if (!checkpoint)
            return false;
        if (!restore)
            throw new Error("CheckpointManager.restoreCheckpoint requires a restore() hook");
        const copy = structuredClone(checkpoint);
        restore(structuredClone(copy.state));
        this.activeId = id;
        this.events.emit("checkpoint:restored", copy);
        return true;
    }
    get(id) {
        const checkpoint = this.checkpoints.get(id);
        return checkpoint ? structuredClone(checkpoint) : null;
    }
    active() { return this.activeId; }
    clear() {
        this.checkpoints.clear();
        this.activeId = null;
        this.events.emit("checkpoints:cleared", undefined);
    }
}
