/**
 * Shell screens: TITLE, RUN_SETUP, DEATH, RESULTS.
 *
 * All of them are DOM in the existing HUD idiom (parchment, sumi, hanko) and
 * all of them are pad-navigable via MenuNav — gate S2.
 */
import { MODES, dailySeed } from './run.js';
import { Profile } from './profile.js';
import { board } from './board.js';
import { MenuNav } from './menunav.js';
import { renderPrint, exportPrintPNG } from './print.js';
import { SettingsEditor } from './settings.js';

const $ = (id) => document.getElementById(id);

function button(label, onClick, opts = {}) {
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
  return b;
}

/** Shared behaviour: a root element plus a MenuNav over it. */
class Screen {
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

// ------------------------------------------------------------------- TITLE

export class TitleScreen extends Screen {
  constructor(game) { super('screen-title', game); }

  show() {
    const last = MODES[Profile.data.lastMode] ? Profile.data.lastMode : 'daily';
    const menu = this.root.querySelector('.menu-list');
    menu.innerHTML = '';
    menu.appendChild(button(`BEGIN — ${MODES[last].label}`, () => this.game.startRun(last), {
      sub: 'Straight back into the last mode you played',
    }));
    menu.appendChild(button('MODES', () => this.game.toSetup(), {
      sub: 'Daily Scroll · Free · Kata',
    }));
    menu.appendChild(button('SETTINGS', () => this.game.openSettings(), {
      sub: 'Controls, bindings and every tuning value',
    }));
    const runs = Profile.data.totalRuns;
    this.root.querySelector('.title-foot').textContent =
      runs ? `${runs} run${runs === 1 ? '' : 's'} recorded` : 'No runs yet';
    super.show();
  }
}

// --------------------------------------------------------------- RUN_SETUP

export class SetupScreen extends Screen {
  constructor(game) { super('screen-setup', game); }
  back() { this.game.toTitle(); }

  show() {
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    const day = Profile.today();

    for (const id of ['daily', 'free', 'kata']) {
      const m = MODES[id];
      const best = Profile.bestFor(id, day);
      const bestText = id === 'kata'
        ? 'Practice — not scored'
        : (best ? `Best ${best.score} · wave ${best.wave}` : 'No record yet');
      list.appendChild(button(m.label, () => this.game.startRun(id), {
        html: `<span class="menu-kanji">${m.kanji}</span><span class="menu-label">${m.label}</span>`,
        sub: `${m.blurb}  —  ${bestText}`,
      }));
    }

    // free-mode seed entry, reachable but out of the main flow
    const seedRow = this.root.querySelector('.seed-row');
    seedRow.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'seed-input';
    input.placeholder = 'seed for FREE (blank = random)';
    input.value = this.game.freeSeed || '';
    input.addEventListener('change', () => { this.game.freeSeed = input.value.trim(); });
    seedRow.appendChild(input);

    list.appendChild(button('BACK', () => this.game.toTitle()));
    this.root.querySelector('.setup-foot').textContent =
      `Daily seed: ${dailySeed(day)}`;
    super.show();
  }
}

// -------------------------------------------------------------------- DEATH

export class DeathScreen {
  constructor(game) {
    this.root = $('screen-death');
    this.game = game;
  }
  show() { this.root.classList.remove('hidden'); this.root.classList.add('death-play'); }
  hide() { this.root.classList.add('hidden'); this.root.classList.remove('death-play'); }
  update() {}
  handleKey() { return false; }
}

// ------------------------------------------------------------------ RESULTS

export class ResultsScreen extends Screen {
  constructor(game) {
    super('screen-results', game);
    this.printCanvas = null;
    this.summary = null;
  }
  back() { this.game.toTitle(); }

  async show(summary, record) {
    this.summary = summary;
    const stats = this.root.querySelector('.results-stats');
    const rank = summary.rank;

    const row = (k, v, cls = '') => `<div class="rrow ${cls}"><span>${k}</span><span>${v}</span></div>`;
    const mins = Math.floor(summary.timeSeconds / 60);
    const secs = Math.floor(summary.timeSeconds % 60);

    stats.innerHTML =
      row('MODE', summary.modeLabel) +
      (summary.wave ? row('WAVE REACHED', summary.wave) : '') +
      row('TIME', `${mins}:${String(secs).padStart(2, '0')}`) +
      row('STROKES', summary.strokes) +
      row('BEST COMBO', summary.bestCombo) +
      row('KILLS', summary.kills) +
      row('PARRIES', summary.parries) +
      row('DAMAGE TAKEN', summary.damageTaken) +
      row('SCORE', summary.score, 'big');

    const seal = this.root.querySelector('.results-seal');
    seal.innerHTML = `<div class="seal-kanji" style="color:${rank.color}">${rank.kanji}</div>` +
      `<div class="seal-title" style="color:${rank.color}">${rank.title} (${rank.grade})</div>`;

    // personal best delta
    const pb = this.root.querySelector('.results-pb');
    if (summary.mode === 'kata') {
      pb.textContent = 'Kata runs are not scored.';
    } else {
      const res = summary.pb;
      if (res && res.isBest) {
        pb.textContent = res.previous
          ? `NEW BEST  ·  +${summary.score - res.previous.score} over your previous ${res.previous.score}`
          : 'NEW BEST  ·  first record for this mode';
        pb.className = 'results-pb best';
      } else if (res && res.previous) {
        pb.textContent = `Best stands at ${res.previous.score}  ·  ${summary.score - res.previous.score} this run`;
        pb.className = 'results-pb';
      } else {
        pb.textContent = '';
      }
    }

    // leaderboard (LocalBoard today)
    const lb = this.root.querySelector('.results-board');
    try {
      const top = await board.top(summary.mode, summary.day, 5);
      lb.innerHTML = top.length
        ? '<h3>LOCAL BOARD</h3>' + top.map((e, i) =>
            `<div class="rrow${e.runHash === summary.runHash ? ' me' : ''}">` +
            `<span>${i + 1}. ${e.name}</span><span>${e.score}</span></div>`).join('')
        : '';
    } catch (e) { lb.innerHTML = ''; }

    // --- the print ---
    const frame = this.root.querySelector('.print-frame');
    frame.innerHTML = '';
    this.printCanvas = renderPrint(record, summary, { size: 560 });
    this.printCanvas.className = 'print-canvas';
    frame.appendChild(this.printCanvas);

    // --- buttons ---
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('AGAIN', () => this.game.startRun(summary.mode)));
    list.appendChild(button('TITLE', () => this.game.toTitle()));
    list.appendChild(button('COPY SEED', (ev) => {
      const btn = ev.currentTarget;
      const done = (ok) => { btn.textContent = ok ? 'SEED COPIED' : summary.seed; };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(summary.seed).then(() => done(true), () => done(false));
      } else { done(false); }
    }));
    list.appendChild(button('EXPORT SCROLL (PNG)', () => {
      exportPrintPNG(this.printCanvas, `sumi-${summary.mode}-${summary.seed}.png`);
    }));

    super.show();
  }
}

// ----------------------------------------------------------------- SETTINGS

/** Settings reached from TITLE. The in-run settings live in the pause menu. */
export class SettingsScreen extends Screen {
  constructor(game) {
    super('screen-settings', game);
    this.editor = null;
  }
  back() { this.game.toTitle(); }

  show() {
    const body = this.root.querySelector('.settings-body');
    if (!this.editor) this.editor = new SettingsEditor(body);
    else this.editor.refresh();

    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('EXPORT PROFILE', () => {
      const blob = new Blob([Profile.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sumi-profile.json';
      document.body.appendChild(a); a.click(); a.remove();
    }));
    list.appendChild(button('IMPORT PROFILE', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        try { Profile.importJSON(await f.text()); this.show(); }
        catch (e) { alert('Could not read that profile.'); }
      };
      inp.click();
    }));
    list.appendChild(button('BACK', () => this.game.toTitle()));
    super.show();
  }

  update(dt) {
    super.update(dt);
    // the settings editor has its own pad handling; let it drive while focus
    // is inside the parameter tree
    if (this.editor && document.activeElement &&
        this.root.querySelector('.settings-body')?.contains(document.activeElement)) {
      if (this.editor.handleGamepad(dt) === 'close') this.game.toTitle();
    }
  }
}
