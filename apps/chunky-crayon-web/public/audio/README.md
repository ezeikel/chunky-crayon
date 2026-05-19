# Audio Files for Chunky Crayon

This directory contains sound effects for the coloring experience.

## Current Sound Files

All sounds are generated via the ElevenLabs Text to Sound Effects API
(`eleven_text_to_sound_v2`). The "Regenerated" rows were re-prompted with
concrete physical cues + explicit kid-friendly tone and tuned
`prompt_influence`; `tap/pop/draw/fill` are the original placeholders, kept
as-is by product decision.

| File          | Description                         | Status      | Notes                               |
| ------------- | ----------------------------------- | ----------- | ----------------------------------- |
| `tap.mp3`     | Light tap sound for UI interactions | Kept        | Used for color/brush size selection |
| `pop.mp3`     | Pop sound for tool selection        | Kept        | Used when switching tools / palette |
| `draw.mp3`    | Subtle drawing/crayon sound         | Kept        | Brush-loop fallback                 |
| `fill.mp3`    | Fill bucket pour sound              | Kept        | Plays on successful fill            |
| `undo.mp3`    | Soft undo whoosh                    | Regenerated | Plays on undo action                |
| `redo.mp3`    | Soft redo whoosh                    | Regenerated | Plays on redo action                |
| `save.mp3`    | Cheerful success chime              | Regenerated | Plays when artwork is saved         |
| `sparkle.mp3` | Magical sparkle shimmer             | Regenerated | Celebration / magic actions         |
| `error.mp3`   | Gentle non-scary error tone         | Regenerated | Plays on save failure               |

Brush loop sounds (9 files in `brush/`) are documented in
`apps/chunky-crayon-web/BRUSH_SOUNDS.md`.

## Regenerating

All sounds are produced by `scripts/generate-sfx.ts`:

```bash
ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts            # all
ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts undo redo  # subset
ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts --brush    # brushes
```

Prompts and per-sound `duration_seconds` / `prompt_influence` / `loop` live in
that script. Audition in Storybook (`packages/coloring-ui`, story **Coloring /
SoundEffects**) — that page mirrors `public/audio/` into its static dir, so
re-copy after regenerating if you want Storybook fresh.

## Recommended Sources

- [Epidemic Sound](https://www.epidemicsound.com) - High quality royalty-free
  sounds
- [Freesound.org](https://freesound.org) - Free sounds with various licenses
- [Pixabay](https://pixabay.com/sound-effects/) - Royalty-free sounds
- [Mixkit](https://mixkit.co/free-sound-effects/) - Free sound effects
- [ElevenLabs](https://elevenlabs.io) - AI sound effect generation

## Technical Notes

- All sounds should be kid-friendly and pleasant
- Keep file sizes small (< 50KB each) for fast loading
- MP3 format at 128kbps is sufficient
- Duration: 50-600ms depending on the sound type
- The SoundManager handles missing files gracefully (no errors thrown)
- Sounds are preloaded on first user interaction for low-latency playback
