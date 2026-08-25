/**
 * TECHNIQUES — the move list, as data.
 *
 * This is the first real content of The Inkstone, and it is also the first
 * thing that can silently rot: a move gets retuned or renamed in the attack
 * table and the list still shows the old kit. `auditTechniques()` exists so
 * that drift is a test failure rather than a player's confusion — gate FR4
 * runs it against ATTACK_META and expects an empty report.
 *
 * Every row carries a `geometry` slot. When strokes ship in V0.3 each
 * technique gets a little brush diagram of its arc; the slot is here now so
 * the row layout does not have to change to accommodate one later.
 */
import { ATTACK_META, DIR_MOVES } from './combat/attacks.js';
import { Input, ACTION_LABELS } from './input.js';

/**
 * @typedef {Object} Technique
 * @property {string} id
 * @property {string} name
 * @property {string} group      heading it sits under
 * @property {string|null} attack  ATTACK_META key this performs, if any
 * @property {string[]} inputs   how to do it, in plain words
 * @property {string} line       one line on what it is for
 * @property {boolean} unlocked  always true today; the flag is the slot
 * @property {null} geometry     V0.3 stroke diagram slot
 */

/** Actions whose binding is shown live, so a rebind updates the move list. */
const A = (action) => ({ action });

const RAW = [
  // ---------------------------------------------------------------- ground
  {
    id: 'lightChain', name: 'THREE-STROKE FORM', group: 'GROUND',
    attack: 'light1', also: ['light2', 'light3'],
    inputs: [A('light'), '×3'],
    line: 'The base string. Three marks, alternating sumi and vermilion so the run reads as separate strokes.',
  },
  {
    id: 'heavy', name: 'HEAVY STROKE', group: 'GROUND',
    attack: 'heavy',
    inputs: [A('heavy')],
    line: 'Slow to draw, wide to land. Staggers, and carries the ribbon that follows the blade.',
  },
  {
    id: 'launcher', name: 'RISING STROKE', group: 'GROUND',
    attack: 'launcher',
    inputs: [A('launcher')],
    line: 'Lifts a Stain off the ground. Hold to follow it up.',
  },
  // ------------------------------------------------------------------- air
  {
    id: 'airChain', name: 'AIR FORM', group: 'AIR',
    attack: 'airLight1', also: ['airLight2', 'airLight3'],
    inputs: [A('jump'), 'then', A('light'), '×3'],
    line: 'The string, airborne. Keeps a launched Stain up while the count runs.',
  },
  {
    id: 'dive', name: 'FALLING STROKE', group: 'AIR',
    attack: 'dive',
    inputs: [A('heavy'), '(in air)'],
    line: 'Ends the air string downward. Bounces the Stain off the ground.',
  },
  // -------------------------------------------------------------- lock-on
  {
    id: 'stinger', name: 'THRUST', group: 'LOCKED ON',
    attack: 'stinger',
    inputs: ['toward target', '+', A('light')],
    line: 'Closes distance along the lock axis. The step-in that replaced the old global lunge.',
  },
  {
    id: 'highTime', name: 'HIGH TIME', group: 'LOCKED ON',
    attack: 'launcher',
    inputs: ['away from target', '+', A('light')],
    line: 'The rising stroke, called from a retreat rather than a standing start.',
  },
  {
    id: 'splitter', name: 'SPLITTER', group: 'LOCKED ON',
    attack: 'heavy',
    inputs: ['toward target', '+', A('heavy')],
    line: 'The heavy stroke with the step-in attached.',
  },
  // ------------------------------------------------------------- movement
  {
    id: 'dash', name: 'INK STEP', group: 'MOVEMENT',
    attack: null,
    inputs: [A('dash')],
    line: 'A committed step, not a dodge roll. Cancels recovery.',
  },
  {
    id: 'jump', name: 'LEAP', group: 'MOVEMENT',
    attack: null,
    inputs: [A('jump')],
    line: 'Releasing early cuts the arc short.',
  },
  {
    id: 'parry', name: 'TURN THE STROKE', group: 'MOVEMENT',
    attack: null,
    inputs: [A('parry')],
    line: 'Six frames of true parry. Staggers the Stain and opens a free cancel into any attack.',
  },
  {
    id: 'lock', name: 'FIX THE EYE', group: 'MOVEMENT',
    attack: null,
    inputs: [A('lock')],
    line: 'Toggle by default. Locking is what arms the directional strokes above.',
  },
];

/** The table, with the reserved slots filled in. */
export const TECHNIQUES = RAW.map((t) => {
  const meta = t.attack ? ATTACK_META[t.attack] : null;
  return {
    also: [],
    unlocked: true,      // nothing is locked yet; the flag is the slot
    ...t,
    /** Filled in V0.3: the mark this move leaves, or null if it leaves none. */
    ink: meta ? meta.ink : null,
    geometry: meta && meta.ink ? () => strokeDiagram(meta.ink) : null,
  };
});

/** Every ATTACK_META key some technique claims to perform. */
export function coveredAttacks() {
  const set = new Set();
  for (const t of TECHNIQUES) {
    if (t.attack) set.add(t.attack);
    for (const k of t.also) set.add(k);
  }
  return set;
}

/**
 * Gate FR4. Compares the move list against the real kit in both directions:
 * an attack nobody documents, and a technique pointing at an attack that no
 * longer exists.
 * @returns {{missing: string[], phantom: string[], ok: boolean}}
 */
export function auditTechniques() {
  const covered = coveredAttacks();
  const real = new Set(Object.keys(ATTACK_META));
  const missing = [...real].filter((k) => !covered.has(k));
  const phantom = [...covered].filter((k) => !real.has(k));
  // every DIR_MOVES alias must resolve to a real attack too
  for (const [name, key] of Object.entries(DIR_MOVES)) {
    if (!real.has(key)) phantom.push(`${name} -> ${key}`);
  }
  return { missing, phantom, ok: missing.length === 0 && phantom.length === 0 };
}

/**
 * The stroke diagram — the `geometry` slot reserved in V0.2.6, filled in V0.3.
 *
 * Drawn from the same `ink` descriptor the registry uses, so the diagram
 * cannot disagree with the mark the move actually leaves. A move that lays no
 * ink gets an empty box rather than a fake one.
 *
 * @param {object|null} ink  the `ink` block from ATTACK_META
 * @returns {SVGElement|null}
 */
export function strokeDiagram(ink) {
  if (!ink) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-4 -4 8 8');
  svg.setAttribute('class', 'tech-diagram');

  // the character stands at the origin, facing -z (up on the diagram)
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '0.32');
  dot.setAttribute('class', 'td-origin');
  svg.appendChild(dot);

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('class', 'td-stroke');
  path.setAttribute('stroke-width', String(Math.max(0.28, ink.width)));

  // screen y is -z, so a facing of 0 (which is +z in world) points down; the
  // diagram negates z to put "forward" at the top where a reader expects it
  if (ink.kind === 'arc') {
    const mid = ink.tilt || 0;
    const a0 = mid - ink.sweep * 0.5;
    const a1 = mid + ink.sweep * 0.5;
    const pt = (a) => `${(Math.sin(a) * ink.reach).toFixed(2)},${(-Math.cos(a) * ink.reach).toFixed(2)}`;
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    path.setAttribute('d', `M ${pt(a0)} A ${ink.reach} ${ink.reach} 0 ${large} 0 ${pt(a1)}`);
  } else {
    const half = ink.reach * 0.5;
    const off = ink.offset || 0;
    const lat = ink.lateral || 0;
    // forward is -y on the diagram; lateral pushes along +x
    path.setAttribute('d',
      `M ${(-lat).toFixed(2)},${(-(off - half)).toFixed(2)} ` +
      `L ${lat.toFixed(2)},${(-(off + half)).toFixed(2)}`);
  }
  svg.appendChild(path);
  return svg;
}

/** Render a technique's input recipe, resolving bindings live. */
export function describeInputs(t) {
  return t.inputs
    .map((part) => (typeof part === 'string' ? part : Input.describeBinding(part.action)))
    .join(' ');
}

// --------------------------------------------------------------- component

/**
 * The move list as a mountable component, in the SettingsEditor idiom: it owns
 * its DOM, marks its rows `[data-menu-item]` so the screen's one MenuNav walks
 * them, and can be mounted more than once. It appears in The Inkstone and in
 * Pause.
 */
export class TechniqueList {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.build();
  }

  build() {
    this.root.innerHTML = '';
    this.root.classList.add('tech-list');

    let group = null;
    for (const t of TECHNIQUES) {
      if (t.group !== group) {
        group = t.group;
        const h = document.createElement('h3');
        h.className = 'tech-group';
        h.textContent = group;
        this.root.appendChild(h);
      }
      this.root.appendChild(this.row(t));
    }
  }

  row(t) {
    const row = document.createElement('div');
    row.className = `tech-row${t.unlocked ? '' : ' locked'}`;
    row.dataset.technique = t.id;
    row.tabIndex = 0;
    row.setAttribute('data-menu-item', '');

    const geo = document.createElement('div');
    geo.className = 'tech-geo';
    if (t.unlocked && t.geometry) {
      const d = t.geometry();
      if (d) geo.appendChild(d);
    }
    geo.title = t.ink ? `Leaves a ${t.ink.type} stroke` : 'Leaves no mark';

    const body = document.createElement('div');
    body.className = 'tech-body';

    const head = document.createElement('div');
    head.className = 'tech-head';
    const name = document.createElement('span');
    name.className = 'tech-name';
    name.textContent = t.unlocked ? t.name : '— — —';
    const keys = document.createElement('span');
    keys.className = 'tech-keys';
    keys.textContent = t.unlocked ? describeInputs(t) : '';
    head.append(name, keys);

    const line = document.createElement('div');
    line.className = 'tech-line';
    let text = t.unlocked ? t.line : 'Not yet learned.';
    if (t.unlocked && t.ink) {
      text += t.ink.pillar
        ? '  Leaves a heavy mark that sets solid and turns a charge.'
        : `  Leaves a ${t.ink.type} mark.`;
    }
    line.textContent = text;

    body.append(head, line);
    row.append(geo, body);
    return row;
  }

  /** Bindings may have changed since this was built. */
  refresh() {
    for (const row of this.root.querySelectorAll('.tech-row')) {
      const t = TECHNIQUES.find((x) => x.id === row.dataset.technique);
      if (!t || !t.unlocked) continue;
      const keys = row.querySelector('.tech-keys');
      if (keys) keys.textContent = describeInputs(t);
    }
  }
}

/** Used by the run HUD's control hints, so hints and move list cannot disagree. */
export function hintRows() {
  return TECHNIQUES.filter((t) => t.unlocked && t.group !== 'LOCKED ON')
    .map((t) => ({ keys: describeInputs(t), name: t.name }));
}

export { ACTION_LABELS };
