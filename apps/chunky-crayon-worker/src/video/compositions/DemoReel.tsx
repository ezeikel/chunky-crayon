import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';

export type DemoReelProps = {
  /** Local or remote URL of the Playwright-recorded webm. */
  recordedVideoUrl: string;
  /** The prompt the user "typed in" — shown as a caption. */
  prompt: string;
  /** Total composition length in frames. */
  durationInFrames: number;
};

/**
 * Composition skeleton for the social demo reel. We'll flesh out the overlays,
 * voiceover and music in follow-up commits — for now this just plays the raw
 * recording full-bleed with a simple caption in/out.
 */
export const DemoReel: React.FC<DemoReelProps> = ({ recordedVideoUrl, prompt }) => {
  return (
    <AbsoluteFill style={{ background: '#FFF8EF' }}>
      {/* Recorded Playwright session, centered 9:16. */}
      <OffthreadVideo src={recordedVideoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Bottom caption — placeholder styling. */}
      <Sequence from={0} durationInFrames={90}>
        <Caption text={prompt} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 80, 90], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 80,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: 64,
          fontWeight: 800,
          color: 'white',
          background: 'rgba(0, 0, 0, 0.55)',
          padding: '18px 32px',
          borderRadius: 28,
          opacity,
          textAlign: 'center',
        }}
      >
        “{text}”
      </div>
    </AbsoluteFill>
  );
};
