export declare class BrowserPlatform {
    requestFullscreen(element?: HTMLElement): Promise<void>;
    exitFullscreen(): Promise<void>;
    requestPointerLock(element: HTMLElement): Promise<void>;
    exitPointerLock(): void;
    onVisibilityChange(listener: (hidden: boolean) => void): () => void;
    onResize(listener: (width: number, height: number, dpr: number) => void): () => void;
}
