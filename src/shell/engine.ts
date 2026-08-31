/**
 * InkstoneEngine — the renderer + fixed-step loop, extracted from the old
 * `main.js` so the SLU shell can own the meta layer around it.
 *
 * This is the Inkstone side of the ThreeAdapter boundary. It deliberately does
 * NOT know about the shell: it builds the Three scene, runs the 60 Hz sim, and
 * drives the existing `Run` object directly. The combat sim, PRNG, RunRecord,
 * canvas and glyph systems are imported untouched — the migration wraps them,
 * it does not rewrite them.
 *
 * Determinism note (gate M1): the per-step call order below is a verbatim port
 * of `main.js`'s `simStep()` + frame loop — Input.step → player → enemies →
 * reap → fx/cam → combo decay → run.update. The sim reads the same World /
 * Input / TUNING singletons in the same order, so the RunRecord hash and the
 * stroke/spawn hashes are byte-preserved. The only thing removed is the old
 * `Game` state machine, whose job the shell's GameFlowController now does.
 */
import * as THREE from "three";

import { TUNING } from "../tuning.js";
import { World as WorldModule } from "../world.js";

// World is a mutable JS singleton whose fields are added across bootstrap and
// Run.install; behind the adapter boundary it is untyped by design.
const World = WorldModule as unknown as Record<string, any>;
import { Rng, getSeedFromUrl } from "../rng.js";
import { Input } from "../input.js";
import { Audio } from "../audio.js";
import { Fx } from "../gfx/fx.js";
import { createArena } from "../gfx/arena.js";
import { InkCanvas } from "../gfx/inkcanvas.js";
import { CameraRig } from "../camera.js";
import { Player } from "../entities/player.js";
import { Hud } from "../hud.js";
import { Run, MODES, dailySeed } from "../run.js";
import { renderPrint } from "../print.js";

/** How the shell asks Inkstone to start a run. */
export interface StartRunRequest {
  /** Inkstone mode id: 'daily' | 'free' | 'kata'. */
  mode: string;
  /** Inkstone difficulty id (scrolls.js): 'standard' by default. */
  difficulty?: string;
  /** Scroll id when a trial variant was chosen, else null. */
  scroll?: string | null;
  /** Explicit seed (Free Seed / replay); otherwise derived from mode. */
  seed?: string;
  scrollLabel?: string;
}

/** The result payload the engine hands back when a run ends. */
export interface RunEnded {
  summary: Record<string, unknown>;
  record: unknown;
  run: InkstoneRunLike;
}

/** The subset of `Run` the shell glue reads. */
interface InkstoneRunLike {
  mode: string;
  day: string;
  over: boolean;
  endReason: string | null;
  pendingChoice: unknown;
  config: { scroll: string | null; difficulty: string; modifiers: unknown[]; scrollLabel?: string };
  record: { hash(): string; spawnHash(): string };
  summary(): Record<string, unknown>;
  install(): unknown;
  dispose(): void;
  abandon(): void;
  applyWaveChoice(offer: unknown): void;
}

type EngineState = "idle" | "running" | "paused" | "over";

export class InkstoneEngine {
  readonly version: string;
  private readonly container: HTMLElement;

  // The Three scene graph lives behind the adapter boundary (untyped JS).
  private scene: any;
  private camera: any;
  private renderer: any;
  private inkCanvas: any;
  private hud: any;

  private run: InkstoneRunLike | null = null;
  private state: EngineState = "idle";
  private started = false;

  private readonly STEP: number;
  private last = 0;
  private accumulator = 0;
  private rafHandle = 0;

  /** Fired exactly once per run when the sim reports death/abandon. */
  onRunEnded: ((ended: RunEnded) => void) | null = null;
  /** Fired when a run parks in a wave-choice (dev-flagged; off by default). */
  onWaveChoice: ((offers: unknown, run: InkstoneRunLike) => void) | null = null;

  constructor(container: HTMLElement, version: string) {
    this.container = container;
    this.version = version;
    this.STEP = 1 / TUNING.sim.hz;
  }

  /** Build the scene graph. Called from the ThreeAdapter `onStart` hook. */
  start(): void {
    if (this.started) return;
    this.started = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdcd3be);
    scene.fog = new THREE.FogExp2(0xdcd3be, 0.018);
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(
      TUNING.camera.fov,
      window.innerWidth / window.innerHeight,
      TUNING.camera.near,
      TUNING.camera.far
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer = renderer;
    this.applyPixelRatio();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);

    // World bootstrap — identical to the old main.js. Run.install() later
    // replaces rng/fx; these keep nothing null-dereferencing before then.
    World.scene = scene;
    World.renderer = renderer;
    World.camRig = new CameraRig(this.camera);
    World.rng = new Rng(getSeedFromUrl());
    World.fx = new Fx(scene, World.rng);

    const arena = createArena(scene);
    World.splatSurfaces = arena.splatSurfaces;
    World.player = new Player(scene);

    this.inkCanvas = new InkCanvas(scene);
    World.inkCanvas = this.inkCanvas;

    this.hud = new Hud();

    Input.init();

    this.last = performance.now();
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  /** Pixel ratio after the player's resolution-scale option (from main.js). */
  private applyPixelRatio(): void {
    const scale = TUNING.frame.resolutionScale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
  }

  resize(): void {
    if (!this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyPixelRatio();
  }

  // --------------------------------------------------------------- run control

  /** Start (or restart) a run. The ThreeAdapter `onLoadLevel` hook calls this. */
  startRun(req: StartRunRequest): void {
    this.endRun();
    const mode: string = (MODES as Record<string, unknown>)[req.mode] ? req.mode : "daily";
    const day: string = new Date().toISOString().slice(0, 10);
    const seed = req.seed || this.seedFor(mode, day);

    const run = new Run({
      mode,
      seed,
      day,
      scene: this.scene,
      player: World.player,
      version: this.version,
      scroll: req.scroll || null,
      difficulty: req.difficulty || TUNING.difficulty.current,
      modifiers: [],
    } as any) as unknown as InkstoneRunLike;
    if (req.scrollLabel) run.config.scrollLabel = req.scrollLabel;
    run.install();

    this.run = run;
    this.state = "running";
    this.accumulator = 0;
    World.paused = false;
  }

  private seedFor(mode: string, day: string): string {
    if (mode === "daily") return dailySeed(day);
    return `${mode}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }

  pause(): void {
    if (this.state !== "running") return;
    this.state = "paused";
    World.paused = true;
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.state = "running";
    World.paused = false;
    this.accumulator = 0;
  }

  /** Abandon and dispose the active run without producing results. */
  endRun(): void {
    if (!this.run) return;
    const run = this.run;
    this.run = null;
    this.state = "idle";
    try { run.dispose(); } catch { /* dispose must never throw upward */ }
  }

  get activeRun(): InkstoneRunLike | null { return this.run; }
  get phase(): EngineState { return this.state; }

  /** Resolve a pending wave choice (dev-flagged path). */
  resolveWaveChoice(offer: unknown): void {
    if (!this.run) return;
    World.paused = false;
    this.run.applyWaveChoice(offer);
    this.state = "running";
    this.accumulator = 0;
  }

  // --------------------------------------------------------------- screenshot

  /** Render the finished-calligraphy print for the last-ended run as a PNG. */
  async screenshot(ended: RunEnded | null): Promise<Blob | null> {
    if (!ended) return null;
    try {
      const canvas: HTMLCanvasElement = renderPrint(ended.record as any, ended.summary, { size: 720 });
      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob: Blob | null) => resolve(blob), "image/png");
      });
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------- main loop

  private frame = (now: number): void => {
    this.rafHandle = requestAnimationFrame(this.frame);
    const frameStart = now;

    let realDt = (now - this.last) / 1000;
    this.last = now;
    if (realDt > TUNING.sim.maxFrameDelta) realDt = TUNING.sim.maxFrameDelta;

    // The debug/pause key routing that main.js did lives in the shell now; the
    // engine only consumes gameplay input while a run is live.
    Input.poll();

    const simRunning = this.state === "running" && !!this.run && !World.paused;
    if (!simRunning) this.accumulator = 0;
    else this.accumulator += realDt;

    let steps = 0;
    const maxSteps = TUNING.sim.maxStepsPerFrame;
    while (this.accumulator >= this.STEP && steps < maxSteps) {
      if (World.hitStop > 0) {
        World.hitStop = Math.max(0, World.hitStop - this.STEP);
      } else {
        this.simStep(this.STEP);
      }
      this.accumulator -= this.STEP;
      steps++;
    }
    if (steps >= maxSteps) this.accumulator = 0;

    const alpha = World.hitStop > 0 ? 1 : this.accumulator / this.STEP;
    World.player.applyInterpolation(alpha);
    for (const e of World.enemies) e.applyInterpolation(alpha);
    if (World.projectiles) for (const p of World.projectiles) p.applyInterpolation(alpha);
    World.camRig.apply(alpha, now / 1000);

    this.inkCanvas.update(World.strokes);
    this.hud.update(this.camera, null);
    World.debug.simStepsLastFrame = steps;

    this.renderer.render(this.scene, this.camera);
    World.debug.frameMs = performance.now() - frameStart;

    // Run-end / wave-choice detection runs after the sim has advanced this
    // frame, mirroring the old Game.simStep() checks.
    this.pollRunState();
  };

  /** One fixed sim step — verbatim order from main.js `simStep()`. */
  private simStep(dt: number): void {
    Input.step(dt);

    World.player.update(dt);
    World.player.validateLock();

    for (const e of World.enemies) e.update(dt, World.player.position);

    for (let i = World.enemies.length - 1; i >= 0; i--) {
      const e = World.enemies[i];
      if (e.dead && e.deathTimer > TUNING.oni.deathTime + 0.2) {
        e.dispose();
        World.enemies.splice(i, 1);
      }
    }

    World.fx.update(dt);
    World.camRig.update(dt, World.player);

    if (World.combo > 0) {
      World.comboTimer += dt;
      if (World.comboTimer >= TUNING.combo.window) {
        World.combo = 0;
        World.comboTimer = 0;
      }
    }

    // waves, record and score — everything that belongs to the run
    const run = this.run;
    if (run) (run as unknown as { update(dt: number): void }).update(dt);
  }

  /** Poll the run for the terminal / choosing states it signals by field. */
  private pollRunState(): void {
    const run = this.run;
    if (!run || this.state !== "running") return;

    if (run.pendingChoice) {
      World.paused = true;
      this.state = "paused";
      this.onWaveChoice?.(run.pendingChoice, run);
      return;
    }

    if (run.over) {
      const summary = run.summary();
      summary.version = this.version;
      const ended: RunEnded = { summary, record: run.record, run };
      this.run = null;
      this.state = "over";
      this.onRunEnded?.(ended);
    }
  }

  /** Trigger the sim's own death path (pause-menu "Abandon"). */
  abandonRun(): void {
    if (!this.run) return;
    this.run.abandon();
    // pollRunState on the next frame will see `over` and fire onRunEnded.
    if (this.state === "paused") { this.state = "running"; World.paused = false; }
  }

  dispose(): void {
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
    this.endRun();
  }
}
