import type { RendererAdapter } from "../adapters/RendererAdapter.js";
import { BrowserStorage } from "../platform/browser/BrowserStorage.js";
import { SettingsStore } from "../persistence/SettingsStore.js";
import { SLUWebShell } from "../Shell.js";
import { AssemblyComposer } from "../assemblies/AssemblyComposer.js";
import { DOMGameUI } from "../ui-shell/DOMGameUI.js";
import { GameFlowController } from "../ui-shell/GameFlowController.js";
import type { FrameAssembly } from "../assemblies/types.js";
export interface CreateGameAppOptions {
    gameId: string;
    gameName: string;
    version: string;
    renderer: RendererAdapter;
    root: HTMLElement;
    assemblies: Array<(shell: SLUWebShell<any>) => FrameAssembly>;
}
export declare function createGameApp(options: CreateGameAppOptions): Promise<{
    shell: SLUWebShell<import("../index.js").CoreSettings>;
    composer: AssemblyComposer;
    ui: DOMGameUI;
    flow: GameFlowController;
    storage: BrowserStorage;
    settings: SettingsStore<import("../index.js").CoreSettings>;
}>;
