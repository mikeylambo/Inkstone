/**
 * The attack table. Frame data lives in tuning.js; this file only holds
 * the non-numeric identity of each attack (track, sound, trail colour,
 * and the stroke it leaves on the canvas).
 */
import { TUNING, attackDuration } from '../tuning.js';

/**
 * `trail` is the fan/ribbon ink colour. Consecutive strokes deliberately
 * alternate sumi / vermilion so a string reads as separate marks rather than
 * one smear — the V0.2 palette had drifted to near-identical greys.
 *
 * `ink` is the V0.3 stroke this attack lays on the floor, authored here in the
 * same place as the trail rather than derived from the animation. Fields:
 *
 *   kind     'arc' (a swept slash) or 'line' (a straight mark)
 *   type     the registry stroke type — what V0.4's glyph checks match on
 *   reach    metres: arc radius, or total length of a line
 *   sweep    radians of arc (arc only)
 *   tilt     radians the arc is swung off the facing axis (arc only). This is
 *            what makes a string cross itself — reversing the sweep direction
 *            just draws the same arc backwards.
 *   lateral  metres of sideways tilt (line only) — what makes a diagonal read
 *   offset   metres forward of the attacker before the mark is placed
 *   width    ink weight in metres
 *   pillar   a Set mark that blocks a charge (grounded heavy and dive only)
 *
 * `ink: null` means the attack leaves nothing. Airborne attacks leave nothing:
 * ink touches the floor when the blade does. The dive is the exception, and it
 * is exactly the attack that ends on the ground.
 */
export const ATTACK_META = {
  light1: {
    label: 'LIGHT 1', track: 'light1', sound: 'light1', trail: 0x1c1917, stroke: 'horizontal',
    ink: { kind: 'arc', type: 'horizontal', reach: 2.5, sweep: 1.75, width: 0.42, offset: 0 },
  },
  light2: {
    label: 'LIGHT 2', track: 'light2', sound: 'light2', trail: 0xb91c1c, stroke: 'horizontal',
    // tilted off the facing axis so it genuinely crosses hit 1 — the shape
    // V0.4's Cross recognition will be looking for
    ink: { kind: 'arc', type: 'horizontal', reach: 2.6, sweep: 1.85, width: 0.44, offset: 0, tilt: 0.95 },
  },
  light3: {
    label: 'LIGHT 3', track: 'light3', sound: 'light3', trail: 0x1c1917, stroke: 'diagonal',
    ink: { kind: 'line', type: 'diagonal', reach: 3.4, lateral: 1.1, width: 0.5, offset: 1.1 },
  },
  heavy: {
    label: 'HEAVY', track: 'heavy', sound: 'heavy', trail: 0x7f1d1d, stroke: 'diagonal',
    ink: { kind: 'arc', type: 'diagonal', reach: 3.2, sweep: 2.35, width: 0.72, offset: 0, tilt: -0.55, pillar: true },
  },
  launcher: {
    label: 'LAUNCHER', track: 'launcher', sound: 'launcher', trail: 0xd97706, stroke: 'vertical',
    ink: { kind: 'line', type: 'vertical', reach: 2.2, lateral: 0, width: 0.46, offset: 1.3 },
  },
  stinger: {
    label: 'STINGER', track: 'stinger', sound: 'light3', trail: 0xb91c1c, stroke: 'puncture',
    ink: { kind: 'line', type: 'puncture', reach: 1.5, lateral: 0, width: 0.36, offset: 1.7 },
  },
  airLight1: {
    label: 'AIR 1', track: 'airLight1', sound: 'airLight', trail: 0x1c1917, stroke: 'horizontal',
    ink: null,
  },
  airLight2: {
    label: 'AIR 2', track: 'airLight2', sound: 'airLight', trail: 0xb91c1c, stroke: 'horizontal',
    ink: null,
  },
  airLight3: {
    label: 'AIR 3', track: 'airLight3', sound: 'airLight3', trail: 0x1c1917, stroke: 'diagonal',
    ink: null,
  },
  dive: {
    label: 'DIVE', track: null, sound: 'dive', trail: 0x1c1917, stroke: 'puncture',
    // laid on landing, not on the swing — see Player.landDive
    ink: { kind: 'arc', type: 'arc', reach: 2.0, sweep: 6.28, width: 0.85, offset: 0, pillar: true },
  },
};

/**
 * Lock-on directional moves. highTime and splitter are aliases onto existing
 * attacks so the face buttons stay free to change meaning later.
 */
export const DIR_MOVES = {
  stinger: 'stinger',    // toward + light
  highTime: 'launcher',  // away + light
  splitter: 'heavy',     // toward + heavy
};

/** Live view — reads TUNING each call so debug edits apply immediately. */
export function getAttack(key) {
  const t = TUNING.attacks[key];
  const m = ATTACK_META[key];
  if (!t || !m) return null;
  return { key, ...m, ...t, duration: attackDuration(t) };
}

/** Ground light string. */
export const GROUND_LIGHT_CHAIN = ['light1', 'light2', 'light3'];
/** Air light string. */
export const AIR_LIGHT_CHAIN = ['airLight1', 'airLight2', 'airLight3'];

/**
 * Convert elapsed time into phase space (0..3) for the pose tracks.
 * anticipation -> 0..1, active -> 1..2, recovery -> 2..3
 */
export function phaseOf(atk, elapsed) {
  if (elapsed < atk.anticipation) return elapsed / Math.max(1e-5, atk.anticipation);
  if (elapsed < atk.anticipation + atk.active) {
    return 1 + (elapsed - atk.anticipation) / Math.max(1e-5, atk.active);
  }
  const r = (elapsed - atk.anticipation - atk.active) / Math.max(1e-5, atk.recovery);
  return 2 + Math.min(1, r);
}

export function isActiveFrames(atk, elapsed) {
  return elapsed >= atk.anticipation && elapsed < atk.anticipation + atk.active;
}
