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
// Tuned 2026-07-13 (playtest: "too floaty"): higher gravity with jump
// velocity scaled to keep apex ≈ 2.0u — same reach, ~0.6s airtime vs 0.73s.
export const GRAVITY = 45;
export const MAX_FALL_SPEED = 20;
export const JUMP_VELOCITY = 13.5;
export const DOUBLE_JUMP_VELOCITY = 12;
export const CLIMB_SPEED = 3;
export const LADDER_GRAB_RANGE = 0.5; // horizontal reach to grab a ladder
// MSW ActionJump(horizontalInput) off a climbable: modest sideways leap.
export const LADDER_JUMP_VX = 4;
export const LADDER_JUMP_VY = 6;
// MSW ATTACK state: grounded attacks lock the run for the attack window.
export const ATTACK_LOCK_MS = 350;
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
// Classic MS attack model: the target is LOCKED at press time — nearest
// mob inside the forward selection rect (STAR_RANGE ahead, limited
// vertical tolerance). The star visual then homes to the locked mob and
// cannot miss; a throw with no target in the rect is a whiff that hits
// nothing. Platform mobs stay out of reach (tolerance << platform height).
export const STAR_SELECT_HALF_HEIGHT = 1.5;
export const STAR_THROW_HEIGHT = 1.0; // star spawn height above player feet
export const ATTACK_COOLDOWN_MS = 350;
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

// --- Loot (M03) ---
export const DROP_DESPAWN_MS = 15000;
export const PICKUP_RANGE = 0.9;
export const MESOS_MIN = 5;
export const MESOS_MAX = 14;
export const POTION_DROP_CHANCE = 0.3;
export const STARPACK_DROP_CHANCE = 0.15;
export const LOOT_SEED = 1337; // seeded rng: deterministic for tests, server-owned later
