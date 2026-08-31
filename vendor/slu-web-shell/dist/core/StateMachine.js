export class StateMachine {
    state;
    allowed = new Map();
    constructor(initial, transitions = []) {
        this.state = initial;
        for (const { from, to } of transitions) {
            const targets = this.allowed.get(from) ?? new Set();
            targets.add(to);
            this.allowed.set(from, targets);
        }
    }
    get current() {
        return this.state;
    }
    can(to) {
        const targets = this.allowed.get(this.state);
        return !targets || targets.size === 0 || targets.has(to);
    }
    transition(to) {
        if (!this.can(to)) {
            throw new Error(`Illegal state transition: ${this.state} -> ${to}`);
        }
        this.state = to;
        return this.state;
    }
}
