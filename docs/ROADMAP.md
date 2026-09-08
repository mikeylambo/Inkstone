# INKSTONE — Flagship Production Roadmap

**Starting point:** V0.4 — Combat Calligraphy  
**North star:** complete the chain from physical brush combat → persistent canvas → relational glyphs → style-based perception → Pigment → Finishing Stroke → authored Pilgrimage, without sacrificing deterministic combat or production discipline.

This roadmap is ordered by dependency, not by calendar time.

---

## 0. Current State Assessment

INKSTONE is past the “find the game” stage.

### Already real

- deterministic 60 Hz simulation,
- seeded runs and deterministic RunRecord,
- solid character-action foundation,
- lock-on and directional techniques,
- parry / launch / aerial / dash / splat vocabulary,
- persistent simulation-owned ink strokes,
- Wet / Set / Dry combat consequences,
- enemy ink ownership,
- Cross / Enso / Triad relational glyph recognition,
- Oni and Tengu Stains,
- authored wave escalation,
- score / record / result / print / gallery infrastructure,
- Daily, Endless, Free Seed, Kata and Scroll framing,
- Inkstone / Archive / Options / Credits screen language,
- accessibility settings,
- controller-aware menu flow,
- extensive tuning hooks,
- a future five-axis style-evaluator seam.

### Current architectural debt

The project’s V0.2.5–V0.2.6 “Shell / Frame v1” is bespoke Inkstone application infrastructure. It duplicates responsibilities now solved more comprehensively by the modern SLU Web Shell.

Examples include:

- app phase/state ownership,
- screen construction and routing,
- pause lifecycle,
- settings/profile storage,
- mode selection,
- results/rank plumbing,
- training scaffolding,
- leaderboards abstraction,
- input semantics,
- diagnostic instrumentation.

This code is not “bad”; it successfully protected the combat prototype. It is now the wrong place to keep investing shared production work.

### Current design debt

The strongest systems are built but the full causal chain is not yet complete.

Missing or reserved:

- real five-axis style evaluation,
- live style rank affecting the world,
- Pigment capture,
- Finishing Stroke / Scroll-Cut,
- broad Stain ecology,
- major bosses,
- Pilgrimage campaign,
- full progression,
- authored Scroll campaign content,
- expanded glyph language,
- production animation / VFX / audio / music pass,
- online leaderboard production adapter,
- player-facing replay/ghost support,
- final certification/performance/content pipeline.

### Immediate conclusion

**Do not restart the game. Do not port engines. Do not rewrite the combat core.**

The next move is to replace the outer production frame while preserving the inner deterministic game.

---

# PHASE V0.5 — FLAGSHIP FOUNDATION

## Goal

Move INKSTONE from its bespoke V0.2-era frame to the modern SLU Web Shell while proving combat parity.

## Shell composition

Use the established Inkstone composition:

`character-action + arcade`

Character Action supplies the appropriate training / ranking / results / move / progression framing. Arcade supplies score-chasing, leaderboards, replay and ruleset infrastructure.

### Keep as Inkstone Game DNA

Do not migrate these into generic modules:

- fixed-step combat simulation,
- player attack implementation,
- attack geometry,
- Stain AI/combat,
- stroke registry,
- ink lifecycle,
- glyph recognition,
- RunRecord event meanings,
- generated print logic,
- style semantics,
- bespoke UI art direction.

## Workstream A — Integration boundary

- Add modern Shell dependency/workspace integration.
- Create `inkstoneFrame` from Character Action + Arcade.
- Build a thin adapter from Shell session phases to the existing Run lifecycle.
- Make Shell semantic input feed current combat input without changing frame data.
- Preserve the 60 Hz fixed step and seeded RNG exactly.
- Preserve current camera/player/render ownership during parity phase.

## Workstream B — Flow migration

Move outer flow to Shell ownership in this order:

1. boot / title,
2. main menu,
3. play/mode selection,
4. settings,
5. pause,
6. results,
7. Archive / Inkstone navigation,
8. Kata/training framing.

Do not accept the Shell’s generic presentation as final Inkstone presentation. Use its behavior contracts and replace presentation with Inkstone’s own visual language.

## Workstream C — Storage safety

- Define current profile/save schema version explicitly.
- Add migration from historical `sumi` / old Inkstone keys.
- Use backup-before-write and recovery support.
- Verify existing gallery/IndexedDB prints survive migration.
- Separate competitive run metadata from mutable player settings.

## Workstream D — Lifecycle / reliability

Adopt Shell support for:

- visibility/background transitions,
- safe auto-pause,
- controller disconnect/reconnect,
- WebGL context loss/restoration policy,
- diagnostics and player-safe recovery UI.

## Workstream E — Studio tooling

Register Inkstone-specific dev commands/panels:

- `spawn.stain <type>`
- `wave.load <id>`
- `style.set <rank>`
- `ink.clear`
- `ink.age <state>`
- `glyph.force <id>` for presentation testing only
- `pigment.set` once implemented
- `finish.ready` once implemented
- `player.invulnerable`
- `run.export`

Add semantic telemetry events for:

- death,
- restart,
- technique use,
- stroke laid,
- glyph formed,
- glyph source marks,
- Wet skate start/end,
- Set-ink collision/splat,
- style-rank transitions,
- mission completion/abandon.

## Workstream F — CI / certification

Add project-level verification around:

- build/type/lint policy appropriate to the mixed JS/TS boundary,
- deterministic regression fixture,
- Shell smoke flow,
- asset/bundle budgets,
- controller certification,
- release certification profile.

## V0.5 exit gates

V0.5 does **not** pass because the menus look newer. It passes only if:

- same fixed seed + same semantic input fixture produces the same canvas hash and RunRecord before/after migration,
- current combat timing/feel is measurably unchanged,
- title → mode → combat → pause → results → again/title works on gamepad,
- browser blur/background cannot leave live combat or droning audio running unintentionally,
- existing saves migrate with recovery coverage,
- all player-facing current screens remain reachable,
- dev console exposes state/input/performance/telemetry/diagnostics,
- CI runs the Shell verification/certification path,
- `package.json` and project identity say INKSTONE rather than stale SUMI/V0.2.5 copy.

## V0.5 design validation carried forward from V0.4

Before adding a large amount of content, run real-player tests for the unresolved V0.4 questions:

- Does a glyph feel discovered rather than automatically awarded?
- Is Cross too ambient because the basic string writes it naturally?
- Is ~1 glyph every 1.7 seconds too frequent?
- Is Enso discoverable without explanation?
- Is Wet-ink skating discoverable without explanation?
- Which accessibility settings need to be recorded for leaderboard comparability?

Use telemetry plus observation. Do not tune from scripted-driver score share alone.

---

# PHASE V0.6 — STYLE IS REALITY

## Goal

Replace score-threshold style with the real evaluator and prove that fighting better changes what the player can perceive.

The existing `Score.evaluate(record)` seam already reserves:

- Flow,
- Variety,
- Precision,
- Composition,
- Control.

## Workstream A — Offline evaluator

Implement each axis from deterministic RunRecord evidence.

Requirements:

- every score can be explained from recorded events,
- repeated identical behavior has intentional diminishing returns where appropriate,
- no axis can be maximized by passive stalling,
- Composition specifically rewards using the written battlefield rather than merely landing glyphs,
- Control rewards command of risk rather than avoidance of engagement.

Add an evaluator breakdown to Finished Calligraphy.

## Workstream B — Live style state

Create a rolling style state informed by the same event vocabulary.

Requirements:

- hysteresis / grace prevents rank flicker,
- the HUD communicates direction without becoming a spreadsheet,
- live rank and final grade can differ for understandable reasons,
- rank loss does not erase already-earned physical state arbitrarily.

## Workstream C — First perception layers

Ship only enough Reality Rank to prove the thesis.

Suggested first implementation:

- **A / MASTER:** Pigment-bearing points become visible on eligible Stains.
- **S / FLOURISH:** one authored hidden inscription / rule target becomes visible in a test encounter.

Do not build the entire metaphysical ladder yet.

## Workstream D — Style-reactive presentation

Add rank-driven changes to:

- music layers,
- environmental linework,
- ink luminosity/texture behavior,
- seal/UI response,
- camera restraint rather than constant escalation,
- hidden-target readability.

The world should feel like additional layers of a drawing becoming legible.

## V0.6 exit gates

- five evaluator axes produce stable explainable results on regression records,
- players can correctly identify why two differently played runs receive different grades,
- at least one encounter is mechanically different at A/S because new information becomes actionable,
- style rank does more than multiply score/damage,
- no dominant exploit farms rank without engaging the combat/canvas systems,
- leaderboard record contains enough ruleset/accessibility metadata to compare like with like.

---

# PHASE V0.7 — PIGMENT & FINISHING STROKE

## Goal

Complete the flagship causal chain: high style reveals Pigment; Pigment enables the player to perform a meaningful Finishing Stroke on a deeper target.

## Workstream A — Pigment capture

Prototype Pigment as a mastery resource, not generic mana.

First capture loop:

1. reach A or higher,
2. expose Pigment-bearing layer,
3. control or compose the target into a capturable state,
4. strike/write through the exposed layer correctly,
5. capture Pigment visibly into the player’s brush/Inkstone.

Use one Pigment category first. Do not create an elemental taxonomy until mechanics demand it.

## Workstream B — Finishing Stroke state

Implement the 3D → living-scroll transition.

Technical requirements:

- deterministic target selection/state handoff,
- input buffer clear on transition,
- one semantic gesture/stroke captured cleanly,
- camera/render transition does not alter sim truth,
- result recorded in RunRecord,
- print reflects the finishing stroke.

## Workstream C — First finishing verbs

Prove at least four distinct uses:

- execute exposed Stain,
- complete a large glyph,
- capture Pigment,
- sever a boss/encounter rule target.

These should share one input language while changing consequence based on target/context.

## Workstream D — Accessibility

Add optional:

- gesture tolerance,
- timing-window assistance,
- target snap/confirmation,
- motion/camera reduction.

Competitive metadata records the relevant assist state without removing the option.

## Workstream E — First authorship boss

Build one boss whose structure is:

`survive rule → understand rule → gain style → perceive hidden anchor → capture/sever with Finishing Stroke`

This boss is the proof that the game’s metaphysical language works beyond a training room.

## V0.7 exit gates

- player can explain where Pigment came from,
- Finishing Stroke is still interactive after novelty wears off,
- at least four contexts reuse the same finishing language,
- the first boss cannot be solved by ignoring ink/style systems and simply reducing HP,
- final print visibly records the finishing action,
- replay/regression reproduces the state transition and result.

---

# PHASE V0.8 — THE CANVAS FIGHTS BACK

## Goal

Turn the combat thesis into an encounter-design engine by expanding Stain and glyph interactions.

## Workstream A — Stain ecology

Expand from Oni + Tengu toward **6 core archetypes** for alpha.

Prioritize roles that attack shared systems:

- eraser / absorber,
- smear / relocation,
- premature dry/harden,
- counter-writer,
- protector/linker,
- high-mobility canvas disruptor.

Every new Stain must combine meaningfully with at least two existing archetypes.

## Workstream B — Glyph lexicon

Expand from 3 forms toward **5–6 proven forms**.

Each new form must have:

- at least two plausible constructions,
- a distinct spatial/combat meaning,
- an authored enemy/encounter use case,
- RunRecord support,
- print language,
- Kata teaching setup.

Do not add forms solely to increase a number on the feature list.

## Workstream C — Ink-on-ink interactions

Prototype only interactions that deepen readable authorship, for example:

- player ink cutting contaminated enemy ink,
- Set ink being fractured and reused,
- enemy smear changing an almost-complete form,
- high-skill recovery of a corrupted composition.

## Workstream D — Encounter authoring tools

Move wave/Scroll definitions toward validated data content.

Need:

- encounter IDs,
- spawn groups,
- arena tags,
- Stain mixes,
- objective/rule references,
- style/perception gates,
- boss phase timelines,
- validation for missing references/duplicate IDs.

## V0.8 exit gates

- 6 Stain archetypes create meaningfully different compositions,
- 5–6 forms are learnable and still useful outside their introduction,
- at least three encounters require different canvas strategies rather than different DPS,
- no new enemy requires an unrelated HUD rule to understand it,
- content authoring can add an encounter without editing the central Run class.

---

# PHASE V0.9 — PILGRIMAGE VERTICAL SLICE

## Goal

Prove INKSTONE as a complete authored game, not only an exceptional combat sandbox.

Build one release-quality Pilgrimage chapter from first menu input to chapter-ending boss and Archive result.

## Chapter contents

Target:

- 3–4 authored Scrolls,
- 1 major boss,
- 1 strong environmental identity,
- chapter-specific Stain composition,
- at least one new technique or form taught through play,
- a meaningful Pigment/Finishing Stroke escalation,
- narrative framing that explains mechanics without stopping the game for exposition,
- chapter-complete music/audio arc,
- final calligraphy presentation.

## Progression pass

Make all Inkstone tabs real enough to support the chapter:

- Techniques,
- Strokes,
- Finishing Stroke,
- Pigment,
- Record.

Progression rewards expressive possibility rather than damage-stat inflation.

## Narrative rule

Story development starts from the proven mechanic:

**What does it mean in this world that sufficiently masterful calligraphy can expose and cut non-physical truths?**

Do not write lore that requires the combat system to imitate it later.

## V0.9 exit gates

A fresh player can:

- start Pilgrimage,
- learn the basic brush/canvas language without external documentation,
- discover a form,
- understand Wet/Set ink,
- encounter style-based perception,
- capture Pigment,
- use a Finishing Stroke,
- defeat a true authorship boss,
- receive a meaningful Finished Calligraphy,
- and understand why they want to replay for mastery.

This chapter becomes the vertical slice used to judge the rest of production.

---

# PHASE V0.10 — FLAGSHIP ALPHA

## Goal

Expand the proven vertical slice into the complete game backbone.

### Alpha content target

- 3–4 Pilgrimage chapters structurally playable,
- 12–16 authored Scrolls,
- 3–4 major bosses,
- 8 core Stain archetypes/variants in rotation,
- 6–8 glyphs/forms,
- full first-pass technique tree,
- Style / Pigment / Finishing Stroke progression loop complete,
- Daily / Kata / Scroll replay loops complete,
- Archive / records / gallery complete,
- leaderboard adapter functional,
- replay viewer or ghost proof functional.

### Alpha production target

- all content data validated,
- no placeholder player-facing screens in supported flows,
- save migrations tested,
- controller flow certified,
- performance budgets defined against worst-case target encounters,
- semantic telemetry covers progression and encounter failure points,
- recovery/error path tested,
- accessibility suite integrated into real gameplay.

## Alpha exit gate

**The whole game exists.** Content may still be rough, balance may move, and art/audio may still need production passes, but no pillar is represented by a placeholder or future tab.

---

# PHASE V0.11 — CONTENT COMPLETE / BETA

## Goal

Reach full intended 1.0 content and turn production data into polish priorities.

### 1.0 content target range

- 4–6 Pilgrimage chapters,
- roughly 18–24 substantial Scrolls/challenges,
- 5–6 major bosses,
- 8–10 core Stain archetypes plus variants,
- 6–10 deeply interacting glyphs,
- complete technique / Pigment / Finishing Stroke progression,
- Daily Scroll, Kata, Endless/Free Seed and score replay loops,
- full Archive, records, prints, leaderboards and practical replay/ghost support.

### Beta workstreams

#### Combat balance

- rank distribution,
- axis weighting,
- glyph cadence,
- Cross dominance,
- move repetition exploits,
- Stain composition pressure,
- boss phase clarity,
- damage/time-to-kill,
- high-rank uptime,
- Pigment economy,
- Finishing Stroke frequency.

#### Onboarding

Measure:

- time to first intentional Wet skate,
- time to first discovered glyph,
- time to first deliberate glyph,
- first parry success,
- first A rank,
- first Pigment capture,
- first successful Finishing Stroke.

Teach through authored situations before adding explanatory copy.

#### Visual production

- final character/brush model and animation quality,
- Stain silhouettes,
- paper/ink material language,
- state readability,
- perception-layer transformation,
- Finishing Stroke transition,
- boss spectacle,
- UI typography/layout/motion,
- print/gallery quality.

#### Audio production

- original score,
- style-reactive music layers,
- combat transient hierarchy,
- brush/paper/ink state Foley,
- enemy tell language,
- Pigment/Finishing signatures,
- pause/background behavior,
- mono and accessibility checks.

#### Performance

Test target worst cases, not empty scenes:

- full live canvas,
- max intended Stain density,
- peak glyph VFX,
- high-rank world layer,
- boss presentation,
- UI overlay,
- replay/recording active.

#### Platform and release

- browser support matrix,
- desktop packaging strategy if/when required,
- cloud/platform service adapter where valuable,
- achievements,
- leaderboard integrity,
- crash/recovery report flow,
- certification profiles,
- release build budgets.

## Beta exit gate

No known issue should threaten:

- deterministic truth,
- save safety,
- input fairness,
- combat readability,
- progression integrity,
- accessibility,
- performance budget,
- or a complete player journey.

---

# PHASE 1.0 — THE FINISHED SCROLL

## Release definition

INKSTONE 1.0 is complete when a player can:

1. enter Pilgrimage with no external documentation,
2. learn to fight with a brush rather than a conventional sword vocabulary,
3. visibly change their next decisions through persistent ink,
4. discover and intentionally compose relational glyphs,
5. improve across Flow / Variety / Precision / Composition / Control,
6. reach ranks that reveal deeper layers of the world,
7. capture Pigment through mastery,
8. perform meaningful interactive Finishing Strokes,
9. defeat bosses by understanding and severing authored rules rather than only draining HP,
10. complete the campaign,
11. return for Scroll ranks, Daily competition, Kata mastery and Archive collection,
12. preserve actual combat history as unique Finished Calligraphy.

If any item in that list is simulated by placeholder copy, a canned cinematic, a generic score system, or an ink effect that the simulation does not understand, the flagship thesis is not finished.

---

# Cross-Phase Production Rules

## Rule 1 — Preserve the combat truth

Never combine a large architecture rewrite with a combat-feel rewrite. Establish parity first, then improve feel against a known baseline.

## Rule 2 — Build the causal chain in order

Do not build twenty Scrolls before Style → Pigment → Finishing Stroke works. Content built before the core language stabilizes creates expensive rework.

## Rule 3 — Use the Shell for institutional problems

Do not rebuild generic lifecycle, save, settings, telemetry, certification, replay plumbing, focus management, or platform seams inside Inkstone unless the game genuinely needs behavior the Shell cannot express.

## Rule 4 — Keep Inkstone visually sovereign

Shared Shell behavior must not make the game look generic. Every player-facing surface should belong to the paper/ink/calligraphy art direction.

## Rule 5 — Data-author repeated content

Stains, Scrolls, encounter compositions, bosses, objectives, unlocks, and copy should progressively move toward validated data rather than central switch statements.

## Rule 6 — Instrument questions, not vanity metrics

Telemetry exists to answer design questions such as “Did players discover skating?” or “What behavior produces S rank?” not merely to count sessions.

## Rule 7 — No feature gets to be only thematic

If a mechanic is described with the words ink, brush, calligraphy, stroke, Pigment, seal, Scroll, or writing, it should have a real gameplay consequence.

---

# Immediate Next Build Order

The next implementation sequence should be:

1. **Create the V0.5 shell-migration branch and parity harness.**
2. **Wire Character Action + Arcade Shell composition around the existing sim.**
3. **Migrate lifecycle/input/settings/save/pause/results incrementally.**
4. **Add deterministic regression and smoke/certification gates.**
5. **Run the unresolved V0.4 human-play tests.**
6. **Implement V0.6 five-axis evaluator from RunRecord.**
7. **Prototype A/S Reality Rank perception in one encounter.**
8. **Build first Pigment capture.**
9. **Build first Finishing Stroke / Scroll-Cut.**
10. **Build the first authorship boss.**
11. **Only then expand Stains, glyphs, and Pilgrimage content at scale.**

That order gets INKSTONE to its unique game fastest while making every later content addition cheaper and safer.