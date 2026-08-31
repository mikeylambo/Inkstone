import type { UIScreenModel } from "./types.js";
import type { ModeDefinition } from "../game/Modes.js";
import type { DifficultyProfile } from "../game/Difficulty.js";
export interface DefaultScreenOptions {
    gameName: string;
    modes?: ModeDefinition[];
    difficulties?: DifficultyProfile[];
    includeStageSelect?: boolean;
    includeCharacterSelect?: boolean;
    includeVehicleSelect?: boolean;
    includeLoadout?: boolean;
    includeChallenges?: boolean;
}
export declare function createDefaultScreens(options: DefaultScreenOptions): UIScreenModel[];
