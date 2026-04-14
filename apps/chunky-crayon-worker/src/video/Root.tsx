import { Composition } from 'remotion';
import { DemoReel, type DemoReelProps } from './compositions/DemoReel';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DemoReel"
      component={DemoReel}
      durationInFrames={FPS * 30} // 30s default; overridden per-render
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        recordedVideoUrl:
          'https://example.com/placeholder.webm' /* passed in at render time */,
        prompt: 'A cute panda with a flower crown',
        durationInFrames: FPS * 30,
      } satisfies DemoReelProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames,
      })}
    />
  );
};
