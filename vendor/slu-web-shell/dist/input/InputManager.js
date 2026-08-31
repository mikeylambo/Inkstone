const emptyState = () => ({
    value: 0,
    down: false,
    pressed: false,
    released: false
});
export class InputManager {
    states = new Map();
    previousDown = new Map();
    bindings = new Map();
    setBindings(bindings) {
        this.bindings.clear();
        for (const binding of bindings) {
            this.bindings.set(binding.action, structuredClone(binding));
            if (!this.states.has(binding.action))
                this.states.set(binding.action, emptyState());
        }
    }
    actions() {
        return [...this.bindings.keys()];
    }
    get(action) {
        return this.states.get(action) ?? emptyState();
    }
    isDown(action) {
        return this.get(action).down;
    }
    value(action) {
        return this.get(action).value;
    }
    wasPressed(action) {
        return this.get(action).pressed;
    }
    wasReleased(action) {
        return this.get(action).released;
    }
    update(raw) {
        for (const action of this.bindings.keys()) {
            const value = Math.max(-1, Math.min(1, raw.get(action) ?? 0));
            const down = Math.abs(value) > 0.001;
            const previous = this.previousDown.get(action) ?? false;
            this.states.set(action, {
                value,
                down,
                pressed: down && !previous,
                released: !down && previous
            });
            this.previousDown.set(action, down);
        }
    }
}
