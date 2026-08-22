# V0.2 — Combat Feel · Phase Report

**Falsifiable question:** Can a player happily hit one enemy for ten minutes?

**Status:** Built and instrumented. Two of five gates are fully verified here.
Three gates (G2.1, G2.2, G2.3) are human-tester gates that I cannot run; the
build and the measurements below are set up so you can run them in one sitting.

---

## 1. What was built

### Project foundation (spec §1)

- Vite + vanilla ES modules, **three 0.185.1** and **tone 15.1.22** pinned in
  `package.json` — no CDN r128.
- `src/tuning.js` holds every number: timings, ranges, forces, thresholds, decay
  rates. Systems read it live, so debug edits apply immediately. Attack totals
  are derived via `attackDuration()`, never written by hand.
- **Fixed-timestep sim at 60 Hz decoupled from render**, with an accumulator,
  render interpolation (`applyInterpolation(alpha)`), and a spiral-of-death
  guard. Hit-stop freezes the world by consuming whole sim steps, so it is
  frame-rate independent.
- **Seeded PRNG** (`src/rng.js`, mulberry32). `?seed=` in the URL. All sim-side
  randomness routes through it.
- **Debug overlay** on `` ` ``: entity state, live frame data, hitbox wedges,
  and an auto-generated editor for every value in tuning, plus spawn/kill/reset
  buttons and a stroke-registry section stubbed for V0.3.
- **Keyboard + mouse + gamepad** (Xbox layout) from day one, with a 0.18 s input
  buffer so combo chaining is forgiving.

### The lunge is gone

The prototype's `handleLightAttack()` teleported the player 2.5 m forward on
*every* attack, locked on or not. That is deleted. In its place:

**Attack magnetism** (`Player.computeMagnetism`) — while locked on and with the
target inside `stepInRange`, the player steps toward it by at most `stepInMax`,
stopping `standoff` short, spread across the attack's anticipation window so it
reads as commitment rather than a teleport. Outside lock-on it is
unconditionally zero. `magnetism.requireLockOn` is a tuning flag documented as
*do not ship 0*.

### Attack personalities

Nine attacks, no two alike in time. Full frame data is in `tuning.js`; the
shape of it:

| Attack | Antic. | Active | Recov. | Hit-stop | Shake | Zoom | Reaction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Light 1 | 50 ms | 75 ms | 120 ms | **45 ms** | 0.09 | — | flinch |
| Light 2 | 45 ms | 75 ms | 135 ms | **52 ms** | 0.11 | — | flinch |
| Light 3 | 225 ms | 100 ms | 300 ms | **130 ms** | 0.40 | −4 | stagger + 15 knock |
| Heavy | 260 ms | 110 ms | 330 ms | **140 ms** | 0.44 | −5 | stagger + 16.5 knock |
| Launcher | 140 ms | 100 ms | 260 ms | **85 ms** | 0.24 | −7.5 | launch, carries player up **on hit only** |
| Air 1 / 2 | 45 ms | 70 ms | ~118 ms | **42 / 48 ms** | 0.08 | — | juggle |
| Air 3 | 90 ms | 90 ms | 200 ms | **95 ms** | 0.22 | −2.5 | juggle |
| Dive | 190 ms hang | plummet @ 36 m/s | 300 ms | **160 ms** | 0.60 | −10 | ground-bounce + radial shockwave |

Light 1/2 are flicks. Light 3 and Heavy are punctuation — long readable wind-up,
triple the hit-stop, knockback that carries a target ~7.7 m into scenery.
Launcher only lifts the player if it connects. Dive freezes at apex, plummets,
and detonates a shockwave with a ground mark.

### Hit reactions (`src/combat/hits.js`)

Six classes, all implemented: **flinch** (brief stun, small recoil, squash),
**stagger** (long stun, heavy knockback, spin, arms the splat), **launch**
(vertical pop with separate rise/fall gravity), **juggle** (flat re-pop that
refreshes hang — deliberately not additive), **ground-bounce** (impact speed
converts to a bounce), and **wall-splat** (pinned flat against a lantern, torii
pillar or the arena rim, extra hit-stop, ink smeared on the surface, 墨 stamp,
then a slide down).

A single code path fires hit-stop, camera trauma, directional camera kick, FOV
punch, ink burst, directional slash spray, an impact ring and the attack's
distinct sound. No attack can ship without all of them.

### Enemy 1 — Oni Stain

Walks in, one telegraphed swing: **620 ms wind-up** with a growing vermilion ink
flare on the ground, horns brightening, body inflating, and a rising audio drone
— readable by eye or by ear alone. Parryable. Brief ink pool on death that
persists (45 s, capped at 26). All six hit-reaction classes land on it.

### Camera

Lock-on framing tracks the pair, pulls back as they separate, rises with
altitude, and pushes in during attacks. Trauma-based shake scales with hit
class (shake = trauma², decaying), with a directional kick along the hit vector
and a tiny high-frequency buzz during hit-stop. Launcher and dive punch the FOV
through a spring.

### Animation and trail

Key-poses tweened with per-segment easing, authored in phase space
(anticipation → active → recovery), so every attack has a real anticipation pose
and retiming in tuning retimes the animation. The static ring is replaced by a
**dry-brush ribbon** that follows the blade tip, with sub-frame sampling of the
pose (4 evaluations per sim step) because a 75 ms swing is under 5 frames at
60 Hz — too coarse to describe an arc.

### Audio

One distinct impact per attack class, separated by timbre, register *and*
envelope, not just pitch: taiko + pluck + crack for lights, deep taiko + wood
crack + wet burst for heavies, a rising koto figure for the launcher, a sub
boom for the dive, a metallic FM ping for the parry, plus whiff, wall-splat,
ground-bounce, death and enemy-telegraph cues.

---

## 2. Gate results

### ✅ G2.4 — Zero attack moves the player when not locked on

**Verified exactly.** Each ground attack was started with no lock-on, no move
input, and run to completion; horizontal displacement measured to 6 decimals:

| Attack | Not locked on | Locked on, target at 4.0 m |
| --- | ---: | ---: |
| Light 1 | **0.000000 m** | 1.900 m |
| Light 2 | **0.000000 m** | 1.900 m |
| Light 3 | **0.000000 m** | 1.900 m |
| Heavy | **0.000000 m** | 1.900 m |
| Launcher | **0.000000 m** | 1.900 m |

Step-in against distance, locked on (`stepInMax` 1.9, `standoff` 1.85,
`stepInRange` 5.0):

| Target distance | 2.0 m | 2.5 m | 3.5 m | 4.5 m | 5.0 m | 6.0 m | 9.0 m |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Player moved | 0.15 | 0.65 | 1.65 | 1.90 | 1.90 | **0** | **0** |

It closes exactly to the standoff, caps at `stepInMax`, and refuses to move at
all beyond `stepInRange`. The debug overlay has a dedicated **"G2.4 — attack
displacement"** section showing lock state, step-in granted, and the measured
displacement of the last attack, so this stays honest as tuning changes.

### 🟡 G2.5 — 60 fps with 8 enemies

**Strong headroom measured, but not on the specified hardware.** Numbers below
are from this Windows dev machine, not an M1 MacBook Air at 1440p, so the gate
is not formally closed. Measured with 8 living oni and the player attacking
continuously:

| Metric | Value | Budget |
| --- | ---: | --- |
| Sim step cost | **0.072 ms** | 0.43% of a 16.67 ms frame |
| Render submit | **1.5 ms/frame** | — |
| Draw calls | 200 | — |
| Triangles | 4,072 | — |
| Geometries / textures | 49 / 5 | — |

A 3-minute soak (10,322 sim steps of continuous varied combat) threw no
exceptions and leaked nothing: the particle pool settled at 103 reusable meshes,
decals at 1, ink pools at 2, scene children at 115, all within their caps.

**To close this gate:** run it on an M1 Air at 1440p and read `fps` and
`frame ms` from the debug overlay with `+8 oni` spawned.

### ⬜ G2.1 — Tester hits the Oni for 10 minutes unprompted, and can name a favourite attack

**Requires a human tester. Not run.** The build is set up for it: the default
spawn is deliberately **one** oni (`spawn.baseCount = 1`) with a 1.1 s respawn,
because this phase's question is about one enemy, not a crowd.

### ⬜ G2.2 — Every attack identifiable from hit-stop + sound alone

**Requires a blindfold test. Not run.** The design intent is in the table above:
hit-stop alone spans 42 ms to 160 ms (a ~3.8× range), and each class has its own
instrument, register and envelope rather than a pitch shift of the same hit.
Whether that is *sufficient* is exactly what the test decides.

### ⬜ G2.3 — Parry learnable in under 2 minutes

**Requires a human tester. Not run.** Mechanically verified as correct and
consistent:

| Case | Result |
| --- | --- |
| Parry within the 6-frame (100 ms) window | Enemy staggered 1.05 s, player took **0** damage, 0.55 s counter-cancel window opened |
| Parry 50 ms late | Player took **12** damage and entered hurt; enemy not staggered |

The telegraph the player is reading is 620 ms of growing ink flare plus a rising
drone, so the read is generous even though the window is strict.

---

## 3. Other behaviour verified

| Behaviour | Evidence |
| --- | --- |
| Determinism | Two fresh page loads, same seed, identical 900-step scripted input → identical state hash `b051e6d6` (41 hits, 9,478 RNG calls, positions matching to 6 dp). A different seed diverges to `94ead785`. |
| Flinch | Light 1 → 9 damage, flinch reaction, target stays grounded |
| Stagger | Light 3 → 24 damage, target carried **7.7 m** |
| Launch | Launcher → target +14.6 m/s vertical, player +11.3 m/s, **only on hit** |
| Juggle | Air string holds the target at y ≈ 3.5–4.2 across three hits without stacking upward |
| Dive | Exactly 40 damage = one 12 clip on the way down + 28 slam; ground-bounce reaction; ground mark decal |
| Wall splat | Heavy knocks an oni 3.7 m into a lantern, pins it, applies 8 bonus damage, writes an ink decal, stamps 墨 |
| Dodge-cancel | Dash during heavy recovery transitions attack → dash in one sim step |
| Sword ribbon | 12 samples across a 125 ms light swing (4 sub-samples per sim step) |

---

## 4. Bugs found and fixed during the build

Worth recording because several were only visible under measurement:

1. **Juggle lift stacked additively** — each air hit added to upward velocity,
   firing juggled enemies into orbit. Now a flat re-pop to the attack's lift.
2. **Dive re-hit every sim step on the way down** — the hit-set was being
   cleared each frame, dealing 12 damage per step. Now one clip per enemy
   per dive.
3. **Wall splat could never fire** — landing disarmed the splat, and ground
   friction killed knockback in ~0.1 s. Staggered targets now keep low drag
   while in flight, and disarm on stun end rather than on landing. Flight
   distance went 3.6 m → 7.7 m.
4. **Lock-on camera sat exactly on the fight axis**, so the player's own
   silhouette eclipsed the target it was hitting. The camera's *placement* yaw
   is now swung off-axis by `lockYawOffset` while the look direction still
   points down the middle of the pair.
5. **Hit-stop froze a blade that hadn't moved yet** — the hitbox opened at the
   top of the wind-up, so a connect froze the character mid-pose with the sword
   still over the shoulder. Attack tracks now start the swing inside the last
   slice of anticipation and reach a mid-swing pose exactly as the hitbox opens.
6. **Sword trail was invisible** — three separate causes: squared alpha fade,
   a brush texture opaque across only the middle 44% of its height, and 60 Hz
   sampling being far too coarse for a sub-5-frame swing. All three fixed.
7. **Ink outlines were sub-pixel at gameplay range** — they were authored as
   scale multipliers, so line weight varied with object size. `addOutline` now
   takes a world-space thickness and derives per-axis scale from the bounding
   box.
8. **Oni rendered dark red, not sumi** — a vermilion emissive on a near-black
   base swamped the toon ramp and pushed the enemy off the locked palette.
9. **Eight oni collapsed into one blob** around the player. Added an attack-slot
   queue: only the nearest `attackSlots` (3) commit; the rest hold at
   `holdBackDistance`. Mean pairwise distance 4.22 m → 6.19 m.

---

## 5. Open questions

1. **G2.5 needs the real machine.** Everything says there is large headroom, but
   an M1 Air at 1440p is a different GPU-bound situation than this box.
2. **Light-attack trails read faintly from the default camera angle.** A light's
   horizontal sweep is close to edge-on from a 35°-elevated camera, so the ink
   arc is much weaker than the heavy's. Arguably correct (lights are meant to be
   small) but `fx.trailWidthScale` is exposed if the blind test says otherwise.
3. **Attack-slot count is a placeholder.** Three committed attackers is a guess
   that makes 8 enemies readable; real crowd choreography is a V0.6 wave-design
   problem, not a V0.2 one.
4. **The heavy and light 3 are currently near-duplicates in feel** — same family,
   same reaction, differing mainly in wind-up length and arc. If the 10-minute
   test says the string finisher and the standalone heavy feel like the same
   move, one of them should change identity.
5. **Boundary wall-splat is an addition to spec.** The brief names lanterns and
   torii; without the arena rim also splatting, a heavy aimed at open ground
   simply ends with the target skidding to a stop. It is behind
   `reactions.wallSplat.boundaryEnabled` if you want it off.
6. **Parry has no failure cost beyond the whiff.** There is a cooldown but no
   punish window, so mashing it is currently viable against a single slow enemy.
   Worth deciding before the enemy count goes up.

---

## 6. Deliberately not built

Per the don't-build list and the phase boundaries: no stroke registry or ink
lifecycle (V0.3), no glyph recognition (V0.4), no scroll state or Finishing
Stroke (V0.5), no waves, style evaluator, rank tiers, end-of-run print,
leaderboard or title screen (V0.6). The HUD carries a plain stroke counter only
— the rank kanji seals from the prototype were removed on purpose so they are
not mistaken for a shipped style system.

Enemy 2 (Tengu) and Enemy 3 (armored) are not built; V0.2 has one enemy by
design. The debug overlay's stroke-registry panel reads "V0.3 — not built".
