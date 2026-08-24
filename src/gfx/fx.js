/**
 * Pooled effects. Everything here is driven by the fixed sim step, so it
 * freezes during hit-stop along with the world — which is a large part of
 * why a heavy hit reads as heavy.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { PALETTE, splatTextures } from './materials.js';

const SPARK_GEO = new THREE.BoxGeometry(0.15, 0.15, 0.15);
const PETAL_GEO = new THREE.PlaneGeometry(0.22, 0.22);
const RING_GEO = new THREE.RingGeometry(0.82, 1.0, 32);
const DECAL_GEO = new THREE.PlaneGeometry(1, 1);

export class Fx {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;

    this.sparkMats = {
      sumi: new THREE.MeshBasicMaterial({ color: PALETTE.sumi }),
      vermilion: new THREE.MeshBasicMaterial({ color: PALETTE.vermilion }),
      paper: new THREE.MeshBasicMaterial({ color: PALETTE.paperLight }),
      gold: new THREE.MeshBasicMaterial({ color: PALETTE.gold }),
    };
    this.petalMat = new THREE.MeshBasicMaterial({ color: 0xf9a8d4, side: THREE.DoubleSide });

    this.particles = [];
    this.pool = [];
    this.rings = [];
    this.decals = [];
    this.inkPools = [];
  }

  // ---------------------------------------------------------------- particles

  acquire(geo, mat) {
    let m = this.pool.pop();
    if (!m) {
      m = new THREE.Mesh(geo, mat);
      m.frustumCulled = false;
      this.scene.add(m);
    } else {
      m.geometry = geo;
      m.visible = true;
    }
    m.material = mat;
    m.scale.setScalar(1);
    m.rotation.set(0, 0, 0);
    return m;
  }

  release(p) {
    p.mesh.visible = false;
    this.pool.push(p.mesh);
  }

  spawnParticle(mesh, vel, life, opts = {}) {
    if (this.particles.length >= TUNING.fx.maxParticles) {
      const oldest = this.particles.shift();
      this.release(oldest);
    }
    this.particles.push({ mesh, vel, life, maxLife: life, ...opts });
  }

  /** The standard ink spray on a connect. */
  inkBurst(pos, count = 14, tone = 'sumi', speed = null, dir = null) {
    const sp = speed ?? TUNING.fx.sparkSpeed;
    const mat = this.sparkMats[tone] || this.sparkMats.sumi;
    for (let i = 0; i < count; i++) {
      const m = this.acquire(SPARK_GEO, mat);
      m.position.copy(pos);
      m.position.x += this.rng.spread(0.45);
      m.position.y += this.rng.spread(0.45);
      m.position.z += this.rng.spread(0.45);
      const v = new THREE.Vector3(
        this.rng.spread(sp),
        this.rng.range(sp * 0.15, sp * 0.85),
        this.rng.spread(sp)
      );
      if (dir) v.addScaledVector(dir, sp * 0.7);
      const s = this.rng.range(0.5, 1.6);
      m.scale.setScalar(s);
      this.spawnParticle(m, v, TUNING.fx.sparkLife * this.rng.range(0.7, 1.4), { shrink: 0.9, gravity: 26 });
    }
  }

  /** Directional slash spray — reads as the stroke's follow-through. */
  slashSpray(pos, dir, count = 10) {
    const mat = this.sparkMats.sumi;
    for (let i = 0; i < count; i++) {
      const m = this.acquire(SPARK_GEO, mat);
      m.position.copy(pos);
      m.position.y += this.rng.spread(0.6);
      const v = dir.clone().multiplyScalar(this.rng.range(6, 18));
      v.x += this.rng.spread(3); v.y += this.rng.range(1, 7); v.z += this.rng.spread(3);
      m.scale.setScalar(this.rng.range(0.4, 1.3));
      this.spawnParticle(m, v, TUNING.fx.sparkLife * this.rng.range(0.8, 1.5), { shrink: 0.88, gravity: 22 });
    }
  }

  parryBurst(pos) {
    const n = TUNING.parry.inkBurstCount;
    for (let i = 0; i < n; i++) {
      const tone = i % 3 === 0 ? 'paper' : 'sumi';
      const m = this.acquire(SPARK_GEO, this.sparkMats[tone]);
      m.position.copy(pos);
      const a = (i / n) * Math.PI * 2;
      const sp = this.rng.range(9, 20);
      const v = new THREE.Vector3(Math.cos(a) * sp, this.rng.range(1, 6), Math.sin(a) * sp);
      m.scale.setScalar(this.rng.range(0.6, 1.5));
      this.spawnParticle(m, v, 0.34, { shrink: 0.86, gravity: 16 });
    }
    this.ring(pos.clone().setY(pos.y), 3.4, 0.28, PALETTE.paperLight, 0.9);
  }

  sakura(pos, count = 10) {
    for (let i = 0; i < count; i++) {
      const m = this.acquire(PETAL_GEO, this.petalMat);
      m.position.copy(pos);
      m.position.y += this.rng.range(0, 2.2);
      const v = new THREE.Vector3(this.rng.spread(4), this.rng.range(1, 4), this.rng.spread(4));
      this.spawnParticle(m, v, TUNING.fx.petalLife * this.rng.range(0.8, 1.4), {
        petal: true, gravity: 3.2, spin: this.rng.range(2, 7),
      });
    }
  }

  // -------------------------------------------------------------------- rings

  ring(pos, maxRadius, life, color = PALETTE.sumi, opacity = 0.8, flat = true) {
    const mat = new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, transparent: true, opacity, depthWrite: false,
    });
    const m = new THREE.Mesh(RING_GEO, mat);
    m.position.copy(pos);
    if (flat) m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(0.4);
    m.renderOrder = 4;
    this.scene.add(m);
    this.rings.push({ mesh: m, mat, life, maxLife: life, maxRadius, baseOpacity: opacity });
  }

  shockwave(pos, radius = null, life = null) {
    const r = radius ?? TUNING.fx.shockwaveMaxRadius;
    const l = life ?? TUNING.fx.shockwaveLife;
    this.ring(pos.clone().setY(0.06), r, l, PALETTE.sumi, 0.95);
    this.ring(pos.clone().setY(0.05), r * 0.66, l * 1.25, PALETTE.vermilion, 0.55);
  }

  impactRing(pos, scale = 1.6) {
    this.ring(pos.clone(), scale, TUNING.fx.impactRingLife, PALETTE.sumi, 0.85, false);
  }

  // ------------------------------------------------------------------- decals

  /** Persistent ink pool on death. Seeds the V0.3 canvas. */
  inkPool(pos, radius = null, life = null) {
    const r = radius ?? TUNING.oni.inkPoolRadius;
    const l = life ?? TUNING.oni.inkPoolLife;
    const tex = splatTextures[this.rng.int(0, splatTextures.length)];
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: PALETTE.sumi, transparent: true, opacity: 0.0,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(DECAL_GEO, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = this.rng.range(0, Math.PI * 2);
    m.position.set(pos.x, 0.02 + this.inkPools.length * 0.0008, pos.z);
    m.scale.setScalar(r * 0.3);
    m.renderOrder = 2;
    this.scene.add(m);

    const entry = { mesh: m, mat, life: l, maxLife: l, targetScale: r * 2, grow: 0 };
    this.inkPools.push(entry);
    while (this.inkPools.length > TUNING.fx.maxInkPools) {
      const old = this.inkPools.shift();
      old.life = Math.min(old.life, 0.8); // fade the oldest out early
      this.decals.push(old);
    }
  }

  /** Ink smeared on a lantern / torii when an enemy is splatted into it. */
  wallSplat(pos, normal, radius) {
    const tex = splatTextures[this.rng.int(0, splatTextures.length)];
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: PALETTE.sumi, transparent: true, opacity: 0.92,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(DECAL_GEO, mat);
    m.position.copy(pos).addScaledVector(normal, 0.06);
    m.lookAt(pos.clone().add(normal));
    m.rotateZ(this.rng.range(0, Math.PI * 2));
    m.scale.setScalar(radius * 2);
    m.renderOrder = 3;
    this.scene.add(m);
    this.decals.push({ mesh: m, mat, life: 14, maxLife: 14, targetScale: radius * 2, grow: 1 });
    this.trim();
  }

  /** Ground mark left by a dive slam. */
  groundMark(pos, radius) {
    const tex = splatTextures[this.rng.int(0, splatTextures.length)];
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: PALETTE.sumi, transparent: true, opacity: 0.75,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(DECAL_GEO, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = this.rng.range(0, Math.PI * 2);
    m.position.set(pos.x, 0.03, pos.z);
    m.scale.setScalar(radius * 1.7);
    m.renderOrder = 2;
    this.scene.add(m);
    this.decals.push({ mesh: m, mat, life: 20, maxLife: 20, targetScale: radius * 1.7, grow: 1 });
    this.trim();
  }

  trim() {
    while (this.decals.length > TUNING.fx.maxDecals) {
      const d = this.decals.shift();
      this.scene.remove(d.mesh);
      d.mat.dispose();
    }
  }

  // ------------------------------------------------------------------- update

  update(dt) {
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.gravity) p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.set(0, 0, 0);
      }
      if (p.petal) {
        p.mesh.rotation.x += p.spin * dt;
        p.mesh.rotation.y += p.spin * 0.7 * dt;
      } else if (p.shrink) {
        p.mesh.scale.multiplyScalar(Math.pow(p.shrink, dt * 60));
      }
      if (p.life <= 0) {
        this.release(p);
        this.particles.splice(i, 1);
      }
    }

    // rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const u = 1 - Math.max(0, r.life) / r.maxLife;
      const eased = 1 - Math.pow(1 - u, 3);
      r.mesh.scale.setScalar(0.4 + eased * r.maxRadius);
      r.mat.opacity = r.baseOpacity * (1 - eased);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mat.dispose();
        this.rings.splice(i, 1);
      }
    }

    // ink pools (grow fast, then sit)
    for (let i = this.inkPools.length - 1; i >= 0; i--) {
      const d = this.inkPools[i];
      this.stepDecal(d, dt);
      if (d.life <= 0) { this.killDecal(d); this.inkPools.splice(i, 1); }
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      this.stepDecal(d, dt);
      if (d.life <= 0) { this.killDecal(d); this.decals.splice(i, 1); }
    }
  }

  stepDecal(d, dt) {
    d.life -= dt;
    d.grow = Math.min(1, d.grow + dt * 6);
    const eased = 1 - Math.pow(1 - d.grow, 3);
    d.mesh.scale.setScalar(d.targetScale * (0.3 + 0.7 * eased));
    const fadeIn = Math.min(1, d.grow * 2);
    const fadeOut = Math.min(1, Math.max(0, d.life) / Math.min(3, d.maxLife));
    d.mat.opacity = 0.9 * fadeIn * fadeOut;
  }

  killDecal(d) {
    this.scene.remove(d.mesh);
    d.mat.dispose();
  }

  clear() {
    for (const p of this.particles) this.release(p);
    this.particles.length = 0;
    for (const r of this.rings) { this.scene.remove(r.mesh); r.mat.dispose(); }
    this.rings.length = 0;
    for (const d of this.decals) this.killDecal(d);
    this.decals.length = 0;
    for (const d of this.inkPools) this.killDecal(d);
    this.inkPools.length = 0;
  }

  /**
   * Full teardown. A new Fx is built per run, so the pooled meshes have to
   * leave the scene or every restart leaks a few hundred invisible boxes.
   */
  dispose() {
    this.clear();
    for (const m of this.pool) this.scene.remove(m);
    this.pool.length = 0;
    for (const mat of Object.values(this.sparkMats)) mat.dispose();
    this.petalMat.dispose();
  }

  get liveCount() {
    return this.particles.length + this.rings.length + this.decals.length + this.inkPools.length;
  }
}
