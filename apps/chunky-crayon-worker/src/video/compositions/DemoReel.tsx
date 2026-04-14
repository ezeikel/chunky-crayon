import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";

export type DemoReelFlowMarkers = {
  typeStartMs: number;
  submitMs: number;
  redirectMs: number;
  brushReadyMs: number;
  sweepDoneMs: number;
};

export type DemoReelProps = {
  /** Local or remote URL of the Playwright-recorded webm. */
  recordedVideoUrl: string;
  /** The prompt the user "typed in" — shown as a caption. */
  prompt: string;
  /** Total recording length in ms (the webm's native duration). */
  recordingDurationMs: number;
  /** Per-phase timestamps from the recorder. */
  flowMarkers: DemoReelFlowMarkers;
  /** Total composition length in frames (computed by render.ts). */
  durationInFrames: number;
};

/**
 * Fast-forward factor applied to the "waiting for generation" phase — the
 * boring ~60s spinner between submit and redirect. Higher = shorter section.
 * Typing and reveal stay at 1× because those are the product-demo payoffs.
 */
const GENERATION_SPEED = 8;

/**
 * DemoReel composition. Three sequential sections, each mounting the same
 * webm at a different trim offset and playback rate:
 *
 *   ┌── typing ──┬── waiting (8× FF) ──┬── reveal ──┐
 *   0           submit                redirect     sweepDone
 *
 * The trim offset (startFrom) is expressed in source-video frames; it's the
 * position in the original recording where each section begins.
 */
export const DemoReel: React.FC<DemoReelProps> = ({
  recordedVideoUrl,
  prompt,
  flowMarkers,
}) => {
  const { fps } = useVideoConfig();
  const sections = computeSections(fps, flowMarkers);

  return (
    <AbsoluteFill style={{ background: "#FFF8EF" }}>
      {/* 1. Typing phase — real time. */}
      <Sequence
        from={sections.typing.outputStart}
        durationInFrames={sections.typing.outputDuration}
      >
        <OffthreadVideo
          src={recordedVideoUrl}
          startFrom={sections.typing.sourceStart}
          style={fillStyle}
        />
      </Sequence>

      {/* 2. Waiting-for-generation — fast-forward. */}
      <Sequence
        from={sections.waiting.outputStart}
        durationInFrames={sections.waiting.outputDuration}
      >
        <OffthreadVideo
          src={recordedVideoUrl}
          startFrom={sections.waiting.sourceStart}
          playbackRate={GENERATION_SPEED}
          style={fillStyle}
        />
      </Sequence>

      {/* 3. Reveal — real time. */}
      <Sequence
        from={sections.reveal.outputStart}
        durationInFrames={sections.reveal.outputDuration}
      >
        <OffthreadVideo
          src={recordedVideoUrl}
          startFrom={sections.reveal.sourceStart}
          style={fillStyle}
        />
      </Sequence>

      {/* Bottom caption for the first few seconds — kept minimal for now. */}
      <Sequence from={0} durationInFrames={Math.round(fps * 3)}>
        <Caption text={prompt} />
      </Sequence>
    </AbsoluteFill>
  );
};

const fillStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

type Section = {
  /** Frame offset into the SOURCE webm where this section starts. */
  sourceStart: number;
  /** Where the section begins in the OUTPUT composition. */
  outputStart: number;
  /** Output length in frames. */
  outputDuration: number;
};

function computeSections(
  fps: number,
  markers: DemoReelFlowMarkers,
): { typing: Section; waiting: Section; reveal: Section } {
  const msToFrames = (ms: number) => Math.round((ms / 1000) * fps);

  // Source offsets (where each phase lives in the raw webm).
  const typingSourceStart = msToFrames(markers.typeStartMs);
  const submitSource = msToFrames(markers.submitMs);
  const redirectSource = msToFrames(markers.redirectMs);
  const sweepDoneSource = msToFrames(markers.sweepDoneMs);

  // Real-time durations of each phase in the source.
  const typingFrames = submitSource - typingSourceStart;
  const waitingSourceFrames = redirectSource - submitSource;
  const revealFrames = sweepDoneSource - redirectSource;

  // Fast-forward compresses the waiting phase.
  const waitingOutputFrames = Math.max(
    1,
    Math.round(waitingSourceFrames / GENERATION_SPEED),
  );

  const typing: Section = {
    sourceStart: typingSourceStart,
    outputStart: 0,
    outputDuration: typingFrames,
  };
  const waiting: Section = {
    sourceStart: submitSource,
    outputStart: typing.outputStart + typing.outputDuration,
    outputDuration: waitingOutputFrames,
  };
  const reveal: Section = {
    sourceStart: redirectSource,
    outputStart: waiting.outputStart + waiting.outputDuration,
    outputDuration: revealFrames,
  };

  return { typing, waiting, reveal };
}

const Caption: React.FC<{ text: string }> = ({ text }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        padding: 80,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 64,
          fontWeight: 800,
          color: "white",
          background: "rgba(0, 0, 0, 0.55)",
          padding: "18px 32px",
          borderRadius: 28,
          textAlign: "center",
        }}
      >
        “{text}”
      </div>
    </AbsoluteFill>
  );
};
