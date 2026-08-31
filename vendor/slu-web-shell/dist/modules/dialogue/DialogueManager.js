import { EventBus } from "../../core/EventBus.js";
export class DialogueManager {
    events = new EventBus();
    nodes = new Map();
    currentId = null;
    register(nodes) { for (const n of nodes)
        this.nodes.set(n.id, structuredClone(n)); }
    start(id) { return this.goto(id); }
    choose(choiceId) { const node = this.requireCurrent(); const choice = node.choices?.find(c => c.id === choiceId); if (!choice)
        throw new Error(`Unknown dialogue choice: ${choiceId}`); return choice.next ? this.goto(choice.next) : this.end(); }
    advance() { const node = this.requireCurrent(); return node.next ? this.goto(node.next) : this.end(); }
    goto(id) { const n = this.nodes.get(id); if (!n)
        throw new Error(`Unknown dialogue node: ${id}`); this.currentId = id; const copy = structuredClone(n); this.events.emit("dialogue:node", copy); return copy; }
    end() { this.currentId = null; this.events.emit("dialogue:ended", undefined); return null; }
    requireCurrent() { if (!this.currentId)
        throw new Error("No active dialogue"); return this.nodes.get(this.currentId); }
}
