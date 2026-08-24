/**
 * SCROLLS — the mission-select layer.
 *
 * A scroll is a *presentation* of a run: which mode it starts, what the card
 * says, what a best means for it. Free mode used to sit at the top level next
 * to Daily; it belongs here, because "pick a seed" is a scroll you can open,
 * not a peer of the campaign.
 *
 * Two scrolls are real. Three are unwritten — they render as blank paper and
 * cannot be selected, which is the point: the shape of the list is testable on
 * a pad today, and V0.4+ fills the slots without a layout change.
 */

/**
 * Difficulty is reserved. Only STANDARD is selectable; the rest render greyed
 * so the axis is visible without promising anything. The hooks in
 * TUNING.difficulty are wave-table and aggression multipliers on purpose —
 * HP/damage scaling makes a fight longer, not different, and this game is
 * scored on how you fight rather than how long you survive.
 */
export const DIFFICULTIES = {
  unwritten: { id: 'unwritten', label: 'UNWRITTEN', kanji: '白', selectable: false, blurb: 'Reserved.' },
  standard: { id: 'standard', label: 'STANDARD', kanji: '常', selectable: true, blurb: 'The fight as written.' },
  bloodink: { id: 'bloodink', label: 'BLOOD INK', kanji: '朱', selectable: false, blurb: 'Reserved.' },
  master: { id: 'master', label: 'MASTER', kanji: '達', selectable: false, blurb: 'Reserved.' },
  void: { id: 'void', label: 'VOID', kanji: '空', selectable: false, blurb: 'Reserved.' },
};

export const DIFFICULTY_ORDER = ['unwritten', 'standard', 'bloodink', 'master', 'void'];

/**
 * @typedef {Object} Scroll
 * @property {string} id
 * @property {string} label
 * @property {string} kanji
 * @property {string} blurb
 * @property {string} mode        Run mode this starts
 * @property {boolean} inked      false = reserved slot, unselectable
 * @property {boolean} seedEntry  offer a seed field on the card
 * @property {boolean} scored     writes a best / board entry
 */
export const SCROLLS = [
  {
    id: 'endless', label: 'ENDLESS', kanji: '無',
    blurb: 'Waves without end, escalating until you fall. The long form.',
    mode: 'free', inked: true, seedEntry: false, scored: true,
  },
  {
    id: 'freeseed', label: 'FREE SEED', kanji: '種',
    blurb: 'The same escalation on a seed you choose. Enter one to replay a fight exactly.',
    mode: 'free', inked: true, seedEntry: true, scored: true,
  },
  {
    id: 'scroll1', label: 'SCROLL I', kanji: '一',
    blurb: '', mode: null, inked: false, seedEntry: false, scored: false,
  },
  {
    id: 'scroll2', label: 'SCROLL II', kanji: '二',
    blurb: '', mode: null, inked: false, seedEntry: false, scored: false,
  },
  {
    id: 'scroll3', label: 'SCROLL III', kanji: '三',
    blurb: '', mode: null, inked: false, seedEntry: false, scored: false,
  },
];

export function scrollById(id) {
  return SCROLLS.find((s) => s.id === id) || null;
}

/**
 * Per-card data slots. Everything here renders only if the value is non-null,
 * so a card grows sections as systems ship rather than showing empty ones.
 * Nothing populates these yet — that is deliberate, and gate FR1 walks the
 * cards in this state.
 *
 * @returns {{pigment: number|null, inscriptions: {found:number,total:number}|null,
 *            challenges: Array|null, completion: string|null}}
 */
export function scrollProgress(profile, scroll) {
  const p = profile?.progression?.scrolls?.[scroll.id] || null;
  return {
    pigment: p?.pigment ?? null,             // 0..1 — V0.5
    inscriptions: p?.inscriptions ?? null,   // {found, total} — V0.6
    challenges: p?.challenges ?? null,       // [{id,label,done}] — V0.4
    completion: p?.completion ?? null,       // 'cleared' | 'mastered' — V0.4
  };
}
