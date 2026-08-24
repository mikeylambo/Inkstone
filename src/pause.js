/**
 * Pause menu.
 *
 * V0.2.5 mounted the raw tuning editor here, which meant every player who hit
 * Escape was handed five hundred engine parameters. Now it mounts the two
 * things a paused player actually wants — the move list and Player Options —
 * and the tuning editor lives behind `?dev=1` on its own screen.
 *
 * One MenuNav over the whole panel: the head buttons sit outside any mounted
 * component, so a component-owned nav could never reach them.
 */
import { World } from './world.js';
import { Input, ACTIONS } from './input.js';
import { MenuNav } from './menunav.js';
import { TechniqueList } from './techniques.js';
import { OptionsEditor, PlayerOptions } from './playeroptions.js';

const TABS = [
  { id: 'techniques', label: 'TECHNIQUES', kanji: '技' },
  { id: 'options', label: 'OPTIONS', kanji: '調' },
];

export class PauseMenu {
  constructor() {
    this.el = document.getElementById('pause-menu');
    this.body = document.getElementById('pause-body');
    this.tabsEl = document.getElementById('pause-tabs');
    this.game = null;          // set by Game once it exists
    this.tab = 'techniques';
    this.techniques = null;
    this.options = null;

    this.nav = new MenuNav(document.getElementById('pause-panel'), {
      onBack: () => this.close(),
    });

    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
      return el;
    };
    on('pause-resume', () => this.close());
    on('pause-restart', () => { this.close(); this.game?.restart(); });
    on('pause-scrolls', () => this.game?.returnToScrolls());
    on('pause-title-btn', () => { this.close(); this.game?.toTitle(); });
    on('pause-abandon', () => { this.game?.abandon(); });

    this.buildTabs();

    // clicking the backdrop resumes; clicking the panel must not
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  buildTabs() {
    if (!this.tabsEl) return;
    this.tabsEl.innerHTML = '';
    this.tabButtons = new Map();
    for (const t of TABS) {
      const b = document.createElement('button');
      b.className = 'tab';
      b.setAttribute('data-menu-item', '');
      b.innerHTML = `<span class="tab-kanji">${t.kanji}</span><span class="tab-label">${t.label}</span>`;
      b.onclick = () => this.select(t.id);
      this.tabButtons.set(t.id, b);
      this.tabsEl.appendChild(b);
    }
  }

  select(id) {
    this.tab = id;
    for (const [k, b] of this.tabButtons) b.classList.toggle('active', k === id);
    this.body.innerHTML = '';
    const host = document.createElement('div');
    this.body.appendChild(host);
    if (id === 'techniques') this.techniques = new TechniqueList(host);
    else this.options = new OptionsEditor(host);
    this.nav.refocus(this.nav.index);
  }

  /**
   * Context-aware head buttons. Kata has no scroll to return to, and Daily's
   * restart re-seeds today rather than rolling a fresh seed — both of those
   * are decisions about the run, so the menu asks the run.
   */
  applyContext() {
    const run = this.game?.run;
    const isKata = run ? run.mode === 'kata' : false;
    const isDaily = run ? run.mode === 'daily' : false;

    const show = (id, visible) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !visible);
    };
    show('pause-scrolls', !isKata);
    show('pause-abandon', !isKata);

    const restart = document.getElementById('pause-restart');
    if (restart) {
      restart.textContent = isDaily ? "RESTART TODAY'S" : 'RESTART';
      restart.title = isDaily
        ? "Start today's seed over. The seed does not change until UTC midnight."
        : 'Start this run over from the beginning.';
    }

    const title = document.getElementById('pause-title');
    if (title) title.textContent = run ? `PAUSED — ${run.def.label}` : 'PAUSED';
  }

  toggle() { (World.paused ? this.close() : this.open()); }

  open() {
    World.paused = true;
    // nothing pressed before or during the pause should fire on resume
    Input.clearAll();
    for (const a of ACTIONS) Input.release(a);
    Input.move.x = 0; Input.move.y = 0;
    this.el.classList.remove('hidden');
    this.applyContext();
    this.select(this.tab);
    this.nav.enter();
  }

  /** Called every rendered frame while paused, so a pad can drive the menu. */
  update(dt) {
    if (!World.paused) return;
    this.nav.update(dt);
  }

  handleKey(e) { return this.nav.handleKey(e); }

  close() {
    World.paused = false;
    Input.clearAll();
    this.nav.exit();
    this.el.classList.add('hidden');
    PlayerOptions.save();
  }
}
