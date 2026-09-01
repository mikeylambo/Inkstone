/**
 * INKSTONE on @slu/web-shell — the shell-facing entry point.
 *
 * The shell owns the meta layer (flow, screens, persistence, settings, stats,
 * modules); Inkstone owns the renderer, the fixed-step sim and everything
 * behind the ThreeAdapter. This file is the seam: it boots the shell with the
 * character-action assembly, wires the adapter hooks to `InkstoneEngine`, maps
 * Inkstone content onto the frame, and bridges run-end back into the shell flow.
 *
 * Nothing here edits the shell (gate M8): the shell is consumed as the built
 * v1.0.2 package and every integration point is a public API call or a DOM
 * touch on the elements the shell itself produced.
 */
import "../style.css";
import {
  createGameApp,
  ThreeAdapter,
  createCharacterActionAssembly,
  LeaderboardManager,
  IndexedDBStorage,
  BrowserStorage,
} from "@slu/web-shell";
import type { MoveList } from "@slu/web-shell";

import { TUNING } from "../tuning.js";
import { Audio } from "../audio.js";
import { Input } from "../input.js";
import { PlayerOptions, Hooks as HooksModule } from "../playeroptions.js";
import { migrateOnce } from "../storage.js";

// `Hooks` and `TUNING` are untyped JS singletons behind the adapter boundary.
const Hooks = HooksModule as unknown as { onVisual: (() => void) | null; onAudio: (() => void) | null };

import { InkstoneEngine, type RunEnded } from "./engine.js";
import {
  registerMoveList,
  INKSTONE_MODES,
  LOCKED_MODES,
  runRequestForMode,
  recordRunStats,
} from "./content.js";
import {
  loadInkstoneProfile,
  saveInkstoneProfile,
  type InkstoneProfileData,
} from "./profileShim.js";
import { ShellGallery } from "./gallery.js";

const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const TRIAL_BOARD = "trial-rank";

function devMode(): boolean {
  try {
    return new URLSearchParams(location.search).get("dev") === "1";
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  document.title = `INKSTONE — V${VERSION}`;
  const versionEl = document.getElementById("version");
  if (versionEl) versionEl.textContent = `INKSTONE · V${VERSION}`;

  const container = document.getElementById("canvas-container");
  const uiRoot = document.getElementById("ui");
  if (!container || !uiRoot) throw new Error("INKSTONE shell: missing #canvas-container / #ui");

  // Options must not import the renderer; they call back through Hooks. Wire
  // them before load() so a restored profile's choices reach the renderer.
  const engine = new InkstoneEngine(container, VERSION);
  Hooks.onVisual = () => {
    engine.resize();
    document.documentElement.style.setProperty("--text-scale", String(TUNING.access.textScale));
  };
  Hooks.onAudio = () => Audio.applyVolumes();
  migrateOnce();
  PlayerOptions.load();

  let lastEnded: RunEnded | null = null;

  const adapter = new ThreeAdapter({
    onStart: () => engine.start(),
    onSuspend: () => engine.pause(),
    onResume: () => engine.resume(),
    onResize: () => engine.resize(),
    onUnloadLevel: () => engine.endRun(),
    onScreenshot: () => engine.screenshot(lastEnded),
    onLoadLevel: (id: string) => {
      const difficultyId = app?.shell.difficulty.active()?.id ?? "hunter";
      const req = runRequestForMode(id, difficultyId);
      if (req) engine.startRun(req);
    },
  });

  const app = await createGameApp({
    gameId: "inkstone",
    gameName: "INKSTONE",
    version: VERSION,
    renderer: adapter,
    root: uiRoot,
    assemblies: [(shell) => createCharacterActionAssembly({ shell })],
  });

  // --- content mapping ------------------------------------------------------
  app.shell.modes.register(INKSTONE_MODES);
  reshapeScreens(app);

  const moves = app.composer.modules.get<MoveList>("moves");
  registerMoveList(moves);

  const board = new LeaderboardManager();
  const gallery = new ShellGallery(
    new IndexedDBStorage("inkstone.gallery.shell", "prints"),
    Math.max(1, Math.round(TUNING.frame.galleryMax ?? 20))
  );

  const profileStore = new BrowserStorage("inkstone");
  const loaded = await loadInkstoneProfile(profileStore);
  const profile: InkstoneProfileData = loaded.data;

  // --- audio arm (first interaction) ---------------------------------------
  armAudioOnce();

  // --- reveal the renderer during play -------------------------------------
  // The turnkey flow shows a "gameplay-placeholder" screen while playing; that
  // overlay would hide the Three canvas. Hide the shell UI during play and
  // mirror the phase onto body[data-state] so the existing HUD CSS behaves.
  // (Shell-gap ticket SG-1 in REPORT: the shell should expose this hook.)
  app.shell.session.events.on("phase:changed", ({ to }: { to: string }) => {
    uiRoot.hidden = to === "playing";
    document.body.dataset.state = phaseToLegacyState(to);
  });

  // Quitting from pause returns to the menu but the shell does not dispose the
  // renderer's run — do it here.
  app.shell.events.on("game:quit", () => engine.endRun());

  // --- settings bridge (core shell settings → Inkstone tuning) -------------
  bridgeSettings(app);

  // --- run-end bridge -------------------------------------------------------
  engine.onRunEnded = (ended) => {
    lastEnded = ended;
    void handleRunEnd(ended);
  };

  async function handleRunEnd(ended: RunEnded): Promise<void> {
    const summary = ended.summary;
    const mode = String(summary.mode ?? "");

    await recordRunStats(app.shell, summary);

    if (mode !== "kata") {
      updateBests(profile, summary);
      await saveInkstoneProfile(profileStore, profile);
      try {
        await board.submit(TRIAL_BOARD, {
          playerId: profile.name,
          displayName: profile.name,
          score: Number(summary.score ?? 0),
          metadata: {
            mode,
            seed: summary.seed,
            wave: summary.wave,
            day: summary.day,
            rank: (summary.rank as { grade?: string } | undefined)?.grade ?? null,
            runHash: summary.runHash,
            version: summary.version,
          },
        });
      } catch {
        /* a board failure must never block results */
      }
    }

    // Persist the print through shell storage (gate M4).
    const blob = await engine.screenshot(ended);
    if (blob) {
      await gallery.save(blob.slice(), {
        mode,
        modeLabel: String(summary.modeLabel ?? ""),
        seed: String(summary.seed ?? ""),
        score: Number(summary.score ?? 0),
        rank: (summary.rank as { grade?: string; title?: string; kanji?: string; color?: string }) ?? null,
        wave: Number(summary.wave ?? 0),
        day: String(summary.day ?? ""),
        runHash: String(summary.runHash ?? ""),
        scroll: (summary.scroll as string | null) ?? null,
        modifiers: (summary.modifiers as unknown[]) ?? [],
        version: String(summary.version ?? VERSION),
      });
    }

    app.flow.showResults();
    await enrichResults(summary, blob);
  }

  // Expose a headless-friendly handle for the gate harness / console poking.
  (window as unknown as { INKSTONE_SHELL: unknown }).INKSTONE_SHELL = {
    VERSION, app, engine, board, gallery, profile, TUNING,
  };

  if (devMode()) void mountDevTuning();
}

// --------------------------------------------------------------------- helpers

type App = Awaited<ReturnType<typeof createGameApp>>;

/** Reshape the frame's generic setup screens with Inkstone content. */
function reshapeScreens(app: App): void {
  // mode-select carries the scroll variant (the shell UI can't type a seed).
  app.ui.updateScreen("mode-select", {
    title: "PLAY",
    choices: INKSTONE_MODES.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      disabled: LOCKED_MODES.has(m.id),
    })),
  });

  // Inkstone has a single kit and a single arena; the caps-forced character and
  // stage selects collapse into confirm steps so the pad flow keeps working.
  app.ui.updateScreen("character-select", {
    title: "THE BRUSH",
    subtitle: "One hand, one blade of ink.",
    choices: [{ id: "brush", label: "Take up the brush" }],
  });
  app.ui.updateScreen("stage-select", {
    title: "THE ARENA",
    subtitle: "Washi ground. Every stroke writes on it.",
    choices: [{ id: "arena", label: "Enter" }],
  });
  app.ui.updateScreen("loadout", {
    title: "THE INKSTONE",
    subtitle: "Techniques carried into the run.",
    choices: [{ id: "continue", label: "Begin" }],
  });
}

/** Map the shell phase onto the legacy body[data-state] the HUD CSS keys off. */
function phaseToLegacyState(phase: string): string {
  switch (phase) {
    case "playing": return "RUN";
    case "paused": return "PAUSE";
    case "results": return "RESULTS";
    case "loading": return "RUN";
    default: return "TITLE";
  }
}

/** Personal-best update, keyed like the old Profile.bestKey. */
function updateBests(profile: InkstoneProfileData, summary: Record<string, unknown>): void {
  const mode = String(summary.mode ?? "");
  const scroll = summary.scroll as string | null;
  const day = String(summary.day ?? "");
  const key = scroll ? `scroll:${scroll}` : mode === "daily" ? `daily:${day}` : mode;
  const score = Number(summary.score ?? 0);
  const prev = profile.bests[key] as { score?: number } | undefined;
  profile.totalRuns += 1;
  profile.lastMode = mode;
  if (scroll) profile.lastScroll = scroll;
  if (!prev || score > Number(prev.score ?? 0)) {
    profile.bests[key] = {
      score,
      wave: summary.wave,
      seed: summary.seed,
      timeSeconds: summary.timeSeconds,
      rank: (summary.rank as { grade?: string } | undefined)?.grade,
      version: summary.version,
      runHash: summary.runHash,
      at: Date.now(),
    };
  }
}

/**
 * The shell results screen is a menu; Inkstone's results are the finished
 * calligraphy. Mount the print and the headline stats into the panel the shell
 * just rendered, and add EXPORT / COPY SEED affordances (no shell edit — this
 * decorates the shell's own DOM).
 */
async function enrichResults(
  summary: Record<string, unknown>,
  blob: Blob | null
): Promise<void> {
  const panel = document.querySelector(".slu-panel");
  if (!panel) return;

  const rank = summary.rank as { grade?: string; title?: string; kanji?: string; color?: string } | undefined;
  const meta = document.createElement("div");
  meta.className = "slu-results-meta";
  meta.style.cssText = "display:grid;gap:6px;margin:14px 0;opacity:.85;font-size:15px";
  const row = (k: string, v: unknown): string => `<div style="display:flex;justify-content:space-between"><span>${k}</span><span>${String(v)}</span></div>`;
  meta.innerHTML =
    row("RANK", `${rank?.kanji ?? ""} ${rank?.grade ?? "—"} · ${rank?.title ?? ""}`) +
    row("SCORE", summary.score ?? 0) +
    row("MODE", summary.modeLabel ?? summary.mode ?? "") +
    (Number(summary.wave ?? 0) ? row("WAVE", summary.wave) : "") +
    row("STROKES", summary.strokes ?? 0) +
    row("BEST COMBO", summary.bestCombo ?? 0) +
    row("DAMAGE TAKEN", summary.damageTaken ?? 0) +
    row("SEED", summary.seed ?? "");

  const header = panel.querySelector(".slu-header");
  if (header && header.nextSibling) panel.insertBefore(meta, header.nextSibling);
  else panel.appendChild(meta);

  if (blob) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    img.alt = "Finished calligraphy";
    img.style.cssText = "display:block;width:100%;max-width:360px;margin:8px auto 0;border-radius:8px";
    meta.appendChild(img);
  }
}

/** Bridge the shell's core settings to Inkstone tuning/audio. */
function bridgeSettings(app: App): void {
  const apply = (s: Record<string, unknown>): void => {
    if (typeof s.masterVolume === "number") {
      TUNING.audio.masterVolume = unitToDb(s.masterVolume);
      Audio.applyVolumes();
    }
    if (typeof s.screenShake === "number") TUNING.access.shakeScale = s.screenShake;
    if (typeof s.reducedMotion === "boolean") {
      TUNING.access.camMotionScale = s.reducedMotion ? 0.3 : 1;
    }
  };
  apply(app.settings.snapshot() as unknown as Record<string, unknown>);
  app.settings.events.on("changed", (s) => apply(s as unknown as Record<string, unknown>));
}

function unitToDb(unit: number): number {
  if (unit <= 0.0001) return -60;
  return 20 * Math.log10(unit);
}

/** Arm the Tone audio graph on the first user interaction (from old main.js). */
function armAudioOnce(): void {
  let armed = false;
  const arm = (): void => {
    if (armed) return;
    armed = true;
    Audio.start();
    document.getElementById("start-btn")?.classList.add("hidden");
  };
  document.getElementById("start-btn")?.addEventListener("click", arm);
  window.addEventListener("pointerdown", arm);
  window.addEventListener("keydown", arm);
}

/** `?dev=1` tuning editor as a dev-only overlay OUTSIDE the shell UI. */
async function mountDevTuning(): Promise<void> {
  const host = document.createElement("div");
  host.id = "dev-tuning-overlay";
  host.style.cssText =
    "position:fixed;right:0;top:0;bottom:0;width:min(440px,42vw);overflow:auto;z-index:5000;" +
    "background:rgba(12,12,16,.94);color:#eee;padding:12px;display:none;font:13px/1.4 monospace";
  document.body.appendChild(host);
  const mod = await import("../settings.js");
  const editor = new mod.SettingsEditor(host, { showBindings: true });
  void editor;
  // Backquote toggles it — Input.debugToggleRequested is set by Input.init().
  const loop = (): void => {
    if (Input.debugToggleRequested) {
      Input.debugToggleRequested = false;
      host.style.display = host.style.display === "none" ? "block" : "none";
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

void boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("INKSTONE shell boot failed", err);
});
