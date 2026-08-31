export declare class ContentRegistry {
    private groups;
    register<T extends {
        id: string;
    }>(group: string, entries: readonly T[]): void;
    get<T>(group: string, id: string): T | undefined;
    list<T>(group: string): T[];
}
