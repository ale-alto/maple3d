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
export const GRAVITY = 30;
export const MAX_FALL_SPEED = 18;
export const JUMP_VELOCITY = 11;
export const DOUBLE_JUMP_VELOCITY = 10;
export const CLIMB_SPEED = 3;
export const LADDER_GRAB_RANGE = 0.5; // horizontal reach to grab a ladder

// --- Combat (M02 first pass; tune in playtests) ---
export const PLAYER_MAX_HP = 50;
export const PLAYER_WIDTH = 0.7; // AABB for contact damage
export const PLAYER_HEIGHT = 1.5;
export const INVULN_MS = 1000; // i-frames after taking a hit
export const STAR_DAMAGE = 8;
export const STAR_SPEED = 14;
export const STAR_RANGE = 7;
export const STAR_THROW_HEIGHT = 1.0; // star spawn height above player feet
export const ATTACK_COOLDOWN_MS = 350;
export const MOB_MAX_HP = 20;
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
