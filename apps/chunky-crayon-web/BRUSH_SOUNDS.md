# Brush Sound Effects Guide

This document outlines the sound design for each brush type in Chunky Crayon.
Use these prompts with ElevenLabs Sound Effects to generate loopable audio files
for continuous drawing feedback.

## Technical Requirements

- **Format**: MP3 (44.1kHz, 128kbps)
- **Duration**: 2-4 seconds (will be looped seamlessly)
- **Style**: Seamless loop - ensure start and end blend smoothly
- **Volume**: Normalize to -12dB to allow for in-app volume adjustment

## File Locations

Place generated files in: `/public/audio/brush/`

| Brush Type   | Filename           | Volume | Status |
| ------------ | ------------------ | ------ | ------ |
| crayon       | `crayon.mp3`       | 0.25   | TODO   |
| marker       | `marker.mp3`       | 0.25   | TODO   |
| eraser       | `eraser.mp3`       | 0.20   | TODO   |
| glitter      | `glitter.mp3`      | 0.30   | TODO   |
| sparkle      | `sparkle.mp3`      | 0.30   | TODO   |
| rainbow      | `rainbow.mp3`      | 0.25   | TODO   |
| glow         | `glow.mp3`         | 0.25   | TODO   |
| neon         | `neon.mp3`         | 0.30   | TODO   |
| magic-reveal | `magic-reveal.mp3` | 0.35   | TODO   |

**Fallback**: If a brush sound file is missing, the app uses
`/public/audio/draw.mp3`.

---

## ElevenLabs Prompts

### 1. Crayon (`crayon.mp3`)

**Prompt:**

```
Soft waxy crayon drawing on paper texture. Gentle scratchy sound with slight friction, like a child coloring with a thick crayon. Warm, nostalgic, and soothing. Seamless loop for 3 seconds.
```

**Character:** Warm, textured, slightly scratchy but gentle

---

### 2. Marker (`marker.mp3`)

**Prompt:**

```
Felt-tip marker gliding smoothly on paper. Soft squeaky sound with gentle ink flow, like a fresh marker coloring. Smooth and satisfying. Seamless loop for 3 seconds.
```

**Character:** Smooth, slightly squeaky, fluid motion

---

### 3. Eraser (`eraser.mp3`)

**Prompt:**

```
Soft rubber eraser rubbing gently on paper. Light friction sound, like erasing pencil marks. Quiet and gentle with subtle paper texture. Seamless loop for 3 seconds.
```

**Character:** Soft friction, gentle rubbing, subtle

---

### 4. Glitter (`glitter.mp3`)

**Prompt:**

```
Magical sparkling glitter being applied with gentle shimmer sounds. Twinkling, crystalline particles spreading with a light ethereal quality. Child-friendly and whimsical. Seamless loop for 3 seconds.
```

**Character:** Sparkly, twinkling, magical shimmer

---

### 5. Sparkle (`sparkle.mp3`)

**Prompt:**

```
Magical wand creating sparkles with soft chiming sounds. Gentle fairy dust sprinkling with light bell-like tones. Enchanting and dreamy for kids. Seamless loop for 3 seconds.
```

**Character:** Chiming, bell-like, fairy magic

---

### 6. Rainbow (`rainbow.mp3`)

**Prompt:**

```
Whimsical rainbow brush with gentle whooshing color sounds. Soft sweeping motion with subtle magical undertones, like painting with all colors at once. Cheerful and dreamy. Seamless loop for 3 seconds.
```

**Character:** Sweeping, colorful whoosh, joyful

---

### 7. Glow (`glow.mp3`)

**Prompt:**

```
Soft glowing light brush with gentle humming resonance. Warm ethereal tone like a soft nightlight, comforting and magical. Subtle and soothing for children. Seamless loop for 3 seconds.
```

**Character:** Warm hum, gentle glow, comforting

---

### 8. Neon (`neon.mp3`)

**Prompt:**

```
Electric neon light buzzing gently with soft crackling energy. Subtle electric hum like a neon sign, playful and vibrant but not harsh. Kid-friendly energy. Seamless loop for 3 seconds.
```

**Character:** Electric buzz, gentle crackle, vibrant

---

### 9. Magic Reveal (`magic-reveal.mp3`)

**Prompt:**

```
Magical reveal brush with enchanting discovery sounds. Gentle unwrapping of magic with soft chimes and wonder. Like uncovering hidden treasure with sparkles. Exciting and whimsical for kids. Seamless loop for 3 seconds.
```

**Character:** Magical discovery, wonder, gentle excitement

---

## Implementation Notes

### Current Fallback Behavior

The SoundManager falls back to `/public/audio/draw.mp3` if a brush-specific
sound file is not found. This ensures the app works while sounds are being
generated.

### Fade Timing

- **Fade In**: 80ms (quick response when starting to draw)
- **Fade Out**: 120ms (smooth stop when lifting finger/mouse)

### Mute Controls

Separate mute controls stored in `ColoringContext` and persisted to
localStorage:

| Control | localStorage Key              | Affects                 |
| ------- | ----------------------------- | ----------------------- |
| SFX     | `chunky-crayon-sfx-muted`     | Brush sounds, UI sounds |
| Ambient | `chunky-crayon-ambient-muted` | Background music        |

### Stopping Brush Sounds

The `stopBrushLoop()` method clears state **before** scheduling the fade-out to
prevent race conditions when user rapidly starts/stops drawing. This ensures a
new brush loop can start cleanly even if the previous one hasn't finished
fading.

Global event listeners on `window` catch edge cases where finger/pointer leaves
the canvas while drawing:

- `pointerup`, `pointercancel`
- `touchend`, `touchcancel`
- `mouseup`

### Code Location

Sound configuration is in: `apps/web/lib/audio/SoundManager.ts`

```typescript
const BRUSH_SOUND_CONFIG: Record<BrushSoundType, BrushSoundConfig> = {
  crayon: { src: '/audio/brush/crayon.mp3', volume: 0.25 },
  marker: { src: '/audio/brush/marker.mp3', volume: 0.25 },
  // ... etc
};
```

### Testing

1. Generate sound files using ElevenLabs
2. Place in `/public/audio/brush/`
3. Test on both desktop (mouse) and mobile (touch)
4. Verify seamless looping during continuous strokes
5. Check that fade in/out feels responsive

---

## Alternative: Using Existing Sounds

If generating new sounds is not immediately needed, you can copy/rename existing
sounds:

```bash
# Quick setup with existing draw.mp3
cp public/audio/draw.mp3 public/audio/brush/crayon.mp3
cp public/audio/draw.mp3 public/audio/brush/marker.mp3
# ... etc for all brushes
```

This provides immediate functionality while you work on unique sounds for each
brush.
