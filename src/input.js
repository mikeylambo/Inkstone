/**
 * Input — keyboard + mouse + gamepad (Xbox layout), fully remappable.
 *
 * Two things matter for feel here:
 *  1. Actions are buffered (TUNING.combo.inputBuffer) so chaining is forgiving.
 *  2. Every press records a timestamp. The sim uses it to start an attack with
 *     up to one step of catch-up already elapsed, so a press landing just after
 *     a sim step doesn't cost a whole frame of dead time (gate F1).
 */
import { TUNING } from './tuning.js';

export const ACTIONS = ['light', 'launcher', 'heavy', 'dash', 'parry', 'lock', 'jump'];

export const ACTION_LABELS = {
  light: 'Light',
  launcher: 'Launcher',
  heavy: 'Heavy / Dive',
  jump: 'Jump',
  dash: 'Dash',
  parry: 'Parry',
  lock: 'Lock-on',
};

/** Xbox / standard gamepad button indices, for the remap UI. */
export const PAD_NAMES = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'Back', 9: 'Start', 10: 'LS', 11: 'RS',
  12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right',
};

const MOUSE_NAMES = { 0: 'Mouse L', 1: 'Mouse M', 2: 'Mouse R' };

/** E4 default layout. */
export const DEFAULT_BINDINGS = {
  light: { keys: ['KeyJ'], mouse: [0], pad: [2] },        // X
  launcher: { keys: ['KeyK'], mouse: [2], pad: [3] },     // Y
  heavy: { keys: ['KeyL'], mouse: [1], pad: [1] },        // B
  jump: { keys: ['Space'], mouse: [], pad: [0] },         // A
  dash: { keys: ['ShiftLeft', 'ShiftRight'], mouse: [], pad: [7] },  // RT
  parry: { keys: ['KeyF'], mouse: [], pad: [4] },         // LB
  lock: { keys: ['KeyQ', 'Tab'], mouse: [], pad: [5] },   // RB
};

const STORAGE_KEY = 'sumi.bindings.v1';

/** Is this event target a field the user is typing into? */
function isEditable(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
}

function cloneBindings(b) {
  const out = {};
  for (const a of ACTIONS) {
    const src = b[a] || { keys: [], mouse: [], pad: [] };
    out[a] = {
      keys: [...(src.keys || [])],
      mouse: [...(src.mouse || [])],
      pad: [...(src.pad || [])],
    };
  }
  return out;
}

class InputSystem {
  constructor() {
    this.keys = Object.create(null);
    this.buffer = Object.create(null);   // action -> remaining buffer seconds
    this.pressAt = Object.create(null);  // action -> ms timestamp of the press
    this.held = Object.create(null);
    this.heldBy = Object.create(null);   // action -> Set of sources holding it
    this.move = { x: 0, y: 0 };
    this.camNudge = 0;
    this.padIndex = -1;
    this.padConnected = false;
    this.prevPadButtons = [];
    this.debugToggleRequested = false;
    this.pauseToggleRequested = false;
    this.usingPad = false;
    this.remapPending = null;            // {action, done(desc)}

    this.bindings = cloneBindings(DEFAULT_BINDINGS);
    this.loadBindings();
    this.rebuildLookup();

    for (const a of ACTIONS) {
      this.buffer[a] = 0;
      this.held[a] = false;
      this.heldBy[a] = new Set();
    }
  }

  // ------------------------------------------------------------- bindings

  rebuildLookup() {
    this.keyMap = Object.create(null);
    this.mouseMap = Object.create(null);
    this.padMap = Object.create(null);
    for (const a of ACTIONS) {
      const b = this.bindings[a];
      if (!b) continue;
      for (const k of b.keys) this.keyMap[k] = a;
      for (const m of b.mouse) this.mouseMap[m] = a;
      for (const p of b.pad) this.padMap[p] = a;
    }
  }

  loadBindings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const merged = cloneBindings(DEFAULT_BINDINGS);
      for (const a of ACTIONS) {
        if (!parsed[a]) continue;
        if (Array.isArray(parsed[a].keys)) merged[a].keys = parsed[a].keys.slice(0, 4);
        if (Array.isArray(parsed[a].mouse)) merged[a].mouse = parsed[a].mouse.slice(0, 3);
        if (Array.isArray(parsed[a].pad)) merged[a].pad = parsed[a].pad.slice(0, 4);
      }
      this.bindings = merged;
    } catch (e) {
      // corrupt or unavailable storage: fall back to defaults, never block boot
    }
  }

  saveBindings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings)); } catch (e) { /* ignore */ }
  }

  resetBindings() {
    this.bindings = cloneBindings(DEFAULT_BINDINGS);
    this.rebuildLookup();
    this.saveBindings();
  }

  /** Human-readable binding list for the remap UI. */
  describeBinding(action) {
    const b = this.bindings[action];
    if (!b) return '—';
    const parts = [
      ...b.keys.map((k) => k.replace(/^Key|^Digit/, '')),
      ...b.mouse.map((m) => MOUSE_NAMES[m] || `M${m}`),
      ...b.pad.map((p) => PAD_NAMES[p] || `Pad${p}`),
    ];
    return parts.length ? parts.join(' · ') : '—';
  }

  /** Next key / mouse / pad press is assigned to `action` as its primary. */
  beginRemap(action, done) {
    this.remapPending = { action, done };
  }

  cancelRemap() { this.remapPending = null; }

  applyRemap(kind, code) {
    const p = this.remapPending;
    if (!p) return false;
    this.remapPending = null;
    // strip this input off any other action so bindings stay unambiguous
    for (const a of ACTIONS) {
      const b = this.bindings[a];
      b[kind] = b[kind].filter((v) => v !== code);
    }
    this.bindings[p.action][kind] = [code, ...this.bindings[p.action][kind]].slice(0, 3);
    this.rebuildLookup();
    this.saveBindings();
    if (p.done) p.done(this.describeBinding(p.action));
    return true;
  }

  // ---------------------------------------------------------------- events

  init() {
    window.addEventListener('keydown', (e) => {
      // Typing in the settings filter / a number field must not drive the game:
      // no buffered attacks, no debug toggle from a literal backtick, and Tab
      // still moves focus between fields.
      if (isEditable(e.target)) {
        if (e.code === 'Escape') e.target.blur();
        return;
      }
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Backquote') { this.debugToggleRequested = true; return; }
      if (e.repeat) return;
      if (this.remapPending) {
        if (e.code === 'Escape') { this.cancelRemap(); return; }
        e.preventDefault();
        this.applyRemap('keys', e.code);
        return;
      }
      // Escape pauses (only once a pending remap has had its chance above)
      if (e.code === 'Escape') { this.pauseToggleRequested = true; return; }
      this.keys[e.code] = true;
      const a = this.keyMap[e.code];
      if (a) { this.press(a, e.timeStamp, `k:${e.code}`); this.usingPad = false; }
    });

    window.addEventListener('keyup', (e) => {
      if (isEditable(e.target)) return;
      this.keys[e.code] = false;
      const a = this.keyMap[e.code];
      if (a) this.release(a, `k:${e.code}`);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest && e.target.closest('#debug-panel, #pause-menu, #start-btn')) return;
      if (this.remapPending) { this.applyRemap('mouse', e.button); return; }
      const a = this.mouseMap[e.button];
      if (a) { this.press(a, e.timeStamp, `m:${e.button}`); this.usingPad = false; }
    });

    window.addEventListener('mouseup', (e) => {
      const a = this.mouseMap[e.button];
      if (a) this.release(a, `m:${e.button}`);
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      for (const a of ACTIONS) {
        this.held[a] = false;
        this.heldBy[a].clear();
        this.buffer[a] = 0;
      }
    });

    window.addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
      this.padConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.padConnected = false;
      this.padIndex = -1;
    });
  }

  /**
   * @param {string} action
   * @param {number|null} atMs  press timestamp. Omitted by the scripted test
   *                            harness, which must stay deterministic.
   */
  press(action, atMs = null, source = null) {
    this.buffer[action] = TUNING.combo.inputBuffer;
    this.pressAt[action] = atMs;
    if (source) this.heldBy[action].add(source);
    this.held[action] = true;
  }

  release(action, source = null) {
    if (source) this.heldBy[action].delete(source);
    if (!source || this.heldBy[action].size === 0) this.held[action] = false;
  }

  // ------------------------------------------------------------------ poll

  poll() {
    const C = TUNING.controls;

    let kx = 0, ky = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) ky -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) ky += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) kx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) kx += 1;
    const klen = Math.hypot(kx, ky);
    if (klen > 0) { kx /= klen; ky /= klen; }

    let px = 0, py = 0;
    this.camNudge = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = this.padIndex >= 0 ? pads[this.padIndex] : (pads && pads[0]);
    if (pad && pad.connected) {
      this.padConnected = true;
      if (this.padIndex < 0) this.padIndex = pad.index;

      const dz = C.deadzone;
      const outer = C.outerDeadzone;
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      const mag = Math.hypot(ax, ay);
      if (mag > dz) {
        // rescale past the deadzone and saturate before the physical limit,
        // so full tilt reliably reads as full tilt
        const scaled = Math.min(1, (mag - dz) / Math.max(1e-4, outer - dz));
        px = (ax / mag) * scaled;
        py = (ay / mag) * scaled;
        this.usingPad = true;
      }

      // right stick: free-camera yaw nudge only
      const rx = pad.axes[2] || 0;
      if (Math.abs(rx) > dz) this.camNudge = (rx - Math.sign(rx) * dz) / (1 - dz);

      for (const idxStr of Object.keys(this.padMap)) {
        const i = +idxStr;
        const btn = pad.buttons[i];
        if (!btn) continue;
        const down = btn.pressed || btn.value > 0.5;
        const was = this.prevPadButtons[i] || false;
        if (down && !was) {
          if (this.remapPending) { this.applyRemap('pad', i); }
          else { this.press(this.padMap[i], performance.now(), `p:${i}`); this.usingPad = true; }
        }
        if (!down && was) this.release(this.padMap[i], `p:${i}`);
        this.prevPadButtons[i] = down;
      }
      // let the remap UI capture buttons that aren't bound to anything yet
      if (this.remapPending) {
        for (let i = 0; i < pad.buttons.length; i++) {
          if (this.padMap[i] !== undefined) continue;
          const down = pad.buttons[i].pressed;
          const was = this.prevPadButtons[i] || false;
          if (down && !was) this.applyRemap('pad', i);
          this.prevPadButtons[i] = down;
        }
      }
    }

    if (Math.hypot(px, py) > 0.01) { this.move.x = px; this.move.y = py; }
    else { this.move.x = kx; this.move.y = ky; }

    if (C.invertX) this.move.x = -this.move.x;
    if (C.invertY) this.move.y = -this.move.y;
  }

  step(dt) {
    for (const a of ACTIONS) {
      if (this.buffer[a] > 0) this.buffer[a] = Math.max(0, this.buffer[a] - dt);
    }
  }

  consume(action) {
    if (this.buffer[action] > 0) {
      this.buffer[action] = 0;
      this.pressAt[action] = null;
      return true;
    }
    return false;
  }

  /**
   * Consume and report how long ago the press physically happened, clamped to
   * one sim step. The attack starts with that much time already elapsed.
   * Returns 0 when no timestamp was recorded (scripted/deterministic path).
   */
  consumeWithCatchUp(action, maxSeconds) {
    if (this.buffer[action] <= 0) return -1;
    const at = this.pressAt[action];
    this.buffer[action] = 0;
    this.pressAt[action] = null;
    if (at == null) return 0;
    const age = (performance.now() - at) / 1000;
    if (!(age >= 0)) return 0;
    return Math.min(age, maxSeconds);
  }

  peek(action) { return this.buffer[action] > 0; }
  isHeld(action) { return !!this.held[action]; }
  clearAll() { for (const a of ACTIONS) this.buffer[a] = 0; }
}

export const Input = new InputSystem();
