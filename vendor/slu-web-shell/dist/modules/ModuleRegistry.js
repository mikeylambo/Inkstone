export class ModuleRegistry {
    modules = new Map();
    register(id, module) {
        if (this.modules.has(id))
            throw new Error(`Module already registered: ${id}`);
        this.modules.set(id, module);
        return module;
    }
    registerShared(id, module) {
        if (this.modules.has(id))
            return this.modules.get(id);
        this.modules.set(id, module);
        return module;
    }
    get(id) {
        const value = this.modules.get(id);
        if (value === undefined)
            throw new Error(`Unknown module: ${id}`);
        return value;
    }
    has(id) { return this.modules.has(id); }
    list() { return [...this.modules.keys()]; }
}
