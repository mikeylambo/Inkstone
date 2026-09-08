# INKSTONE — Game Design Document

> **Working thesis:** The brush is the blade. Every combat action writes on the battlefield, what is written changes the fight, and mastery eventually grants the player the ability to write on reality itself.

**Document status:** Living flagship GDD  
**Current playable:** V0.4 — Combat Calligraphy  
**Primary genre:** 3D character-action scoresmith / combat calligraphy  
**Current technology:** Three.js + deterministic fixed-step simulation, wrapped by the SLU Web Shell production architecture

---

## 1. High Concept

INKSTONE is a character-action game in which swordplay and calligraphy are the same system.

The player does not wield a conventional sword decorated with ink effects. The weapon is a combat brush. Its physical movement creates attacks, attacks leave persistent strokes, strokes change the battlefield, and multiple strokes can form relational glyphs whose meaning becomes a combat effect.

At high-level play, style is not merely a grade. Style changes what the player can perceive and therefore what can be cut. As rank rises, deeper layers of enemies and the world become visible: pigment, bindings, names, shadows, rules, and other metaphysical targets. The highest expression of mastery is the **Finishing Stroke** — a temporary flattening of the fight into a living scroll in which one decisive stroke can complete, sever, capture, erase, or rewrite something that ordinary attacks cannot touch.

Every run ends as a piece of calligraphy generated from the fight that actually occurred.

### One-sentence player promise

**Fight beautifully enough and the battlefield stops being scenery: it becomes something you can write.**

---

## 2. Design Pillars

### 2.1 The Brush IS the Blade

Every meaningful attack must read as a physical brush gesture.

- Horizontal attacks are horizontal sweeps.
- Vertical attacks are vertical strokes.
- Thrusts are press-and-pull punctures.
- Heavy attacks are loaded, expressive marks.
- Air attacks only write when the brush reaches the surface.
- The visual attack path and the simulation stroke path must agree.

There is no forced forward lunge as a generic crutch. Forward motion belongs to authored attacks, cancels, dashes, and intentional directional techniques.

### 2.2 The Battlefield Remembers

Ink is simulation, not decoration.

A stroke persists after the attack and becomes part of the combat state. The player should routinely make decisions because of marks laid several seconds earlier.

Current lifecycle:

`Fresh → Wet → Set → Dry → Faded`

Current examples:

- Wet player ink extends and accelerates dash/skate movement.
- Set heavy ink becomes a physical combat surface.
- Set ink can redirect charges and participate in splats.
- Enemy ink can contaminate movement space.

The long-term rule is simple: **if a visual mark appears mechanically important, the simulation should know it exists.**

### 2.3 Composition, Not Recipe Memorization

Glyphs are relational.

An attack is never tagged as “the Cross move.” The game asks what shapes the player actually wrote into space. A glyph occurs when existing marks satisfy geometric relationships.

This protects the core fantasy from becoming a conventional combo list wearing calligraphy terminology.

Current forms:

- **十 Cross** — intersecting marks; severs at the crossing and splat-arms the target.
- **〇 Enso** — ink closes around a centre; encloses, pulls, and holds.
- **三 Triad** — three parallel straight marks; releases a wave along the lines.

Future forms must obey the same rule: the geometry creates the meaning.

### 2.4 Style Is Ontology

Style rank is not only a score multiplier or post-run letter grade.

The better the player fights, the more of reality becomes legible.

Low-rank combat is physical. High-rank combat exposes deeper targets and allows higher-order interactions. This turns the style system into progression *inside the fight* rather than a judgment imposed after it.

### 2.5 Mastery Produces Art

The run record is both gameplay evidence and an art-generation source.

The final print must come from the actual strokes, movement, enemy events, and forms written during play. It should never be a generic reward screen with randomized decoration.

The Archive is therefore part score history, part replay history, and part gallery.

### 2.6 Depth Comes From Language

Progression should primarily expand what the player can express, not inflate damage numbers.

A stronger player gains:

- more techniques,
- more stroke relationships,
- more ways to alter existing ink,
- more targets visible at high style,
- more Finishing Stroke verbs,
- and greater ability to compose several systems at once.

---

## 3. The Core System Chain

INKSTONE should be designed as one continuous chain rather than a collection of unrelated mechanics:

**Gesture → Attack → Stroke → Ink State → Spatial Composition → Glyph → Style → Perception Layer → Pigment → Finishing Stroke → Finished Calligraphy**

Every major feature should strengthen at least one link in this chain.

Features that do not reinforce this chain require exceptional justification.

---

## 4. Core Play Loop

### 4.1 Second-to-second

1. Read Stain intent and battlefield geometry.
2. Move, parry, dash, launch, juggle, and redirect enemies.
3. Write strokes through combat rather than stopping to draw.
4. Reuse Wet and Set ink for movement, defense, positioning, and setups.
5. Complete relational forms through spatially deliberate attack sequences.
6. Maintain expressive, controlled play to raise style.
7. At high style, perceive deeper targets and capture Pigment.
8. Spend accumulated mastery on a Finishing Stroke when the fight presents a meaningful target.

### 4.2 Scroll loop

A standard authored Scroll should target roughly **10–15 minutes** on a clean clear, with score-chasing and mastery supporting much longer replay value.

A Scroll contains:

- opening combat statement,
- escalation or spatial complication,
- enemy composition change,
- one mechanical test of the current chapter’s language,
- climax encounter or boss beat,
- Finished Calligraphy result and Archive save.

### 4.3 Long-term loop

`Play Scrolls → learn techniques and forms → improve style literacy → capture new Pigment/mastery → unlock expressive options → revisit Scrolls for higher ranks and better calligraphy → advance Pilgrimage`

The game should support both a player who wants to finish the Pilgrimage and a player who wants to live in the scoring system for hundreds of hours.

---

## 5. Combat

### 5.1 Existing foundation

The current playable already supports:

- movement,
- 3-hit light string,
- launcher,
- dive heavy,
- jump,
- dash,
- parry,
- lock-on,
- directional lock-on techniques,
- camera control,
- hit-stop and shake tuning,
- deterministic hit resolution,
- wall/set-ink splats,
- persistent stroke simulation,
- relational glyph recognition.

Directional examples already in the build:

- Toward + Light — Thrust
- Away + Light — High Time
- Toward + Heavy — Splitter

These are the beginning of the combat language, not the intended final move count.

### 5.2 Combat goals

Combat must reward five kinds of mastery simultaneously:

- **Execution:** timing, cancels, parries, movement.
- **Expression:** varied technique use without forcing arbitrary move cycling.
- **Geometry:** where attacks write and where enemies end up.
- **Memory:** using marks laid earlier in the fight.
- **Authorship:** deliberately changing what the encounter permits.

### 5.3 Cancel philosophy

INKSTONE should feel responsive enough for character-action mastery without erasing weight.

Cancels exist to let the player author intent, not to make every animation meaningless. Recovery can be escaped through authored skill actions such as dash, jump, parry, glyph interaction, or specific technique routes rather than one universal cancel rule.

### 5.4 Enemy launch / aerial play

Air combat is important because the floor is the canvas.

Leaving the floor should create a meaningful trade:

- aerial routes offer safety, control, and combo extension,
- grounded routes write more usable ink,
- dive/return attacks reconnect the air route to the canvas.

The best play should move fluidly between those states.

---

## 6. Ink and the Living Canvas

### 6.1 Ownership

Every stroke has an owner. Player and Stain ink can coexist and contest space.

Enemy design should increasingly attack the player’s authorship of the canvas by:

- staining,
- smearing,
- absorbing,
- overwriting,
- drying,
- breaking,
- redirecting,
- or counter-writing ink.

### 6.2 State readability

Ink states must be visually legible without requiring HUD text.

The player should learn to distinguish Fresh, Wet, Set, Dry, and Faded through motion, sheen, edge behavior, sound, particle behavior, and response to contact.

### 6.3 Canvas limits

Readability beats accumulation for its own sake.

Old marks may fade faster under load, but a mechanically active mark must never disappear in a way that reads as arbitrary. Performance culling must preserve gameplay truth.

---

## 7. Glyph Language

### 7.1 Recognition rules

All combat glyphs must be:

- relational,
- deterministic,
- derived from real stroke paths,
- incrementally recognized,
- spatially readable,
- and useful even when discovered accidentally before being mastered deliberately.

### 7.2 Learning curve

The intended learning arc is:

**Accident → Recognition → Intention → Composition → Improvisation**

The Cross is currently the “free discovery” form. Enso and Triad require more deliberate positioning. Future forms should populate the space between immediate discovery and expert composition rather than simply becoming more obscure recipes.

### 7.3 Expansion target

The final game should favor a **small, deeply interacting lexicon** over dozens of shallow symbols.

A launch target of roughly **6–10 combat forms** is sufficient if each form:

- has multiple valid constructions,
- changes positioning or world state,
- interacts with Stain behavior,
- participates in style evaluation,
- and remains useful after the tutorial chapter in which it is introduced.

New forms are added only when their gameplay meaning is distinct.

---

## 8. Style System — “Reality Rank”

### 8.1 Two outputs from one truth

The same RunRecord should support:

1. a **live style state** used during combat, and
2. an **end-of-run evaluation** used for Finished Calligraphy, records, and leaderboards.

The live state uses a rolling window and hysteresis so reality does not visibly flicker every time a rank boundary is crossed. The end evaluator reads the whole run.

### 8.2 Evaluation axes

The established five axes are:

#### Flow

How continuously and intentionally the player maintains the fight.

Possible evidence:

- meaningful action continuity,
- movement between targets,
- cancel timing,
- low dead-time,
- maintaining control through transitions.

#### Variety

How broad the player’s expressive vocabulary is.

Possible evidence:

- unique techniques,
- unique glyphs,
- diminishing return on exact repetition,
- varied kill/control routes.

Variety must never become “press every move once.” Repetition is allowed when the situation meaningfully calls for it.

#### Precision

How accurately the player executes intent.

Possible evidence:

- whiffs,
- parry timing,
- correctly spaced hits,
- deliberate glyph completion,
- avoided friendly/self-defeating ink interactions.

#### Composition

How intelligently the player uses the persistent canvas.

Possible evidence:

- useful glyphs,
- reusing prior marks,
- routing movement along Wet ink,
- splatting into Set ink,
- multi-enemy form value,
- chaining one written state into another.

This is the axis that makes INKSTONE unlike a conventional action-game rank system.

#### Control

How completely the player governs risk and enemy behavior.

Possible evidence:

- damage taken,
- crowd control,
- denied attacks,
- positioning,
- keeping multiple Stains managed without passive play.

### 8.3 Rank language

Current rank seals are retained unless later art direction finds stronger calligraphy:

| Grade | Seal | Title |
| --- | --- | --- |
| D | 拙 | CLUMSY |
| C | 斬 | SLASH |
| B | 烈 | FIERCE |
| A | 極 | MASTER |
| S | 華 | FLOURISH |
| SS | 神 | DIVINE |
| SSS | 天 | HEAVENLY |

### 8.4 Rank changes perception

The crucial rule: **higher rank exposes new targets more than it grants raw numerical power.**

Proposed perception ladder:

- **D–C — Surface:** only physical bodies, attacks, and ordinary canvas state are readable.
- **B — Pattern:** enemy rhythm and latent stroke relationships become more visually legible.
- **A — Pigment:** Pigment-bearing weak points/essence can appear and be captured through skilled play.
- **S — Inscription:** hidden environmental or enemy inscriptions become targetable; some encounter rules can be altered.
- **SS — Metaphysical:** elite/boss layers such as bindings, shadows, names, vows, links, or phase anchors can be cut.
- **SSS — Authorship:** the Finishing Stroke can act on the fight’s highest-order target and produce the most expressive result.

This ladder is a design framework, not permission to make lower ranks feel incomplete. The physical action game must already be excellent at D–B.

---

## 9. Pigment

Pigment is the resource of high-level perception.

It is **not generic mana** and should not refill passively on a timer.

The player captures Pigment by reaching sufficient style, exposing a Pigment-bearing target, and interacting with it correctly through the combat/calligraphy system.

Pigment serves two related purposes:

- an in-run mastery resource that enables or strengthens Finishing Stroke opportunities,
- a record of what kinds of deeper combat truths the player has learned to access.

Do not create a color-element chart simply to fill the Pigment tab. Pigment types should only be introduced when enemies, bosses, or progression need mechanically distinct categories.

---

## 10. Finishing Stroke / Scroll-Cut

**Player-facing name:** Finishing Stroke  
**Design shorthand:** Scroll-Cut

The Finishing Stroke is the super-art expression of the entire game thesis.

### 10.1 Presentation

At activation, combat time compresses or suspends and the 3D scene resolves toward a living 2D scroll composition. The player receives one decisive brush gesture.

The transition should feel like the player has reached beneath the fight rather than opened a separate minigame.

### 10.2 Possible verbs

Depending on the visible target and player mastery, one stroke can:

- execute a defeated or exposed Stain,
- complete a large unfinished glyph,
- sever a boss mechanic or phase anchor,
- erase a dangerous field,
- capture Pigment,
- cut a link between enemies,
- cut a shadow, name, bond, rule, or other metaphysical target,
- or finalize a Scroll-specific objective.

### 10.3 Skill requirement

Finishing Stroke should reward stroke direction, timing, placement, target choice, and the state the player authored before activation. It must not become a canned cinematic button.

Accessibility options may widen timing or gesture tolerance without changing the artistic fantasy.

---

## 11. Stains — Enemy Design

Enemies are called **Stains** because they contest authorship of the battlefield.

### 11.1 Existing Stains

#### Oni

Close-range pressure and charge behavior. Interacts physically with Set ink and splat systems.

#### Tengu

Ranged space controller. Throws enemy ink at the floor and turns parts of the canvas against the player.

### 11.2 Roster grammar

Future Stains should be designed around verbs that interact with the same canvas rules rather than bespoke gimmick logic.

Useful roles include enemies that:

- erase player ink,
- smear or relocate it,
- harden or prematurely dry it,
- overwrite it with enemy ink,
- pin the player to a region,
- counter-write forms,
- protect another Stain’s metaphysical layer,
- or force the player to choose between preserving a composition and abandoning it.

The 1.0 roster should be large enough to create qualitatively different encounter compositions without requiring one-off rules for every enemy. Rough target: **8–10 core Stain archetypes plus authored variants**.

### 11.3 Boss rule

A boss is a fight over authorship.

Bosses should not merely be large HP pools. Each major boss should own or enforce a rule of the canvas that the player eventually learns to perceive, contest, and cut.

The ideal boss progression is:

**survive the rule → understand the rule → write around the rule → expose the rule → sever or rewrite the rule.**

---

## 12. Modes and Game Structure

### 12.1 Pilgrimage

The authored campaign and long-form backbone of INKSTONE.

Pilgrimage gives context to techniques, glyphs, Stains, bosses, Pigment, and metaphysical combat. It should teach through encounter design rather than long tutorial text.

Narrative specifics remain intentionally open until the combat/metaphysical rules are proven in play. The world fiction must explain *why writing and cutting reality are the same act*, but it should be built around the mechanic rather than pasted over it.

### 12.2 Scrolls

Pure authored missions for score, mastery, records, and replay.

Scrolls can exist inside Pilgrimage and as replayable standalone challenges.

### 12.3 Daily Scroll

UTC-date seeded score challenge. Identical challenge conditions are essential for fair comparison.

### 12.4 Kata

Training mode for technique practice, canvas experimentation, lifecycle control, enemy setup, and advanced system study.

The modern Shell’s training infrastructure should power the mode while Inkstone supplies its bespoke presentation and combat controls.

### 12.5 Endless / Free Seed

Useful for mastery, stress testing, emergent compositions, and score-chasing. These remain secondary to authored flagship content.

---

## 13. The Inkstone — Progression / Loadout

The meta screen is called **The Inkstone**.

Established tabs:

### Techniques

Combat actions, cancels, directional techniques, and advanced routes.

### Strokes

The player’s written combat vocabulary: geometry, lifecycle implications, and discovered forms.

### Finishing Stroke

Unlocked high-order finishing options and mastery information.

### Pigment

Captured Pigment knowledge/resources once the system is live.

### Record

Mastery history, ranks, challenge records, form usage, and meaningful performance trends.

### Progression philosophy

Progression expands language. Avoid broad RPG stat inflation that makes an early Scroll trivial because a later number is larger.

A returning expert should dominate an early Scroll because they understand the system better, not because their damage value doubled.

---

## 14. Archive and Finished Calligraphy

### 14.1 Finished Calligraphy

Results should answer:

- How well did I fight?
- What did I write?
- What did I discover?
- What did I control?
- What can I improve?

The screen should surface the five style axes once the evaluator is complete, forms written, Pigment captured, rank, score, key events, and the generated print.

### 14.2 Archive

Archive is the lasting memory of play:

- Scroll Gallery,
- Records,
- Ink Record,
- Leaderboards,
- future replay/ghost viewing.

A gallery print should be traceable back to the deterministic RunRecord that produced it whenever storage allows.

---

## 15. Visual Direction

### 15.1 Principle

**Paper is not a texture. Ink is not a particle effect. The world should feel materially written.**

Visual priorities:

- large calm areas of paper/negative space,
- strong black ink mass,
- visible bristle direction and stroke pressure,
- selective vermilion seals and authored accent color,
- readable silhouettes before detail,
- 3D spatial clarity that can collapse convincingly into 2D calligraphy,
- environment reactions that make style-rank perception feel like layers of the page being revealed.

### 15.2 Combat readability hierarchy

1. enemy intent,
2. player/enemy ownership of ink,
3. mechanically active stroke state,
4. glyph opportunity/completion,
5. style/perception information,
6. ornamental brush texture.

Beauty may never make the first five harder to read.

---

## 16. Audio and Music

The musical identity should combine:

- emotionally expressive melodic/choral writing,
- hard mechanical or martial rhythmic pressure,
- and spacious minimalism that leaves room for brush contact and combat transients.

The score should react to authorship rather than only enemy count. Useful layers include:

- base spatial ambience,
- combat pulse,
- style-rank harmonic expansion,
- glyph/form punctuation,
- high-rank Pigment texture,
- Finishing Stroke near-silence followed by one decisive musical consequence.

Sound design priorities:

- bristle contact,
- ink weight/state,
- paper/fiber response,
- parry clarity,
- enemy tell grammar,
- rank/perception reveal,
- and distinct sonic ownership for player vs Stain ink.

---

## 17. UX and Accessibility

INKSTONE is controller-first but must remain fully usable with keyboard/mouse.

Accessibility already established in the project includes options around:

- screen shake,
- hit-stop,
- flashes,
- camera motion,
- high-contrast tells,
- text size,
- hold/toggle behavior.

Future requirements:

- independent gesture/timing assistance for Finishing Stroke,
- clear non-color-only distinction between player and Stain ink,
- style/perception information that does not rely only on visual saturation,
- remappable semantic actions through the modern Shell,
- robust pause/background lifecycle behavior,
- UI stress/localization testing before release.

Leaderboard comparability must explicitly record or classify any setting that alters simulation or score-relevant timing. Accessibility should remain available; competitive metadata should make conditions transparent rather than hiding options.

---

## 18. Technical Design Principles

### 18.1 Preserve the deterministic combat core

The fixed 60 Hz simulation, seeded RNG, stroke registry, relational glyph recognition, and RunRecord are strategic assets.

Shell migration must not rewrite them merely for architectural uniformity.

### 18.2 Modern Shell boundary

The target Shell composition is:

`character-action + arcade`

The SLU Web Shell owns production infrastructure such as:

- lifecycle/session,
- semantic input,
- settings/accessibility storage,
- save migration/recovery,
- screens/focus/navigation,
- modes/difficulty/challenges,
- results/rankings/leaderboards,
- training/replay scaffolding,
- telemetry/diagnostics,
- content validation,
- performance budgets,
- platform services,
- certification and smoke flow.

INKSTONE retains Game DNA:

- brush combat,
- attack geometry,
- player/enemy simulation,
- persistent strokes,
- ink lifecycle,
- glyph recognition,
- style evaluator semantics,
- reality-rank perception,
- Pigment,
- Finishing Stroke,
- bespoke visual/audio presentation,
- authored Stain and Scroll content.

### 18.3 Shell-out, game-in

Migration order should move the outer app infrastructure first and leave the inner deterministic simulation intact.

Do not convert stable combat code to TypeScript in the same change that replaces lifecycle/UI architecture. Type hardening can happen behind tested boundaries after parity is proven.

### 18.4 Verification standard

A flagship build should be able to prove:

- same seed + same semantic inputs = same RunRecord and canvas result,
- save migrations preserve existing player data,
- controller flow reaches every player-facing screen,
- pause/background/controller-disconnect behavior is safe,
- performance budgets remain green at content target loads,
- all authored content passes reference/ID validation,
- smoke tests cover title → setup → combat → pause → results → replay/return paths.

---

## 19. Content Target for 1.0

These are production targets, not permission to pad the game.

A flagship-sized 1.0 should aim toward:

- **Pilgrimage:** 4–6 authored chapters,
- **Scrolls:** roughly 18–24 substantial combat missions/challenges across the campaign and score modes,
- **Bosses:** 5–6 major authorship fights,
- **Stains:** 8–10 core archetypes plus variants,
- **Glyphs:** 6–10 deeply interacting forms,
- **Modes:** Pilgrimage, Scrolls, Daily Scroll, Kata, Endless/Free Seed,
- **Meta:** complete Inkstone + Archive + records + gallery + leaderboards,
- **Mastery:** full five-axis evaluator, Reality Rank, Pigment, Finishing Stroke,
- **Replayability:** deterministic replay/ghost capability where practical,
- **Presentation:** original reactive score, production SFX, polished VFX/animation/UI, accessibility and certification pass.

If a smaller content count produces more distinct encounters and better replay, prefer density over padding.

---

## 20. Non-Negotiables

Do not turn INKSTONE into:

- a normal action game with ink-themed VFX,
- a drawing minigame interrupted by combat,
- a move-recipe glyph system where attacks secretly carry symbol tags,
- a loot-stat RPG where numbers replace mastery,
- a style meter that changes only score text,
- a super meter that ends in a canned cinematic with no player stroke,
- or a canvas whose visible and simulated geometry can disagree.

The test for every major feature is:

> **Does this make fighting feel more like writing, and writing feel more like fighting?**

If not, it is probably not an INKSTONE feature.

---

## 21. Flagship Definition

INKSTONE earns flagship status when a new player can understand the brush fantasy immediately, an intermediate player can deliberately write the battlefield, and an expert player can manipulate layers of reality that the beginner literally could not perceive — all while the same deterministic combat record produces a unique finished work of calligraphy.

The ambition is not “character action with a unique art style.”

The ambition is a combat language that could only exist because the art style, simulation, scoring, progression, enemies, world rules, and final artifact are all the same idea.