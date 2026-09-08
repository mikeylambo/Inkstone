/**
 * V0.5 parity contract.
 *
 * This is deliberately renderer-agnostic. The migration is allowed to change
 * menus, storage plumbing and diagnostics, but these facts must stay stable for
 * the same seed + semantic inputs unless a later phase explicitly changes game
 * design.
 */

const round = (n, places = 4) => {
  if (!Number.isFinite(n)) return null;
  const m = 10 ** places;
  return Math.round(n * m) / m;
};

export const PARITY_KEYS = [
  'simHz',
  'seed',
  'runHash',
  'spawnHash',
  'canvasHash',
  'simStep',
  'score',
  'wave',
  'liveStrokes',
  'createdStrokes',
];

export function captureParitySnapshot({ game, World, TUNING }) {
  const run = game?.run || null;
  const record = run?.record || null;
  const player = World?.player || null;
  const strokes = World?.strokes || null;

  return {
    format: 1,
    simHz: TUNING?.sim?.hz ?? null,
    seed: run?.seed ?? run?.config?.seed ?? record?.meta?.seed ?? game?.pendingSummary?.seed ?? null,
    mode: run?.mode ?? game?.pendingSummary?.mode ?? null,
    scroll: run?.config?.scroll ?? game?.pendingSummary?.scroll ?? null,
    runHash: record?.hash?.() ?? game?.pendingSummary?.runHash ?? null,
    spawnHash: record?.spawnHash?.() ?? null,
    canvasHash: strokes?.hash?.() ?? null,
    simStep: run?.step ?? null,
    score: run?.score?.value ?? game?.pendingSummary?.score ?? null,
    wave: run?.waveIndex ?? game?.pendingSummary?.wave ?? null,
    liveStrokes: strokes?.live ?? 0,
    createdStrokes: strokes?.created ?? 0,
    culledStrokes: strokes?.culled ?? 0,
    combo: World?.combo ?? 0,
    hitStop: round(World?.hitStop ?? 0),
    player: player ? {
      x: round(player.position?.x),
      y: round(player.position?.y),
      z: round(player.position?.z),
      hp: round(player.hp),
      state: player.state ?? null,
    } : null,
  };
}

export function compareParitySnapshots(expected, actual, keys = PARITY_KEYS) {
  const mismatches = [];
  for (const key of keys) {
    const a = expected?.[key] ?? null;
    const b = actual?.[key] ?? null;
    if (a !== b) mismatches.push({ key, expected: a, actual: b });
  }
  return {
    ok: mismatches.length === 0,
    checked: [...keys],
    mismatches,
  };
}

export function parityFingerprint(snapshot) {
  let h = 2166136261;
  const canonical = JSON.stringify(PARITY_KEYS.map((key) => [key, snapshot?.[key] ?? null]));
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
