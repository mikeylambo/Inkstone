export class FocusManager {
    items = [];
    index = -1;
    setItems(items) {
        this.items = [...items].filter((x) => !x.hasAttribute("disabled"));
        this.index = this.items.length ? 0 : -1;
        this.focusCurrent();
    }
    next() {
        if (!this.items.length)
            return;
        this.index = (this.index + 1) % this.items.length;
        this.focusCurrent();
    }
    previous() {
        if (!this.items.length)
            return;
        this.index = (this.index - 1 + this.items.length) % this.items.length;
        this.focusCurrent();
    }
    focusCurrent() {
        this.items[this.index]?.focus();
    }
}
