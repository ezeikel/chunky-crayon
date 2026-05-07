/**
 * Demo Reel V2 — text variant.
 *
 * Shows the prompt-typing → magic-reveal flow:
 *   intro (1.5s) → hook (2.0s) → prompt typing (4.5s) → tool select pop (1.5s)
 *   → canvas reveal (~7s @ 4× speed) → outro (3s)
 *
 * Inputs come from `inputProps` passed by the worker `/publish/v2` handler:
 *   - prompt:           description that types into the prompt card
 *   - finishedImageUrl: URL of the fully-coloured page (outro hero)
 *   - regionMapUrl + regionMapWidth/Height + regionsJson + svgUrl:
 *                       fixture data for `<CanvasReveal>`
 *
 * Studio preview pulls from `defaultProps` in Root.tsx so we can scrub the
 * timeline locally without a real coloringImageId.
 */
import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  delayRender,
  continueRender,
  Audio,
  staticFile,
} from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "./tokens/brand";
import { PromptInputCard } from "./components/PromptInputCard";
import { Toolbar } from "./components/Toolbar";
import { PaletteRow } from "./components/PaletteRow";
import {
  CanvasReveal,
  type CanvasRevealFixture,
  makeBoustrophedonPath,
} from "./components/CanvasReveal";
import { IntroCard } from "./sections/IntroCard";
import { HookCard } from "./sections/HookCard";
import { OutroCard } from "./sections/OutroCard";
import {
  loadCanvasRevealFixture,
  type RegionStoreJson,
  type PaletteVariant,
} from "./lib/loadFixture";
import { TONDO_FONT_CSS_URL } from "../fonts";
import {
  computeV2Beats,
  V2_DEFAULT_INPUT_VOICE_SECONDS,
  V2_DEFAULT_REVEAL_VOICE_SECONDS,
} from "./lib/timing";

// =============================================================================
// Beat timeline (frames @ 30fps)
// =============================================================================
export const TEXT_REEL_FPS = 30;

/**
 * Default total duration when voice clips aren't supplied (Studio
 * preview, fallback). Matches the legacy fixed-beat total of 615
 * frames (~20.5s). Worker-driven renders override via
 * calculateMetadata using the actual ffprobe'd voice durations.
 */
export const TEXT_REEL_DEFAULT_DURATION_FRAMES = computeV2Beats({
  fps: TEXT_REEL_FPS,
  inputVoiceSeconds: V2_DEFAULT_INPUT_VOICE_SECONDS,
  revealVoiceSeconds: V2_DEFAULT_REVEAL_VOICE_SECONDS,
}).totalFrames;

/**
 * @deprecated Kept for back-compat with renderTextDemoReelV2 callers
 * that destructure this. New callers should rely on calculateMetadata.
 */
export const TEXT_REEL_DURATION_FRAMES = TEXT_REEL_DEFAULT_DURATION_FRAMES;

// Reveal config — kept in sync with Phase 0 spike values. Stamp speed
// is fixed (the brush should always sweep at the same rate); the
// reveal beat duration grows with adult-voice length, so the canvas
// finishes drawing well before the voice does and the stamps just
// settle for the remainder.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);
/**
 * Reference reveal duration the stamp speed was tuned against (~8s
 * @ 30fps = 240 frames, matches the legacy F_REVEAL_DUR). Stamps per
 * frame stays 2.4 regardless of beat length.
 */
const REVEAL_REFERENCE_FRAMES = 240;
const REVEAL_SPEED_FACTOR = TOTAL_STAMPS / REVEAL_REFERENCE_FRAMES;

// =============================================================================
// Input props (from worker /publish/v2 OR defaultProps in Root)
// =============================================================================
export type TextDemoReelV2Props = {
  /** The description text typed into the prompt card. */
  prompt: string;
  /** Final coloured image URL — used in the outro hero shot. */
  finishedImageUrl: string;
  /** R2 URL of the gzipped pixel→region map. */
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  /** Parsed regionsJson from the DB row. */
  regionsJson: RegionStoreJson;
  /** R2 URL of the line art SVG. */
  svgUrl: string;
  /** Palette variant. Defaults to 'cute' (CC kids-friendly). */
  paletteVariant?: PaletteVariant;

  // ── Audio (all optional — reel falls back to silent if any missing) ───
  /** ElevenLabs-generated ambient music, looped at 0.18 across the reel. */
  backgroundMusicUrl?: string;
  /**
   * Kid voiceover narrating the typing/intro section. Worker generates
   * this from a Claude script per `chunky-crayon-worker/src/script/*`.
   */
  kidVoiceUrl?: string;
  /**
   * Adult narrator voiceover for the reveal/outro. Same generation flow
   * as the kid voice, different ElevenLabs voice id.
   */
  adultVoiceUrl?: string;
  /**
   * Kid voice clip duration in seconds. Drives the INPUT beat length
   * so the typing scene doesn't end mid-sentence. Probed by the worker
   * via ffprobe before render. Defaults to a sensible voice length
   * for Studio preview.
   */
  kidVoiceSeconds?: number;
  /**
   * Adult voice clip duration in seconds. Drives the REVEAL beat
   * length when the narration is longer than the visual brush sweep.
   */
  adultVoiceSeconds?: number;
};

// =============================================================================
// Composition
// =============================================================================
export const TextDemoReelV2: React.FC<TextDemoReelV2Props> = ({
  prompt,
  finishedImageUrl,
  regionMapUrl,
  regionMapWidth,
  regionMapHeight,
  regionsJson,
  svgUrl,
  paletteVariant = "cute",
  backgroundMusicUrl,
  kidVoiceUrl,
  adultVoiceUrl,
  kidVoiceSeconds = V2_DEFAULT_INPUT_VOICE_SECONDS,
  adultVoiceSeconds = V2_DEFAULT_REVEAL_VOICE_SECONDS,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vWidth } = useVideoConfig();

  // Voice-aware beat boundaries — replaces the old hardcoded F_*
  // constants. INPUT (typing scene) flexes to fit the kid voice;
  // REVEAL extends if the adult voice is longer than the brush sweep.
  // See ./lib/timing.ts for the rationale.
  const beats = computeV2Beats({
    fps,
    inputVoiceSeconds: kidVoiceSeconds,
    revealVoiceSeconds: adultVoiceSeconds,
  });

  const [fixture, setFixture] = useState<CanvasRevealFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    if (handleRef.current !== null) return;
    handleRef.current = delayRender("loading text reel fixture");
    let cancelled = false;
    loadCanvasRevealFixture({
      regionMapUrl,
      regionMapWidth,
      regionMapHeight,
      regionsJson,
      svgUrl,
      paletteVariant,
    })
      .then((f) => {
        if (cancelled) return;
        setFixture(f);
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    regionMapUrl,
    regionMapWidth,
    regionMapHeight,
    regionsJson,
    svgUrl,
    paletteVariant,
  ]);

  if (error) {
    return (
      <AbsoluteFill style={{ background: "#fee", padding: 40 }}>
        <div style={{ color: "#900", fontFamily: "monospace" }}>
          reel error: {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!fixture) {
    return (
      <AbsoluteFill
        style={{
          background: COLORS.bgCream,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.body,
          fontSize: 32,
          color: COLORS.textMuted,
        }}
      >
        loading…
      </AbsoluteFill>
    );
  }

  // ── Create scene (prompt typing) ────────────────────────────────────────
  // Type out the prompt over the first 75% of the create scene, hold the
  // completed text for the remainder so the viewer registers the input.
  const createLocal = frame - beats.inputStart;
  const typingDuration = Math.floor(beats.inputDur * 0.6);
  const typedChars = Math.min(
    prompt.length,
    Math.floor((createLocal / typingDuration) * prompt.length),
  );
  const typedText = createLocal < 0 ? "" : prompt.slice(0, typedChars);
  const caretVisible = Math.floor(createLocal / 12) % 2 === 0;

  // ── Prompt card entrance spring ────────────────────────────────────────
  // Slides up with a soft scale at the start of Beat 3. The swoosh SFX is
  // synced to this spring's first ~14 frames so sound + motion land together.
  const promptCardEntry = spring({
    frame: createLocal,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });

  // ── Toolbar appears at the start of the reveal scene ──────────────────
  // The toolbar is part of the canvas scene (alongside the canvas + palette),
  // not the prompt scene. It slides up from below when Beat 4 begins, and
  // the magic-reveal cell pops with a spring shortly after to draw the eye
  // before the brush starts moving.
  const toolbarLocal = frame - beats.revealStart;
  const toolbarEntry = spring({
    frame: toolbarLocal,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 18,
  });
  const magicSelectionPop = spring({
    frame: toolbarLocal - 8,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 24,
  });

  // ── Canvas reveal ───────────────────────────────────────────────────────
  const revealLocal = frame - beats.revealStart;
  const stampCount = Math.max(
    0,
    Math.min(TOTAL_STAMPS, Math.floor(revealLocal * REVEAL_SPEED_FACTOR)),
  );

  return (
    <AbsoluteFill style={{ background: COLORS.bgCream }}>
      {/* Tondo fonts embedded as base64 in a static CSS file — no HTTP
          font fetches, no delayRender race across render tabs. */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* ── Beats 1 + 2: intro and hook ───────────────────────────────── */}
      <Sequence from={beats.introStart} durationInFrames={beats.introDur}>
        <IntroCard durationFrames={beats.introDur} />
      </Sequence>

      <Sequence from={beats.hookStart} durationInFrames={beats.hookDur}>
        <HookCard
          line1="What if you could color"
          line2="anything?"
          durationFrames={beats.hookDur}
        />
      </Sequence>

      {/* ── Beat 3: prompt typing only (visual only — voice audio mounts
              at the composition root below) ───────────────────────────── */}
      <Sequence from={beats.inputStart} durationInFrames={beats.inputDur}>
        <AbsoluteFill
          style={{
            background: COLORS.bgCream,
            padding: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: vWidth - 120,
              opacity: promptCardEntry,
              transform: `translateY(${(1 - promptCardEntry) * 80}px) scale(${0.92 + 0.08 * promptCardEntry})`,
            }}
          >
            <PromptInputCard
              typedText={typedText}
              caretVisible={caretVisible}
              showCaret={createLocal < typingDuration + 30}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── Beat 4: canvas + toolbar + palette together ───────────────── */}
      <Sequence from={beats.revealStart} durationInFrames={beats.revealDur}>
        <AbsoluteFill
          style={{
            background: COLORS.bgCream,
            padding: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <CanvasReveal
            fixture={fixture}
            stampCount={stampCount}
            totalStamps={TOTAL_STAMPS}
            stampsPerRow={STAMPS_PER_ROW}
            brushRadius={
              Math.max(
                fixture.canvasW / STAMPS_PER_ROW,
                fixture.canvasH / ROWS,
              ) * 0.85
            }
            stampPath={STAMP_PATH}
            size={Math.min(vWidth - 120, 880)}
          />
          {/* Toolbar — magic-reveal pre-selected with a spring pop on entry. */}
          <div
            style={{
              width: Math.min(vWidth - 120, 880),
              opacity: toolbarEntry,
              transform: `translateY(${(1 - toolbarEntry) * 40}px)`,
            }}
          >
            <Toolbar
              activeToolId="magic-reveal"
              selectionPop={magicSelectionPop}
            />
          </div>
          {/* Palette mounted underneath — magic brush picks colours per
              region automatically, so no swatch is selected. */}
          <div
            style={{
              width: Math.min(vWidth - 120, 880),
              opacity: toolbarEntry,
            }}
          >
            <PaletteRow selectedIndex={null} limit={12} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── Beat 5: outro hero + CTA ──────────────────────────────────── */}
      <Sequence from={beats.outroStart} durationInFrames={beats.outroDur}>
        <OutroCard
          finishedImageUrl={finishedImageUrl}
          durationFrames={beats.outroDur}
        />
      </Sequence>

      {/* ===========================================================
          AUDIO — voice + SFX live at the COMPOSITION ROOT, never
          inside a bounded <Sequence durationInFrames=…>. Remotion
          truncates audio that's a child of a bounded sequence at the
          sequence's end frame, which is exactly the bug that cut off
          the first voiceover mid-sentence on demo reels.

          The fix mirrors what content-reel/spike templates do:
            - <Sequence from={beatStart}> with NO durationInFrames
              shifts t=0 to the beat boundary but doesn't bound the end.
            - Total composition length is computed from voice durations
              (computeV2Beats), so the comp itself outlasts every voice.
            - Music goes at absolute root, looped, ducked.
          =========================================================== */}

      {/* Beat 3 (typing): swoosh on prompt-card entrance, keyboard SFX
          while typing animates, kid voiceover narrating the input. */}
      <Sequence from={beats.inputStart}>
        <Audio src={staticFile("v2-sfx/textbox-swoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={beats.inputStart + 14} durationInFrames={typingDuration}>
        <Audio src={staticFile("v2-sfx/keyboard-typing.mp3")} volume={0.4} />
      </Sequence>
      {kidVoiceUrl ? (
        <Sequence from={beats.inputVoiceStart}>
          <Audio src={kidVoiceUrl} volume={1} />
        </Sequence>
      ) : null}

      {/* Beat 4 (canvas reveal): swish + kids "yay" on entrance, pencil
          draw loop underneath, adult narrator over the reveal. */}
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.6} />
      </Sequence>
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/kids-yay.mp3")} volume={0.6} />
      </Sequence>
      <Sequence
        from={beats.revealStart + 20}
        durationInFrames={beats.revealDur - 20}
      >
        <Audio src={staticFile("v2-sfx/draw.mp3")} volume={0.45} loop />
      </Sequence>
      {adultVoiceUrl ? (
        <Sequence from={beats.revealVoiceStart}>
          <Audio src={adultVoiceUrl} volume={1} />
        </Sequence>
      ) : null}

      {/* Ducked ambient music across the full reel — same volume (0.18)
          and loop behaviour as V1 DemoReel.tsx. */}
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
