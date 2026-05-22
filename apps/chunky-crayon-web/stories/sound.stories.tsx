import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolume,
  faVolumeXmark,
  faPlay,
  faStop,
  faPowerOff,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  useSound,
  type SoundType,
  type BrushSoundType,
} from '@one-colored-pixel/coloring-ui';

/**
 * SFX Playground — a utility surface, not a component story.
 *
 * The coloring experience plays one-shot sound effects (tap, pop,
 * sparkle…) and continuous brush-loop sounds (crayon, marker, glitter…)
 * through the shared `useSound` hook + SoundManager in coloring-ui.
 * There's no single component to "story", so this is a deliberate
 * play/test board: tap a sound, hear it.
 *
 * Audio files live in `public/audio/` (Storybook serves `public/` as a
 * static dir). Web Audio needs a user gesture before it can play, so
 * hit "Wake up sound" once first — every button below also calls
 * `initSounds()` defensively.
 */
const meta = {
  title: 'Chunky Crayon/09 Sound',
  parameters: {
    docs: {
      description: {
        component:
          'A play/test board for every sound effect in the coloring experience — one-shot SFX and continuous brush-loop sounds, driven through the real useSound hook. Tap to hear; toggle the mutes to check the muting paths.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// The full SoundType union — one-shot effects. Kept in sync with
// SoundManager's SOUND_CONFIG by hand (TS would flag a missing key the
// moment playSound is called with it).
const ONE_SHOT_SFX: { key: SoundType; label: string; note: string }[] = [
  { key: 'tap', label: 'Tap', note: 'Button tap / click' },
  { key: 'pop', label: 'Pop', note: 'Satisfying pop for selections' },
  { key: 'draw', label: 'Draw', note: 'Crayon drawing (legacy fallback)' },
  { key: 'fill', label: 'Fill', note: 'Fill bucket splash' },
  { key: 'undo', label: 'Undo', note: 'Undo action' },
  { key: 'redo', label: 'Redo', note: 'Redo action' },
  { key: 'save', label: 'Save', note: 'Save to gallery' },
  { key: 'sparkle', label: 'Sparkle', note: 'Celebration / success' },
  { key: 'error', label: 'Error', note: 'Error feedback' },
];

// The full BrushSoundType union — continuous loops while drawing.
const BRUSH_LOOPS: { key: BrushSoundType; label: string; note: string }[] = [
  { key: 'crayon', label: 'Crayon', note: 'Waxy, textured scratching' },
  { key: 'marker', label: 'Marker', note: 'Smooth, squeaky felt-tip' },
  { key: 'pencil', label: 'Pencil', note: 'Fine scratching (→ crayon)' },
  { key: 'paintbrush', label: 'Paintbrush', note: 'Swishing brush (→ marker)' },
  { key: 'eraser', label: 'Eraser', note: 'Soft rubbery erasing' },
  { key: 'glitter', label: 'Glitter', note: 'Sparkly shimmery tinkling' },
  { key: 'sparkle', label: 'Sparkle', note: 'Magical twinkling' },
  { key: 'rainbow', label: 'Rainbow', note: 'Dreamy colourful whoosh' },
  { key: 'glow', label: 'Glow', note: 'Warm humming radiance' },
  { key: 'neon', label: 'Neon', note: 'Electric buzzing' },
  { key: 'magic-reveal', label: 'Magic reveal', note: 'Mystical unveiling' },
];

const Stage = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen space-y-8 bg-paper p-8">{children}</main>
);

/** Master/SFX mute toggles + the one-time Web Audio wake-up gesture. */
const SoundControls = () => {
  const { initSounds, isMuted, toggleMute, isSfxMuted, toggleSfxMute } =
    useSound();
  const [woken, setWoken] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border-2 border-paper-cream-dark bg-white p-5 shadow-card">
      <button
        type="button"
        onClick={() => {
          initSounds();
          setWoken(true);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-crayon-orange px-4 py-2 font-tondo text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
      >
        <FontAwesomeIcon icon={faPowerOff} />
        {woken ? 'Sound is awake' : 'Wake up sound'}
      </button>
      <button
        type="button"
        onClick={toggleMute}
        className="inline-flex items-center gap-2 rounded-full border-2 border-paper-cream-dark px-4 py-2 font-tondo text-sm font-bold text-text-primary transition-colors hover:border-crayon-orange"
      >
        <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolume} />
        Master: {isMuted ? 'muted' : 'on'}
      </button>
      <button
        type="button"
        onClick={toggleSfxMute}
        className="inline-flex items-center gap-2 rounded-full border-2 border-paper-cream-dark px-4 py-2 font-tondo text-sm font-bold text-text-primary transition-colors hover:border-crayon-orange"
      >
        <FontAwesomeIcon icon={isSfxMuted ? faVolumeXmark : faVolume} />
        SFX: {isSfxMuted ? 'muted' : 'on'}
      </button>
    </div>
  );
};

/** One-shot SFX board — tap a tile to play that sound once. */
const OneShotBoard = () => {
  const { playSound, initSounds } = useSound();
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-tondo text-xl font-bold text-text-primary">
          One-shot effects
        </h2>
        <p className="text-sm text-text-secondary">
          Fire-and-forget sounds. Tap a tile to play it.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ONE_SHOT_SFX.map((sfx) => (
          <button
            key={sfx.key}
            type="button"
            onClick={() => {
              initSounds();
              playSound(sfx.key);
            }}
            className="flex items-center gap-3 rounded-2xl border-2 border-paper-cream-dark bg-white p-4 text-left transition-all hover:border-crayon-orange hover:bg-crayon-orange/5 active:scale-95"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-crayon-orange/10">
              <FontAwesomeIcon icon={faPlay} className="text-crayon-orange" />
            </span>
            <span className="min-w-0">
              <span className="block font-tondo font-bold text-text-primary">
                {sfx.label}
              </span>
              <span className="block truncate text-xs text-text-secondary">
                {sfx.note}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

/** Brush-loop board — start/stop a continuous brush sound. */
const BrushLoopBoard = () => {
  const { startBrushLoop, stopBrushLoop, initSounds } = useSound();
  const [active, setActive] = useState<BrushSoundType | null>(null);

  const toggle = (key: BrushSoundType) => {
    initSounds();
    if (active === key) {
      stopBrushLoop();
      setActive(null);
      return;
    }
    // Only one loop plays at a time — stop the current before starting.
    if (active) stopBrushLoop();
    startBrushLoop(key);
    setActive(key);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-tondo text-xl font-bold text-text-primary">
          Brush loops
        </h2>
        <p className="text-sm text-text-secondary">
          Continuous sounds that play while a stroke is drawn. Tap to start, tap
          again to stop. Only one loop plays at a time.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BRUSH_LOOPS.map((brush) => {
          const isActive = active === brush.key;
          return (
            <button
              key={brush.key}
              type="button"
              onClick={() => toggle(brush.key)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${
                isActive
                  ? 'border-crayon-orange bg-crayon-orange/10'
                  : 'border-paper-cream-dark bg-white hover:border-crayon-orange hover:bg-crayon-orange/5'
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  isActive ? 'bg-crayon-orange' : 'bg-crayon-orange/10'
                }`}
              >
                <FontAwesomeIcon
                  icon={isActive ? faStop : faPlay}
                  className={isActive ? 'text-white' : 'text-crayon-orange'}
                />
              </span>
              <span className="min-w-0">
                <span className="block font-tondo font-bold text-text-primary">
                  {brush.label}
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {brush.note}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const SfxPlayground: Story = {
  name: 'SFX playground',
  render: () => (
    <Stage>
      <SoundControls />
      <OneShotBoard />
      <BrushLoopBoard />
    </Stage>
  ),
};
