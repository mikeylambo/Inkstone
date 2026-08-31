/**
 * Gallery store (gate M4) — finished-calligraphy prints through shell storage.
 *
 * The old `gallery.js` talked to IndexedDB directly. This routes prints through
 * the shell's StorageAdapter (an `IndexedDBStorage` in the browser), keeping the
 * schema simple: one record per print plus a small index list. The eviction
 * rule is preserved — oldest prints are trimmed once the store passes its cap
 * (TUNING.frame.galleryMax, historically 20).
 *
 * Bound to a StorageAdapter rather than to IndexedDB directly so the round-trip
 * and eviction logic can be exercised in a headless test with any adapter.
 */
import type { StorageAdapter } from "@slu/web-shell";

export interface GalleryMeta {
  mode: string;
  modeLabel?: string;
  seed?: string;
  score?: number;
  rank?: { grade?: string; title?: string; kanji?: string; color?: string } | null;
  wave?: number;
  day?: string;
  runHash?: string;
  scroll?: string | null;
  modifiers?: unknown[];
  version?: string | null;
}

export interface StoredPrint extends GalleryMeta {
  id: string;
  at: number;
  blob: Blob;
}

interface IndexEntry {
  id: string;
  at: number;
}

const INDEX_KEY = "index";
const printKey = (id: string): string => `print:${id}`;

export class ShellGallery {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly max = 20
  ) {}

  private async index(): Promise<IndexEntry[]> {
    return (await this.storage.get<IndexEntry[]>(INDEX_KEY)) ?? [];
  }

  private async writeIndex(entries: IndexEntry[]): Promise<void> {
    await this.storage.set(INDEX_KEY, entries);
  }

  /** Persist a print; returns the stored record, or null on failure. */
  async save(blob: Blob, meta: GalleryMeta): Promise<StoredPrint | null> {
    try {
      const id = `${meta.runHash || "run"}-${Date.now().toString(36)}`;
      const at = Date.now();
      const record: StoredPrint = {
        id,
        at,
        mode: meta.mode,
        modeLabel: meta.modeLabel,
        seed: meta.seed,
        score: meta.score,
        rank: meta.rank ?? null,
        wave: meta.wave ?? 0,
        day: meta.day,
        runHash: meta.runHash,
        scroll: meta.scroll ?? null,
        modifiers: meta.modifiers ?? [],
        version: meta.version ?? null,
        blob,
      };
      await this.storage.set(printKey(id), record);
      const idx = await this.index();
      idx.push({ id, at });
      await this.writeIndex(idx);
      await this.evict();
      return record;
    } catch {
      return null;
    }
  }

  /** All prints, newest first. */
  async list(): Promise<StoredPrint[]> {
    const idx = (await this.index()).slice().sort((a, b) => b.at - a.at);
    const out: StoredPrint[] = [];
    for (const entry of idx) {
      const record = await this.storage.get<StoredPrint>(printKey(entry.id));
      if (record) out.push(record);
    }
    return out;
  }

  async get(id: string): Promise<StoredPrint | null> {
    return this.storage.get<StoredPrint>(printKey(id));
  }

  async count(): Promise<number> {
    return (await this.index()).length;
  }

  async remove(id: string): Promise<boolean> {
    await this.storage.remove(printKey(id));
    const idx = (await this.index()).filter((e) => e.id !== id);
    await this.writeIndex(idx);
    return true;
  }

  /** Trim to `max`, oldest first. Returns how many were evicted. */
  async evict(): Promise<number> {
    const idx = (await this.index()).slice().sort((a, b) => a.at - b.at);
    const overflow = idx.length - this.max;
    if (overflow <= 0) return 0;
    const doomed = idx.slice(0, overflow);
    for (const entry of doomed) await this.storage.remove(printKey(entry.id));
    const survivors = idx.slice(overflow);
    await this.writeIndex(survivors);
    return doomed.length;
  }

  async clear(): Promise<boolean> {
    for (const entry of await this.index()) await this.storage.remove(printKey(entry.id));
    await this.storage.remove(INDEX_KEY);
    return true;
  }
}
