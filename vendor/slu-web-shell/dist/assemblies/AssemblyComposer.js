import { ModuleRegistry } from "../modules/ModuleRegistry.js";
export class AssemblyComposer {
    shell;
    modules = new ModuleRegistry();
    assemblies = [];
    constructor(shell) {
        this.shell = shell;
    }
    async add(assembly) {
        this.assemblies.push(assembly);
        for (const handle of assembly.modules)
            this.modules.registerShared(handle.id, handle.instance);
        await assembly.install();
        return this;
    }
    listAssemblies() { return this.assemblies.map((assembly) => assembly.id); }
}
