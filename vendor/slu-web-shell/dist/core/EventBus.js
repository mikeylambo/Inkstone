export class EventBus {
    listeners = new Map();
    on(event, listener) {
        const set = this.listeners.get(event) ?? new Set();
        set.add(listener);
        this.listeners.set(event, set);
        return () => set.delete(listener);
    }
    once(event, listener) {
        const off = this.on(event, (payload) => {
            off();
            listener(payload);
        });
        return off;
    }
    emit(event, payload) {
        for (const listener of this.listeners.get(event) ?? [])
            listener(payload);
    }
    clear(event) {
        if (event)
            this.listeners.delete(event);
        else
            this.listeners.clear();
    }
}
