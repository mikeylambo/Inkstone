import type { RendererAdapter } from "../RendererAdapter.js";
export interface ThreeAdapterHooks {
    onStart?: () => void | Promise<void>;
    onSuspend?: () => void;
    onResume?: () => void;
    onResize?: (width: number, height: number, dpr: number) => void;
    onLoadLevel?: (id: string, payload?: unknown) => void | Promise<void>;
    onUnloadLevel?: () => void | Promise<void>;
    onFade?: (direction: "in" | "out", durationMs: number) => void | Promise<void>;
    onScreenshot?: () => Promise<Blob | string | null>;
    onDebug?: (visible: boolean) => void;
    onDispose?: () => void | Promise<void>;
}
/**
 * Intentionally does not import `three`.
 * The game supplies hooks around its existing renderer/scene implementation.
 */
export declare class ThreeAdapter implements RendererAdapter {
    private readonly hooks;
    readonly id = "three";
    constructor(hooks: ThreeAdapterHooks);
    start: () => void | Promise<void> | undefined;
    suspend: () => void | undefined;
    resume: () => void | undefined;
    resize: (w: number, h: number, dpr: number) => void | undefined;
    loadLevel: (id: string, payload?: unknown) => void | Promise<void> | undefined;
    unloadLevel: () => void | Promise<void> | undefined;
    fade: (direction: "in" | "out", durationMs?: number) => void | Promise<void> | undefined;
    screenshot: () => Promise<string | Blob | null>;
    setDebugVisible: (visible: boolean) => void | undefined;
    dispose: () => void | Promise<void> | undefined;
}
