/**
 * SCROLL GALLERY — the last N run prints, kept as PNG blobs in IndexedDB.
 *
 * localStorage is the wrong home for this: a 560px print is roughly 150–400 KB
 * as a data URL and the whole quota is 5 MB, so twenty of them would evict the
 * player's profile. IndexedDB stores the Blob itself, has no practical size
 * ceiling here, and hands back an object URL the <img> can use directly.
 *
 * Every call resolves rather than rejects. A browser in private mode with
 * IndexedDB disabled should cost the player their gallery, not their run.
 */
import { TUNING } from './tuning.js';

const DB_NAME = 'inkstone.gallery';
const DB_VERSION = 1;
const STORE = 'prints';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (e) { resolve(null); return; }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('at', 'at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/** Promise wrapper for an IDBRequest that never rejects. */
function once(req, fallback = null) {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(fallback);
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b), 'image/png'); }
    catch (e) { resolve(null); }
  });
}

export const Gallery = {
  /** Is persistence actually available in this browser? */
  async available() { return !!(await open()); },

  /**
   * Store a print. Called from RESULTS.
   * @param {HTMLCanvasElement} canvas the rendered scroll
   * @param {object} meta {mode, modeLabel, seed, score, rank, wave, day, runHash, scroll, modifiers}
   * @returns {Promise<object|null>} the stored entry
   */
  async save(canvas, meta) {
    const db = await open();
    if (!db) return null;
    const blob = await canvasToBlob(canvas);
    if (!blob) return null;

    const entry = {
      id: `${meta.runHash || 'run'}-${Date.now().toString(36)}`,
      at: Date.now(),
      mode: meta.mode,
      modeLabel: meta.modeLabel,
      scroll: meta.scroll || null,
      seed: meta.seed,
      score: meta.score,
      wave: meta.wave || 0,
      rank: meta.rank ? { grade: meta.rank.grade, title: meta.rank.title, kanji: meta.rank.kanji, color: meta.rank.color } : null,
      day: meta.day,
      runHash: meta.runHash,
      modifiers: meta.modifiers || [],
      version: meta.version || null,
      blob,
    };

    try { await once(tx(db, 'readwrite').put(entry)); } catch (e) { return null; }
    await this.evict();
    return entry;
  },

  /** Newest first. Blobs come back as object URLs on `url`. */
  async list() {
    const db = await open();
    if (!db) return [];
    const all = await once(tx(db, 'readonly').getAll(), []);
    if (!all) return [];
    all.sort((a, b) => b.at - a.at);
    return all.map((e) => ({ ...e, url: e.blob ? URL.createObjectURL(e.blob) : null }));
  },

  async count() {
    const db = await open();
    if (!db) return 0;
    return (await once(tx(db, 'readonly').count(), 0)) || 0;
  },

  async get(id) {
    const db = await open();
    if (!db) return null;
    const e = await once(tx(db, 'readonly').get(id), null);
    return e ? { ...e, url: e.blob ? URL.createObjectURL(e.blob) : null } : null;
  },

  async remove(id) {
    const db = await open();
    if (!db) return false;
    await once(tx(db, 'readwrite').delete(id), null);
    return true;
  },

  /** Trim to frame.galleryMax, oldest first. */
  async evict() {
    const db = await open();
    if (!db) return 0;
    const max = Math.max(1, Math.round(TUNING.frame.galleryMax));
    const all = await once(tx(db, 'readonly').getAll(), []);
    if (!all || all.length <= max) return 0;
    all.sort((a, b) => a.at - b.at);              // oldest first
    const doomed = all.slice(0, all.length - max);
    const store = tx(db, 'readwrite');
    for (const e of doomed) store.delete(e.id);
    return doomed.length;
  },

  async clear() {
    const db = await open();
    if (!db) return false;
    await once(tx(db, 'readwrite').clear(), null);
    return true;
  },
};
