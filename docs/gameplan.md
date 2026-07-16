# Maple3D (working title)

## Pitch

MapleStory's grind-level-loot dopamine loop reborn in full 3D: chibi 3D characters and mobs on real 3D maps with depth and camera swings, gameplay still pure side-scrolling Maple — a shared world where you see other players hunting beside you from day one.

## Core gameplay loop

1. **Hunt** — side-scroll across a field map, throwing stars at cute mobs (assassin class).
2. **Level** — kills grant XP; the bar fills; level-up fires the classic flash + jingle and stat growth.
3. **Loot** — mobs drop currency, potions, throwing-star packs, and occasional gear; walk over + press loot key.
4. **Equip / restock** — return to town, buy potions/stars, equip better gear from drops.
5. **Push deeper** — the second field has tougher mobs, better XP/drops. Repeat.

Verbs: **hunt, throw, jump, climb, loot, level, equip**.

## Game rules

- Side-view 2.5D: movement is on a 2D plane (left/right, jump, ladders/ropes) laid through 3D map geometry; the camera swings/pans at map transitions and points of interest.
- Assassin v1 kit: basic star throw (short-mid range), single jump. (Double/flash jump, skills/skill tree = backlog #4 — classic assassins jump once; single-jump apex ~2.5u, higher tiers use ladders/ropes.)
- Air momentum is committed (per the official MSW RigidbodyComponent model): jumps carry run momentum with no air drag; midair input gives only subtle steering (AIR_ACCEL, far below ground accel) and flips facing instantly — this is the assassin kite (jump away, throw backward at the chaser). Landing plants the feet: no direction held → momentum dies on touchdown; direction held → the run carries through.
- Down jump (MSW DownJump): Down+Alt on a thin platform drops through it to whatever is below. Down on the ground is crouch/prone (movement blocked; jump does nothing while prone on the floor).
- Ladders/ropes (MSW ActionClimb/ActionJump): jump alone stays on the climbable; jump + a held direction leaps off sideways. Grabs are direction-aware (Up grabs only with ladder above you, Down only with ladder below). Climbing off the top pops you onto the ledge standing; the bottom stands you on the surface beneath, or drops you if the rope hangs over a gap. Climbables are typed ladder|rope for animation.
- Attacking while grounded is stand-and-throw (MSW ATTACK state): the run is rooted for the throw interval (~720ms — the authentic Fast (4) claw cast time in MapleStory Classic; 600ms only with a Booster skill, backlog); air throws stay free (the kite).
- **Throwing stars are consumable ammo** (core assassin mechanic): each attack spends one equipped star; you start with 100, refill via star-pack drops (+50) and the shop (+50 for STARPACK_PRICE mesos), cap 800 (Ilbi-tier); with zero stars you cannot throw. HUD shows the count. (Per-star-type attack boost = deferred; one star kind in v1.)
- Getting touched by a mob knocks the player back (MSW HitEvent feedback): a small pop away from the mob, plus 1s of i-frames (MSW built-in PlayerHit ImmuneCooldown).
- The sim exposes a named state machine (MSW StateComponent): idle/move/crouch/jump/fall/ladder/rope — the animation contract for ADR-0002's model sets.
- Full official-model mapping: docs/reference/msw-parity.md.
- Star throws use the classic MS target-lock model: pressing attack locks the nearest mob whose center sits inside the forward attack box; the star homes to the lock and cannot miss; if the lock dies mid-flight the star fizzles; a throw with no target is a whiff that hits nothing (even mobs that walk into its path). The attack box is centered on the **player's body** (~one character tall), so it rises with a jump: a mob straight above on a platform is out of reach from the ground (no "vertical attack"), but a jump-attack that brings you to a mob's level connects. Platform mobs → jump or climb to their level, then throw.
- Mobs have simple patrol/aggro AI, HP bars, floating damage numbers, death pop + drop spill.
- Player HP/MP; mob contact damage; death = respawn in town with small XP penalty (Maple-honest but forgiving; exact % tuned in playtests).
- XP curve levels 1–~15 in v1; stats grow per level; damage scales with level + equipped weapon tier.
- Drops despawn after a timer; drops are per-player (no loot stealing) in v1.
- Saves: character (level, XP, inventory, gear, position) in localStorage. Server never stores characters in v1.
- Shared world: everyone on a map is in one PartyKit room — you see other players moving/hunting with name tags and chat bubbles. **Mob state is server-owned** (spawns, HP, deaths) so shared hunting looks coherent; player characters are client-owned.

## Win / lose conditions

None — open-ended MMO-style progression. A session ends when you decide to stop; the pull is the next level / next gear tier. Typical session 20–60 min.

## Art style

**Chibi low-poly 3D** (MapleStory 2 direction): fully 3D-modeled, rigged, and animated characters, mobs, and NPCs on low-poly 3D map geometry (terrain, platforms, trees, buildings). Bright pastel Maple palette — grassy greens, warm town wood, big sky; toon/flat shading. Asset pipeline (ADR-0002): **primitive-built chibi placeholders during development** (capsule+sphere characters, animated in code), swapped for **Meshy AI-generated GLB models** (text→model, auto-rig, auto-animate) once gameplay is proven. Required animation sets — player: idle/run/jump/climb/throw; mobs: walk/hurt/die.

## Audio direction

Suno-generated BGM in the MapleStory idiom — whimsical, loopable town theme + brighter field theme. SFX: star throw/hit, mob pop, loot pickup, level-up jingle (the important one), UI clicks. Non-diegetic music, diegetic SFX.

## Player goals

- **Per session:** level up, fill out gear, clear to the next field.
- **Long term:** reach the v1 cap with best gear; v2+ adds quests, more classes/maps, bosses, trading.

## Anti-goals

- **No PvP** — players can never damage each other. (Explicitly confirmed.)
- **No mobile/touch** — desktop keyboard browser only. (Explicitly confirmed.)
- Not anti-goals, just deferred (backlog): quests/story, player trading/economy, more classes, bosses.

## V1 scope ceiling (vertical slice)

One hub town (shop NPC for potions/stars, spawn point) + two connected hunting fields + **3 mob types** of rising difficulty; assassin kit (throw + single jump); levels 1–~15 with gear drops; localStorage saves; shared-world presence + server-owned mobs + chat bubbles; 2 Suno tracks + core SFX; classic Maple controls (arrows, Alt jump, Ctrl attack, Z loot [hold to vacuum], C potion — rebindable later, backlog).

## References

- **Official MapleStory Worlds movement docs** — movement model source of truth: [Understanding MapleStory Movement Concepts](https://maplestoryworlds-creators.nexon.com/en/docs?postId=750) (foothold rules) and [RigidbodyComponent API](https://maplestoryworlds-creators.nexon.com/en/apiReference?postId=378) (WalkAcceleration/WalkDrag/AirAccelerationX/AirDecelerationX/JumpBias/DownJump/FallSpeedMax). Our constants map onto these knobs.
- *MapleStory* (the loop, the feel, the level-up moment, control scheme)
- *MapleStory 2* (the chibi-3D look; also a cautionary reference — keep the 2D gameplay, take only the art direction)
- *Klonoa / Kirby's Return to Dream Land* (2.5D done right: 3D characters, strictly side-view play)
- game-creator architecture pattern (EventBus/GameState/Constants)

## Open questions

- **Final title + naming:** everything ships with original-flavored names (mobs, town, currency) — this is a fan-inspired homage, not MapleStory (Nexon IP). Never monetizable with Maple assets/names.
- Death XP penalty %, drop rates, XP curve — tune in playtests.
- Whether v1 mob AI needs ranged attackers for field 2 mob #3, or all melee.
- Ladder/rope density per map — traversal feel needs playtesting.
