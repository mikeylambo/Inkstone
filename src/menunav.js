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
    if (!el) return;
    if (el.tagName === 'SUMMARY') {
      // A toggles a parameter group open or shut
      el.parentElement.open = !el.parentElement.open;
      return;
    }
    el.click();
  }

  /**
   * Left/right on the focused item. Sliders and number fields nudge; a
   * collapsed group opens. This is what makes the parameter tree usable on a
   * pad rather than merely reachable.
   */
  adjust(dir, coarse) {
    const el = document.activeElement;
    if (!el) return false;

    if (el.tagName === 'SUMMARY') {
      el.parentElement.open = dir > 0;
      return true;
    }
    if (el.tagName === 'INPUT' && (el.type === 'range' || el.type === 'number')) {
      const step = (parseFloat(el.step) || 0.01) * (coarse ? TUNING.ui.sliderCoarseMul : 1);
      const next = (parseFloat(el.value) || 0) + step * dir;
      el.value = String(+next.toFixed(6));
      el.dispatchEvent(new Event(el.type === 'range' ? 'input' : 'change', { bubbles: true }));
      return true;
    }
    return false;
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
    if (rep('left', pad.left)) this.adjust(-1, pad.coarse);
    if (rep('right', pad.right)) this.adjust(1, pad.coarse);

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
      case 'ArrowLeft': return this.adjust(-1, e.shiftKey);
      case 'ArrowRight': return this.adjust(1, e.shiftKey);
      case 'Enter': case 'Space': this.activate(); return true;
      case 'Escape': if (this.onBack) { this.onBack(); return true; } return false;
      default: return false;
    }
  }
}
