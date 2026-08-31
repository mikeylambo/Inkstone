export const defaultAccessibility = {
    reducedMotion: false,
    screenShake: 1,
    flashes: 1,
    vibration: true,
    holdToToggle: false,
    highContrastUI: false,
    textScale: 1
};
export function prefersReducedMotion() {
    return typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches;
}
