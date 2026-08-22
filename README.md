# SUMI (codename SlayRank)

A high-impact character-action scoresmith where every sword stroke writes on the
battlefield, and what you've written changes how the fight plays.

**Current phase: V0.2 — Combat Feel.** See [REPORT.md](REPORT.md) for gate results.

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
| Heavy — Dive in air | `L` or MMB | RT |
| Dash (8-dir, i-frames) | `Space` | A |
| Parry | `Shift` or `F` | B / LT |
| Lock-on / cycle target | `Q` or `Tab` | LB / RB |
| Debug overlay | `` ` `` (backquote) | — |

Movement is camera-relative. Lock-on cycles through targets; pressing it with a
single enemy alive releases the lock.

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
  debug.js           `~` overlay: state, hitboxes, live tuning editors
  anim/poses.js      Key-poses + phase-space attack tracks
  combat/attacks.js  Attack identity (track, sound, trail, stroke type)
  combat/hits.js     Hit resolution and every hit-reaction class
  entities/player.js Player kit and state machine
  entities/oni.js    Enemy 1 — Oni Stain
  gfx/               Materials, arena, sword ribbon, pooled effects
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

`tools/shotserver.mjs` is an optional local sink (`node tools/shotserver.mjs`)
that accepts a data-URL POST on port 5199 and writes it to `shots/`. It exists
so renders can be captured and reviewed in environments without an interactive
browser window. It is not part of the game and is not shipped.
