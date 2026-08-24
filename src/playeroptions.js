/**
 * PLAYER OPTIONS — a curated view over tuning.
 *
 * The dev editor exposes all ~500 tuning parameters. That is the right tool
 * for building the game and the wrong one for playing it, so this file names
 * the small set a player should ever see and says, for each, what it means in
 * their words rather than the engine's.
 *
 * The important property: an option never invents state. It reads and writes
 * real tuning paths through an explicit allowlist, so Options and Dev Tuning
 * are two views of one truth. `ALLOWED_PATHS` is derived from the definitions
 * rather than hand-maintained, so it cannot drift.
 *
 * Choices persist (tuning itself does not), and are re-applied on boot.
 */
import { TUNING, TUNING_DEFAULTS, setTuning, getTuning } from './tuning.js';
import { Input, ACTIONS, ACTION_LABELS } from './input.js';
import { KEYS, readJSON, writeJSON } from './storage.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dflt = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), TUNING_DEFAULTS);

/** Percent options render 0–200% but most only make sense at or below 100. */
const pct = (lo, hi) => ({ kind: 'percent', min: lo, max: hi, step: 0.05 });

/**
 * @typedef {Object} OptionDef
 * @property {string} id
 * @property {string} group
 * @property {string} label
 * @property {string} help      shown in the description strip
 * @property {string} kind      toggle | percent | choice | action | bindings
 * @property {string[]} paths   tuning paths this option is allowed to write
 * @property {Function} read    () => current value
 * @property {Function} write   (v) => void
 */

export const OPTION_DEFS = [
  // ------------------------------------------------------------- GAMEPLAY
  {
    id: 'lockMode', group: 'GAMEPLAY', label: 'Lock-on', kind: 'choice',
    choices: [['Toggle', 0], ['Hold', 1]],
    paths: ['controls.lockIsHold'],
    help: 'Toggle presses once to lock and once to release. Hold keeps the lock only while the button is down.',
    read: () => getTuning('controls.lockIsHold'),
    write: (v) => setTuning('controls.lockIsHold', v),
  },
  {
    id: 'lockFace', group: 'GAMEPLAY', label: 'Face target while moving', kind: 'toggle',
    paths: ['controls.lockFaceWhileMoving'],
    help: 'On, you strafe around a locked target. Off, you face wherever the stick points even while locked.',
    read: () => getTuning('controls.lockFaceWhileMoving'),
    write: (v) => setTuning('controls.lockFaceWhileMoving', v),
  },
  {
    id: 'camScheme', group: 'GAMEPLAY', label: 'Movement basis', kind: 'choice',
    choices: [['Camera-relative', 'camera'], ['Character-relative', 'character']],
    paths: ['controls.scheme'],
    help: 'Camera-relative means stick-up is away from the camera. Character-relative means stick-up is the way you are facing.',
    read: () => getTuning('controls.scheme'),
    write: (v) => setTuning('controls.scheme', v),
  },
  {
    id: 'latch', group: 'GAMEPLAY', label: 'Latch movement basis', kind: 'toggle',
    paths: ['controls.latchBasis'],
    help: 'Holds the movement direction steady while the stick is held, so a swinging camera cannot curve a straight run into a spiral. Leave this on unless you know you want it off.',
    read: () => getTuning('controls.latchBasis'),
    write: (v) => setTuning('controls.latchBasis', v),
  },
  {
    id: 'hints', group: 'GAMEPLAY', label: 'Control hints', kind: 'toggle',
    paths: ['frame.hints'],
    help: 'The control list in the corner of the run HUD.',
    read: () => getTuning('frame.hints'),
    write: (v) => setTuning('frame.hints', v),
  },

  // ------------------------------------------------------------- CONTROLS
  {
    id: 'bindings', group: 'CONTROLS', label: 'Button bindings', kind: 'bindings',
    paths: [],
    help: 'Activate a row, then press the key, mouse button or pad button you want on it.',
    read: () => null, write: () => {},
  },
  {
    id: 'deadzone', group: 'CONTROLS', label: 'Stick deadzone', kind: 'percent',
    ...pct(0, 0.6),
    paths: ['controls.deadzone'],
    help: 'How far the stick must move before the game reads it. Raise this if the character drifts when you let go.',
    read: () => getTuning('controls.deadzone'),
    write: (v) => setTuning('controls.deadzone', v),
  },
  {
    id: 'invertX', group: 'CONTROLS', label: 'Invert camera X', kind: 'toggle',
    paths: ['controls.invertX'],
    help: 'Flip left and right on the camera stick.',
    read: () => getTuning('controls.invertX'),
    write: (v) => setTuning('controls.invertX', v),
  },
  {
    id: 'invertY', group: 'CONTROLS', label: 'Invert camera Y', kind: 'toggle',
    paths: ['controls.invertY'],
    help: 'Flip up and down on the camera stick.',
    read: () => getTuning('controls.invertY'),
    write: (v) => setTuning('controls.invertY', v),
  },

  // ---------------------------------------------------------------- AUDIO
  {
    id: 'volMaster', group: 'AUDIO', label: 'Master volume', kind: 'percent',
    ...pct(0, 1),
    paths: ['audio.masterVolume'],
    help: 'Everything at once.',
    read: () => dbToUnit(getTuning('audio.masterVolume')),
    write: (v) => { setTuning('audio.masterVolume', unitToDb(v)); applyAudio(); },
  },
  {
    id: 'volMusic', group: 'AUDIO', label: 'Music volume', kind: 'percent',
    ...pct(0, 1),
    paths: ['audio.musicVolume'],
    help: 'Sets the level for the ambient bed. The bus is wired but nothing is scored to it yet, so this has no audible effect until music ships.',
    read: () => dbToUnit(getTuning('audio.musicVolume')),
    write: (v) => { setTuning('audio.musicVolume', unitToDb(v)); applyAudio(); },
  },
  {
    id: 'volSfx', group: 'AUDIO', label: 'Effects volume', kind: 'percent',
    ...pct(0, 1),
    paths: ['audio.sfxVolume'],
    help: 'Strokes, impacts, parries, enemy tells — every sound the game currently makes.',
    read: () => dbToUnit(getTuning('audio.sfxVolume')),
    write: (v) => { setTuning('audio.sfxVolume', unitToDb(v)); applyAudio(); },
  },

  // --------------------------------------------------------------- VISUAL
  {
    id: 'resolution', group: 'VISUAL', label: 'Resolution scale', kind: 'percent',
    ...pct(0.5, 1),
    paths: ['frame.resolutionScale'],
    help: 'Render below native resolution to buy frame rate. 100% is native.',
    read: () => getTuning('frame.resolutionScale'),
    write: (v) => { setTuning('frame.resolutionScale', v); applyVisual(); },
  },
  {
    id: 'fullscreen', group: 'VISUAL', label: 'Fullscreen', kind: 'action',
    paths: [],
    help: 'Toggle fullscreen. F11 does the same thing.',
    read: () => null,
    write: () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    },
  },
  {
    id: 'inkDensity', group: 'VISUAL', label: 'Ink density', kind: 'percent',
    ...pct(0.25, 1.5),
    paths: ['frame.inkDensity', 'fx.trailLayers', 'fx.trailSamples'],
    help: 'How much ribbon a stroke leaves behind. Lower is cheaper to draw and reads cleaner; higher is wetter and heavier.',
    read: () => getTuning('frame.inkDensity'),
    write: (v) => {
      setTuning('frame.inkDensity', v);
      setTuning('fx.trailLayers', Math.round(clamp(dflt('fx.trailLayers') * v, 1, 8)));
      setTuning('fx.trailSamples', Math.round(clamp(dflt('fx.trailSamples') * v, 16, 400)));
    },
  },

  // -------------------------------------------------------- ACCESSIBILITY
  {
    id: 'shake', group: 'ACCESSIBILITY', label: 'Screen shake', kind: 'percent',
    ...pct(0, 1),
    paths: ['access.shakeScale'],
    help: 'Scales every camera shake in the game. 0% removes it entirely without changing how anything hits.',
    read: () => getTuning('access.shakeScale'),
    write: (v) => setTuning('access.shakeScale', v),
  },
  {
    id: 'hitStop', group: 'ACCESSIBILITY', label: 'Hit-stop', kind: 'percent',
    ...pct(0, 1),
    paths: ['access.hitStopScale'],
    help: 'The freeze on impact. Lowering it makes combat smoother and less punchy. Note: this changes the simulation, so a run at anything other than 100% is not comparable to a leaderboard run.',
    read: () => getTuning('access.hitStopScale'),
    write: (v) => setTuning('access.hitStopScale', v),
  },
  {
    id: 'flash', group: 'ACCESSIBILITY', label: 'Flash reduction', kind: 'percent',
    ...pct(0, 1),
    paths: ['access.flashScale'],
    help: 'Scales the white flash on impact. 0% removes flashing entirely.',
    read: () => getTuning('access.flashScale'),
    write: (v) => setTuning('access.flashScale', v),
  },
  {
    id: 'camMotion', group: 'ACCESSIBILITY', label: 'Camera motion', kind: 'percent',
    ...pct(0, 1),
    paths: ['access.camMotionScale'],
    help: 'Scales the directional kick and zoom punch the camera makes when you connect.',
    read: () => getTuning('access.camMotionScale'),
    write: (v) => setTuning('access.camMotionScale', v),
  },
  {
    id: 'highContrast', group: 'ACCESSIBILITY', label: 'High-contrast tells', kind: 'toggle',
    paths: ['access.highContrast'],
    help: 'Enemy windups switch to a palette that separates on brightness as well as colour, so the tell reads without relying on red.',
    read: () => getTuning('access.highContrast'),
    write: (v) => setTuning('access.highContrast', v),
  },
  {
    id: 'textScale', group: 'ACCESSIBILITY', label: 'Text size', kind: 'percent',
    ...pct(0.8, 1.6),
    paths: ['access.textScale'],
    help: 'Scales every menu and HUD text size.',
    read: () => getTuning('access.textScale'),
    write: (v) => { setTuning('access.textScale', v); applyVisual(); },
  },
  {
    id: 'holdToggle', group: 'ACCESSIBILITY', label: 'Hold actions become toggles', kind: 'toggle',
    paths: ['controls.lockIsHold'],
    help: 'Turns every hold-to-do-something control into a press-once control. Today that is lock-on; anything added later joins it automatically.',
    read: () => (getTuning('controls.lockIsHold') === 0 ? 1 : 0),
    write: (v) => setTuning('controls.lockIsHold', v ? 0 : 1),
  },
];

/** Every tuning path Options is permitted to touch. Derived, never hand-listed. */
export const ALLOWED_PATHS = [...new Set(OPTION_DEFS.flatMap((o) => o.paths))];

/** Options must not be able to reach a path that does not exist. */
export function auditOptions() {
  const bad = ALLOWED_PATHS.filter((p) => getTuning(p) === undefined);
  const dupes = OPTION_DEFS.map((o) => o.id)
    .filter((id, i, a) => a.indexOf(id) !== i);
  return { unresolvedPaths: bad, duplicateIds: dupes, ok: bad.length === 0 && dupes.length === 0 };
}

// ------------------------------------------------------------- conversions

/** Tone works in dBFS; players think in percent. -40 dB reads as silent. */
function dbToUnit(db) {
  if (db == null) return 1;
  if (db <= -40) return 0;
  return clamp(Math.pow(10, db / 40), 0, 1);
}
function unitToDb(u) {
  if (u <= 0.001) return -60;
  return clamp(40 * Math.log10(u), -60, 6);
}

/** Set by main.js — Options must not import the renderer. */
export const Hooks = { onVisual: null, onAudio: null };
function applyVisual() { if (Hooks.onVisual) Hooks.onVisual(); }
function applyAudio() { if (Hooks.onAudio) Hooks.onAudio(); }

// ------------------------------------------------------------- persistence

export const PlayerOptions = {
  /** Write current values of every option to storage. */
  save() {
    const out = {};
    for (const o of OPTION_DEFS) {
      if (o.kind === 'action' || o.kind === 'bindings') continue;
      out[o.id] = o.read();
    }
    writeJSON(KEYS.options, out);
    return out;
  },

  /** Re-apply stored choices over the shipped defaults. Called once, on boot. */
  load() {
    const stored = readJSON(KEYS.options, null);
    if (!stored) { applyVisual(); return null; }
    for (const o of OPTION_DEFS) {
      if (o.kind === 'action' || o.kind === 'bindings') continue;
      const v = stored[o.id];
      if (v === undefined || v === null) continue;
      try { o.write(v); } catch (e) { /* one bad option must not block boot */ }
    }
    applyVisual();
    return stored;
  },

  /** Put every option back to its shipped value. */
  reset() {
    for (const o of OPTION_DEFS) {
      if (o.kind === 'action' || o.kind === 'bindings') continue;
      for (const p of o.paths) {
        const d = dflt(p);
        if (d !== undefined) setTuning(p, d);
      }
    }
    applyVisual();
    applyAudio();
    this.save();
  },
};

// --------------------------------------------------------------- component

/**
 * The options UI. Same idiom as SettingsEditor and TechniqueList: owns its
 * DOM, marks rows `[data-menu-item]` so one MenuNav walks everything, mounts
 * in more than one place (OPTIONS screen and Pause).
 */
export class OptionsEditor {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.rows = [];
    this.bindRows = [];
    this.remapRow = null;
    this.build();
  }

  build() {
    this.root.innerHTML = '';
    this.root.classList.add('opts');
    this.rows = [];
    this.bindRows = [];

    let group = null;
    for (const def of OPTION_DEFS) {
      if (def.group !== group) {
        group = def.group;
        const h = document.createElement('h3');
        h.className = 'opt-group';
        h.textContent = group;
        this.root.appendChild(h);
      }
      if (def.kind === 'bindings') this.bindingsBlock(def);
      else this.row(def);
    }

    const foot = document.createElement('div');
    foot.className = 'opt-foot';
    const reset = document.createElement('button');
    reset.textContent = 'RESET TO DEFAULTS';
    reset.setAttribute('data-menu-item', '');
    reset.tabIndex = 0;
    reset.onclick = () => { PlayerOptions.reset(); this.refresh(); };
    this.attachInfo(reset, 'Put every option on this screen back to its shipped value. Does not touch bindings.');
    foot.appendChild(reset);
    this.root.appendChild(foot);

    this.info = document.createElement('div');
    this.info.className = 'opt-info';
    this.info.textContent = 'D-pad to move, left and right to change, A to activate.';
    this.root.appendChild(this.info);
  }

  attachInfo(el, help) {
    const show = () => { if (this.info) this.info.textContent = help; };
    el.addEventListener('focus', show);
    el.addEventListener('mouseenter', show);
    el.__optHelp = help;
  }

  row(def) {
    const row = document.createElement('div');
    row.className = 'opt-row';
    row.dataset.option = def.id;

    const label = document.createElement('label');
    label.className = 'opt-label';
    label.textContent = def.label;

    const control = document.createElement('div');
    control.className = 'opt-control';

    let input;
    let setter;

    if (def.kind === 'toggle') {
      input = document.createElement('button');
      input.className = 'opt-toggle';
      const paint = () => { input.textContent = def.read() ? 'ON' : 'OFF'; input.dataset.on = def.read() ? '1' : '0'; };
      // Repaint every row, not just this one: more than one option can be a
      // view onto the same tuning path (lock-on hold/toggle appears under both
      // Gameplay and Accessibility), and a stale twin reads as a bug.
      input.onclick = () => { def.write(def.read() ? 0 : 1); PlayerOptions.save(); this.refresh(); };
      setter = paint;
      paint();
    } else if (def.kind === 'choice') {
      input = document.createElement('button');
      input.className = 'opt-choice';
      const paint = () => {
        const cur = def.read();
        const hit = def.choices.find((c) => c[1] === cur);
        input.textContent = hit ? hit[0] : String(cur);
      };
      input.onclick = () => {
        const cur = def.read();
        const i = def.choices.findIndex((c) => c[1] === cur);
        def.write(def.choices[(i + 1) % def.choices.length][1]);
        PlayerOptions.save(); this.refresh();
      };
      setter = paint;
      paint();
    } else if (def.kind === 'percent') {
      input = document.createElement('input');
      input.type = 'range';
      input.min = def.min;
      input.max = def.max;
      input.step = def.step;
      input.value = String(def.read());
      const out = document.createElement('span');
      out.className = 'opt-value';
      const paint = () => {
        input.value = String(def.read());
        out.textContent = `${Math.round(def.read() * 100)}%`;
      };
      input.addEventListener('input', () => {
        const n = parseFloat(input.value);
        if (!Number.isNaN(n)) { def.write(n); out.textContent = `${Math.round(n * 100)}%`; }
      });
      // on commit, not on drag — repainting mid-drag fights the slider
      input.addEventListener('change', () => { PlayerOptions.save(); this.refresh(); });
      setter = paint;
      paint();
      control.appendChild(input);
      control.appendChild(out);
    } else if (def.kind === 'action') {
      input = document.createElement('button');
      input.className = 'opt-action';
      input.textContent = 'TOGGLE';
      input.onclick = () => def.write();
      setter = () => {};
    }

    if (def.kind !== 'percent') control.appendChild(input);

    input.tabIndex = 0;
    input.setAttribute('data-menu-item', '');
    this.attachInfo(input, def.help);
    row.addEventListener('mouseenter', () => { if (this.info) this.info.textContent = def.help; });

    row.append(label, control);
    this.root.appendChild(row);
    this.rows.push({ def, set: setter });
  }

  bindingsBlock(def) {
    const note = document.createElement('div');
    note.className = 'opt-note';
    note.textContent = def.help;
    this.root.appendChild(note);

    for (const action of ACTIONS) {
      const row = document.createElement('div');
      row.className = 'opt-row bindrow';
      row.tabIndex = 0;
      row.setAttribute('data-menu-item', '');
      const a = document.createElement('label');
      a.className = 'opt-label';
      a.textContent = ACTION_LABELS[action] || action;
      const b = document.createElement('span');
      b.className = 'opt-binding';
      b.textContent = Input.describeBinding(action);
      row.append(a, b);
      row.onclick = () => this.beginRemap(action, b);
      this.attachInfo(row, `Rebind ${ACTION_LABELS[action] || action}. Activate, then press the key or button you want.`);
      this.root.appendChild(row);
      this.bindRows.push({ action, b });
    }

    const rb = document.createElement('button');
    rb.textContent = 'RESET BINDINGS';
    rb.tabIndex = 0;
    rb.setAttribute('data-menu-item', '');
    rb.onclick = () => {
      Input.resetBindings();
      for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
    };
    this.attachInfo(rb, 'Restore the default control layout.');
    const wrap = document.createElement('div');
    wrap.className = 'opt-foot';
    wrap.appendChild(rb);
    this.root.appendChild(wrap);
  }

  beginRemap(action, cell) {
    if (this.remapRow) {
      this.remapRow.cell.textContent = Input.describeBinding(this.remapRow.action);
    }
    cell.textContent = 'press a key / button…';
    this.remapRow = { action, cell };
    Input.beginRemap(action, (desc) => {
      cell.textContent = desc;
      this.remapRow = null;
    });
  }

  refresh() {
    for (const r of this.rows) r.set();
    for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
  }
}
