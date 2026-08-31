import { EventBus } from "../core/EventBus.js";
export class RewardManager {
    events = new EventBus();
    handlers = new Map();
    register(type, handler) { this.handlers.set(type, handler); return this; }
    async grant(rewards) {
        const granted = [];
        for (const reward of rewards) {
            const copy = structuredClone(reward);
            this.events.emit("reward:granting", copy);
            const handler = this.handlers.get(reward.type);
            if (handler)
                await handler(reward);
            granted.push(copy);
            this.events.emit("reward:granted", copy);
        }
        this.events.emit("rewards:granted", { rewards: granted });
    }
}
