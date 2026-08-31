export interface Screen {
    id: string;
    enter?(params?: unknown): void | Promise<void>;
    exit?(): void | Promise<void>;
}
export declare class ScreenManager {
    private screens;
    private current;
    private history;
    register(screens: readonly Screen[]): void;
    show(id: string, params?: unknown, remember?: boolean): Promise<void>;
    back(): Promise<boolean>;
    activeId(): string | null;
}
