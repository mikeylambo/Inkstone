/**
 * Camera. Lock-on framing keeps both fighters in view; trauma-based shake
 * scales with hit class; launcher and dive punch the FOV.
 *
 * The rig's smoothed yaw is what makes movement camera-relative, so it is
 * updated on the fixed step (deterministic). Shake is applied at render
 * time only and never feeds back into gameplay.
 */
import * as THREE from 'three';
import { TUNING } from './tuning.js';
import { World } from './world.js';

const _look = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pos = new THREE.Vector3(0, 6, 18);
    this.prevPos = this.pos.clone();
    this.look = new THREE.Vector3();
    this.prevLook = this.look.clone();

    this.trauma = 0;
    this.kick = new THREE.Vector3();
    this.fovOffset = 0;
    this.fovVel = 0;
    this.shakeSeed = 0;
  }

  addTrauma(amount, dir = null) {
    const C = TUNING.camera;
    this.trauma = Math.min(C.traumaMax, this.trauma + amount);
    if (dir) this.kick.addScaledVector(dir, amount * C.kickScale);
  }

  zoomPunch(delta) {
    this.fovVel += delta * 12;
  }

  /** Fixed-step update — framing only. */
  update(dt, player) {
    const C = TUNING.camera;
    const target = World.lockTarget && !World.lockTarget.dead ? World.lockTarget : null;

    let wantYaw = this.yaw;
    let distance = C.freeDistance;
    let height = C.freeHeight;

    if (target) {
      _tmp.subVectors(target.position, player.position);
      _tmp.y = 0;
      const sep = _tmp.length();
      if (sep > 1e-4) wantYaw = Math.atan2(_tmp.x, _tmp.z);
      distance = Math.min(C.lockDistanceMax, C.lockDistanceBase + sep * C.lockDistancePerSep);
      const highest = Math.max(player.position.y, target.position.y);
      height = C.lockHeight + highest * C.lockHeightPerAltitude;

      _look.lerpVectors(player.position, target.position, 1 - C.playerBias);
      _look.y = Math.max(player.position.y, target.position.y) * 0.55 + C.lookAheadUp;
    } else {
      const speed = Math.hypot(player.vel.x, player.vel.z);
      if (speed > 2.0) wantYaw = Math.atan2(player.vel.x, player.vel.z);
      height = C.freeHeight + player.position.y * C.lockHeightPerAltitude;
      _look.copy(player.position);
      _look.y = player.position.y * 0.6 + C.freeLookHeight;
    }

    const yawRate = target ? C.yawLerp : C.yawLerp * 0.45;
    this.yaw += angleDelta(wantYaw, this.yaw) * Math.min(1, yawRate * dt);

    if (player.state === 'attack' || player.state === 'dive') distance -= C.attackPushIn;

    // placement yaw is swung off the fight axis so the pair separates on
    // screen; the look direction still points down the middle of the pair
    const placeYaw = target ? this.yaw + C.lockYawOffset : this.yaw;
    _fwd.set(Math.sin(placeYaw), 0, Math.cos(placeYaw));
    _tmp.copy(_look).addScaledVector(_fwd, -distance);
    _tmp.y = _look.y + height;

    this.prevPos.copy(this.pos);
    this.prevLook.copy(this.look);
    this.pos.lerp(_tmp, Math.min(1, C.posLerp * dt));
    this.look.lerp(_look, Math.min(1, C.lookLerp * dt));

    // trauma + kick decay
    this.trauma = Math.max(0, this.trauma - C.traumaDecay * dt);
    this.kick.multiplyScalar(Math.pow(C.kickDecay, dt));

    // fov spring back to zero offset
    const accel = -C.zoomStiffness * this.fovOffset - C.zoomDamping * this.fovVel;
    this.fovVel += accel * dt;
    this.fovOffset += this.fovVel * dt;
  }

  /** Render-time: interpolate, then add shake. Never affects the sim. */
  apply(alpha, realTime) {
    const C = TUNING.camera;
    const cam = this.camera;

    cam.position.lerpVectors(this.prevPos, this.pos, alpha);
    _look.lerpVectors(this.prevLook, this.look, alpha);

    const shake = this.trauma * this.trauma;
    if (shake > 0.0001 || World.hitStop > 0) {
      const t = realTime * C.traumaFreq;
      const buzz = World.hitStop > 0 ? C.hitStopShake : 0;
      const amp = shake * C.traumaMaxOffset + buzz;
      cam.position.x += Math.sin(t * 1.7 + 0.3) * amp;
      cam.position.y += Math.sin(t * 2.3 + 1.7) * amp * 0.8;
      cam.position.z += Math.sin(t * 1.9 + 4.1) * amp;
    }
    cam.position.add(this.kick);

    cam.lookAt(_look);
    if (shake > 0.0001) {
      cam.rotation.z += Math.sin(realTime * C.traumaFreq * 1.3) * shake * C.traumaMaxRoll;
    }

    const fov = C.fov + this.fovOffset;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
