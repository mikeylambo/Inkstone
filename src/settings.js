/**
 * The settings editor: every tuning value, live-editable, plus key/pad
 * rebinding. One implementation, mounted in two places — the debug overlay
 * (`~`) and the pause menu (Esc).
 *
 * Values can be edited as sliders or as plain number fields; the choice is
 * remembered. Sliders need bounds, which come from TUNING_RANGES where a value
 * has a meaningful one and are otherwise inferred from the shipped default.
 */
import { TUNING, TUNING_DEFAULTS, TUNING_RANGES, setTuning, getTuning } from './tuning.js';
import { Input, ACTIONS, ACTION_LABELS } from './input.js';
import { describeTuning, describeSection } from './tuningdocs.js';

const MODE_KEY = 'sumi.editorMode.v1';
export const EDITOR_MODES = ['sliders', 'fields'];

/** Bounds for a slider. Explicit hint first, else derived from the default. */
export function inferRange(path, value) {
  const hint = TUNING_RANGES[path];
  if (hint) return { min: hint[0], max: hint[1], step: hint[2] };

  const shipped = getDefault(path);
  const base = Math.abs(shipped ?? value);
  if (base === 0) return { min: 0, max: 1, step: 0.01 };

  const max = base * 4;
  const min = (shipped ?? value) < 0 ? -max : 0;
  const step = base >= 20 ? 0.5 : base >= 2 ? 0.05 : base >= 0.2 ? 0.005 : 0.001;
  return { min, max, step };
}

function getDefault(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), TUNING_DEFAULTS);
}

export class SettingsEditor {
  /**
   * @param {HTMLElement} root
   * @param {{showBindings?: boolean}} opts
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.showBindings = opts.showBindings !== false;
    this.mode = EDITOR_MODES.includes(localStorage.getItem(MODE_KEY))
      ? localStorage.getItem(MODE_KEY)
      : 'sliders';
    this.filterText = '';
    this.rows = [];
    this.bindRows = [];
    this.navItems = [];
    this.navHold = Object.create(null);
    this.remapRow = null;
    this.build();
  }

  // ------------------------------------------------------------------ build

  build() {
    this.root.innerHTML = '';
    this.rows = [];
    this.bindRows = [];
    this.navItems = [];

    // --- toolbar: edit mode, filter, reset ---
    const bar = document.createElement('div');
    bar.className = 'set-toolbar';

    const modeWrap = document.createElement('div');
    modeWrap.className = 'set-modes';
    for (const m of EDITOR_MODES) {
      const b = document.createElement('button');
      b.textContent = m;
      b.className = m === this.mode ? 'active' : '';
      b.onclick = () => this.setMode(m);
      this.nav(b, `edit mode: ${m}`,
        m === 'sliders'
          ? 'Show each parameter as a slider plus a value box. Easier to feel out a range.'
          : 'Show each parameter as a number box only. Faster for typing exact values.');
      modeWrap.appendChild(b);
    }
    bar.appendChild(modeWrap);

    const filter = document.createElement('input');
    filter.type = 'search';
    filter.placeholder = 'filter parameters…';
    filter.className = 'set-filter';
    filter.value = this.filterText;
    filter.addEventListener('input', () => this.applyFilter(filter.value));
    this.nav(filter, 'filter', 'Type part of a parameter path to narrow the list, e.g. "magnetism" or "hitStop".');
    bar.appendChild(filter);

    const reset = document.createElement('button');
    reset.textContent = 'reset all';
    reset.onclick = () => this.resetTuning();
    this.nav(reset, 'reset all', 'Restore every parameter to its shipped value. Does not touch key bindings.');
    bar.appendChild(reset);

    this.root.appendChild(bar);

    // --- bindings ---
    if (this.showBindings) {
      this.section('bindings — click a row, then press a key or button');
      for (const action of ACTIONS) {
        const row = document.createElement('div');
        row.className = 'row bindrow';
        const a = document.createElement('span');
        a.textContent = ACTION_LABELS[action] || action;
        const b = document.createElement('span');
        b.textContent = Input.describeBinding(action);
        row.append(a, b);
        row.onclick = () => this.beginRemap(action, b);
        this.nav(row, `bind: ${action}`,
          `Rebind ${ACTION_LABELS[action] || action}. Activate, then press the key, mouse button or pad button you want.`);
        this.root.appendChild(row);
        this.bindRows.push({ action, b });
      }
      const rb = document.createElement('button');
      rb.textContent = 'reset bindings';
      rb.onclick = () => {
        Input.resetBindings();
        for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
      };
      this.nav(rb, 'reset bindings', 'Restore the default control layout.');
      const wrap = document.createElement('div');
      wrap.appendChild(rb);
      this.root.appendChild(wrap);
    }

    // --- tuning tree ---
    this.section('parameters');
    for (const key of Object.keys(TUNING)) {
      const det = document.createElement('details');
      const sum = document.createElement('summary');
      sum.textContent = key;
      this.nav(sum, key, describeSection(key));
      det.appendChild(sum);
      this.buildTree(det, TUNING[key], key);
      this.root.appendChild(det);
    }

    // description strip — updates as focus moves, by mouse or by pad
    this.info = document.createElement('div');
    this.info.className = 'set-info';
    this.info.innerHTML = '<span class="set-info-path"></span><span class="set-info-text">'
      + 'Select a parameter to see what it does. D-pad / stick to move, A to activate, '
      + 'left+right to adjust, B or Start to close.</span>';
    this.infoPath = this.info.querySelector('.set-info-path');
    this.infoText = this.info.querySelector('.set-info-text');
    this.root.appendChild(this.info);

    if (this.filterText) this.applyFilter(this.filterText);
  }

  /** Register an element as focusable for pad/keyboard navigation. */
  nav(el, path, text) {
    el.tabIndex = 0;
    // Marked so the screen's MenuNav walks these too. Previously the editor
    // ran its own pad handling and MenuNav could not see into it, so a pad
    // could reach the section headers and nothing below them.
    el.setAttribute('data-menu-item', '');
    if (text) el.title = text;
    // carried on the element so navigation can update the strip directly
    // rather than relying on a focus event, which is not delivered when the
    // window itself is unfocused
    el.__navInfo = { path, text };
    const show = () => this.showInfo(path, text);
    el.addEventListener('focus', show);
    el.addEventListener('mouseenter', show);
    this.navItems.push(el);
    return el;
  }

  /** Focus an element and show its description, without depending on events. */
  focusItem(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    const info = el.__navInfo;
    if (info) this.showInfo(info.path, info.text);
  }

  showInfo(path, text) {
    if (!this.infoPath) return;
    this.infoPath.textContent = path || '';
    this.infoText.textContent = text || '';
  }

  section(title) {
    const h = document.createElement('h2');
    h.textContent = title;
    this.root.appendChild(h);
  }

  buildTree(parent, obj, prefix) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const path = `${prefix}.${k}`;
      if (typeof v === 'number') {
        this.numericRow(parent, k, path, v);
      } else if (typeof v === 'string') {
        this.textRow(parent, k, path, v);
      } else if (v && typeof v === 'object') {
        const det = document.createElement('details');
        const sum = document.createElement('summary');
        sum.textContent = k;
        this.nav(sum, path, describeTuning(path));
        det.appendChild(sum);
        this.buildTree(det, v, path);
        parent.appendChild(det);
      }
    }
  }

  numericRow(parent, key, path, value) {
    const row = document.createElement('div');
    row.className = this.mode === 'sliders' ? 'tune tune-slider' : 'tune';
    row.dataset.path = path;

    const label = document.createElement('label');
    label.textContent = key;
    label.title = path;
    row.appendChild(label);

    const num = document.createElement('input');
    num.type = 'number';
    const r = inferRange(path, value);
    num.step = r.step;
    num.value = String(value);

    let range = null;
    if (this.mode === 'sliders') {
      range = document.createElement('input');
      range.type = 'range';
      range.min = r.min;
      range.max = r.max;
      range.step = r.step;
      range.value = String(value);
      range.addEventListener('input', () => {
        const n = parseFloat(range.value);
        if (!Number.isNaN(n)) { setTuning(path, n); num.value = String(n); }
      });
      row.appendChild(range);
    }

    num.addEventListener('change', () => {
      const n = parseFloat(num.value);
      if (Number.isNaN(n)) return;
      setTuning(path, n);
      if (range) {
        // a typed value may sit outside the inferred slider bounds; widen them
        if (n < +range.min) range.min = n;
        if (n > +range.max) range.max = n;
        range.value = String(n);
      }
    });
    row.appendChild(num);

    const doc = describeTuning(path);
    label.title = `${path}

${doc}`;
    const focusTarget = range || num;
    this.nav(focusTarget, path, doc);
    row.addEventListener('mouseenter', () => this.showInfo(path, doc));

    parent.appendChild(row);
    this.rows.push({
      path, row, range, num,
      step: r.step,
      set: (v) => {
        num.value = String(v);
        if (range) range.value = String(v);
      },
    });
  }

  textRow(parent, key, path, value) {
    const row = document.createElement('div');
    row.className = 'tune';
    row.dataset.path = path;
    const label = document.createElement('label');
    label.textContent = key;
    label.title = path;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('change', () => setTuning(path, input.value.trim()));
    const doc = describeTuning(path);
    label.title = `${path}

${doc}`;
    this.nav(input, path, doc);
    row.addEventListener('mouseenter', () => this.showInfo(path, doc));
    row.append(label, input);
    parent.appendChild(row);
    this.rows.push({ path, row, set: (v) => { input.value = String(v); } });
  }

  // ---------------------------------------------------------------- actions

  setMode(mode) {
    if (!EDITOR_MODES.includes(mode) || mode === this.mode) return;
    this.mode = mode;
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* ignore */ }
    this.build();
  }

  beginRemap(action, cell) {
    if (this.remapRow) {
      this.remapRow.cell.textContent = Input.describeBinding(this.remapRow.action);
    }
    cell.textContent = 'press a key / button…  (Esc cancels)';
    this.remapRow = { action, cell };
    Input.beginRemap(action, (desc) => {
      cell.textContent = desc;
      this.remapRow = null;
    });
  }

  applyFilter(text) {
    this.filterText = text;
    const q = text.trim().toLowerCase();
    for (const r of this.rows) {
      const hit = !q || r.path.toLowerCase().includes(q);
      r.row.style.display = hit ? '' : 'none';
    }
    // open every group while filtering so matches are reachable
    for (const det of this.root.querySelectorAll('details')) {
      if (q) {
        det.open = !!det.querySelector('.tune:not([style*="display: none"])');
      } else {
        det.open = false;
      }
    }
  }

  resetTuning() {
    const walk = (src, prefix) => {
      for (const k of Object.keys(src)) {
        const v = src[k];
        const path = `${prefix}.${k}`;
        if (typeof v === 'number' || typeof v === 'string') setTuning(path, v);
        else if (v && typeof v === 'object') walk(v, path);
      }
    };
    for (const key of Object.keys(TUNING_DEFAULTS)) walk(TUNING_DEFAULTS[key], key);
    this.refresh();
  }

  // ------------------------------------------------------------ pad navigation

  /** Currently focusable items, skipping anything collapsed or filtered out. */
  visibleNavItems() {
    return this.navItems.filter((el) => el.offsetParent !== null);
  }

  focusIndex(items) {
    const i = items.indexOf(document.activeElement);
    return i;
  }

  navMove(delta) {
    const items = this.visibleNavItems();
    if (!items.length) return;
    let i = this.focusIndex(items);
    i = i < 0 ? (delta > 0 ? 0 : items.length - 1) : i + delta;
    i = Math.max(0, Math.min(items.length - 1, i));
    const el = items[i];
    this.focusItem(el);
    el.scrollIntoView({ block: 'nearest' });
  }

  /** Left/right on a focused parameter nudges its value. */
  navAdjust(dir, coarse) {
    const el = document.activeElement;
    const row = this.rows.find((r) => r.range === el || r.num === el);
    if (!row) return false;
    const target = row.range || row.num;
    const step = (row.step || 0.01) * (coarse ? TUNING.ui.sliderCoarseMul : 1);
    const next = (parseFloat(target.value) || 0) + step * dir;
    target.value = String(+next.toFixed(6));
    target.dispatchEvent(new Event(row.range ? 'input' : 'change'));
    if (row.range) { row.num.value = target.value; }
    else if (row.range === undefined && row.num) { setTuning(row.path, parseFloat(target.value)); }
    return true;
  }

  navActivate() {
    const el = document.activeElement;
    if (!el) return;
    if (el.tagName === 'SUMMARY') { el.parentElement.open = !el.parentElement.open; return; }
    if (el.classList && el.classList.contains('bindrow')) { el.click(); return; }
    if (el.tagName === 'BUTTON') { el.click(); return; }
  }

  /**
   * Drive the menu from a gamepad. Called once per rendered frame while the
   * pause menu is open. Level-triggered with our own repeat timing, so a held
   * direction scrolls rather than firing once.
   */
  handleGamepad(dt) {
    const pad = Input.readNavPad();
    if (!pad) return null;
    const U = TUNING.ui;

    const edge = (name, down) => {
      const prev = this.navHold[name] || 0;
      if (!down) { this.navHold[name] = 0; return false; }
      if (prev === 0) { this.navHold[name] = U.navRepeatDelay; return true; }
      const next = prev - dt;
      if (next <= 0) { this.navHold[name] = U.navRepeatRate; return true; }
      this.navHold[name] = next;
      return false;
    };

    if (edge('up', pad.up)) this.navMove(-1);
    if (edge('down', pad.down)) this.navMove(1);
    if (edge('left', pad.left)) this.navAdjust(-1, pad.coarse);
    if (edge('right', pad.right)) this.navAdjust(1, pad.coarse);
    // accept/cancel fire once per press, never on repeat
    if (edge('accept', pad.accept) && this.navHold.accept === U.navRepeatDelay) this.navActivate();
    if (pad.cancel && !this.prevCancel) { this.prevCancel = true; return 'close'; }
    if (!pad.cancel) this.prevCancel = false;
    return null;
  }

  /** Put focus somewhere sensible when the menu opens. */
  focusFirst() {
    const items = this.visibleNavItems();
    if (items.length) this.focusItem(items[0]);
  }

  /** Re-read every control from TUNING (values may have changed elsewhere). */
  refresh() {
    for (const r of this.rows) {
      const v = getTuning(r.path);
      if (v !== undefined) r.set(v);
    }
    for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
  }
}
