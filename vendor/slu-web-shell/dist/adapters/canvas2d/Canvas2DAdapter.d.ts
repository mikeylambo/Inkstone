import type { RendererAdapter } from "../RendererAdapter.js";
export declare class Canvas2DAdapter implements RendererAdapter {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    readonly id = "canvas2d";
    constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D);
    resize(width: number, height: number, dpr: number): void;
    screenshot(): Promise<Blob | null>;
}
