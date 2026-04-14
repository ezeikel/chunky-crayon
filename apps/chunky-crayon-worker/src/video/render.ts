import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DemoReelProps } from './compositions/DemoReel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_POINT = path.join(__dirname, 'index.ts');

export type RenderDemoReelOptions = DemoReelProps & {
  /** Output mp4 path. */
  outputPath: string;
  /** Composition frames. 30fps × seconds. */
  durationInFrames: number;
};

/**
 * Render the DemoReel composition to an mp4 file. Skeleton — we'll wire in
 * the local-HTTP asset server (for serving /tmp webms into the headless
 * Chromium that Remotion spins up) once the record→render flow is real.
 */
export async function renderDemoReel(opts: RenderDemoReelOptions): Promise<string> {
  const bundleLocation = await bundle({ entryPoint: ENTRY_POINT });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'DemoReel',
    inputProps: opts,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: opts.outputPath,
    inputProps: opts,
  });

  return opts.outputPath;
}
