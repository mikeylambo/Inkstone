/**
 * Hit resolution and hit reactions.
 *
 * Pillar 1 is Weight: a connect must spend hit-stop, recoil, a reaction
 * pose, camera trauma and a distinct sound in the same frame. All five are
 * fired from here so no attack can accidentally ship without them.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { World } from '../world.js';
import { Audio } from '../audio.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Cone test on the XZ plane with a vertical band. */
export function inCone(originPos, facing, reach, arc, height, target, targetRadius) {
  _v1.subVectors(target.position, originPos);
  const dy = _v1.y;
  if (dy > height || dy < -height * 0.8) return false;
  _v1.y = 0;
  const dist = _v1.length();
  if (dist > reach + targetRadius) return false;
  if (dist < 0.001) return true;
  const ang = Math.atan2(_v1.x, _v1.z);
  return Math.abs(angleDelta(ang, facing)) <= arc * 0.5;
}

/**
 * Apply one hit to one enemy. `dir` is the horizontal push direction.
 */
export function applyEnemyHit(enemy, atk, dir, hitPoint, opts = {}) {
  const R = TUNING.reactions;
  const damage = opts.damage ?? atk.damage;
  const reaction = opts.reaction ?? atk.reaction;
  const knock = opts.knock ?? atk.knock ?? 0;
  const lift = opts.lift ?? atk.lift ?? 0;

  enemy.hp -= damage;
  enemy.flashTimer = R[reaction]?.flashTime ?? 0.08;
  enemy.lastReaction = reaction;
  World.debug.lastReaction = reaction;

  const airborne = !enemy.grounded;

  switch (reaction) {
    case 'flinch': {
      const r = R.flinch;
      enemy.hitstun = Math.max(enemy.hitstun, r.hitstun);
      enemy.vel.addScaledVector(dir, knock || r.recoil);
      enemy.squash = r.squash;
      enemy.reactionTimer = r.poseTime;
      if (airborne) enemy.vel.y = Math.max(enemy.vel.y, R.airHitLiftMin);
      break;
    }
    case 'stagger': {
      const r = R.stagger;
      enemy.hitstun = Math.max(enemy.hitstun, r.hitstun);
      enemy.vel.addScaledVector(dir, knock);
      enemy.vel.y = Math.max(enemy.vel.y, lift);
      if (lift > 0) enemy.grounded = false;
      enemy.squash = r.squash;
      enemy.spin = r.spinRate;
      enemy.reactionTimer = r.poseTime;
      enemy.splatArmed = true;         // eligible for a wall splat this flight
      break;
    }
    case 'launch': {
      const r = R.launch;
      enemy.hitstun = Math.max(enemy.hitstun, r.hitstun);
      enemy.vel.y = lift;
      enemy.vel.addScaledVector(dir, knock);
      enemy.grounded = false;
      enemy.squash = r.squash;
      enemy.spin = r.spinRate;
      enemy.juggleCount = 0;
      break;
    }
    case 'juggle': {
      const r = R.juggle;
      enemy.hitstun = Math.max(enemy.hitstun, r.hitstun);
      enemy.grounded = false;
      // flat refresh, not additive: each air hit re-pops the target to this
      // attack's lift. Stacking would fire juggled enemies into orbit.
      enemy.vel.y = Math.max(lift, R.airHitLiftMin);
      enemy.vel.addScaledVector(dir, knock);
      enemy.squash = r.squash;
      enemy.juggleCount = (enemy.juggleCount || 0) + 1;
      enemy.hangBonus = (enemy.hangBonus || 0) + r.hangBonus;
      break;
    }
    case 'groundBounce': {
      const r = R.groundBounce;
      enemy.hitstun = Math.max(enemy.hitstun, r.hitstun);
      enemy.vel.addScaledVector(dir, knock);
      enemy.vel.y = Math.max(r.minBounce, Math.abs(enemy.vel.y) * r.bounceKeep + lift);
      enemy.grounded = false;
      enemy.squash = r.squash;
      enemy.reactionTimer = r.poseTime;
      enemy.bounceArmed = true;
      break;
    }
  }

  // --- feedback: fx + audio + camera, every time, no exceptions ---
  const fx = World.fx;
  fx.impactRing(hitPoint, 1.2 + damage * 0.05);
  fx.inkBurst(hitPoint, Math.round(8 + damage * 0.45), 'sumi', 8 + damage * 0.35, dir);
  fx.slashSpray(hitPoint, dir, Math.round(4 + damage * 0.25));

  // Kick scales with hit-stop, so a light taps the frame and a heavy shoves it.
  // Shake alone reads as noise; the directional shove is what sells the hit.
  const stop = opts.hitStop ?? atk.hitStop;
  World.requestHitStop(stop);
  World.camRig.addTrauma(opts.shake ?? atk.shake, dir, stop * TUNING.camera.kickPerHitStop);
  if (atk.zoom) World.camRig.zoomPunch(atk.zoom);
  Audio.impact(opts.sound ?? atk.sound);
  World.addCombo(1);
  World.run?.onHit(reaction, damage, hitPoint);

  if (enemy.hp <= 0) enemy.die();
  return true;
}

/** Sweep the player's attack cone. Returns number of enemies hit. */
export function resolveAttackHits(player, atk, alreadyHit) {
  let count = 0;
  const origin = player.position;
  for (const e of World.enemies) {
    if (e.dead || alreadyHit.has(e)) continue;
    if (!inCone(origin, player.facing, atk.reach, atk.arc, atk.height, e, e.radius)) continue;
    alreadyHit.add(e);

    _v2.subVectors(e.position, origin); _v2.y = 0;
    if (_v2.lengthSq() < 1e-6) _v2.set(Math.sin(player.facing), 0, Math.cos(player.facing));
    _v2.normalize();

    const hitPoint = e.position.clone();
    hitPoint.y += e.height * 0.5;
    applyEnemyHit(e, atk, _v2, hitPoint);
    count++;
  }
  return count;
}

/** Dive shockwave — radial, ignores facing. */
export function resolveRadialHits(origin, atk, radius, alreadyHit) {
  let count = 0;
  for (const e of World.enemies) {
    if (e.dead || alreadyHit.has(e)) continue;
    _v1.subVectors(e.position, origin); _v1.y = 0;
    if (_v1.length() > radius + e.radius) continue;
    alreadyHit.add(e);
    if (_v1.lengthSq() < 1e-6) _v1.set(1, 0, 0);
    _v1.normalize();
    const hitPoint = e.position.clone();
    hitPoint.y += e.height * 0.4;
    applyEnemyHit(e, atk, _v1, hitPoint);
    count++;
  }
  return count;
}

/**
 * Wall splat. Called by the enemy when it collides with a splat surface
 * while carrying enough knockback speed.
 */
export function wallSplat(enemy, surface, normal, speed) {
  const w = TUNING.reactions.wallSplat;
  enemy.hp -= w.bonusDamage;
  enemy.hitstun = Math.max(enemy.hitstun, w.pinTime + w.slideTime);
  enemy.splatTimer = w.pinTime + w.slideTime;
  enemy.splatArmed = false;
  enemy.squash = w.squash;
  enemy.vel.set(0, 0, 0);
  enemy.pinned = true;

  const point = enemy.position.clone();
  point.y = Math.min(surface.height - 0.5, Math.max(1.0, enemy.position.y + enemy.height * 0.4));
  World.fx.wallSplat(point, normal, w.splatRadius);
  World.fx.inkBurst(point, 22, 'sumi', 13, normal);

  World.requestHitStop(w.hitStop);
  World.camRig.addTrauma(w.shake, normal);
  World.camRig.zoomPunch(w.zoom);
  Audio.impact('wallSplat');
  World.banner('墨');
  World.addCombo(1);
  World.run?.onWallSplat();

  if (enemy.hp <= 0) enemy.die();
}

/** Enemy swing vs player: parry check first, then damage. */
export function resolveEnemyAttack(enemy, player) {
  const o = TUNING.oni;
  if (!inCone(enemy.position, enemy.facing, o.swingReach, o.swingArc, 2.6, player, TUNING.player.radius)) {
    return false;
  }

  _v1.subVectors(player.position, enemy.position); _v1.y = 0;
  if (_v1.lengthSq() < 1e-6) _v1.set(1, 0, 0);
  _v1.normalize();

  if (player.tryParry(enemy)) return true;
  if (player.invuln > 0 || player.iframes > 0) return false;

  player.takeHit(o.damage, _v1);
  return true;
}
