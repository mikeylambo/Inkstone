/**
 * Shared mutable world context. Kept deliberately small — it exists so the
 * combat systems don't have to thread six arguments through every call.
 */
import { TUNING } from './tuning.js';

export const World = {
  /**
   * The run currently in progress, or null outside RUN. Combat systems fire
   * events at it null-safely; it owns rng/fx/enemies/score/record and swaps
   * wholesale between runs. See run.js.
   */
  run: null,

  scene: null,
  renderer: null,
  camRig: null,
  rng: null,
  fx: null,
  player: null,
  enemies: [],
  splatSurfaces: [],

  // sim clock
  time: 0,
  step: 0,
  hitStop: 0,

  // combo bookkeeping (V0.2 uses a plain stroke counter — the style
  // evaluator is V0.6 and is deliberately not built yet)
  combo: 0,
  comboTimer: 0,
  totalHits: 0,

  lockTarget: null,
  paused: false,

  // debug instrumentation, surfaced by the overlay
  debug: {
    show: false,
    showHitboxes: false,
    lastAttackDisplacement: 0,
    lastAttackKey: '—',
    lastHitStop: 0,
    lastReaction: '—',
    stepInThisAttack: 0,
    fps: 0,
    simStepsLastFrame: 0,
    frameMs: 0,
  },

  requestHitStop(t) {
    // Single chokepoint for every freeze in the game, which is why the
    // accessibility scalar is applied here and nowhere else. It is 1.0 by
    // default, so combat is untouched until a player asks for it.
    const scaled = t * TUNING.access.hitStopScale;
    if (scaled > this.hitStop) this.hitStop = scaled;
    this.debug.lastHitStop = scaled;
  },

  addCombo(n = 1) {
    this.combo += n;
    this.totalHits += n;
    this.comboTimer = 0;
  },

  banner(text) {
    const el = document.getElementById('hit-banner');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  },

  reset() {
    this.time = 0; this.step = 0; this.hitStop = 0;
    this.combo = 0; this.comboTimer = 0; this.totalHits = 0;
    this.lockTarget = null;
  },
};
