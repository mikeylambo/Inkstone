export interface AccessibilitySettings {
    reducedMotion: boolean;
    screenShake: number;
    flashes: number;
    vibration: boolean;
    holdToToggle: boolean;
    highContrastUI: boolean;
    textScale: number;
}
export declare const defaultAccessibility: AccessibilitySettings;
export declare function prefersReducedMotion(): boolean;
