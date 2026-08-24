/**
 * Persistent profile. localStorage, versioned key.
 *
 * Bests are keyed per mode, and DAILY is additionally keyed by UTC date — a
 * daily best is only meaningful against that day's seed. Scrolls get their own
 * key space so a per-scroll best does not collide with a per-mode one.
 *
 * v2 adds `progression`: a reserved, versioned namespace that nothing writes
 * yet. It exists now so that when techniques, strokes, finishers and pigment
 * ship, they land in a profile shape that has always been there — no second
 * migration, no "your save is from before unlocks existed".
 */
import { KEYS, migrateOnce, readJSON } from './storage.js';

const KEY = KEYS.profile;

/** Keys owned by other modules, folded into export/import so a profile is portable. */
const FOREIGN_KEYS = [KEYS.bindings, KEYS.editorMode, KEYS.options];

/** Reserved by V0.2.6, written by nothing. See the frame brief, §10. */
function blankProgression() {
  return {
    version: 1,
    story: {},        // campaign / Pilgrimage beats
    techniques: [],   // unlocked technique ids
    strokes: [],      // unlocked stroke ids (V0.3)
    finishers: [],    // unlocked Finishing Strokes
    pigment: {},      // captured pigment, by kind
    scrolls: {},      // per-scroll completion state
    challenges: {},   // per-scroll challenge objectives
  };
}

function blank() {
  return {
    version: 2,
    bests: {},          // 'daily:2026-08-23' | 'free' | 'kata' | 'scroll:endless'
    totalRuns: 0,
    tutorialSeen: false,
    accessibilitySeen: false,
    lastMode: 'daily',
    lastScroll: null,
    name: 'ANON',
    settings: {},       // snapshot of the foreign keys, for export/import
    progression: blankProgression(),
  };
}

/** Fold a stored blob onto a blank profile, whatever version it came from. */
function hydrate(parsed) {
  const base = blank();
  if (!parsed || typeof parsed !== 'object') return base;
  return {
    ...base,
    ...parsed,
    version: 2,
    bests: { ...(parsed.bests || {}) },
    // a v1 profile has no progression; a v2 one may be missing new sub-keys
    progression: { ...blankProgression(), ...(parsed.progression || {}) },
  };
}

export const Profile = {
  data: blank(),

  load() {
    migrateOnce();          // pull a SUMI-era save forward before reading
    try {
      this.data = hydrate(readJSON(KEY, null));
    } catch (e) {
      this.data = blank();  // corrupt profile must never block boot
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },

  /** UTC date, so a daily seed means the same thing in every timezone. */
  today() { return new Date().toISOString().slice(0, 10); },

  /**
   * @param {string} mode
   * @param {string} [day]     required for daily
   * @param {string} [scroll]  scroll id; takes precedence over mode
   */
  bestKey(mode, day, scroll) {
    if (scroll) return `scroll:${scroll}`;
    return mode === 'daily' ? `daily:${day || this.today()}` : mode;
  },

  bestFor(mode, day, scroll) {
    return this.data.bests[this.bestKey(mode, day, scroll)] || null;
  },

  /** Records a result if it beats the stored one. Returns {isBest, previous, delta}. */
  submit(mode, day, entry, scroll) {
    const key = this.bestKey(mode, day, scroll);
    const prev = this.data.bests[key] || null;
    const isBest = !prev || entry.score > prev.score;
    if (isBest) this.data.bests[key] = { ...entry };
    this.data.totalRuns++;
    this.data.lastMode = mode;
    if (scroll) this.data.lastScroll = scroll;
    this.save();
    return { isBest, previous: prev, delta: prev ? entry.score - prev.score : entry.score };
  },

  setTutorialSeen(v = true) { this.data.tutorialSeen = v; this.save(); },
  setAccessibilitySeen(v = true) { this.data.accessibilitySeen = v; this.save(); },
  setName(n) { this.data.name = String(n || 'ANON').slice(0, 12).toUpperCase(); this.save(); },
  setLastMode(m) { this.data.lastMode = m; this.save(); },
  setLastScroll(s) { this.data.lastScroll = s; this.save(); },

  // ------------------------------------------------------------ portability

  exportJSON() {
    const settings = {};
    for (const k of FOREIGN_KEYS) {
      try { const v = localStorage.getItem(k); if (v != null) settings[k] = v; } catch (e) { /* ignore */ }
    }
    this.data.settings = settings;
    return JSON.stringify({ ...this.data, exportedAt: new Date().toISOString() }, null, 2);
  },

  importJSON(text) {
    this.data = hydrate(JSON.parse(text));
    // put the other modules' keys back where they live
    for (const [k, v] of Object.entries(this.data.settings || {})) {
      if (FOREIGN_KEYS.includes(k)) {
        try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
      }
    }
    this.save();
    return this.data;
  },

  wipe() {
    this.data = blank();
    this.save();
  },
};
