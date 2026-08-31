/**
 * Profile migration shim (gate M5).
 *
 * A V0.2.6 build stored the profile as a raw JSON blob at the localStorage key
 * `inkstone.profile.v2` (and, one release earlier, `sumi.profile.v1`). The shell
 * owns persistence now through SaveManager + a StorageAdapter, which wraps data
 * in a versioned envelope under a namespaced key.
 *
 * This one-release shim reads the legacy blob on first load and folds it into
 * the shell save system with personal bests intact, then writes it back through
 * SaveManager so subsequent loads use the shell path. It never overwrites an
 * existing shell save, and it never deletes the legacy key.
 */
import { SaveManager } from "@slu/web-shell";
import type { StorageAdapter } from "@slu/web-shell";

/** The persisted profile shape (mirrors the old profile.js `blank()`). */
export interface InkstoneProfileData {
  version: number;
  bests: Record<string, unknown>;
  totalRuns: number;
  tutorialSeen: boolean;
  accessibilitySeen: boolean;
  lastMode: string;
  lastScroll: string | null;
  name: string;
  settings: Record<string, unknown>;
  progression: Record<string, unknown>;
}

/** Schema version of the shell-side save envelope. */
export const PROFILE_SCHEMA_VERSION = 1;
const SHELL_KEY = "profile";

/** Legacy raw localStorage keys, newest first. */
const LEGACY_KEYS = ["inkstone.profile.v2", "sumi.profile.v1"] as const;

export function blankProfile(): InkstoneProfileData {
  return {
    version: 2,
    bests: {},
    totalRuns: 0,
    tutorialSeen: false,
    accessibilitySeen: false,
    lastMode: "daily",
    lastScroll: null,
    name: "ANON",
    settings: {},
    progression: { version: 1, story: {}, techniques: [], strokes: [], finishers: [], pigment: {}, scrolls: {}, challenges: {} },
  };
}

/** Fold any stored blob onto a blank profile, preserving `bests`. */
export function hydrateProfile(parsed: unknown): InkstoneProfileData {
  const base = blankProfile();
  if (!parsed || typeof parsed !== "object") return base;
  const p = parsed as Partial<InkstoneProfileData>;
  return {
    ...base,
    ...p,
    version: 2,
    bests: { ...base.bests, ...(p.bests ?? {}) },
    progression: { ...base.progression, ...(p.progression ?? {}) },
  };
}

/** Read the legacy raw blob directly from localStorage. Null if none exists. */
export function readLegacyProfile(
  read: (key: string) => string | null = defaultLocalGet
): InkstoneProfileData | null {
  for (const key of LEGACY_KEYS) {
    const raw = read(key);
    if (raw == null) continue;
    try {
      return hydrateProfile(JSON.parse(raw));
    } catch {
      // A corrupt legacy blob must not block boot; try the next candidate.
    }
  }
  return null;
}

function defaultLocalGet(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function makeProfileSave(storage: StorageAdapter): SaveManager<InkstoneProfileData> {
  return new SaveManager<InkstoneProfileData>(storage, SHELL_KEY, PROFILE_SCHEMA_VERSION);
}

/**
 * Load the profile through the shell save system, migrating the legacy blob on
 * first run. Returns the profile and whether a legacy migration happened.
 */
export async function loadInkstoneProfile(
  storage: StorageAdapter,
  legacyRead: (key: string) => string | null = defaultLocalGet
): Promise<{ data: InkstoneProfileData; migratedFromLegacy: boolean }> {
  const save = makeProfileSave(storage);

  const existing = await save.load();
  if (existing) return { data: hydrateProfile(existing), migratedFromLegacy: false };

  const legacy = readLegacyProfile(legacyRead);
  if (legacy) {
    await save.save(legacy);
    return { data: legacy, migratedFromLegacy: true };
  }

  const fresh = blankProfile();
  await save.save(fresh);
  return { data: fresh, migratedFromLegacy: false };
}

export async function saveInkstoneProfile(
  storage: StorageAdapter,
  data: InkstoneProfileData
): Promise<void> {
  await makeProfileSave(storage).save(data);
}
