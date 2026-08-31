import { EventBus } from "../../core/EventBus.js";
export class EconomyManager {
    events = new EventBus();
    balances = new Map();
    balance(id) { return this.balances.get(id) ?? 0; }
    credit(id, amount) {
        this.assertAmount(amount);
        return this.change(id, amount);
    }
    canAfford(id, amount) {
        this.assertAmount(amount);
        return this.balance(id) >= amount;
    }
    trySpend(id, amount) {
        this.assertAmount(amount);
        if (!this.canAfford(id, amount))
            return false;
        this.change(id, -amount);
        return true;
    }
    spend(id, amount) {
        if (!this.trySpend(id, amount))
            throw new Error(`Insufficient ${id}`);
        return this.balance(id);
    }
    set(id, amount) {
        if (!Number.isFinite(amount))
            throw new Error("Currency balance must be finite");
        const old = this.balance(id);
        this.balances.set(id, amount);
        this.events.emit("currency:changed", { id, balance: amount, delta: amount - old });
        return amount;
    }
    change(id, delta) {
        const next = this.balance(id) + delta;
        this.balances.set(id, next);
        this.events.emit("currency:changed", { id, balance: next, delta });
        return next;
    }
    assertAmount(amount) {
        if (!Number.isFinite(amount) || amount < 0)
            throw new Error("Amount must be a finite number >= 0");
    }
}
