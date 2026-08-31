export const defaultDebugFlags = {
    enabled: false,
    invulnerable: false,
    unlockAll: false,
    showCollision: false,
    showFps: false,
    showInput: false
};
export class DebugState {
    flags = { ...defaultDebugFlags };
    patch(patch) {
        this.flags = { ...this.flags, ...patch };
        return this.snapshot();
    }
    snapshot() {
        return { ...this.flags };
    }
}
