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

// =============================================================================
// Beat timeline (frames @ 30fps)
// =============================================================================
export const TEXT_REEL_FPS = 30;

const F_INTRO_START = 0;
const F_INTRO_DUR = 45;
const F_HOOK_START = F_INTRO_START + F_INTRO_DUR;
const F_HOOK_DUR = 60;
const F_CREATE_START = F_HOOK_START + F_HOOK_DUR;
const F_CREATE_DUR = 180; // prompt-typing scene total
const F_REVEAL_START = F_CREATE_START + F_CREATE_DUR;
const F_REVEAL_DUR = 240; // canvas reveal at 4x speed (~8s of 24×24 = 576 stamps)
const F_OUTRO_START = F_REVEAL_START + F_REVEAL_DUR;
const F_OUTRO_DUR = 90;

export const TEXT_REEL_DURATION_FRAMES = F_OUTRO_START + F_OUTRO_DUR;

// Reveal config — kept in sync with Phase 0 spike values.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const REVEAL_SPEED_FACTOR = TOTAL_STAMPS / F_REVEAL_DUR; // ≈ 2.4 stamps/frame
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);

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
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vWidth } = useVideoConfig();

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
  const createLocal = frame - F_CREATE_START;
  const typingDuration = Math.floor(F_CREATE_DUR * 0.6);
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
  const toolbarLocal = frame - F_REVEAL_START;
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
  const revealLocal = frame - F_REVEAL_START;
  const stampCount = Math.max(
    0,
    Math.min(TOTAL_STAMPS, Math.floor(revealLocal * REVEAL_SPEED_FACTOR)),
  );

  return (
    <AbsoluteFill style={{ background: COLORS.bgCream }}>
      {/* ── Beats 1 + 2: intro and hook ───────────────────────────────── */}
      <Sequence from={F_INTRO_START} durationInFrames={F_INTRO_DUR}>
        <IntroCard durationFrames={F_INTRO_DUR} />
      </Sequence>

      <Sequence from={F_HOOK_START} durationInFrames={F_HOOK_DUR}>
        <HookCard
          line1="What if you could color"
          line2="anything?"
          durationFrames={F_HOOK_DUR}
        />
      </Sequence>

      {/* ── Beat 3: prompt typing only ────────────────────────────────── */}
      <Sequence from={F_CREATE_START} durationInFrames={F_CREATE_DUR}>
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

        {/* Swoosh tags the prompt card's entrance — synced with the
            spring slide-up. Plays once at the start of the sequence. */}
        <Audio src={staticFile("v2-sfx/textbox-swoosh.wav")} volume={0.6} />

        {/* Keyboard typing SFX during the active typing window. Bounded
            by a Sequence so it stops when the typing animation finishes
            instead of trailing under the toolbar/canvas scene. Starts
            after the swoosh + card entrance so the textbox is on screen
            before keys start clicking. */}
        <Sequence from={14} durationInFrames={typingDuration}>
          <Audio src={staticFile("v2-sfx/keyboard-typing.mp3")} volume={0.4} />
        </Sequence>

        {/* Kid voiceover narrates the typing scene — same role as V1
            DemoReel.tsx's kid voice over typing clip. */}
        {kidVoiceUrl ? <Audio src={kidVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* ── Beat 4: canvas + toolbar + palette together ───────────────── */}
      <Sequence from={F_REVEAL_START} durationInFrames={F_REVEAL_DUR}>
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

        {/* Swish + kids "yay!" land together on canvas-reveal entrance —
            swoosh tags the cut, cheer celebrates the page appearing.
            Different swoosh from Beat 3's textbox-swoosh so consecutive
            transitions don't feel identical. */}
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.6} />
        <Audio src={staticFile("v2-sfx/kids-yay.mp3")} volume={0.6} />

        {/* Light pencil-on-paper draw sound underneath the actual brush
            sweep. Looped because the sweep runs longer than one clip. */}
        <Sequence from={20} durationInFrames={F_REVEAL_DUR - 20}>
          <Audio src={staticFile("v2-sfx/draw.mp3")} volume={0.45} loop />
        </Sequence>

        {/* Adult narrator over the reveal section. */}
        {adultVoiceUrl ? <Audio src={adultVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* ── Beat 5: outro hero + CTA ──────────────────────────────────── */}
      <Sequence from={F_OUTRO_START} durationInFrames={F_OUTRO_DUR}>
        <OutroCard
          finishedImageUrl={finishedImageUrl}
          durationFrames={F_OUTRO_DUR}
        />
      </Sequence>

      {/* Ducked ambient music across the full reel — same volume (0.18)
          and loop behaviour as V1 DemoReel.tsx. */}
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
