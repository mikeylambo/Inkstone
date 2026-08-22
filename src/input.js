/**
 * Input — keyboard + mouse + gamepad (Xbox layout) from day one.
 * Actions are buffered so combo chaining feels responsive; the sim
 * consumes them on fixed steps.
 */
import { TUNING } from './tuning.js';

export const ACTIONS = ['light', 'launcher', 'heavy', 'dash', 'parry', 'lock'];

const KEYMAP = {
  KeyJ: 'light',
  KeyK: 'launcher',
  KeyL: 'heavy',
  Space: 'dash',
  ShiftLeft: 'parry',
  ShiftRight: 'parry',
  KeyF: 'parry',
  KeyQ: 'lock',
  Tab: 'lock',
};

const MOUSEMAP = { 0: 'light', 2: 'launcher', 1: 'heavy' };

// Xbox / standard gamepad
const PADMAP = {
  0: 'dash',      // A
  1: 'parry',     // B
  2: 'light',     // X
  3: 'launcher',  // Y
  4: 'lock',      // LB
  5: 'lock',      // RB
  6: 'parry',     // LT
  7: 'heavy',     // RT
};

class InputSystem {
  constructor() {
    this.keys = Object.create(null);
    this.buffer = Object.create(null);   // action -> remaining buffer seconds
    this.held = Object.create(null);     // action -> bool
    this.move = { x: 0, y: 0 };
    this.padIndex = -1;
    this.padConnected = false;
    this.prevPadButtons = [];
    this.debugToggleRequested = false;
    this.usingPad = false;
    for (const a of ACTIONS) { this.buffer[a] = 0; this.held[a] = false; }
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Backquote') { this.debugToggleRequested = true; return; }
      if (e.repeat) return;
      this.keys[e.code] = true;
      const a = KEYMAP[e.code];
      if (a) { this.press(a); this.usingPad = false; }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      const a = KEYMAP[e.code];
      if (a) this.releaseCheck(a);
    });
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest && e.target.closest('#debug-panel, #start-btn')) return;
      const a = MOUSEMAP[e.button];
      if (a) { this.press(a); this.usingPad = false; }
    });
    window.addEventListener('mouseup', (e) => {
      const a = MOUSEMAP[e.button];
      if (a) this.releaseCheck(a);
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      for (const a of ACTIONS) { this.held[a] = false; this.buffer[a] = 0; }
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

  press(action) {
    this.buffer[action] = TUNING.combo.inputBuffer;
    this.held[action] = true;
  }

  releaseCheck(action) {
    // only release if no other source still holds it
    this.held[action] = false;
  }

  /** Called once per rendered frame, before sim steps. */
  poll() {
    // --- keyboard move ---
    let kx = 0, ky = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) ky -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) ky += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) kx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) kx += 1;
    const klen = Math.hypot(kx, ky);
    if (klen > 0) { kx /= klen; ky /= klen; }

    // --- gamepad ---
    let px = 0, py = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = this.padIndex >= 0 ? pads[this.padIndex] : (pads && pads[0]);
    if (pad && pad.connected) {
      this.padConnected = true;
      if (this.padIndex < 0) this.padIndex = pad.index;
      const dz = 0.22;
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      const mag = Math.hypot(ax, ay);
      if (mag > dz) {
        const scaled = (mag - dz) / (1 - dz);
        px = (ax / mag) * scaled;
        py = (ay / mag) * scaled;
        this.usingPad = true;
      }
      for (const idxStr of Object.keys(PADMAP)) {
        const i = +idxStr;
        const btn = pad.buttons[i];
        if (!btn) continue;
        const down = btn.pressed || btn.value > 0.5;
        const was = this.prevPadButtons[i] || false;
        if (down && !was) { this.press(PADMAP[i]); this.usingPad = true; }
        if (!down && was) this.releaseCheck(PADMAP[i]);
        this.prevPadButtons[i] = down;
      }
    }

    if (Math.hypot(px, py) > 0.01) { this.move.x = px; this.move.y = py; }
    else { this.move.x = kx; this.move.y = ky; }
  }

  /** Sim-step buffer decay. Deterministic on fixed dt. */
  step(dt) {
    for (const a of ACTIONS) {
      if (this.buffer[a] > 0) this.buffer[a] = Math.max(0, this.buffer[a] - dt);
    }
  }

  /** True once, then clears the buffer. */
  consume(action) {
    if (this.buffer[action] > 0) { this.buffer[action] = 0; return true; }
    return false;
  }

  peek(action) { return this.buffer[action] > 0; }
  isHeld(action) { return !!this.held[action]; }

  clearAll() { for (const a of ACTIONS) this.buffer[a] = 0; }
}

export const Input = new InputSystem();
