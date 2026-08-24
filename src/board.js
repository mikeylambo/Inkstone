/**
 * Leaderboard interface.
 *
 * `LocalBoard` ships now and is wired into RESULTS. `SupabaseBoard` has the
 * same signature and an empty body — swapping it in should be a one-line
 * change at the call site.
 *
 * Entries carry the build version because tuning changes invalidate any
 * cross-version comparison: a score set before a hit-stop change is not the
 * same achievement as one set after.
 */

/**
 * @typedef {Object} BoardEntry
 * @property {string} name
 * @property {number} score
 * @property {number} wave
 * @property {string} seed
 * @property {string} mode
 * @property {string} day      UTC date, for daily boards
 * @property {string} version  build version the run was set on
 * @property {string} runHash  RunRecord hash, so an entry points at a real run
 */

import { KEYS } from './storage.js';

/** Shared shape. Both implementations honour this. */
export class Board {
  /** @param {BoardEntry} entry */
  async submit(entry) { throw new Error('not implemented'); }
  /** @returns {Promise<BoardEntry[]>} */
  async top(mode, day, n = 10) { throw new Error('not implemented'); }
  /** Entries bracketing the given one, for "you are here". */
  async around(entry, n = 5) { throw new Error('not implemented'); }
}

const KEY = KEYS.board;

export class LocalBoard extends Board {
  constructor(storageKey = KEY) {
    super();
    this.key = storageKey;
  }

  _all() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  _write(list) {
    try { localStorage.setItem(this.key, JSON.stringify(list.slice(0, 500))); } catch (e) { /* ignore */ }
  }

  _bucket(mode, day) {
    return mode === 'daily' ? `daily:${day}` : mode;
  }

  async submit(entry) {
    const list = this._all();
    list.push({ ...entry, at: Date.now() });
    list.sort((a, b) => b.score - a.score);
    this._write(list);
    return entry;
  }

  async top(mode, day, n = 10) {
    const bucket = this._bucket(mode, day);
    return this._all()
      .filter((e) => this._bucket(e.mode, e.day) === bucket)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  async around(entry, n = 5) {
    const bucket = this._bucket(entry.mode, entry.day);
    const list = this._all()
      .filter((e) => this._bucket(e.mode, e.day) === bucket)
      .sort((a, b) => b.score - a.score);
    const i = list.findIndex((e) => e.runHash === entry.runHash);
    if (i < 0) return list.slice(0, n);
    const half = Math.floor(n / 2);
    return list.slice(Math.max(0, i - half), Math.max(0, i - half) + n);
  }

  /** Rank of an entry within its bucket, 1-based. */
  async rankOf(entry) {
    const list = await this.top(entry.mode, entry.day, 500);
    const i = list.findIndex((e) => e.runHash === entry.runHash);
    return i < 0 ? null : i + 1;
  }
}

/**
 * Cloud board. Empty on purpose.
 *
 * TODO(V0.6): implement against Supabase, reusing the Signal pattern —
 * anon-key client, a single `scores` table with RLS allowing insert-only from
 * the client, and a view for the top-N per (mode, day, version). Keep the
 * version column in the primary key of any uniqueness constraint so a tuning
 * change starts a fresh board rather than polluting the old one.
 */
export class SupabaseBoard extends Board {
  constructor(config = {}) {
    super();
    this.config = config;
    this.ready = false;
  }

  async submit(entry) { throw new Error('SupabaseBoard: not implemented (V0.6)'); }
  async top(mode, day, n = 10) { throw new Error('SupabaseBoard: not implemented (V0.6)'); }
  async around(entry, n = 5) { throw new Error('SupabaseBoard: not implemented (V0.6)'); }
}

/** The board the game currently talks to. */
export const board = new LocalBoard();
