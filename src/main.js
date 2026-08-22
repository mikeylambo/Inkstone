/**
 * SUMI — V0.2 Combat Feel.
 *
 * Fixed-timestep sim (60 Hz) decoupled from render, seeded PRNG, hit-stop
 * that freezes the world in whole sim steps.
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
import { Oni } from './entities/oni.js';
import { Hud } from './hud.js';
import { Debug } from './debug.js';

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
World.rng = new Rng(getSeedFromUrl());
World.fx = new Fx(scene, World.rng);
World.camRig = new CameraRig(camera);

const arena = createArena(scene);
World.splatSurfaces = arena.splatSurfaces;

World.player = new Player(scene);
const hud = new Hud();

let respawnTimer = 0;
let spawnTarget = TUNING.spawn.baseCount;

function spawnOni(count = 1) {
  for (let i = 0; i < count; i++) {
    const a = World.rng.range(0, Math.PI * 2);
    const r = TUNING.spawn.ringRadius + World.rng.range(0, TUNING.spawn.ringJitter);
    const e = new Oni(scene, Math.cos(a) * r, Math.sin(a) * r);
    World.enemies.push(e);
  }
}

function killAll() {
  for (const e of World.enemies) if (!e.dead) e.die();
}

function resetArena() {
  for (const e of World.enemies) e.dispose();
  World.enemies.length = 0;
  World.fx.clear();
  World.lockTarget = null;
  World.player.position.set(0, 0, 6);
  World.player.vel.set(0, 0, 0);
  World.player.hp = TUNING.player.maxHp;
  World.player.state = 'free';
  World.reset();
  spawnTarget = TUNING.spawn.baseCount;
  spawnOni(spawnTarget);
}

spawnOni(spawnTarget);

const debug = new Debug(scene, {
  spawn: (n) => { spawnTarget = Math.max(spawnTarget, World.enemies.filter((e) => !e.dead).length + n); spawnOni(n); },
  killAll,
  reset: resetArena,
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
  World.step++;
  World.time += dt;

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

  const alive = World.enemies.filter((e) => !e.dead).length;
  if (alive < spawnTarget) {
    respawnTimer += dt;
    if (respawnTimer >= TUNING.spawn.respawnDelay) {
      respawnTimer = 0;
      spawnOni(1);
    }
  } else {
    respawnTimer = 0;
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

  accumulator += realDt;
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

  hud.update(camera);
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

requestAnimationFrame(frame);

// expose for console poking during tuning sessions and for the headless
// harness used to produce gate evidence in REPORT.md
window.SUMI = {
  World, TUNING, Input, Audio, scene, camera, renderer,
  spawnOni, killAll, resetArena, simStep, STEP,

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
