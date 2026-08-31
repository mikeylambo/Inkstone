export interface RulesetDefinition {
    id: string;
    label: string;
    values: Record<string, unknown>;
}
export declare class RulesetManager {
    private rules;
    private activeId;
    register(rules: readonly RulesetDefinition[]): void;
    activate(id: string): RulesetDefinition;
    active(): RulesetDefinition | null;
}
