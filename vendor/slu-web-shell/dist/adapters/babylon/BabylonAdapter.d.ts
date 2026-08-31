import type { RendererAdapter } from "../RendererAdapter.js";
export interface BabylonAdapterHooks {
    start?: () => void | Promise<void>;
    suspend?: () => void;
    resume?: () => void;
    resize?: (width: number, height: number, dpr: number) => void;
    loadLevel?: (id: string, payload?: unknown) => void | Promise<void>;
    unloadLevel?: () => void | Promise<void>;
    fade?: (direction: "in" | "out", durationMs: number) => void | Promise<void>;
    screenshot?: () => Promise<Blob | string | null>;
    debug?: (visible: boolean) => void;
    dispose?: () => void | Promise<void>;
}
export declare class BabylonAdapter implements RendererAdapter {
    private readonly hooks;
    readonly id = "babylon";
    constructor(hooks: BabylonAdapterHooks);
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
