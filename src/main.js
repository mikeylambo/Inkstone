/**
 * SUMI — entry point.
 *
 * Fixed-timestep sim (60 Hz) decoupled from render, hit-stop that freezes the
 * world in whole sim steps. What state the app is in — title, run, results —
 * belongs to Game (game.js); this file owns the renderer and the loop.
 */
import './style.css';
import * as THREE from 'three';

import { TUNING } from './tuning.js';
import { World } from './world.js';
import { Rng, getSeedFromUrl } from './rng.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Fx } from './gfx/fx.js';
import { createArena } from './gfx/arena.js';
import { CameraRig } from './camera.js';
import { Player } from './entities/player.js';
import { Hud } from './hud.js';
import { Debug } from './debug.js';
import { PauseMenu } from './pause.js';
import { Game, STATE } from './game.js';
import { Profile } from './profile.js';

// Build version, injected from package.json by vite.config.js
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
document.title = `SUMI — V${VERSION}`;
{
  const el = document.getElementById('version');
  if (el) el.textContent = `SUMI · V${VERSION}`;
}

// --------------------------------------------------------------- renderer

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcd3be);
scene.fog = new THREE.FogExp2(0xdcd3be, 0.018);

const camera = new THREE.PerspectiveCamera(
  TUNING.camera.fov, window.innerWidth / window.innerHeight,
  TUNING.camera.near, TUNING.camera.far
);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// ------------------------------------------------------------------ world

World.scene = scene;
World.renderer = renderer;
World.camRig = new CameraRig(camera);

// Bootstrap rng/fx so nothing null-derefs before the first Run installs its
// own. Run.install() replaces both; Run.dispose() tears its own down.
World.rng = new Rng(getSeedFromUrl());
World.fx = new Fx(scene, World.rng);

const arena = createArena(scene);
World.splatSurfaces = arena.splatSurfaces;
World.player = new Player(scene);

const hud = new Hud();
const pauseMenu = new PauseMenu();

const game = new Game({
  scene, player: World.player, camRig: World.camRig,
  pauseMenu, hud, version: VERSION,
});
pauseMenu.game = game;

const debug = new Debug(scene, {
  spawn: (n) => {
    const run = World.run;
    if (!run) return;
    for (let i = 0; i < n; i++) run.spawnRing('oni', TUNING.spawn.ringRadius, TUNING.spawn.ringJitter);
    run.kataTarget = Math.max(run.kataTarget, run.aliveCount());
  },
  killAll: () => { for (const e of World.enemies) if (!e.dead) e.die(); },
  reset: () => game.restart(),
  renderInfo: () => renderer.info.render,
});

Input.init();

// ------------------------------------------------------------------ audio

let audioArmed = false;
function armAudio() {
  if (audioArmed) return;
  audioArmed = true;
  Audio.start();
  const btn = document.getElementById('start-btn');
  if (btn) btn.classList.add('hidden');
}
document.getElementById('start-btn').addEventListener('click', armAudio);
window.addEventListener('pointerdown', armAudio, { once: false });
window.addEventListener('keydown', armAudio, { once: false });

// -------------------------------------------------------------- sim step

const STEP = 1 / TUNING.sim.hz;

function simStep(dt) {
  Input.step(dt);

  World.player.update(dt);
  World.player.validateLock();

  for (const e of World.enemies) e.update(dt, World.player.position);

  // reap fully-faded corpses
  for (let i = World.enemies.length - 1; i >= 0; i--) {
    const e = World.enemies[i];
    if (e.dead && e.deathTimer > TUNING.oni.deathTime + 0.2) {
      e.dispose();
      World.enemies.splice(i, 1);
    }
  }

  World.fx.update(dt);
  World.camRig.update(dt, World.player);

  // stroke counter decay (the real style evaluator is V0.6)
  if (World.combo > 0) {
    World.comboTimer += dt;
    if (World.comboTimer >= TUNING.combo.window) {
      World.combo = 0;
      World.comboTimer = 0;
    }
  }

  // waves, record and score — everything that belongs to the run
  game.simStep(dt);
}

// ----------------------------------------------------------------- loop

let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);

  const frameStart = now;
  let realDt = (now - last) / 1000;
  last = now;
  if (realDt > TUNING.sim.maxFrameDelta) realDt = TUNING.sim.maxFrameDelta;

  if (Input.debugToggleRequested) {
    Input.debugToggleRequested = false;
    debug.toggle();
  }

  Input.poll();

  // Game decides whether the sim advances this frame (RUN only).
  const simRunning = game.update(realDt);

  if (!simRunning) accumulator = 0;
  else accumulator += realDt;

  let steps = 0;
  const maxSteps = TUNING.sim.maxStepsPerFrame;

  while (accumulator >= STEP && steps < maxSteps) {
    if (World.hitStop > 0) {
      // the world is frozen: burn the step, advance nothing but the freeze
      World.hitStop = Math.max(0, World.hitStop - STEP);
    } else {
      simStep(STEP);
    }
    accumulator -= STEP;
    steps++;
  }
  if (steps >= maxSteps) accumulator = 0;    // don't spiral

  const alpha = World.hitStop > 0 ? 1 : accumulator / STEP;

  World.player.applyInterpolation(alpha);
  for (const e of World.enemies) e.applyInterpolation(alpha);
  World.camRig.apply(alpha, now / 1000);

  hud.update(camera, game);
  World.debug.simStepsLastFrame = steps;
  debug.update(STEP, realDt);

  renderer.render(scene, camera);
  World.debug.frameMs = performance.now() - frameStart;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

game.boot();
requestAnimationFrame(frame);

// expose for console poking during tuning sessions and for the headless
// harness used to produce gate evidence in REPORT.md
window.SUMI = {
  VERSION,
  World, TUNING, Input, Audio, scene, camera, renderer,
  game, pauseMenu, hud, Profile, STATE, simStep, STEP,

  /** Dev: bounce every procedural sound to WAV via the local file sink. */
  async exportAudio(sink) {
    const m = await import('./exportaudio.js');
    return m.exportAll(sink);
  },

  /** Drive the sim without the render loop. opts: {move:[x,y], press:[...]} */
  run(steps, opts = {}) {
    for (let i = 0; i < steps; i++) {
      if (opts.move) { Input.move.x = opts.move[0]; Input.move.y = opts.move[1]; }
      if (i === 0 && opts.press) for (const a of opts.press) Input.press(a);
      if (World.hitStop > 0) World.hitStop = Math.max(0, World.hitStop - STEP);
      else simStep(STEP);
    }
  },
};
