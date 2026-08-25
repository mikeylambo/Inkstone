/**
 * Combat calligraphy — recognising shapes in what you have already drawn.
 *
 * The rule that makes this a *game* mechanic rather than a gesture system:
 * recognition is **relational**, never a stroke's own property. No attack
 * "is a Cross". A Cross is two marks that happen to intersect at an angle,
 * within a window, and it is found by asking the registry about geometry that
 * already exists. That is why the query API was shaped the way it was in V0.3
 * — this is the consumer it was designed for.
 *
 * Everything here is pure geometry over plain numbers and runs inside the
 * fixed step, so recognition is deterministic and a replay draws the same
 * glyphs at the same moments. There is no rng, no time, and no render state.
 *
 * Recognition is *incremental*: only the stroke just laid is tested against
 * the working set. A full pairwise sweep of the canvas every step would be
 * O(n²) per step for no benefit — a glyph can only newly exist if a new mark
 * completed it.
 */
import { TUNING } from './tuning.js';
import { INK } from './strokes.js';

/**
 * @typedef {Object} GlyphDef
 * @property {string} id
 * @property {string} kanji
 * @property {string} label
 * @property {string} line     what it does, in the player's words
 * @property {number} strokes  how many marks it consumes
 */
export const GLYPHS = {
  cross: {
    id: 'cross', kanji: '十', label: 'CROSS', strokes: 2,
    line: 'Two marks that cut across each other. Severs whatever stands at the crossing.',
  },
  enso: {
    id: 'enso', kanji: '〇', label: 'ENSO', strokes: 1,
    line: 'A mark that closes on itself. Draws everything inside it toward the centre and holds.',
  },
  triad: {
    id: 'triad', kanji: '三', label: 'TRIAD', strokes: 3,
    line: 'Three marks laid parallel. Sends a wave along every line at once.',
  },
};

export const GLYPH_ORDER = ['cross', 'enso', 'triad'];

// ------------------------------------------------------------------ geometry

const TAU = Math.PI * 2;

/** Smallest absolute angle between two headings, folded into [0, π/2]. */
function acuteBetween(a, b) {
  let d = Math.abs(a - b) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return d;
}

/** Segment/segment intersection. Returns the point, or null. */
function segIntersect(x1, z1, x2, z2, x3, z3, x4, z4) {
  const d = (x2 - x1) * (z4 - z3) - (z2 - z1) * (x4 - x3);
  if (Math.abs(d) < 1e-9) return null;                 // parallel
  const t = ((x3 - x1) * (z4 - z3) - (z3 - z1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (z2 - z1) - (z3 - z1) * (x2 - x1)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: x1 + t * (x2 - x1), z: z1 + t * (z2 - z1) };
}

/**
 * Where two strokes cross, using their sampled paths rather than their chords.
 * Arcs are curves; testing chords would find crossings that are not on the ink
 * and miss ones that are.
 */
function pathsCross(a, b, bufA, bufB) {
  a.path(bufA, TUNING.glyphs.pathSegments);
  b.path(bufB, TUNING.glyphs.pathSegments);
  for (let i = 0; i + 3 < bufA.length; i += 2) {
    for (let j = 0; j + 3 < bufB.length; j += 2) {
      const hit = segIntersect(
        bufA[i], bufA[i + 1], bufA[i + 2], bufA[i + 3],
        bufB[j], bufB[j + 1], bufB[j + 2], bufB[j + 3]
      );
      if (hit) {
        // local headings at the crossing, so a curve is judged where it meets
        const ha = Math.atan2(bufA[i + 2] - bufA[i], bufA[i + 3] - bufA[i + 1]);
        const hb = Math.atan2(bufB[j + 2] - bufB[j], bufB[j + 3] - bufB[j + 1]);
        return { at: hit, angle: acuteBetween(ha, hb) };
      }
    }
  }
  return null;
}

/**
 * How much of a full turn a set of points covers around a centre, and how
 * ring-like they are. An enso is "the ink goes most of the way round, and
 * stays at roughly one radius".
 */
function ringiness(points, cx, cz) {
  const angles = [];
  let rMin = Infinity;
  let rMax = 0;
  for (let i = 0; i < points.length; i += 2) {
    const dx = points[i] - cx;
    const dz = points[i + 1] - cz;
    const r = Math.hypot(dx, dz);
    if (r < 1e-4) continue;
    rMin = Math.min(rMin, r);
    rMax = Math.max(rMax, r);
    angles.push(Math.atan2(dx, dz));
  }
  if (angles.length < 4) return { coverage: 0, ratio: Infinity, radius: 0 };

  angles.sort((a, b) => a - b);
  // Coverage = a full turn minus the widest gap between consecutive angles.
  // A closed loop has no big gap; a single slash is one huge gap.
  let widest = (angles[0] + TAU) - angles[angles.length - 1];
  for (let i = 1; i < angles.length; i++) {
    widest = Math.max(widest, angles[i] - angles[i - 1]);
  }
  return {
    coverage: Math.max(0, TAU - widest),
    ratio: rMin > 1e-4 ? rMax / rMin : Infinity,
    radius: (rMin + rMax) * 0.5,
  };
}

function centroidOf(points) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < points.length; i += 2) { cx += points[i]; cz += points[i + 1]; n++; }
  return n ? { x: cx / n, z: cz / n } : { x: 0, z: 0 };
}

// --------------------------------------------------------------- recognition

/**
 * Test whether the mark just laid completed a glyph.
 *
 * @param {import('./strokes.js').StrokeRegistry} registry
 * @param {import('./strokes.js').Stroke} fresh  the stroke just created
 * @param {number} step
 * @returns {{def: GlyphDef, strokes: Array, at: {x,z}, radius: number}|null}
 */
export function recognise(registry, fresh, step) {
  const G = TUNING.glyphs;
  if (!G.enabled) return null;
  if (!fresh || fresh.owner !== 'player' || fresh.glyph) return null;

  const pool = registry.unspent(step, G.window, fresh);
  const bufA = [];
  const bufB = [];

  // Order matters: the rarest and most deliberate shape wins a tie. A mark
  // that could read as both a Triad and a Cross should be the Triad, because
  // three parallel marks cannot happen by accident and a crossing can.
  return matchTriad(fresh, pool, G)
      || matchEnso(fresh, pool, G, bufA)
      || matchCross(fresh, pool, G, bufA, bufB);
}

/** 十 — two marks crossing at an angle. */
function matchCross(fresh, pool, G, bufA, bufB) {
  for (const other of pool) {
    const hit = pathsCross(fresh, other, bufA, bufB);
    if (!hit) continue;
    if (hit.angle < G.crossMinAngle) continue;    // too parallel to read as a cross
    return {
      def: GLYPHS.cross,
      strokes: [fresh, other],
      at: hit.at,
      radius: G.crossRadius,
    };
  }
  return null;
}

/**
 * 〇 — ink that closes on itself.
 *
 * One wide arc can do it alone: the falling stroke sweeps a full turn, so a
 * dive draws an Enso by itself. Otherwise a handful of recent marks around a
 * common centre can close the loop between them.
 */
function matchEnso(fresh, pool, G, buf) {
  // single-stroke case: a sweep that is already most of a circle
  if (fresh.arc && Math.abs(fresh.arc.a1 - fresh.arc.a0) >= G.ensoCoverage) {
    return {
      def: GLYPHS.enso,
      strokes: [fresh],
      at: { x: fresh.arc.cx, z: fresh.arc.cz },
      radius: Math.max(G.ensoMinRadius, fresh.arc.r),
    };
  }

  // multi-stroke case: recent marks that between them go round
  const near = pool.filter((s) =>
    Math.hypot(s.midX - fresh.midX, s.midZ - fresh.midZ) <= G.ensoGatherRadius);
  if (!near.length) return null;

  const group = [fresh, ...near].slice(0, G.ensoMaxStrokes);
  const pts = [];
  for (const s of group) {
    s.path(buf, G.pathSegments);
    for (const v of buf) pts.push(v);
  }
  const c = centroidOf(pts);
  const ring = ringiness(pts, c.x, c.z);
  if (ring.coverage < G.ensoCoverage) return null;
  if (ring.ratio > G.ensoRadiusRatio) return null;         // a blob, not a ring
  if (ring.radius < G.ensoMinRadius) return null;

  return { def: GLYPHS.enso, strokes: group, at: c, radius: ring.radius };
}

/**
 * 三 — three straight marks laid parallel and spread apart.
 *
 * Straight only, and deliberately so. An arc's "heading" is its chord, and two
 * swings from different places can easily have parallel chords while curving
 * nowhere near each other — which made a Triad something you got by accident
 * while circling an enemy. Three parallel *lines* cannot happen by accident,
 * which is the whole point of the shape.
 */
function matchTriad(fresh, pool, G) {
  if (fresh.arc) return null;
  const h = fresh.heading;
  const parallel = pool.filter((s) => !s.arc && acuteBetween(s.heading, h) <= G.triadMaxAngle);
  if (parallel.length < 2) return null;

  // nearest two that are genuinely *separate* lines rather than a redrawn one
  const spaced = [];
  for (const s of parallel) {
    const gap = s.distanceTo(fresh.midX, fresh.midZ);
    if (gap < G.triadMinGap || gap > G.triadMaxGap) continue;
    spaced.push({ s, gap });
  }
  if (spaced.length < 2) return null;
  spaced.sort((a, b) => a.gap - b.gap);
  const pick = [spaced[0].s, spaced[1].s];

  // and the two partners must be separate from each other too
  const between = pick[0].distanceTo(pick[1].midX, pick[1].midZ);
  if (between < G.triadMinGap) return null;

  const group = [fresh, ...pick];
  const at = {
    x: (group[0].midX + group[1].midX + group[2].midX) / 3,
    z: (group[0].midZ + group[1].midZ + group[2].midZ) / 3,
  };
  return { def: GLYPHS.triad, strokes: group, at, radius: G.triadRadius };
}

/**
 * Reference rows for The Inkstone. Derived from the same tuning the recogniser
 * reads, so the page cannot describe a shape the game will not accept.
 */
export function glyphReference() {
  const G = TUNING.glyphs;
  const deg = (r) => `${Math.round((r * 180) / Math.PI)}°`;
  return GLYPH_ORDER.map((id) => {
    const def = GLYPHS[id];
    // These lines are verified against the recogniser, not guessed at — see
    // the V0.4 report. Two swings struck from different spots do NOT cross:
    // arcs of the same radius rarely overlap where both sweeps reach.
    let how;
    switch (id) {
      case 'cross':
        how = `A straight mark cut through an arc, meeting at more than ${deg(G.crossMinAngle)}. ` +
              'Finish the light string — its third mark is a line through the first two.';
        break;
      case 'enso':
        how = `Ink that closes ${deg(G.ensoCoverage)} of a turn around one centre. ` +
              'The falling stroke draws one alone; so do two swings struck from opposite sides.';
        break;
      case 'triad':
        how = `Three straight marks within ${deg(G.triadMaxAngle)} of parallel, ` +
              `${G.triadMinGap}–${G.triadMaxGap}m apart. Swings curve and will cross instead.`;
        break;
    }
    return { ...def, how, window: (G.window / TUNING.sim.hz).toFixed(1) };
  });
}
