# Milestone 07: The game sounds like Maple

## Status

done — 2026-07-18. All 3 automated AC green (61/61 suite); user approved after one revision round (8-bit → three-voice warm arrangement). Suno drop-ins remain the upgrade path (public/audio/<mapId>.mp3, auto-preferred, no code change).

## Objective

Deliver the audio layer: loopable BGM per map (town theme + field theme, whimsical Maple idiom) and the core SFX set — star throw/hit, mob death pop, loot pickup, potion, portal, and the level-up jingle (the gameplan's "important one"). Ships a Web Audio engine with zero dependencies; BGM slots accept Suno-generated tracks as drop-in files (`public/audio/*.mp3`), with procedural placeholders until the user generates them.

## Scope

- `src/audio/engine.js`: Web Audio context (created on first user gesture — browser autoplay rules), master/bgm/sfx gain buses, mute toggle (M key), volume in constants
- BGM: per-map track selection on `map:changed` with a short crossfade; loads `public/audio/<mapId>.mp3` if present, else a light procedural loop; town vs field moods
- SFX (procedural synthesis, eventBus-driven): `player:attacked` (throw whick), `mob:hit` (thud), `mob:died` (pop), `loot:picked` (bling), `potion:used` (gulp), `player:levelup` (the jingle — arpeggiated fanfare), `player:hit` (oof), portal (whoosh on `map:changed`)
- Multiplayer: remote events that already flow (mob:hit broadcasts, remote level-ups) get sounds too — the shared field sounds alive
- Payload: `audio: {muted, bgm}` for spec assertions; sounds themselves are user-playtest AC (Playwright can't hear)

## Out of scope

- Suno track generation itself (user drops files into public/audio/ when ready; the engine auto-uses them)
- Positional/stereo panning, footsteps, ambient loops (polish backlog)

## Dependencies

- **Depends on:** M01–M06 (events exist)
- **Blocks:** nothing

## Acceptance criteria

- [x] Audio engine boots muted-until-gesture with no console errors; M toggles mute — test: `tests/e2e/audio.spec.js::mute toggle and state`
- [x] BGM track switches on map change (payload `audio.bgm` reflects the current map's track) — test: `tests/e2e/audio.spec.js::bgm follows the map`
- [x] SFX dispatch on combat/loot/level events (engine records last-played sfx in payload for verification) — test: `tests/e2e/audio.spec.js::sfx fire on events`
- [x] The level-up jingle lands (timing, Maple-feel), BGM loops cleanly, SFX aren't fatiguing — verified by user playtest (approved 2026-07-18 after the warm-arrangement revision)

## Exit condition

User hunts for a minute with sound on → field theme loops underneath, throws/hits/pops/blings land as SFX, and a level-up fires the jingle over the flash. M mutes everything.

## Test plan

Red-then-green on the three automated AC via payload state (muted flag, bgm id, last-sfx ring buffer). Sound quality is user playtest. Regression: full suite green.

## Notes

- The audio engine must not break headless Playwright (AudioContext may be unavailable/suspended — engine no-ops gracefully; this is also the offline story).
- Use the add-audio/game-audio skill patterns for the procedural synthesis.
- 2026-07-18 playtest ("sounds 8-bit, not Maple"): procedural BGM rewritten from oscillator arpeggios to a three-voice arrangement — detuned-triangle pad chords through a lowpass, sine music-box melody with bell decay, soft sine bass; per-map chord progressions (town F-major 72bpm, field1 C-major 96bpm, field2 A-minor 104bpm). Square/saw SFX softened to triangle/sine+noise. **The procedural tier is still a placeholder** — the intended Maple sound is Suno tracks dropped into `public/audio/{town,field1,field2}.mp3` (engine auto-prefers files; generate loopable, whimsical-orchestral pieces in the Maple idiom).
