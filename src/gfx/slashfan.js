/**
 * SlashFan — the stylized attack mark.
 *
 * This is a deliberate design choice, not an approximation of a blade sweep.
 * The physically-accurate swept ribbon is correct and it is boring: it arrives
 * *with* the blade, so at the moment of contact there is barely any mark on
 * screen. The prototype instead stamped a big torn arc the instant the button
 * went down, and that stamp is what read as force.
 *
 * So: the fan spawns whole, at full opacity, on the same sim step the attack
 * starts — before any active frame — and fades as one shape. Ribbon still runs
 * alongside it (see trail.js) and remains the right tool for the persistent
 * V0.3 strokes, which do want a real path.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { dryBrushTexture } from './materials.js';

/** Arc geometries are shared across every attack that asks for the same shape. */
const geoCache = new Map();

/**
 * Arc with POLAR uvs: u runs along the sweep, v across the width.
 *
 * THREE.RingGeometry projects uvs planar across the ring's bounding box, so a
 * striped texture cuts straight across the crescent as parallel chords. With
 * u = theta the bristle lines follow the curve of the stroke instead, which is
 * what makes it read as a swept brush mark rather than a printed shape.
 */
function arcGeometry(innerR, outerR, sweep, segments = 48) {
  const key = `${innerR.toFixed(3)}|${outerR.toFixed(3)}|${sweep.toFixed(4)}`;
  let g = geoCache.get(key);
  if (g) return g;

  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = -sweep * 0.5 + sweep * t;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    positions.push(cos * innerR, sin * innerR, 0);
    uvs.push(t, 0);
    positions.push(cos * outerR, sin * outerR, 0);
    uvs.push(t, 1);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  geoCache.set(key, g);
  return g;
}

export class SlashFan {
  constructor(parent) {
    this.material = new THREE.MeshBasicMaterial({
      map: dryBrushTexture,
      color: 0x1c1917,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const d = TUNING.fx.fan.default;
    this.mesh = new THREE.Mesh(arcGeometry(d.innerR, d.outerR, d.sweep), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }

  /** Spec for an attack key, falling back to the shared default. */
  static specFor(key) {
    const F = TUNING.fx.fan;
    return F.perAttack[key] || F.default;
  }

  /**
   * Stamp the mark. Called on the sim step the attack begins — deliberately
   * NOT on the first active frame.
   */
  trigger(attackKey, colorHex) {
    const F = TUNING.fx.fan;
    if (!F.enabled) { this.clear(); return; }
    const spec = SlashFan.specFor(attackKey);
    const s = F.widthScale;

    this.mesh.geometry = arcGeometry(spec.innerR * s, spec.outerR * s, spec.sweep);
    this.mesh.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
    this.mesh.position.set(0, spec.offsetY, 0);
    this.material.color.setHex(colorHex);
    this.material.opacity = F.opacity;
    this.mesh.visible = true;
  }

  /** Fades as one shape — it never redraws or grows. */
  update(dt) {
    if (!this.mesh.visible) return;
    this.material.opacity -= TUNING.fx.fan.fadeRate * dt;
    if (this.material.opacity <= 0) {
      this.material.opacity = 0;
      this.mesh.visible = false;
    }
  }

  clear() {
    this.material.opacity = 0;
    this.mesh.visible = false;
  }

  get visibleOpacity() {
    return this.mesh.visible ? this.material.opacity : 0;
  }
}
