/**
 * Score. Per-hit base times a combo multiplier, plus event bonuses.
 *
 * `evaluate(runRecord)` is the V0.6 slot: the real style evaluator (Flow,
 * Variety, Precision, Composition, Control) replaces the body of that method
 * and nothing else has to move. Until then it reports the running total and a
 * breakdown, so RESULTS has something real to show.
 */
import { TUNING } from './tuning.js';
import { EV } from './record.js';

/**
 * Rank seals. Placeholder mapping from score to the existing kanji ramp until
 * V0.6 grades a run properly.
 */
export const STYLE_RANKS = [
  { kanji: '拙', grade: 'D', title: 'CLUMSY', threshold: 0, color: '#991b1b' },
  { kanji: '斬', grade: 'C', title: 'SLASH', threshold: 1200, color: '#c2410c' },
  { kanji: '烈', grade: 'B', title: 'FIERCE', threshold: 3000, color: '#b45309' },
  { kanji: '極', grade: 'A', title: 'MASTER', threshold: 6000, color: '#047857' },
  { kanji: '華', grade: 'S', title: 'FLOURISH', threshold: 11000, color: '#092572' },
  { kanji: '神', grade: 'SS', title: 'DIVINE', threshold: 19000, color: '#6b21a8' },
  { kanji: '天', grade: 'SSS', title: 'HEAVENLY', threshold: 30000, color: '#9f1239' },
];

export function rankForScore(score) {
  let r = STYLE_RANKS[0];
  for (const cand of STYLE_RANKS) if (score >= cand.threshold) r = cand;
  return r;
}

export class Score {
  constructor() {
    this.total = 0;
    this.bestCombo = 0;
    this.hits = 0;
    this.kills = 0;
    this.parries = 0;
    this.splats = 0;
    this.damageTaken = 0;
    this.wavesCleared = 0;
    this.breakdown = { hits: 0, kills: 0, waves: 0, parries: 0, splats: 0, penalty: 0 };
  }

  /** Combo multiplier, capped. */
  multiplier(combo) {
    const S = TUNING.score;
    return Math.min(S.comboMulMax, 1 + Math.max(0, combo - 1) * S.comboMulPerHit);
  }

  onHit(damage, combo) {
    const S = TUNING.score;
    const gain = (S.hitBase + damage * S.hitPerDamage) * this.multiplier(combo);
    this.total += gain;
    this.breakdown.hits += gain;
    this.hits++;
    if (combo > this.bestCombo) this.bestCombo = combo;
    return gain;
  }

  onKill(combo) {
    const gain = TUNING.score.killBonus * this.multiplier(combo);
    this.total += gain;
    this.breakdown.kills += gain;
    this.kills++;
    return gain;
  }

  onParry(combo) {
    const gain = TUNING.score.parryBonus * this.multiplier(combo);
    this.total += gain;
    this.breakdown.parries += gain;
    this.parries++;
    return gain;
  }

  onWallSplat(combo) {
    const gain = TUNING.score.splatBonus * this.multiplier(combo);
    this.total += gain;
    this.breakdown.splats += gain;
    this.splats++;
    return gain;
  }

  onWaveCleared(index) {
    const gain = TUNING.score.waveBonus * (1 + index * TUNING.score.wavePerIndex);
    this.total += gain;
    this.breakdown.waves += gain;
    this.wavesCleared = index + 1;
    return gain;
  }

  onPlayerHurt(damage) {
    const loss = TUNING.score.damagePenalty * damage;
    this.total = Math.max(0, this.total - loss);
    this.breakdown.penalty += loss;
    this.damageTaken += damage;
    return -loss;
  }

  get value() { return Math.round(this.total); }
  get rank() { return rankForScore(this.value); }

  /**
   * V0.6 EVALUATOR SLOT.
   *
   * Replace the body with the real thing — Flow, Variety, Precision,
   * Composition, Control read off the RunRecord — keeping this signature.
   * RESULTS, the profile and the leaderboard all call through here, so nothing
   * downstream needs to change when it lands.
   *
   * @param {import('./record.js').RunRecord} record
   */
  evaluate(record) {
    const out = {
      score: this.value,
      rank: this.rank,
      hits: this.hits,
      kills: this.kills,
      parries: this.parries,
      splats: this.splats,
      bestCombo: this.bestCombo,
      damageTaken: this.damageTaken,
      wavesCleared: this.wavesCleared,
      breakdown: { ...this.breakdown },
      // present but not yet graded — V0.6 fills these in
      flow: null, variety: null, precision: null, composition: null, control: null,
    };
    if (record) {
      out.recordedHits = record.count(EV.HIT);
      out.recordedKills = record.count(EV.KILL);
      out.strokes = record.count(EV.STROKE);   // 0 until V0.3
    }
    return out;
  }
}
