import { EventBus } from "../../core/EventBus.js";
export interface LocalPlayer {
    slot: number;
    deviceId: string;
    profileId?: string;
    ready: boolean;
}
export interface PlayerAssignmentEvents {
    "player:joined": LocalPlayer;
    "player:left": LocalPlayer;
    "player:ready": LocalPlayer;
    [key: string]: unknown;
}
export declare class PlayerAssignmentManager {
    private readonly maxPlayers;
    readonly events: EventBus<PlayerAssignmentEvents>;
    private players;
    constructor(maxPlayers?: number);
    join(deviceId: string, profileId?: string): LocalPlayer;
    leave(slot: number): boolean;
    setReady(slot: number, ready?: boolean): LocalPlayer;
    allReady(minPlayers?: number): boolean;
    list(): LocalPlayer[];
}
