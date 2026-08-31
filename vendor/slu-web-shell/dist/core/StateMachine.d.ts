export interface Transition<S extends string> {
    from: S;
    to: S;
}
export declare class StateMachine<S extends string> {
    private state;
    private allowed;
    constructor(initial: S, transitions?: readonly Transition<S>[]);
    get current(): S;
    can(to: S): boolean;
    transition(to: S): S;
}
