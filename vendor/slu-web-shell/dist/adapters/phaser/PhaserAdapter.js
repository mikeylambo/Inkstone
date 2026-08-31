export class PhaserAdapter {
    hooks;
    id = "phaser";
    constructor(hooks = {}) {
        this.hooks = hooks;
    }
    suspend = () => this.hooks.pause?.();
    resume = () => this.hooks.resume?.();
    resize = (w, h, dpr) => this.hooks.resize?.(w, h, dpr);
    loadLevel = (id, payload) => this.hooks.loadScene?.(id, payload);
    unloadLevel = () => this.hooks.stopScene?.();
    screenshot = () => this.hooks.screenshot?.() ?? Promise.resolve(null);
    dispose = () => this.hooks.destroy?.();
}
