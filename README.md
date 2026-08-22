# SUMI (codename SlayRank)

A high-impact character-action scoresmith where every sword stroke writes on the
battlefield, and what you've written changes how the fight plays.

**Current phase: V0.2.1 — Restore Sword Feel / Fix Controls.**
See [REPORT.md](REPORT.md) for gate results.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. Add `?seed=anything` to the URL to change the
run seed — same seed + same inputs produce the same run.

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
| Pause &amp; settings | `Esc` | Start |
| Debug overlay | `` ` `` (backquote) | — |

Lock-on directional moves (while locked):

| Input | Move |
| --- | --- |
| toward + light | Stinger — gap-closing thrust |
| away + light | High Time — launcher |
| toward + heavy | Splitter |

Movement is camera-relative. In the free camera the movement basis latches
while the stick is held, so a drifting camera can't curve a held direction. While
locked on it does not latch — forward always means toward the target and
sideways strafes around it, so dashing past an enemy turns you back toward them
instead of sending you away. Jump cancels an attack past its
`cancelAfter` — that's the jump-cancel air combos are built on.

Lock-on is a toggle by default and cycles targets while more than one is alive;
set `controls.lockIsHold` to 1 for hold-to-lock.

**Esc** (or **Start** on a pad) opens the pause menu. It freezes the sim and
hosts the full settings editor: every tuning value as a slider or a number field
(your choice, remembered), a filter box, key/pad rebinding, and a description of
whatever parameter is selected. The same editor is embedded in the debug
overlay. Bindings persist in `localStorage`.

The menu is fully controller-driven:

| Pad | Menu action |
| --- | --- |
| D-pad / left stick | Move the selection (hold to repeat) |
| Left / Right | Nudge the selected value |
| LB + Left/Right | Nudge it in bigger steps |
| A | Open a group, or start rebinding |
| B | Close |
| Start | Close |

## Layout

```
src/
  tuning.js          EVERY number in the game. No magic numbers in systems.
  main.js            Fixed-timestep loop (60 Hz sim, decoupled render)
  world.js           Shared mutable context
  rng.js             Seeded PRNG — all sim randomness comes from here
  input.js           Keyboard + mouse + gamepad, with input buffering
  audio.js           Procedural Tone.js — one signature per attack class
  camera.js          Lock-on framing, trauma shake, FOV punch
  hud.js             Vitals, target, stroke counter
  debug.js           `~` overlay: state, hitboxes, embedded settings editor
  settings.js        The settings editor — sliders/fields, rebinding, pad nav
  tuningdocs.js      Plain-language description for every parameter
  exportaudio.js     Dev: bounce the procedural audio to WAV
  pause.js           Esc pause menu, hosts the same editor
  anim/poses.js      Key-poses + phase-space attack tracks
  combat/attacks.js  Attack identity (track, sound, trail, stroke type)
  combat/hits.js     Hit resolution and every hit-reaction class
  entities/player.js Player kit and state machine
  entities/oni.js    Enemy 1 — Oni Stain
  gfx/               Materials, arena, pooled effects
  gfx/slashfan.js    The stylized attack mark — where impact comes from
  gfx/trail.js       Ribbon: the physical blade path, secondary to the fan
tools/shotserver.mjs Dev-only screenshot sink (see below)
```

### Tuning

`src/tuning.js` is the single source of truth for timings, ranges, forces,
thresholds and decay rates. Open the debug overlay with `` ` `` to edit any of
them live; "reset tuning" restores the shipped values. Attack durations are
always derived (`attackDuration()`), never hand-written, and the animation
tracks are authored in *phase space* so retiming an attack in tuning retimes its
animation for free.

### Determinism

The sim runs at a fixed 60 Hz decoupled from render, with hit-stop consuming
whole sim steps. All sim-side randomness goes through `Rng`. Same seed + same
inputs produce a byte-identical run — verified in REPORT.md.

### Dev tooling

`window.SUMI` exposes `World`, `TUNING`, `simStep`, `spawnOni`, `killAll`,
`resetArena` and a headless `run(steps, {move, press})` driver for scripted
verification without the render loop.

`tools/filesink.mjs` is the sink used by `SUMI.exportAudio()`, which renders
every procedural sound to a 32-bit float WAV under `export/`. The game ships no
audio assets — everything is synthesised by `src/audio.js` at runtime — so this
is how you get the sounds into a DAW.

`tools/shotserver.mjs` is an optional local sink (`node tools/shotserver.mjs`)
that accepts a data-URL POST on port 5199 and writes it to `shots/`. It exists
so renders can be captured and reviewed in environments without an interactive
browser window. It is not part of the game and is not shipped.
