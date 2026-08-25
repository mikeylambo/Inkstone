# V0.3 — The Canvas Exists · Phase Report

Falsifiable question: **does fighting visibly change my next thirty seconds?**

The mechanical answer is now yes, and measurably so: a light string lays three
crossing marks, those marks stay wet for 2.1s, dashing across wet ink is 36%
faster and lasts 55% longer, and a heavy mark sets solid and turns an oni's
charge. Whether it *reads* as that while playing is G3.1–G3.3, which need your
eyes and are called out at the bottom.

## Architecture — the constraint that shaped everything

The binding rule from the brief was that **strokes are sim objects, not render
objects**, and never derived from ribbon vertices. That is not a style
preference; the ribbon is sampled by distance travelled at render time, so a
canvas derived from it would be a function of frame rate and replay would drift
apart from the run it claims to reproduce.

So `src/strokes.js` holds plain numbers and no THREE objects, creates every
stroke from `(position, facing, attack type)` inside the fixed step, and uses no
rng at all — which is what makes `hash()` mean something. `src/gfx/inkcanvas.js`
is a pure view: it reads the registry every rendered frame and writes one
geometry, and there is no path back.

Stroke geometry is authored in `ATTACK_META` alongside the trail colour, in the
same place and the same idiom as the fan and ribbon authoring:

```js
light2: {
  trail: 0xb91c1c, stroke: 'horizontal',
  ink: { kind: 'arc', type: 'horizontal', reach: 2.6, sweep: 1.85,
         width: 0.44, offset: 0, tilt: 0.95 },
}
```

**One rule decides which attacks mark the floor: ink touches the floor when the
blade does.** Airborne attacks lay nothing. The dive is the exception, and it is
exactly the attack that ends on the ground — it lays on the slam, not the apex.

## What was built

**Stroke registry** — `{id, type, owner, a, b, arc, width, pillar, bornStep,
state}`, with the lifecycle `Fresh → Wet → Set → Dry → Faded` driven from
`TUNING.ink`. The readability cap (`maxLive: 44`) pushes the oldest strokes into
an accelerated fade rather than popping them, because a mark vanishing under
your feet reads as a bug.

**Query API, built for a consumer that does not exist yet.** V0.4's relational
glyph checks need "what is near here, of this type, laid within this window", so
`strokesNear(pos, r, opts)` and `byType(type, opts)` both take a `window` in sim
steps even though nothing passes one today. `pillarSurfaces()` returns
`{position, radius, height}` — the exact shape the oni's wall-splat already
understands, so solid ink needed no second collision path.

**Record integration** — `strokePlaceholder` is gone; `record.stroke(step, s)`
writes one event per mark with its width and owner. The record's shape survived
its first real consumer with one addition (`w`/`o`), which is the pressure test
V0.2.5 flagged as missing.

**The print became the subject.** It was a drawing of where you walked with an
empty stroke layer. Now the ink is drawn first and heaviest — weighted by each
stroke's real width in metres converted to paper pixels, enemy splotches in a
grey wash underneath, the movement path demoted to a faint thread. This is the
phase where the scroll became worth keeping.

**Wet-ink skate** — multipliers onto the existing dash, never a second dash
state. A dash *starting* on wet ink extends into a slide; crossing *into* wet
ink mid-dash keeps the skate alive, so a line of your own ink is a rail.

**Set-ink pillar** — grounded heavy and dive lay `pillar: true` marks. While
Set or Dry they push an approaching oni aside and present as splat surfaces, so
something knocked into your own two-second-old heavy mark splatters on it.

**Enemy 2 — Tengu Stain.** Ranged, holds a ring, retreats if you close. What it
throws is not really aimed at you: it is aimed at the floor, and a wet enemy
splotch drags you to 62% speed while the oni walks in. Telegraph grammar is
deliberately identical to the oni's — flare grows over a windup, tell colour
shifts past halfway, one committed active window, a punishable recovery. A new
enemy should be new information, not new rules for reading information. Authored
into waves 4+ as weights (`['oni','oni','tengu']`), so the ratio is data.

**Slots filled rather than added:** the technique `geometry` slot now draws a
real SVG diagram from the same `ink` descriptor the registry uses (so the
diagram cannot disagree with the mark), the Inkstone STROKES tab is live, the
bestiary has both Stains, KATA's setup gained ink on/off and lifecycle speed,
and the debug overlay's `live strokes` readout stopped saying "not built".

## Gates

### ✅ G3.4 — stroke registry hash identical across same-seed replays

Same seed, same scripted inputs, twice; then a different seed:

```
seed 'g34'  run A   canvas 912f9070   36 laid, 25 live, 0 culled
seed 'g34'  run B   canvas 912f9070   36 laid, 25 live, 0 culled   identical ✓
seed 'different'    canvas differs                                  ✓
```

A longer mixed run including dashes hashes identically too, canvas **and** run
record together: `canvas 04fc28df / run 4b981265`, twice.

### ✅ G3.5 — the print shows the run's actual strokes, and the gallery saves it

A 26-stroke run to RESULTS: 26 `EV.STROKE` events in the record, print rendered
at 560×560 with 2.1% dark pixels, auto-saved to the Scroll Gallery (found on the
first 150 ms poll). Tengu splotches reach the record too, tagged `o: 1`:

```
{ e:9, s:'puncture', o:1, w:2.7, x:0.34, z:6.2, x2:1.29, z2:6.2 }
```

### ✅ G3.6 — 60fps with a full canvas and 8 enemies (measured)

Canvas filled to the cap (44 live strokes), 10 enemies alive (5 oni, 3 tengu,
2 from the wave — more than the gate asks):

| | ms/frame |
| --- | --- |
| `simStep` | 0.043 |
| `inkCanvas.update` | 0.036 |
| `renderer.render` | 1.092 |
| **total** | **1.17** |
| 60fps budget | 16.67 |
| **headroom** | **15.5** |

The canvas's own cost, isolated by rendering the same scene with `ink.enabled=0`:
**0.26 ms of render + 0.036 ms of update**, in **1 draw call / 542 triangles**
against a scene total of 113 calls / 3,986 triangles.

> **Honest caveat on this number.** The verification browser here cannot
> composite, so this is CPU + GPU-submit time per frame, not a vsync'd fps
> reading. It does not include compositor cost or GPU stalls. What it does show
> is that the canvas is nowhere near the budget — 0.3 ms against 16.67 — which
> is the question the gate was asking. A real fps capture is still worth taking
> on your machine.

### ⏳ G3.1 — blind clip: a viewer can point to where the fight happened

**Needs your eyes.** Nothing I can measure answers this. The mechanical
precondition is met — marks persist for ~11.9 s through their lifecycle and the
cap keeps 44 of them alive — but "a viewer can point at it" is a judgement about
legibility.

### ⏳ G3.2 — a player uses wet-ink skating deliberately within 3 runs

**Needs a player.** What I can report is that the reward is real and large:

| | dash off ink | dash on wet ink |
| --- | --- | --- |
| peak speed | 24.47 | **33.21** (+36%) |
| duration | 0.170 s | **0.264 s** (+55%) |
| distance | 6.47 m | **8.27 m** |

and that it engages *only* on ink (verified both ways). Whether it is
*discoverable* in three runs is the open question — see below.

### ⏳ G3.3 — canvas readable at 8 enemies / 60s continuous fighting

**Needs a clip.** The cap holds (44 live, oldest fading early rather than
popping) and perf is not the constraint. Readability is a look judgement.

## Two bugs my own tests caught

**1. `flip` was a no-op.** I authored light2 with `flip: true` and commented
that it "crosses the first — the shape V0.4 reads as a Cross." My own crossing
test returned false. Reversing an arc's sweep direction draws *the identical
arc backwards*: light2 was repainting light1's line. Replaced with a real
angular `tilt` that swings the arc off the facing axis. Now:

```
light1 × light2  ✓    light2 × light3  ✓    light1 × light3  ✓
light1 × heavy   ✓  (heavy tilts the other way)
```

**2. Ink collision used the wrong geometry.** `distanceTo` treated an arc as its
chord. A wide slash's chord runs up to `r(1 − cos(sweep/2))` inside its curve —
about **0.9 m** measured for a light arc — so the game would have said "you are
on ink" somewhere the player can plainly see there is none, and skating would
have felt broken and arbitrary. Arcs now measure against the curve:

```
distance to a point on the drawn curve : 0.0000  → covered ✓
distance to the chord midpoint         : 0.898   → not covered ✓
```

That one mattered: it is the difference between skating being a mechanic and
skating being a superstition.

## Things worth flagging

**Skating may not be discoverable (G3.2 risk).** Your ink is laid in an arc
*2.5 m in front of you*, so you are never standing on your own mark at the
moment you finish a swing — you have to walk or dash back onto it. The mechanic
works and rewards well, but the natural rhythm of attacking does not put you on
your own ink. If three testers miss it, the cheapest fixes in order are: widen
`ink.skateProbe` (currently 0.55 m of slack), pull the light arcs' `offset`
back toward the player, or give wet ink a stronger visual cue than the current
22% vermilion tint.

**Ink lifecycle vs the wave rhythm is unplayed.** Wet is 2.1 s and a mark lives
~11.9 s total. Those were tuned so ink is still wet while you finish a string,
but nobody has felt them against real wave pacing. `TUNING.ink.lifecycleScale`
and the KATA sliders exist precisely so you can find the right number by hand.

**The tengu's damage is a guess.** 8 per direct hit, and the projectile is a
gentle lob that mostly wants to miss. Untested against a real player who is
dodging.

**Kata plays differently now, by design.** Ink is on in Kata by default, so the
V0.2 practice mode is no longer the V0.2 build. The toggle in its setup screen
turns the canvas off if you want the old thing back for feel comparisons.

## Open questions

1. Is skating discoverable without being told? (drives G3.2, and the fixes above)
2. Should enemy splotches be *avoidable* by reading them, or is slowing you the
   point? Right now they land near you with a small lead — nearly unavoidable
   if you stand still, trivially avoidable if you move.
3. Do Set-ink pillars want to block the *player* too? Today they only turn
   enemies. Blocking both would make laying a heavy a genuine commitment rather
   than a free wall.
4. WAVE_CHOICE stays dev-flagged and no choices ship, per the brief. V0.4 decides
   whether glyph offers light it up.

---

# Previous phases

# V0.2.6 — Frame v1 · Phase Report

Frame correction and expansion. Menus, states and slots only. No combat feel
was touched, and gate FR6 is the proof rather than the promise.

The game is now **INKSTONE**.

## What was built

**Identity.** Every player-facing SUMI/SlayRank string is now INKSTONE — title,
version badge, `document.title`, README, export filenames. The print seal stays
討. Storage keys moved to an `inkstone.*` namespace behind a one-release
migration shim (`src/storage.js`) that reads each SUMI-era key exactly once and
copies it forward. The legacy keys are deliberately **not** deleted, so a player
who rolls back to a V0.2.5 build still has their save.

**State machine.** Expanded to the full shape, with reserved states routing to
real screens rather than dead menu entries:

```
BOOT → TITLE
TITLE → PLAY_SELECT | INKSTONE | ARCHIVE | OPTIONS | CREDITS
PLAY_SELECT → SCROLL_SELECT | RUN_SETUP(kata/daily) | PILGRIMAGE (placeholder)
RUN ⇄ PAUSE → DEATH → RESULTS → (Again | PLAY_SELECT | TITLE)
WAVE_CHOICE  reserved, dev-flagged, entered from the wave rest phase
```

A locked menu entry is a dead end for a pad walk. A placeholder screen is a slot
you can see the shape of — and gate FR1 walks it.

**The Inkstone** — `TECHNIQUES · STROKES · FINISHING STROKE · PIGMENT · RECORD`.
Techniques is real and data-driven from a `TECHNIQUES` table, mounted both here
and in the pause menu as one component. Each row carries a `geometry` slot for
V0.3's stroke diagrams. The other three tabs are styled placeholders with one
line of fiction each.

**Archive** — `SCROLL GALLERY · RECORDS · INK RECORD · LEADERBOARDS`. The
gallery keeps the last 20 run prints as PNG **blobs in IndexedDB**, not
localStorage: a 560px print is 70 KB and the localStorage quota is 5 MB, so
twenty of them would have evicted the player's profile.

**Options vs dev tuning.** The pause menu used to hand every player five hundred
engine parameters. Now Options is a curated allowlist view over real tuning
paths — `ALLOWED_PATHS` is *derived* from the option definitions, so it cannot
drift — and the full editor is behind `?dev=1` and the `` ` `` overlay.

**Reserved slots**, all shells only: `WAVE_CHOICE` (Hades), per-wave verse
grading (Bayonetta), `run.config.modifiers[]` (Hades Heat / Sifu), and a replay
state with a round-tripping record format (Katana ZERO).

## Gates

### ✅ FR1 — full pad-only walk, no dead ends

Driven with a synthetic Xbox pad, no keyboard or mouse. Every title entry
entered and backed out; every Play entry likewise; every tab on both tabbed
screens rendered content.

| From | Entry | Lands | Nav items | B returns to |
| --- | --- | --- | --- | --- |
| TITLE | CONTINUE | RUN | — | (run) |
| TITLE | PLAY | PLAY_SELECT | 5 | TITLE |
| TITLE | INKSTONE | INKSTONE | 17 | TITLE |
| TITLE | ARCHIVE | ARCHIVE | 4 | TITLE |
| TITLE | OPTIONS | OPTIONS | 34 | TITLE |
| TITLE | CREDITS | CREDITS | 1 | TITLE |
| PLAY | PILGRIMAGE | PILGRIMAGE | 1 | PLAY_SELECT |
| PLAY | SCROLLS | SCROLL_SELECT | 5 | PLAY_SELECT |
| PLAY | KATA | RUN_SETUP | 2 | PLAY_SELECT |
| PLAY | DAILY SCROLL | RUN_SETUP | 2 | PLAY_SELECT |

Tabs: Inkstone `techniques` (17 items, 1211 chars) `strokes` `finisher`
`pigment` `record`; Archive `gallery` `records` `ink` `boards`. All reachable,
none empty.

One gap the walk found: the tabbed screens could only be left with **B**, so a
mouse user had no way out. They now render a BACK button too.

### ✅ FR2 — `?dev=1` gates the tuning editor

| | without `?dev=1` | with `?dev=1` |
| --- | --- | --- |
| `game.dev` | false | true |
| DEV_TUNING screen constructed | no | yes |
| tuning rows on that screen | — | 553 |
| tuning rows anywhere in Pause | **0** | **0** |
| tuning rows in Options | **0** | **0** |
| Pause tabs | TECHNIQUES · OPTIONS | TECHNIQUES · OPTIONS |

The dev screen is not merely hidden — in a player build it is never constructed.

### ✅ FR3 — print → gallery → survives reload → 21st evicts the oldest

Twenty-one saves against a `galleryMax` of 20 kept 20, and the first entry was
the one evicted. Modifiers round-tripped through storage.

A real run to RESULTS auto-saved its print (70 068 bytes) and it was still there
after a reload, rendering in the Archive as a blob-backed image with
view/export/delete live and replay disabled.

Worth recording: `canvas.toBlob` on a 560×560 print takes **~900 ms**. A first
check at 400 ms found nothing and looked like a failure; it was my test racing
the encoder, not a bug.

### ✅ FR4 — the move list matches the kit, programmatically

`auditTechniques()` compares the technique table against `ATTACK_META` in both
directions — an attack nobody documents, and a technique pointing at an attack
that no longer exists — and also resolves every `DIR_MOVES` alias.

```
attacks in table: 10    techniques listed: 12
missing: []             phantom: []             ok: true
```

### ✅ FR5 — a SUMI-era profile migrates intact

Seeded `sumi.profile.v1` with two bests, 42 runs and a custom name, cleared
every `inkstone.*` key, and cold-booted.

| | result |
| --- | --- |
| profile version | 2 |
| daily best | 4210 (intact) |
| free best | 3100 (intact) |
| totalRuns / name | 42 / MIKEY |
| progression namespace | present, 8 keys, empty |
| new key written | yes |
| legacy key preserved | yes |
| bindings + board carried | yes |

Export → import round-tripped bests and progression exactly.

### ✅ FR6 — combat untouched

`git diff src/tuning.js` for this phase: **52 insertions, 0 deletions, 0
modifications.** Every combat section — sim, player, dash, parry, magnetism,
attacks, reactions, oni, camera, fx, combo, spawn, lockOn — is byte-identical.

Two additions are worth naming explicitly rather than burying:

* `audio` gained `musicVolume` and `sfxVolume`. It is a pre-existing section, so
  the diff is not literally zero-touch; it is not combat feel, and the hash test
  below covers it.
* Three new sections — `difficulty`, `access`, `frame` — all below the frame
  marker.

Same seed, two runs, identical:

```
hash 20c404c1   spawnHash e5ba9e8a   waves 1   deterministic: true
```

The accessibility scalars are at identity on a fresh profile
(`shake/hitStop/flash/camMotion = 1.0`, `highContrast = 0`), and each is applied
at exactly one chokepoint — `World.requestHitStop`, `CameraRig.addTrauma`, the
oni's flash intensity, the oni's tell palette. They are wired, not decorative:

| scalar | 100% | 50% | 0% |
| --- | --- | --- | --- |
| `addTrauma(0.5)` → trauma | 0.5 | 0.25 | 0 |
| `requestHitStop(0.2)` → freeze | 0.2 | 0.1 | 0 |

**And hit-stop genuinely moves the simulation.** A scripted 90-swing fight on
one seed:

| hitStopScale | hash | freeze windows |
| --- | --- | --- |
| 1.0 | `17aea3c5` | 4 |
| 0.5 | `1c28c51b` | 1 |
| back to 1.0 | `17aea3c5` | 4 |

That is why the option's own help text tells the player a run at anything other
than 100% is not comparable to a leaderboard run. **This is a real design
decision that deserves your sign-off** — see Open questions.

### ✅ FR7 — WAVE_CHOICE reachable under the dev flag, skipped otherwise

| | `waveChoiceEnabled = 1` | `= 0` |
| --- | --- | --- |
| state after clearing wave 1 | **WAVE_CHOICE** | RUN |
| run phase | `choosing` | `spawning` |
| pad-navigable cards | 3 | — |
| HUD still visible | yes | — |
| after resolving | RUN, wave 2 | — |
| waves passed through | — | 1 → 2 → 3 → 4 |

### ✅ FR8 — per-wave stats present for a multi-wave run

Derived from the event stream rather than accumulated alongside it, so there is
no second copy to keep in sync. A three-wave run:

| wave | time | hits | kills | taken | best | grade |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 3.82s | 0 | 2 | 0 | 0 | — |
| 2 | 4.38s | 0 | 3 | 0 | 0 | — |
| 3 | 4.65s | 0 | 4 | 0 | 0 | — |

`grade` stays null until the V0.6 evaluator can fill it, and RESULTS renders the
column blank rather than inventing one. Hit events now carry the stroke count
(`c`) so `bestCombo` per wave is real data, not a re-derivation.

### ✅ FR9 — a dummy modifier is recorded and displayed

A run started with `[{id:'dev-heat', label:'DEV HEAT', scoreMul:1}]`:

| surface | carries it |
| --- | --- |
| `run.config.modifiers` | ✓ |
| `record.meta.modifiers` | ✓ |
| `summary.modifiers` | ✓ |
| RESULTS panel | "MODIFIERS · DEV HEAT ×1" |
| leaderboard entry | ✓ (with `scroll: endless`) |
| gallery entry | ✓ |

RESULTS also showed the re-skinned header (書 FINISHED CALLIGRAPHY), the SCROLL
row, and the wave breakdown with a blank MARK column. The evaluator axes
correctly did **not** render, because nothing produces them yet.

### ✅ FR10 — RunRecord save → load → save is byte-identical

556 events across 400 sim steps, including meta and modifiers:

```
29 106 bytes    round-trips exactly: true
```

`toJSON()` has a fixed key order and only plain values, so
`stringify(toJSON())` is stable. That is the property the future replay viewer
needs, pinned now while it is cheap.

## Things worth flagging

**Hit-stop accessibility changes the sim.** Reducing it makes the game easier to
tolerate and also makes the run a different run — a daily seed played at 50%
hit-stop is not the same fight as one played at 100%. I shipped it (it is a
real accessibility need) with the caveat in the option text, but the leaderboard
does not yet *record* the setting. Options: record it on the entry and mark
those runs, split the board, or accept it. Your call — say which and it is a
small change.

**Two options, one path.** "Lock-on: Toggle/Hold" (Gameplay) and "Hold actions
become toggles" (Accessibility) are inverse views of `controls.lockIsHold`,
because the brief asked for both. Editing either now repaints both rows, so they
can no longer disagree — but if a second hold-action ever ships, the
accessibility row needs to become a genuine umbrella rather than an alias.

**The music bus has no sources.** `audio.musicVolume` drives a real Tone gain
bus, but every voice that exists today is an effect and runs through sfx. The
option says so plainly instead of pretending to do something.

**Scoring floors at zero.** Not a change, but it surprised me mid-testing: a
scripted run earned 348.84 from hits and 154 from kills, took 720 in damage
penalty, and reported 0. That is the clamp working, not a bug — worth knowing
before reading any low score as broken.

## Open questions

1. Should a run's accessibility settings be recorded on its leaderboard entry?
2. `MISSION_CLEAR` is in the enum but nothing can currently win — no scroll has
   a win condition. It stays a reserved state until one does.
3. Difficulty multipliers are all ×1 and act on the wave table. Confirm that is
   the axis you want before V0.4 fills them in.

---

# V0.2.5 — The Shell
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

Gates F1–F5 belong to V0.2.1; G2.1–G2.5 belong to V0.2 and are in git history at
the `V0.2 — Combat Feel` commit.

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
