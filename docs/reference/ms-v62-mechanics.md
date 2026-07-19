# Pre-Big-Bang MapleStory mechanics — sourced data (no guesswork)

> Directive (user, 2026-07-19): recreate real MapleStory mechanics 1:1 from
> documentation; only the art/models are ours. Every number implemented in
> the sim must trace to a row in this file. If a value isn't here, RESEARCH
> IT FIRST (bbb.hidden-street.net via browser pane — blocks server fetches;
> ayumilove formula compilation; meowdb.com/msclassic) — never invent.
>
> Canonical target: **v62-era / pre-Big-Bang GMS** (bbb.hidden-street.net).
> meowdb "MapleStory Classic World" covers Nexon's 2026 remake — close but
> not identical; use only when pre-BB data can't be found, and mark it.

## 1. Damage core (pre-BB, ayumilove formula compilation)

- Basic claw/star attack (thief):
  - MAX = (LUK × 3.6 + STR + DEX) × WA / 100
  - MIN = (LUK × 3.6 × 0.9 × mastery + STR + DEX) × WA / 100
  - WA = total weapon attack (claw WA + throwing-star WA stack — verify star WA values per star type before implementing items)
  - mastery = claw mastery skill percentage (2nd-job Assassin skill; base mastery without it — VERIFY exact base, commonly 10%)
- **Lucky Seven** (ignores mastery entirely, its own basis):
  - per-star MAX = LUK × 5.0 × WA / 100 × skill%
  - per-star MIN = LUK × 2.5 × WA / 100 × skill%
- Each attack rolls uniformly between MIN and MAX (per star).
- Damage cap era-appropriate: 99,999 (not reachable at our levels).

## 2. Accuracy / avoid (pre-BB)

- Thief accuracy = DEX × 0.6 + LUK × 0.3
- Thief avoid = DEX × 0.25 + LUK × 0.5
- Chance to hit = ACC / ((1.84 + 0.07 × D) × mob avoid) − 1, where D =
  max(0, mobLevel − charLevel). Misses show "MISS".

## 3. Character sheet (pre-BB)

- Stats: STR / DEX / INT / LUK. New character starts with dice-rolled
  stats (VERIFY exact roll rules; commonly total fixed, 4 min per stat).
- **+5 AP per level** (player allocates manually — the assassin puts LUK
  primary, keeps DEX at the gear/hit requirement).
- **+3 SP per level**, +1 bonus SP at each job advancement. SP is only
  usable within the current job's skill set.
- Jobs: Beginner → **Rogue at level 10** (at the Thief instructor; stat
  requirement VERIFY — commonly DEX 25) → **Assassin at 30** → **Hermit
  at 70** → Night Lord at 120.
- HP/MP per level:
  - Pre-BB original: random per-level ranges per class (LazyBui's guide —
    NOT yet verified this session; VERIFY before implementing).
  - MS Classic World remake (meowdb, closed-test data, may change):
    class-fixed, Beginner +16 HP/+12 MP, Thief +22 HP/+17 MP; job
    advancement one-time roll: Thief +200–250 HP, +200–250 MP.
- MP recovery: base **3 MP per 10 seconds** standing (pre-BB; faster while
  sitting on chairs — n/a for us).

## 4. EXP to next level (pre-BB, exact)

- Level 1–2: exptnl = 2·lvl² + 13·lvl
- Level 3–5: exptnl = 4·lvl² + 7·lvl
- Level 6–50: lvl divisible by 3 → (lvl⁴ + 57·lvl²)/9, else (lvl⁴ + 55·lvl² − 56)/9
- Level 51+: exptnl(lvl) = floor(1.0548 × exptnl(lvl−1))
- Spot checks: L1→2 = 15, L2→3 = 34, L10→11 = (10⁴+57·100)/9 = 1745? — verify
  a few table rows against bbb's EXP chart when wiring the curve.

## 5. Lucky Seven — full table (bbb.hidden-street, Rogue, master 20)

Per level 1–20: MP cost / damage% (× 2 stars):
8/58, 8/62, 8/66, 8/70, 9/76, 9/80, 9/84, 10/90, 10/94, 11/100,
11/104, 12/110, 12/114, 13/120, 13/124, 14/130, 14/134, 15/140, 15/144, 16/150

## 6. Flash Jump — full table (bbb.hidden-street, **Hermit**, master 20)

- Prerequisite: Avenger level 5. 3rd job — level 70+ in the real game.
- MP cost by level 1–20: 60, 57, 54, 51, 48, 45, 42, 39, 36, 33,
  31, 29, 27, 25, 23, 21, 19, 17, 15, 13
- Distance grows with level ("jumps a certain distance" — distance values
  are not documented numerically; tune to feel, this is presentation).

## 7. Rogue 1st-job skill set (for the jobs milestone — tables TO FETCH)

Nimble Body (passive acc/avoid), Keen Eyes (star range), Disorder,
Dark Sight, Double Stab (dagger), Lucky Seven. Assassin 2nd job: Claw
Mastery, Claw Booster, Haste, Drain, Critical Throw. Fetch each table
from bbb before implementing.

## 8. Known gaps: current sim vs this spec

| System | Ours today | Real (this doc) |
|---|---|---|
| Stats | none (flat STAR_DAMAGE 8 + 1/level) | STR/DEX/INT/LUK + 5 AP/level, damage from LUK×WA formulas |
| Damage roll | fixed value | uniform MIN–MAX per star; L7 own basis; mastery |
| Accuracy | always hits | ACC/avoid + MISS |
| XP curve | XP_BASE × 1.35^lvl | exact piecewise table (§4) |
| SP | 3/level from L2 | 3/level (+1 at advancement); job-gated skills |
| L7 | 5 levels, 0.7–1.0×, MP 8 | 20 levels, 58%–150%, MP 8–16 |
| Flash Jump | 1st-job-ish, MP 13–9, vx 9 | Hermit (L70+), MP 60→13 |
| MP regen | 1.5/s continuous | 3 per 10 s |
| Jobs | none | Beginner → Rogue@10 → Assassin@30 → Hermit@70 |
| HP/MP growth | HP_PER_LEVEL flat, MP 30+5/lvl | per-class ranges (verify LazyBui) |
| Potions | 20 HP generic | real item values (Red 50, Orange 150 … verify table) |
| Star ammo | generic stars | per-star-type WA (Subi etc. — verify) |

## Sources

- bbb.hidden-street.net (BeforeBigBang library) — L7 + FJ tables read 2026-07-19 (browser pane; 403s server fetches)
- ayumilove formula compilation (2009) — damage/acc/EXP/MP-regen formulas
- meowdb.com/msclassic — Classic World remake data (secondary source only)
