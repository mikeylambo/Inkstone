/**
 * Enemy 1 — Oni Stain. The bully target: it exists so the player has
 * something satisfying to hit for ten minutes (gate G2.1).
 *
 * Every hit reaction class lives here: flinch / stagger / launch / juggle /
 * ground-bounce / wall-splat.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { World } from '../world.js';
import { Audio } from '../audio.js';
import { PALETTE, createSumiMaterial, addOutline } from '../gfx/materials.js';
import { resolveEnemyAttack, wallSplat } from '../combat/hits.js';

/** World-space ink line weight on the oni. */
const OUTLINE = 0.085;

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

const BODY_GEO = new THREE.OctahedronGeometry(1.15, 0);
const HORN_GEO = new THREE.ConeGeometry(0.3, 0.95, 4);
const CLUB_GEO = new THREE.BoxGeometry(0.42, 2.0, 0.42);
const FLARE_GEO = new THREE.RingGeometry(0.72, 1.0, 24);

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Oni {
  constructor(scene, x, z) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(x, 0, z);
    this.prevPosition = this.position.clone();
    this.vel = new THREE.Vector3();
    this.facing = 0;
    this.prevFacing = 0;

    this.hp = TUNING.oni.maxHp;
    this.maxHp = TUNING.oni.maxHp;
    this.dead = false;
    this.grounded = true;

    this.state = 'idle';     // idle | approach | windup | swing | recover | dead
    this.stateTimer = 0;
    this.cooldown = TUNING.oni.aggroDelay;

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
    this.splatNormal = new THREE.Vector3(0, 0, 1);
    this.bounceArmed = false;
    this.lastReaction = '—';
    this.swingResolved = false;
    this.deathTimer = 0;
    this.bob = World.rng ? World.rng.range(0, Math.PI * 2) : 0;

    this.buildModel();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  get radius() { return TUNING.oni.radius; }
  get height() { return TUNING.oni.height; }

  buildModel() {
    // No base emissive: adding vermilion on top of a near-black base turned
    // the whole body dark red and pushed the oni off the locked palette.
    // The body is ink; vermilion belongs on the horns.
    const bodyMat = createSumiMaterial(0x262220);
    this.bodyMat = bodyMat;

    this.body = new THREE.Mesh(BODY_GEO, bodyMat);
    this.body.position.y = 1.45;
    this.body.castShadow = true;
    addOutline(this.body, OUTLINE);
    this.mesh.add(this.body);

    const hornMat = new THREE.MeshBasicMaterial({ color: PALETTE.vermilion });
    this.hornMat = hornMat;
    const hl = new THREE.Mesh(HORN_GEO, hornMat);
    hl.position.set(-0.52, 0.92, 0.1); hl.rotation.z = -0.42;
    const hr = new THREE.Mesh(HORN_GEO, hornMat);
    hr.position.set(0.52, 0.92, 0.1); hr.rotation.z = 0.42;
    this.body.add(hl, hr);

    // paper mask — makes facing readable at a glance
    const mask = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.58, 0.1),
      createSumiMaterial(PALETTE.paperLight)
    );
    mask.position.set(0, 0.06, 0.92);
    addOutline(mask, OUTLINE);
    this.body.add(mask);
    const eyeMat = new THREE.MeshBasicMaterial({ color: PALETTE.sumi });
    for (const ex of [-0.19, 0.19]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.05), eyeMat);
      eye.position.set(ex, 0.07, 0.08);
      mask.add(eye);
    }

    // club arm
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0.95, 1.9, 0);
    this.mesh.add(this.armPivot);
    const club = new THREE.Mesh(CLUB_GEO, createSumiMaterial(0x44403c));
    club.position.y = -1.0;
    club.castShadow = true;
    addOutline(club, OUTLINE);
    this.armPivot.add(club);
    this.armPivot.rotation.x = 0.5;

    // telegraph flare
    this.flare = new THREE.Mesh(FLARE_GEO, new THREE.MeshBasicMaterial({
      color: PALETTE.vermilion, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
    }));
    this.flare.rotation.x = -Math.PI / 2;
    this.flare.position.y = 0.06;
    this.flare.renderOrder = 3;
    this.mesh.add(this.flare);
  }

  // ------------------------------------------------------------------ step

  update(dt, playerPos) {
    if (this.dead) { this.stepDeath(dt); return; }

    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.reactionTimer > 0) this.reactionTimer -= dt;
    this.squash *= Math.pow(0.0025, dt);   // settle back fast but not instantly

    if (this.pinned) { this.stepSplat(dt); this.syncMesh(); this.animate(dt); return; }

    if (this.hitstun > 0) {
      this.hitstun -= dt;
      this.state = 'hitstun';
      this.swingResolved = false;
      this.flare.material.opacity = 0;
    } else {
      this.think(dt, playerPos);
    }

    this.integrate(dt);
    this.syncMesh();
    this.animate(dt);
  }

  think(dt, playerPos) {
    const O = TUNING.oni;
    if (this.cooldown > 0) this.cooldown -= dt;

    _v.subVectors(playerPos, this.position); _v.y = 0;
    const dist = _v.length();
    const want = dist > 1e-4 ? Math.atan2(_v.x, _v.z) : this.facing;

    switch (this.state) {
      case 'windup': {
        this.stateTimer += dt;
        // keep turning slowly during the wind-up so it stays threatening
        this.facing += angleDelta(want, this.facing) * Math.min(1, O.turnRate * 0.35 * dt);
        const u = Math.min(1, this.stateTimer / O.windup);
        this.flare.material.opacity = 0.20 + 0.55 * u;
        this.flare.scale.setScalar(0.4 + O.flareMaxScale * u);
        if (this.stateTimer >= O.windup) {
          this.state = 'swing';
          this.stateTimer = 0;
          this.swingResolved = false;
          this.flare.material.opacity = 0;
          Audio.enemySwing();
        }
        break;
      }
      case 'swing': {
        this.stateTimer += dt;
        if (!this.swingResolved) {
          if (resolveEnemyAttack(this, World.player)) this.swingResolved = true;
        }
        if (this.stateTimer >= O.active) { this.state = 'recover'; this.stateTimer = 0; }
        break;
      }
      case 'recover': {
        this.stateTimer += dt;
        if (this.stateTimer >= O.recovery) {
          this.state = 'approach';
          this.stateTimer = 0;
          this.cooldown = O.cooldown;
        }
        break;
      }
      default: {
        this.state = 'approach';
        this.facing += angleDelta(want, this.facing) * Math.min(1, O.turnRate * dt);
        if (!this.grounded) break;

        // Only the nearest few oni commit; the rest hold at a wider ring.
        // Without this a crowd buries the player and nothing is readable.
        const committed = this.queueRank() < O.attackSlots;
        const stop = committed ? O.approachStop : O.holdBackDistance;

        if (dist > stop) {
          const target = _v.normalize().multiplyScalar(O.moveSpeed);
          this.vel.x += (target.x - this.vel.x) * Math.min(1, O.accel * dt / O.moveSpeed);
          this.vel.z += (target.z - this.vel.z) * Math.min(1, O.accel * dt / O.moveSpeed);
        } else {
          this.vel.x *= 0.82; this.vel.z *= 0.82;
          if (committed && dist <= O.attackRange && this.cooldown <= 0) {
            this.state = 'windup';
            this.stateTimer = 0;
            this.flare.scale.setScalar(0.4);
            Audio.enemyWindup(O.windup);
          }
        }
        break;
      }
    }

    if (this.state === 'windup' || this.state === 'swing' || this.state === 'recover') {
      this.vel.x *= 0.86; this.vel.z *= 0.86;
    }
  }

  /** How many living oni are closer to the player than this one. */
  queueRank() {
    const d = this.position.distanceToSquared(World.player.position);
    let rank = 0;
    for (const o of World.enemies) {
      if (o === this || o.dead) continue;
      if (o.position.distanceToSquared(World.player.position) < d) rank++;
    }
    return rank;
  }

  separate(dt) {
    const O = TUNING.oni;
    for (const other of World.enemies) {
      if (other === this || other.dead || other.pinned) continue;
      _v.subVectors(this.position, other.position); _v.y = 0;
      const d = _v.length();
      if (d > O.separation || d < 1e-4) continue;
      const push = ((O.separation - d) / O.separation) * dt / d;
      // radial shove plus a tangential nudge, so crowds spread around the
      // player rather than piling up behind whoever arrived first
      this.position.x += _v.x * push * O.separationForce - _v.z * push * O.orbitForce;
      this.position.z += _v.z * push * O.separationForce + _v.x * push * O.orbitForce;
    }
  }

  integrate(dt) {
    const O = TUNING.oni;
    const R = TUNING.reactions;

    if (!this.grounded) {
      let g;
      if (this.lastReaction === 'launch' || this.lastReaction === 'juggle') {
        g = this.vel.y > 0 ? R.launch.riseGravity : R.launch.fallGravity;
        if (this.hangBonus > 0 && this.vel.y < 2 && this.vel.y > -2) {
          g *= 0.35;
          this.hangBonus = Math.max(0, this.hangBonus - dt);
        }
      } else {
        g = O.gravity;
      }
      this.vel.y -= g * dt;
    }

    // knockback friction on the ground — a staggered target still in flight
    // keeps most of its speed so heavies can carry it into scenery
    if (this.grounded && this.hitstun > 0) {
      const drag = this.splatArmed ? R.wallSplat.flightFriction : R.knockFriction;
      const f = Math.min(1, drag * dt);
      this.vel.x -= this.vel.x * f;
      this.vel.z -= this.vel.z * f;
    }

    this.position.addScaledVector(this.vel, dt);
    if (this.grounded || this.hitstun <= 0) this.separate(dt);

    this.checkSplatSurfaces();

    if (this.position.y <= 0) {
      this.position.y = 0;
      if (!this.grounded) this.onLand();
      this.grounded = true;
      this.vel.y = 0;
    } else {
      this.grounded = false;
    }

    // arena clamp (rim doubles as a splat surface, handled above)
    const d = Math.hypot(this.position.x, this.position.z);
    const lim = TUNING.player.arenaRadius + 0.5;
    if (d > lim) {
      const s = lim / d;
      this.position.x *= s; this.position.z *= s;
      this.vel.x *= 0.1; this.vel.z *= 0.1;
    }

    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 6);

    // disarm the splat once the knockback has actually died down
    if (this.splatArmed) {
      const speed = Math.hypot(this.vel.x, this.vel.z);
      if (this.hitstun <= 0 || (this.grounded && speed < R.wallSplat.speedThreshold * 0.5)) {
        this.splatArmed = false;
        this.lastReaction = '—';
      }
    }
  }

  onLand() {
    const R = TUNING.reactions;
    const impact = Math.abs(this.vel.y);
    if (this.bounceArmed || impact > 9) {
      this.bounceArmed = false;
      this.vel.y = impact * 0.32;
      if (this.vel.y > 2.0) {
        this.grounded = false;
        this.squash = Math.max(this.squash, 0.35);
        World.fx.ring(this.position.clone().setY(0.05), 2.4, 0.28, PALETTE.sumi, 0.7);
        World.fx.inkBurst(this.position.clone().setY(0.2), 10, 'sumi', 7);
        World.camRig.addTrauma(0.16);
        Audio.impact('groundBounce');
        this.hitstun = Math.max(this.hitstun, R.groundBounce.hitstun * 0.6);
        return;
      }
    }
    if (impact > 3) {
      World.fx.inkBurst(this.position.clone().setY(0.15), 5, 'sumi', 4);
      this.squash = Math.max(this.squash, 0.22);
    }
    // splatArmed deliberately survives the landing: a staggered oni keeps
    // skidding and can still be carried into a lantern.
    this.hangBonus = 0;
  }

  // ------------------------------------------------------------ wall splat

  checkSplatSurfaces() {
    const W = TUNING.reactions.wallSplat;
    if (!this.splatArmed || this.pinned) return;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed < W.speedThreshold) return;

    for (const s of World.splatSurfaces) {
      _n.set(this.position.x - s.position.x, 0, this.position.z - s.position.z);
      const d = _n.length();
      if (d > s.radius + this.radius || d < 1e-4) continue;
      _n.divideScalar(d);
      // push out to the surface, then pin
      this.position.x = s.position.x + _n.x * (s.radius + this.radius);
      this.position.z = s.position.z + _n.z * (s.radius + this.radius);
      this.splatNormal.copy(_n);
      this.pinned = true;
      this.splatTimer = 0;
      this.position.y = Math.max(this.position.y, 1.1);
      wallSplat(this, s, _n.clone(), speed);
      return;
    }

    if (W.boundaryEnabled) {
      const d = Math.hypot(this.position.x, this.position.z);
      const lim = TUNING.player.arenaRadius - 0.2;
      if (d > lim) {
        _n.set(-this.position.x / d, 0, -this.position.z / d);   // inward normal
        const outward = -(this.vel.x * _n.x + this.vel.z * _n.z);
        if (outward > W.speedThreshold) {
          this.position.x = (-_n.x) * lim;
          this.position.z = (-_n.z) * lim;
          this.splatNormal.copy(_n);
          this.pinned = true;
          this.splatTimer = 0;
          this.position.y = Math.max(this.position.y, 1.1);
          wallSplat(this, { position: this.position.clone(), radius: 0, height: 4 }, _n.clone(), outward);
        }
      }
    }
  }

  stepSplat(dt) {
    const W = TUNING.reactions.wallSplat;
    this.splatTimer += dt;
    this.vel.set(0, 0, 0);
    if (this.splatTimer > W.pinTime) {
      const u = Math.min(1, (this.splatTimer - W.pinTime) / W.slideTime);
      this.position.y = Math.max(0, 1.1 * (1 - u * u));
      if (u >= 1) {
        this.pinned = false;
        this.grounded = true;
        this.position.y = 0;
        this.hitstun = Math.max(this.hitstun, 0.15);
        this.lastReaction = '—';
      }
    }
    if (this.hitstun > 0) this.hitstun -= dt;
  }

  onParried(staggerDuration) {
    this.state = 'recover';
    this.stateTimer = 0;
    this.hitstun = Math.max(this.hitstun, staggerDuration);
    this.cooldown = TUNING.oni.cooldown;
    this.squash = 0.4;
    this.spin = 2.0;
    this.flare.material.opacity = 0;
    this.swingResolved = true;
    this.lastReaction = 'parried';
    // shove the oni back off the player
    _v.subVectors(this.position, World.player.position); _v.y = 0;
    if (_v.lengthSq() > 1e-5) this.vel.addScaledVector(_v.normalize(), 5.0);
    this.splatArmed = true;
  }

  // ---------------------------------------------------------------- death

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = 0;
    this.pinned = false;
    this.hp = 0;
    World.fx.inkPool(this.position);
    World.fx.inkBurst(this.position.clone().setY(1.2), 28, 'sumi', 14);
    World.fx.sakura(this.position, 14);
    World.fx.ring(this.position.clone().setY(0.07), 3.2, 0.4, PALETTE.sumi, 0.8);
    World.camRig.addTrauma(0.22);
    World.requestHitStop(0.08);
    Audio.impact('death');
    World.run?.onKill(this.position);
    if (World.lockTarget === this) World.lockTarget = null;
  }

  stepDeath(dt) {
    this.deathTimer += dt;
    const u = Math.min(1, this.deathTimer / TUNING.oni.deathTime);
    this.mesh.scale.setScalar(Math.max(0.001, 1 - u));
    this.mesh.position.y = this.position.y - u * 0.6;
    this.mesh.rotation.y += dt * 6;
    if (u >= 1) this.mesh.visible = false;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }

  // -------------------------------------------------------------- visuals

  syncMesh() {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;
  }

  animate(dt) {
    const O = TUNING.oni;
    this.bob += dt;

    // hit flash
    const flashing = this.flashTimer > 0;
    this.bodyMat.emissive.setHex(flashing ? TUNING.reactions.hitFlashColor : 0x000000);
    this.bodyMat.emissiveIntensity = flashing ? 1.0 : 0.0;

    // squash & stretch — the visual half of a hit reaction
    const sq = this.squash;
    this.body.scale.set(1 + sq * 0.55, 1 - sq * 0.5, 1 + sq * 0.55);

    if (this.pinned) {
      // flattened against the surface
      this.body.scale.set(1.5, 1.25, 0.45);
      this.mesh.lookAt(this.position.clone().sub(this.splatNormal));
      this.body.position.y = 1.45;
      return;
    }

    if (this.spin > 0) this.body.rotation.y += this.spin * dt;

    // arm / club
    let armTarget = 0.5;
    if (this.state === 'windup') {
      const u = Math.min(1, this.stateTimer / O.windup);
      armTarget = 0.5 - 2.9 * (1 - Math.pow(1 - u, 2));      // raise, slow and readable
      this.body.scale.multiplyScalar(1 + 0.12 * u);
      this.hornMat.color.setHex(u > 0.5 ? 0xfca5a5 : PALETTE.vermilion);
    } else if (this.state === 'swing') {
      const u = Math.min(1, this.stateTimer / O.active);
      armTarget = -2.4 + 3.6 * (1 - Math.pow(1 - u, 4));
      this.hornMat.color.setHex(PALETTE.vermilion);
    } else if (this.state === 'recover') {
      armTarget = 1.2;
      this.hornMat.color.setHex(PALETTE.vermilion);
    } else {
      this.hornMat.color.setHex(PALETTE.vermilion);
    }
    this.armPivot.rotation.x += (armTarget - this.armPivot.rotation.x) * Math.min(1, dt * 14);

    // idle float / stagger lean
    if (this.hitstun > 0 && this.reactionTimer > 0) {
      this.body.rotation.x = -0.55 * (this.reactionTimer / Math.max(0.001, TUNING.reactions.stagger.poseTime));
    } else {
      this.body.rotation.x *= Math.pow(0.01, dt);
    }

    const floatY = this.grounded && this.hitstun <= 0 ? Math.sin(this.bob * 2.6) * 0.12 : 0;
    this.body.position.y = 1.45 + floatY;
    this.flare.position.y = 0.06;
  }

  applyInterpolation(alpha) {
    if (this.dead) return;
    this.mesh.position.lerpVectors(this.prevPosition, this.position, alpha);
    if (!this.pinned) {
      this.mesh.rotation.y = this.prevFacing + angleDelta(this.facing, this.prevFacing) * alpha;
    }
  }
}
