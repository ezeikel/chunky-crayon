import { Composition } from "remotion";
import { DemoReel, type DemoReelProps } from "./compositions/DemoReel";

const FPS = 30;

// Pacing constants — keep in sync with DemoReel + worker/index.ts.
const INTRO_SECS = 1.0;
const OUTRO_SECS = 2.0;

/**
 * Studio preview defaults — pointed at real assets from the most recent
 * `/publish/next` run served by our Hono /tmp file server on :3030. Lets
 * you edit the composition in Remotion Studio (`pnpm remotion:studio`) and
 * hot-reload without having to generate a new image.
 *
 * If these files get rotated/cleaned, bump the filenames to a fresh set
 * (look at `ls /tmp/chunky-crayon-worker/` and pick the newest trio).
 */
const STUDIO = {
  typingVideoUrl: "http://localhost:3030/tmp/1776253397654-typing.mp4",
  revealVideoUrl: "http://localhost:3030/tmp/1776253397655-reveal.mp4",
  ambientSoundUrl: "http://localhost:3030/tmp/1776253394523-ambient.mp3",
  kidVoiceUrl: "http://localhost:3030/tmp/1776253396382-kid.mp3",
  adultVoiceUrl: "http://localhost:3030/tmp/1776253396383-adult.mp3",
  // Lengths of the trimmed clips (ffprobe).
  typingDurationSec: 3.72,
  revealDurationSec: 27.48,
};

export const RemotionRoot: React.FC = () => {
  const typingFrames = Math.round(STUDIO.typingDurationSec * FPS);
  const revealFrames = Math.round(STUDIO.revealDurationSec * FPS);
  const introFrames = Math.round(INTRO_SECS * FPS);
  const outroFrames = Math.round(OUTRO_SECS * FPS);
  const totalFrames = introFrames + typingFrames + revealFrames + outroFrames;

  return (
    <Composition
      id="DemoReel"
      component={DemoReel}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={
        {
          typingVideoUrl: STUDIO.typingVideoUrl,
          revealVideoUrl: STUDIO.revealVideoUrl,
          typingDurationFrames: typingFrames,
          revealDurationFrames: revealFrames,
          durationInFrames: totalFrames,
          ambientSoundUrl: STUDIO.ambientSoundUrl,
          kidVoiceUrl: STUDIO.kidVoiceUrl,
          adultVoiceUrl: STUDIO.adultVoiceUrl,
          prompt: "a friendly bear holding honey",
        } satisfies DemoReelProps
      }
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames,
      })}
    />
  );
};
