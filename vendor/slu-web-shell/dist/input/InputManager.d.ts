import type { ActionState, InputAction, InputBinding } from "./InputTypes.js";
export declare class InputManager {
    private states;
    private previousDown;
    private bindings;
    setBindings(bindings: readonly InputBinding[]): void;
    actions(): readonly InputAction[];
    get(action: InputAction): Readonly<ActionState>;
    isDown(action: InputAction): boolean;
    value(action: InputAction): number;
    wasPressed(action: InputAction): boolean;
    wasReleased(action: InputAction): boolean;
    update(raw: Map<InputAction, number>): void;
}
