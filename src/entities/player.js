/**
 * The player. V0.2 kit:
 *   light x3 string, launcher, air light x3, dive, dash (i-frames, 8-dir),
 *   dodge-cancel after active frames, parry.
 *
 * The global lunge is GONE. The only displacement an attack may cause is
 * lock-on step-in (see applyMagnetism) — gate G2.4.
 */
import * as THREE from 'three';
import { TUNING } from '../tuning.js';
import { World } from '../world.js';
import { Input } from '../input.js';
import { Audio } from '../audio.js';
import { PALETTE, createSumiMaterial, addOutline } from '../gfx/materials.js';
import { Ribbon } from '../gfx/trail.js';
import { SlashFan } from '../gfx/slashfan.js';
import { POSES, TRACKS, evalTrack, blendPoses, applyPose, makeScratchPose, EASE } from '../anim/poses.js';
import { getAttack, phaseOf, isActiveFrames, GROUND_LIGHT_CHAIN, AIR_LIGHT_CHAIN, DIR_MOVES } from '../combat/attacks.js';
import { resolveAttackHits, resolveRadialHits } from '../combat/hits.js';

/** World-space ink line weight on the player. */
const OUTLINE = 0.075;

const _v = new THREE.Vector3();
const _mv = new THREE.Vector3();
const _camF = new THREE.Vector3();
const _camR = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _tip = new THREE.Vector3();
const _hilt = new THREE.Vector3();

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Player {
  constructor(scene) {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 6);
    this.prevPosition = this.position.clone();
    this.vel = new THREE.Vector3();
    this.facing = Math.PI;
    this.prevFacing = this.facing;

    this.hp = TUNING.player.maxHp;
    this.grounded = true;

    this.state = 'free';         // free | attack | dash | parry | hurt | dive
    this.attack = null;
    this.dive = null;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = new THREE.Vector3(0, 0, 1);
    this.airDashes = TUNING.dash.airDashesMax;
    this.iframes = 0;
    this.invuln = 0;
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.parrySuccess = 0;
    this.hurtTimer = 0;
    this.landTimer = 0;

    this.chainIndex = 0;
    this.chainTimer = 0;
    this.airChainIndex = 0;

    // jump
    this.airJumps = TUNING.player.airJumpsMax;
    this.coyoteTimer = 0;
    this.jumpCutArmed = false;

    // movement basis latch (gate F4)
    this.lockHeldPrev = false;
    // Run-cycle phase is INTEGRATED, never derived from absolute time. See
    // animate(): sin(World.time * cadence) jumps by time*deltaCadence whenever
    // speed changes, which grows without bound as a session runs.
    this.runPhase = 0;
    this.runBlend = 0;
    this.idlePhase = 0;
    this.basisLatched = false;
    this.latchF = new THREE.Vector3(0, 0, 1);
    this.latchR = new THREE.Vector3(1, 0, 0);
    this.latchAngle = 0;

    this.scratch = makeScratchPose();
    this.scratchB = makeScratchPose();

    this.buildModel();
    scene.add(this.mesh);
    this.ribbon = new Ribbon(scene, { max: TUNING.fx.trailSamples, color: PALETTE.sumi });
    // the fan is parented to the player group so it swings with the body
    this.fan = new SlashFan(this.mesh);
  }

  // --------------------------------------------------------------- model

  buildModel() {
    const kimono = createSumiMaterial(PALETTE.vermilionDeep);
    const armor = createSumiMaterial(PALETTE.sumi);
    const skin = createSumiMaterial(PALETTE.paperLight);
    const straw = createSumiMaterial(PALETTE.stone);

    const torsoGeo = new THREE.BoxGeometry(0.9, 1.2, 0.6);
    this.torso = new THREE.Mesh(torsoGeo, kimono);
    this.torsoBaseY = 1.4;
    this.torso.position.y = this.torsoBaseY;
    this.torso.castShadow = true;
    addOutline(this.torso, OUTLINE);
    this.mesh.add(this.torso);

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, skin);
    this.head.position.set(0, 0.85, 0);
    this.head.castShadow = true;
    addOutline(this.head, OUTLINE);
    this.torso.add(this.head);

    const hatGeo = new THREE.ConeGeometry(0.88, 0.40, 10);
    const hat = new THREE.Mesh(hatGeo, straw);
    hat.position.set(0, 0.34, 0);
    hat.castShadow = true;
    addOutline(hat, OUTLINE);
    this.head.add(hat);

    const armGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
    this.rArm = new THREE.Mesh(armGeo, armor);
    this.rArm.position.set(0.62, 0.12, 0);
    this.rArm.geometry.translate(0, -0.45, 0);   // pivot at the shoulder
    this.rArm.castShadow = true;
    addOutline(this.rArm, OUTLINE);
    this.torso.add(this.rArm);

    this.lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.28), kimono);
    this.lArm.position.set(-0.62, 0.12, 0);
    this.lArm.geometry.translate(0, -0.45, 0);
    this.lArm.castShadow = true;
    addOutline(this.lArm, OUTLINE);
    this.torso.add(this.lArm);

    const legGeo = new THREE.BoxGeometry(0.34, 1.0, 0.34);
    this.rLeg = new THREE.Mesh(legGeo, armor);
    this.rLeg.position.set(0.24, 1.0, 0);
    this.rLeg.geometry.translate(0, -0.5, 0);
    this.rLeg.castShadow = true;
    addOutline(this.rLeg, OUTLINE);
    this.mesh.add(this.rLeg);

    this.lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.34), armor);
    this.lLeg.position.set(-0.24, 1.0, 0);
    this.lLeg.geometry.translate(0, -0.5, 0);
    this.lLeg.castShadow = true;
    addOutline(this.lLeg, OUTLINE);
    this.mesh.add(this.lLeg);

    // --- katana ---
    this.sword = new THREE.Group();
    this.sword.position.set(0, -0.62, 0.16);
    this.rArm.add(this.sword);

    const bladeGeo = new THREE.BoxGeometry(0.16, 2.7, 0.06);
    bladeGeo.translate(0, 1.35, 0);
    const blade = new THREE.Mesh(bladeGeo, createSumiMaterial(0xd6d3d1));
    blade.castShadow = true;
    addOutline(blade, OUTLINE);
    this.sword.add(blade);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.2), createSumiMaterial(PALETTE.gold));
    this.sword.add(guard);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.55, 0.13), createSumiMaterial(PALETTE.sumi));
    grip.position.y = -0.3;
    this.sword.add(grip);

    this.tipMarker = new THREE.Object3D();
    this.tipMarker.position.set(0, 2.7, 0);
    this.sword.add(this.tipMarker);
    // inner edge of the ribbon sits up the blade, not at the grip, so the
    // trail reads as a stroke following the tip rather than a fan off the body
    this.hiltMarker = new THREE.Object3D();
    this.hiltMarker.position.set(0, 0.6, 0);
    this.sword.add(this.hiltMarker);

    this.rig = {
      torso: this.torso, head: this.head, rArm: this.rArm, lArm: this.lArm,
      rLeg: this.rLeg, lLeg: this.lLeg, sword: this.sword, torsoBaseY: this.torsoBaseY,
    };
  }

  // ------------------------------------------------------------- helpers

  get height() { return 1.9; }
  get radius() { return TUNING.player.radius; }

  /**
   * Build the movement basis from what is actually on screen.
   *
   * D1: camera-right is derived as cross(forward, up), never hand-written, so
   *     it cannot silently flip sign again.
   * D2: forward is the camera's real look direction (position -> look point),
   *     which already contains lockYawOffset, so lock-on cannot drift. It is
   *     read from sim state rather than the render matrix so replays stay
   *     deterministic.
   * D3: the basis is latched while the stick is held, so a camera that is
   *     still swinging cannot curve a held direction into a spiral.
   */
  moveInputWorld() {
    const C = TUNING.controls;
    const ix = Input.move.x, iy = Input.move.y;
    if (Math.abs(ix) < 0.01 && Math.abs(iy) < 0.01) {
      this.basisLatched = false;
      return null;
    }

    // stick direction in screen terms: 0 = away from camera, +pi/2 = right
    const rawAngle = Math.atan2(ix, -iy);

    if (C.scheme === 'character') {
      _camF.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    } else {
      const yaw = World.camRig ? World.camRig.screenYaw : 0;
      _camF.set(Math.sin(yaw), 0, Math.cos(yaw));
    }
    _camR.crossVectors(_camF, UP).normalize();

    const locked = !!(World.lockTarget && !World.lockTarget.dead);
    const wantLatch = C.latchBasis && C.scheme !== 'character' &&
      (!locked || C.latchWhileLocked);

    if (wantLatch) {
      const swung = Math.abs(angleDelta(rawAngle, this.latchAngle)) > C.latchBreakAngle;
      // a deliberate camera turn should take effect at once; the camera's own
      // automatic chase must NOT break the latch or the spiral comes back
      const nudged = Math.abs(Input.camNudge) > 0;
      if (!this.basisLatched || swung || nudged) {
        this.latchF.copy(_camF);
        this.latchR.copy(_camR);
        this.latchAngle = rawAngle;
        this.basisLatched = true;
      }
      _camF.copy(this.latchF);
      _camR.copy(this.latchR);
    } else {
      this.basisLatched = false;
    }

    _mv.set(0, 0, 0);
    _mv.addScaledVector(_camR, ix);
    _mv.addScaledVector(_camF, -iy);
    if (_mv.lengthSq() > 1) _mv.normalize();
    return _mv;
  }

  canAct() {
    return this.state === 'free' || this.state === 'attack' || this.state === 'parry';
  }

  // ---------------------------------------------------------------- step

  update(dt) {
    this.prevPosition.copy(this.position);
    this.prevFacing = this.facing;

    this.tickTimers(dt);
    this.handleInput(dt);

    switch (this.state) {
      case 'attack': this.stepAttack(dt); break;
      case 'dash': this.stepDash(dt); break;
      case 'parry': this.stepParry(dt); break;
      case 'hurt': this.stepHurt(dt); break;
      case 'dive': this.stepDive(dt); break;
      default: this.stepFree(dt); break;
    }

    this.integrate(dt);
    this.animate(dt);
    this.sampleRibbon();
    this.ribbon.update(dt);
    this.fan.update(dt);
  }

  tickTimers(dt) {
    const dec = (v) => Math.max(0, v - dt);
    this.dashCooldown = dec(this.dashCooldown);
    this.iframes = dec(this.iframes);
    this.invuln = dec(this.invuln);
    this.parryCooldown = dec(this.parryCooldown);
    this.parrySuccess = dec(this.parrySuccess);
    this.landTimer = dec(this.landTimer);
    this.coyoteTimer = dec(this.coyoteTimer);
    if (this.chainTimer > 0) {
      this.chainTimer = dec(this.chainTimer);
      if (this.chainTimer === 0) this.chainIndex = 0;
    }
  }

  handleInput(dt) {
    const C = TUNING.controls;
    const STEP = 1 / TUNING.sim.hz;

    // --- lock-on: hold-to-lock, or press-to-toggle ---
    if (C.lockIsHold) {
      const held = Input.isHeld('lock');
      if (held && !this.lockHeldPrev) this.acquireLock();
      else if (!held && this.lockHeldPrev) World.lockTarget = null;
      this.lockHeldPrev = held;
      Input.consume('lock');
    } else if (Input.consume('lock')) {
      this.toggleLockOn();
    }

    const atk = this.attack ? this.attack.def : null;
    const e = this.attack ? this.attack.elapsed : 0;
    const inRecovery = atk ? e >= atk.anticipation + atk.active : false;
    const pastCancel = atk ? e >= atk.cancelAfter : false;
    const diveCancelable = this.state === 'dive' && this.dive &&
      this.dive.phase === 'land' && this.dive.timer >= TUNING.attacks.dive.cancelAfter;

    // --- jump. Also the DMC jump-cancel: this is why air combos work. ---
    if (Input.peek('jump')) {
      const jumpCancel = this.state === 'attack' && TUNING.player.jumpCancelEnabled && pastCancel;
      const canJump = this.state === 'free' || this.state === 'parry' || jumpCancel || diveCancelable;
      if (canJump && (this.grounded || this.coyoteTimer > 0 || this.airJumps > 0)) {
        Input.consume('jump');
        this.startJump();
        return;
      }
    }

    // --- dash: cancels almost everything (dodge-cancel) ---
    if (Input.peek('dash') && this.dashCooldown <= 0) {
      const canCancel =
        this.state === 'free' ||
        this.state === 'parry' ||
        (this.state === 'attack' && pastCancel) ||
        diveCancelable;
      if (canCancel && (this.grounded || this.airDashes > 0)) {
        Input.consume('dash');
        this.startDash();
        return;
      }
    }

    // --- parry ---
    if (Input.peek('parry') && this.parryCooldown <= 0) {
      if (this.state === 'free' || (this.state === 'attack' && inRecovery)) {
        Input.consume('parry');
        this.startParry();
        return;
      }
    }

    // --- attacks ---
    const freeToStart = this.state === 'free' || this.parrySuccess > 0;

    if (Input.peek('light')) {
      if (freeToStart || (this.state === 'attack' && (e >= atk.chainAfter || inRecovery))) {
        const intent = this.lockDirIntent();
        if (intent === 'toward' && C.stingerEnabled) {
          this.startAttack(DIR_MOVES.stinger, Input.consumeWithCatchUp('light', STEP));
          return;
        }
        if (intent === 'away' && C.highTimeEnabled && this.grounded) {
          this.startAttack(DIR_MOVES.highTime, Input.consumeWithCatchUp('light', STEP));
          return;
        }
        this.startLight(Input.consumeWithCatchUp('light', STEP));
        return;
      }
    }

    if (Input.peek('launcher')) {
      if (freeToStart || (this.state === 'attack' && (pastCancel || inRecovery))) {
        const catchUp = Input.consumeWithCatchUp('launcher', STEP);
        this.startAttack(this.grounded ? 'launcher' : 'airLight3', catchUp);
        return;
      }
    }

    if (Input.peek('heavy')) {
      if (freeToStart || (this.state === 'attack' && (pastCancel || inRecovery))) {
        if (this.grounded) {
          const intent = this.lockDirIntent();
          const key = (intent === 'toward' && C.splitterEnabled) ? DIR_MOVES.splitter : 'heavy';
          this.startAttack(key, Input.consumeWithCatchUp('heavy', STEP));
        } else if (this.position.y >= TUNING.attacks.dive.minAltitude) {
          Input.consume('heavy');
          this.startDive();
        }
        return;
      }
    }
  }

  /**
   * Is the stick pushed toward or away from the locked target? Drives the
   * lock-on directional moves. Returns null when not locked or ambiguous.
   */
  lockDirIntent() {
    const C = TUNING.controls;
    const t = World.lockTarget;
    if (!t || t.dead) return null;
    const mv = this.moveInputWorld();
    if (!mv) return null;
    const mlen = Math.hypot(mv.x, mv.z);
    if (mlen < 1e-4) return null;
    _v.subVectors(t.position, this.position);
    _v.y = 0;
    if (_v.lengthSq() < 1e-6) return null;
    _v.normalize();
    const dot = (mv.x * _v.x + mv.z * _v.z) / mlen;
    if (dot > C.dirThreshold) return 'toward';
    if (dot < -C.dirThreshold) return 'away';
    return null;
  }

  startLight(catchUp = 0) {
    if (this.grounded) {
      const chain = GROUND_LIGHT_CHAIN;
      let idx = this.chainIndex;
      if (this.state === 'attack' && chain.includes(this.attack.key)) {
        idx = chain.indexOf(this.attack.key) + 1;
      }
      if (idx >= chain.length) idx = 0;
      this.chainIndex = idx;
      this.chainTimer = TUNING.combo.window;
      this.startAttack(chain[idx], catchUp);
    } else {
      const chain = AIR_LIGHT_CHAIN;
      let idx = this.airChainIndex;
      if (this.state === 'attack' && chain.includes(this.attack.key)) {
        idx = chain.indexOf(this.attack.key) + 1;
      }
      if (idx >= chain.length) idx = 0;
      this.airChainIndex = idx;
      this.startAttack(chain[idx], catchUp);
    }
  }

  // ----------------------------------------------------------------- jump

  startJump() {
    const P = TUNING.player;
    if (!this.grounded && this.coyoteTimer <= 0) this.airJumps--;
    this.grounded = false;
    this.coyoteTimer = 0;
    this.vel.y = P.jumpVel;
    this.jumpCutArmed = true;
    this.attack = null;
    this.dive = null;
    this.state = 'free';
    this.airChainIndex = 0;
    this.ribbon.clear();
    World.camRig.pushTo(0, TUNING.camera.pushInMinRelease);
    Audio.dash();
    World.fx.inkBurst(this.position.clone().setY(0.15), 5, 'sumi', 4);
  }

  // ------------------------------------------------------------- attacks

  startAttack(key, catchUp = 0) {
    const def = getAttack(key);
    if (!def) return;

    // face the target (locked) or the stick (free)
    if (World.lockTarget && !World.lockTarget.dead) {
      _v.subVectors(World.lockTarget.position, this.position); _v.y = 0;
      if (_v.lengthSq() > 1e-5) this.facing = Math.atan2(_v.x, _v.z);
    } else {
      const mv = this.moveInputWorld();
      if (mv) this.facing = Math.atan2(mv.x, mv.z);
    }

    const step = this.computeMagnetism(def);

    this.state = 'attack';
    this.attack = {
      // `catchUp` is how long ago the button was physically pressed. Starting
      // with it already elapsed means a press landing just after a sim step
      // doesn't cost a whole frame of dead time (gate F1).
      key, def, elapsed: catchUp,
      hitSet: new Set(),
      stepTotal: step.dist,
      stepRemaining: step.dist,
      stepDir: step.dir,
      stepApplied: 0,
      prevElapsed: catchUp,
      startPos: this.position.clone(),
      selfLifted: false,
      released: false,
      whiffed: true,
    };

    this.ribbon.clear();
    this.ribbon.setColor(def.trail);
    // The mark is stamped whole, right now, on the same step the attack
    // starts -- deliberately before any active frame. See slashfan.js.
    this.fan.trigger(key, def.trail);
    World.camRig.pushTo(TUNING.camera.attackPushIn, TUNING.camera.pushInAttackTime);
    Audio.whiff(def.whiffPitch);

    World.debug.lastAttackKey = def.label;
    World.debug.stepInThisAttack = step.dist;
    World.debug.pressToStrokeMs = catchUp * 1000;
    World.debug.pressToStrokeSteps = catchUp / (1 / TUNING.sim.hz);
  }

  /**
   * Attack magnetism. Locked on + in range -> step at most stepInMax toward
   * the target. Otherwise ZERO displacement. This is the whole of G2.4.
   */
  computeMagnetism(def) {
    const M = TUNING.magnetism;
    const none = { dist: 0, dir: new THREE.Vector3() };
    if (!M.enabled) return none;
    if (M.requireLockOn && !(World.lockTarget && !World.lockTarget.dead)) return none;

    const target = World.lockTarget;
    if (!target || target.dead) return none;

    _v.subVectors(target.position, this.position); _v.y = 0;
    const dist = _v.length();
    const range = def.magnetStepInMax != null
      ? Math.max(M.stepInRange, def.magnetStepInMax + M.standoff)
      : M.stepInRange;
    if (dist > range || dist < 1e-4) return none;

    const ang = Math.atan2(_v.x, _v.z);
    if (Math.abs(angleDelta(ang, this.facing)) > M.maxAngle) return none;

    const desired = dist - M.standoff;
    if (desired <= 0.01) return none;

    // stinger carries its own, much longer cap; everything else uses stepInMax
    const cap = def.magnetStepInMax != null ? def.magnetStepInMax : M.stepInMax;
    let d = Math.min(desired, cap);
    if (!this.grounded) d *= M.airStepScale;
    return { dist: d, dir: _v.normalize().clone() };
  }

  stepAttack(dt) {
    const a = this.attack;
    const def = a.def;
    a.prevElapsed = a.elapsed;
    a.elapsed += dt;

    // step-in is spread over the anticipation window — it reads as the
    // character committing, not as a teleport
    if (a.stepRemaining > 0) {
      // zero-anticipation lights would otherwise deliver the whole step-in on
      // frame 1, which reads as the old teleporting lunge
      const windup = Math.max(TUNING.magnetism.minStepTime, def.anticipation);
      const applied = Math.min(a.stepRemaining, a.stepTotal * (dt / windup));
      this.position.addScaledVector(a.stepDir, applied);
      a.stepRemaining -= applied;
      a.stepApplied += applied;
    }

    // active frames
    if (isActiveFrames(def, a.elapsed)) {
      const hits = resolveAttackHits(this, def, a.hitSet);
      if (hits > 0) {
        a.whiffed = false;
        if (def.selfLift > 0 && !a.selfLifted) {
          // hold the button to ride the launch, tap it to stay grounded
          const follow = !def.holdFollow || Input.isHeld('launcher');
          if (follow) {
            this.vel.y = def.selfLift;
            this.grounded = false;
            this.airChainIndex = 0;
            this.airDashes = TUNING.dash.airDashesMax;
            this.airJumps = TUNING.player.airJumpsMax;
          }
          a.selfLifted = true;
        }
      }
    }

    // release the camera push-in across this attack's own recovery window
    if (!a.released && a.elapsed >= def.anticipation + def.active) {
      a.released = true;
      World.camRig.pushTo(0, def.recovery);
    }

    // horizontal damping: no free sliding during a swing
    if (this.grounded) {
      this.vel.x -= this.vel.x * Math.min(1, dt * TUNING.player.friction * 0.5);
      this.vel.z -= this.vel.z * Math.min(1, dt * TUNING.player.friction * 0.5);
    }

    if (a.elapsed >= def.duration) {
      World.debug.lastAttackDisplacement =
        Math.hypot(this.position.x - a.startPos.x, this.position.z - a.startPos.z);
      const wasGroundChain = GROUND_LIGHT_CHAIN.includes(a.key);
      this.attack = null;
      this.state = 'free';
      if (wasGroundChain) this.chainTimer = TUNING.combo.window;
    }
  }

  // ---------------------------------------------------------------- dive

  startDive() {
    this.state = 'dive';
    this.dive = { phase: 'hang', timer: 0, hitSet: new Set() };
    this.vel.x *= 0.2; this.vel.z *= 0.2;
    this.vel.y = TUNING.attacks.dive.hangRise;
    this.ribbon.clear();
    this.ribbon.setColor(0x1c1917);
    Audio.whiff(0.55);
    World.camRig.zoomPunch(TUNING.attacks.dive.zoom * 0.35);
    World.camRig.pushTo(TUNING.camera.attackPushIn, TUNING.camera.pushInAttackTime);
    World.debug.lastAttackKey = 'DIVE';
    World.debug.stepInThisAttack = 0;
  }

  stepDive(dt) {
    const D = TUNING.attacks.dive;
    const d = this.dive;
    d.timer += dt;

    if (d.phase === 'hang') {
      // gravity off — the moment of held breath before the drop
      this.vel.y = D.hangRise * (1 - d.timer / D.hang);
      this.vel.x *= 0.85; this.vel.z *= 0.85;
      if (d.timer >= D.hang) { d.phase = 'fall'; d.timer = 0; }
    } else if (d.phase === 'fall') {
      this.vel.y = -D.fallSpeed;
      this.vel.x *= 0.9; this.vel.z *= 0.9;
      // clip anything on the way down
      const clipped = resolveRadialHits(this.position, {
        ...getAttack('dive'), damage: D.airHitDamage, reaction: 'juggle',
        knock: 0.5, lift: 1.5, hitStop: 0.05, shake: 0.1, zoom: 0, sound: 'airLight',
      }, this.radius + 1.4, d.hitSet);
      // hitSet is intentionally NOT cleared — one clip per enemy per dive
      if (this.position.y <= 0.001) this.land(true);
    } else if (d.phase === 'land') {
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      if (d.timer >= D.recovery) { this.dive = null; this.state = 'free'; }
    }
  }

  diveImpact() {
    const D = TUNING.attacks.dive;
    const def = getAttack('dive');
    const hitSet = new Set();
    resolveRadialHits(this.position, def, D.radius, hitSet);

    // the dive's mark belongs at the slam, not at the apex
    this.fan.trigger('dive', getAttack('dive').trail);
    World.camRig.pushTo(0, D.recovery);
    World.fx.shockwave(this.position, D.radius, TUNING.fx.shockwaveLife);
    World.fx.groundMark(this.position, D.radius * 0.55);
    World.fx.inkBurst(this.position.clone().setY(0.3), 30, 'sumi', 16);

    World.requestHitStop(D.hitStop);
    World.camRig.addTrauma(D.shake);
    World.camRig.zoomPunch(D.zoom);
    Audio.impact('dive');
    if (hitSet.size === 0) World.camRig.addTrauma(D.shake * 0.4);
  }

  // ---------------------------------------------------------------- dash

  startDash() {
    const mv = this.moveInputWorld();
    if (mv) {
      this.dashDir.copy(mv).normalize();
      this.facing = Math.atan2(this.dashDir.x, this.dashDir.z);
    } else {
      this.dashDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
    }
    this.state = 'dash';
    this.dashTimer = 0;
    this.dashCooldown = TUNING.dash.cooldown;
    this.attack = null;
    this.dive = null;
    this.chainIndex = 0;
    this.airChainIndex = 0;
    if (!this.grounded) {
      this.airDashes--;
      this.vel.y = Math.max(this.vel.y, TUNING.dash.airLift);
    }
    this.ribbon.clear();
    World.camRig.pushTo(0, TUNING.camera.pushInMinRelease);
    Audio.dash();
    World.fx.inkBurst(this.position.clone().setY(0.4), 8, 'sumi', 5);
    World.camRig.addTrauma(TUNING.dash.shake);
  }

  stepDash(dt) {
    const D = TUNING.dash;
    this.dashTimer += dt;
    this.iframes = (this.dashTimer >= D.iframeStart && this.dashTimer <= D.iframeEnd) ? 0.02 : this.iframes;

    const u = this.dashTimer / D.duration;
    const speed = D.speed * (1 - EASE.inQuad(Math.min(1, u)) * 0.55);
    this.vel.x = this.dashDir.x * speed;
    this.vel.z = this.dashDir.z * speed;
    if (!this.grounded) this.vel.y *= 0.86;

    if (this.dashTimer >= D.duration) {
      this.vel.x = this.dashDir.x * D.speed * D.endSpeedKeep;
      this.vel.z = this.dashDir.z * D.speed * D.endSpeedKeep;
      this.state = 'free';
    }
  }

  // --------------------------------------------------------------- parry

  startParry() {
    this.state = 'parry';
    this.parryTimer = 0;
    this.parryCooldown = TUNING.parry.cooldown;
    this.attack = null;
    this.ribbon.clear();
    World.camRig.pushTo(0, TUNING.camera.pushInMinRelease);
  }

  stepParry(dt) {
    const P = TUNING.parry;
    this.parryTimer += dt;
    this.vel.x *= 0.75; this.vel.z *= 0.75;
    if (this.parryTimer >= P.stanceDuration + P.recovery) this.state = 'free';
  }

  get parryWindowOpen() {
    return this.state === 'parry' && this.parryTimer <= TUNING.parry.windowFrames / 60;
  }

  /** Called by an enemy swing that would connect. */
  tryParry(enemy) {
    if (!this.parryWindowOpen) return false;
    const P = TUNING.parry;

    enemy.onParried(P.staggerDuration);

    const mid = this.position.clone();
    mid.y += 1.5;
    _v.subVectors(enemy.position, this.position); _v.y = 0; _v.normalize();
    mid.addScaledVector(_v, 1.0);

    World.fx.parryBurst(mid);
    World.requestHitStop(P.successHitStop);
    World.camRig.addTrauma(P.successShake);
    World.camRig.zoomPunch(P.successZoom);
    Audio.impact('parry');
    World.banner('受');
    World.addCombo(1);

    this.parrySuccess = P.counterWindow;
    this.invuln = Math.max(this.invuln, 0.25);
    this.state = 'free';
    this.parryCooldown = 0;
    return true;
  }

  // ---------------------------------------------------------------- hurt

  takeHit(damage, dir) {
    if (this.invuln > 0 || this.iframes > 0) return;
    this.hp = Math.max(0, this.hp - damage);
    this.state = 'hurt';
    this.hurtTimer = 0;
    this.attack = null;
    this.dive = null;
    this.invuln = TUNING.player.hurtInvuln;
    this.vel.addScaledVector(dir, TUNING.player.hurtKnockback);
    this.vel.y = Math.max(this.vel.y, 2.0);
    this.grounded = false;
    this.ribbon.clear();
    this.fan.clear();
    World.camRig.pushTo(0, TUNING.camera.pushInMinRelease);
    this.chainIndex = 0;
    this.airChainIndex = 0;
    World.combo = 0;

    World.fx.inkBurst(this.position.clone().setY(1.4), 16, 'vermilion', 9, dir);
    World.requestHitStop(0.07);
    World.camRig.addTrauma(0.4, dir);
    Audio.impact('playerHurt');

    if (this.hp <= 0) this.respawn();
  }

  respawn() {
    this.hp = TUNING.player.maxHp;
    this.invuln = 1.5;
    World.banner('再');
  }

  stepHurt(dt) {
    this.hurtTimer += dt;
    if (this.grounded) { this.vel.x *= 0.82; this.vel.z *= 0.82; }
    if (this.hurtTimer >= TUNING.player.hurtStun) this.state = 'free';
  }

  // ---------------------------------------------------------------- free

  stepFree(dt) {
    const P = TUNING.player;
    const mv = this.moveInputWorld();

    if (mv && this.landTimer <= 0) {
      const targetX = mv.x * P.moveSpeed;
      const targetZ = mv.z * P.moveSpeed;
      const accel = this.grounded ? P.accel : P.airAccel;
      this.vel.x += (targetX - this.vel.x) * Math.min(1, accel * dt / P.moveSpeed);
      this.vel.z += (targetZ - this.vel.z) * Math.min(1, accel * dt / P.moveSpeed);
      this.moving = true;
    } else {
      if (this.grounded) {
        const f = Math.min(1, P.friction * dt / Math.max(0.001, P.moveSpeed));
        this.vel.x -= this.vel.x * f;
        this.vel.z -= this.vel.z * f;
      }
      this.moving = false;
    }

    // facing
    const locked = World.lockTarget && !World.lockTarget.dead &&
      TUNING.controls.lockFaceWhileMoving;
    if (locked) {
      _v.subVectors(World.lockTarget.position, this.position); _v.y = 0;
      if (_v.lengthSq() > 1e-4) {
        const want = Math.atan2(_v.x, _v.z);
        this.facing += angleDelta(want, this.facing) * Math.min(1, P.lockTurnRate * dt);
      }
    } else if (mv) {
      const want = Math.atan2(mv.x, mv.z);
      this.facing += angleDelta(want, this.facing) * Math.min(1, P.turnRate * dt);
    }
  }

  // ----------------------------------------------------------- integrate

  integrate(dt) {
    const P = TUNING.player;
    const inDiveFall = this.state === 'dive' && this.dive && this.dive.phase !== 'land';
    const inHang = this.state === 'dive' && this.dive && this.dive.phase === 'hang';

    // coyote time refreshes while grounded, then counts down after stepping off
    if (this.grounded) this.coyoteTimer = P.coyoteTime;

    // releasing jump early clips the rise
    if (this.jumpCutArmed) {
      if (this.vel.y <= 0) this.jumpCutArmed = false;
      else if (!Input.isHeld('jump')) {
        this.vel.y *= P.jumpCutMul;
        this.jumpCutArmed = false;
      }
    }

    if (!this.grounded && !inHang && !inDiveFall) {
      let g = P.gravity;
      if (this.vel.y < 0) g *= P.fallGravityMul;
      if (this.state === 'attack') g *= P.attackGravityMul;
      this.vel.y -= g * dt;
    }

    this.position.addScaledVector(this.vel, dt);

    if (this.position.y <= 0) {
      const wasFalling = !this.grounded;
      this.position.y = 0;
      if (this.state === 'dive' && this.dive && this.dive.phase === 'fall') {
        this.land(true);
      } else if (wasFalling) {
        this.land(false);
      }
      this.vel.y = 0;
      this.grounded = true;
    }

    // arena clamp
    const d = Math.hypot(this.position.x, this.position.z);
    if (d > P.arenaRadius) {
      const s = P.arenaRadius / d;
      this.position.x *= s;
      this.position.z *= s;
      this.vel.x *= 0.2; this.vel.z *= 0.2;
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;
  }

  land(fromDive) {
    this.grounded = true;
    this.airDashes = TUNING.dash.airDashesMax;
    this.airJumps = TUNING.player.airJumpsMax;
    this.jumpCutArmed = false;
    this.airChainIndex = 0;
    if (fromDive) {
      this.diveImpact();
      this.dive.phase = 'land';
      this.dive.timer = 0;
    } else {
      this.landTimer = TUNING.player.landingRecovery;
      Audio.land();
      World.fx.inkBurst(this.position.clone().setY(0.1), 5, 'sumi', 3);
    }
  }

  // ------------------------------------------------------------- animate

  animate(dt) {
    const rig = this.rig;
    let pose;

    // integrate cycle phases; never multiply absolute time by a live frequency
    this.idlePhase += 1.9 * dt;
    const running = this.moving && this.grounded && this.state === 'free';
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const cadence = 9.0 + speed * 0.65;
    if (running) this.runPhase += cadence * dt;
    const blendRate = dt / Math.max(1e-4, TUNING.player.runBlendTime);
    this.runBlend = running
      ? Math.min(1, this.runBlend + blendRate)
      : Math.max(0, this.runBlend - blendRate);
    if (this.runBlend === 0) this.runPhase = 0;

    if (this.state === 'attack' && this.attack) {
      const def = this.attack.def;
      const track = TRACKS[def.track];
      pose = evalTrack(track, phaseOf(def, this.attack.elapsed), this.scratch);
    } else if (this.state === 'dash') {
      const u = Math.min(1, this.dashTimer / TUNING.dash.duration);
      pose = blendPoses(POSES.dash, this.grounded ? POSES.ready : POSES.air_idle,
        EASE.inQuad(u) * 0.6, this.scratch);
    } else if (this.state === 'parry') {
      const P = TUNING.parry;
      if (this.parryTimer < P.stanceDuration) {
        const u = Math.min(1, this.parryTimer / 0.06);
        pose = blendPoses(POSES.ready, POSES.guard, EASE.outQuint(u), this.scratch);
      } else {
        const u = Math.min(1, (this.parryTimer - P.stanceDuration) / P.recovery);
        pose = blendPoses(POSES.guard, POSES.ready, EASE.inOutQuad(u), this.scratch);
      }
    } else if (this.state === 'hurt') {
      const u = Math.min(1, this.hurtTimer / TUNING.player.hurtStun);
      pose = blendPoses(POSES.hurt, POSES.ready, EASE.inOutQuad(u) * 0.7, this.scratch);
    } else if (this.state === 'dive') {
      const D = TUNING.attacks.dive;
      if (this.dive.phase === 'hang') {
        const u = Math.min(1, this.dive.timer / (D.hang * 0.55));
        pose = blendPoses(POSES.air_idle, POSES.dive_hang, EASE.outBack(u), this.scratch);
      } else if (this.dive.phase === 'fall') {
        const u = Math.min(1, this.dive.timer / 0.07);
        pose = blendPoses(POSES.dive_hang, POSES.dive_fall, EASE.outQuint(u), this.scratch);
      } else {
        const u = Math.min(1, this.dive.timer / D.recovery);
        pose = blendPoses(POSES.dive_land, POSES.ready, EASE.inOutQuad(u), this.scratch);
      }
    } else if (!this.grounded) {
      pose = blendPoses(POSES.air_idle, POSES.air_idle, 0, this.scratch);
      const sway = Math.sin(this.idlePhase * 2.6) * 0.06;
      pose.rLeg[0] += sway; pose.lLeg[0] -= sway;
    } else {
      // Grounded idle <-> run, cross-faded by runBlend so neither pops.
      pose = blendPoses(POSES.ready, POSES.ready, 0, this.scratch);

      const idleAmt = 1 - this.runBlend;
      const b = Math.sin(this.idlePhase);
      pose.torso[0] = 0.02 * idleAmt + b * 0.02 * idleAmt;
      pose.y = b * 0.035 * idleAmt;
      pose.rArm[0] = 0.2 + b * 0.04 * idleAmt;
      pose.lArm[0] = -0.2 - b * 0.04 * idleAmt;

      if (this.runBlend > 0) {
        const k = this.runBlend;
        const s = Math.sin(this.runPhase);
        const c = Math.cos(this.runPhase);
        pose.rLeg[0] += s * 0.85 * k;
        pose.lLeg[0] += -s * 0.85 * k;
        pose.lArm[0] += s * 0.7 * k;
        pose.rArm[0] += -s * 0.25 * k;
        pose.torso[0] += 0.14 * k;
        pose.torso[1] += c * 0.06 * k;
        pose.y += Math.abs(s) * 0.09 * k;
      }
    }

    applyPose(rig, pose);
    this.mesh.updateMatrixWorld(true);
  }

  sampleRibbon() {
    const a = this.attack;
    const emitFrom = a ? a.def.anticipation * TUNING.fx.trailLeadFrac : 0;
    const swinging = this.state === 'attack' && a &&
      a.elapsed >= emitFrom && a.elapsed < a.def.anticipation + a.def.active;
    const diving = this.state === 'dive' && this.dive && this.dive.phase === 'fall';

    if (swinging) {
      // walk the pose between the previous step and this one so the stroke
      // describes the actual arc rather than a two-point chord
      const subs = Math.max(1, Math.round(TUNING.fx.trailSubSamples));
      const track = TRACKS[a.def.track];
      const from = Math.max(a.prevElapsed, emitFrom);
      const span = a.elapsed - from;
      for (let i = 1; i <= subs; i++) {
        const t = from + (span * i) / subs;
        applyPose(this.rig, evalTrack(track, phaseOf(a.def, t), this.scratchB));
        this.mesh.updateMatrixWorld(true);
        this.tipMarker.getWorldPosition(_tip);
        this.hiltMarker.getWorldPosition(_hilt);
        this.ribbon.push(_tip, _hilt);
      }
      // restore the pose the renderer should actually show
      applyPose(this.rig, evalTrack(track, phaseOf(a.def, a.elapsed), this.scratch));
      this.mesh.updateMatrixWorld(true);
      return;
    }

    if (diving) {
      this.tipMarker.getWorldPosition(_tip);
      this.hiltMarker.getWorldPosition(_hilt);
      this.ribbon.push(_tip, _hilt);
    }
  }

  /** Render-time interpolation between sim states. */
  applyInterpolation(alpha) {
    this.mesh.position.lerpVectors(this.prevPosition, this.position, alpha);
    this.mesh.rotation.y = this.prevFacing + angleDelta(this.facing, this.prevFacing) * alpha;
  }

  // ------------------------------------------------------------- lock-on

  /** Grab the best target without cycling. Used by hold-to-lock. */
  acquireLock() {
    let best = null, bestScore = Infinity;
    for (const e of World.enemies) {
      if (e.dead) continue;
      const d = this.position.distanceTo(e.position);
      if (d > TUNING.lockOn.maxRange) continue;
      _v.subVectors(e.position, this.position); _v.y = 0;
      const ang = Math.abs(angleDelta(Math.atan2(_v.x, _v.z), this.facing));
      const score = d + ang * 4.0;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    World.lockTarget = best;
  }

  toggleLockOn() {
    if (World.lockTarget && !World.lockTarget.dead) {
      // cycle to the next target rather than dropping lock outright
      const alive = World.enemies.filter((e) => !e.dead);
      if (alive.length > 1) {
        const i = alive.indexOf(World.lockTarget);
        World.lockTarget = alive[(i + 1) % alive.length];
        return;
      }
      World.lockTarget = null;
      return;
    }
    let best = null, bestScore = Infinity;
    for (const e of World.enemies) {
      if (e.dead) continue;
      const d = this.position.distanceTo(e.position);
      if (d > TUNING.lockOn.maxRange) continue;
      _v.subVectors(e.position, this.position); _v.y = 0;
      const ang = Math.abs(angleDelta(Math.atan2(_v.x, _v.z), this.facing));
      const score = d + ang * 4.0;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    World.lockTarget = best;
  }

  validateLock() {
    const t = World.lockTarget;
    if (!t) return;
    if (t.dead || this.position.distanceTo(t.position) > TUNING.lockOn.breakRange) {
      World.lockTarget = null;
    }
  }
}
