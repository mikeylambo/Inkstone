/**
 * Persistent profile. localStorage, versioned key.
 *
 * Bests are keyed per mode, and DAILY is additionally keyed by UTC date — a
 * daily best is only meaningful against that day's seed.
 */

const KEY = 'sumi.profile.v1';

/** Keys owned by other modules, folded into export/import so a profile is portable. */
const FOREIGN_KEYS = ['sumi.bindings.v1', 'sumi.editorMode.v1'];

function blank() {
  return {
    version: 1,
    bests: {},          // 'daily:2026-08-23' | 'free' | 'kata'  ->  entry
    totalRuns: 0,
    tutorialSeen: false,
    lastMode: 'daily',
    name: 'ANON',
    settings: {},       // snapshot of the foreign keys, for export/import
  };
}

export const Profile = {
  data: blank(),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...blank(), ...parsed, bests: { ...(parsed.bests || {}) } };
      }
    } catch (e) {
      this.data = blank();     // corrupt profile must never block boot
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },

  /** UTC date, so a daily seed means the same thing in every timezone. */
  today() { return new Date().toISOString().slice(0, 10); },

  bestKey(mode, day) {
    return mode === 'daily' ? `daily:${day || this.today()}` : mode;
  },

  bestFor(mode, day) {
    return this.data.bests[this.bestKey(mode, day)] || null;
  },

  /** Records a result if it beats the stored one. Returns {isBest, previous, delta}. */
  submit(mode, day, entry) {
    const key = this.bestKey(mode, day);
    const prev = this.data.bests[key] || null;
    const isBest = !prev || entry.score > prev.score;
    if (isBest) this.data.bests[key] = { ...entry };
    this.data.totalRuns++;
    this.data.lastMode = mode;
    this.save();
    return { isBest, previous: prev, delta: prev ? entry.score - prev.score : entry.score };
  },

  setTutorialSeen(v = true) { this.data.tutorialSeen = v; this.save(); },
  setName(n) { this.data.name = String(n || 'ANON').slice(0, 12).toUpperCase(); this.save(); },
  setLastMode(m) { this.data.lastMode = m; this.save(); },

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
    const parsed = JSON.parse(text);
    this.data = { ...blank(), ...parsed, bests: { ...(parsed.bests || {}) } };
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
