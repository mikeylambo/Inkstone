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
    this.remapRow = null;
    this.build();
  }

  // ------------------------------------------------------------------ build

  build() {
    this.root.innerHTML = '';
    this.rows = [];
    this.bindRows = [];

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
      modeWrap.appendChild(b);
    }
    bar.appendChild(modeWrap);

    const filter = document.createElement('input');
    filter.type = 'search';
    filter.placeholder = 'filter parameters…';
    filter.className = 'set-filter';
    filter.value = this.filterText;
    filter.addEventListener('input', () => this.applyFilter(filter.value));
    bar.appendChild(filter);

    const reset = document.createElement('button');
    reset.textContent = 'reset all';
    reset.onclick = () => this.resetTuning();
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
        this.root.appendChild(row);
        this.bindRows.push({ action, b });
      }
      const rb = document.createElement('button');
      rb.textContent = 'reset bindings';
      rb.onclick = () => {
        Input.resetBindings();
        for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
      };
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
      det.appendChild(sum);
      this.buildTree(det, TUNING[key], key);
      this.root.appendChild(det);
    }

    if (this.filterText) this.applyFilter(this.filterText);
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

    parent.appendChild(row);
    this.rows.push({
      path, row,
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

  /** Re-read every control from TUNING (values may have changed elsewhere). */
  refresh() {
    for (const r of this.rows) {
      const v = getTuning(r.path);
      if (v !== undefined) r.set(v);
    }
    for (const r of this.bindRows) r.b.textContent = Input.describeBinding(r.action);
  }
}
