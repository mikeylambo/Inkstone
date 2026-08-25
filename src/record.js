/**
 * RunRecord — a sim-step-stamped, ring-buffered, serializable log of a run.
 *
 * Nothing reads most of this yet. It exists because four separate things will
 * need it and none of them can reconstruct it after the fact:
 *   - the RESULTS print (reads player path + kills today)
 *   - the stroke registry (V0.3), which writes one event per mark
 *   - V0.6's style evaluator, which grades a run it did not watch
 *   - replay / ghosts, which need the run to be legible, not just repeatable
 *
 * Seed + input log already make a run *reproducible*. This makes it *readable*.
 *
 * V0.2.6 adds two things and no new storage: per-wave aggregates are *derived*
 * from the event stream rather than accumulated alongside it (a second copy of
 * the same truth is a second thing to keep in sync), and the serialised form
 * round-trips exactly — gate FR10 — so the replay viewer that does not exist
 * yet has a format that will not move under it.
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
  STROKE: 9,      // real since V0.3 — one per registry stroke
  POS: 10,
  SPAWN: 11,
  RUN_END: 12,
};

export const EV_NAME = Object.fromEntries(Object.entries(EV).map(([k, v]) => [v, k]));

/** Bumped when the event shape changes, so a stored record knows its own age. */
export const RECORD_FORMAT = 3;

const r2 = (n) => Math.round(n * 100) / 100;

export class RunRecord {
  constructor(cap = TUNING.record.maxEvents) {
    this.cap = Math.max(64, Math.round(cap));
    this.events = [];
    this.dropped = 0;          // how many were pushed out of the ring
    this.posEvery = Math.max(1, Math.round(TUNING.sim.hz / TUNING.record.posSampleHz));
    this.lastPosStep = -1e9;
    /**
     * Run identity. Carried inside the record so a serialised run is
     * self-describing — a replay file that needs a second file to make sense
     * is a file that will be separated from it.
     */
    this.meta = { seed: null, mode: null, scroll: null, day: null, version: null, modifiers: [] };
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
  /** `c` is the stroke count at the moment of the hit — the per-wave best reads it. */
  hit(step, reaction, dmg, pos, combo = 0) {
    return this.push({ t: step, e: EV.HIT, r: reaction, d: dmg, c: combo, x: r2(pos.x), z: r2(pos.z) });
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
   * A stroke, as laid by the registry. `w` is ink weight and `o` is owner, so
   * the print can draw the player's marks and an enemy's splotches with
   * different hands. The shape was reserved in V0.2.5 and is now filled by a
   * real consumer — which is exactly the pressure test the record needed.
   */
  stroke(step, s) {
    return this.push({
      t: step, e: EV.STROKE, s: s.type,
      x: r2(s.ax), z: r2(s.az), x2: r2(s.bx), z2: r2(s.bz),
      w: r2(s.width), o: s.owner === 'enemy' ? 1 : 0,
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

  /**
   * Per-wave aggregates, derived from the stream.
   *
   * Reserved slot (Bayonetta grades every verse, not just the chapter). The
   * numbers are real today; `grade` stays null until the V0.6 evaluator can
   * fill it, and RESULTS renders the column blank rather than inventing one.
   *
   * @returns {Array<{wave, startStep, endStep, timeSeconds, hits, kills,
   *                  damageTaken, damageDealt, parries, bestCombo, grade}>}
   */
  waveStats() {
    const hz = TUNING.sim.hz;
    const out = [];
    let cur = null;

    const open = (waveIndex, step) => {
      cur = {
        wave: waveIndex + 1, startStep: step, endStep: step, timeSeconds: 0,
        hits: 0, kills: 0, damageTaken: 0, damageDealt: 0, parries: 0,
        bestCombo: 0, grade: null,
      };
      out.push(cur);
    };

    for (const e of this.events) {
      if (e.e === EV.WAVE) { open(e.w, e.t); continue; }
      if (!cur) continue;
      cur.endStep = e.t;
      switch (e.e) {
        case EV.HIT:
          cur.hits++;
          cur.damageDealt += e.d || 0;
          if ((e.c || 0) > cur.bestCombo) cur.bestCombo = e.c || 0;
          break;
        case EV.KILL: cur.kills++; break;
        case EV.PLAYER_HURT: cur.damageTaken += e.d || 0; break;
        case EV.PARRY: cur.parries++; break;
      }
    }

    for (const w of out) w.timeSeconds = Math.max(0, (w.endStep - w.startStep) / hz);
    return out;
  }

  // ---------------------------------------------------------- serialisation

  /**
   * Canonical form. Key order is fixed and every field is a plain value, so
   * `stringify(toJSON())` is stable — gate FR10 compares exactly that across a
   * save/load/save cycle.
   */
  toJSON() {
    return {
      format: RECORD_FORMAT,
      meta: {
        seed: this.meta.seed ?? null,
        mode: this.meta.mode ?? null,
        scroll: this.meta.scroll ?? null,
        day: this.meta.day ?? null,
        version: this.meta.version ?? null,
        modifiers: (this.meta.modifiers || []).map((m) => ({
          id: m.id, label: m.label ?? null, scoreMul: m.scoreMul ?? 1,
        })),
      },
      cap: this.cap,
      dropped: this.dropped,
      events: this.events,
    };
  }

  /** Rebuild a record from `toJSON()` output. */
  static fromJSON(data) {
    const rec = new RunRecord(data?.cap ?? TUNING.record.maxEvents);
    if (!data) return rec;
    rec.cap = data.cap ?? rec.cap;
    rec.dropped = data.dropped ?? 0;
    rec.events = Array.isArray(data.events) ? data.events.map((e) => ({ ...e })) : [];
    const m = data.meta || {};
    rec.meta = {
      seed: m.seed ?? null,
      mode: m.mode ?? null,
      scroll: m.scroll ?? null,
      day: m.day ?? null,
      version: m.version ?? null,
      modifiers: (m.modifiers || []).map((x) => ({ ...x })),
    };
    // a loaded record is a document, not a live log; keep the sampler quiet
    rec.lastPosStep = rec.events.length ? rec.events[rec.events.length - 1].t : -1e9;
    return rec;
  }

  /** Gate FR10, as a function so it can be run from anywhere. */
  static roundTripsCleanly(rec) {
    const a = JSON.stringify(rec.toJSON());
    const b = JSON.stringify(RunRecord.fromJSON(JSON.parse(a)).toJSON());
    return { ok: a === b, bytes: a.length };
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
