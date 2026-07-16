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
export const STARPACK_SIZE = 50; // stars per pack (drop or purchase)
export const STAR_MAX = 800; // equipped stack cap (Ilbi-tier)
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
export const LEVEL_CAP = 15;
export const DEATH_XP_PENALTY = 0.05; // fraction of xpToNext lost on death
export const HP_PER_LEVEL = 5;
export const DAMAGE_PER_LEVEL = 1; // star damage bonus per level above 1
export const POTION_HEAL = 20;
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
    color: 0xb968ff,
    scale: 1.1,
    ranged: { projectileSpeed: 6, cooldownMs: 2200, range: 6, damage: 8 },
  },
};

// --- Maps / town / shop (M04) ---
export const PORTAL_RANGE = 0.9; // Up within this of a portal transitions
export const NPC_RANGE = 1.1; // Up within this of an NPC interacts
export const CAMERA_SWING_MS = 500; // eased settle on map entry
export const CAMERA_SWING_ZOOM = 6; // extra camera Z at swing start
export const POTION_PRICE = 30;
export const STARPACK_PRICE = 50;
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
