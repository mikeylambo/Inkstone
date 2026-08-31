export class ScreenManager {
    screens = new Map();
    current = null;
    history = [];
    register(screens) {
        for (const screen of screens)
            this.screens.set(screen.id, screen);
    }
    async show(id, params, remember = true) {
        const next = this.screens.get(id);
        if (!next)
            throw new Error(`Unknown screen: ${id}`);
        if (this.current) {
            if (remember)
                this.history.push(this.current.id);
            await this.current.exit?.();
        }
        this.current = next;
        await next.enter?.(params);
    }
    async back() {
        const previous = this.history.pop();
        if (!previous)
            return false;
        await this.show(previous, undefined, false);
        return true;
    }
    activeId() {
        return this.current?.id ?? null;
    }
}
