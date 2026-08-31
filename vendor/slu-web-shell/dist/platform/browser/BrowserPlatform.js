export class BrowserPlatform {
    async requestFullscreen(element = document.documentElement) {
        if (!document.fullscreenElement)
            await element.requestFullscreen?.();
    }
    async exitFullscreen() {
        if (document.fullscreenElement)
            await document.exitFullscreen?.();
    }
    async requestPointerLock(element) {
        element.requestPointerLock?.();
    }
    exitPointerLock() {
        document.exitPointerLock?.();
    }
    onVisibilityChange(listener) {
        const handler = () => listener(document.hidden);
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
    }
    onResize(listener) {
        const handler = () => listener(innerWidth, innerHeight, devicePixelRatio || 1);
        addEventListener("resize", handler);
        handler();
        return () => removeEventListener("resize", handler);
    }
}
