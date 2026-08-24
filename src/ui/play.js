/**
 * PLAY_SELECT, SCROLL_SELECT and the reserved WAVE_CHOICE.
 *
 * PLAY_SELECT is the fork the whole frame exists to support: Pilgrimage (the
 * campaign endgame) and Scrolls (the scoresmith endgame) sit as peers, and
 * only one of them is built. Reserving the slot in the menu rather than in a
 * design document is what keeps the second endgame cheap to add later.
 */
import { Screen, button, unwrittenPanel } from './screen.js';
import { SCROLLS, DIFFICULTIES, DIFFICULTY_ORDER, scrollProgress } from '../scrolls.js';
import { Profile } from '../profile.js';
import { MODES, dailySeed } from '../run.js';
import { TUNING } from '../tuning.js';

// ------------------------------------------------------------- PLAY_SELECT

export class PlaySelectScreen extends Screen {
  constructor(game) { super('screen-play', game); }
  back() { this.game.toTitle(); }

  show() {
    const list = this.root.querySelector('.menu-list');
    list.innerHTML = '';
    const day = Profile.today();

    // Reserved, but reachable. A locked menu entry is a dead end for a pad
    // walk; a placeholder screen is a slot you can see the shape of.
    list.appendChild(button('PILGRIMAGE', () => this.game.toPilgrimage(), {
      html: '<span class="menu-kanji">巡</span><span class="menu-label">PILGRIMAGE</span>',
      sub: 'Unwritten',
      className: 'reserved',
    }));

    list.appendChild(button('SCROLLS', () => this.game.toScrollSelect(), {
      html: '<span class="menu-kanji">巻</span><span class="menu-label">SCROLLS</span>',
      sub: 'Endless, Free Seed, and the scrolls yet to be inked',
    }));

    list.appendChild(button('KATA', () => this.game.toRunSetup('kata'), {
      html: '<span class="menu-kanji">型</span><span class="menu-label">KATA</span>',
      sub: 'Practice. One Stain, endlessly replaced. Not scored.',
    }));

    const best = Profile.bestFor('daily', day);
    list.appendChild(button('DAILY SCROLL', () => this.game.toRunSetup('daily'), {
      html: '<span class="menu-kanji">日</span><span class="menu-label">DAILY SCROLL</span>',
      sub: `One seed for everyone, until UTC midnight  —  ${best ? `Best ${best.score} · wave ${best.wave}` : 'No record yet'}`,
    }));

    list.appendChild(button('BACK', () => this.game.toTitle()));
    this.root.querySelector('.play-foot').textContent = `Today's seed: ${dailySeed(day)}`;
    super.show();
  }
}

// ----------------------------------------------------------- SCROLL_SELECT

export class ScrollSelectScreen extends Screen {
  constructor(game) { super('screen-scrolls', game); }
  back() { this.game.toPlaySelect(); }

  show() {
    const list = this.root.querySelector('.scroll-list');
    list.innerHTML = '';
    for (const s of SCROLLS) list.appendChild(this.card(s));

    this.renderDifficulty();

    const menu = this.root.querySelector('.menu-list');
    menu.innerHTML = '';
    menu.appendChild(button('BACK', () => this.game.toPlaySelect()));
    super.show();
  }

  /**
   * One scroll card. The reserved data slots — pigment, inscriptions,
   * challenges — render only when they hold something, so a card gains
   * sections as systems ship instead of showing a row of zeroes today.
   */
  card(s) {
    const el = document.createElement('div');
    el.className = `scroll-card${s.inked ? '' : ' unwritten-card'}`;
    el.dataset.scroll = s.id;

    if (!s.inked) {
      el.appendChild(unwrittenPanel(s.label, 'This scroll is not yet inked.'));
      return el;
    }

    el.tabIndex = 0;
    el.setAttribute('data-menu-item', '');
    el.onclick = () => this.game.startScroll(s.id);

    const head = document.createElement('div');
    head.className = 'scroll-head';
    head.innerHTML = `<span class="scroll-kanji">${s.kanji}</span><span class="scroll-label">${s.label}</span>`;

    const blurb = document.createElement('div');
    blurb.className = 'scroll-blurb';
    blurb.textContent = s.blurb;

    const stats = document.createElement('div');
    stats.className = 'scroll-stats';
    const best = Profile.bestFor(null, null, s.id);
    const row = (k, v) => `<span class="sc-k">${k}</span><span class="sc-v">${v}</span>`;
    stats.innerHTML =
      row('BEST', best ? best.score : '—') +
      row('WAVE', best ? best.wave : '—') +
      row('TIME', best && best.timeSeconds ? fmtTime(best.timeSeconds) : '—') +
      row('SEAL', best && best.rank ? best.rank : '—');

    el.append(head, blurb, stats);

    // --- reserved slots: render only if data exists ---
    const p = scrollProgress(Profile.data, s);
    if (p.pigment != null) {
      const bar = document.createElement('div');
      bar.className = 'scroll-pigment';
      bar.innerHTML = `<span>PIGMENT</span><div class="bar"><div class="bar-fill" style="width:${Math.round(p.pigment * 100)}%"></div></div>`;
      el.appendChild(bar);
    }
    if (p.inscriptions) {
      const ins = document.createElement('div');
      ins.className = 'scroll-inscriptions';
      ins.textContent = `INSCRIPTIONS  ${p.inscriptions.found} / ${p.inscriptions.total}`;
      el.appendChild(ins);
    }
    if (p.challenges && p.challenges.length) {
      const ch = document.createElement('div');
      ch.className = 'scroll-challenges';
      ch.innerHTML = p.challenges
        .map((c) => `<div class="ch${c.done ? ' done' : ''}">${c.done ? '✓' : '·'} ${c.label}</div>`)
        .join('');
      el.appendChild(ch);
    }

    if (s.seedEntry) {
      const seedRow = document.createElement('div');
      seedRow.className = 'scroll-seed';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'seed-input';
      input.placeholder = 'seed (blank = random)';
      input.value = this.game.freeSeed || '';
      input.setAttribute('data-menu-item', '');
      input.addEventListener('change', () => { this.game.freeSeed = input.value.trim(); });
      // clicking the field must not also launch the scroll
      input.addEventListener('click', (e) => e.stopPropagation());
      seedRow.appendChild(input);
      el.appendChild(seedRow);
    }

    return el;
  }

  /** The difficulty axis, visible and almost entirely disabled. */
  renderDifficulty() {
    const row = this.root.querySelector('.difficulty-row');
    row.innerHTML = '<span class="diff-title">DIFFICULTY</span>';
    for (const id of DIFFICULTY_ORDER) {
      const d = DIFFICULTIES[id];
      const b = document.createElement('button');
      b.className = `diff-btn${TUNING.difficulty.current === id ? ' active' : ''}${d.selectable ? '' : ' locked'}`;
      b.innerHTML = `<span class="diff-kanji">${d.kanji}</span><span>${d.label}</span>`;
      b.title = d.blurb;
      if (d.selectable) {
        b.setAttribute('data-menu-item', '');
        b.onclick = () => { TUNING.difficulty.current = id; this.renderDifficulty(); this.nav.refocus(this.nav.index); };
      } else {
        b.disabled = true;
      }
      row.appendChild(b);
    }
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ------------------------------------------------------------- WAVE_CHOICE

/**
 * Reserved (Hades). A run that offers a choice between waves enters this state
 * instead of resting; nothing offers one yet, so normal runs pass straight
 * through and this is reachable only under `frame.waveChoiceEnabled`.
 *
 * The shell is real so the *shape* of the decision is testable: three cards,
 * pad-navigable, one pick, back to the fight. Glyph, pigment and modifier
 * offers land in these cards in V0.4+.
 */
export class WaveChoiceScreen extends Screen {
  constructor(game) {
    super('screen-wavechoice', game);
    this.offers = [];
  }
  back() { this.pick(null); }

  /** @param {Array<{id,label,kanji,line}>} offers */
  setOffers(offers) { this.offers = offers || []; }

  show() {
    const list = this.root.querySelector('.choice-list');
    list.innerHTML = '';
    const offers = this.offers.length ? this.offers : DUMMY_OFFERS;
    for (const o of offers) {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.tabIndex = 0;
      card.setAttribute('data-menu-item', '');
      card.innerHTML =
        `<div class="choice-kanji">${o.kanji}</div>` +
        `<div class="choice-label">${o.label}</div>` +
        `<div class="choice-line">${o.line}</div>`;
      card.onclick = () => this.pick(o);
      list.appendChild(card);
    }
    super.show();
  }

  pick(offer) {
    this.game.resolveWaveChoice(offer);
  }
}

/** Only ever seen under the dev flag. Deliberately says what it is. */
const DUMMY_OFFERS = [
  { id: 'dev-a', label: 'RESERVED', kanji: '一', line: 'A glyph offer lands here in V0.4.' },
  { id: 'dev-b', label: 'RESERVED', kanji: '二', line: 'A pigment offer lands here in V0.5.' },
  { id: 'dev-c', label: 'RESERVED', kanji: '三', line: 'A run modifier lands here in V0.4.' },
];

export { MODES };
