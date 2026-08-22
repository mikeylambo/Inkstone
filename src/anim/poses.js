/**
 * Key-pose animation. Still procedural, still primitives.
 *
 * Poses are joint rotation sets. Attack tracks are authored in PHASE SPACE:
 *   p = 0 .. 1  anticipation
 *   p = 1 .. 2  active
 *   p = 2 .. 3  recovery
 * so retiming an attack in tuning.js retimes the animation for free, and
 * every attack keeps a real anticipation pose.
 */

export const EASE = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  inCubic: (t) => t * t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => 1 + 2.0 * Math.pow(t - 1, 3) + 1.1 * Math.pow(t - 1, 2),
  anticipate: (t) => (t < 0.6 ? EASE.outCubic(t / 0.6) * 1.06 : 1.06 - 0.06 * ((t - 0.6) / 0.4)),
};

const BASE = {
  torso: [0, 0, 0],
  head: [0, 0, 0],
  rArm: [0.2, 0, 0],
  lArm: [-0.2, 0, 0],
  rLeg: [0, 0, 0],
  lLeg: [0, 0, 0],
  sword: [Math.PI / 3, 0, 0],
  y: 0,
};

const P = (o) => ({ ...BASE, ...o });

export const POSES = {
  ready: P({}),

  // --- light 1: horizontal draw-cut, right to left -------------------------
  l1_windup: P({
    torso: [0.04, 0.62, 0], rArm: [-0.65, 1.15, 0.25], lArm: [-0.45, -0.35, 0],
    sword: [0, 0, -1.35], y: 0.04,
  }),
  l1_mid: P({
    torso: [0.10, 0.02, 0], rArm: [-0.55, -0.10, 0.15], lArm: [-0.3, 0.1, 0],
    sword: [0, 0, -1.7], y: -0.04,
  }),
  l1_strike: P({
    torso: [0.16, -0.72, 0], rArm: [-0.42, -1.55, 0.05], lArm: [-0.15, 0.5, 0],
    sword: [0, 0, -1.95], rLeg: [0.30, 0, 0], lLeg: [-0.22, 0, 0], y: -0.10,
  }),
  l1_recover: P({
    torso: [0.06, -0.32, 0], rArm: [-0.15, -0.85, 0], lArm: [-0.2, 0.2, 0],
    sword: [0.4, 0, -1.2], y: -0.02,
  }),

  // --- light 2: return cut, left to right ---------------------------------
  l2_windup: P({
    torso: [0.04, -0.58, 0], rArm: [-0.6, -1.3, -0.2], lArm: [-0.3, 0.4, 0],
    sword: [0, 0, 1.35], y: 0.04,
  }),
  l2_mid: P({
    torso: [0.10, 0.06, 0], rArm: [-0.55, 0.12, 0], lArm: [-0.2, -0.1, 0],
    sword: [0, 0, 1.7], y: -0.04,
  }),
  l2_strike: P({
    torso: [0.18, 0.80, 0], rArm: [-0.4, 1.6, 0], lArm: [-0.1, -0.55, 0],
    sword: [0, 0, 1.95], rLeg: [-0.24, 0, 0], lLeg: [0.32, 0, 0], y: -0.10,
  }),
  l2_recover: P({
    torso: [0.05, 0.34, 0], rArm: [-0.1, 0.9, 0], lArm: [-0.2, -0.2, 0],
    sword: [0.4, 0, 1.15], y: -0.02,
  }),

  // --- heavy family: overhead diagonal chop --------------------------------
  h_windup: P({
    torso: [-0.42, 0.34, 0], rArm: [-2.60, 0.42, 0], lArm: [-1.35, 0.1, 0],
    sword: [-0.55, 0, 0], rLeg: [-0.18, 0, 0], lLeg: [0.14, 0, 0], y: 0.16,
  }),
  h_mid: P({
    torso: [0.10, 0.06, 0], rArm: [-0.75, 0.12, 0], lArm: [-0.35, 0.2, 0],
    sword: [-0.1, 0, 0], rLeg: [0.2, 0, 0], lLeg: [-0.15, 0, 0], y: -0.06,
  }),
  h_strike: P({
    torso: [0.52, -0.22, 0], rArm: [1.05, -0.18, 0], lArm: [0.4, 0.3, 0],
    sword: [0.35, 0, 0], rLeg: [0.55, 0, 0], lLeg: [-0.40, 0, 0], y: -0.30,
  }),
  h_recover: P({
    torso: [0.34, -0.14, 0], rArm: [0.75, -0.1, 0], lArm: [0.15, 0.2, 0],
    sword: [0.6, 0, 0], rLeg: [0.32, 0, 0], lLeg: [-0.22, 0, 0], y: -0.16,
  }),

  // --- launcher: crouch then full vertical extension -----------------------
  lg_windup: P({
    torso: [0.46, 0.18, 0], rArm: [1.45, 0.28, 0], lArm: [0.9, -0.2, 0],
    sword: [0.55, 0, 0], rLeg: [0.42, 0, 0], lLeg: [0.42, 0, 0], y: -0.38,
  }),
  lg_mid: P({
    torso: [0.02, 0.04, 0], rArm: [-1.05, 0.12, 0], lArm: [-0.4, -0.1, 0],
    sword: [0.15, 0, 0], rLeg: [0.1, 0, 0], lLeg: [0.1, 0, 0], y: -0.06,
  }),
  lg_strike: P({
    torso: [-0.55, -0.10, 0], rArm: [-2.85, 0, 0], lArm: [-1.9, 0, 0],
    sword: [-0.25, 0, 0], rLeg: [-0.28, 0, 0], lLeg: [-0.28, 0, 0], y: 0.26,
  }),
  lg_recover: P({
    torso: [-0.22, 0, 0], rArm: [-1.95, 0, 0], lArm: [-1.0, 0, 0],
    sword: [0, 0, 0], y: 0.08,
  }),

  // --- stinger: lock-on gap-closing thrust ---------------------------------
  // Reuses the light-1 family with a hard forward lean and the blade levelled
  // into a thrust rather than a cut.
  st_windup: P({
    torso: [-0.20, 0.40, 0], rArm: [-0.55, 0.85, 0.15], lArm: [-0.5, -0.25, 0],
    sword: [0, 0, -1.1], rLeg: [-0.30, 0, 0], lLeg: [0.22, 0, 0], y: 0.06,
  }),
  st_mid: P({
    torso: [0.35, 0.10, 0], rArm: [-1.15, 0.15, 0], lArm: [-0.5, 0.1, 0],
    sword: [-0.35, 0, -0.2], rLeg: [0.35, 0, 0], lLeg: [-0.30, 0, 0], y: -0.14,
  }),
  st_strike: P({
    torso: [0.62, -0.05, 0], rArm: [-1.45, 0, 0], lArm: [-0.2, 0.45, 0],
    sword: [-0.55, 0, 0], rLeg: [0.70, 0, 0], lLeg: [-0.55, 0, 0], y: -0.26,
  }),
  st_recover: P({
    torso: [0.34, 0, 0], rArm: [-0.9, 0.1, 0], lArm: [-0.3, 0.2, 0],
    sword: [0.1, 0, -0.4], rLeg: [0.34, 0, 0], lLeg: [-0.24, 0, 0], y: -0.10,
  }),

  // --- air ------------------------------------------------------------------
  air_idle: P({
    torso: [0.10, 0, 0], rArm: [-0.45, 0.25, 0], lArm: [-0.55, -0.3, 0],
    rLeg: [-0.35, 0, 0], lLeg: [0.18, 0, 0], sword: [Math.PI / 3, 0, 0],
  }),
  a1_windup: P({
    torso: [0.05, 0.55, 0], rArm: [-0.8, 1.1, 0.2], lArm: [-0.5, -0.3, 0],
    sword: [0, 0, -1.3], rLeg: [-0.3, 0, 0],
  }),
  a1_strike: P({
    torso: [0.2, -0.68, 0], rArm: [-0.5, -1.5, 0], lArm: [-0.2, 0.5, 0],
    sword: [0, 0, -1.9], rLeg: [-0.2, 0, 0], lLeg: [0.25, 0, 0],
  }),
  a2_windup: P({
    torso: [0.05, -0.55, 0], rArm: [-0.75, -1.25, 0], lArm: [-0.35, 0.4, 0],
    sword: [0, 0, 1.3], rLeg: [-0.3, 0, 0],
  }),
  a2_strike: P({
    torso: [0.2, 0.72, 0], rArm: [-0.5, 1.55, 0], lArm: [-0.15, -0.5, 0],
    sword: [0, 0, 1.9], rLeg: [0.25, 0, 0], lLeg: [-0.2, 0, 0],
  }),
  a3_windup: P({
    torso: [-0.3, 0.4, 0], rArm: [-2.3, 0.5, 0], lArm: [-1.2, 0, 0],
    sword: [-0.4, 0, 0], rLeg: [-0.4, 0, 0],
  }),
  a3_strike: P({
    torso: [0.35, -0.3, 0], rArm: [0.6, -0.3, 0], lArm: [0.2, 0.3, 0],
    sword: [0.3, 0, 0], rLeg: [0.35, 0, 0], lLeg: [-0.3, 0, 0],
  }),
  a3_recover: P({
    torso: [0.18, -0.15, 0], rArm: [0.2, -0.2, 0], sword: [0.5, 0, 0],
  }),

  // --- dive -----------------------------------------------------------------
  dive_hang: P({
    torso: [-0.25, 0, 0], rArm: [-2.95, 0, 0], lArm: [-2.6, 0, 0],
    sword: [0, 0, 0], rLeg: [-1.0, 0, 0], lLeg: [-1.0, 0, 0], y: 0.22,
  }),
  dive_fall: P({
    torso: [0.14, 0, 0], rArm: [2.95, 0, 0], lArm: [2.4, 0, 0],
    sword: [0.15, 0, 0], rLeg: [0.15, 0, 0], lLeg: [0.15, 0, 0], y: 0.05,
  }),
  dive_land: P({
    torso: [0.55, 0, 0], rArm: [2.6, 0, 0], lArm: [1.6, 0.4, 0],
    sword: [0.2, 0, 0], rLeg: [0.75, 0, 0], lLeg: [0.75, 0, 0], y: -0.48,
  }),

  // --- utility --------------------------------------------------------------
  dash: P({
    torso: [0.55, 0, 0], rArm: [-1.0, 0.45, 0], lArm: [-1.25, -0.3, 0],
    rLeg: [0.5, 0, 0], lLeg: [-0.45, 0, 0], sword: [0.9, 0, -0.4], y: -0.12,
  }),
  guard: P({
    torso: [0.16, 0.30, 0], rArm: [-0.62, 0.95, 0], lArm: [-0.95, 0.55, 0],
    sword: [0, 0, -1.58], rLeg: [0.2, 0, 0], lLeg: [-0.15, 0, 0], y: -0.14,
  }),
  parry_flash: P({
    torso: [-0.28, 0.45, 0], rArm: [-1.05, 1.25, 0], lArm: [-1.2, 0.7, 0],
    sword: [0, 0, -1.85], y: 0.06,
  }),
  hurt: P({
    torso: [-0.45, 0.12, 0], rArm: [-0.9, 0.4, 0], lArm: [-0.9, -0.4, 0],
    rLeg: [-0.3, 0, 0], lLeg: [0.25, 0, 0], sword: [0.8, 0, -0.5], y: -0.08,
  }),
};

/**
 * Attack tracks in phase space (0..3). Extra keys may sit at fractional
 * positions, e.g. 1.25 = a quarter of the way through the active window.
 */
export const TRACKS = {
  // Structure that makes a connect read: the swing STARTS inside the last
  // slice of anticipation, so by the time the hitbox opens at p = 1.0 the
  // blade is already travelling (the '_mid' pose). Hit-stop then freezes a
  // blade mid-arc with a live trail behind it, instead of freezing one that
  // is still parked over the shoulder.
  light1: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.62, pose: 'l1_windup', ease: 'anticipate' },
    { p: 0.85, pose: 'l1_windup', ease: 'linear' },
    { p: 1.0, pose: 'l1_mid', ease: 'outQuad' },
    { p: 1.55, pose: 'l1_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'l1_strike', ease: 'linear' },
    { p: 3.0, pose: 'l1_recover', ease: 'inOutQuad' },
  ],
  light2: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.62, pose: 'l2_windup', ease: 'anticipate' },
    { p: 0.85, pose: 'l2_windup', ease: 'linear' },
    { p: 1.0, pose: 'l2_mid', ease: 'outQuad' },
    { p: 1.55, pose: 'l2_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'l2_strike', ease: 'linear' },
    { p: 3.0, pose: 'l2_recover', ease: 'inOutQuad' },
  ],
  light3: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.50, pose: 'h_windup', ease: 'anticipate' },
    { p: 0.86, pose: 'h_windup', ease: 'linear' },    // the readable hold
    { p: 1.0, pose: 'h_mid', ease: 'outQuad' },       // already descending
    { p: 1.5, pose: 'h_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'h_strike', ease: 'linear' },
    { p: 3.0, pose: 'h_recover', ease: 'inOutQuad' },
  ],
  heavy: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.45, pose: 'h_windup', ease: 'anticipate' },
    { p: 0.86, pose: 'h_windup', ease: 'linear' },
    { p: 1.0, pose: 'h_mid', ease: 'outQuad' },
    { p: 1.5, pose: 'h_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'h_strike', ease: 'linear' },
    { p: 3.0, pose: 'h_recover', ease: 'inOutQuad' },
  ],
  launcher: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.55, pose: 'lg_windup', ease: 'anticipate' },
    { p: 0.85, pose: 'lg_windup', ease: 'linear' },
    { p: 1.0, pose: 'lg_mid', ease: 'outQuad' },
    { p: 1.5, pose: 'lg_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'lg_strike', ease: 'linear' },
    { p: 3.0, pose: 'lg_recover', ease: 'inOutQuad' },
  ],
  stinger: [
    { p: 0.0, pose: 'ready', ease: 'outCubic' },
    { p: 0.55, pose: 'st_windup', ease: 'anticipate' },
    { p: 0.86, pose: 'st_windup', ease: 'linear' },
    { p: 1.0, pose: 'st_mid', ease: 'outQuad' },
    { p: 1.45, pose: 'st_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'st_strike', ease: 'linear' },
    { p: 3.0, pose: 'st_recover', ease: 'inOutQuad' },
  ],
  airLight1: [
    { p: 0.0, pose: 'air_idle', ease: 'outCubic' },
    { p: 0.68, pose: 'a1_windup', ease: 'anticipate' },
    { p: 0.85, pose: 'a1_windup', ease: 'linear' },
    { p: 1.12, pose: 'a1_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'a1_strike', ease: 'linear' },
    { p: 3.0, pose: 'air_idle', ease: 'inOutQuad' },
  ],
  airLight2: [
    { p: 0.0, pose: 'air_idle', ease: 'outCubic' },
    { p: 0.68, pose: 'a2_windup', ease: 'anticipate' },
    { p: 0.85, pose: 'a2_windup', ease: 'linear' },
    { p: 1.12, pose: 'a2_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'a2_strike', ease: 'linear' },
    { p: 3.0, pose: 'air_idle', ease: 'inOutQuad' },
  ],
  airLight3: [
    { p: 0.0, pose: 'air_idle', ease: 'outCubic' },
    { p: 0.62, pose: 'a3_windup', ease: 'anticipate' },
    { p: 0.86, pose: 'a3_windup', ease: 'linear' },
    { p: 1.10, pose: 'a3_strike', ease: 'outQuint' },
    { p: 2.0, pose: 'a3_strike', ease: 'linear' },
    { p: 3.0, pose: 'a3_recover', ease: 'inOutQuad' },
  ],
};

function lerp(a, b, t) { return a + (b - a) * t; }

function blendInto(out, a, b, t) {
  for (const key of ['torso', 'head', 'rArm', 'lArm', 'rLeg', 'lLeg', 'sword']) {
    const A = a[key], B = b[key], O = out[key];
    O[0] = lerp(A[0], B[0], t);
    O[1] = lerp(A[1], B[1], t);
    O[2] = lerp(A[2], B[2], t);
  }
  out.y = lerp(a.y, b.y, t);
  return out;
}

export function makeScratchPose() {
  return {
    torso: [0, 0, 0], head: [0, 0, 0], rArm: [0, 0, 0], lArm: [0, 0, 0],
    rLeg: [0, 0, 0], lLeg: [0, 0, 0], sword: [0, 0, 0], y: 0,
  };
}

/** Evaluate a phase-space track at p in [0,3]. */
export function evalTrack(track, p, out) {
  let i = 0;
  while (i < track.length - 1 && track[i + 1].p <= p) i++;
  const a = track[i];
  const b = track[Math.min(i + 1, track.length - 1)];
  if (a === b) return blendInto(out, POSES[a.pose], POSES[a.pose], 0);
  const span = Math.max(1e-5, b.p - a.p);
  const raw = Math.min(1, Math.max(0, (p - a.p) / span));
  const t = (EASE[b.ease] || EASE.linear)(raw);
  return blendInto(out, POSES[a.pose], POSES[b.pose], t);
}

export function blendPoses(a, b, t, out) { return blendInto(out, a, b, t); }

/** Push a pose onto the rig's Object3Ds. */
export function applyPose(rig, pose) {
  rig.torso.rotation.set(pose.torso[0], pose.torso[1], pose.torso[2]);
  rig.head.rotation.set(pose.head[0], pose.head[1], pose.head[2]);
  rig.rArm.rotation.set(pose.rArm[0], pose.rArm[1], pose.rArm[2]);
  rig.lArm.rotation.set(pose.lArm[0], pose.lArm[1], pose.lArm[2]);
  rig.rLeg.rotation.set(pose.rLeg[0], pose.rLeg[1], pose.rLeg[2]);
  rig.lLeg.rotation.set(pose.lLeg[0], pose.lLeg[1], pose.lLeg[2]);
  rig.sword.rotation.set(pose.sword[0], pose.sword[1], pose.sword[2]);
  rig.torso.position.y = rig.torsoBaseY + pose.y;
}
