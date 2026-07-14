# MSW movement/attack parity map

> Source of truth for "1:1 MapleStory feel". Extracted 2026-07-14 from the official
> MapleStory Worlds creator docs. Our sim implements this model; constants.js names
> map onto the official property names.

## Sources (all JS-rendered; read via browser, not fetch)

- [Understanding MapleStory Movement Concepts](https://maplestoryworlds-creators.nexon.com/en/docs?postId=750) — foothold rules
- [Using Ladders and Rope](https://maplestoryworlds-creators.nexon.com/en/docs?postId=809) — ClimbableComponent guide
- API: [RigidbodyComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference?postId=378), [MovementComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/MovementComponent), [ClimbableComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/ClimbableComponent), [PlayerControllerComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/PlayerControllerComponent), [AttackComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/AttackComponent), [HitComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/HitComponent), [StateComponent](https://maplestoryworlds-creators.nexon.com/en/apiReference/Components/StateComponent)

## Official model → our implementation

| MSW concept | Official behavior | Ours |
|---|---|---|
| Foothold rules | Land from above; pass through from below; going up ignores footholds; walk-off disconnects | `src/sim/player.js` landing ✓ |
| WalkSpeed / WalkAcceleration / WalkDrag | Max ground speed; accel toward it; drag resists slipping when no input | RUN_SPEED / RUN_ACCEL / GROUND_FRICTION ✓ |
| AirAccelerationX / AirDecelerationX | Weak midair steering; separate (zero-able) air drag — momentum is committed | AIR_ACCEL, no air drag ✓ |
| Gravity / FallSpeedMaxY / JumpBias (hang) | Fall accel, fall cap, hang-time knob | GRAVITY / MAX_FALL_SPEED / (arc tuned 2026-07-13) ✓ |
| WalkJump (jump height) | Jump impulse | JUMP_VELOCITY / DOUBLE_JUMP_VELOCITY ✓ |
| MovementComponent.DownJump() / ActionDownJump | Down+Jump drops through thin platform; only valid on terrain | dropThrough ✓ |
| PlayerController.ActionJump(horizontalInput) on climbable | Jump-off a ladder/rope requires a horizontal direction; jump alone stays on | **gap → parity batch 2026-07-14** |
| ActionCrouch | Down on ground = crouch/prone: stops movement; crouch+jump on ground floor does nothing | **gap → parity batch 2026-07-14** |
| ATTACK state (StateComponent) | Grounded attack locks horizontal movement for the attack window; air attacks don't | **gap → parity batch 2026-07-14** |
| HitEvent FeedbackAction (knockback) | Being hit knocks the player back (small pop away from the source) | **gap → parity batch 2026-07-14** |
| StateComponent states | Named states drive animation (idle/move/jump/fall/ladder/rope/crouch/dead) | **gap → parity batch 2026-07-14**; feeds ADR-0002 animation sets |
| ClimbableAnimationType Ladder\|Rope | Climbables are typed for animation | field1 ladders get `type` |
| ClimbableComponent.SpeedFactor | Climb speed multiplier | CLIMB_SPEED ✓ |
| PlayerHit ImmuneCooldown = 1 (built-in script) | 1s invulnerability after a hit | INVULN_MS = 1000 ✓ exact match |
| Attack → HitComponent.OnHit pipeline | Attack shape query → per-target OnHit → HitEvent (damage numbers, crit hook) | stars → damageMob → `mob:hit` ✓; CalcCritical hook = M03+ candidate |
| IsAttackTarget excludes DEAD | Dead entities can't be hit | dead mobs leave the list ✓ |

## Deliberately not adopted (yet)

- WalkSlant (slopes) — maps are flat segments in v1
- FallSpeedMaxX — vx already capped at RUN_SPEED
- DownJumpSpeed pre-drop hop — cosmetic
- AllowHorizontalMove climbables (nets) — no such map objects yet
- Crit multiplier (GetCriticalDamageRate = 2×) — progression territory, M03+
- Mob knockback from star hits — patrol clamping makes it look wrong; revisit with better mob AI
