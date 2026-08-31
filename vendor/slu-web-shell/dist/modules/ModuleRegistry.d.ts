export declare class ModuleRegistry {
    private modules;
    register<T>(id: string, module: T): T;
    registerShared<T>(id: string, module: T): T;
    get<T>(id: string): T;
    has(id: string): boolean;
    list(): string[];
}
