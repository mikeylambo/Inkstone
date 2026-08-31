/**
 * Intentionally does not import `three`.
 * The game supplies hooks around its existing renderer/scene implementation.
 */
export class ThreeAdapter {
    hooks;
    id = "three";
    constructor(hooks) {
        this.hooks = hooks;
    }
    start = () => this.hooks.onStart?.();
    suspend = () => this.hooks.onSuspend?.();
    resume = () => this.hooks.onResume?.();
    resize = (w, h, dpr) => this.hooks.onResize?.(w, h, dpr);
    loadLevel = (id, payload) => this.hooks.onLoadLevel?.(id, payload);
    unloadLevel = () => this.hooks.onUnloadLevel?.();
    fade = (direction, durationMs = 250) => this.hooks.onFade?.(direction, durationMs);
    screenshot = () => this.hooks.onScreenshot?.() ?? Promise.resolve(null);
    setDebugVisible = (visible) => this.hooks.onDebug?.(visible);
    dispose = () => this.hooks.onDispose?.();
}
