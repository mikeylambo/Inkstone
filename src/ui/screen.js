/**
 * Shared screen scaffolding.
 *
 * Every shell screen is a root element plus exactly one MenuNav over it. That
 * "exactly one" is load-bearing: the V0.2.5 pad bugs all came from two
 * navigation systems fighting over the same focus, so components mounted
 * inside a screen mark their rows `[data-menu-item]` and let the screen's nav
 * walk them rather than running their own.
 */
import { MenuNav } from '../menunav.js';

export const $ = (id) => document.getElementById(id);

/** A menu button in the house idiom. */
export function button(label, onClick, opts = {}) {
  const b = document.createElement('button');
  b.className = `menu-btn ${opts.className || ''}`.trim();
  b.setAttribute('data-menu-item', '');
  b.innerHTML = opts.html || '';
  if (!opts.html) b.textContent = label;
  b.onclick = onClick;
  if (opts.sub) {
    const s = document.createElement('span');
    s.className = 'menu-sub';
    s.textContent = opts.sub;
    b.appendChild(s);
  }
  if (opts.disabled) {
    b.disabled = true;
    b.classList.add('locked');
    b.removeAttribute('data-menu-item');
  }
  return b;
}

/**
 * The house placeholder. Reserved states get a real screen rather than a
 * dead menu entry, so navigation is walkable end to end today and the slot
 * is visibly a slot rather than a bug.
 */
export function unwrittenPanel(title, line) {
  const wrap = document.createElement('div');
  wrap.className = 'unwritten';
  const k = document.createElement('div');
  k.className = 'unwritten-kanji';
  k.textContent = '白';
  const h = document.createElement('div');
  h.className = 'unwritten-title';
  h.textContent = title || 'UNWRITTEN';
  const p = document.createElement('div');
  p.className = 'unwritten-line';
  p.textContent = line || 'This scroll is not yet inked.';
  wrap.append(k, h, p);
  return wrap;
}

/**
 * A tab strip. Returns {el, select(id)}. Tabs are inscriptions on the stone,
 * not browser chrome — the styling lives in shell.css.
 */
export function tabStrip(tabs, onSelect) {
  const el = document.createElement('div');
  el.className = 'tabs';
  const buttons = new Map();
  for (const t of tabs) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.dataset.tab = t.id;
    b.setAttribute('data-menu-item', '');
    b.innerHTML = `<span class="tab-kanji">${t.kanji || ''}</span><span class="tab-label">${t.label}</span>`;
    b.onclick = () => onSelect(t.id);
    buttons.set(t.id, b);
    el.appendChild(b);
  }
  return {
    el,
    select(id) {
      for (const [k, b] of buttons) b.classList.toggle('active', k === id);
    },
  };
}

/** Shared behaviour: a root element plus a MenuNav over it. */
export class Screen {
  constructor(rootId, game) {
    this.root = $(rootId);
    this.game = game;
    this.nav = new MenuNav(this.root, { onBack: () => this.back() });
  }
  show() { this.root.classList.remove('hidden'); this.nav.enter(); }
  hide() { this.root.classList.add('hidden'); this.nav.exit(); }
  update(dt) { this.nav.update(dt); }
  handleKey(e) { return this.nav.handleKey(e); }
  back() {}
}

/**
 * A screen whose body is a set of tabs. Used by The Inkstone and the Archive.
 * Subclasses implement `renderTab(id, host)`.
 */
export class TabbedScreen extends Screen {
  constructor(rootId, game, tabs) {
    super(rootId, game);
    this.tabs = tabs;
    this.current = tabs[0].id;
    this.strip = null;
    this.host = null;
  }

  mount() {
    if (this.strip) return;
    const holder = this.root.querySelector('.tab-holder');
    const body = this.root.querySelector('.tab-body');
    this.strip = tabStrip(this.tabs, (id) => this.select(id));
    holder.appendChild(this.strip.el);
    this.host = body;
  }

  select(id) {
    this.current = id;
    this.strip.select(id);
    this.host.innerHTML = '';
    this.renderTab(id, this.host);
    // the tab set changed what is focusable; let the nav re-read it
    this.nav.refocus();
  }

  show() {
    this.mount();
    // B / Escape already leaves; this is so a mouse can too.
    const list = this.root.querySelector('.menu-list');
    if (list) {
      list.innerHTML = '';
      list.appendChild(button('BACK', () => this.back()));
    }
    this.select(this.current);
    super.show();
  }

  renderTab() {}
}
