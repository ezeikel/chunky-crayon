import { Composition } from "remotion";
import { DemoReel, type DemoReelProps } from "./compositions/DemoReel";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DemoReel"
      component={DemoReel}
      durationInFrames={FPS * 30} // overridden per-render via calculateMetadata
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={
        {
          recordedVideoUrl:
            "https://example.com/placeholder.webm" /* passed in at render time */,
          prompt: "A cute panda with a flower crown",
          recordingDurationMs: 45_000,
          flowMarkers: {
            typeStartMs: 0,
            submitMs: 4_000,
            redirectMs: 30_000,
            brushReadyMs: 34_000,
            sweepDoneMs: 44_000,
          },
          durationInFrames: FPS * 30,
        } satisfies DemoReelProps
      }
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames,
      })}
    />
  );
};
