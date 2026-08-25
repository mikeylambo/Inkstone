# INKSTONE

A high-impact character-action scoresmith where every sword stroke writes on the
battlefield, and what you've written changes how the fight plays.

**Current phase: V0.4 — Combat Calligraphy.**
See [REPORT.md](REPORT.md) for gate results.

Every grounded attack leaves a real mark on the floor, those marks are part of
the simulation rather than decoration — and now the marks add up to *shapes*.
Cross 十, Enso 〇 and Triad 三 are recognised in ink you have already laid and
fire in the fight. The frame from V0.2.6 supports both endgames — a campaign
(*Pilgrimage*) and a pure scoresmith (*Scrolls*) — with only the second built.

The game was called SUMI through V0.2.5. Saves migrate automatically.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. Add `?seed=anything` to change the run seed —
same seed and same inputs produce the same run. Add `?dev=1` for the raw tuning
editor.

## The canvas

A stroke is a **sim object**, not a decal. It is created inside the fixed step
from the attacker's position, facing and attack type — never from the ribbon,
which is sampled at render time and would make the canvas a function of frame
rate. That is what lets the same seed and the same inputs reproduce the same
canvas, hash for hash.

Ink walks a lifecycle, timed in `TUNING.ink`:

| State | Default | What it does |
| --- | --- | --- |
| **Fresh** | 0.14 s | The instant of laying |
| **Wet** | 2.10 s | Dash across it to **skate** — faster, longer, drifting |
| **Set** | 3.40 s | Heavy marks are **solid**: they turn a charge, and something knocked into one splatters on it |
| **Dry** | 5.00 s | Still solid, no longer slick |
| **Faded** | 1.30 s | Fades out and retires |

Which attacks mark the floor follows one rule: **ink touches the floor when the
blade does.** Airborne attacks leave nothing; the dive is the exception, and it
lays on the slam rather than the apex. Each attack's stroke is authored in
`ATTACK_META` next to its trail colour, and the diagrams in
**The Inkstone → Strokes** are drawn from that same descriptor, so they cannot
disagree with the mark you actually leave.

A readability cap (`ink.maxLive`) keeps the canvas legible by pushing the oldest
marks into an early fade rather than popping them.

## The forms

A glyph is **relational** — never a property of an attack. No move "is a Cross";
a Cross is two marks that happen to intersect at an angle, found by asking the
registry about geometry that already exists. Recognition runs in the fixed step
with no rng, so a replay draws the same shapes at the same moments.

| | Drawn by | Does |
| --- | --- | --- |
| **十 Cross** | A straight mark cut through an arc at more than 36°. Finishing the light string does it — hit 3 is a line through the first two arcs. | Severs at the crossing, and leaves the Stain splat-armed to be thrown into your set ink |
| **〇 Enso** | Ink closing 281° around one centre. The falling stroke draws one alone; so do two swings struck from opposite sides. | Drags everything inside toward the centre and holds it |
| **三 Triad** | Three *straight* marks within 19° of parallel. Three launchers stepped sideways. | A wave along every line at once |

Swings struck from one spot are concentric arcs and can never cross each other —
so a Cross needs a straight mark through a curve. **The Inkstone → Strokes**
lists all three with tolerances read straight from the tuning, so the page
cannot describe a shape the game will not accept.

A glyph spends the marks that formed it, and there is a cooldown between them
(`glyphs.cooldown`), so one busy corner of the canvas cannot fire forever.

## The words

The fiction is load-bearing in the UI, so these map one-to-one onto the usual
genre terms:

| Genre term | INKSTONE |
| --- | --- |
| Loadout / meta screen | **The Inkstone** |
| Mission select | **Scrolls** |
| Results | **Finished Calligraphy** |
| Resource | **Pigment** |
| Super | **Finishing Stroke** |
| Training | **Kata** |
| History / collection | **Archive** |
| Enemy | **Stain** (the Oni Stain, the Tengu Stain) |

## Controls

| Action | Keyboard / Mouse | Gamepad (Xbox) |
| --- | --- | --- |
| Move | WASD / Arrows | Left stick |
| Light (×3 string) | LMB or `J` | X |
| Launcher | RMB or `K` | Y |
| Heavy — Dive in air | MMB or `L` | B |
| Jump | `Space` | A |
| Dash (8-dir, i-frames) | `Shift` | RT |
| Parry | `F` | LB |
| Lock-on (toggle / cycle) | `Q` or `Tab` | RB |
| Camera nudge (free cam) | — | Right stick |
| Pause | `Esc` | Start |
| Debug overlay | `` ` `` (backquote) | — |

Lock-on directional moves (while locked):

| Input | Move |
| --- | --- |
| toward + light | Thrust — gap-closing step-in |
| away + light | High Time — launcher |
| toward + heavy | Splitter |

The in-game move list (**The Inkstone → Techniques**, also in the pause menu)
is generated from the real attack table and shows your current bindings, so it
cannot drift from the actual kit — that is gate FR4.

Movement is camera-relative. In the free camera the movement basis latches
while the stick is held, so a drifting camera can't curve a held direction.
While locked on it does not latch — forward always means toward the target and
sideways strafes around it. Jump cancels an attack past its `cancelAfter` —
that's the jump-cancel air combos are built on.

## Screens

```
BOOT → TITLE
TITLE → PLAY · INKSTONE · ARCHIVE · OPTIONS · CREDITS
PLAY  → PILGRIMAGE (reserved) · SCROLLS · KATA · DAILY SCROLL
RUN  ⇄ PAUSE → DEATH → FINISHED CALLIGRAPHY → (Again · Play · Title)
```

Every screen, including every placeholder, is reachable and escapable on a
gamepad alone — gate FR1.

**THE INKSTONE** — `TECHNIQUES · STROKES · FINISHING STROKE · PIGMENT · RECORD`.
Techniques and Strokes are real — Strokes documents the ink lifecycle, every
mark the kit can leave, and the three forms those marks can add up to, all
generated from the attack table and the tuning. Finishing Stroke and Pigment
are reserved and say so.

**ARCHIVE** — `SCROLL GALLERY · RECORDS · INK RECORD · LEADERBOARDS`. The
gallery keeps your last 20 run prints as PNGs in IndexedDB; each is viewable,
exportable and deletable. Records and Leaderboards are real; the Ink Record
(bestiary) has both Stains.

**PAUSE** — `RESUME · RESTART · RETURN TO SCROLLS · TITLE · ABANDON`, plus the
move list and Player Options. Context-aware: Kata hides the scroll and abandon
options, and Daily's restart re-seeds today rather than rolling a new seed.

## Options vs dev tuning

There are two settings surfaces and they are not the same thing.

**OPTIONS** is what players get: gameplay, controls, audio, visual and
accessibility, grouped and written in plain language. Each option maps to real
tuning paths through an explicit allowlist, so it is a curated *view* over
tuning rather than a fork of it. Choices persist and are re-applied on boot.

Accessibility covers screen shake, hit-stop, flash, camera motion,
high-contrast enemy tells, text size and hold→toggle swaps. All of them are
1.0 (off) by default and applied at a single chokepoint each, so the shipped
game is unchanged until you move one.

> One caveat worth knowing: **hit-stop is part of the simulation**, not a
> visual effect. Lowering it genuinely changes the fight, so a run at anything
> other than 100% is not comparable to a leaderboard run. The option says so.

**DEV TUNING** is the full ~550-parameter editor. It lives behind `?dev=1` and
in the `` ` `` debug overlay, and never appears in the pause menu.

## Modes and scrolls

| Scroll / mode | Seed | Structure | Death |
| --- | --- | --- | --- |
| **DAILY SCROLL** | UTC date — same for everyone, rolls at midnight UTC | Escalating waves | Ends the run |
| **ENDLESS** | Random | Escalating waves | Ends the run |
| **FREE SEED** | Yours, typed | Escalating waves | Ends the run |
| **KATA** | Random | No waves. One Stain, endlessly replaced | Respawns in place |
| SCROLL I–III | — | Unwritten | — |

KATA is the V0.2 build preserved as a practice mode — respawn-in-place, not
scored. Since V0.3 its setup screen also carries the canvas switches (ink on or
off, lifecycle speed), so you can practise against the old feel or slow the ink
down to read a skate line.

Waves 4 and up mix in the **Tengu Stain**: ranged, holds its distance, and
throws ink that stains the floor rather than aiming squarely at you — wet enemy
ink drags you to 62% speed while the oni closes.

Waves come from `TUNING.waves.table` (10 authored waves), then escalate.
Difficulty (`UNWRITTEN / STANDARD / BLOOD INK / MASTER / VOID`) is reserved with
only STANDARD selectable; its hooks are wave-table and aggression multipliers,
deliberately *not* HP and damage sliders — scaling numbers makes a fight
longer, not different.

## Layout

```
src/
  tuning.js          EVERY number in the game. No magic numbers in systems.
  main.js            Fixed-timestep loop (60 Hz sim, decoupled render)
  world.js           Shared mutable context; the hit-stop chokepoint
  rng.js             Seeded PRNG — all sim randomness comes from here
  input.js           Keyboard + mouse + gamepad, with input buffering
  audio.js           Procedural Tone.js, master/music/sfx buses
  camera.js          Lock-on framing, trauma shake, FOV punch
  hud.js             Vitals, target, stroke counter, reserved pigment slot
  debug.js           `~` overlay: state, hitboxes, embedded tuning editor
  game.js            App state machine — the only owner of "what's happening"
  run.js             One attempt: rng, fx, enemies, waves, score, record
  record.js          RunRecord — sim-stamped log, per-wave stats, round-trips
  score.js           Scoring, and the V0.6 style-evaluator slot
  profile.js         Profile v2: bests, reserved progression namespace
  storage.js         Storage keys and the one-release SUMI→INKSTONE migration
  board.js           Leaderboard interface — LocalBoard now, SupabaseBoard stub
  gallery.js         Scroll Gallery — run prints in IndexedDB
  scrolls.js         The scroll table and the reserved difficulty axis
  techniques.js      The move list, as data + the TechniqueList component
  playeroptions.js   Curated player options over an allowlist of tuning paths
  screens.js         Title / setup / death / results / dev tuning
  ui/screen.js       Screen + TabbedScreen base, one MenuNav per screen
  ui/play.js         Play select, scroll select, reserved wave choice
  ui/meta.js         The Inkstone, Archive, Options, Credits, placeholders
  print.js           The scroll print and its PNG export
  menunav.js         Pad-navigable menus
  settings.js        The dev tuning editor — sliders/fields, rebinding, pad nav
  tuningdocs.js      Plain-language description for every parameter
  exportaudio.js     Dev: bounce the procedural audio to WAV
  pause.js           Pause menu: move list + player options
  anim/poses.js      Key-poses + phase-space attack tracks
  combat/attacks.js  Attack identity (track, sound, trail, stroke type)
  combat/hits.js     Hit resolution and every hit-reaction class
  entities/player.js Player kit and state machine
  entities/oni.js    Enemy 1 — Oni Stain
  gfx/               Materials, arena, pooled effects
  gfx/slashfan.js    The stylized attack mark (parked behind fx.fan.enabled=0)
  gfx/trail.js       Ribbon: the swept blade path — the hero trail
  strokes.js         The stroke registry — the canvas, as simulation
  glyphs.js          Relational shape recognition over the registry
  gfx/inkcanvas.js   The canvas, as pixels: one mesh, one draw call
  entities/tengu.js  Enemy 2 — Tengu Stain, and its thrown ink
tools/shotserver.mjs Dev-only screenshot sink (see below)
```

### Tuning

`src/tuning.js` is the single source of truth for timings, ranges, forces,
thresholds and decay rates. Attack durations are always derived
(`attackDuration()`), never hand-written, and the animation tracks are authored
in *phase space* so retiming an attack in tuning retimes its animation for free.

The file is divided: combat feel above the V0.2.5 marker, run structure and
frame below it. Combat sections are expected to stay diff-clean through frame
work — gate FR6.

### Determinism

The sim runs at a fixed 60 Hz decoupled from render, with hit-stop consuming
whole sim steps. All sim-side randomness goes through `Rng`. Same seed + same
inputs produce a byte-identical run — verified in REPORT.md. `RunRecord`
serialisation round-trips exactly (gate FR10) so the future replay viewer has a
format that will not move under it.

### Dev tooling

`window.INKSTONE` (aliased as `window.SUMI`) exposes `World`, `TUNING`,
`simStep`, `STEP` and a headless `run(steps, {move, press})` driver for
scripted verification without the render loop. Note that `run()` consumes
hit-stop the way the render loop does and `simStep()` alone does not — drive
through `run()` when hit-stop matters.

`tools/filesink.mjs` is the sink used by `INKSTONE.exportAudio()`, which renders
every procedural sound to a 32-bit float WAV under `export/`. The game ships no
audio assets — everything is synthesised by `src/audio.js` at runtime — so this
is how you get the sounds into a DAW.

`tools/shotserver.mjs` is an optional local sink (`node tools/shotserver.mjs`)
that accepts a data-URL POST on port 5199 and writes it to `shots/`. It exists
so renders can be captured and reviewed in environments without an interactive
browser window. It is not part of the game and is not shipped.
