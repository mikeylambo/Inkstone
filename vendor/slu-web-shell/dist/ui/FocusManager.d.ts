export declare class FocusManager {
    private items;
    private index;
    setItems(items: readonly HTMLElement[]): void;
    next(): void;
    previous(): void;
    focusCurrent(): void;
}
