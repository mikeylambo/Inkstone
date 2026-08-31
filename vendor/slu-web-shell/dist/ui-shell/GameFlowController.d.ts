import type { SLUWebShell } from "../Shell.js";
import type { DOMGameUI } from "./DOMGameUI.js";
export interface FlowCapabilities {
    stageSelect?: boolean;
    characterSelect?: boolean;
    vehicleSelect?: boolean;
    loadout?: boolean;
    difficulty?: boolean;
}
export declare class GameFlowController {
    private readonly shell;
    private readonly ui;
    private readonly caps;
    private selectedMode;
    private setupQueue;
    private setupIndex;
    constructor(shell: SLUWebShell<any>, ui: DOMGameUI, caps: FlowCapabilities);
    start(): void;
    onActivate(screenId: string, choiceId: string): void;
    onBack(screenId: string): void;
    showPause(): void;
    showResults(): void;
    private buildSetupQueue;
    private advanceSetup;
    private launch;
    private showSettings;
    private handleSetting;
}
