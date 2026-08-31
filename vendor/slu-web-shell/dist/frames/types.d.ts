import type { ModeDefinition } from "../game/Modes.js";
import type { DifficultyProfile } from "../game/Difficulty.js";
export type FrameId = "arcade" | "character-action" | "arena-combat" | "vehicle" | "fps" | "puzzle" | "rpg" | "strategy" | "platformer" | "party-multiplayer";
export type FlowPhase = "boot" | "front" | "setup" | "play" | "post" | "utility";
export interface FlowStep {
    id: string;
    phase: FlowPhase;
    order?: number;
}
export interface GenreFrame {
    id: FrameId;
    label: string;
    menuFlow: FlowStep[];
    modes: ModeDefinition[];
    difficulties?: DifficultyProfile[];
    statKeys: string[];
    challengeCategories: string[];
    recommendedModules: string[];
    settings?: Record<string, unknown>;
}
export interface ComposedFrame {
    ids: FrameId[];
    menuFlow: string[];
    flowSteps: FlowStep[];
    modes: ModeDefinition[];
    difficulties: DifficultyProfile[];
    statKeys: string[];
    challengeCategories: string[];
    recommendedModules: string[];
    settings: Record<string, unknown>;
}
/**
 * Merge flow steps by semantic phase instead of raw concatenation.
 *
 * This fixes the v0.1 failure where composing Arcade + Vehicle could place
 * garage/event setup screens after results simply because Arcade was first.
 */
export declare function composeFrames(...frames: GenreFrame[]): ComposedFrame;
export declare const flow: (phase: FlowPhase, ...ids: string[]) => FlowStep[];
