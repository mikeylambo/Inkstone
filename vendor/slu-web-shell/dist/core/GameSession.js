import { EventBus } from "./EventBus.js";
export class GameSession {
    events = new EventBus();
    phase = "boot";
    startedAt = 0;
    endedAt = 0;
    start(now = performance.now()) {
        this.startedAt = now;
        this.endedAt = 0;
        this.events.emit("session:started", { startedAt: now });
    }
    setPhase(next) {
        if (next === this.phase)
            return;
        const from = this.phase;
        this.phase = next;
        this.events.emit("phase:changed", { from, to: next });
    }
    pause() {
        if (this.phase === "playing")
            this.setPhase("paused");
    }
    resume() {
        if (this.phase === "paused")
            this.setPhase("playing");
    }
    end(now = performance.now()) {
        this.endedAt = now;
        this.events.emit("session:ended", {
            endedAt: now,
            durationMs: Math.max(0, now - this.startedAt)
        });
    }
}
