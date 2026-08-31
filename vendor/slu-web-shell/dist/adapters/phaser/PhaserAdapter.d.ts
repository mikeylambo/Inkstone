import type { RendererAdapter } from "../RendererAdapter.js";
export interface PhaserAdapterHooks {
    pause?: () => void;
    resume?: () => void;
    resize?: (width: number, height: number, dpr: number) => void;
    loadScene?: (id: string, payload?: unknown) => void | Promise<void>;
    stopScene?: () => void | Promise<void>;
    screenshot?: () => Promise<Blob | string | null>;
    destroy?: () => void | Promise<void>;
}
export declare class PhaserAdapter implements RendererAdapter {
    private readonly hooks;
    readonly id = "phaser";
    constructor(hooks?: PhaserAdapterHooks);
    suspend: () => void | undefined;
    resume: () => void | undefined;
    resize: (w: number, h: number, dpr: number) => void | undefined;
    loadLevel: (id: string, payload?: unknown) => void | Promise<void> | undefined;
    unloadLevel: () => void | Promise<void> | undefined;
    screenshot: () => Promise<string | Blob | null>;
    dispose: () => void | Promise<void> | undefined;
}
