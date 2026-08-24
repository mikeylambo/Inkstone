# V0.2.5 — The Shell · Phase Report

The frame of the finished game, with every screen, mode and slot in place.
Combat was not touched: gate S6 is the proof.

**Status:** all six gates pass. Several were measured with the app driven
manually, because the headless browser pane used for verification does not
composite and therefore never fires `requestAnimationFrame`; where that matters
it is called out.

---

## What was built

**State machine (`src/game.js`)** — `BOOT → TITLE → RUN_SETUP → RUN ⇄ PAUSE →
DEATH → RESULTS → TITLE`. One owner of state. Input routes by state: menus
consume it, RUN forwards to the player, PAUSE freezes the sim but not the
settings UI (the existing pause menu is mounted unchanged, with Restart and
Abandon added).

**`Run` replaces `World.reset()` (`src/run.js`)** — a Run owns its rng, fx,
enemies, score, record and wave state, and is created and destroyed whole.
`World` is now a *view* onto the current run rather than eternal storage, which
is what let the combat systems keep reading `World.enemies` untouched. The
player object persists (its meshes are expensive to rebuild) and is put back by
`resetForRun()`.

**Screens** — TITLE (logo, Begin-last-mode, Modes, Settings, version badge),
RUN_SETUP (three modes with personal bests and a seed field), PAUSE, DEATH
(silence, then 討 stamped inverted), RESULTS (stats, hanko seal, PB delta,
local board, the scroll print with a PNG export, and Again / Title / Copy
Seed). First boot skips the menu and drops straight into a run.

**Waves (`TUNING.waves`)** — 10 authored waves, then escalation (+1 count,
×0.95 rest, ×0.97 interval, capped). `types: ['oni']` is the slot V0.3's tengu
and V0.6's armoured stain drop into; an unknown type falls back to oni rather
than spawning nothing. Kanji wave banner, and a rest period that heals nothing.

**Score (`src/score.js`)** — per-hit base × combo multiplier, plus kill, parry,
splat and wave bonuses and a damage penalty. `evaluate(runRecord)` is the V0.6
evaluator slot and already returns the fields the evaluator will fill.

**RunRecord (`src/record.js`)** — ring-buffered, sim-step-stamped, serialisable.
50k event cap, player position at 10 Hz, plus `strokePlaceholder` waiting for
V0.3. `hash()` and `spawnHash()` support gate S3 and future ghosts.

**Profile / Board** — `sumi.profile.v1` with bests per mode (daily keyed by UTC
date), total runs, tutorial flag, and JSON export/import that also carries the
bindings and editor-mode keys. `LocalBoard` is wired into RESULTS;
`SupabaseBoard` is an empty class with the same signature and a TODO pointing
at the Signal pattern. Entries are version-stamped.

---

## Gates

### ✅ S1 — cold load → combat < 5 s; death → new run < 2 s

| | measured |
| --- | ---: |
| Cold first boot → in combat | **30 ms** |
| DOMContentLoaded / load | 202 ms / 207 ms |
| Death beat (silence + seal) | 1150 ms |
| Restart work itself | **0.3 ms** |
| **Death → new run, one button** | **1150 ms** |
| Death beat when skipped | **0 ms** |

First boot goes straight into a run rather than parking on a menu, which is why
cold-load-to-combat is 30 ms rather than a menu step.

The death beat was originally 1.85 s, which ate almost the whole 2 s budget, so
it was shortened to 1.15 s **and made skippable** — any action button cuts it
short, so a player who already knows they died never waits. No transition
exceeds 300 ms (screen fade is 180 ms).

### ✅ S2 — full loop on a pad only

Driven end to end with a synthetic Xbox pad and no keyboard or mouse input:

```
TITLE (focus BEGIN) → D-pad down → MODES → A
  → RUN_SETUP (focus DAILY SCROLL) → A
  → RUN → death → RESULTS (focus AGAIN) → A
  → RUN
```

Every step landed. START paused and resumed from RUN. "Again" latency 35 ms.
All shell screens route through `MenuNav`, which reads the pad directly with
its own repeat timing.

#### What S2 missed, and the follow-up fix

The gate walked the *spine* of the loop, so it passed while three pad paths
were still dead. Playtesting found all three:

* D-pad could reach the `sim` group in settings but not walk into or past it
* SETTINGS was unreachable from TITLE with a pad
* RESTART / ABANDON / RESUME in the pause menu could not be focused

One root cause: **two navigation systems fighting over the same focus.**
`MenuNav` only walks elements marked `[data-menu-item]`, and the settings
editor built its rows without that mark while running its own pad handler.
Where both were live they cancelled out; where only the editor's was live the
pause menu's head buttons — which sit *outside* the editor's root — were
unreachable by construction.

Now there is exactly one nav per screen:

* `SettingsEditor.nav()` marks every row `[data-menu-item]`
* `SettingsScreen`'s competing `update()` override is gone
* `PauseMenu` owns a `MenuNav` over `#pause-panel`, so head buttons and editor
  rows share one focus ring
* `MenuNav.activate()` toggles a `<summary>` open; new `MenuNav.adjust()` puts
  left/right on sliders and number fields, with LB for coarse steps

Verified with a synthetic pad, no keyboard or mouse:

| path | result |
| --- | --- |
| TITLE → down ×2 → A | SETTINGS, 617 nav items |
| focus `sim` → A → down ×3 | `sim.hz`, `sim.maxStepsPerFrame`, `sim.maxFrameDelta`, then on to `player` |
| D-right / D-left on a slider | 5 → 5.05 → 5, LB gives a bigger step |
| pause → RESTART → A | fresh run, state RUN |
| pause → ABANDON → A | state RESULTS |
| pause → RESUME → A | state RUN, unpaused |

While in there: count-typed parameters (`sim.maxStepsPerFrame`, `fx.trailLayers`,
`waves.escalation.countMax`, …) had no entry in `TUNING_RANGES`, so the editor
inferred a step from magnitude and handed you a fractional loop count. They now
carry explicit integer hints and step by 1. Float parameters are unchanged —
`camera.playerBias` still steps 0.01.

### ✅ S3 — same daily seed twice = identical wave spawns

Two runs on the same daily seed, both driven for 3,600 sim steps with enemies
killed so waves advance:

| | run 1 | run 2 |
| --- | --- | --- |
| spawn hash | `e0e65e58` | `e0e65e58` |
| spawns | 82 | 82 |
| waves reached | 13 | 13 |

A different seed gives a different hash. Escalation past the authored table was
checked separately: wave 11 → 10 enemies, wave 15 → 14, wave 31 → capped at 16
with interval floored at 0.18 s and rest at 1.2 s.

### ✅ S4 — RESULTS print exports a PNG

The print renders the run's movement path, kills as ink blots, hits taken as
vermilion crosses, an arena rim, a caption and a hanko seal. Verified:

| | value |
| --- | --- |
| Canvas in the DOM | yes, 560 × 560 |
| PNG blob | **68,211 bytes**, `image/png` |
| Ink pixels sampled | 140 (i.e. not a blank sheet) |

Stroke events are already drawn by the print — the array is simply empty until
V0.3 fills it.

### ✅ S5 — bests survive reload, two modes track separately

| | before reload | after reload |
| --- | ---: | ---: |
| DAILY best | 4321 | **4321** |
| FREE best | 999 | **999** |

A worse daily run was correctly rejected, and a different date returns no
record — daily bests are keyed per UTC day, not globally.

### ✅ S6 — combat feel byte-identical

No value in the combat sections of `tuning.js` changed. Spot-checked after the
whole refactor: light1 hit-stop 0.06, heavy 0.14, `magnetism.stepInMax` 1.9,
`requireLockOn` 1, parry window 6 frames, FOV 62, dash speed 25, fan disabled,
`trailSampleDist` 0.085 — all as V0.2.1 left them. The shell's numbers live in
new sections (`waves`, `score`, `record`, `run`, `ui`) below a marked divider.

KATA plays as the V0.2 build did: no waves, one oni endlessly replaced, and a
lethal hit **respawns in place** rather than ending the run (verified: HP back
to 100, run not over, still in RUN).

Determinism, three consecutive runs on one seed with identical scripted input:

| | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| state hash | `53863df2` | `53863df2` | `53863df2` |
| record hash | `219f8774` | `219f8774` | `219f8774` |
| RNG calls | 1184 | 1184 | 1184 |

Performance with waves running: **0.025 ms/sim step** (0.15% of frame budget),
106 draw calls.

---

## Two real bugs the gates caught

Both were found because S6 asked for determinism, and both would have stayed
invisible in normal play until much later.

**1. Held input leaked across runs.** `Input.clearAll()` clears buffers but not
`held` flags. Jump-cut and the launcher's hold-to-follow both read `isHeld`, so
a button still held when a run started changed the physics — two runs with the
same seed and the same inputs diverged. `Run.install()` now clears buffers,
releases every action and zeroes the stick.

**2. The camera rig outlived the run.** `camRig` persists across runs, and
`screenYaw` feeds the movement basis — so a new run inherited the previous
run's camera angle, "forward" meant something different on frame one, and the
divergence compounded (scores across three same-seed runs came out 0, 62, 67).
`CameraRig.resetTo(player)` now snaps the rig to the opening framing and zeroes
trauma, kick, FOV and push-in. This also fixes a visual wart: the camera used
to drift in from wherever the previous run ended.

A third, duller one: `finishRun()` is async and the DEATH branch re-entered it
every frame while it awaited the board write. It is now guarded, and a failed
profile or board write can no longer strand the player on the death screen.

---

## Open questions

1. **The score model is a placeholder and should not be tuned yet.** It exists
   so RESULTS has something real to show and the board has something to sort
   by. V0.6 replaces `Score.evaluate()` wholesale; tuning today's constants is
   wasted effort.
2. **Rank thresholds are guesses.** D at 0 through SSS at 30,000 on the
   existing kanji ramp. A 70-second scripted run reached ~27,500, which puts SS
   within reach and makes SSS look roughly right — but that run never took
   damage and never missed.
3. **The wave table is unplayed.** Ten waves authored to a pacing curve, not to
   a difficulty curve anyone has felt. Scripted play reached wave 13 in about a
   minute, which suggests it may escalate too fast.
4. **`SupabaseBoard` is empty by design.** The interface, the version stamping
   and the entry shape are settled; the implementation waits for V0.6.
5. **Nothing reads `RunRecord` except the print.** Intentional, but it means the
   record's shape has not been pressure-tested by a real consumer. V0.3 is the
   first, and may want fields that are not there yet.
6. **The screens have not been seen by a human.** They were verified
   structurally and driven by a synthetic pad, but the verification browser
   here cannot render DOM to an image, so nobody has actually looked at the
   title, setup or results screens. Worth doing before V0.3.

---
---

# Previous phases

Kept for continuity. Gates F1–F5 belong to V0.2.1; G2.1–G2.5 belong to V0.2 and
are in git history at the `V0.2 — Combat Feel` commit.

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


---

# Follow-up 2 — controller pause, audio export, menu accessibility

## Controller pause button

It never worked because Escape was hardcoded in the keydown handler and never
went through the binding table, so there was nothing for a pad button to map
onto. `pause` is now a first-class bindable action (**Escape · Start**), routed
like every other input. It raises the pause request immediately rather than
going through the attack buffer, since it is not a gameplay action.

## Audio export

The game has no audio files — every sound is synthesised at runtime by
`src/audio.js`. `AudioSystem.start()` was split so the synth graph can be
rebuilt inside `Tone.Offline`, and `src/exportaudio.js` renders each of the 24
sounds to a WAV through `tools/filesink.mjs`.

Exported as **32-bit float**, not 16-bit: the mix spans about 38 dB between the
whiffs (~-40 dBFS) and the impacts (~-4 dBFS), so 16-bit would leave roughly 7
usable bits at the quiet end once boosted in a DAW. Nothing is normalised — the
relative balance in the folder is the balance in the game. A README in the zip
documents the synth recipe behind each sound.

Regenerate any time with `SUMI.exportAudio()` and `node tools/filesink.mjs`.

## Settings menu on a controller, with descriptions

- **`src/tuningdocs.js`** describes **every** parameter — verified
  programmatically at **0 of 444 without a description**. Most leaves are the
  same ~39 field names repeated across attacks, reactions and fan specs, so
  those are described once by name and the remaining 156 have exact entries;
  the fan rotation triples are described structurally by axis.
- A sticky description strip at the bottom of the panel shows the path and
  description of whatever is selected, by mouse or by pad. Every row also
  carries a tooltip.
- **Full pad navigation:** D-pad/stick to move with hold-to-repeat, Left/Right
  to nudge a value, LB for coarse steps, A to open a group or start a rebind,
  B or Start to close.

One thing worth recording: the description strip originally relied on the DOM
`focus` event. `element.focus()` does **not** fire a focus event when the window
itself is unfocused, so navigation could silently leave the strip stale.
Navigation now carries the description on the element and updates the strip
directly; the focus listener remains only for mouse and Tab users.

Regression after all of the above: G2.4 still 0.000000 m unlocked for all six
attacks, F1 still 0 sim steps, the run cycle still 0.215 rad/frame at 500 s of
session time, and a 90-second soak with pause/unpause churn threw nothing.


---

# Follow-up 3 — lock-on dash reversal, pause-menu scrolling

## Dashing past a locked target sent you flying away — fixed

Reported as: dash toward a locked enemy, pass them, keep dashing, and you move
backwards instead of back toward them. Reproduced exactly.

The cause was the movement-basis latch. It captures the camera basis when you
press the stick and holds it until the stick returns to deadzone or swings more
than `latchBreakAngle`. Holding one direction through several dashes does
neither — so the basis stayed pinned while the lock-on camera swung around
behind you:

| | start | dash 1 | dash 2 | dash 3 | dash 4 | dash 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| latched basis yaw | 39° | 39° | 39° | 39° | 39° | 39° |
| actual camera yaw | 39° | −14° | −80° | −94° | −97° | −99° |
| distance to enemy | 6.0 m | 3.6 | 8.3 | 13.2 | 18.2 | **19.8** |

"Forward" still meant the world direction from before the pass, so you kept
travelling away.

**The latch is now off while locked on** (`controls.latchWhileLocked`, default
0). The latch exists to break the *free*-camera feedback spiral — camera chases
your velocity, basis follows camera, velocity rotates, repeat. Lock-on has no
such loop, because the camera yaw comes from the player→target axis rather than
from your velocity. Unlatched, forward always means toward the target and
sideways strafes around it, which is what the genre expects. In the free camera
the latch stays, and a deliberate right-stick nudge now breaks it so a manual
camera turn takes effect immediately.

After the fix, the same dash sequence holds distance instead of running away:
**2.7 → 4.2 → 4.1 → 4.2 → 4.2 → 4.2 m**. Circle-strafing holds a 2.6–4.5 m
radius rather than drifting off, and holding forward while locked still walks
essentially straight at the target (0.53 m deviation over 8 m, the slight arc
being the target axis rotating as you close).

### F3 had to be restated

The old F3 test measured net screen displacement over 24 steps. That is no
longer a meaningful measure: with the basis continuously target-relative,
circle-strafing keeps the player near the centre of frame while the world
rotates behind them, so net screen movement is near zero or even negative. It
is now measured the way the gate actually reads — at the instant of input, does
the character move along the camera's right vector:

| camera yaw | 39° | 3° | 158° | −79° | 84° | −81° | 159° | 59° |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| agreement with screen-right | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

F4 is unchanged: free-camera diagonal hold is still 0.000 m deviation latched
versus 16.643 m unlatched.

## Pause menu could not scroll past the first group — fixed

`#pause-body` is a flex child of a column flex container. A flex child defaults
to `min-height: auto`, which refuses to shrink below its content, so instead of
becoming a scroller the list grew to its full height and spilled out of the
panel — everything below the fold was unreachable. The panel also had
`overflow: visible`, so nothing clipped it.

`flex: 1 1 auto; min-height: 0` on the body and `overflow: hidden` on the panel.
Verified at 1280x800 in three states:

| | body height | content height | scrollable | last group reachable |
| --- | ---: | ---: | --- | --- |
| all groups collapsed | 626 px | 761 px | yes | yes |
| `sim` expanded | 626 px | 833 px | yes | yes |
| `attacks` expanded | 626 px | 997 px | yes | yes |

## A note on the two false alarms in this pass

Two regression checks initially came back red — nonzero G2.4 displacement and
negative F3 screen movement. Both were faults in the tests, not the game. The
G2.4 helper left a live hostile oni in the arena which respawns automatically,
and it was knocking the player mid-attack; the displacement being measured was
knockback, not magnetism. With the player made immune for the measurement,
G2.4 is 0.000000 m for all six attacks again.
