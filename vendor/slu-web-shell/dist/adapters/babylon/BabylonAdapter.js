export class BabylonAdapter {
    hooks;
    id = "babylon";
    constructor(hooks) {
        this.hooks = hooks;
    }
    start = () => this.hooks.start?.();
    suspend = () => this.hooks.suspend?.();
    resume = () => this.hooks.resume?.();
    resize = (w, h, dpr) => this.hooks.resize?.(w, h, dpr);
    loadLevel = (id, payload) => this.hooks.loadLevel?.(id, payload);
    unloadLevel = () => this.hooks.unloadLevel?.();
    fade = (direction, durationMs = 250) => this.hooks.fade?.(direction, durationMs);
    screenshot = () => this.hooks.screenshot?.() ?? Promise.resolve(null);
    setDebugVisible = (visible) => this.hooks.debug?.(visible);
    dispose = () => this.hooks.dispose?.();
}
