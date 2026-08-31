import type { RendererAdapter } from "../RendererAdapter.js";
export declare class DOMAdapter implements RendererAdapter {
    private readonly root;
    readonly id = "dom";
    constructor(root: HTMLElement);
    suspend(): void;
    resume(): void;
    setDebugVisible(visible: boolean): void;
}
