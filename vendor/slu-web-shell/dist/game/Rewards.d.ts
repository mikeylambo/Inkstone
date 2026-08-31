import { EventBus } from "../core/EventBus.js";
export type Reward = {
    type: "currency";
    id: string;
    amount: number;
} | {
    type: "unlock";
    id: string;
} | {
    type: "item";
    id: string;
    amount?: number;
} | {
    type: "cosmetic";
    id: string;
} | {
    type: "custom";
    id: string;
    payload?: unknown;
};
export type RewardHandler = (reward: Reward) => void | Promise<void>;
export interface RewardEvents {
    "reward:granting": Reward;
    "reward:granted": Reward;
    "rewards:granted": {
        rewards: Reward[];
    };
    [key: string]: unknown;
}
export declare class RewardManager {
    readonly events: EventBus<RewardEvents>;
    private handlers;
    register(type: Reward["type"], handler: RewardHandler): this;
    grant(rewards: readonly Reward[]): Promise<void>;
}
