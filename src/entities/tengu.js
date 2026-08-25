/**
 * Enemy 2 — Tengu Stain.
 *
 * The oni asks "where are you standing"; the tengu asks "where are you going".
 * It holds at range instead of closing, and what it throws does not really
 * want to hit you — it wants to land near you and *stain the floor*, because
 * a wet enemy splotch drags you to 62% speed and the oni is already walking in.
 *
 * That is the whole reason enemy 2 is a ranged enemy in the phase that adds a
 * canvas: it is the first thing in the game that writes on the canvas *against*
 * you, and it makes your own ink worth reading.
 *
 * Telegraph discipline is deliberately identical to the oni — flare grows over
 * a windup, colour shifts past the halfway point, one committed active window,
 * a long recovery you can punish. A new enemy should be new information, not a
 * new set of rules for reading information.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { World } from '../world.js';
import { Audio } from '../audio.js';
import { PALETTE, createSumiMaterial, addOutline } from '../gfx/materials.js';

const OUTLINE = 0.07;

const _v = new THREE.Vector3();

const BODY_GEO = new THREE.ConeGeometry(0.82, 1.9, 5);
const WING_GEO = new THREE.PlaneGeometry(1.5, 0.9);
const BEAK_GEO = new THREE.ConeGeometry(0.2, 0.75, 4);
const FLARE_GEO = new THREE.RingGeometry(0.6, 0.84, 20);
const SHOT_GEO = new THREE.SphereGeometry(0.34, 8, 6);

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * A thrown blot. A sim object: it moves in the fixed step and its landing
 * point is a pure function of where it was thrown from, so a replay puts the
 * splotch in the same place.
 */
export class InkShot {
  constructor(scene, from, dir) {
    const T = TUNING.tengu;
    this.scene = scene;
    this.position = from.clone();
    this.prevPosition = this.position.clone();
    this.vel = dir.clone().multiplyScalar(T.projectileSpeed);
    this.life = T.projectileLife;
    this.done = false;

    this.mat = new THREE.MeshBasicMaterial({ color: PALETTE.sumi });
    this.mesh = new THREE.Mesh(SHOT_GEO, this.mat);
    this.mesh.position.copy(this.position);
    addOutline(this.mesh, OUTLINE);
    scene.add(this.mesh);
  }

  update(dt) {
    if (this.done) return;
    this.prevPosition.copy(this.position);
    this.life -= dt;

    this.vel.y -= TUNING.player.gravity * 0.35 * dt;
    this.position.addScaledVector(this.vel, dt);

    const p = World.player;
    if (p && !p.dead) {
      const d = Math.hypot(this.position.x - p.position.x, this.position.z - p.position.z);
      const dy = Math.abs(this.position.y - (p.position.y + p.height * 0.5));
      if (d < TUNING.tengu.projectileRadius + p.radius && dy < 1.4) {
        this.burst(true);
        return;
      }
    }

    if (this.position.y <= 0.05 || this.life <= 0) this.burst(false);
  }

  /** Land: stain the floor, and only damage on a direct hit. */
  burst(direct) {
    if (this.done) return;
    this.done = true;
    const T = TUNING.tengu;
    const run = World.run;
    const at = this.position.clone();
    at.y = 0;

    if (run && run.strokes) {
      // a splotch is a short, fat, ownerless-looking mark — monochrome by
      // design so the player's vermilion stays the eye's anchor
      const r = TUNING.ink.splotchRadius;
      const s = run.strokes.create({
        type: 'puncture', owner: 'enemy', slows: true,
        width: r * 2,
        ax: at.x - r * 0.35, az: at.z,
        bx: at.x + r * 0.35, bz: at.z,
      }, run.step);
      if (s) run.onStroke(s);
    }

    World.fx.inkBurst(at.clone().setY(0.25), 14, 'sumi', 6);
    Audio.impact('light1');

    if (direct) {
      const p = World.player;
      if (p && p.invuln <= 0 && p.iframes <= 0) {
        _v.subVectors(p.position, at); _v.y = 0;
        if (_v.lengthSq() < 1e-6) _v.set(1, 0, 0);
        p.takeHit(T.damage, _v.normalize());
      }
    }
  }

  applyInterpolation(alpha) {
    if (this.done) return;
    this.mesh.position.lerpVectors(this.prevPosition, this.position, alpha);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => { if (o.isMesh && o.material !== this.mat) o.material?.dispose?.(); });
    this.mat.dispose();
  }
}

export class Tengu {
  constructor(scene, x, z) {
    const T = TUNING.tengu;
    this.scene = scene;
    this.kind = 'tengu';
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(x, 0, z);
    this.prevPosition = this.position.clone();
    this.vel = new THREE.Vector3();
    this.facing = 0;
    this.prevFacing = 0;

    this.hp = T.maxHp;
    this.maxHp = T.maxHp;
    this.dead = false;
    this.grounded = true;
    this.radius = T.radius;
    this.height = T.height;

    this.state = 'idle';    // idle | approach | windup | swing | recover | dead
    this.stateTimer = 0;
    this.cooldown = T.aggroDelay;

    this.hitstun = 0;
    this.reactionTimer = 0;
    this.flashTimer = 0;
    this.squash = 0;
    this.spin = 0;
    this.juggleCount = 0;
    this.hangBonus = 0;
    this.splatArmed = false;
    this.pinned = false;
    this.splatTimer = 0;
    this.splatNormal = new THREE.Vector3(1, 0, 0);
    this.deathTimer = 0;
    this.bob = 0;
    // the rest of the interface hits.js resolves against — one shape for every
    // enemy, so a new Stain needs no special case in the hit resolver
    this.bounceArmed = false;
    this.lastReaction = null;

    this.build();
    scene.add(this.mesh);
    this.mesh.position.copy(this.position);
  }

  build() {
    this.bodyMat = createSumiMaterial(PALETTE.sumi);
    this.body = new THREE.Mesh(BODY_GEO, this.bodyMat);
    this.body.position.y = 1.15;
    this.body.castShadow = true;
    addOutline(this.body, OUTLINE);
    this.mesh.add(this.body);

    this.beakMat = createSumiMaterial(PALETTE.vermilion);
    const beak = new THREE.Mesh(BEAK_GEO, this.beakMat);
    beak.position.set(0, 1.35, 0.62);
    beak.rotation.x = Math.PI / 2;
    addOutline(beak, OUTLINE);
    this.mesh.add(beak);

    const wingMat = createSumiMaterial(PALETTE.sumi);
    wingMat.side = THREE.DoubleSide;
    this.wings = new THREE.Group();
    for (const sgn of [-1, 1]) {
      const w = new THREE.Mesh(WING_GEO, wingMat);
      w.position.set(sgn * 0.85, 1.35, -0.1);
      w.rotation.y = sgn * 0.5;
      this.wings.add(w);
    }
    this.mesh.add(this.wings);

    this.flare = new THREE.Mesh(FLARE_GEO, new THREE.MeshBasicMaterial({
      color: PALETTE.vermilion, side: THREE.DoubleSide,
      transparent: true, opacity: 0, depthWrite: false,
    }));
    this.flare.rotation.x = -Math.PI / 2;
    this.flare.position.y = 0.06;
    this.flare.renderOrder = 3;
    this.mesh.add(this.flare);
  }

  // ---------------------------------------------------------------- update

  update(dt, playerPos) {
    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;

    if (this.dead) { this.deathTimer += dt; return; }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.vel.x *= 0.88; this.vel.z *= 0.88;
    } else {
      this.think(dt, playerPos);
    }

    // gravity + floor
    if (!this.grounded || this.position.y > 0) {
      this.vel.y -= TUNING.player.gravity * dt;
    }
    this.position.addScaledVector(this.vel, dt);
    if (this.position.y <= 0) { this.position.y = 0; this.vel.y = 0; this.grounded = true; }

    // arena bound
    const d = Math.hypot(this.position.x, this.position.z);
    const lim = TUNING.player.arenaRadius - 0.6;
    if (d > lim) {
      this.position.x *= lim / d;
      this.position.z *= lim / d;
    }

    this.bob += dt;
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 3);
  }

  think(dt, playerPos) {
    const T = TUNING.tengu;
    if (this.cooldown > 0) this.cooldown -= dt;

    _v.subVectors(playerPos, this.position); _v.y = 0;
    const dist = _v.length();
    const want = dist > 1e-4 ? Math.atan2(_v.x, _v.z) : this.facing;

    switch (this.state) {
      case 'windup': {
        this.stateTimer += dt;
        this.facing += angleDelta(want, this.facing) * Math.min(1, T.turnRate * 0.5 * dt);
        const u = Math.min(1, this.stateTimer / T.windup);
        // same telegraph grammar as the oni: flare grows, colour shifts late
        this.flare.material.opacity = 0.22 + 0.55 * u;
        this.flare.scale.setScalar(0.5 + T.flareMaxScale * u);
        this.vel.x *= 0.88; this.vel.z *= 0.88;
        if (this.stateTimer >= T.windup) {
          this.state = 'swing';
          this.stateTimer = 0;
          this.flare.material.opacity = 0;
          this.throwShot(playerPos);
        }
        break;
      }
      case 'swing':
        this.stateTimer += dt;
        this.vel.x *= 0.86; this.vel.z *= 0.86;
        if (this.stateTimer >= T.active) { this.state = 'recover'; this.stateTimer = 0; }
        break;

      case 'recover':
        this.stateTimer += dt;
        this.vel.x *= 0.9; this.vel.z *= 0.9;
        if (this.stateTimer >= T.recovery) {
          this.state = 'approach';
          this.stateTimer = 0;
          this.cooldown = T.cooldown;
        }
        break;

      default: {
        this.state = 'approach';
        this.facing += angleDelta(want, this.facing) * Math.min(1, T.turnRate * dt);

        // hold a ring: close if too far, back off if the player closes
        let target = 0;
        if (dist > T.preferredRange + T.rangeSlack) target = 1;
        else if (dist < T.retreatRange) target = -1;

        if (target !== 0) {
          const dir = _v.normalize().multiplyScalar(T.moveSpeed * target);
          this.vel.x += (dir.x - this.vel.x) * Math.min(1, T.accel * dt / T.moveSpeed);
          this.vel.z += (dir.z - this.vel.z) * Math.min(1, T.accel * dt / T.moveSpeed);
        } else {
          this.vel.x *= 0.85; this.vel.z *= 0.85;
          if (this.cooldown <= 0) {
            this.state = 'windup';
            this.stateTimer = 0;
            this.flare.scale.setScalar(0.5);
            Audio.enemyWindup(T.windup);
          }
        }
        break;
      }
    }
  }

  /**
   * Lead the player a little, so standing still is punished and moving is not
   * automatically safe. Deterministic: no rng, just current velocity.
   */
  throwShot(playerPos) {
    const T = TUNING.tengu;
    const run = World.run;
    if (!run) return;

    const p = World.player;
    const lead = p ? Math.min(0.55, Math.hypot(p.vel.x, p.vel.z) / 40) : 0;
    _v.set(
      playerPos.x + (p ? p.vel.x * lead : 0) - this.position.x,
      0.6,
      playerPos.z + (p ? p.vel.z * lead : 0) - this.position.z
    );
    const flat = Math.hypot(_v.x, _v.z);
    _v.y = flat * 0.16;          // gentle lob, so it reads as thrown ink
    _v.normalize();

    const from = this.position.clone();
    from.y = 1.4;
    run.addProjectile(new InkShot(this.scene, from, _v));
    Audio.enemySwing();
  }

  // -------------------------------------------------------------- reactions

  /** Same shape as the oni's, so hits.js needs no special case. */
  queueRank() { return 0; }

  checkSplatSurfaces() { /* tengu does not wall-splat: it is light and it flies */ }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = 0;
    this.vel.set(0, 0, 0);
    World.fx.inkBurst(this.position.clone().setY(1.0), 22, 'sumi', 10);
    World.fx.inkPool(this.position, TUNING.oni.inkPoolRadius * 0.7);
    Audio.impact('splat');
    World.run?.onKill(this.position);
  }

  applyInterpolation(alpha) {
    const T = TUNING.tengu;
    this.mesh.position.lerpVectors(this.prevPosition, this.position, alpha);
    this.mesh.rotation.y = this.prevFacing + angleDelta(this.facing, this.prevFacing) * alpha;

    if (this.dead) {
      const u = Math.min(1, this.deathTimer / T.deathTime);
      this.mesh.scale.setScalar(Math.max(0.001, 1 - u));
      this.mesh.position.y -= u * 0.6;
      return;
    }

    // hover bob, and a wing beat that speeds up during the windup
    const beat = this.state === 'windup' ? 15 : 7;
    this.mesh.position.y += 0.35 + Math.sin(this.bob * 3.1) * 0.12;
    const flap = Math.sin(this.bob * beat) * 0.55;
    this.wings.children[0].rotation.z = flap;
    this.wings.children[1].rotation.z = -flap;

    const fs = TUNING.access.flashScale;
    const flashing = this.flashTimer > 0 && fs > 0;
    this.bodyMat.emissive.setHex(flashing ? TUNING.reactions.hitFlashColor : 0x000000);
    this.bodyMat.emissiveIntensity = flashing ? fs : 0.0;

    // high-contrast tells: the beak is the tell, same rule as the oni's horns
    const hc = TUNING.access.highContrast === 1;
    if (this.state === 'windup') {
      const u = Math.min(1, this.stateTimer / T.windup);
      this.beakMat.color.setHex(u > 0.5 ? (hc ? 0xfacc15 : 0xfca5a5) : (hc ? 0x1c1917 : PALETTE.vermilion));
    } else {
      this.beakMat.color.setHex(hc ? 0x1c1917 : PALETTE.vermilion);
    }

    const sq = this.squash;
    this.mesh.scale.set(1 + sq * 0.4, 1 - sq * 0.5, 1 + sq * 0.4);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); }
    });
  }
}
