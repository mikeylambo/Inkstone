export interface MoveDefinition {
    id: string;
    label: string;
    input: string;
    description?: string;
    tags?: string[];
    unlockId?: string;
}
export declare class MoveList {
    private moves;
    register(moves: readonly MoveDefinition[]): void;
    list(isUnlocked?: (id: string) => boolean): MoveDefinition[];
}
