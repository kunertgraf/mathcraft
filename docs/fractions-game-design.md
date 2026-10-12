# Fractions & Decimals Game — Design Notes

Status: draft (2026-10-12). Minecraft-*inspired* (original pixel art and names; no Mojang assets) because the repo is public.

## Who it's for
8-year-old, reads comfortably, has ADHD, very creative and loves building. 3rd grader in Seattle Public Schools (enVision Math 2020). Grade-3 fractions (Topics 12–13) are scheduled for
about Mar–Apr, so in the fall he has likely had **no formal fraction instruction yet**. Goal: preview grade 3, then
stretch into grade 4 (and some grade 5).

## Research → design principles
| Principle | Evidence |
|---|---|
| **Number line is the core mechanic** (mineshaft depth). Area/slab models only as support. | IES guide rec. 2 (moderate); Hamdan & Gunderson 2017 — only number-line training transferred to comparison; Fuchs et al. 2013 RCT |
| **Use lines beyond 0–1** (shafts 0–2, 0–3) and vary them. | Nuraydin et al. 2022 — a 0–1 estimation game didn't transfer to 0–5 lines |
| **Short explicit lessons**, not just practice: each biome opens with a worked example from a guide character. | Nuraydin 2022; Wouters 2013 (games + instruction > games alone) |
| **Fade scaffolds**: tick marks on the line disappear as mastery grows; occasional plain-notation checks. | DragonBox over-scaffolding → weak transfer (Long & Aleven 2014) |
| **Bias-busting comparisons**: 1/8 vs 1/6, 0.25 vs 0.5, 0.3 vs 0.45. Pick items from his own error pattern. | Whole-number bias in ~59% of 4th graders (Braithwaite & Siegler 2018); "longer is larger" ~74% of Yr 4 (Steinle & Stacey) |
| **Equal partitioning enforced by mechanics**: unequal cuts make the block crumble. | IES rec. 1 (fair sharing) |
| **Decimals as base-10 blocks**: block → 10 slices → 100 cubelets. Fractions & decimals share one line. | Moss & Case 1999; Malone/Fuchs 2019 (magnitude transfers to decimals) |
| **Explanatory feedback**: on a miss, show where his answer actually lands vs. the target. | Shute 2008 (from memory) |
| **Interleave + space**: each run mixes current skill (~60%) with review (~40%). | Rohrer et al. 2020 (61% vs 38%, d=0.83) |
| **Mastery-gated, adaptive; brisk but untimed** on new skills. Optional "beat your best" speed rounds on mastered skills (see ADHD section). | Ramirez et al. 2013; Metin et al. 2012 |
| **Math is the game action**, not a quiz between play. | Habgood & Ainsworth 2011 (more learning, 7× more voluntary play) |
| **Reward careful effort** (using the check step, close estimates, fixing a mistake), not raw attempts. | Refraction "brain points" (O'Rourke 2014); ADHD guessing risk |
| **Sessions**: ~8–12 min of missions, then a bounded build segment, over many days. | Wouters 2013; ADHD section |

## ADHD-specific adjustments
| Principle | Evidence |
|---|---|
| **Immediate, frequent rewards**: a material after every correct answer, a bigger unlock every 3–5 problems. Rewards are building materials, so they're concrete. | Delay aversion (Sonuga-Barke 2003); steeper delay discounting d=0.43 (Jackson & MacKillop 2016); Tripp & Wickens 2008 |
| **Never yank rewards**: thin them gradually; no surprise penalties or loss of earned items. | Partial reinforcement & frustration effects (Douglas & Parry 1994; Aase & Sagvolden 2006) — mixed evidence |
| **Brisk pacing, no dead time**: fast transitions, no long animations between problems. | Slow event rates hurt ADHD performance; very fast raises impulsive errors (Metin et al. 2012) |
| **Optional self-competition timers** on mastered skills only; never countdowns on new skills; never leaderboards; never penalize slowness. | Inferred from event-rate work; no direct ADHD timer RCT found |
| **Anti-guessing**: after 2–3 fast wrong answers, a short "measure twice" nudge + hint. Colour-code operations to cut switch errors. | Impulsive/switch errors in ADHD math (Tosto et al. 2015; Frontiers 2017) |
| **Low working-memory load**: one step on screen, keep the model visible, no inventory/menus during a problem, demonstrate rather than explain. | Kofler, Rapport et al. 2010 |
| **Stimulation *inside* the task**, not around it: the problem itself is colourful/animated; the sandbox is hidden during missions. | Lee & Zentall 2002 |
| **Choice**: he picks which structure/mission to tackle; the math stays required. | Powell & Nelson 1997; Dunlap et al. 1994 (single-case) |
| **Micro-levels**: an unlock every few minutes, not every biome. | Delay aversion |
| **Interleaving after basic fluency**, with operation switches made visible. | Rohrer 2020 + switch-error findings |
| **Worked examples are interactive** (tap through steps), never passive screens. | Dead time vs. event-rate findings |
| **Gentle endings**: visual "last 2 problems" warning; end on a "save your build" ritual, not a hard cutoff. Build time is bounded. | Practitioner consensus; problem-gaming risk (Mazurek & Engelhardt 2013) |

## Core loop
1. **Choose** a blueprint/mission (he picks).
2. **Mission** (~8–12 min): fraction problems *are* building actions — bridge supports at 1/3 and 2/3 (horizontal number line), a window 3/4 up a wall (vertical line), filling gaps with slabs (equivalence), decimal lengths with block/slice/cubelet (tenths/hundredths). Every correct answer drops a material; every 3–5 a new block type.
3. **Build** (bounded): spend materials in his free-build plot. Optional block designer to paint his own textures.
4. **Save your build** ritual ends the session.

## Gameplay

### Session flow (~15–20 min)
1. **Camp** (home screen): Pip at the mine entrance, his world behind, and a board with 2–3 **blueprint cards** to choose from (e.g. Rope Bridge, Watchtower, Minecart Track).
2. **Blueprint mission** (~8–12 min): 8–10 **build steps**. Each step is one maths problem whose answer builds part of the structure — the bridge literally grows as he answers.
3. **Structure complete**: it's placed in his world, plus a new block/outfit unlock.
4. **Free build** (parent-set limit, default 10 min): spend earned materials in his world.
5. **"Save your build"** ritual ends the session.

### Step types (iPad: drag and tap only)
| Step | What he does | Skill |
|---|---|---|
| **Place** | Drag a support / torch / window along a bridge, wall or shaft to a fraction position. Ruler ticks fade as mastery grows. | Number line (core) |
| **Cut** | Tap saw marks to split a plank into equal parts; unequal cuts wobble and crumble. Then grab 3 of the 4 pieces. | Partitioning, unit → non-unit |
| **Fill** | A gap needs 3/4 of a block; drag 1/2, 1/4, 1/8 slabs from a tray to fill it exactly. Many right answers. | Equivalence, addition |
| **Compare** | Two tunnels: which goes deeper, 3/8 or 3/5? Tap one; both then appear on a shared line. | Comparison, bias-busting |
| **Name it** | A piece is already placed; pick (or build) the fraction that names it. | Reverse direction |
| **Dig** | Pip mines down a shaft to 5/4 depth (past the first "1" marker). | Fractions > 1 (biome 3+) |
| **Trade** | Villager prices in emeralds / shards / specks (1 = 10 = 100). | Decimals (biome 9) |

### Feedback
- **Correct**: piece snaps in with a thunk + particles; a material drops immediately (gem, ore, block).
- **Close enough counts**: placement within a tolerance (≈ 1/24 of the span at first, tightening with mastery); a **precision bonus** star for very close.
- **Wrong**: the piece goes where he put it and the structure shows the consequence (bridge sags at that spot), then the ruler zooms in showing his spot vs. the target with labels ("You built at about 1/2. 2/3 is here."). Retry immediately.
- **Rapid misses** (2–3 fast wrong): Pip says "Measure twice!" and shows one hint step.

### Rewards cadence
- Every correct step → a material (immediate).
- Every 3–5 steps → something new: a block type, outfit (Builder, Explorer…), or decoration.
- Effort stars for using the hint/check well, fixing a mistake, precision.
- Blueprint complete → the structure joins his world (the main, durable reward).

### Learning engine
- Per-skill mastery estimate (recent accuracy + speed + hint use). Steps are generated, not hand-written: the generator picks step type, denominator and scaffold level from the current skill.
- New biome unlocks on mastery; earlier skills are interleaved back in once basic fluency is reached.
- Biome intros are interactive: Pip demonstrates with steps he taps through ("Tap to cut this plank into 3 equal pieces").

### Optional speed mode: Minecart Rush
On mastered skills only: a minecart rolls along a track and he taps to switch rails at fraction positions. Beat-your-own-best time; no leaderboards, no penalty for slowness.

### First playable slice (proposed)
Camp with one blueprint (**Rope Bridge**), step types Place + Cut + Fill + Compare, biomes 1–2 content (denominators 2, 3, 4, 6, 8 on a 0–1 line), material rewards, mastery tracking in `shared/store.js`. Free build and other step types follow.

## Progression (biomes)
| # | Biome (working name) | Skill | Grade |
|---|---|---|---|
| 1 | Plains | Equal parts, unit fractions (2,3,4,6,8) | 3 |
| 2 | Mineshaft | Non-unit fractions on the 0–1 line | 3 |
| 3 | Deep Caves | Wholes & fractions > 1 (4/4 = 1, 5/4), 0–2/0–3 lines | 3 |
| 4 | Twin Tunnels | Same-numerator/denominator comparison; simple equivalents | 3 |
| 5 | Crafting Hall | Equivalence by multiplying; adds 5, 10, 12 | 4 |
| 6 | Mesa | Unlike comparison via benchmarks (0, ½, 1) | 4 |
| 7 | Forge | Like-denominator add/subtract; mixed numbers | 4 |
| 8 | Smelter | Whole number × fraction | 4 |
| 9 | Village | Tenths & hundredths as decimals; money; mixed fraction/decimal comparison | 4 |
| 10 | The End(ish) | Unlike-denominator add/subtract | 5 |

## Core mechanics (draft, superseded in part by Core loop above)
- **Dig**: drag the pickaxe down a vertical shaft to a fraction/decimal depth; ore is revealed at the true spot.
- **Split**: cut a block into equal slabs; unequal cuts crumble.
- **Compare**: two tunnels with different depths; pick the deeper one, then see both on a shared line.
- **Craft**: recipes need fractional amounts; combine slabs to fill a recipe slot (equivalence, addition).
- **Trade**: villagers price items in emeralds/shards/specks (1 = 10 = 100) for decimals.
- **Meta reward**: mined blocks go into his own build plot (sandbox) in the hub.

## Sources
See research summaries in conversation of 2026-10-12; key refs: Siegler et al. 2010 (IES/WWC guide 15), Siegler et al. 2011/2012,
Fuchs et al. 2013, Malone et al. 2019, Hamdan & Gunderson 2017, Nuraydin et al. 2022, Braithwaite & Siegler 2018,
Steinle & Stacey, Moss & Case 1999, Habgood & Ainsworth 2011, Wouters et al. 2013, Rohrer et al. 2020, Ramirez et al. 2013,
O'Rourke et al. 2014, Long & Aleven 2014. ADHD: Sonuga-Barke 2003, Jackson & MacKillop 2016, Tripp & Wickens 2008,
Luman et al. 2005, Metin et al. 2012, Lovett 2010, Kofler et al. 2010, Lee & Zentall 2002, Bioulac et al. 2012,
Powell & Nelson 1997, Mazurek & Engelhardt 2013, Kollins et al. 2020, Cortese et al. 2015. SPS: enVision adoption (seattleschools.org/departments/mathematics/math-adoption/).
