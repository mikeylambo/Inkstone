import type { InputAction, InputBinding } from "../../input/InputTypes.js";
export declare class BrowserInputSource {
    private readonly bindings;
    private keys;
    private mouseButtons;
    private connected;
    constructor(bindings: readonly InputBinding[]);
    attach(target?: Window): () => void;
    poll(): Map<InputAction, number>;
}
