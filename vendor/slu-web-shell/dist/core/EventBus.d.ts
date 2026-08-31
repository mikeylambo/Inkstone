import type { Unsubscribe } from "./types.js";
export type EventMap = Record<string, unknown>;
export declare class EventBus<Events extends EventMap = EventMap> {
    private listeners;
    on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): Unsubscribe;
    once<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): Unsubscribe;
    emit<K extends keyof Events>(event: K, payload: Events[K]): void;
    clear(event?: keyof Events): void;
}
