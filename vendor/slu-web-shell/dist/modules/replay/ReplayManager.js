export class ReplayRecorder {
    sampleHz;
    frames = [];
    startedAt = 0;
    constructor(sampleHz = 60) {
        this.sampleHz = sampleHz;
    }
    start(now = performance.now()) { this.frames = []; this.startedAt = now; }
    record(input, state, now = performance.now()) { this.frames.push({ t: now - this.startedAt, input: structuredClone(input), state: state === undefined ? undefined : structuredClone(state) }); }
    finish(id, gameVersion, meta = {}, now = performance.now()) {
        return { id, gameVersion, durationMs: Math.max(0, now - this.startedAt), sampleHz: this.sampleHz, createdAt: new Date().toISOString(), frames: this.frames.map(f => structuredClone(f)), ...meta };
    }
}
export class ReplayStore {
    storage;
    prefix;
    constructor(storage, prefix = "replay") {
        this.storage = storage;
        this.prefix = prefix;
    }
    save(tape) { return this.storage.set(`${this.prefix}:${tape.id}`, tape); }
    load(id) { return this.storage.get(`${this.prefix}:${id}`); }
    remove(id) { return this.storage.remove(`${this.prefix}:${id}`); }
}
export class GhostPlayback {
    tape;
    index = 0;
    constructor(tape) {
        this.tape = tape;
    }
    reset() { this.index = 0; }
    sample(timeMs) {
        while (this.index + 1 < this.tape.frames.length && this.tape.frames[this.index + 1].t <= timeMs)
            this.index++;
        return this.tape.frames[this.index] ?? null;
    }
}
