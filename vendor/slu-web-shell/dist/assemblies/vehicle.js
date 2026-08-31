import { moduleHandle } from "./helpers.js";
import { GarageManager, LoadoutManager, ResultsManager, LeaderboardManager, ReplayRecorder, RulesetManager, EconomyManager } from "../modules/index.js";
import { vehicleFrame } from "../frames/vehicle.js";
export function createVehicleAssembly(context) {
    const frame = vehicleFrame();
    const modules = [
        moduleHandle("garage", new GarageManager()),
        moduleHandle("loadout", new LoadoutManager()),
        moduleHandle("results", new ResultsManager()),
        moduleHandle("leaderboards", new LeaderboardManager()),
        moduleHandle("replay", new ReplayRecorder()),
        moduleHandle("rulesets", new RulesetManager()),
        moduleHandle("economy", new EconomyManager())
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
