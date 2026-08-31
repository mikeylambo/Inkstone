import type { SLUWebShell } from "../Shell.js";
import { ModuleRegistry } from "../modules/ModuleRegistry.js";
import type { FrameAssembly } from "./types.js";
export declare class AssemblyComposer {
    private readonly shell;
    readonly modules: ModuleRegistry;
    private assemblies;
    constructor(shell: SLUWebShell<any>);
    add(assembly: FrameAssembly): Promise<this>;
    listAssemblies(): string[];
}
