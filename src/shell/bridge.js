import {
  SLUWebShell,
  BrowserStorage,
  SettingsStore,
  AssemblyComposer,
  createCharacterActionAssembly,
  createArcadeAssembly,
  mountBrowserDevConsole,
} from '@slu/web-shell';

/**
 * V0.5 migration rule: the modern Shell observes first, owns later.
 *
 * Inkstone's existing Game remains the authority for player-facing state while
 * we prove parity. This bridge mirrors that state into the Shell, installs the
 * Character Action + Arcade production services, and exposes Studio telemetry
 * and diagnostics without touching combat timing or semantic gameplay input.
 *
 * Once a responsibility has a parity test, ownership can move across this seam
 * one subsystem at a time instead of rewriting the game around the Shell.
 */

const SHELL_NAMESPACE = 'inkstone-v05';

const PHASE_BY_STATE = {
  BOOT: 'boot',
  TITLE: 'title',
  PLAY_SELECT: 'menu',
  SCROLL_SELECT: 'menu',
  RUN_SETUP: 'menu',
  RUN: 'playing',
  PAUSE: 'paused',
  WAVE_CHOICE: 'paused',
  DEATH: 'results',
  MISSION_CLEAR: 'results',
  RESULTS: 'results',
  INKSTONE: 'menu',
  ARCHIVE: 'menu',
  OPTIONS: 'menu',
  CREDITS: 'menu',
  DEV_TUNING: 'menu',
  PILGRIMAGE: 'menu',
};

function safeJson(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { return null; }
}

export class InkstoneShellBridge {
  constructor({ version, dev = false, snapshot = null } = {}) {
    this.version = version || 'dev';
    this.dev = !!dev;
    this.snapshot = typeof snapshot === 'function' ? snapshot : () => ({});
    this.shell = null;
    this.composer = null;
    this.storage = null;
    this.settings = null;
    this.devConsole = null;
    this.ready = false;
    this.lastGameState = 'BOOT';
  }

  async boot() {
    this.storage = new BrowserStorage(SHELL_NAMESPACE);
    this.settings = SettingsStore.core(this.storage, 'settings');
    await this.settings.load();

    // Renderer ownership deliberately stays in src/main.js during parity.
    // These hooks are intentionally inert until the lifecycle migration phase.
    const rendererAdapter = {
      id: 'inkstone-three-shadow',
      start() {},
      suspend() {},
      resume() {},
      loadLevel() {},
      unloadLevel() {},
    };

    this.shell = new SLUWebShell({
      build: {
        gameId: 'inkstone',
        gameName: 'INKSTONE',
        version: this.version,
        build: 'v0.5-shadow',
      },
      renderer: rendererAdapter,
      settings: this.settings,
    });

    this.composer = new AssemblyComposer(this.shell);
    const context = { shell: this.shell };
    await this.composer.add(createCharacterActionAssembly(context));
    await this.composer.add(createArcadeAssembly(context));
    await this.shell.boot();

    this.installInkstoneStudioSurface();
    this.ready = true;
    this.syncState(this.lastGameState, 'BOOT');
    return this;
  }

  installInkstoneStudioSurface() {
    const studio = this.shell?.studio;
    if (!studio) return;

    studio.dev.registerPanel('Inkstone', {
      description: 'Legacy-authority parity view during the V0.5 Shell migration',
      read: () => ({
        migrationMode: 'shadow-authority',
        gameState: this.lastGameState,
        shellPhase: this.shell.session.phase,
        assemblies: this.composer.listAssemblies(),
        modules: this.composer.modules.list(),
        modes: this.shell.modes.list(),
        snapshot: safeJson(this.snapshot()),
      }),
    });

    studio.dev.register('inkstone.snapshot', {
      description: 'Show the current deterministic/parity snapshot',
      run: () => JSON.stringify(this.paritySnapshot(), null, 2),
    });

    studio.dev.register('inkstone.migration', {
      description: 'Show V0.5 Shell migration ownership status',
      run: () => JSON.stringify({
        mode: 'shadow-authority',
        legacyOwns: ['app-flow', 'gameplay-input', 'fixed-step-sim', 'renderer', 'combat'],
        shellOwns: ['assemblies', 'studio-services', 'telemetry', 'diagnostics'],
        mirrored: ['game-phase', 'run-lifecycle'],
      }, null, 2),
    });

    if (this.dev) {
      this.devConsole = mountBrowserDevConsole(studio.dev, {
        title: 'INKSTONE · SLU STUDIO',
        hotkey: 'F1',
        refreshMs: 500,
      });
    }
  }

  paritySnapshot() {
    const snap = safeJson(this.snapshot()) || {};
    return {
      gameState: this.lastGameState,
      shellPhase: this.shell?.session?.phase || 'unavailable',
      ...snap,
    };
  }

  syncState(next, prev = this.lastGameState) {
    this.lastGameState = next || this.lastGameState;
    if (!this.shell) return;

    const phase = PHASE_BY_STATE[this.lastGameState] || 'menu';
    this.shell.session.setPhase(phase);
    this.shell.studio?.telemetry?.record('inkstone.state', {
      from: prev || null,
      to: this.lastGameState,
      phase,
    });
  }

  runStarted(config = {}) {
    if (!this.shell) return;
    this.shell.studio?.telemetry?.record('inkstone.run.start', safeJson(config) || {});
  }

  runFinished(summary = {}) {
    if (!this.shell) return;
    this.shell.studio?.telemetry?.record('inkstone.run.finish', {
      mode: summary.mode ?? null,
      scroll: summary.scroll ?? null,
      seed: summary.seed ?? null,
      score: summary.score ?? 0,
      wave: summary.wave ?? 0,
      rank: summary.rank?.grade ?? null,
      runHash: summary.runHash ?? null,
    });
  }

  event(name, payload = {}) {
    this.shell?.studio?.telemetry?.record(`inkstone.${name}`, safeJson(payload) || {});
  }

  async dispose() {
    this.devConsole?.dispose();
    this.devConsole = null;
    if (this.shell?.dispose) await this.shell.dispose();
    this.ready = false;
  }
}

export async function createInkstoneShellBridge(options) {
  const bridge = new InkstoneShellBridge(options);
  await bridge.boot();
  return bridge;
}
