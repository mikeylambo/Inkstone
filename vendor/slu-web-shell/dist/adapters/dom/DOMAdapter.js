export class DOMAdapter {
    root;
    id = "dom";
    constructor(root) {
        this.root = root;
    }
    suspend() {
        this.root.dataset.suspended = "true";
    }
    resume() {
        delete this.root.dataset.suspended;
    }
    setDebugVisible(visible) {
        this.root.dataset.debug = String(visible);
    }
}
