import type { ModuleHandle } from "./types.js";
export declare function moduleHandle(id: string, instance: unknown): ModuleHandle;
export declare function indexModules(handles: readonly ModuleHandle[]): Map<string, unknown>;
