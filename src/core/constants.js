// All magic numbers live here (tech.md convention).
// Units: world units (~1u = 1m), y-up, x-right. Time in seconds inside the sim.

// --- Colors (bright Maple palette) ---
export const SKY_COLOR = 0x8ecdf0;
export const GROUND_COLOR = 0x7fc95a;
export const PLATFORM_COLOR = 0x9b7653;
export const LADDER_COLOR = 0x6e4f2f;
export const PLAYER_BODY_COLOR = 0x4d5a91; // assassin garb blue
export const PLAYER_HEAD_COLOR = 0xffd9b3;

// --- Camera ---
export const CAMERA_FOV = 50;
export const CAMERA_Z = 14; // side-view distance from the play plane
export const CAMERA_HEIGHT = 3;
export const CAMERA_LERP = 8; // per-second follow strength
export const CAMERA_Y_FACTOR = 0.6; // how much the camera rides player height

// --- Sim loop ---
export const FIXED_STEP_MS = 1000 / 60;

// --- Player movement (Maple-feel first pass; tune in playtests) ---
export const RUN_SPEED = 6;
export const RUN_ACCEL = 40;
export const GROUND_FRICTION = 25; // decel when no input -> slight slide
// MSW RigidbodyComponent model: AirAccelerationX (subtle midair steering,
// far weaker than ground accel) with AirDecelerationX = 0 (momentum is
// never dragged down in air — the kite stays committed).
export const AIR_ACCEL = 6;
// Tuned 2026-07-13 (playtest "too floaty"): higher gravity, scaled jump.
// 2026-07-14: double jump removed (not authentic — classic assassins jump
// once; flash jump is a skill, backlog #4). JUMP_VELOCITY raised so a
// single jump apex ~2.5u clears the low platforms double jump used to.
export const GRAVITY = 45;
export const MAX_FALL_SPEED = 20;
export const JUMP_VELOCITY = 15;
export const MAX_JUMPS = 1; // no double jump
export const CLIMB_SPEED = 3;
export const LADDER_GRAB_RANGE = 0.5; // horizontal reach to grab a ladder
// MSW ActionJump(horizontalInput) off a climbable: modest sideways leap.
export const LADDER_JUMP_VX = 4;
export const LADDER_JUMP_VY = 6;
// MSW ATTACK state: grounded attacks root you for the throw. Lock == the
// throw interval so holding attack keeps you planted (classic MS). 720ms =
// authentic Fast (4) claw cast time (MapleStory Classic; 600ms w/ Booster).
export const ATTACK_LOCK_MS = 720;
// MSW HitEvent FeedbackAction: pop away from the mob on contact.
export const KNOCKBACK_VX = 5;
export const KNOCKBACK_VY = 4;

// --- Combat (M02 first pass; tune in playtests) ---
export const PLAYER_MAX_HP = 50;
export const PLAYER_WIDTH = 0.7; // AABB for contact damage
export const PLAYER_HEIGHT = 1.5;
export const INVULN_MS = 1000; // i-frames after taking a hit
export const STAR_DAMAGE = 8;
export const STAR_SPEED = 14;
export const STAR_RANGE = 7;
// Classic MS attack model: target LOCKED at press time — nearest mob whose
// center sits inside the forward attack box. The box is centered on the
// PLAYER'S BODY (moves up with jumps) and is ~one character tall, so a mob
// straight above (platform) is out of reach while a jump-attack that brings
// you to a mob's level connects. The star homes to the lock; no lock = whiff.
export const STAR_SELECT_HALF_HEIGHT = 1.1; // box half-height around player center
export const STAR_THROW_HEIGHT = 1.0; // star spawn height above player feet
export const ATTACK_COOLDOWN_MS = 720; // authentic Fast (4) claw cast time (MapleStory Classic)
// Throwing stars are consumable ammo (core assassin mechanic): each attack
// spends one; refill via star-pack drops and the shop; empty = can't throw.
export const STARTING_STARS = 100;
export const STARPACK_SIZE = 50; // stars per loot-drop bundle (M14: refills toward the type cap)
export const MOB_MAX_HP = 40; // M03 rebalance: 5 base hits (was 60/8-hit, playtest "tanky")
export const MOB_SPEED = 1.2;
export const MOB_AGGRO_SPEED = 2.2;
export const MOB_AGGRO_RADIUS = 4;
export const MOB_CONTACT_DAMAGE = 10;
export const MOB_WIDTH = 0.9;
export const MOB_HEIGHT = 0.9;
export const MOB_RESPAWN_MS = 5000;

// --- Colors (M02) ---
export const MOB_COLOR = 0x8fd14f; // green blob tier
export const STAR_COLOR = 0xd8dee6;
export const DAMAGE_NUMBER_MS = 800; // damage number lifetime

// --- Progression (M03; curve/penalty playtest-tuned per gameplan) ---
export const XP_PER_MOB = 8;
export const XP_BASE = 20; // xp to go from level 1 -> 2
export const XP_GROWTH = 1.4; // per-level multiplier
export const LEVEL_CAP = 70; // M15: room for the Assassin era (Hermit gate at 70)
export const DEATH_XP_PENALTY = 0.05; // fraction of xpToNext lost on death
export const HP_PER_LEVEL = 5;
export const DAMAGE_PER_LEVEL = 1; // star damage bonus per level above 1
// (POTION_HEAL retired in M14 — Red Potion heals RED_POTION_HEAL.)
export const POTION_KEY = 'c';
export const STARTING_POTIONS = 3; // new-character kit

// --- Mob types (M05): the v1 roster of rising difficulty. Blob mirrors
// the original M02 flat constants; spitter is the ranged one (slow,
// jumpable projectile, fires on its own level only). Original designs —
// IP-safe names (gameplan). ---
export const MOB_TYPES = {
  blob: {
    maxHp: 40,
    speed: 1.2,
    aggroSpeed: 2.2,
    contactDamage: 10,
    xp: 8,
    mesosMin: 5,
    mesosMax: 14,
    potionChance: 0.3,
    starPackChance: 0.15,
    gearChance: 0.03,
    gearTierMax: 1,
    level: 2, // our mobs, our stats — the HIT FORMULA is the sourced part
    avoid: 1,
    color: 0x8fd14f,
    scale: 1,
  },
  bruiser: {
    maxHp: 70,
    speed: 1.0,
    aggroSpeed: 2.6,
    contactDamage: 16,
    xp: 16,
    mesosMin: 12,
    mesosMax: 24,
    potionChance: 0.35,
    starPackChance: 0.2,
    gearChance: 0.045,
    gearTierMax: 2,
    level: 5,
    avoid: 1.3,
    color: 0x5f8dff,
    scale: 1.25,
  },
  spitter: {
    maxHp: 55,
    speed: 1.4,
    aggroSpeed: 1.4,
    contactDamage: 12,
    xp: 22,
    mesosMin: 16,
    mesosMax: 30,
    potionChance: 0.4,
    starPackChance: 0.25,
    gearChance: 0.06,
    gearTierMax: 3,
    level: 8,
    avoid: 4, // hard to hit under-leveled — classic accuracy gating
    color: 0xb968ff,
    scale: 1.1,
    ranged: { projectileSpeed: 6, cooldownMs: 2200, range: 6, damage: 8 },
  },
};

// --- Gear (M10; M14 real ladder — reference §9) --- Our names, the
// documented numbers: claw WA rolls inside the real ranges, level reqs
// and prices from the ladder. Armor stays our-design (real armor tables
// arrive with the defense-formula pass).
export const GEAR_TIERS = {
  weapon: [
    { id: 'claw1', name: 'Bronze Claw', tier: 1, wa: 10, roll: [8, 12], levelReq: 10, price: 3000 },
    { id: 'claw2', name: 'Steel Claw', tier: 2, wa: 12, roll: [12, 15], levelReq: 15, price: 20000 },
    { id: 'claw3', name: 'Dark Claw', tier: 3, wa: 14, roll: [13, 16], levelReq: 20, price: 30000 },
  ],
  armor: [
    { id: 'garb1', name: 'Cloth Garb', tier: 1, defense: 2, roll: 2 },
    { id: 'garb2', name: 'Leather Garb', tier: 2, defense: 4, roll: 3 },
    { id: 'garb3', name: 'Shadow Garb', tier: 3, defense: 7, roll: 4 },
  ],
};

// --- Throwing stars (M14, reference §9): typed, rechargeable equipment.
// Total WA = claw WA + star WA; no claw = star WA only (beginners).
// Basic-tier slot cap 500 is classic lore, UNVERIFIED (top tier's 800
// and both recharge prices are documented).
export const STAR_TYPES = {
  steel: { name: 'Steel Star', wa: 15, cap: 500, rechargePerStar: 0.3 },
  moon: { name: 'Moon Star', wa: 27, cap: 800, rechargePerStar: 0.9 },
};

// --- Potions (M14, reference §9): the real shelf, v1 slice.
export const RED_POTION_HEAL = 50;
export const RED_POTION_PRICE = 50;
export const BLUE_POTION_MP = 100;
export const BLUE_POTION_PRICE = 200;
export const BAG_MAX = 24;
// (STARTER_CLAW_PRICE retired in M14 — claw prices live on GEAR_TIERS.)

// --- Skills (M11, M12: real pre-BB tables — ms-v62-mechanics.md §5) ---
// +3 SP per level-up, 1 SP per skill level. Lucky Seven: bbb table,
// master 20, per-star % of the LUK×5 basis. Flash Jump keeps interim
// values until M13 moves it to its authentic Hermit slot.
export const SP_PER_LEVEL = 3;
// M13: the real Rogue kit (reference §5/§7). Flash Jump left the early
// game — it returns as the Hermit skill it always was (M15+).
export const SKILLS = {
  nimbleBody: {
    name: 'Nimble Body',
    maxLevel: 20,
    passive: true,
    desc: 'Passive: accuracy and avoid +level',
  },
  keenEyes: {
    name: 'Keen Eyes',
    maxLevel: 8,
    passive: true,
    prereq: ['nimbleBody', 3],
    desc: 'Passive: throwing range +level',
  },
  disorder: {
    name: 'Disorder',
    maxLevel: 20,
    mpCost: [5, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10],
    durationSec: [7, 9, 11, 13, 15, 20, 22, 24, 29, 31, 33, 38, 40, 42, 47, 49, 51, 56, 58, 60],
    desc: 'Weaken a mob: attack/def −level (D)',
  },
  darkSight: {
    name: 'Dark Sight',
    maxLevel: 20,
    prereq: ['disorder', 3],
    // MP = 25 − level; duration = 10·level s; speed −30…0 per the table.
    speedPenalty: [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    desc: 'Hide in shadow: untouchable, no attacking (V)',
  },
  luckySeven: {
    name: 'Lucky Seven',
    maxLevel: 20,
    mpCost: [8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16],
    pct: [58, 62, 66, 70, 76, 80, 84, 90, 94, 100, 104, 110, 114, 120, 124, 130, 134, 140, 144, 150],
    desc: 'Throw 2 stars at the locked target (Shift)',
  },
  // --- Assassin 2nd job (M15, reference §10) ---
  clawMastery: {
    name: 'Claw Mastery',
    maxLevel: 20,
    passive: true,
    job: 'assassin',
    desc: 'Passive: star mastery, accuracy, bigger star slots',
  },
  criticalThrow: {
    name: 'Critical Throw',
    maxLevel: 30,
    passive: true,
    job: 'assassin',
    prereq: ['clawMastery', 3],
    desc: 'Passive: stars can critically strike',
  },
  endure: {
    name: 'Endure',
    maxLevel: 20,
    passive: true,
    job: 'assassin',
    desc: 'Passive: recover HP/MP on ropes and ladders',
  },
  clawBooster: {
    name: 'Claw Booster',
    maxLevel: 20,
    job: 'assassin',
    prereq: ['clawMastery', 5],
    desc: 'Throw faster for a while — costs HP and MP (B)',
  },
  haste: {
    name: 'Haste',
    maxLevel: 20,
    job: 'assassin',
    desc: 'Move and jump like the wind (H)',
  },
  drain: {
    name: 'Drain',
    maxLevel: 30,
    mpCost: 12,
    job: 'assassin',
    prereq: ['endure', 3],
    desc: 'A vampiric star: absorb damage as HP (A)',
  },
};
// Keen Eyes px→world-unit conversion: base range 7u ≡ ~400 px classic
// throw range → +25 px/level = +0.4375 u/level (presentation mapping).
export const KEEN_EYES_UNIT_PER_LEVEL = 0.4375;

// Job advancement (reference §7/§10): Rogue at 10 (DEX 25), Assassin at
// 30; one-time pool rolls + 1 SP (+3/level catch-up if advancing late).
export const JOB_ADV_LEVEL = 10;
export const JOB_ADV_DEX = 25;
export const JOB_ADV_HP = [100, 150];
export const JOB_ADV_MP = [25, 50];
export const JOB2_ADV_LEVEL = 30;
export const JOB2_ADV_HP = [200, 250];
export const JOB2_ADV_MP = [150, 200];
// Claw Booster: attack speed +2 stages — Fast(4) 720ms → Faster(2) 600ms.
export const BOOSTED_COOLDOWN_MS = 600;

// --- Character sheet (M12, all sourced — ms-v62-mechanics.md §1–4) ---
export const AP_PER_LEVEL = 5;
export const BASE_MASTERY = 0.1; // unskilled mastery (Claw Mastery is M15)
// (BASE_WA retired in M14 — WA comes from claw + star equipment, §9.)
export const PLAYER_START_HP = 50; // level-1 beginner pools
export const PLAYER_START_MP = 5;
export const MP_REGEN_AMOUNT = 3; // base recovery: 3 MP per 10 s standing
export const MP_REGEN_INTERVAL_MS = 10000;
export const STAT_ROLL_SEED = 20260719; // deterministic dice for fresh boots

// --- Models (M08, KayKit CC0 packs) ---
// Side-view yaw: ±(90° − tilt) so characters face their run direction
// with a slight turn toward the camera (Maple 3/4 charm).
export const MODEL_YAW_TILT = 0.35;
export const MODEL_DEFS = {
  player: {
    file: '/models/player.glb', // KayKit Rogue_Hooded
    height: 1.5,
    clips: {
      idle: 'Idle',
      move: 'Running_A',
      jump: 'Jump_Idle',
      fall: 'Jump_Idle',
      crouch: 'Lie_Idle',
      ladder: 'Idle', // no climb clip in the pack; idle + facing-away reads fine
      rope: 'Idle',
      throw: 'Throw',
    },
  },
  npc: {
    file: '/models/npc_shop.glb', // KayKit Mage — Shopkeeper Nara
    height: 1.6,
    clips: { idle: 'Idle' },
  },
  blob: {
    file: '/models/mob_blob.glb', // Skeleton_Minion
    height: 1.0,
    clips: { patrol: 'Walking_D_Skeletons', aggro: 'Running_A', die: 'Death_A' },
  },
  bruiser: {
    file: '/models/mob_bruiser.glb', // Skeleton_Warrior
    height: 1.3,
    clips: { patrol: 'Walking_D_Skeletons', aggro: 'Running_A', die: 'Death_A' },
  },
  spitter: {
    file: '/models/mob_spitter.glb', // Skeleton_Mage
    height: 1.15,
    clips: { patrol: 'Walking_D_Skeletons', aggro: 'Running_A', die: 'Death_A' },
  },
};

// --- Audio (M07) ---
export const AUDIO_MASTER_VOL = 0.8;
export const AUDIO_BGM_VOL = 0.35;
export const AUDIO_SFX_VOL = 0.6;
export const SFX_LOG_SIZE = 24; // dispatch ring buffer for verification
export const MUTE_KEY = 'm';

// --- Maps / town / shop (M04) ---
export const PORTAL_RANGE = 0.9; // Up within this of a portal transitions
export const NPC_RANGE = 1.1; // Up within this of an NPC interacts
export const CAMERA_SWING_MS = 500; // eased settle on map entry
export const CAMERA_SWING_ZOOM = 6; // extra camera Z at swing start
// (POTION_PRICE/STARPACK_PRICE retired in M14 — real shelf in §9 block.)
export const PORTAL_COLOR = 0x66c6ff;
export const NPC_COLOR = 0xc98a4b;

// --- Loot (M03) ---
export const DROP_DESPAWN_MS = 15000;
export const PICKUP_RANGE = 0.9;
export const MESOS_MIN = 5;
export const MESOS_MAX = 14;
export const POTION_DROP_CHANCE = 0.3;
export const STARPACK_DROP_CHANCE = 0.15;
export const LOOT_SEED = 1337; // seeded rng: deterministic for tests, server-owned later
