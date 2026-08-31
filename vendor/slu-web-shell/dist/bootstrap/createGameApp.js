import { BrowserStorage } from "../platform/browser/BrowserStorage.js";
import { BrowserInputSource } from "../platform/browser/BrowserInputSource.js";
import { BrowserPlatform } from "../platform/browser/BrowserPlatform.js";
import { SettingsStore } from "../persistence/SettingsStore.js";
import { SLUWebShell } from "../Shell.js";
import { AssemblyComposer } from "../assemblies/AssemblyComposer.js";
import { DOMGameUI } from "../ui-shell/DOMGameUI.js";
import { createDefaultScreens } from "../ui-shell/defaultScreens.js";
import { GameFlowController } from "../ui-shell/GameFlowController.js";
import { capabilitiesForFrames } from "../assemblies/capabilities.js";
export async function createGameApp(options) {
    const storage = new BrowserStorage(options.gameId);
    const settings = SettingsStore.core(storage);
    await settings.load();
    const shell = new SLUWebShell({
        build: {
            gameId: options.gameId,
            gameName: options.gameName,
            version: options.version
        },
        renderer: options.renderer,
        settings
    });
    const composer = new AssemblyComposer(shell);
    const assemblies = options.assemblies.map((factory) => factory(shell));
    for (const assembly of assemblies)
        await composer.add(assembly);
    const frameIds = assemblies.map((a) => a.frame.id);
    const caps = capabilitiesForFrames(frameIds);
    const screenModels = createDefaultScreens({
        gameName: options.gameName,
        modes: shell.modes.list(),
        difficulties: assemblies.flatMap((a) => a.frame.difficulties ?? []),
        includeStageSelect: caps.stageSelect,
        includeCharacterSelect: caps.characterSelect,
        includeVehicleSelect: caps.vehicleSelect,
        includeLoadout: caps.loadout,
        includeChallenges: true
    });
    let flow;
    const ui = new DOMGameUI({
        root: options.root,
        input: shell.input,
        onActivate: (screen, choice) => flow.onActivate(screen, choice),
        onBack: (screen) => flow.onBack(screen)
    });
    ui.register(screenModels);
    flow = new GameFlowController(shell, ui, caps);
    const bindings = [
        { action: "ui_up", keyboard: ["ArrowUp", "KeyW"], gamepadButtons: [12] },
        { action: "ui_down", keyboard: ["ArrowDown", "KeyS"], gamepadButtons: [13] },
        { action: "ui_left", keyboard: ["ArrowLeft", "KeyA"], gamepadButtons: [14] },
        { action: "ui_right", keyboard: ["ArrowRight", "KeyD"], gamepadButtons: [15] },
        { action: "ui_accept", keyboard: ["Enter", "Space"], gamepadButtons: [0] },
        { action: "ui_back", keyboard: ["Escape", "Backspace"], gamepadButtons: [1] },
        { action: "pause", keyboard: ["Escape"], gamepadButtons: [9] }
    ];
    shell.input.setBindings(bindings);
    const source = new BrowserInputSource(bindings);
    source.attach();
    const platform = new BrowserPlatform();
    platform.onResize((width, height, dpr) => options.renderer.resize?.(width, height, dpr));
    platform.onVisibilityChange((hidden) => {
        if (hidden && shell.session.phase === "playing")
            flow.showPause();
    });
    const poll = () => {
        shell.input.update(source.poll());
        if (shell.input.wasPressed("pause") && shell.session.phase === "playing")
            flow.showPause();
        requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
    await shell.boot();
    ui.startInputLoop();
    flow.start();
    return { shell, composer, ui, flow, storage, settings };
}
