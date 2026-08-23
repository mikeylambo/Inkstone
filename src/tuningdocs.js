/**
 * Plain-language description for every tuning parameter.
 *
 * Resolution order: exact path -> structural rule -> leaf name. Most of the
 * 444 leaves are repeats of the same ~39 field names across attacks, hit
 * reactions and fan specs, so those are described once by name and the rest
 * get exact entries. `describeTuning` covers all of them.
 */

/** What each top-level group is for. */
export const SECTION_DOCS = {
  sim: 'The fixed-timestep simulation itself.',
  player: 'Player movement, gravity, jumping and damage response.',
  dash: 'The 8-direction dash and its invulnerability window.',
  parry: 'The timed block and what a successful one is worth.',
  magnetism: 'Lock-on step-in. The ONLY thing allowed to move the player on an attack.',
  attacks: 'Frame data and feel for every attack. Times are seconds.',
  reactions: 'How a struck enemy responds. This is where weight is felt.',
  oni: 'Enemy 1, the Oni Stain: movement, telegraph and crowd behaviour.',
  camera: 'Framing, shake, kick and the attack push-in.',
  fx: 'Particles, decals, the sword ribbon and the SlashFan attack mark.',
  audio: 'Mix levels for the procedural audio.',
  combo: 'Stroke counter and input buffering.',
  spawn: 'How many enemies exist and how fast they come back.',
  ui: 'How the settings menu itself responds to a controller.',
  controls: 'Input scheme, deadzones and which optional moves are enabled.',
  lockOn: 'Target acquisition and release ranges.',
};

/**
 * Field names that repeat across many groups (attacks, reactions, fan specs).
 * Described once here.
 */
export const LEAF_DOCS = {
  // --- attack frame data ---
  anticipation: 'Wind-up time before the hitbox opens. 0 makes the attack land on frame one; long values make it readable and telegraphed.',
  active: 'How long the hitbox stays live. Longer is more forgiving to aim.',
  recovery: 'Locked-out time after the hitbox closes, before you are free again. The main cost of whiffing.',
  damage: 'Hit points removed per connect.',
  reach: 'How far in front of the player the hitbox extends, in metres.',
  arc: 'Width of the hitbox cone in radians. Wider hits more of a crowd.',
  height: 'Vertical band of the hitbox in metres — how far above or below you it still connects.',
  hitStop: 'Seconds the whole world freezes on connect. The single biggest contributor to how heavy a hit feels.',
  shake: 'Camera trauma added on connect. Decays over time; the actual shake is trauma squared.',
  zoom: 'Field-of-view punch on connect, in degrees. Negative pushes the camera in.',
  knock: 'Horizontal impulse pushed into the target, in m/s.',
  lift: 'Vertical impulse pushed into the target, in m/s.',
  selfLift: 'Vertical impulse applied to the PLAYER, and only when the attack actually connects.',
  reaction: 'Which hit-reaction class the target plays: flinch, stagger, launch, juggle or groundBounce.',
  cancelAfter: 'Elapsed time after which dash and jump may cancel this attack. The dodge-cancel window.',
  chainAfter: 'Elapsed time after which the next attack in the string may be buffered. 999 means this move cannot chain.',
  whiffPitch: 'Pitch multiplier for the swing-through-air sound. Higher is faster and brighter.',

  // --- hit reactions ---
  hitstun: 'How long the target is stunned and cannot act.',
  squash: 'Squash-and-stretch amount applied to the body on impact. Purely visual, but it sells the hit.',
  poseTime: 'How long the reaction lean/pose is held before settling.',
  flashTime: 'How long the body flashes white on being hit.',
  recoilDecay: 'How quickly the knockback bleeds off. Higher stops them sooner.',
  spinRate: 'How fast the target tumbles while stunned, in rad/s.',
  riseGravity: 'Gravity while the target is moving upward. Lower means a floatier, longer juggle.',
  fallGravity: 'Gravity while the target is falling. Higher slams them down faster.',

  // --- shared physics / geometry ---
  maxHp: 'Maximum health.',
  radius: 'Collision radius in metres.',
  moveSpeed: 'Top movement speed in m/s.',
  accel: 'How hard it accelerates toward top speed. Higher is snappier and less floaty.',
  turnRate: 'How fast it rotates to face a new direction, in rad/s.',
  gravity: 'Downward acceleration in m/s².',
  cooldown: 'Minimum time before this can be used again.',

  // --- SlashFan geometry ---
  innerR: 'Inner radius of the fan arc in metres — the hole in the middle of the stroke.',
  outerR: 'Outer radius of the fan arc in metres. How far the mark reaches.',
  sweep: 'How much of a circle the arc covers, in radians. 6.28 is a full ring.',
  offsetY: 'Height of the fan above the player’s feet, in metres.',
};

/** Everything with a unique path. */
export const PATH_DOCS = {
  // --- sim ---
  'sim.hz': 'Simulation rate. The sim is fixed-step and decoupled from rendering; changing this changes every frame-based timing in the game.',
  'sim.maxStepsPerFrame': 'Cap on catch-up steps per rendered frame, so a stall cannot spiral into an unrecoverable backlog.',
  'sim.maxFrameDelta': 'Longest real-time gap the loop will accept. Anything larger (an alt-tab, a breakpoint) is clamped.',

  // --- player ---
  'player.friction': 'How hard the player decelerates on the ground with no input.',
  'player.airAccel': 'Air control strength. Low values commit you to a jump arc.',
  'player.airMaxSpeed': 'Top horizontal speed while airborne.',
  'player.lockTurnRate': 'How fast the player swings to face a locked target, in rad/s.',
  'player.fallGravityMul': 'Gravity multiplier while falling. Above 1 gives the classic snappy, non-floaty arc.',
  'player.attackGravityMul': 'Gravity multiplier during an air attack — under 1 makes you hang, which is what keeps juggles alive.',
  'player.arenaRadius': 'How far from the centre the player can go before being clamped.',
  'player.hurtInvuln': 'Invulnerability granted after taking a hit.',
  'player.hurtKnockback': 'How hard the player is pushed when hit.',
  'player.hurtStun': 'How long the player is locked out after being hit.',
  'player.landingRecovery': 'Brief input lockout on touching down, so landings have a little weight.',
  'player.runBlendTime': 'Cross-fade time between the idle and run animation. Larger eases the legs in; smaller snaps.',
  'player.jumpVel': 'Upward velocity applied on jump, in m/s.',
  'player.jumpCutMul': 'Releasing jump early multiplies upward velocity by this. Lower gives more height control.',
  'player.coyoteTime': 'Grace period after walking off an edge during which a jump still works.',
  'player.airJumpsMax': 'Extra mid-air jumps available before landing.',
  'player.jumpCancelEnabled': '1 lets jump cancel an attack past its cancelAfter. This is the DMC jump-cancel and it is why air combos work.',

  // --- dash ---
  'dash.speed': 'Peak dash velocity in m/s.',
  'dash.duration': 'How long the dash lasts.',
  'dash.endSpeedKeep': 'Fraction of dash speed retained when it ends, so you slide out instead of stopping dead.',
  'dash.iframeStart': 'When invulnerability begins, measured from the start of the dash.',
  'dash.iframeEnd': 'When invulnerability ends. The gap between start and end is your true dodge window.',
  'dash.airDashesMax': 'Air dashes available before touching the ground.',
  'dash.airLift': 'Small upward nudge on an air dash so it does not sink.',

  // --- parry ---
  'parry.windowFrames': 'Length of the true parry window in 60ths of a second. Lower is stricter.',
  'parry.stanceDuration': 'Total time in the guard stance, including the late tail after the parry window closes.',
  'parry.successHitStop': 'World freeze on a successful parry.',
  'parry.successShake': 'Camera trauma on a successful parry.',
  'parry.successZoom': 'FOV punch on a successful parry. Negative pushes in.',
  'parry.staggerDuration': 'How long the parried enemy is left helpless — your punish window.',
  'parry.inkBurstCount': 'Number of ink particles in the parry burst.',
  'parry.counterWindow': 'After a parry, how long you may start any attack for free, ignoring normal state rules.',

  // --- magnetism ---
  'magnetism.enabled': 'Master switch for lock-on step-in. 0 means attacks never move the player at all.',
  'magnetism.requireLockOn': '1 means step-in only ever happens while locked on. Setting this to 0 reintroduces the global lunge that was deliberately removed — do not ship it.',
  'magnetism.stepInRange': 'Target must be closer than this for any step-in to happen.',
  'magnetism.stepInMax': 'Hard cap on how far a single attack may move the player.',
  'magnetism.standoff': 'Step-in stops this far from the target centre, so you never end up inside them.',
  'magnetism.airStepScale': 'Multiplier on step-in distance while airborne.',
  'magnetism.maxAngle': 'The target must be within this angle of your facing, in radians, or no step-in happens.',
  'magnetism.minStepTime': 'Minimum time the step-in is spread over. Without it, a zero-anticipation light would deliver its whole step on frame one and read as a teleport.',

  // --- attack specials ---
  'attacks.launcher.holdFollow': '1 means holding the button rides the launch upward and tapping keeps you grounded.',
  'attacks.stinger.magnetStepInMax': 'Stinger overrides the global step-in cap with this, because it is a gap-closer.',
  'attacks.dive.hang': 'How long the player hangs motionless at the apex before dropping.',
  'attacks.dive.hangRise': 'Small upward drift during the hang.',
  'attacks.dive.fallSpeed': 'Downward speed of the plunge in m/s.',
  'attacks.dive.minAltitude': 'Minimum height required to start a dive.',
  'attacks.dive.airHitDamage': 'Damage dealt to anything clipped on the way down, before the slam itself.',

  // --- reactions ---
  'reactions.flinch.recoil': 'Small push-back on a light hit when no explicit knock is set.',
  'reactions.juggle.hangBonus': 'Extra hang time added by each air hit, so a longer juggle floats longer.',
  'reactions.groundBounce.bounceKeep': 'Fraction of impact speed converted into the bounce.',
  'reactions.groundBounce.minBounce': 'Floor on bounce height so a slam always pops them back up.',
  'reactions.wallSplat.boundaryEnabled': '1 makes the arena rim a splat surface too, not just lanterns and torii. Without it, heavies aimed at open ground just skid to a stop.',
  'reactions.wallSplat.speedThreshold': 'Minimum horizontal speed needed to splat against a surface instead of bumping it.',
  'reactions.wallSplat.flightFriction': 'Drag while a staggered enemy is still flying. Low values let a heavy actually carry them into scenery.',
  'reactions.wallSplat.bonusDamage': 'Extra damage for slamming an enemy into something.',
  'reactions.wallSplat.pinTime': 'How long they stay pinned flat against the surface.',
  'reactions.wallSplat.slideTime': 'How long they take to slide back down afterwards.',
  'reactions.wallSplat.splatRadius': 'Size of the ink decal left on the surface.',
  'reactions.airHitLiftMin': 'Any air hit guarantees at least this much lift, so a juggle never dies on a weak hit.',
  'reactions.hitFlashColor': 'Colour the body flashes on being hit, as a hex number.',
  'reactions.knockFriction': 'Ground drag applied to knockback once the target is no longer in splat flight.',

  // --- oni ---
  'oni.separation': 'How far apart two oni try to stay.',
  'oni.separationForce': 'How hard they push each other apart. Too low and a crowd collapses into one blob.',
  'oni.orbitForce': 'Sideways component of that push, so a crowd rings the player instead of queueing on one side.',
  'oni.attackRange': 'How close an oni must be to begin its wind-up.',
  'oni.windup': 'Length of the telegraph before the swing. This is the window you read and parry off; shortening it makes the enemy much harder.',
  'oni.swingReach': 'Reach of the oni’s attack in metres.',
  'oni.swingArc': 'Width of the oni’s attack cone in radians.',
  'oni.approachStop': 'How close a committed oni walks before stopping.',
  'oni.attackSlots': 'How many oni may press the attack at once. The rest hold back — without this a crowd buries the player.',
  'oni.holdBackDistance': 'Where non-committed oni wait for their turn.',
  'oni.aggroDelay': 'Delay before a freshly spawned oni engages.',
  'oni.deathTime': 'How long the death animation takes before the body is removed.',
  'oni.inkPoolRadius': 'Size of the persistent ink pool left on death.',
  'oni.inkPoolLife': 'How long that pool survives before fading. These are the seed of the V0.3 canvas.',
  'oni.flareMaxScale': 'How large the vermilion telegraph ring grows during the wind-up.',
  'oni.hurtFlashHold': 'How long the hit flash is held.',

  // --- camera ---
  'camera.fov': 'Vertical field of view in degrees.',
  'camera.near': 'Near clip plane.',
  'camera.far': 'Far clip plane.',
  'camera.freeDistance': 'How far back the camera sits when not locked on.',
  'camera.freeHeight': 'How high the camera sits when not locked on.',
  'camera.freeLookHeight': 'Height of the point the free camera aims at, relative to the player.',
  'camera.lockDistanceBase': 'Base distance behind the pair when locked on.',
  'camera.lockDistancePerSep': 'Extra distance added per metre of separation, so both fighters stay in frame as they part.',
  'camera.lockDistanceMax': 'Cap on that pull-back.',
  'camera.lockHeight': 'Camera height while locked on.',
  'camera.lockHeightPerAltitude': 'Extra height added as the fight goes airborne, so juggles stay visible.',
  'camera.lockYawOffset': 'How far the camera swings off the player→target axis, in radians. At 0 the player’s own silhouette eclipses whatever they are hitting.',
  'camera.playerBias': 'Where the camera aims between the two fighters. 1 centres on the player, 0 centres on the target.',
  'camera.lookAheadUp': 'How far above the pair the aim point sits.',
  'camera.posLerp': 'How fast the camera chases its target position. Lower lets the frame lag the character a touch.',
  'camera.lookLerp': 'How fast the aim point chases the pair.',
  'camera.yawLerp': 'How fast the camera swings around to a new angle.',
  'camera.traumaDecay': 'How fast shake bleeds off, per second.',
  'camera.traumaMaxOffset': 'Maximum positional shake in metres at full trauma.',
  'camera.traumaMaxRoll': 'Maximum camera roll in radians at full trauma.',
  'camera.traumaFreq': 'Shake frequency. Higher is a buzz, lower is a lurch.',
  'camera.traumaMax': 'Ceiling on accumulated trauma, so a crowd of hits cannot shake the camera into uselessness.',
  'camera.hitStopShake': 'Tiny high-frequency buzz applied while the world is frozen in hit-stop.',
  'camera.kickScale': 'Default directional shove per unit of trauma, used where no explicit kick is given.',
  'camera.kickDecay': 'How fast the directional kick springs back, per second.',
  'camera.zoomStiffness': 'Spring stiffness returning the FOV punch to neutral.',
  'camera.zoomDamping': 'Damping on that spring. Low values make the FOV wobble.',
  'camera.attackPushIn': 'How many metres the camera pushes in during an attack.',
  'camera.pushInAttackTime': 'How fast the push-in arrives. Around two sim steps reads as a snap.',
  'camera.pushInMinRelease': 'Floor on how fast the push-in releases, used when an attack is cancelled.',
  'camera.kickPerHitStop': 'Multiplier turning an attack’s hit-stop into its camera shove, so heavy hits push the frame harder than light ones.',
  'camera.freeYawChase': 'Multiplier on yaw chase when not locked on. High values make the free camera whip around and can fight your movement.',
  'camera.freeYawNudgeRate': 'Right-stick camera turn speed, free camera only, in rad/s.',

  // --- fx ---
  'fx.maxParticles': 'Cap on live particles. Oldest are recycled first.',
  'fx.maxInkPools': 'Cap on persistent death pools before the oldest fade early.',
  'fx.maxDecals': 'Cap on wall splats and ground marks.',
  'fx.sparkLife': 'How long an ink speck lives.',
  'fx.sparkSpeed': 'How fast ink specks fly out.',
  'fx.petalLife': 'How long a sakura petal lives.',
  'fx.shockwaveLife': 'How long the dive shockwave ring lasts.',
  'fx.shockwaveMaxRadius': 'How far the shockwave ring expands.',
  'fx.fan.enabled': 'The stamped plate arc that fires on button-down. 0 leaves the swept Ribbon as the only trail. Turning it on restores an instant mark at the cost of two visual languages overlapping on fast attacks.',
  'fx.fan.opacity': 'Opacity the SlashFan is stamped at. The fan is the stylized attack mark and the main source of impact.',
  'fx.fan.fadeRate': 'How fast the fan fades, in opacity per second. It fades as one shape and never redraws.',
  'fx.fan.widthScale': 'Global size multiplier on every fan arc.',
  'fx.trailSamples': 'Maximum sample points in the sword ribbon.',
  'fx.trailSubSamples': 'Pose evaluations per sim step while swinging. A 75 ms swing is under 5 frames at 60Hz, far too coarse to describe an arc without this.',
  'fx.trailLife': 'How long each ribbon sample survives.',
  'fx.trailLeadFrac': 'Fraction of the wind-up at which the ribbon starts drawing. Matches the pose track, so it only ever samples the swing rather than the arm travelling backwards.',
  'fx.trailWidthScale': 'Width multiplier on the sword ribbon. The ribbon is secondary to the fan.',
  'fx.impactRingLife': 'How long the small ring at the point of contact lasts.',

  // --- audio ---
  'audio.masterVolume': 'Master output level in dB.',
  'audio.whiffVolume': 'Level of swing-through-air sounds in dB.',
  'audio.impactVolume': 'Level of impact sounds in dB.',
  'audio.minRetrigger': 'Minimum spacing between two triggers of the same voice, so simultaneous hits do not collide and drop out.',

  // --- combo / spawn ---
  'combo.window': 'How long the stroke counter and the attack string stay alive between hits.',
  'combo.inputBuffer': 'How early an attack press is remembered. Higher is more forgiving when chaining.',
  'spawn.baseCount': 'How many enemies are kept alive. V0.2 deliberately ships 1 — the phase question is whether one enemy is fun to hit.',
  'spawn.respawnDelay': 'Delay before a killed enemy is replaced.',
  'spawn.ringRadius': 'Distance from the centre that enemies spawn at.',
  'spawn.ringJitter': 'Random extra spawn distance.',

  // --- settings-menu interaction ---
  'ui.navRepeatDelay': 'How long you must hold a direction in this menu before it starts repeating.',
  'ui.navRepeatRate': 'Once repeating, how often the selection steps.',
  'ui.sliderCoarseMul': 'Hold LB while nudging a slider to move this many steps at once.',

  // --- controls ---
  'controls.invertX': '1 flips left/right on the movement stick.',
  'controls.invertY': '1 flips forward/back on the movement stick.',
  'controls.scheme': '"camera" makes the stick camera-relative. "character" makes stick-forward mean the direction you are facing.',
  'controls.latchBasis': '1 locks the movement basis when you press the stick and keeps it until you let go. Without this, a moving camera curves a held direction into a spiral.',
  'controls.latchBreakAngle': 'How far the stick must swing, in radians, before the movement basis is re-captured.',
  'controls.deadzone': 'Stick movement below this is ignored.',
  'controls.outerDeadzone': 'Stick movement above this counts as full tilt, so full deflection reliably reads as full speed.',
  'controls.lockIsHold': '0 makes lock-on a toggle that also cycles targets. 1 makes it hold-to-lock.',
  'controls.lockFaceWhileMoving': '1 keeps you facing a locked target while moving, so you strafe. 0 turns you to face your movement instead.',
  'controls.stingerEnabled': 'Enables toward + light while locked on: a gap-closing thrust.',
  'controls.highTimeEnabled': 'Enables away + light while locked on: an alias of the launcher.',
  'controls.splitterEnabled': 'Enables toward + heavy while locked on.',
  'controls.dirThreshold': 'How firmly the stick must point toward or away from the target to trigger a directional move. Higher demands a more deliberate push.',

  // --- lock-on ---
  'lockOn.maxRange': 'Furthest an enemy can be and still be acquired.',
  'lockOn.breakRange': 'Distance at which an existing lock is dropped. Should exceed maxRange so the lock does not flicker at the edge.',
  'lockOn.switchDeadzone': 'Stick deflection needed to switch targets.',
};

const ROT_AXIS = ['X', 'Y', 'Z'];

/** Description for any tuning path. Returns '' only for paths that do not exist. */
export function describeTuning(path) {
  if (PATH_DOCS[path]) return PATH_DOCS[path];

  const parts = path.split('.');
  const leaf = parts[parts.length - 1];

  // fan rotation triples: fx.fan.<...>.rot.0 / .1 / .2
  if (parts[parts.length - 2] === 'rot' && /^[0-2]$/.test(leaf)) {
    return `Fan rotation about ${ROT_AXIS[+leaf]}, in radians. These aim the attack mark; consecutive strokes should never share a plane or the string reads as one smear.`;
  }

  if (LEAF_DOCS[leaf]) {
    // add which attack / reaction it belongs to, when that isn't obvious
    const owner = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (owner && owner !== 'default' && !/^\d+$/.test(owner)) {
      return `${LEAF_DOCS[leaf]}  (${owner})`;
    }
    return LEAF_DOCS[leaf];
  }
  return '';
}

/** Description for a top-level section. */
export function describeSection(name) {
  return SECTION_DOCS[name] || '';
}
