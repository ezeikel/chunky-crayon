import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoReelProps } from "./compositions/DemoReel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_POINT = path.join(__dirname, "index.ts");
// Static assets (Tondo fonts) live in apps/chunky-crayon-worker/public/ —
// two levels up from src/video/. Remotion's bundler serves this directory
// at the root of its internal HTTP server, so `staticFile('/fonts/foo.ttf')`
// resolves to `http://localhost:<bundle-port>/fonts/foo.ttf`.
const PUBLIC_DIR = path.resolve(__dirname, "../../public");

export type RenderDemoReelOptions = DemoReelProps & {
  /** Output mp4 path. */
  outputPath: string;
};

/**
 * Render the DemoReel composition to an mp4 file. Skeleton — we'll wire in
 * the local-HTTP asset server (for serving /tmp webms into the headless
 * Chromium that Remotion spins up) once the record→render flow is real.
 */
export async function renderDemoReel(
  opts: RenderDemoReelOptions,
): Promise<string> {
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
  });

  console.log("[render] inputProps:", {
    durationInFrames: opts.durationInFrames,
    typingDurationFrames: opts.typingDurationFrames,
    revealDurationFrames: opts.revealDurationFrames,
    hasPdfPreview: !!opts.pdfPreviewUrl,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "DemoReel",
    inputProps: opts,
    timeoutInMilliseconds: 120_000,
  });

  console.log("[render] composition resolved:", {
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: opts.outputPath,
    inputProps: opts,
    timeoutInMilliseconds: 120_000,
    onBrowserLog: ({ type, text }) => {
      if (type === "error" || type === "warning") {
        console.log(`[remotion-browser:${type}] ${text}`);
      }
    },
  });

  return opts.outputPath;
}
