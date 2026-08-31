export class MoveList {
    moves = new Map();
    register(moves) { for (const m of moves)
        this.moves.set(m.id, structuredClone(m)); }
    list(isUnlocked = () => true) { return [...this.moves.values()].filter(m => !m.unlockId || isUnlocked(m.unlockId)).map(m => structuredClone(m)); }
}
