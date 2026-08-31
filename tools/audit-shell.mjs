#!/usr/bin/env node
/**
 * Headless gate audit for the SLU Web Shell migration.
 *
 * Runs the checks that are provable without a browser/GPU:
 *   M6  move-list == kit   (the ported FR4 technique/attack audit)
 *   M5  profile migrates    (legacy inkstone.profile.v2 -> shell SaveManager, bests intact)
 *   M4  gallery round-trip   (print store through shell storage, eviction rule intact)
 *
 * M1/M2 (determinism, combat byte-identical) are proven by `git diff` over the
 * untouched sim, plus the in-browser record.hash()/spawnHash() harness — see
 * REPORT.md. M3 (pad flow) and M7 (fps) need a human at a machine.
 *
 * The profile/gallery checks exercise the REAL glue (compiled from TS) against
 * the REAL vendored shell classes, wired to MemoryStorage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const fail = (gate, msg) => { results.push({ gate, ok: false, msg }); };
const pass = (gate, msg) => { results.push({ gate, ok: true, msg }); };

// --- minimal browser stubs so the sim-free JS modules import in node ---------
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

// --- link the vendored shell where node's resolver expects it ----------------
function ensureShellLink() {
  const scopeDir = path.join(root, "node_modules", "@slu");
  const link = path.join(scopeDir, "web-shell");
  const target = path.join(root, "vendor", "slu-web-shell");
  try {
    if (fs.existsSync(link)) return true;
    fs.mkdirSync(scopeDir, { recursive: true });
    try {
      fs.symlinkSync(target, link, "dir");
    } catch {
      fs.cpSync(target, link, { recursive: true });
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================ M6: move-list == kit
async function auditMoveList() {
  try {
    const tech = await import(pathToFileURL(path.join(root, "src", "techniques.js")).href);
    const TECHNIQUES = tech.TECHNIQUES;
    const audit = tech.auditTechniques();

    if (!Array.isArray(TECHNIQUES) || TECHNIQUES.length === 0) {
      return fail("M6", "TECHNIQUES table is empty");
    }
    // The shell MoveList is fed one entry per technique (see content.ts toShellMoves).
    const moves = TECHNIQUES.map((t) => ({ id: t.id, label: t.name, group: t.group }));
    const ids = new Set(moves.map((m) => m.id));
    if (ids.size !== moves.length) return fail("M6", "duplicate technique ids in move-list");
    if (moves.some((m) => !m.id || !m.label)) return fail("M6", "a technique is missing id/label");

    if (!audit.ok) {
      return fail("M6", `kit drift — missing:[${audit.missing.join(",")}] phantom:[${audit.phantom.join(",")}]`);
    }
    pass("M6", `move-list carries the kit: ${moves.length} techniques, 0 missing, 0 phantom vs ATTACK_META`);
  } catch (e) {
    fail("M6", `could not run technique audit: ${e.message}`);
  }
}

// ------------------------------- compile the sim-free glue for the M4/M5 checks
function compileGlue() {
  const r = spawnSync(process.execPath, [
    path.join(root, "node_modules", ".bin", "tsc"),
  ], { cwd: root, encoding: "utf8" });
  // Prefer a global/available tsc via npx if the local bin is absent.
  if (r.error) {
    return spawnSync("npx", ["--no-install", "tsc", "-p", "tsconfig.audit.json"], { cwd: root, encoding: "utf8" });
  }
  return spawnSync("npx", ["--no-install", "tsc", "-p", "tsconfig.audit.json"], { cwd: root, encoding: "utf8" });
}

// ============================================================ M5: profile migrates
async function auditProfileShim(shell) {
  try {
    const mod = await import(pathToFileURL(path.join(root, ".audit", "profileShim.js")).href);
    const storage = new shell.MemoryStorage();

    const legacyBlob = JSON.stringify({
      version: 2,
      bests: { "daily:2026-08-30": { score: 18422, wave: 7, rank: "S" }, free: { score: 9001 } },
      totalRuns: 41, name: "MIKEY", lastMode: "daily",
    });
    const legacyRead = (key) => (key === "inkstone.profile.v2" ? legacyBlob : null);

    const first = await mod.loadInkstoneProfile(storage, legacyRead);
    if (!first.migratedFromLegacy) return fail("M5", "legacy profile was not migrated on first load");
    if (first.data.bests["daily:2026-08-30"]?.score !== 18422) return fail("M5", "daily best lost in migration");
    if (first.data.bests.free?.score !== 9001) return fail("M5", "free best lost in migration");
    if (first.data.totalRuns !== 41 || first.data.name !== "MIKEY") return fail("M5", "profile fields lost in migration");

    // Second load must come from the shell envelope, not the legacy blob.
    const second = await mod.loadInkstoneProfile(storage, () => null);
    if (second.migratedFromLegacy) return fail("M5", "re-migrated an already-migrated profile");
    if (second.data.bests["daily:2026-08-30"]?.score !== 18422) return fail("M5", "bests not persisted through shell save");

    pass("M5", "legacy inkstone.profile.v2 → shell SaveManager, bests intact, one-shot migration");
  } catch (e) {
    fail("M5", `profile shim check failed: ${e.message}`);
  }
}

// ============================================================ M4: gallery round-trip
async function auditGallery(shell) {
  try {
    const mod = await import(pathToFileURL(path.join(root, ".audit", "gallery.js")).href);
    const storage = new shell.MemoryStorage();
    const MAX = 20;
    const gallery = new mod.ShellGallery(storage, MAX);

    // Save 25 prints; ids/timestamps are monotonic so eviction order is defined.
    const saved = [];
    for (let i = 0; i < 25; i++) {
      const blob = new Blob([`print-${i}`], { type: "image/png" });
      const rec = await gallery.save(blob, { mode: "daily", runHash: `h${i}`, score: i, day: "2026-08-31" });
      if (!rec) return fail("M4", `save ${i} returned null`);
      saved.push(rec);
      // ensure distinct timestamps for deterministic eviction
      await new Promise((res) => setTimeout(res, 1));
    }

    const count = await gallery.count();
    if (count !== MAX) return fail("M4", `expected ${MAX} prints after eviction, got ${count}`);

    const list = await gallery.list();
    if (list.length !== MAX) return fail("M4", `list() returned ${list.length}, expected ${MAX}`);
    // newest first, oldest 5 evicted
    if (list[0].score !== 24) return fail("M4", `newest print wrong (score ${list[0].score})`);
    if (list.some((p) => p.score < 5)) return fail("M4", "an evicted (oldest) print survived");

    // round-trip a blob through storage
    const got = await gallery.get(list[0].id);
    if (!got || !(got.blob instanceof Blob)) return fail("M4", "print blob did not round-trip through shell storage");
    const text = await got.blob.text();
    if (text !== "print-24") return fail("M4", `blob payload corrupted: ${text}`);

    pass("M4", `print round-trip through shell storage; eviction to ${MAX}, oldest-first, intact`);
  } catch (e) {
    fail("M4", `gallery check failed: ${e.message}`);
  }
}

// ================================================================= run it
async function main() {
  const linked = ensureShellLink();

  await auditMoveList();

  if (!linked) {
    fail("M5", "could not link @slu/web-shell for the profile check");
    fail("M4", "could not link @slu/web-shell for the gallery check");
  } else {
    const emit = compileGlue();
    if (emit.status !== 0) {
      const why = (emit.stderr || emit.stdout || "tsc unavailable").toString().trim().split("\n").slice(-3).join(" ");
      fail("M5", `could not compile glue for the profile check: ${why}`);
      fail("M4", `could not compile glue for the gallery check: ${why}`);
    } else {
      const shell = await import("@slu/web-shell");
      await auditProfileShim(shell);
      await auditGallery(shell);
    }
  }

  console.log("\n  SLU Web Shell migration — headless gate audit\n  " + "-".repeat(52));
  let allOk = true;
  for (const r of results.sort((a, b) => a.gate.localeCompare(b.gate))) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.gate}  ${r.msg}`);
    if (!r.ok) allOk = false;
  }
  console.log("  " + "-".repeat(52));
  console.log(`  ${allOk ? "ALL HEADLESS GATES PASS" : "SOME GATES FAILED"} (M1/M2 by diff+harness, M3/M7 need a machine)\n`);
  process.exit(allOk ? 0 : 1);
}

main();
