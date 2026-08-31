export interface DebugFlags {
    enabled: boolean;
    invulnerable: boolean;
    unlockAll: boolean;
    showCollision: boolean;
    showFps: boolean;
    showInput: boolean;
}
export declare const defaultDebugFlags: DebugFlags;
export declare class DebugState {
    private flags;
    patch(patch: Partial<DebugFlags>): Readonly<DebugFlags>;
    snapshot(): Readonly<DebugFlags>;
}
