import { EventBus } from "../../core/EventBus.js";
export const defaultTrainingSettings = {
    infiniteHealth: false, infiniteResources: false, slowMotion: 1, dummyBehavior: "idle",
    showHitboxes: false, showInputHistory: true, showDamage: true
};
export class TrainingManager {
    capture;
    restore;
    events = new EventBus();
    settings = { ...defaultTrainingSettings };
    bookmarks = new Map();
    constructor(capture, restore) {
        this.capture = capture;
        this.restore = restore;
    }
    configure(patch) { this.settings = { ...this.settings, ...patch }; const s = this.snapshot(); this.events.emit("training:settings", s); return s; }
    snapshot() { return { ...this.settings }; }
    reset() { this.events.emit("training:reset", undefined); }
    saveBookmark(id, label) {
        if (!this.capture)
            throw new Error("TrainingManager requires a capture() hook for bookmarks");
        const b = { id, label, state: structuredClone(this.capture()), createdAt: Date.now() };
        this.bookmarks.set(id, b);
        this.events.emit("training:bookmark-saved", structuredClone(b));
        return structuredClone(b);
    }
    loadBookmark(id) {
        const b = this.bookmarks.get(id);
        if (!b)
            throw new Error(`Unknown training bookmark: ${id}`);
        this.restore?.(structuredClone(b.state));
        this.events.emit("training:bookmark-loaded", structuredClone(b));
        return structuredClone(b);
    }
}
