/**
 * The run-flow screens: TITLE, RUN_SETUP, DEATH, FINISHED CALLIGRAPHY
 * (results), and the dev tuning screen.
 *
 * The meta screens — The Inkstone, the Archive, Options, Play/Scroll select —
 * live in ui/. The split is by lifecycle, not by size: everything here is on
 * the path into or out of a run.
 */
import { MODES, dailySeed } from './run.js';
import { Profile } from './profile.js';
import { board } from './board.js';
import { Gallery } from './gallery.js';
import { renderPrint, exportPrintPNG } from './print.js';
import { SettingsEditor } from './settings.js';
import { Screen, button, $ } from './ui/screen.js';
import { TUNING, setTuning } from './tuning.js';
import { GLYPHS, GLYPH_ORDER } from './glyphs.js';

// ------------------------------------------------------------------- TITLE

export class TitleScreen extends Screen {
  constructor(game) { super('screen-title', game); }

  show() {
    const last = MODES[Profile.data.lastMode] ? Profile.data.lastMode : 'daily';
    const played = Profile.data.totalRuns > 0;
    const menu = this.root.querySelector('.menu-list');
    menu.innerHTML = '';

    menu.appendChild(button(played ? 'CONTINUE' : 'BEGIN', () => this.game.startRun(last), {
      sub: played
        ? `Straight back into ${MODES[last].label}`
        : 'Take up the brush',
    }));
    menu.appendChild(button('PLAY', () => this.game.toPlaySelect(), {
      sub: 'Pilgrimage · Scrolls · Kata · Daily Scroll',
    }));
    menu.appendChild(button('INKSTONE', () => this.game.toInkstone(), {
      sub: 'Techniques, strokes and what the ink remembers',
    }));
    menu.appendChild(button('ARCHIVE', () => this.game.toArchive(), {
      sub: 'Finished scrolls, records and boards',
    }));
    menu.appendChild(button('OPTIONS', () => this.game.toOptions(), {
      sub: 'Controls, audio, visuals and accessibility',
    }));

    const runs = Profile.data.totalRuns;
    this.root.querySelector('.title-foot').innerHTML =
      `<span>${runs ? `${runs} run${runs === 1 ? '' : 's'} recorded` : 'No runs yet'}</span>`;

    const credits = this.root.querySelector('.title-credits');
    credits.innerHTML = '';
    credits.appendChild(button('CREDITS', () => this.game.toCredits(), { className: 'tiny' }));

    super.show();
  }
}

// --------------------------------------------------------------- RUN_SETUP

/** Confirmation and detail for the two modes that are not scrolls. */
export class SetupScreen extends Screen {
  constructor(game) {
    super('screen-setup', game);
    this.mode = 'daily';
  }
  back() { this.game.toPlaySelect(); }

  setMode(mode) { this.mode = MODES[mode] ? mode : 'daily'; }

  show() {
    const m = MODES[this.mode];
    const day = Profile.today();
    const best = Profile.bestFor(this.mode, day);

    this.root.querySelector('.setup-head').innerHTML =
      `<span class="kanji">${m.kanji}</span> ${m.label}`;
    this.root.querySelector('.setup-blurb').textContent = m.blurb;

    const stats = this.root.querySelector('.setup-stats');
    stats.innerHTML = this.mode === 'kata'
      ? '<div class="rrow"><span>SCORED</span><span>No — practice</span></div>'
      : `<div class="rrow"><span>YOUR BEST</span><span>${best ? `${best.score} · wave ${best.wave}` : '—'}</span></div>` +
        `<div class="rrow"><span>SEED</span><span>${this.mode === 'daily' ? dailySeed(day) : 'random'}</span></div>`;

    // KATA is the practice mode, so it is where the canvas gets its own
    // switches. They write the same tuning paths Options would — one truth,
    // reached from wherever it makes sense to reach it.
    const opts = this.root.querySelector('.setup-options');
    opts.innerHTML = '';
    if (this.mode === 'kata') this.renderKataOptions(opts);

    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('BEGIN', () => this.game.startRun(this.mode)));
    list.appendChild(button('BACK', () => this.game.toPlaySelect()));

    this.root.querySelector('.setup-foot').textContent =
      this.mode === 'daily' ? 'The seed changes at UTC midnight.' : '';
    super.show();
  }

  /** Ink switches for practice. Same rows as Player Options, same paths. */
  renderKataOptions(host) {
    host.innerHTML = '<h3>CANVAS</h3>';

    const toggle = document.createElement('div');
    toggle.className = 'opt-row';
    const tl = document.createElement('label');
    tl.className = 'opt-label';
    tl.textContent = 'Ink';
    const tb = document.createElement('button');
    tb.className = 'opt-toggle';
    tb.tabIndex = 0;
    tb.setAttribute('data-menu-item', '');
    const paintToggle = () => {
      tb.textContent = TUNING.ink.enabled ? 'ON' : 'OFF';
      tb.dataset.on = TUNING.ink.enabled ? '1' : '0';
    };
    tb.onclick = () => { setTuning('ink.enabled', TUNING.ink.enabled ? 0 : 1); paintToggle(); };
    paintToggle();
    const tc = document.createElement('div');
    tc.className = 'opt-control';
    tc.appendChild(tb);
    toggle.append(tl, tc);
    host.appendChild(toggle);

    const speed = document.createElement('div');
    speed.className = 'opt-row';
    const sl = document.createElement('label');
    sl.className = 'opt-label';
    sl.textContent = 'Lifecycle speed';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0.25'; range.max = '3'; range.step = '0.05';
    range.value = String(TUNING.ink.lifecycleScale);
    range.tabIndex = 0;
    range.setAttribute('data-menu-item', '');
    const out = document.createElement('span');
    out.className = 'opt-value';
    // shown as a duration, because "how long is my ink wet" is the question
    const paintSpeed = () => {
      out.textContent = `${(TUNING.ink.wetTime * TUNING.ink.lifecycleScale).toFixed(1)}s wet`;
    };
    range.addEventListener('input', () => {
      setTuning('ink.lifecycleScale', parseFloat(range.value) || 1);
      paintSpeed();
    });
    paintSpeed();
    const sc = document.createElement('div');
    sc.className = 'opt-control';
    sc.append(range, out);
    speed.append(sl, sc);
    host.appendChild(speed);

    const note = document.createElement('p');
    note.className = 'meta-note';
    note.textContent = 'Slower ink gives you longer to read a skate line. These apply to every mode.';
    host.appendChild(note);
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

// ------------------------------------------------ RESULTS / FINISHED CALLIGRAPHY

/**
 * The end-of-run screen, re-skinned to the fiction.
 *
 * Reserved stat lines and the evaluator axes render only when the summary
 * actually carries them, so this screen already has the shape it will have in
 * V0.6 without showing five zeroes today.
 */
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

    let html =
      row('FORM', summary.modeLabel) +
      (summary.scrollLabel ? row('SCROLL', summary.scrollLabel) : '') +
      (summary.wave ? row('WAVE REACHED', summary.wave) : '') +
      row('TIME', `${mins}:${String(secs).padStart(2, '0')}`) +
      row('STROKES', summary.strokes) +
      row('BEST COMBO', summary.bestCombo) +
      row('STAINS CLEARED', summary.kills) +
      row('PARRIES', summary.parries) +
      row('DAMAGE TAKEN', summary.damageTaken);

    // --- reserved lines: only when the system that fills them exists ---
    if (summary.glyphsDrawn) html += row('GLYPHS DRAWN', summary.glyphsDrawn);
    if (summary.uniqueForms != null) html += row('UNIQUE FORMS', `${summary.uniqueForms} / 3`);
    if (summary.pigmentCaptured != null) html += row('PIGMENT CAPTURED', `${Math.round(summary.pigmentCaptured * 100)}%`);

    html += row('SCORE', summary.score, 'big');
    stats.innerHTML = html;

    // --- which shapes, and how often ---
    const forms = this.root.querySelector('.results-forms');
    const kinds = summary.glyphKinds || [];
    forms.innerHTML = kinds.length
      ? '<h3>FORMS WRITTEN</h3><div class="form-row">' + GLYPH_ORDER.map((id) => {
          const on = kinds.includes(id);
          return `<span class="form-seal${on ? ' on' : ''}" title="${GLYPHS[id].label}">` +
                 `${GLYPHS[id].kanji}</span>`;
        }).join('') + '</div>'
      : '';

    // --- modifiers (reserved; a run with none renders nothing) ---
    const mods = this.root.querySelector('.results-mods');
    mods.innerHTML = (summary.modifiers && summary.modifiers.length)
      ? '<h3>MODIFIERS</h3>' + summary.modifiers.map((m) =>
          `<div class="rrow"><span>${m.label || m.id}</span><span>×${m.scoreMul ?? 1}</span></div>`).join('')
      : '';

    // --- evaluator axes (V0.6) ---
    const axes = this.root.querySelector('.results-axes');
    axes.innerHTML = summary.axes
      ? '<h3>THE HAND</h3>' + ['composition', 'flow', 'variety', 'control', 'economy']
          .map((k) => `<div class="axis"><span>${k.toUpperCase()}</span>` +
            `<div class="bar"><div class="bar-fill" style="width:${Math.round((summary.axes[k] || 0) * 100)}%"></div></div></div>`)
          .join('')
      : '';

    const seal = this.root.querySelector('.results-seal');
    seal.innerHTML = `<div class="seal-kanji" style="color:${rank.color}">${rank.kanji}</div>` +
      `<div class="seal-title" style="color:${rank.color}">${rank.title} (${rank.grade})</div>`;

    // --- personal best delta ---
    const pb = this.root.querySelector('.results-pb');
    if (summary.mode === 'kata') {
      pb.textContent = 'Kata runs are not scored.';
      pb.className = 'results-pb';
    } else {
      const res = summary.pb;
      if (res && res.isBest) {
        pb.textContent = res.previous
          ? `NEW BEST  ·  +${summary.score - res.previous.score} over your previous ${res.previous.score}`
          : 'NEW BEST  ·  first record for this form';
        pb.className = 'results-pb best';
      } else if (res && res.previous) {
        pb.textContent = `Best stands at ${res.previous.score}  ·  ${summary.score - res.previous.score} this run`;
        pb.className = 'results-pb';
      } else {
        pb.textContent = '';
      }
    }

    // --- wave breakdown (Bayonetta): collapsible, per-wave ---
    this.renderWaveBreakdown(summary);

    // --- leaderboard ---
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

    // Auto-save to the Scroll Gallery. A failure here must not touch the
    // screen: the print is already on-screen and exportable either way.
    Gallery.save(this.printCanvas, summary).catch(() => {});

    // --- buttons ---
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('AGAIN', () => this.game.again(summary)));
    list.appendChild(button('SCROLLS', () => this.game.toPlaySelect()));
    list.appendChild(button('TITLE', () => this.game.toTitle()));
    list.appendChild(button('COPY SEED', (ev) => {
      const btn = ev.currentTarget;
      const done = (ok) => { btn.textContent = ok ? 'SEED COPIED' : summary.seed; };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(summary.seed).then(() => done(true), () => done(false));
      } else { done(false); }
    }));
    list.appendChild(button('EXPORT SCROLL (PNG)', () => {
      exportPrintPNG(this.printCanvas, `inkstone-${summary.mode}-${summary.seed}.png`);
    }));

    super.show();
  }

  /**
   * Reserved (Bayonetta's per-verse grading). The panel renders whatever
   * per-wave rows the record produced; the grade column stays blank until the
   * V0.6 evaluator can fill it.
   */
  renderWaveBreakdown(summary) {
    const host = this.root.querySelector('.results-waves');
    const waves = summary.waveStats || [];
    if (!waves.length) { host.innerHTML = ''; return; }

    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = `WAVE BREAKDOWN (${waves.length})`;
    sum.setAttribute('data-menu-item', '');
    sum.tabIndex = 0;
    det.appendChild(sum);

    const table = document.createElement('div');
    table.className = 'wave-table';
    table.innerHTML =
      '<div class="wrow whead"><span>WAVE</span><span>TIME</span><span>HITS</span><span>TAKEN</span><span>GLYPHS</span><span>MARK</span></div>' +
      waves.map((w) =>
        `<div class="wrow"><span>${w.wave}</span><span>${w.timeSeconds.toFixed(1)}s</span>` +
        `<span>${w.hits}</span><span>${w.damageTaken}</span><span>${w.glyphs || 0}</span>` +
        `<span class="wmark">${w.grade || '—'}</span></div>`).join('');
    det.appendChild(table);

    host.innerHTML = '';
    host.appendChild(det);
  }
}

// ------------------------------------------------------------- DEV TUNING

/**
 * The full tuning editor, unchanged from V0.2.5 and now reachable only with
 * `?dev=1` (or through the `~` overlay). Players get OPTIONS instead: five
 * hundred parameters is the right tool for building this game and the wrong
 * one for playing it.
 */
export class DevTuningScreen extends Screen {
  constructor(game) {
    super('screen-devtuning', game);
    this.editor = null;
  }
  back() { this.game.toTitle(); }

  show() {
    const body = this.root.querySelector('.settings-body');
    if (!this.editor) this.editor = new SettingsEditor(body);
    else this.editor.refresh();

    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('PLAYER OPTIONS', () => this.game.toOptions()));
    list.appendChild(button('BACK', () => this.game.toTitle()));
    super.show();
  }
}
