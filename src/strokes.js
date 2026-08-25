/**
 * The stroke registry — the canvas, as simulation.
 *
 * A stroke is a **sim object**, not a render object. It is created inside the
 * fixed step from (attacker position, facing, attack type) and nothing else,
 * so two runs on the same seed with the same inputs produce the same canvas —
 * gate G3.4. The render layer reads this state and draws decals from it; it
 * never feeds anything back. In particular a stroke is *never* derived from
 * ribbon vertices: the ribbon is a render-time trail sampled by distance
 * travelled, so deriving from it would make the canvas a function of frame
 * rate, and replay would drift.
 *
 * Everything here is plain numbers. No THREE objects, no rng — the geometry is
 * fully determined by the arguments, which is what makes `hash()` meaningful.
 *
 * The query API is deliberately shaped for a consumer that does not exist yet:
 * V0.4's relational glyph recognition needs "what is near here", "what is of
 * this type", and "within this time window" — so `strokesNear` and `byType`
 * both take a window, even though nothing passes one today.
 */
import { TUNING } from './tuning.js';

/**
 * Ink lifecycle. A stroke walks these in order and is removed at the end.
 * The names are the fiction and the mechanic at once: wet ink is slippery,
 * set ink is solid, dry ink is only a mark.
 */
export const INK = {
  FRESH: 'fresh',
  WET: 'wet',
  SET: 'set',
  DRY: 'dry',
  FADED: 'faded',
};

export const INK_ORDER = [INK.FRESH, INK.WET, INK.SET, INK.DRY, INK.FADED];

/** Stroke shapes. `arc` is a swept slash; the rest are straight marks. */
export const STROKE_TYPES = ['horizontal', 'vertical', 'diagonal', 'arc', 'puncture'];

const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * One mark on the canvas.
 *
 * Straight strokes use (ax,az)→(bx,bz). Arcs use a centre, radius and angle
 * span; `a`/`b` are still filled in as the arc's endpoints so every consumer —
 * the record, the print, the query API — can treat a stroke as a segment
 * without caring which kind it is.
 */
export class Stroke {
  constructor(id, cfg, bornStep) {
    this.id = id;
    this.type = cfg.type;
    this.owner = cfg.owner || 'player';   // 'player' | 'enemy'
    this.width = cfg.width ?? 0.5;
    this.pillar = !!cfg.pillar;           // blocks a charge while SET or DRY
    this.slows = !!cfg.slows;             // enemy splotch: slows the player while WET
    this.sourceKey = cfg.sourceKey || null;

    this.arc = cfg.arc || null;           // {cx, cz, r, a0, a1}
    if (this.arc) {
      const { cx, cz, r, a0, a1 } = this.arc;
      this.ax = cx + Math.sin(a0) * r;
      this.az = cz + Math.cos(a0) * r;
      this.bx = cx + Math.sin(a1) * r;
      this.bz = cz + Math.cos(a1) * r;
    } else {
      this.ax = cfg.ax; this.az = cfg.az;
      this.bx = cfg.bx; this.bz = cfg.bz;
    }

    this.bornStep = bornStep;
    this.age = 0;
    this.state = INK.FRESH;
    this.alpha = 1;          // render weight, driven by state
    this.dying = false;      // culled early by the readability cap
  }

  get length() { return Math.hypot(this.bx - this.ax, this.bz - this.az); }
  get midX() { return (this.ax + this.bx) * 0.5; }
  get midZ() { return (this.az + this.bz) * 0.5; }

  /**
   * Shortest distance from a point to this stroke's actual path.
   *
   * Arcs measure against the curve, not the chord. A wide slash's chord runs
   * well inside its curve — up to `r(1 - cos(sweep/2))` away, which for the
   * heavy is about 1.1 m — so chord-distance would put the collision somewhere
   * the player can plainly see there is no ink. Skating has to agree with what
   * is on screen or it reads as a broken mechanic.
   */
  distanceTo(px, pz) {
    if (this.arc) {
      const { cx, cz, r, a0, a1 } = this.arc;
      const dx = px - cx;
      const dz = pz - cz;
      const d = Math.hypot(dx, dz);
      if (d < 1e-6) return r;
      // the stroke's own angle convention: x = sin(a), z = cos(a)
      const ang = Math.atan2(dx, dz);
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      // bring `ang` into the same revolution as the span before comparing
      let a = ang;
      while (a < lo - Math.PI) a += Math.PI * 2;
      while (a > lo + Math.PI) a -= Math.PI * 2;
      if (a >= lo && a <= hi) return Math.abs(d - r);
      // outside the sweep: nearest endpoint
      return Math.min(
        Math.hypot(px - this.ax, pz - this.az),
        Math.hypot(px - this.bx, pz - this.bz)
      );
    }

    const dx = this.bx - this.ax;
    const dz = this.bz - this.az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return Math.hypot(px - this.ax, pz - this.az);
    let t = ((px - this.ax) * dx + (pz - this.az) * dz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - (this.ax + dx * t), pz - (this.az + dz * t));
  }

  /** Is a point within this stroke's ink, including its width? */
  covers(px, pz, pad = 0) {
    return this.distanceTo(px, pz) <= this.width * 0.5 + pad;
  }

  /** The shape the RunRecord stores, and the print draws. */
  toRecord() {
    return {
      type: this.type,
      from: { x: this.ax, z: this.az },
      to: { x: this.bx, z: this.bz },
    };
  }
}

export class StrokeRegistry {
  constructor() {
    this.strokes = [];
    this.nextId = 1;
    this.created = 0;     // lifetime count, for the debug readout
    this.culled = 0;      // removed early by the readability cap
  }

  get live() { return this.strokes.length; }

  /**
   * Lay a stroke. Returns it, or null when ink is switched off.
   * @param {object} cfg  see Stroke
   * @param {number} step current sim step
   */
  create(cfg, step) {
    if (!TUNING.ink.enabled) return null;
    const s = new Stroke(this.nextId++, cfg, step);
    this.strokes.push(s);
    this.created++;
    this.enforceCap();
    return s;
  }

  /**
   * Readability cap. Past `maxLive` the oldest strokes are pushed into their
   * fade early rather than popped, so the canvas thins out instead of
   * flickering — a mark vanishing under the player's feet reads as a bug.
   */
  enforceCap() {
    const cap = Math.max(1, Math.round(TUNING.ink.maxLive));
    let excess = this.strokes.length - cap;
    if (excess <= 0) return;
    for (const s of this.strokes) {
      if (excess <= 0) break;
      if (s.dying) continue;
      s.dying = true;
      this.culled++;
      excess--;
    }
  }

  /** Durations, after the player's lifecycle-speed setting. */
  phaseDurations() {
    const I = TUNING.ink;
    const k = Math.max(0.05, I.lifecycleScale);
    return {
      fresh: I.freshTime * k,
      wet: I.wetTime * k,
      set: I.setTime * k,
      dry: I.dryTime * k,
      fade: I.fadeTime * k,
    };
  }

  /** One fixed sim step. Ages every stroke and retires the faded ones. */
  update(dt) {
    const d = this.phaseDurations();
    const tWet = d.fresh;
    const tSet = tWet + d.wet;
    const tDry = tSet + d.set;
    const tFade = tDry + d.dry;
    const tGone = tFade + d.fade;

    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i];
      // a stroke culled by the cap ages faster instead of vanishing
      s.age += dt * (s.dying ? TUNING.ink.cullSpeedMul : 1);

      if (s.age < tWet) { s.state = INK.FRESH; s.alpha = 1; }
      else if (s.age < tSet) { s.state = INK.WET; s.alpha = 1; }
      else if (s.age < tDry) { s.state = INK.SET; s.alpha = 0.92; }
      else if (s.age < tFade) { s.state = INK.DRY; s.alpha = 0.72; }
      else if (s.age < tGone) {
        s.state = INK.FADED;
        s.alpha = 0.72 * (1 - (s.age - tFade) / Math.max(1e-4, d.fade));
      } else {
        this.strokes.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------- queries
  //
  // Shaped for V0.4's relational glyph checks (Cross / Enso / Triad), which
  // need to ask "what marks are near this one, laid within this window".

  /**
   * @param {{x:number,z:number}} pos
   * @param {number} radius
   * @param {{window?:number, step?:number, owner?:string, states?:string[]}} [opts]
   *        `window` is in sim steps and needs `step` to mean anything.
   */
  strokesNear(pos, radius, opts = {}) {
    const out = [];
    for (const s of this.strokes) {
      if (opts.owner && s.owner !== opts.owner) continue;
      if (opts.states && !opts.states.includes(s.state)) continue;
      if (opts.window != null && opts.step != null && (opts.step - s.bornStep) > opts.window) continue;
      if (s.distanceTo(pos.x, pos.z) <= radius + s.width * 0.5) out.push(s);
    }
    return out;
  }

  /** @param {string|string[]} type */
  byType(type, opts = {}) {
    const want = Array.isArray(type) ? type : [type];
    const out = [];
    for (const s of this.strokes) {
      if (!want.includes(s.type)) continue;
      if (opts.owner && s.owner !== opts.owner) continue;
      if (opts.states && !opts.states.includes(s.state)) continue;
      if (opts.window != null && opts.step != null && (opts.step - s.bornStep) > opts.window) continue;
      out.push(s);
    }
    return out;
  }

  /** Strokes whose ink actually covers a point. */
  coveringPoint(pos, pad = 0, opts = {}) {
    const out = [];
    for (const s of this.strokes) {
      if (opts.owner && s.owner !== opts.owner) continue;
      if (opts.states && !opts.states.includes(s.state)) continue;
      if (s.covers(pos.x, pos.z, pad)) out.push(s);
    }
    return out;
  }

  /**
   * Set/Dry pillar strokes, as circular splat surfaces.
   *
   * The oni's wall-splat already understands `{position, radius, height}`, so
   * a solid mark presents itself in that shape rather than adding a second
   * collision path. One splat implementation, two sources.
   */
  pillarSurfaces(out = []) {
    out.length = 0;
    if (!TUNING.ink.pillarsEnabled) return out;
    const R = TUNING.ink.pillarRadius;
    for (const s of this.strokes) {
      if (!s.pillar) continue;
      if (s.state !== INK.SET && s.state !== INK.DRY) continue;
      out.push({
        position: { x: s.midX, y: 0, z: s.midZ },
        radius: R,
        height: TUNING.ink.pillarHeight,
        stroke: s,
      });
    }
    return out;
  }

  /** Gate G3.4. FNV-1a over the canonical geometry of every live stroke. */
  hash() {
    let h = 2166136261;
    const put = (str) => {
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
    };
    for (const s of this.strokes) {
      put(`${s.id}|${s.type}|${s.owner}|${s.pillar ? 1 : 0}|` +
          `${r3(s.ax)},${r3(s.az)},${r3(s.bx)},${r3(s.bz)}|${s.bornStep}|${s.state}`);
    }
    put(`#${this.created}/${this.culled}`);
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  clear() {
    this.strokes.length = 0;
  }
}

/**
 * Build stroke geometry from an attacker and an authored descriptor.
 *
 * Kept here rather than in the player so the tengu (and anything later) lays
 * ink through the same function — one geometry authority, one thing to reason
 * about when replay disagrees.
 *
 * @param {{x:number,z:number}} pos  attacker position
 * @param {number} facing            radians
 * @param {object} g                 the `ink` block from ATTACK_META
 */
export function strokeFromAttack(pos, facing, g, extra = {}) {
  const fwd = { x: Math.sin(facing), z: Math.cos(facing) };
  const right = { x: Math.cos(facing), z: -Math.sin(facing) };
  const ox = pos.x + fwd.x * (g.offset || 0);
  const oz = pos.z + fwd.z * (g.offset || 0);

  if (g.kind === 'arc') {
    // `tilt` swings the whole arc off the facing axis. This is what makes a
    // two-hit string cross itself rather than repaint the same line: merely
    // reversing the sweep direction draws an identical arc backwards.
    const mid = facing + (g.tilt || 0);
    return {
      type: g.type || 'arc',
      arc: {
        cx: pos.x, cz: pos.z,
        r: g.reach,
        a0: mid - g.sweep * 0.5,
        a1: mid + g.sweep * 0.5,
      },
      width: g.width, ...extra,
    };
  }

  // straight mark: `lateral` tilts it off the facing axis so a diagonal reads
  // as a diagonal rather than a forward poke
  const half = g.reach * 0.5;
  const lx = right.x * (g.lateral || 0);
  const lz = right.z * (g.lateral || 0);
  return {
    type: g.type,
    ax: ox - fwd.x * half - lx, az: oz - fwd.z * half - lz,
    bx: ox + fwd.x * half + lx, bz: oz + fwd.z * half + lz,
    width: g.width, ...extra,
  };
}
