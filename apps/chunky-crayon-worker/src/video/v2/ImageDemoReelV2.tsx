/**
 * Demo Reel V2 — image variant.
 *
 * Same skeleton as `TextDemoReelV2` (intro → hook → input → reveal → outro)
 * but Beat 3 swaps prompt typing for a photo-upload scene. The user "drops"
 * a kid-safe stock photo from the photo_library_entries pool, the preview
 * card animates in, then the canvas-reveal scene plays identically to text.
 *
 * Inputs come from `inputProps` passed by the worker `/publish/v2` handler:
 *   - sourcePhotoUrl:  the photo the user "uploaded" — shown in the input card
 *   - photoFilename:   visible filename strip under the preview card
 *   - finishedImageUrl: URL of the fully-coloured page (outro hero)
 *   - regionMapUrl + regionMapWidth/Height + regionsJson + svgUrl:
 *                      fixture data for `<CanvasReveal>`
 */
import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  delayRender,
  continueRender,
  Audio,
  staticFile,
} from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "./tokens/brand";
import { ImageInputCard } from "./components/ImageInputCard";
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

// =============================================================================
// Beat timeline — identical to TextDemoReelV2 so per-platform post crons
// can swap variants freely without retiming captions / SFX banks.
// =============================================================================
export const IMAGE_REEL_FPS = 30;

const F_INTRO_START = 0;
const F_INTRO_DUR = 45;
const F_HOOK_START = F_INTRO_START + F_INTRO_DUR;
const F_HOOK_DUR = 60;
const F_INPUT_START = F_HOOK_START + F_HOOK_DUR;
const F_INPUT_DUR = 180;
const F_REVEAL_START = F_INPUT_START + F_INPUT_DUR;
const F_REVEAL_DUR = 240;
const F_OUTRO_START = F_REVEAL_START + F_REVEAL_DUR;
const F_OUTRO_DUR = 90;

export const IMAGE_REEL_DURATION_FRAMES = F_OUTRO_START + F_OUTRO_DUR;

// Reveal config — kept in sync with TextDemoReelV2 for consistency.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const REVEAL_SPEED_FACTOR = TOTAL_STAMPS / F_REVEAL_DUR;
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);

// =============================================================================
// Input props
// =============================================================================
export type ImageDemoReelV2Props = {
  /** Public URL of the source photo the user "uploaded". */
  sourcePhotoUrl: string;
  /** Visible filename under the preview card. */
  photoFilename?: string;
  /** Final coloured image URL — outro hero. */
  finishedImageUrl: string;
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  regionsJson: RegionStoreJson;
  svgUrl: string;
  paletteVariant?: PaletteVariant;

  // ── Audio (optional) ───────────────────────────────────────────────────
  backgroundMusicUrl?: string;
  /** Kid voiceover narrating the upload + intro section. */
  kidVoiceUrl?: string;
  /** Adult narrator voiceover for the reveal/outro. */
  adultVoiceUrl?: string;
};

// =============================================================================
// Composition
// =============================================================================
export const ImageDemoReelV2: React.FC<ImageDemoReelV2Props> = ({
  sourcePhotoUrl,
  photoFilename = "photo.jpg",
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
    handleRef.current = delayRender("loading image reel fixture");
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

  // ── Input scene (photo upload) ──────────────────────────────────────────
  // Frames 0–24 of the input scene: empty drop zone slides up via spring.
  // Frames 30–60: photo "drops in" — previewProgress climbs 0 → 1.
  // Frames 60+: held with filename strip visible.
  const inputLocal = frame - F_INPUT_START;
  const cardEntry = spring({
    frame: inputLocal,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });
  const previewProgress = interpolate(inputLocal, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Toolbar appears at the start of the reveal scene ────────────────────
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
      {/* Tondo fonts embedded as base64 in a static CSS file — no HTTP
          font fetches, no delayRender race across render tabs. */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* ── Beats 1 + 2 — identical to text variant ───────────────────── */}
      <Sequence from={F_INTRO_START} durationInFrames={F_INTRO_DUR}>
        <IntroCard durationFrames={F_INTRO_DUR} />
      </Sequence>

      <Sequence from={F_HOOK_START} durationInFrames={F_HOOK_DUR}>
        <HookCard
          line1="Turn any photo into"
          line2="a coloring page"
          durationFrames={F_HOOK_DUR}
        />
      </Sequence>

      {/* ── Beat 3: photo upload scene ───────────────────────────────── */}
      <Sequence from={F_INPUT_START} durationInFrames={F_INPUT_DUR}>
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
              opacity: cardEntry,
              transform: `translateY(${(1 - cardEntry) * 80}px) scale(${0.92 + 0.08 * cardEntry})`,
            }}
          >
            <ImageInputCard
              photoUrl={sourcePhotoUrl}
              filename={photoFilename}
              previewProgress={previewProgress}
            />
          </div>
        </AbsoluteFill>

        {/* Swoosh as the empty drop-zone card slides up. Same swoosh as
            text variant's prompt card so both reels feel of-a-piece. */}
        <Audio src={staticFile("v2-sfx/textbox-swoosh.wav")} volume={0.6} />

        {/* Pop SFX when the photo lands in the preview state. Bounded
            sequence keeps it from bleeding into Beat 4. */}
        <Sequence from={28} durationInFrames={20}>
          <Audio src={staticFile("v2-sfx/pop.mp3")} volume={0.7} />
        </Sequence>

        {/* Kid voiceover narrates the upload scene. */}
        {kidVoiceUrl ? <Audio src={kidVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* ── Beat 4: canvas + toolbar + palette — identical to text ───── */}
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
          <div
            style={{
              width: Math.min(vWidth - 120, 880),
              opacity: toolbarEntry,
            }}
          >
            <PaletteRow selectedIndex={null} limit={12} />
          </div>
        </AbsoluteFill>

        {/* Same swish + kids-yay layered entrance as text variant. */}
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.6} />
        <Audio src={staticFile("v2-sfx/kids-yay.mp3")} volume={0.6} />

        {/* Pencil-on-paper draw loop under the brush sweep. */}
        <Sequence from={20} durationInFrames={F_REVEAL_DUR - 20}>
          <Audio src={staticFile("v2-sfx/draw.mp3")} volume={0.45} loop />
        </Sequence>

        {adultVoiceUrl ? <Audio src={adultVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* ── Beat 5: outro ─────────────────────────────────────────────── */}
      <Sequence from={F_OUTRO_START} durationInFrames={F_OUTRO_DUR}>
        <OutroCard
          finishedImageUrl={finishedImageUrl}
          durationFrames={F_OUTRO_DUR}
        />
      </Sequence>

      {/* Ducked ambient music across the full reel. */}
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
