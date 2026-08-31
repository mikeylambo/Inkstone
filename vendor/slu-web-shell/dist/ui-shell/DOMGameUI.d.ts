import type { InputManager } from "../input/InputManager.js";
import type { UIScreenModel, UITheme } from "./types.js";
export interface DOMGameUIOptions {
    root: HTMLElement;
    input?: InputManager;
    theme?: Partial<UITheme>;
    onActivate?: (screenId: string, choiceId: string) => void;
    onBack?: (screenId: string) => void;
}
export declare class DOMGameUI {
    private readonly options;
    private screens;
    private active;
    private focusIndex;
    private theme;
    private frameHandle;
    constructor(options: DOMGameUIOptions);
    register(models: readonly UIScreenModel[]): void;
    show(id: string): void;
    updateScreen(id: string, patch: Partial<UIScreenModel>): void;
    startInputLoop(): void;
    stopInputLoop(): void;
    move(delta: number): void;
    activateFocused(): void;
    back(): void;
    private enabledChoices;
    private applyFocus;
    private render;
    private injectStyles;
    private escape;
}
