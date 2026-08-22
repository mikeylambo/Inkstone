/**
 * Sword ribbon — replaces the prototype's static ring.
 * Samples the blade tip + hilt each sim step during active frames and
 * builds a dry-brush stroke through the air.
 */
import * as THREE from 'three';
import { brushTexture } from './materials.js';
import { TUNING } from '../tuning.js';

export class Ribbon {
  constructor(scene, { max = 24, color = 0x1c1917, opacity = 1.0 } = {}) {
    this.max = max;
    this.baseOpacity = opacity;
    this.samples = [];

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(max * 2 * 3);
    this.uvs = new Float32Array(max * 2 * 2);
    this.colors = new Float32Array(max * 2 * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

    const idx = new Uint16Array((max - 1) * 6);
    for (let i = 0; i < max - 1; i++) {
      const o = i * 6, v = i * 2;
      idx[o + 0] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2;
      idx[o + 3] = v + 1; idx[o + 4] = v + 3; idx[o + 5] = v + 2;
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);

    this.material = new THREE.MeshBasicMaterial({
      map: brushTexture,
      color,
      transparent: true,
      vertexColors: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.geometry = geo;
  }

  setColor(hex) { this.material.color.setHex(hex); }

  push(tip, hilt) {
    // skip near-duplicate samples: while a pose holds, the blade stops moving
    // and repeated samples only produce degenerate triangles
    const last = this.samples[this.samples.length - 1];
    if (last && last.tip.distanceToSquared(tip) < 1e-4) return;
    this.samples.push({
      tip: tip.clone(),
      hilt: hilt.clone(),
      age: 0,
    });
    if (this.samples.length > this.max) this.samples.shift();
  }

  clear() {
    this.samples.length = 0;
    this.geometry.setDrawRange(0, 0);
  }

  update(dt) {
    const life = TUNING.fx.trailLife;
    for (let i = this.samples.length - 1; i >= 0; i--) {
      this.samples[i].age += dt;
      if (this.samples[i].age > life) this.samples.splice(i, 1);
    }
    this.rebuild(life);
  }

  rebuild(life) {
    const n = this.samples.length;
    if (n < 2) { this.geometry.setDrawRange(0, 0); return; }

    const widthScale = TUNING.fx.trailWidthScale;
    for (let i = 0; i < n; i++) {
      const s = this.samples[i];
      const t = i / (n - 1);              // 0 = oldest tail, 1 = newest head
      const fade = 1 - s.age / life;
      // taper: dry, thin tail; full-bodied head
      const w = (0.25 + 0.75 * t) * widthScale;
      const mid = s.hilt;
      const p = i * 6;
      // hilt edge stays put; tip edge shrinks toward the hilt as it dries
      this.positions[p + 0] = mid.x;
      this.positions[p + 1] = mid.y;
      this.positions[p + 2] = mid.z;
      this.positions[p + 3] = mid.x + (s.tip.x - mid.x) * w;
      this.positions[p + 4] = mid.y + (s.tip.y - mid.y) * w;
      this.positions[p + 5] = mid.z + (s.tip.z - mid.z) * w;

      const u = 1 - t;                     // dry-brush end lands on the tail
      const q = i * 4;
      this.uvs[q + 0] = u; this.uvs[q + 1] = 0;
      this.uvs[q + 2] = u; this.uvs[q + 3] = 1;

      // linear fade, not squared — squaring made the stroke almost invisible
      const alpha = Math.max(0, fade) * this.baseOpacity * (0.72 + 0.28 * t);
      const c = i * 8;
      for (let k = 0; k < 2; k++) {
        this.colors[c + k * 4 + 0] = 1;
        this.colors[c + k * 4 + 1] = 1;
        this.colors[c + k * 4 + 2] = 1;
        this.colors[c + k * 4 + 3] = alpha;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 6);
  }
}
