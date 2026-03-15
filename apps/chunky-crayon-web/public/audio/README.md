# Audio Files for Chunky Crayon

This directory contains sound effects for the coloring experience.

## Current Sound Files

All sounds were generated via ElevenLabs text-to-sound-effects API. These are
placeholder sounds that work but may need refinement for a more polished
kid-friendly experience.

| File          | Description                         | Status       | Notes                               |
| ------------- | ----------------------------------- | ------------ | ----------------------------------- |
| `tap.mp3`     | Light tap sound for UI interactions | Needs review | Used for color/brush size selection |
| `pop.mp3`     | Pop sound for tool selection        | Needs review | Used when switching tools           |
| `draw.mp3`    | Subtle drawing/crayon sound         | Needs review | Plays when starting to draw         |
| `fill.mp3`    | Fill bucket pour sound              | Needs review | Plays on successful fill            |
| `undo.mp3`    | Swoosh/rewind sound                 | Needs review | Plays on undo action                |
| `redo.mp3`    | Forward swoosh sound                | Needs review | Plays on redo action                |
| `save.mp3`    | Success/chime sound                 | Needs review | Plays when artwork is saved         |
| `sparkle.mp3` | Magical sparkle sound               | Needs review | Plays on start over/clear           |
| `error.mp3`   | Soft error tone                     | Needs review | Plays on save failure               |

## TODO: Sound Improvements

Replace these AI-generated sounds with higher quality alternatives:

- [ ] `tap.mp3` - Should be a satisfying, soft tap
- [ ] `pop.mp3` - Should be a fun, bubbly pop
- [ ] `draw.mp3` - Should sound like crayon on paper
- [ ] `fill.mp3` - Should be a smooth pour/splash
- [ ] `undo.mp3` - Should be a quick rewind whoosh
- [ ] `redo.mp3` - Should be a quick forward whoosh
- [ ] `save.mp3` - Should be a cheerful success chime
- [ ] `sparkle.mp3` - Should be magical and delightful
- [ ] `error.mp3` - Should be gentle, not scary for kids

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
