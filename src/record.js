/**
 * RunRecord — a sim-step-stamped, ring-buffered, serializable log of a run.
 *
 * Nothing reads most of this yet. It exists because four separate things will
 * need it and none of them can reconstruct it after the fact:
 *   - the RESULTS print (reads player path + kills today)
 *   - V0.3's stroke registry, which will want to cross-check its strokes
 *   - V0.6's style evaluator, which grades a run it did not watch
 *   - replay / ghosts, which need the run to be legible, not just repeatable
 *
 * Seed + input log already make a run *reproducible*. This makes it *readable*.
 */
import { TUNING } from './tuning.js';

/** Event type codes. Numeric so the serialized form stays small. */
export const EV = {
  ATTACK_START: 1,
  HIT: 2,
  KILL: 3,
  PLAYER_HURT: 4,
  DASH: 5,
  PARRY: 6,
  JUMP: 7,
  WAVE: 8,
  STROKE: 9,      // placeholder — V0.3 fills this with the real stroke registry
  POS: 10,
  SPAWN: 11,
  RUN_END: 12,
};

export const EV_NAME = Object.fromEntries(Object.entries(EV).map(([k, v]) => [v, k]));

const r2 = (n) => Math.round(n * 100) / 100;

export class RunRecord {
  constructor(cap = TUNING.record.maxEvents) {
    this.cap = Math.max(64, Math.round(cap));
    this.events = [];
    this.dropped = 0;          // how many were pushed out of the ring
    this.posEvery = Math.max(1, Math.round(TUNING.sim.hz / TUNING.record.posSampleHz));
    this.lastPosStep = -1e9;
  }

  /** Ring push. Oldest events fall off once the cap is reached. */
  push(ev) {
    this.events.push(ev);
    if (this.events.length > this.cap) {
      this.events.shift();
      this.dropped++;
    }
    return ev;
  }

  // --------------------------------------------------------------- writers

  attackStart(step, key) { return this.push({ t: step, e: EV.ATTACK_START, key }); }
  hit(step, reaction, dmg, pos) {
    return this.push({ t: step, e: EV.HIT, r: reaction, d: dmg, x: r2(pos.x), z: r2(pos.z) });
  }
  kill(step, pos) { return this.push({ t: step, e: EV.KILL, x: r2(pos.x), z: r2(pos.z) }); }
  playerHurt(step, dmg, pos) {
    return this.push({ t: step, e: EV.PLAYER_HURT, d: dmg, x: r2(pos.x), z: r2(pos.z) });
  }
  dash(step, pos) { return this.push({ t: step, e: EV.DASH, x: r2(pos.x), z: r2(pos.z) }); }
  parry(step, pos) { return this.push({ t: step, e: EV.PARRY, x: r2(pos.x), z: r2(pos.z) }); }
  jump(step, pos) { return this.push({ t: step, e: EV.JUMP, x: r2(pos.x), z: r2(pos.z) }); }
  wave(step, index) { return this.push({ t: step, e: EV.WAVE, w: index }); }
  spawn(step, kind, pos) {
    return this.push({ t: step, e: EV.SPAWN, k: kind, x: r2(pos.x), z: r2(pos.z) });
  }
  runEnd(step, reason) { return this.push({ t: step, e: EV.RUN_END, why: reason }); }

  /**
   * V0.3 slot. The stroke registry will call this for every stroke it creates;
   * the shape is fixed now so the print and the evaluator can be written
   * against it before the registry exists.
   */
  strokePlaceholder(step, type, from, to) {
    return this.push({
      t: step, e: EV.STROKE, s: type,
      x: r2(from.x), z: r2(from.z), x2: r2(to.x), z2: r2(to.z),
    });
  }

  /** Player position, sampled at record.posSampleHz rather than every step. */
  samplePos(step, pos) {
    if (step - this.lastPosStep < this.posEvery) return null;
    this.lastPosStep = step;
    return this.push({ t: step, e: EV.POS, x: r2(pos.x), z: r2(pos.z) });
  }

  // --------------------------------------------------------------- readers

  filter(type) { return this.events.filter((e) => e.e === type); }
  get path() { return this.filter(EV.POS); }
  get kills() { return this.filter(EV.KILL); }
  get hurts() { return this.filter(EV.PLAYER_HURT); }

  count(type) {
    let n = 0;
    for (const e of this.events) if (e.e === type) n++;
    return n;
  }

  // ---------------------------------------------------------- serialisation

  toJSON() {
    return { cap: this.cap, dropped: this.dropped, events: this.events };
  }

  /** FNV-1a over a canonical serialisation. */
  static hashOf(events) {
    let h = 2166136261;
    for (const e of events) {
      const s = JSON.stringify(e);
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  hash() { return RunRecord.hashOf(this.events); }

  /**
   * Hash of just the spawn/wave stream. Gate S3 asks whether the same seed
   * produces the same fight, which is a question about spawns — not about
   * whatever the player happened to do in response.
   */
  spawnHash() {
    return RunRecord.hashOf(this.events.filter((e) => e.e === EV.SPAWN || e.e === EV.WAVE));
  }
}
