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

function arcGeometry(innerR, outerR, sweep) {
  const key = `${innerR.toFixed(3)}|${outerR.toFixed(3)}|${sweep.toFixed(4)}`;
  let g = geoCache.get(key);
  if (!g) {
    // centred on theta 0 so the per-attack rotation is the only thing aiming it
    g = new THREE.RingGeometry(innerR, outerR, 20, 1, -sweep * 0.5, sweep);
    geoCache.set(key, g);
  }
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
