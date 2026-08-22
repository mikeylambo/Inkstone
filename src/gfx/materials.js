/**
 * Locked art style: 3-step toon ramp, inverted-hull ink outlines,
 * paper grain, vermilion / sumi / parchment. Primitive geometry is a feature.
 */
import * as THREE from 'three';

export const PALETTE = {
  paper: 0xdcd3be,
  paperLight: 0xf5eedc,
  sand: 0xcbc0a9,
  wash: 0x8c806e,
  sumi: 0x1c1917,
  vermilion: 0xb91c1c,
  vermilionDeep: 0x7f1d1d,
  gold: 0xd97706,
  stone: 0x78716c,
};

/** 3-step ramp: deep sumi -> ink wash -> parchment. */
function createSumiRamp() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#221e1a'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#8c806e'; ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#e8dfcb'; ctx.fillRect(2, 0, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Dry-brush stroke used along the sword ribbon. Opaque through the core with
 * ragged bristle edges and a dried-out tail — an earlier version was only
 * opaque across the middle 44% of its height, which made the trail read as a
 * grey smudge instead of ink.
 */
function createBrushTexture() {
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // solid body
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 2, W, H - 4);

  // bristle striations through the body (subtle lightening, still ink)
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.10 + Math.random() * 0.22;
    const y = Math.random() * H;
    ctx.fillRect(Math.random() * 60, y, W, Math.random() * 2.5 + 0.6);
  }
  // ragged edges top and bottom
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    const top = Math.random() < 0.5;
    ctx.fillRect(Math.random() * W, top ? 0 : H - Math.random() * 7,
      Math.random() * 26 + 4, Math.random() * 6 + 1);
  }
  // the stroke runs dry toward the tail (high u)
  for (let i = 0; i < 130; i++) {
    const x = 150 + Math.random() * (W - 150);
    const bias = (x - 150) / (W - 150);
    ctx.globalAlpha = bias * (0.4 + Math.random() * 0.6);
    ctx.fillRect(x, Math.random() * H, Math.random() * 34 + 6, Math.random() * 9 + 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Torn-bristle brush for the SlashFan — the prototype recipe, verbatim:
 * 40 random opaque rects on a transparent field, no solid body. The gaps are
 * the point. `brushTexture` above stays polished and belongs to Ribbon; this
 * one is deliberately cruder and reads as a single struck mark.
 */
function createDryBrushTexture() {
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  // White, not the prototype's near-black: MeshBasicMaterial multiplies map by
  // material.color, so an almost-black texture crushes every trail colour to
  // the same dark smear and the A3 palette can't read. The SHAPE below is the
  // prototype recipe unchanged; only the ink colour moves to material.color.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * H;
    const h = Math.random() * 8 + 2;
    const len = Math.random() * 200 + 50;
    ctx.fillRect(Math.random() * 30, y, len, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Irregular ink blot with a soft bleed edge. Used for pools and splats. */
function createSplatTexture(seed = 1) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#000000';
  const cx = S / 2, cy = S / 2;
  // lobed body
  ctx.beginPath();
  const lobes = 9;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = S * (0.26 + 0.13 * Math.abs(Math.sin(a * 2.7 + seed)) + 0.07 * Math.sin(a * 5.1 + seed * 2));
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // satellite droplets
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = S * (0.3 + Math.random() * 0.18);
    const r = Math.random() * 5 + 1.2;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Subtle fibrous grain for the floor. */
function createPaperTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cbc0a9';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) {
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? 'rgba(58,49,39,0.05)' : 'rgba(255,250,235,0.06)';
    ctx.fillRect(Math.random() * S, Math.random() * S, Math.random() * 14 + 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const sumiRamp = createSumiRamp();
export const brushTexture = createBrushTexture();
export const dryBrushTexture = createDryBrushTexture();
export const paperTexture = createPaperTexture();
export const splatTextures = [createSplatTexture(1), createSplatTexture(3.7), createSplatTexture(8.2)];

const outlineMaterial = new THREE.MeshBasicMaterial({
  color: PALETTE.sumi, side: THREE.BackSide,
});

export function createSumiMaterial(colorHex, emissiveHex = 0x000000, map = null) {
  return new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: sumiRamp,
    emissive: emissiveHex,
    emissiveIntensity: 0.25,
    map,
  });
}

/**
 * Inverted-hull ink outline, specified as a WORLD-SPACE thickness rather than
 * a scale multiplier, so a lantern and a sword blade get the same line weight.
 * Shares one material across the whole scene.
 */
export function addOutline(mesh, thickness = 0.06) {
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const sx = Math.max(1e-3, bb.max.x - bb.min.x);
  const sy = Math.max(1e-3, bb.max.y - bb.min.y);
  const sz = Math.max(1e-3, bb.max.z - bb.min.z);

  const outline = new THREE.Mesh(geo, outlineMaterial);
  outline.scale.set(
    1 + (thickness * 2) / sx,
    1 + (thickness * 2) / sy,
    1 + (thickness * 2) / sz
  );
  outline.renderOrder = -1;
  mesh.add(outline);
  return outline;
}

export function disposeAll(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose?.();
    }
  });
}
