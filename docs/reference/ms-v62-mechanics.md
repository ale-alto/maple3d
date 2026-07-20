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
- HP/MP per level (VERIFIED via open-source emulator levelUp(), matching
  LazyBui-era lore; uniform random inclusive):
  - Beginner: HP +12–16, MP +10–12
  - Thief (Rogue/Assassin/Hermit): HP +20–24, MP +14–16
  - ALL classes additionally: MP += floor(total INT / 10)
  - Level-up also grants +5 AP; +3 SP (SP only once job-advanced)
  - Job advancement one-time roll (emulator changeJob + meowdb agree):
    Thief +200–250 HP/MP — apply at Rogue advancement
- New character stat roll: 4 dice, each stat 4–13, total always 25
  (players rerolled for STR 4 / INT 4; a stat reset equals 4/4/4/4 + 9 AP).
  Implementation: auto-roll the classic thief roll — STR 4, INT 4,
  DEX+LUK = 17 split by the dice.
- Base mastery with no mastery skill: **10%** (0.1 in the min-damage term).
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

## 7. Rogue 1st-job skill set (bbb tables, read 2026-07-20)

- **Job advancement**: Beginner → Rogue at level 10 (DEX 25 requirement,
  classic). One-time bonus roll (emulator changeJob, first-job case):
  **HP +100–150, MP +25–50**, plus **+1 SP**. Beginners earn NO SP
  (levels 1–9); +3 SP per level once job-advanced. 2nd-job advancement
  (Assassin) rolls +200–250 — for M15.
- **Nimble Body** (passive, master 20): accuracy +lv, avoid +lv.
- **Keen Eyes** (passive, master 8, prereq Nimble Body 3): throwing
  range +25 px per level (max +200). Unit conversion: our base star
  range 7 units ≡ the ~400 px classic throw range → 1 unit = 57.14 px,
  so +25 px = +0.4375 units/level (presentation conversion, not a
  mechanic guess).
- **Disorder** (supportive, master 20): MP 5,5,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10;
  enemy weapon attack AND weapon def −lv; duration (s):
  7,9,11,13,15,20,22,24,29,31,33,38,40,42,47,49,51,56,58,60.
  Cannot reapply while the target is already disordered.
- **Dark Sight** (supportive, master 20, prereq Disorder 3): MP = 25 − lv;
  duration = 10·lv seconds; speed penalty −30,−28,…,−8 (levels 1–12
  = 32−2lv) then −7…−1 (13–19 = 20−lv), 0 at 20. Hidden: enemies
  don't attack/aggro you, you can't attack; other movement free.
- **Double Stab** is the dagger line — omitted until daggers exist
  (documented deviation; assassins never used it).
- Assassin 2nd job (M15, tables to fetch): Claw Mastery, Claw Booster,
  Haste, Drain, Critical Throw.

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

## 9. Items (bbb equipment pages + meowdb item-db, read 2026-07-20)

Our item NAMES stay original (skin is ours); the numbers below are the
documented values our tiers map onto.

- **Claw ladder** (WA, level req, stat reqs, shop buy price):
  - Lv 10: WA 10, roll range 8–12, speed Normal(6), buy 3,000 (the shop
    starter); Lv-10 alternates WA 12 (DEX 25/LUK 25) and WA 14, Fast(4)
  - Lv 15: WA 12, roll 12–15, Fast, DEX 30/LUK 35, buy 20,000
  - Lv 20: WA 14, roll 13–16, Fast, DEX 40/LUK 50, buy 30,000
  - Lv 25: WA 16, roll 14–19, Faster(3), DEX 50/LUK 65, buy 60,000
  - Lv 30: WA 18, roll 17–21, Fast, DEX 60/LUK 80, buy 250,000
- **Throwing stars** (WA ladder): 15, 17, 19, 21, 23, 25 (knives), 27
  (top tier; one aggregator lists 29 — meowdb's item db says W.ATK+27,
  adopted). Top tier: 800 per slot, recharge 0.9 mesos/star. Basic tier:
  recharge 0.3/star (cheapest); slot cap 500 UNVERIFIED (classic lore) —
  flag in code. Stars are equipment: total WA = claw WA + star WA; no
  claw equipped = star WA only.
- **Potions** (heal, NPC buy price — sell is half, pattern verified on
  Red 25/50, Blue 100/200, Mana Elixir 310/620):
  - Red Potion: 50 HP, buy 50 · Orange: 150 HP, buy 160 (sell 80
    verified) · White: 300 HP, buy 320 (sell 160 verified)
  - Blue Potion: 100 MP, buy 200 · Mana Elixir: 300 MP, buy 620
  - Slot cap 100 for all of the above.

## 10. Assassin 2nd-job kit (bbb class page, read 2026-07-20)

- **Advancement**: level 30 (the marble-collection quest is omitted —
  documented deviation; our trainer advances directly). Pool roll
  (emulator 2nd-job thief case): HP +200–250, MP +150–200; +1 SP.
- **Claw Mastery** (passive, master 20): mastery% = 10 + 5·ceil(lv/2)
  (15% at 1–2 … 60% at 19–20); accuracy +lv; star slot cap +10·lv.
- **Critical Throw** (passive, master 30, prereq CM 3): crit chance
  (20+lv)%, crit damage (110+3·lv)% per star.
- **Endure** (passive, master 20): on ropes/ladders only — extra
  HP +(20+4·lv), MP +2·lv every (30−lv) seconds.
- **Claw Booster** (supportive, master 20, prereq CM 5): costs
  (30−lv) HP AND MP; claw attack speed +2 stages for 10·lv seconds
  (Fast(4) 720 ms → Faster(2) ≈ 600 ms per the classic delay table).
- **Haste** (supportive, master 20): MP 15 (lv ≤10) / 30 (11+);
  Speed +2·lv, Jump +lv for 10·lv s (speed/jump are the 100-base
  stats — we map speed% onto run speed and jump% onto jump velocity;
  party-wide in the real game, self-only for now — deviation noted).
- **Drain** (attack, master 30, prereq Endure 3): MP 12; one star at
  (100+2·lv)% damage, absorbing (15+lv)% of damage dealt as HP,
  capped at maxHp/2 per hit and the target's maxHp.

## 11. Hermit 3rd-job kit (bbb class page, read 2026-07-20)

- **Advancement**: level 70 (the two-part El Nath quest chain is omitted —
  deviation; trainer advances directly). Pool roll: VERIFY 3rd-job thief
  case in emulator changeJob before implementing.
- **Flash Jump**: table already in §6 (master 20, MP 60→13, prereq
  Avenger 5) — this is where it RETURNS to our game.
- **Avenger** (active, master 30): MP 16 (lv ≤10) / 23 (11–20; 21+
  VERIFY, likely 30); consumes 3 stars; one huge star that pierces —
  hits up to 4 enemies (≤10), 5 (11–20); basic attack % by level:
  65,70,75,80,85,90,90,100,105,110 then +4/level (114,118,122,126 …
  verified through 14; 15–30 follow the +4 pattern — VERIFY tail).
- **Alchemist** (passive, master 20): potion recovery ×(100+3·lv)% up to
  10, then +2/lv to 150% at 20 (fixed-amount potions only).
- **Meso UP** (supportive, master 20): party meso drop rate +3·lv% (≤10)
  then +2/lv to +50%; MP 45/50/55/60 by five-level band; duration
  20+5·lv s.
- **Shadow Partner** (supportive, master 30): a shadow echoes each
  attack at 20–80% (normal) / 21–50% (skill) damage; MP 200−5·lv
  (roughly); duration 60 s (≤10), 120 s (11–20), 180 s (21–30);
  requires a summoning item in the real game (deviation: skip item).
- **Shadow Web** (supportive, master 20): roots up to 6 enemies,
  (40+2·lv)% success, 5–8 s by five-level band; MP 10/14/18/22.
- **Shadow Meso** (active, master 30, prereq Meso UP 5): throws mesos as
  damage — skip for now (our economy is too small; deviation noted).

## Sources

- bbb.hidden-street.net (BeforeBigBang library) — L7 + FJ tables read 2026-07-19 (browser pane; 403s server fetches)
- ayumilove formula compilation (2009) — damage/acc/EXP/MP-regen formulas
- meowdb.com/msclassic — Classic World remake data (secondary source only)
