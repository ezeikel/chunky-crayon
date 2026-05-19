import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { getSoundManager, type SoundType, type BrushSoundType } from "./audio";

/**
 * SFX audition page. Not a real component — a Storybook harness to play
 * every UI sound and brush loop so we can A/B them after (re)generating.
 *
 * The SoundManager fetches `/audio/*.mp3`; the files are mirrored into
 * `.storybook/public/audio/` so these resolve the same way they do in-app.
 */

const UI_SOUNDS: { type: SoundType; label: string; note: string }[] = [
  { type: "tap", label: "tap", note: "Color / brush-size select — KEPT" },
  { type: "pop", label: "pop", note: "Tool / palette switch — KEPT" },
  { type: "draw", label: "draw", note: "Brush fallback loop — KEPT" },
  { type: "fill", label: "fill", note: "Flood-fill bucket — KEPT" },
  { type: "undo", label: "undo", note: "Undo action — REGENERATED" },
  { type: "redo", label: "redo", note: "Redo action — REGENERATED" },
  {
    type: "sparkle",
    label: "sparkle",
    note: "Celebration / magic — REGENERATED",
  },
  { type: "save", label: "save", note: "Save to gallery — REGENERATED" },
  { type: "error", label: "error", note: "Save failure — REGENERATED" },
];

const BRUSH_SOUNDS: { type: BrushSoundType; label: string }[] = [
  { type: "crayon", label: "crayon" },
  { type: "marker", label: "marker" },
  { type: "pencil", label: "pencil (→ crayon)" },
  { type: "paintbrush", label: "paintbrush (→ marker)" },
  { type: "eraser", label: "eraser" },
  { type: "glitter", label: "glitter" },
  { type: "sparkle", label: "sparkle" },
  { type: "rainbow", label: "rainbow" },
  { type: "glow", label: "glow" },
  { type: "neon", label: "neon" },
  { type: "magic-reveal", label: "magic-reveal" },
];

const tileClass =
  "flex flex-col gap-1 items-start px-4 py-3 rounded-coloring-button " +
  "bg-coloring-accent text-white text-sm font-[var(--coloring-weight-emphasis)] " +
  "shadow-coloring-button hover:bg-coloring-accent-dark active:translate-y-[1px] " +
  "active:shadow-coloring-button-hover min-w-[140px] text-left";

const SfxAuditioner = () => {
  const [ready, setReady] = useState(false);
  const [activeBrush, setActiveBrush] = useState<BrushSoundType | null>(null);
  const initRef = useRef(false);

  const ensureInit = async () => {
    if (initRef.current) return;
    initRef.current = true;
    await getSoundManager("storybook").init();
    setReady(true);
  };

  useEffect(() => {
    return () => {
      // Stop any looping brush sound when the story unmounts.
      getSoundManager("storybook").stopBrushLoop();
    };
  }, []);

  const playUi = async (type: SoundType) => {
    await ensureInit();
    getSoundManager("storybook").play(type);
  };

  const toggleBrush = async (type: BrushSoundType) => {
    await ensureInit();
    const mgr = getSoundManager("storybook");
    if (activeBrush === type) {
      mgr.stopBrushLoop();
      setActiveBrush(null);
      return;
    }
    mgr.startBrushLoop(type);
    setActiveBrush(type);
  };

  const stopBrush = () => {
    getSoundManager("storybook").stopBrushLoop();
    setActiveBrush(null);
  };

  return (
    <div className="p-8 bg-coloring-surface rounded-coloring-card min-h-[520px] flex flex-col gap-6">
      <div>
        <h2 className="font-coloring-heading font-bold text-coloring-text-primary text-xl">
          Sound Effects Audition
        </h2>
        <p className="text-coloring-text-secondary text-sm mt-1">
          {ready
            ? "Audio ready. Click any tile to play."
            : "Click any tile once to unlock audio (browser gesture requirement)."}
        </p>
      </div>

      <section>
        <h3 className="font-coloring-heading font-semibold text-coloring-text-primary mb-2">
          UI sounds
        </h3>
        <div className="flex flex-wrap gap-3">
          {UI_SOUNDS.map((s) => (
            <button
              key={s.type}
              type="button"
              className={tileClass}
              onClick={() => playUi(s.type)}
            >
              <span className="font-bold">▶ {s.label}</span>
              <span className="text-[11px] opacity-90 font-normal">
                {s.note}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-coloring-heading font-semibold text-coloring-text-primary">
            Brush loops (click to start, click again to stop)
          </h3>
          <button
            type="button"
            onClick={stopBrush}
            className="px-3 py-1.5 rounded-coloring-button bg-coloring-surface border border-coloring-text-secondary/30 text-coloring-text-primary text-xs font-semibold hover:bg-coloring-accent/10"
          >
            Stop all
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {BRUSH_SOUNDS.map((s) => {
            const on = activeBrush === s.type;
            return (
              <button
                key={s.type}
                type="button"
                className={`${tileClass} ${
                  on ? "ring-4 ring-white/70 bg-coloring-accent-dark" : ""
                }`}
                onClick={() => toggleBrush(s.type)}
              >
                <span className="font-bold">
                  {on ? "■ playing" : "▶ loop"} {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const meta: Meta<typeof SfxAuditioner> = {
  title: "Coloring/SoundEffects",
  component: SfxAuditioner,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Audition harness for every UI sound and brush loop sound. " +
          "Files generated via ElevenLabs Text to Sound Effects " +
          "(eleven_text_to_sound_v2). tap/pop/draw/fill are kept as-is; " +
          "undo/redo/sparkle/save/error were regenerated; all 9 brush " +
          "loops are new. Use this to A/B and flag any that need a redo.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SfxAuditioner>;

export const Audition: Story = {};
