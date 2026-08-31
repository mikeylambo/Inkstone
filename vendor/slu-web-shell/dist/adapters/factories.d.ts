import type { RendererAdapter } from "./RendererAdapter.js";
export declare function createThreeStarterAdapter(canvas: HTMLCanvasElement): RendererAdapter;
export declare function createBabylonStarterAdapter(canvas: HTMLCanvasElement): RendererAdapter;
export declare function createCanvas2DStarterAdapter(canvas: HTMLCanvasElement): RendererAdapter;
export declare function createDOMStarterAdapter(root: HTMLElement): RendererAdapter;
