/**
 * The canvas, as pixels.
 *
 * This is a pure *view* of `StrokeRegistry`. It owns no state the sim needs:
 * every frame it reads the live strokes and rewrites one geometry. Nothing
 * here can feed back into the simulation, which is what lets the canvas be
 * deterministic while the renderer runs at whatever rate it likes.
 *
 * One mesh, one draw call, one material. The obvious implementation — a decal
 * mesh per stroke — costs `maxLive` draw calls plus a material each, and the
 * G3.6 budget is 60fps with a full canvas *and* eight enemies. So instead
 * every stroke is sampled into a quad strip and packed into a single
 * pre-allocated buffer, with per-vertex colour carrying the ink's state. The
 * buffers are sized once from `ink.maxLive` and never reallocated; only
 * `drawRange` moves.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { PALETTE, dryBrushTexture } from './materials.js';
import { INK } from '../strokes.js';

/** Samples along a stroke. Straight marks need two; arcs want a curve. */
const SEG_LINE = 2;
const SEG_ARC = 12;
const MAX_SEG = SEG_ARC;

/** Ink colour by owner. The player writes in sumi and vermilion; enemies only smear. */
const INK_SUMI = new THREE.Color(PALETTE.sumi);
const INK_ENEMY = new THREE.Color(0x44403c);

export class InkCanvas {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;

    // Sized for the cap plus headroom, so a raised maxLive at runtime degrades
    // by dropping strokes rather than by throwing.
    this.maxStrokes = Math.max(64, Math.round(TUNING.ink.maxLive * 1.5));
    const maxVerts = this.maxStrokes * MAX_SEG * 2;
    const maxIdx = this.maxStrokes * (MAX_SEG - 1) * 6;

    this.positions = new Float32Array(maxVerts * 3);
    this.colors = new Float32Array(maxVerts * 4);
    this.uvs = new Float32Array(maxVerts * 2);
    this.indices = new Uint32Array(maxIdx);

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 4);
    this.uvAttr = new THREE.BufferAttribute(this.uvs, 2);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.uvAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setAttribute('uv', this.uvAttr);
    this.geo.setIndex(new THREE.BufferAttribute(this.indices, 1));
    this.geo.setDrawRange(0, 0);

    this.mat = new THREE.MeshBasicMaterial({
      map: dryBrushTexture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;   // the canvas is the whole arena
    this.mesh.renderOrder = 2;
    this.mesh.position.y = TUNING.ink.decalHeight;
    this.mesh.rotation.x = -Math.PI / 2;
    scene.add(this.mesh);

    this.drawnStrokes = 0;
    this.drawnTris = 0;
  }

  /** Colour and opacity for a stroke's current lifecycle state. */
  tint(stroke, out) {
    const I = TUNING.ink;
    out.copy(stroke.owner === 'enemy' ? INK_ENEMY : INK_SUMI);
    let a;
    switch (stroke.state) {
      case INK.FRESH: a = I.freshAlpha; break;
      case INK.WET: a = I.wetAlpha; break;
      case INK.SET: a = I.setAlpha; break;
      case INK.DRY: a = I.dryAlpha; break;
      default: a = I.dryAlpha; break;
    }
    // Wet ink is the one state the player has to *act* on, so it is the one
    // state that reads differently rather than merely darker: a touch of the
    // vermilion the strokes were drawn with, so a skate line is findable.
    if (stroke.state === INK.WET && stroke.owner !== 'enemy') {
      out.lerp(new THREE.Color(PALETTE.vermilion), 0.22);
    }
    return a * stroke.alpha;
  }

  /** Sample a stroke into world-space points along its path. */
  samplePath(s, out) {
    out.length = 0;
    if (s.arc) {
      const { cx, cz, r, a0, a1 } = s.arc;
      for (let i = 0; i < SEG_ARC; i++) {
        const t = i / (SEG_ARC - 1);
        const a = a0 + (a1 - a0) * t;
        out.push(cx + Math.sin(a) * r, cz + Math.cos(a) * r);
      }
    } else {
      out.push(s.ax, s.az, s.bx, s.bz);
    }
    return out;
  }

  /**
   * Rebuild the geometry from the registry. Called once per rendered frame.
   * @param {import('../strokes.js').StrokeRegistry|null} registry
   */
  update(registry) {
    if (!registry || !TUNING.ink.enabled) {
      this.geo.setDrawRange(0, 0);
      this.drawnStrokes = 0;
      this.drawnTris = 0;
      return;
    }

    const pos = this.positions;
    const col = this.colors;
    const uv = this.uvs;
    const idx = this.indices;
    const path = this._path || (this._path = []);
    const tint = this._tint || (this._tint = new THREE.Color());

    let v = 0;      // vertex cursor
    let i = 0;      // index cursor
    let drawn = 0;

    for (const s of registry.strokes) {
      if (drawn >= this.maxStrokes) break;
      const alpha = this.tint(s, tint);
      if (alpha <= 0.004) continue;

      this.samplePath(s, path);
      const n = path.length / 2;
      if (n < 2) continue;

      const halfW = s.width * 0.5 * TUNING.ink.widthMul;
      const base = v;

      for (let k = 0; k < n; k++) {
        const x = path[k * 2];
        const z = path[k * 2 + 1];
        // direction along the path, for the perpendicular offset
        const kp = Math.max(0, k - 1);
        const kn = Math.min(n - 1, k + 1);
        let dx = path[kn * 2] - path[kp * 2];
        let dz = path[kn * 2 + 1] - path[kp * 2 + 1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        // perpendicular in the XZ plane
        const px = -dz * halfW;
        const pz = dx * halfW;

        // taper: a brush lifts at both ends rather than stopping square
        const t = n > 2 ? k / (n - 1) : (k === 0 ? 0 : 1);
        const taper = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

        // NOTE: the mesh is rotated -90° about X, so local (x, y) maps to
        // world (x, z). Writing z into the y slot is deliberate.
        pos[v * 3] = x + px * taper;
        pos[v * 3 + 1] = z + pz * taper;
        pos[v * 3 + 2] = 0;
        uv[v * 2] = t; uv[v * 2 + 1] = 0;
        col[v * 4] = tint.r; col[v * 4 + 1] = tint.g; col[v * 4 + 2] = tint.b; col[v * 4 + 3] = alpha;
        v++;

        pos[v * 3] = x - px * taper;
        pos[v * 3 + 1] = z - pz * taper;
        pos[v * 3 + 2] = 0;
        uv[v * 2] = t; uv[v * 2 + 1] = 1;
        col[v * 4] = tint.r; col[v * 4 + 1] = tint.g; col[v * 4 + 2] = tint.b; col[v * 4 + 3] = alpha;
        v++;
      }

      for (let k = 0; k < n - 1; k++) {
        const a = base + k * 2;
        idx[i++] = a; idx[i++] = a + 1; idx[i++] = a + 2;
        idx[i++] = a + 1; idx[i++] = a + 3; idx[i++] = a + 2;
      }
      drawn++;
    }

    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.uvAttr.needsUpdate = true;
    this.geo.index.needsUpdate = true;
    this.geo.setDrawRange(0, i);

    this.drawnStrokes = drawn;
    this.drawnTris = i / 3;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}
