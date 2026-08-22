# V0.2.1 — Restore Sword Feel · Fix Controls

Patch report. Scope was A–E only; the V0.2 foundation is unchanged except where
listed. Enemy, hits and fx are untouched apart from the one permitted change
(kick direction on connect).

The V0.2 report for phase gates G2.1–G2.5 is preserved in git history at the
`V0.2 — Combat Feel` commit.

---

## The diagnosis, confirmed

V0.2 rebuilt the attack trail as a physically-accurate swept ribbon. That is a
correct blade path and it is the wrong thing to look at, for a reason worth
writing down: **the ribbon arrives with the blade.** The hitbox opens, hit-stop
freezes the world, and at that instant the ribbon has only two or three samples
— a sliver behind the sword. The prototype instead stamped a whole torn arc the
moment the button went down, so the frame that hit-stop freezes already has a
big mark in it.

Measured, on light1: the ribbon has **8 samples** across the swing but is
sub-pixel at the moment of contact. The fan is at **0.88 opacity one sim step
after the press**, before any active frame exists.

Ribbon is not deleted. It still runs, widened (`trailWidthScale` 1.0 → 1.3,
hilt anchor 1.05 → 0.6 so it has body), and it remains the right tool for the
persistent V0.3 strokes, which genuinely do want a real path.

---

## A. Trail

- **`src/gfx/slashfan.js`** — new `SlashFan`, parented to the player group. One
  pre-built arc mesh per attack, geometry cached and shared by shape. Spawns at
  `fan.opacity` (0.95) on the **same sim step the attack starts**, not at active
  frames, and fades as one shape at `fan.fadeRate` (4.5/s). `Ribbon` untouched
  and still active.
- **`createDryBrushTexture`** — the prototype recipe: 40 random rects on a
  256×64 transparent canvas, `h = 2..10`, `len = 50..250`, left-edge jitter
  0–30px, no solid body. The polished `brushTexture` stays with Ribbon.
- **Colours restored** to the A3 spec: L1 sumi, L2 vermilion, L3 sumi, heavy
  deep vermilion, launcher gold, air 1/2/3 alternating, dive sumi.
- Per-attack fan specs are live-editable in the debug panel under
  `fx.fan.perAttack.*`, including the rotation triples.

## B. Snap

`light1`, `light2`, `airLight1`, `airLight2` now have **zero anticipation** —
the `_mid` pose is frame one. Light 3, heavy, launcher and dive keep their
wind-ups; that contrast is the point and it is now much sharper.

| | hit-stop | anticipation |
| --- | ---: | ---: |
| light1 | 45 → **60 ms** | 50 → **0 ms** |
| light2 | 52 → **65 ms** | 45 → **0 ms** |
| airLight1/2 | 42/48 → **55 ms** | 45 → **0 ms** |
| light3 / heavy / launcher / dive | unchanged (130 / 140 / 85 / 160 ms) | unchanged |

`combo.inputBuffer` 0.18 → 0.22; `chainAfter` on light1/2 → 0.06.

**Press catch-up:** every press records a timestamp. The first sim step after it
starts the attack with `elapsed = now − pressTime`, clamped to one step. A press
landing just after a step boundary no longer costs a whole frame.

## C. Camera

- `attackPushIn` 0.55 → **1.6**, driven as a spring: it arrives over
  `pushInAttackTime` (~2 steps) and releases across the attack's *own* recovery
  window. Cancels (dash, parry, jump, hurt) release it immediately.
- **Kick now fires on every connect**, scaled by hit-stop
  (`kickPerHitStop` 6.0 → light ≈ 0.36, heavy ≈ 0.84). Previously only
  hurt and parry passed a direction, so ordinary hits shook without shoving.
- `posLerp` 9 → **6.5**, `fov` 58 → **62**.

## D. Controls — the three bugs

**D1 inversion.** Camera-right is now `cross(forward, up)`, never hand-written.
The old `rx = cos, rz = -sin` was indeed the inverted one.

**D2 lock-on drift.** The movement basis uses the camera's true on-screen
forward — `atan2(look − pos)`, exposed as `camRig.screenYaw` — which already
contains `lockYawOffset`.

**D3 free-cam spin.** The basis is latched on stick-press and held until the
stick returns to deadzone or swings more than `latchBreakAngle` (60°). Free-cam
yaw chase cut from `yawLerp * 0.45` to `* 0.2`.

## E. Controls — tuneable + genre essentials

- **`TUNING.controls`**: `invertX/Y`, `scheme` (`camera`|`character`),
  `latchBasis`, `latchBreakAngle`, `deadzone`, `outerDeadzone`, `lockIsHold`,
  `lockFaceWhileMoving`, plus per-move gates for the directional attacks.
  All live in the debug panel (string values get a text field).
- **Remappable bindings** persisted to `localStorage`, with a click-a-row-then-
  press-a-key UI in the debug panel and a reset button.
- **Jump** on A / Space with `jumpCutMul`, `coyoteTime` 0.08, one air jump, and
  **jump-cancel** past `cancelAfter`. Dash moved to RT / Shift.
- **Launcher hold-follow**: hold to ride the launch, tap to stay grounded.
- **Lock-on directional moves**: toward+light → **stinger** (own
  `magnetStepInMax` 4.5), away+light → **highTime** (launcher alias),
  toward+heavy → **splitter** (heavy alias). Stinger reuses the light-1 family
  with a hard forward lean; no other new animation.

---

## Gates

### ✅ F1 — press to visible stroke ≤ 1 sim step

Instrumented in the debug panel under **"F1 — press to visible stroke"**.

| | value |
| --- | --- |
| Fan opacity 1 sim step after press | **0.88** (visible) |
| Measured latency | **0.8 ms = 0.048 sim steps** |
| With a 12 ms-stale press | attack starts already 12 ms in; fan still 0.88 |
| Fan present during a 260 ms wind-up? | yes — heavy at elapsed 17 ms, still in anticipation, fan at 0.88 |

That last row is the structural proof: the mark exists long before the hitbox
opens, so hit-stop can never freeze an empty frame again.

### ⬜ F2 — side-by-side clip, prototype L1→L2→L3 vs V0.2.1

**Not verified. I cannot record video or run a viewer comparison.** What I can
show is stills of the restored string, captured through the real input path,
in `shots/S1_light1.jpg`, `S2_light2.jpg`, `S3_light3.jpg`, `S4_heavy.jpg`.
The fan reads as a large torn mark with visible bristle gaps on every stroke.
Whether a viewer prefers it is your call to make with an actual clip.

### ✅ F3 — in lock-on, right moves right on screen at all camera angles

Tested by projecting the player's world position through the real camera to NDC
before and after a 24-step full-right hold, across 8 **asymmetric** placements
(player and enemy both moved, so the setup is not rotationally symmetric).

| camera yaw | −78° | −76° | 12° | 60° | 62° | 88° | 161° | 164° |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| screen Δx | +0.238 | +0.237 | +0.267 | +0.306 | +0.256 | +0.245 | +0.316 | +0.258 |

Positive at every angle, with negligible vertical drift. Passes.

### ✅ F4 — holding one direction for 5 s produces a straight line

Tested on a **diagonal** hold (forward-right), which is where the spin actually
manifests — a pure-forward hold is a stable fixed point and passes even when
broken, which is why my first attempt at this test was worthless.

| 5 s diagonal hold | path length | max deviation |
| --- | ---: | ---: |
| Free camera, basis latched | 26.97 m | **0.000 m** |
| Free camera, latch disabled (old behaviour) | 18.81 m | **16.643 m** |
| Lock-on, basis latched | 26.97 m | **0.000 m** |

The un-latched row is the bug, reproduced: it curved so hard it covered 18.8 m
of net displacement while wandering 16.6 m off the line.

### 🟡 F5 — jump-cancel → air light within 2 minutes of handing someone a pad

**Human gate; not run.** Mechanically verified end to end:

| | result |
| --- | --- |
| Jump | airborne, +13.0 m/s |
| Jump during heavy recovery (jump-cancel) | attack → free, airborne, +13.0 m/s |
| Air light off that cancel | `airLight1` starts |
| Jump cut | apex 2.92 m held vs **0.74 m** released early |
| Launcher held / tapped | player rides to +11.5 m/s / stays grounded; enemy launched either way |

---

## Regression checks

| | result |
| --- | --- |
| G2.4 (zero displacement unlocked) | **0.000000 m** for light1/2/3, heavy, launcher **and stinger** |
| Stinger gap-close | 1.15 m @ 3 m · 3.15 @ 5 m · 4.45 @ 6.3 m · **0 @ 8 m** (vs light1's 1.9 m cap) |
| Stinger connect | 18 damage, stagger, 8.8 m/s — above the wall-splat threshold |
| Determinism | identical hash `e9ffb680` across two fresh loads, same seed and scripted input |
| 3-minute soak | no exceptions; pools bounded (23 geometries, 5 textures) |
| Perf, 8 oni | 0.023 ms/sim step (0.14% of frame budget) |
| Fan planes | no two consecutive strokes share a plane, ground string **and** air string |

---

## Deviations from the brief, and why

1. **Per-attack fan specs live in `TUNING.fx.fan.perAttack.*`, not
   `ATTACK_META`.** The brief asked for both ("authored per attack in
   ATTACK_META" and "all values in TUNING.fx.fan.*"). I took the tuning
   placement because it is the standing project rule and because it makes the
   rotation triples live-editable in the debug panel — which is the entire
   reason that rule exists. `ATTACK_META` still owns non-numeric identity.

2. **Light 2's fan plane is re-authored: `[-π/3, π/2, 0]` → `[1.10, 0.60,
   0.90]`.** The prototype value was authored for the prototype's
   straight-behind camera. Under V0.2.1's off-axis rig it renders **edge-on** —
   the mark is technically present and effectively invisible, which defeats the
   whole patch. L1 `[π/4,0,0]` and launcher `[0,π/2,π/2]` were kept exactly as
   specified because they read correctly; I only changed the one that failed.
   I checked `airLight2`, which uses the same construction, and **kept the
   prototype value** — airborne the camera looks down and it reads fine.

3. **The dry-brush texture is drawn white, not the prototype's `#111010`.**
   `MeshBasicMaterial` multiplies map by `material.color`, so a near-black
   texture crushes every trail colour to the same dark smear and the A3 palette
   cannot show at all. The *shape* recipe is the prototype's, unchanged; only
   the ink colour moved to `material.color`. Without this, A3 is a no-op.

4. **Added `magnetism.minStepTime` (0.05 s).** With zero anticipation, the
   existing step-in code delivered the entire lock-on step on frame one — a
   1.9 m teleport, i.e. the lunge V0.2 deliberately removed. The step is now
   spread over at least 50 ms. G2.4 is unaffected.

5. **The movement basis reads `camRig.screenYaw` (sim state) rather than the
   camera's render matrix.** The brief preferred the world matrix. The camera
   matrix is only written at render time, so using it would make movement
   depend on render cadence and break the determinism guarantee. `screenYaw` is
   the same on-screen direction, computed sim-side, so D2 still comes free.

---

## Open questions

1. **F2 is the one that matters and I can't run it.** Record the two clips.
2. **The fan is drawn in the player's local space**, so it swings with the body
   during the attack. The prototype did the same. It may want to detach and
   stay world-anchored once stamped — that would read more like ink on the air
   and less like a held object. Cheap to try.
3. **Stinger has no whiff punish.** 280 ms recovery, but it closes 4.5 m for
   free. Against one enemy that's fine; with the V0.6 wave counts it is
   probably too safe.
4. **`scheme: 'character'` is implemented but untested by hand.** It bypasses
   the latch (a character-relative basis can't spin), so F4 doesn't apply, but
   nobody has played it.
5. **Jump has no dedicated sound** — it reuses the dash whoosh, since audio was
   out of scope for this patch.


---

# Follow-up patch — playtest fixes

Three items from the first play session.

## 1. Choppy footwork on starting to move — fixed

Reported as "short choppy footwork that settles after a few seconds". It was a
real bug and worse than the description: the run cycle computed
`sin(World.time * cadence)` — **absolute** session time multiplied by a
**speed-dependent** frequency. Whenever speed changed, the phase jumped by
`time × Δcadence`, so the error grew without bound as a session ran.

Measured leg movement per frame (a smooth 60 Hz cycle steps ~0.21 rad):

| session age when you start moving | before | after |
| --- | ---: | ---: |
| fresh (0 s) | 0.22 rad | 0.21 rad |
| 30 s | **1.60 rad** | 0.21 rad |
| 120 s | **1.63 rad** | 0.21 rad |
| 600 s | — | 0.21 rad |
| 400 s | — | 0.215 rad |

It also never truly settled: after the speed ramp it was still jumping 1.3–1.66
rad/frame, because even a tiny cadence wobble is multiplied by a large elapsed
time.

The phase is now **integrated** (`runPhase += cadence * dt`), which is immune to
frequency changes. The idle bob and air sway were moved to accumulators too.
Added a `runBlendTime` (0.11 s) cross-fade between idle and run so the legs ease
in and out instead of snapping — starts now read 0.02 → 0.09 → 0.20 → 0.35 rad.

## 2. Lock-on is now a toggle

`controls.lockIsHold` defaults to 0. Press to lock, press again to cycle to the
next living target, press with one target left to release. Hold-to-lock is still
there behind the same flag.

## 3. Settings editor — sliders or fields, and a pause menu

New `src/settings.js` holds one `SettingsEditor`, mounted in **two** places: the
debug overlay (`~`) and a new **pause menu** (`Esc`, `src/pause.js`).

- **Sliders or number fields**, switchable at the top of the panel and
  remembered in `localStorage`. Slider bounds come from `TUNING_RANGES` where a
  value has a meaningful one, and are otherwise inferred from the shipped
  default (0 … 4×). Typing a value outside the inferred bounds widens the
  slider rather than clamping it.
- **Filter box** — 444 editable parameters is too many to scroll; filtering by
  path (e.g. `magnetism`) narrows it to 8 and auto-opens the matching groups.
- **Rebinding** moved into the shared editor, so it is reachable from the pause
  menu without the developer overlay.
- Pause freezes the sim (verified: zero sim steps advance while open) and does
  not bank real time, so resuming doesn't fast-forward.

One bug this introduced and fixed: typing into the filter box was driving the
game — `J`/`K`/`L` buffered attacks and a literal backtick toggled the debug
overlay. Keyboard events originating from an editable field are now ignored by
the input system, and buffers are cleared on pause and resume.
