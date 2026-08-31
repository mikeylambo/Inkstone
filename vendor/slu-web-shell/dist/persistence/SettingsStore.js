import { EventBus } from "../core/EventBus.js";
export const defaultCoreSettings = {
    masterVolume: 1,
    musicVolume: 0.8,
    sfxVolume: 0.9,
    uiVolume: 0.9,
    muted: false,
    reducedMotion: false,
    screenShake: 1,
    vibration: true,
    fullscreen: false,
    language: "en"
};
export class SettingsStore {
    storage;
    key;
    value;
    events = new EventBus();
    constructor(storage, key, value) {
        this.storage = storage;
        this.key = key;
        this.value = value;
    }
    static core(storage, key = "settings") {
        return new SettingsStore(storage, key, { ...defaultCoreSettings });
    }
    async load() {
        const saved = await this.storage.get(this.key);
        if (saved)
            this.value = { ...this.value, ...saved };
        return this.snapshot();
    }
    get(key) {
        return this.value[key];
    }
    snapshot() {
        return structuredClone(this.value);
    }
    async patch(patch) {
        this.value = { ...this.value, ...patch };
        await this.storage.set(this.key, this.value);
        const snapshot = this.snapshot();
        this.events.emit("changed", snapshot);
        return snapshot;
    }
    async reset(defaults) {
        this.value = structuredClone(defaults);
        await this.storage.set(this.key, this.value);
        const snapshot = this.snapshot();
        this.events.emit("changed", snapshot);
        return snapshot;
    }
}
