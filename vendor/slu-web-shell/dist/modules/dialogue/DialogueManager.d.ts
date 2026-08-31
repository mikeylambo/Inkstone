import { EventBus } from "../../core/EventBus.js";
export interface DialogueChoice {
    id: string;
    label: string;
    next?: string;
}
export interface DialogueNode {
    id: string;
    speaker?: string;
    text: string;
    choices?: DialogueChoice[];
    next?: string;
    actions?: string[];
}
export interface DialogueEvents {
    "dialogue:node": DialogueNode;
    "dialogue:ended": undefined;
    [key: string]: unknown;
}
export declare class DialogueManager {
    readonly events: EventBus<DialogueEvents>;
    private nodes;
    private currentId;
    register(nodes: readonly DialogueNode[]): void;
    start(id: string): DialogueNode;
    choose(choiceId: string): DialogueNode | null;
    advance(): DialogueNode | null;
    private goto;
    private end;
    private requireCurrent;
}
