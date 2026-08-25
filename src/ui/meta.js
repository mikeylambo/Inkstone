/**
 * THE INKSTONE, the ARCHIVE, OPTIONS and CREDITS.
 *
 * The Inkstone is the meta screen the game is named for. One of its five tabs
 * holds real content today (TECHNIQUES); the rest are styled placeholders with
 * a line of fiction, because a tab that says what will live there is honest
 * and a tab that shows a fake economy is not.
 */
import { Screen, TabbedScreen, button, unwrittenPanel } from './screen.js';
import { TechniqueList, strokeDiagram } from '../techniques.js';
import { ATTACK_META } from '../combat/attacks.js';
import { INK } from '../strokes.js';
import { glyphReference } from '../glyphs.js';
import { TUNING } from '../tuning.js';
import { OptionsEditor } from '../playeroptions.js';
import { Profile } from '../profile.js';
import { Gallery } from '../gallery.js';
import { board } from '../board.js';
import { MODES } from '../run.js';
import { SCROLLS } from '../scrolls.js';
import { exportPrintPNG } from '../print.js';

// ------------------------------------------------------------- THE INKSTONE

const INKSTONE_TABS = [
  { id: 'techniques', label: 'TECHNIQUES', kanji: '技' },
  { id: 'strokes', label: 'STROKES', kanji: '筆' },
  { id: 'finisher', label: 'FINISHING STROKE', kanji: '極' },
  { id: 'pigment', label: 'PIGMENT', kanji: '彩' },
  { id: 'record', label: 'RECORD', kanji: '録' },
];

export class InkstoneScreen extends TabbedScreen {
  constructor(game) {
    super('screen-inkstone', game, INKSTONE_TABS);
    this.techniques = null;
  }
  back() { this.game.toTitle(); }

  renderTab(id, host) {
    switch (id) {
      case 'techniques': {
        const wrap = document.createElement('div');
        host.appendChild(wrap);
        this.techniques = new TechniqueList(wrap);
        break;
      }
      case 'strokes':
        host.appendChild(strokesPanel());
        break;
      case 'finisher':
        host.appendChild(unwrittenPanel('FINISHING STROKE',
          'The last mark of a run, and the only one that is signed. Not yet drawn.'));
        break;
      case 'pigment':
        host.appendChild(unwrittenPanel('PIGMENT',
          'Pigment settles when captured. Nothing is captured yet.'));
        break;
      case 'record':
        host.appendChild(recordPanel());
        break;
    }
  }
}

/**
 * STROKES — what the kit writes, and how ink behaves once written.
 *
 * Built from ATTACK_META and TUNING.ink rather than hand-written, so a retuned
 * lifecycle or a re-authored stroke updates this page without anyone
 * remembering to. The reference a player actually needs here is not a list of
 * shapes; it is *how long they have* before wet ink sets.
 */
function strokesPanel() {
  const el = document.createElement('div');
  el.className = 'strokes-panel';

  const I = TUNING.ink;
  const k = Math.max(0.05, I.lifecycleScale);
  const phases = [
    [INK.FRESH, I.freshTime * k, 'The instant of laying.'],
    [INK.WET, I.wetTime * k, 'Slippery. Dash across it to skate; a dash begun on wet ink slides further.'],
    [INK.SET, I.setTime * k, 'Solid. A heavy mark turns a charge and can splatter what runs into it.'],
    [INK.DRY, I.dryTime * k, 'A mark only. Still solid, no longer slick.'],
    [INK.FADED, I.fadeTime * k, 'Gone.'],
  ];

  const life = document.createElement('div');
  life.className = 'ink-life';
  life.innerHTML = '<h3>THE LIFE OF A MARK</h3>' + phases.map(([name, secs, line]) =>
    `<div class="ink-phase ink-${name}">` +
    `<span class="ink-name">${name.toUpperCase()}</span>` +
    `<span class="ink-secs">${secs.toFixed(1)}s</span>` +
    `<span class="ink-line">${line}</span></div>`).join('');
  el.appendChild(life);

  const marks = document.createElement('div');
  marks.className = 'ink-marks';
  marks.innerHTML = '<h3>THE MARKS</h3>';
  for (const [key, meta] of Object.entries(ATTACK_META)) {
    if (!meta.ink) continue;
    const row = document.createElement('div');
    row.className = 'ink-mark';
    const box = document.createElement('div');
    box.className = 'tech-geo';
    const d = strokeDiagram(meta.ink);
    if (d) box.appendChild(d);
    const body = document.createElement('div');
    body.innerHTML =
      `<div class="ink-mark-name">${meta.label}</div>` +
      `<div class="ink-mark-sub">${meta.ink.type}` +
      `${meta.ink.pillar ? ' · sets solid' : ''}` +
      ` · ${meta.ink.width.toFixed(2)}m weight</div>`;
    row.append(box, body);
    marks.appendChild(row);
  }
  el.appendChild(marks);

  const note = document.createElement('p');
  note.className = 'meta-note';
  note.textContent = 'Airborne strokes leave nothing: ink touches the floor when the blade does. ' +
    'The falling stroke is the exception, and it is the one that lands.';
  el.appendChild(note);

  // --- V0.4: the shapes those marks can add up to ---
  const forms = document.createElement('div');
  forms.className = 'glyph-ref';
  forms.innerHTML = '<h3>THE FORMS</h3>';
  for (const g of glyphReference()) {
    const row = document.createElement('div');
    row.className = 'glyph-row';
    row.innerHTML =
      `<span class="glyph-kanji">${g.kanji}</span>` +
      `<span class="glyph-body">` +
      `<span class="glyph-name">${g.label}</span>` +
      `<span class="glyph-how">${g.how}</span>` +
      `<span class="glyph-does">${g.line}</span></span>`;
    forms.appendChild(row);
  }
  const fnote = document.createElement('p');
  fnote.className = 'meta-note';
  fnote.textContent = `A form is found in marks you have already made, within ${glyphReference()[0].window}s ` +
    'of each other. Nothing is a form on its own — it is what the marks make together.';
  forms.appendChild(fnote);
  el.appendChild(forms);
  return el;
}

/** Lifetime numbers the profile already knows. Thin on purpose. */
function recordPanel() {
  const el = document.createElement('div');
  el.className = 'meta-record';
  const d = Profile.data;
  const rows = [
    ['RUNS RECORDED', d.totalRuns],
    ['LAST FORM', MODES[d.lastMode]?.label || '—'],
    ['CALLIGRAPHER', d.name],
  ];
  el.innerHTML = rows.map(([k, v]) =>
    `<div class="rrow"><span>${k}</span><span>${v}</span></div>`).join('');
  const note = document.createElement('p');
  note.className = 'meta-note';
  note.textContent = 'Per-technique usage and lifetime stroke counts arrive with the stroke registry.';
  el.appendChild(note);
  return el;
}

// ----------------------------------------------------------------- ARCHIVE

const ARCHIVE_TABS = [
  { id: 'gallery', label: 'SCROLL GALLERY', kanji: '画' },
  { id: 'records', label: 'RECORDS', kanji: '記' },
  { id: 'ink', label: 'INK RECORD', kanji: '鬼' },
  { id: 'boards', label: 'LEADERBOARDS', kanji: '順' },
];

export class ArchiveScreen extends TabbedScreen {
  constructor(game) {
    super('screen-archive', game, ARCHIVE_TABS);
    this.urls = [];
  }
  back() { this.game.toTitle(); }

  hide() {
    // object URLs from the last gallery render would otherwise leak
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = [];
    super.hide();
  }

  renderTab(id, host) {
    switch (id) {
      case 'gallery': this.renderGallery(host); break;
      case 'records': host.appendChild(recordsPanel()); break;
      case 'ink': host.appendChild(inkRecordPanel()); break;
      case 'boards': this.renderBoards(host); break;
    }
  }

  async renderGallery(host) {
    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    host.appendChild(grid);
    grid.textContent = 'Reading the archive…';

    const entries = await Gallery.list();
    grid.textContent = '';

    if (!entries.length) {
      grid.appendChild(unwrittenPanel('NO SCROLLS YET',
        'Finish a run and its print is kept here.'));
      this.nav.refocus(this.nav.index);
      return;
    }

    for (const e of entries) {
      if (e.url) this.urls.push(e.url);
      grid.appendChild(this.galleryCard(e, grid));
    }
    this.nav.refocus(this.nav.index);
  }

  galleryCard(e, grid) {
    const card = document.createElement('div');
    card.className = 'gal-card';

    const img = document.createElement('img');
    img.className = 'gal-img';
    img.alt = `${e.modeLabel || e.mode} · ${e.score}`;
    if (e.url) img.src = e.url;
    card.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'gal-meta';
    const when = new Date(e.at).toISOString().slice(0, 10);
    meta.innerHTML =
      `<div class="gal-line"><span>${e.modeLabel || e.mode}</span><span>${e.score}</span></div>` +
      `<div class="gal-sub">${when}${e.rank ? ` · ${e.rank.grade}` : ''}${e.wave ? ` · wave ${e.wave}` : ''}</div>` +
      (e.modifiers && e.modifiers.length
        ? `<div class="gal-mods">${e.modifiers.map((m) => m.label || m.id).join(' · ')}</div>` : '');
    card.appendChild(meta);

    const acts = document.createElement('div');
    acts.className = 'gal-acts';

    acts.appendChild(button('VIEW', () => {
      if (e.url) window.open(e.url, '_blank', 'noopener');
    }, { className: 'small' }));

    acts.appendChild(button('EXPORT', () => {
      if (!e.url) return;
      const a = document.createElement('a');
      a.href = e.url;
      a.download = `inkstone-${e.mode}-${e.seed}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    }, { className: 'small' }));

    // Reserved (Katana ZERO). The viewer needs a stable RunRecord format,
    // which gate FR10 pins down; the button waits for the viewer.
    acts.appendChild(button('REPLAY', () => {}, { className: 'small', disabled: true }));

    acts.appendChild(button('DELETE', async () => {
      await Gallery.remove(e.id);
      card.remove();
      if (!grid.querySelector('.gal-card')) {
        grid.appendChild(unwrittenPanel('NO SCROLLS YET', 'Finish a run and its print is kept here.'));
      }
      this.nav.refocus(0);
    }, { className: 'small danger' }));

    card.appendChild(acts);
    return card;
  }

  async renderBoards(host) {
    const wrap = document.createElement('div');
    wrap.className = 'board-wrap';
    host.appendChild(wrap);
    const day = Profile.today();

    for (const [label, mode, d] of [['DAILY SCROLL', 'daily', day], ['ENDLESS', 'free', null]]) {
      const sec = document.createElement('div');
      sec.className = 'board-sec';
      sec.innerHTML = `<h3>${label}</h3>`;
      let rows = [];
      try { rows = await board.top(mode, d, 10); } catch (e) { rows = []; }
      sec.innerHTML += rows.length
        ? rows.map((r, i) =>
            `<div class="rrow"><span>${i + 1}. ${r.name}</span><span>${r.score}</span></div>`).join('')
        : '<div class="meta-note">No entries yet.</div>';
      wrap.appendChild(sec);
    }

    const note = document.createElement('p');
    note.className = 'meta-note';
    note.textContent = 'Local board. The remote board slot is wired and empty — see board.js.';
    wrap.appendChild(note);
  }
}

/** Bests per mode, plus per-scroll rows as they come to exist. */
function recordsPanel() {
  const el = document.createElement('div');
  el.className = 'meta-record';
  const day = Profile.today();

  const line = (label, best) =>
    `<div class="rrow"><span>${label}</span><span>${best ? `${best.score} · wave ${best.wave}` : '—'}</span></div>`;

  let html = '<h3>BY FORM</h3>';
  html += line('DAILY SCROLL (today)', Profile.bestFor('daily', day));
  html += line('ENDLESS', Profile.bestFor('free'));
  html += '<h3>BY SCROLL</h3>';
  for (const s of SCROLLS) {
    if (!s.inked) continue;
    html += line(s.label, Profile.bestFor(null, null, s.id));
  }
  el.innerHTML = html;
  return el;
}

/** The bestiary. One slot, rendered as an unfinished brush study. */
function inkRecordPanel() {
  const el = document.createElement('div');
  el.className = 'ink-record';
  const entries = [
    ['鬼', 'ONI STAIN',
     'Closes, plants, and swings once with its whole weight. Its horns brighten before it commits. ' +
     'Solid ink turns it aside, and something thrown hard enough into a set mark stays there.'],
    ['天', 'TENGU STAIN',
     'Keeps its distance and throws. What it throws is not really aimed at you — it is aimed at the floor, ' +
     'and wet enemy ink drags at the feet. Its beak brightens before it looses.'],
  ];
  for (const [kanji, name, line] of entries) {
    const card = document.createElement('div');
    card.className = 'ink-entry';
    card.innerHTML =
      `<div class="ink-kanji">${kanji}</div>` +
      `<div class="ink-body"><div class="ink-name">${name}</div>` +
      `<div class="ink-line">${line}</div></div>`;
    el.appendChild(card);
  }
  const note = document.createElement('p');
  note.className = 'meta-note';
  note.textContent = 'Entries fill in as Stains are met and studied.';
  el.appendChild(note);
  return el;
}

// ----------------------------------------------------------------- OPTIONS

/**
 * PLAYER OPTIONS. Curated, grouped, and the only settings surface a player
 * reaches — the tuning editor is behind `?dev=1` and lives on its own screen.
 */
export class OptionsScreen extends Screen {
  constructor(game) {
    super('screen-options', game);
    this.editor = null;
  }
  back() { this.game.backFromOptions(); }

  show() {
    const body = this.root.querySelector('.options-body');
    if (!this.editor) this.editor = new OptionsEditor(body);
    else this.editor.refresh();

    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('EXPORT PROFILE', () => {
      const blob = new Blob([Profile.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'inkstone-profile.json';
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
    list.appendChild(button('BACK', () => this.game.backFromOptions()));
    super.show();
  }
}

// ----------------------------------------------------------------- CREDITS

export class CreditsScreen extends Screen {
  constructor(game) { super('screen-credits', game); }
  back() { this.game.toTitle(); }

  show() {
    const body = this.root.querySelector('.credits-body');
    body.innerHTML =
      '<p><b>INKSTONE</b> — a scoresmith in ink and paper.</p>' +
      '<p>Design, code and sound: one person and a lot of tuning passes.</p>' +
      '<p>Built with three.js and Tone.js. Every sound in the game is synthesised at runtime; ' +
      'there are no audio assets.</p>' +
      '<p class="meta-note">Ranks, kanji and the seal are the game’s own fiction and are not ' +
      'drawn from any real tradition of calligraphy.</p>';
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('BACK', () => this.game.toTitle()));
    super.show();
  }
}

// ------------------------------------------------------------- PLACEHOLDER

/**
 * A reserved state, rendered as a real screen. PILGRIMAGE uses it today.
 *
 * The alternative — a greyed menu entry that does nothing — leaves a hole in
 * the pad walk that gate FR1 would either have to special-case or miss, and it
 * tells a player nothing about what the slot is for.
 */
export class PlaceholderScreen extends Screen {
  constructor(game, rootId, title, line) {
    super(rootId, game);
    this.title = title;
    this.line = line;
  }
  back() { this.game.toPlaySelect(); }

  show() {
    const body = this.root.querySelector('.placeholder-body');
    body.innerHTML = '';
    body.appendChild(unwrittenPanel(this.title, this.line));
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    list.appendChild(button('BACK', () => this.back()));
    super.show();
  }
}

export { exportPrintPNG };
