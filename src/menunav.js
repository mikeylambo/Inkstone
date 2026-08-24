/**
 * Menu navigation for the shell screens.
 *
 * Gate S2 says the whole loop must be drivable on a pad without touching
 * keyboard or mouse, so every screen routes through here. Keyboard and mouse
 * still work; they are just not the only path.
 */
import { TUNING } from './tuning.js';
import { Input } from './input.js';

export class MenuNav {
  /**
   * @param {HTMLElement} root  container holding elements marked [data-menu-item]
   * @param {{onBack?: Function}} opts
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.onBack = opts.onBack || null;
    this.index = 0;
    this.hold = Object.create(null);
    this.prevAccept = false;
    this.prevCancel = false;
    this.active = false;
  }

  items() {
    return [...this.root.querySelectorAll('[data-menu-item]')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
  }

  enter() {
    this.active = true;
    this.index = 0;
    // swallow whatever was held when the screen opened, so the button that
    // got us here doesn't immediately activate something
    this.prevAccept = true;
    this.prevCancel = true;
    this.hold = Object.create(null);
    this.focus(0);
  }

  exit() { this.active = false; }

  focus(i) {
    const items = this.items();
    if (!items.length) return;
    this.index = ((i % items.length) + items.length) % items.length;
    const el = items[this.index];
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
  }

  move(delta) { this.focus(this.index + delta); }

  activate() {
    const items = this.items();
    const el = items[this.index];
    if (el) el.click();
  }

  /** Called once per rendered frame while this screen is up. */
  update(dt) {
    if (!this.active) return;
    const pad = Input.readNavPad();
    if (!pad) return;
    const U = TUNING.ui;

    const rep = (name, down) => {
      const prev = this.hold[name] || 0;
      if (!down) { this.hold[name] = 0; return false; }
      if (prev === 0) { this.hold[name] = U.navRepeatDelay; return true; }
      const next = prev - dt;
      if (next <= 0) { this.hold[name] = U.navRepeatRate; return true; }
      this.hold[name] = next;
      return false;
    };

    if (rep('up', pad.up)) this.move(-1);
    if (rep('down', pad.down)) this.move(1);

    // edge-triggered so a held button cannot fire twice
    if (pad.accept && !this.prevAccept) this.activate();
    this.prevAccept = pad.accept;

    if (pad.cancel && !this.prevCancel && this.onBack) this.onBack();
    this.prevCancel = pad.cancel;
  }

  /** Arrow keys / Enter / Escape, for parity with the pad. */
  handleKey(e) {
    if (!this.active) return false;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': this.move(-1); return true;
      case 'ArrowDown': case 'KeyS': this.move(1); return true;
      case 'Enter': case 'Space': this.activate(); return true;
      case 'Escape': if (this.onBack) { this.onBack(); return true; } return false;
      default: return false;
    }
  }
}
