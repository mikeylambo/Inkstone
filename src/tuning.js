/**
 * SUMI — tuning.js
 * EVERY number lives here. Systems must not contain magic numbers.
 * The debug overlay (~) reflects and live-edits this object by path.
 *
 * Frame-data convention: all times are SECONDS. A "frame" is 1/60s.
 * anticipation -> active -> recovery. Total = sum of the three.
 */

export const TUNING = {
  sim: {
    hz: 60,
    maxStepsPerFrame: 5,
    maxFrameDelta: 0.25,
  },

  player: {
    maxHp: 100,
    radius: 0.55,
    moveSpeed: 9.6,
    accel: 92,
    friction: 74,
    airAccel: 34,
    airMaxSpeed: 7.5,
    turnRate: 18,          // rad/s toward move dir when free
    lockTurnRate: 26,      // rad/s toward target when locked on
    gravity: 30,
    fallGravityMul: 1.45,  // heavier on the way down
    attackGravityMul: 0.34, // hang while swinging in the air, so juggles hold
    arenaRadius: 27.0,
    hurtInvuln: 0.7,
    hurtKnockback: 5.5,
    hurtStun: 0.35,
    landingRecovery: 0.06,
    runBlendTime: 0.11,    // ease the run cycle in/out instead of snapping
    jumpVel: 13.5,
    jumpCutMul: 0.45,      // releasing early clips upward velocity
    coyoteTime: 0.08,
    airJumpsMax: 1,
    jumpCancelEnabled: 1,  // jump cancels an attack past cancelAfter (DMC JC)
  },

  dash: {
    speed: 25.0,
    duration: 0.17,
    endSpeedKeep: 0.30,    // fraction of dash speed retained on exit
    cooldown: 0.40,
    iframeStart: 0.02,
    iframeEnd: 0.15,
    airDashesMax: 1,
    airLift: 1.5,          // small hop so air dash doesn't sink
    shake: 0.02,
  },

  parry: {
    windowFrames: 6,       // 6 frames of true parry
    stanceDuration: 0.30,  // total time in stance (window + late-block tail)
    recovery: 0.20,
    cooldown: 0.32,
    successHitStop: 0.13,
    successShake: 0.34,
    successZoom: -7.0,
    staggerDuration: 1.05, // enemy stagger on parry
    inkBurstCount: 26,
    counterWindow: 0.55,   // free cancel into any attack after a parry
  },

  /**
   * Attack magnetism — replaces the global lunge.
   * Step-in ONLY happens while locked on. Gate G2.4 depends on this.
   */
  magnetism: {
    enabled: 1,
    requireLockOn: 1,      // 1 = never step without lock-on. Do not ship 0.
    stepInRange: 5.0,      // target must be within this to step at all
    stepInMax: 1.9,        // hard cap on distance moved per attack
    standoff: 1.85,        // stop this far from target centre
    airStepScale: 0.65,
    maxAngle: 1.35,        // rad; target must be roughly in front
    minStepTime: 0.05,     // zero-anticipation lights would otherwise teleport
                           // the whole step-in on frame 1
  },

  /**
   * Attack personalities. No two share a silhouette in time.
   *   hitStop  — frames of freeze on connect (this is most of "oomph")
   *   shake    — camera trauma added on connect
   *   zoom     — FOV delta punched on connect (negative = push in)
   *   knock    — horizontal impulse applied to target
   *   lift     — vertical impulse applied to target
   *   selfLift — vertical impulse applied to PLAYER, on hit only
   *   reaction — hit-reaction class the target plays
   */
  attacks: {
    light1: {
      // zero anticipation: the '_mid' pose lands on frame 1. This is the
      // prototype's instant snap, restored deliberately.
      anticipation: 0.000, active: 0.075, recovery: 0.120,
      damage: 9, reach: 3.0, arc: 2.10, height: 2.6,
      hitStop: 0.060, shake: 0.09, zoom: 0,
      knock: 1.2, lift: 0, selfLift: 0,
      reaction: 'flinch', cancelAfter: 0.070, chainAfter: 0.060,
      whiffPitch: 1.00,
    },
    light2: {
      anticipation: 0.000, active: 0.075, recovery: 0.135,
      damage: 10, reach: 3.0, arc: 2.30, height: 2.6,
      hitStop: 0.065, shake: 0.11, zoom: 0,
      knock: 1.4, lift: 0, selfLift: 0,
      reaction: 'flinch', cancelAfter: 0.070, chainAfter: 0.060,
      whiffPitch: 1.14,
    },
    light3: {
      // the punctuation mark: long wind-up, huge stop, knockback, splat-maker
      anticipation: 0.225, active: 0.100, recovery: 0.300,
      damage: 24, reach: 3.7, arc: 1.60, height: 3.0,
      hitStop: 0.130, shake: 0.40, zoom: -4.0,
      knock: 15.0, lift: 2.0, selfLift: 0,
      reaction: 'stagger', cancelAfter: 0.120, chainAfter: 999,
      whiffPitch: 0.72,
    },
    launcher: {
      anticipation: 0.140, active: 0.100, recovery: 0.260,
      damage: 14, reach: 3.2, arc: 1.55, height: 3.2,
      hitStop: 0.085, shake: 0.24, zoom: -7.5,
      knock: 0.6, lift: 15.5, selfLift: 12.0,
      reaction: 'launch', cancelAfter: 0.090, chainAfter: 999,
      whiffPitch: 0.90,
      holdFollow: 1,       // hold the button to ride the launch, tap to stay down
    },
    heavy: {
      // grounded heavy — same family as light3 but a starter, wider arc
      anticipation: 0.260, active: 0.110, recovery: 0.330,
      damage: 26, reach: 3.9, arc: 2.60, height: 3.0,
      hitStop: 0.140, shake: 0.44, zoom: -5.0,
      knock: 16.5, lift: 2.4, selfLift: 0,
      reaction: 'stagger', cancelAfter: 0.130, chainAfter: 999,
      whiffPitch: 0.64,
    },
    airLight1: {
      anticipation: 0.000, active: 0.070, recovery: 0.115,
      damage: 8, reach: 2.9, arc: 2.10, height: 2.6,
      hitStop: 0.055, shake: 0.08, zoom: 0,
      knock: 0.5, lift: 2.6, selfLift: 0,
      reaction: 'juggle', cancelAfter: 0.065, chainAfter: 0.080,
      whiffPitch: 1.22,
    },
    airLight2: {
      anticipation: 0.000, active: 0.070, recovery: 0.120,
      damage: 9, reach: 2.9, arc: 2.30, height: 2.6,
      hitStop: 0.055, shake: 0.09, zoom: 0,
      knock: 0.5, lift: 2.8, selfLift: 0,
      reaction: 'juggle', cancelAfter: 0.065, chainAfter: 0.080,
      whiffPitch: 1.36,
    },
    airLight3: {
      anticipation: 0.090, active: 0.090, recovery: 0.200,
      damage: 15, reach: 3.2, arc: 2.00, height: 2.8,
      hitStop: 0.095, shake: 0.22, zoom: -2.5,
      knock: 2.2, lift: 4.2, selfLift: 2.2,
      reaction: 'juggle', cancelAfter: 0.095, chainAfter: 999,
      whiffPitch: 1.05,
    },
    stinger: {
      // lock-on + toward + light. Gap-closer: it is ALLOWED a long step-in,
      // which is why it carries its own magnetStepInMax.
      anticipation: 0.070, active: 0.090, recovery: 0.280,
      damage: 18, reach: 3.4, arc: 1.10, height: 2.8,
      hitStop: 0.105, shake: 0.30, zoom: -5.0,
      knock: 12.0, lift: 1.2, selfLift: 0,
      reaction: 'stagger', cancelAfter: 0.110, chainAfter: 999,
      whiffPitch: 0.84,
      magnetStepInMax: 4.5,
    },
    dive: {
      // air + heavy. hang -> plummet -> radial shockwave
      hang: 0.190,           // gravity off, tiny rise, camera holds
      hangRise: 2.2,
      fallSpeed: 36.0,
      minAltitude: 1.2,      // won't dive below this
      recovery: 0.300,
      damage: 28, radius: 4.4,
      hitStop: 0.160, shake: 0.60, zoom: -10.0,
      knock: 9.0, lift: 4.0,
      reaction: 'groundBounce',
      cancelAfter: 0.160,
      airHitDamage: 12,      // clipping an enemy on the way down
    },
  },

  /** Hit reactions. This is where weight is actually felt. */
  reactions: {
    flinch: {
      hitstun: 0.20, recoil: 1.1, recoilDecay: 9.0,
      squash: 0.22, poseTime: 0.14, flashTime: 0.07,
    },
    stagger: {
      hitstun: 0.55, recoilDecay: 3.2,
      squash: 0.34, poseTime: 0.40, flashTime: 0.10,
      spinRate: 5.0,
    },
    launch: {
      hitstun: 0.60, riseGravity: 13.0, fallGravity: 27.0,
      spinRate: 3.0, squash: 0.30,
    },
    juggle: {
      hitstun: 0.28, riseGravity: 11.0, fallGravity: 24.0,
      hangBonus: 0.06,      // each air hit adds hang time
      squash: 0.24,
    },
    groundBounce: {
      hitstun: 0.50, bounceKeep: 0.55, minBounce: 5.5,
      squash: 0.45, poseTime: 0.30,
    },
    wallSplat: {
      boundaryEnabled: 1,    // the arena rim splats too, else heavies die at the edge
      speedThreshold: 8.0,
      flightFriction: 1.1,   // low drag while a staggered target is still flying,
                             // so a heavy actually carries it into scenery
      hitStop: 0.170, shake: 0.50, zoom: -6.0,
      bonusDamage: 8,
      pinTime: 0.42,
      slideTime: 0.55,
      squash: 0.55,
      splatRadius: 1.9,
    },
    /** shared */
    airHitLiftMin: 2.4,      // any air hit guarantees at least this much lift
    hitFlashColor: 0xf5eedc,
    knockFriction: 6.0,
  },

  oni: {
    maxHp: 120,
    radius: 0.95,
    height: 2.8,
    moveSpeed: 3.5,
    accel: 14,
    turnRate: 4.6,
    separation: 2.9,         // push-apart radius between oni
    separationForce: 16.0,   // they stacked into one blob at 6.0
    orbitForce: 2.2,         // tangential drift so a crowd rings the player
                             // instead of queueing up on one side
    // telegraph must be readable: >= 0.5s of ink flare
    attackRange: 2.9,
    windup: 0.62,
    active: 0.16,
    recovery: 0.80,
    cooldown: 1.15,
    damage: 12,
    swingReach: 3.4,
    swingArc: 1.5,
    approachStop: 2.4,
    attackSlots: 3,          // how many oni may press the attack at once
    holdBackDistance: 7.0,   // the rest circle at this range and wait
    aggroDelay: 0.30,
    gravity: 26,
    deathTime: 0.45,
    inkPoolRadius: 2.1,
    inkPoolLife: 45.0,       // "persists" — long, but capped by fx.maxInkPools
    flareMaxScale: 2.6,
    hurtFlashHold: 0.06,
  },

  camera: {
    fov: 62,
    near: 0.1,
    far: 400,
    // free-follow
    freeDistance: 9.8,
    freeHeight: 5.6,
    freeLookHeight: 1.6,
    // lock-on framing: pull back as the pair separates so both stay in frame
    lockDistanceBase: 7.6,
    lockDistancePerSep: 0.62,
    lockDistanceMax: 17.0,
    lockHeight: 5.4,
    lockHeightPerAltitude: 0.55,
    // The camera must NOT sit on the player->target axis or the player
    // eclipses the thing being hit. Placement yaw is swung off-axis by this
    // much (radians) while the look direction still points at the pair.
    lockYawOffset: 0.68,
    playerBias: 0.55,        // 1 = centre on player, 0 = centre on target
    lookAheadUp: 1.5,
    posLerp: 6.5,   // frame lags the character a touch
    lookLerp: 12.0,
    yawLerp: 7.0,
    // shake
    traumaDecay: 1.9,
    traumaMaxOffset: 1.05,
    traumaMaxRoll: 0.085,
    traumaFreq: 27,
    traumaMax: 1.2,
    hitStopShake: 0.055,     // tiny high-freq buzz while frozen
    kickScale: 0.55,         // directional punch along the hit vector
    kickDecay: 0.00002,      // per second; snaps back fast
    // zoom punch spring
    zoomStiffness: 150,
    zoomDamping: 15,
    // Push-in is a spring, not a lerp: it snaps in over pushInAttackTime and
    // releases across the attack's own recovery window.
    attackPushIn: 1.6,       // metres closer while attacking
    pushInAttackTime: 0.033, // ~2 sim steps to arrive
    pushInMinRelease: 0.12,  // floor on the release time
    kickPerHitStop: 6.0,     // hit kick = hitStop * this (light ~0.35, heavy ~0.9)
    freeYawChase: 0.2,       // multiplier on yawLerp when not locked on
    freeYawNudgeRate: 2.2,   // rad/s from the right stick, free camera only
  },

  fx: {
    maxParticles: 320,
    maxInkPools: 26,
    maxDecals: 40,
    sparkLife: 0.36,
    sparkSpeed: 11,
    petalLife: 1.3,
    shockwaveLife: 0.45,
    shockwaveMaxRadius: 5.2,
    // --- SlashFan: the stylized attack mark. This, not the blade path, is
    // where the sword's impact comes from. Per-attack specs live here rather
    // than in ATTACK_META so the debug panel can tune the planes live.
    fan: {
      /**
       * The stamped plate arc. Off by default: the Ribbon (the swept blade
       * path) is the trail, and on fast attacks the fan's hard concentric
       * plates sit awkwardly beside the ribbon's soft smear. Flip to 1 in the
       * pause menu to bring it back without a rebuild.
       */
      enabled: 0,
      opacity: 0.95,
      fadeRate: 4.5,
      widthScale: 1.0,
      default: { innerR: 1.2, outerR: 3.4, sweep: 2.356, rot: [1.5708, 0, 0], offsetY: 1.2 },
      perAttack: {
        light1:    { innerR: 1.2, outerR: 3.4, sweep: 2.356, rot: [0.7854, 0, 0], offsetY: 1.2 },
        // Prototype L2 was [-PI/3, PI/2, 0]. That was authored for the
        // prototype's straight-behind camera; under V0.2.1's off-axis rig it
        // renders edge-on and the mark is effectively invisible, which defeats
        // the point of the fan. Re-authored onto a plane that reads, still
        // clearly distinct from L1's.
        light2:    { innerR: 1.2, outerR: 3.4, sweep: 2.356, rot: [1.10, 0.60, 0.90], offsetY: 1.2 },
        light3:    { innerR: 1.0, outerR: 4.0, sweep: 2.618, rot: [1.5708, 0, 0.6], offsetY: 1.4 },
        heavy:     { innerR: 0.9, outerR: 4.2, sweep: 2.880, rot: [1.2, 0.4, -0.5], offsetY: 1.3 },
        launcher:  { innerR: 1.2, outerR: 3.4, sweep: 2.356, rot: [0, 1.5708, 1.5708], offsetY: 1.2 },
        stinger:   { innerR: 0.5, outerR: 3.9, sweep: 0.900, rot: [1.5708, 0, 0], offsetY: 1.3 },
        airLight1: { innerR: 1.1, outerR: 3.1, sweep: 2.356, rot: [1.0472, 0, 0], offsetY: 1.1 },
        airLight2: { innerR: 1.1, outerR: 3.1, sweep: 2.356, rot: [-0.9, 1.5708, 0], offsetY: 1.1 },
        airLight3: { innerR: 1.0, outerR: 3.6, sweep: 2.618, rot: [1.5708, 0.8, 0], offsetY: 1.2 },
        dive:      { innerR: 0.6, outerR: 4.4, sweep: 6.283, rot: [1.5708, 0, 0], offsetY: 0.4 },
      },
    },
    trailSamples: 160,     // headroom so a long swing isn't truncated mid-stroke
    trailLayers: 4,        // independent trails alive at once. A 3-hit string
                           // at ~100ms spacing outlives trailLife, so fewer
                           // layers than that means a combo overwrites its own
                           // earlier strokes. Pool size — set at construction.
    /**
     * The ribbon samples by DISTANCE, not by a fixed count per sim step. A
     * fixed count gave wildly different density depending on swing speed —
     * measured 12.9 samples/m on the heavy against 2.5 on light 1, which is
     * why only the slow attacks read as a continuous smear.
     */
    trailSampleDist: 0.085,  // metres of blade-tip travel between samples
    trailMaxSubSamples: 28,  // cost bound on pose evaluations per sim step
    trailFollowThrough: 0.07, // keep emitting this long past the active window,
                              // so the trail carries the follow-through
    trailLife: 0.34,
    trailLeadFrac: 0.85,     // fraction of anticipation at which the stroke
                             // starts drawing. Matches the pose track's '_mid'
                             // key, so the trail only ever samples the swing —
                             // never the arm travelling backwards on the raise.
    trailWidthScale: 1.3,   // Ribbon is secondary to the fan, but needs body
    impactRingLife: 0.22,
  },

  audio: {
    masterVolume: -4,
    /**
     * Two real gain buses, in dBFS. Everything that exists today is an effect
     * and runs through sfx; music is wired but has no sources yet, so the
     * option that drives it says so rather than pretending.
     */
    musicVolume: 0,
    sfxVolume: 0,
    whiffVolume: -18,
    impactVolume: -3,
    minRetrigger: 0.020,
  },

  combo: {
    window: 2.6,             // seconds before the stroke counter resets
    inputBuffer: 0.22,       // attack input buffering
  },

  spawn: {
    baseCount: 1,            // V0.2 asks: can you hit ONE enemy for ten minutes?
    respawnDelay: 1.10,
    ringRadius: 8.0,
    ringJitter: 3.0,
  },

  /** Settings-menu interaction. UI timings, not game feel. */
  ui: {
    navRepeatDelay: 0.38,    // hold a direction this long before it repeats
    navRepeatRate: 0.07,     // then step this often
    sliderCoarseMul: 10,     // hold LB for bigger slider steps
  },

  controls: {
    invertX: 0,
    invertY: 0,
    /** 'camera' = stick is camera-relative. 'character' = stick forward is facing. */
    scheme: 'camera',
    /**
     * Latch the movement basis while the stick is held, so a moving camera
     * cannot curve a held direction into a spiral (gate F4).
     */
    latchBasis: 1,
    /**
     * Latching while LOCKED ON is wrong and is off by default. The latch
     * exists to break the free-camera feedback spiral (camera chases your
     * velocity -> basis follows camera -> velocity rotates -> repeat). Lock-on
     * has no such loop: the camera yaw comes from the player->target axis. With
     * the basis latched, dashing past a target left "forward" pointing at where
     * the target used to be, so you flew away from it. Unlatched, forward
     * always means toward the target and sideways strafes around it.
     */
    latchWhileLocked: 0,
    latchBreakAngle: 1.05,   // rad; re-latch if the stick swings more than this
    deadzone: 0.22,
    outerDeadzone: 0.95,
    lockIsHold: 0,           // 1 = hold to lock on, 0 = press to toggle/cycle
    lockFaceWhileMoving: 1,  // strafe-face the target instead of the stick
    /** Lock-on directional attacks, individually gated. */
    stingerEnabled: 1,
    highTimeEnabled: 1,
    splitterEnabled: 1,
    dirThreshold: 0.55,      // cos-ish gate for "toward" / "away" vs the target
  },

  /**
   * ---- V0.2.5 SHELL ----
   * Everything below this line is run structure, not combat feel. Gate S6 says
   * the combat sections above must not move.
   */

  waves: {
    /**
     * Authored wave table. `types` is the slot: V0.3's tengu and V0.6's
     * armoured stain drop into these arrays, no code change required.
     *   count    — enemies in the wave
     *   interval — seconds between individual spawns
     *   rest     — breather after the wave is cleared. Heals nothing.
     */
    table: [
      { count: 2, types: ['oni'], interval: 0.70, rest: 3.0 },
      { count: 3, types: ['oni'], interval: 0.65, rest: 3.0 },
      { count: 4, types: ['oni'], interval: 0.60, rest: 2.8 },
      { count: 4, types: ['oni'], interval: 0.45, rest: 2.8 },
      { count: 5, types: ['oni'], interval: 0.55, rest: 2.6 },
      { count: 6, types: ['oni'], interval: 0.50, rest: 2.6 },
      { count: 6, types: ['oni'], interval: 0.35, rest: 2.4 },
      { count: 7, types: ['oni'], interval: 0.45, rest: 2.4 },
      { count: 8, types: ['oni'], interval: 0.40, rest: 2.2 },
      { count: 9, types: ['oni'], interval: 0.30, rest: 2.0 },
    ],
    /** Applied repeatedly once the table runs out. */
    escalation: {
      countAdd: 1,
      restMul: 0.95,
      intervalMul: 0.97,
      countMax: 16,
      restMin: 1.2,
      intervalMin: 0.18,
    },
    spawnRadius: 12.0,
    spawnJitter: 4.0,
    firstWaveDelay: 1.1,
    bannerHold: 1.7,
    clearGraceSteps: 6,      // sim steps of "no enemies" before a wave counts cleared
  },

  score: {
    hitBase: 12,
    hitPerDamage: 1.2,
    killBonus: 140,
    parryBonus: 90,
    splatBonus: 120,
    waveBonus: 400,
    wavePerIndex: 0.22,      // each wave is worth more than the last
    damagePenalty: 6,        // per point of health lost
    comboMulPerHit: 0.05,
    comboMulMax: 4.0,
  },

  record: {
    maxEvents: 50000,
    posSampleHz: 10,
  },

  run: {
    /**
     * The death beat. Kept short on purpose: gate S1 allows under 2s from
     * death to being back in a run, and a long stamp would eat the whole
     * budget. It is also skippable — see Game.update.
     */
    deathSilence: 0.40,      // beat of silence before the seal lands
    deathBannerHold: 0.75,
    fadeMs: 220,             // no transition may exceed 300ms (Katana ZERO rule)
    startCountdown: 0.0,     // straight into it; no 3-2-1
  },

  lockOn: {
    maxRange: 26.0,
    breakRange: 30.0,
    switchDeadzone: 0.5,
  },

  /**
   * ---- V0.2.6 FRAME ----
   * Shell, difficulty and accessibility. Nothing below here is combat feel;
   * gate FR6 says the combat sections must stay diff-clean.
   */

  /**
   * Difficulty is reserved, not built. Only STANDARD is selectable. The hooks
   * are deliberately wave-table and aggression multipliers rather than
   * HP/damage sliders — scaling numbers makes a fight longer, not harder, and
   * a scoresmith wants the fight to change shape.
   */
  difficulty: {
    current: 'standard',
    /** Per-difficulty multipliers. Empty bodies = no effect, by design. */
    unwritten: { waveCountMul: 1, waveIntervalMul: 1, aggressionMul: 1, scoreMul: 1 },
    standard: { waveCountMul: 1, waveIntervalMul: 1, aggressionMul: 1, scoreMul: 1 },
    bloodink: { waveCountMul: 1, waveIntervalMul: 1, aggressionMul: 1, scoreMul: 1 },
    master: { waveCountMul: 1, waveIntervalMul: 1, aggressionMul: 1, scoreMul: 1 },
    void: { waveCountMul: 1, waveIntervalMul: 1, aggressionMul: 1, scoreMul: 1 },
  },

  /**
   * Accessibility scalars. Every one of these is 1.0 by default and is applied
   * at a single chokepoint, so the shipped game is bit-identical to V0.2.5
   * until a player changes one. Gate FR6 checks exactly that.
   */
  access: {
    shakeScale: 1.0,       // World-wide multiplier on camera trauma
    hitStopScale: 1.0,     // multiplier on every freeze request
    flashScale: 1.0,       // multiplier on hit-flash duration
    camMotionScale: 1.0,   // kick, zoom punch and push-in
    highContrast: 0,       // 1 = enemy tells get a high-contrast treatment
    textScale: 1.0,        // UI text size multiplier
  },

  /** Shell behaviour that is not combat and not accessibility. */
  frame: {
    hints: 1,              // control hints in the run HUD
    resolutionScale: 1.0,  // renderer pixel ratio multiplier
    inkDensity: 1.0,       // scales the ribbon budget (trailLayers / trailSamples)
    galleryMax: 20,        // prints kept in the Scroll Gallery
    waveChoiceEnabled: 0,  // dev flag — WAVE_CHOICE is a reserved state
  },
};

/**
 * Optional min/max hints for the debug sliders. Anything not listed
 * gets an inferred range of [0, 4x default].
 */
export const TUNING_RANGES = {
  'magnetism.requireLockOn': [0, 1, 1],
  'magnetism.enabled': [0, 1, 1],
  'parry.windowFrames': [1, 20, 1],
  'camera.playerBias': [0, 1, 0.01],
  'camera.fov': [30, 100, 1],
  'sim.hz': [30, 120, 1],
  // Count-typed values: without an explicit step the editor infers one from
  // magnitude and hands you a fractional loop count.
  'sim.maxStepsPerFrame': [1, 12, 1],
  'player.maxHp': [1, 500, 1],
  'oni.maxHp': [1, 500, 1],
  'parry.inkBurstCount': [0, 80, 1],
  'fx.maxParticles': [0, 1000, 1],
  'fx.maxInkPools': [0, 100, 1],
  'fx.maxDecals': [0, 200, 1],
  'fx.trailSamples': [8, 400, 1],
  'fx.trailLayers': [1, 8, 1],
  'fx.trailMaxSubSamples': [1, 64, 1],
  'spawn.baseCount': [1, 16, 1],
  'waves.escalation.countAdd': [0, 8, 1],
  'waves.escalation.countMax': [1, 32, 1],
  'record.maxEvents': [1000, 200000, 1000],
};

/** Frozen copy so the debug panel can offer "reset to shipped value". */
export const TUNING_DEFAULTS = structuredClone(TUNING);

export function getTuning(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), TUNING);
}

export function setTuning(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => o[k], TUNING);
  obj[last] = value;
}

/** Total duration of an attack, derived — never hand-write this. */
export function attackDuration(a) {
  if (a.hang !== undefined) return a.hang + a.recovery;
  return a.anticipation + a.active + a.recovery;
}
