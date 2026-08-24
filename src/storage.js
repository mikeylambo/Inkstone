/**
 * Storage keys, and the one-release migration off the SUMI-era names.
 *
 * The game was called SUMI through V0.2.5 and its localStorage keys said so.
 * Renaming the game must not cost a player their bests, their bindings or
 * their board, so every key has a legacy name that is read exactly once and
 * copied forward. The legacy keys are deliberately NOT deleted: if a player
 * rolls back to a V0.2.5 build their save is still there. Delete them a
 * release after this one.
 */

export const KEYS = {
  profile: 'inkstone.profile.v2',
  bindings: 'inkstone.bindings.v1',
  editorMode: 'inkstone.editorMode.v1',
  board: 'inkstone.board.v1',
  options: 'inkstone.options.v1',
};

/** new key -> the SUMI-era key it inherits from. */
const LEGACY = {
  [KEYS.profile]: 'sumi.profile.v1',
  [KEYS.bindings]: 'sumi.bindings.v1',
  [KEYS.editorMode]: 'sumi.editorMode.v1',
  [KEYS.board]: 'sumi.board.v1',
};

const MIGRATION_FLAG = 'inkstone.migrated.v1';

let migrated = false;

/**
 * Copy any SUMI-era value into its INKSTONE key. Idempotent, and never
 * overwrites a value the new build has already written.
 * @returns {string[]} the keys that were carried forward
 */
export function migrateOnce() {
  if (migrated) return [];
  migrated = true;
  const moved = [];
  try {
    for (const [next, legacy] of Object.entries(LEGACY)) {
      if (localStorage.getItem(next) != null) continue;    // already ours
      const old = localStorage.getItem(legacy);
      if (old == null) continue;
      localStorage.setItem(next, old);
      moved.push(`${legacy} -> ${next}`);
    }
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  } catch (e) {
    /* private mode / quota: the game still runs, it just starts fresh */
  }
  return moved;
}

/** True if this profile came across from a SUMI-era save. */
export function wasMigrated() {
  try { return localStorage.getItem(MIGRATION_FLAG) != null; } catch (e) { return false; }
}

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}
