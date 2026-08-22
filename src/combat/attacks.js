/**
 * The attack table. Frame data lives in tuning.js; this file only holds
 * the non-numeric identity of each attack (track, sound, trail colour,
 * future stroke type for the V0.3 registry).
 */
import { TUNING, attackDuration } from '../tuning.js';

export const ATTACK_META = {
  light1: { label: 'LIGHT 1', track: 'light1', sound: 'light1', trail: 0x1c1917, stroke: 'horizontal' },
  light2: { label: 'LIGHT 2', track: 'light2', sound: 'light2', trail: 0x3f3a33, stroke: 'horizontal' },
  light3: { label: 'LIGHT 3', track: 'light3', sound: 'light3', trail: 0x7f1d1d, stroke: 'diagonal' },
  heavy: { label: 'HEAVY', track: 'heavy', sound: 'heavy', trail: 0x7f1d1d, stroke: 'diagonal' },
  launcher: { label: 'LAUNCHER', track: 'launcher', sound: 'launcher', trail: 0xb45309, stroke: 'vertical' },
  airLight1: { label: 'AIR 1', track: 'airLight1', sound: 'airLight', trail: 0x1c1917, stroke: 'horizontal' },
  airLight2: { label: 'AIR 2', track: 'airLight2', sound: 'airLight', trail: 0x3f3a33, stroke: 'horizontal' },
  airLight3: { label: 'AIR 3', track: 'airLight3', sound: 'airLight3', trail: 0x7f1d1d, stroke: 'diagonal' },
  dive: { label: 'DIVE', track: null, sound: 'dive', trail: 0x1c1917, stroke: 'puncture' },
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
