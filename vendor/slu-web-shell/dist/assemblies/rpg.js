import { moduleHandle } from "./helpers.js";
import { InventoryManager, EquipmentManager, EconomyManager, CheckpointManager, ResultsManager, ProgressionManager, QuestManager, DialogueManager } from "../modules/index.js";
import { rpgFrame } from "../frames/rpg.js";
export function createRPGAssembly(context) {
    const frame = rpgFrame();
    const modules = [
        moduleHandle("inventory", new InventoryManager()),
        moduleHandle("equipment", new EquipmentManager([])),
        moduleHandle("economy", new EconomyManager()),
        moduleHandle("checkpoints", new CheckpointManager()),
        moduleHandle("results", new ResultsManager()),
        moduleHandle("progression", new ProgressionManager()),
        moduleHandle("quests", new QuestManager()),
        moduleHandle("dialogue", new DialogueManager())
    ];
    return {
        id: frame.id,
        frame,
        modules,
        install() {
            context.shell.modes.register(frame.modes);
            if (frame.difficulties)
                context.shell.difficulty.register(frame.difficulties);
        }
    };
}
