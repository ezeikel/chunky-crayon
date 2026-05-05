import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoReelProps } from "./compositions/DemoReel";
import type { ImageDemoReelProps } from "./compositions/ImageDemoReel";
import type { TextDemoReelV2Props } from "./v2/TextDemoReelV2";
import type { ImageDemoReelV2Props } from "./v2/ImageDemoReelV2";
import type { VoiceDemoReelV2Props } from "./v2/VoiceDemoReelV2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTRY_POINT = path.join(__dirname, "index.ts");
// Static assets (Tondo fonts) live in apps/chunky-crayon-worker/public/ —
// two levels up from src/video/. Remotion's bundler serves this directory
// at the root of its internal HTTP server, so `staticFile('/fonts/foo.ttf')`
// resolves to `http://localhost:<bundle-port>/fonts/foo.ttf`.
const PUBLIC_DIR = path.resolve(__dirname, "../../public");

// Workspace packages (e.g. @one-colored-pixel/canvas) emit ESM dist with
// extensionless relative imports. Webpack 5 in strict ESM mode rejects
// these with "Did you mean 'floodFill.js'?". The remotion.config.ts has the
// same override, but that's only loaded by the Remotion CLI — programmatic
// bundle() calls need it threaded through explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webpackOverride = (current: any) => ({
  ...current,
  module: {
    ...current.module,
    rules: [
      ...(current.module?.rules ?? []),
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
    ],
  },
});

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
  console.log("[render] bundling...");
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    webpackOverride,
  });
  console.log(`[render] bundled: ${bundleLocation}`);

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

// ─── V2 reel renderers ─────────────────────────────────────────────────
//
// All three V2 variants share the same render shape — only the composition
// id and inputProps shape differ. The bundle is the same Root.tsx so the
// `bundle()` call resolves to the same artifact across renders (cached
// after first call inside this process).
//
// Render time is dominated by the canvas-reveal section (~8s of video,
// each frame redraws ~576 brush stamps). Expect ~60-120s wall clock per
// reel on the Hetzner box.

export type RenderTextReelV2Options = TextDemoReelV2Props & {
  outputPath: string;
  durationInFrames: number;
  fps: number;
};

export async function renderTextDemoReelV2(
  opts: RenderTextReelV2Options,
): Promise<string> {
  return renderV2Composition({
    compositionId: "TextDemoReelV2",
    inputProps: opts as unknown as Record<string, unknown>,
    outputPath: opts.outputPath,
  });
}

export type RenderImageReelV2Options = ImageDemoReelV2Props & {
  outputPath: string;
  durationInFrames: number;
  fps: number;
};

export async function renderImageDemoReelV2(
  opts: RenderImageReelV2Options,
): Promise<string> {
  return renderV2Composition({
    compositionId: "ImageDemoReelV2",
    inputProps: opts as unknown as Record<string, unknown>,
    outputPath: opts.outputPath,
  });
}

export type RenderVoiceReelV2Options = VoiceDemoReelV2Props & {
  outputPath: string;
  durationInFrames: number;
  fps: number;
};

export async function renderVoiceDemoReelV2(
  opts: RenderVoiceReelV2Options,
): Promise<string> {
  return renderV2Composition({
    compositionId: "VoiceDemoReelV2",
    inputProps: opts as unknown as Record<string, unknown>,
    outputPath: opts.outputPath,
  });
}

// Internal — shared render path for all V2 comps. Bundles once, selects
// the requested composition, renders to mp4. Includes a fixture-load
// warmup window because V2 reels do `delayRender` while fetching the
// region store + svg over HTTP.
async function renderV2Composition(args: {
  compositionId: "TextDemoReelV2" | "ImageDemoReelV2" | "VoiceDemoReelV2";
  inputProps: Record<string, unknown>;
  outputPath: string;
}): Promise<string> {
  const { compositionId, inputProps, outputPath } = args;

  console.log(`[render:v2:${compositionId}] bundling…`);
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    webpackOverride,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
    // V2 comps fetch the region store binary + SVG inside delayRender;
    // give them a generous window before the renderer gives up.
    timeoutInMilliseconds: 180_000,
  });

  console.log(`[render:v2:${compositionId}] composition resolved:`, {
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    // Same generous timeout for the actual render — 480-frame voice reels
    // at 30fps with delayRender at the start can push past 2min.
    timeoutInMilliseconds: 300_000,
    onBrowserLog: ({ type, text }) => {
      if (type === "error" || type === "warning") {
        console.log(`[remotion-browser:${type}] ${text}`);
      }
    },
  });

  console.log(`[render:v2:${compositionId}] wrote ${outputPath}`);
  return outputPath;
}

export type RenderImageDemoReelOptions = ImageDemoReelProps & {
  outputPath: string;
};

/**
 * Render the ImageDemoReel composition to an mp4 file. Mirrors
 * renderDemoReel — only the composition id and prop shape differ.
 */
export async function renderImageDemoReel(
  opts: RenderImageDemoReelOptions,
): Promise<string> {
  console.log("[render-image] bundling...");
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    webpackOverride,
  });
  console.log(`[render-image] bundled: ${bundleLocation}`);

  console.log("[render-image] inputProps:", {
    durationInFrames: opts.durationInFrames,
    uploadDurationFrames: opts.uploadDurationFrames,
    revealDurationFrames: opts.revealDurationFrames,
    hasPdfPreview: !!opts.pdfPreviewUrl,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ImageDemoReel",
    inputProps: opts,
    timeoutInMilliseconds: 120_000,
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

// ─── Content reel renderer ─────────────────────────────────────────────
//
// Picks one of ContentReelShockSpike / WarmSpike / QuietSpike based on
// the reel's category-derived template, threads the voice + music URLs
// through, renders to mp4. The composition's calculateMetadata expands
// durationInFrames from the voice clip lengths so callers don't need to
// pre-compute it.
//
// PlasmaShader needs WebGL inside Chromium → chromiumOptions: { gl:
// 'angle' }. Without this, the second frame blacks out.

export type RenderContentReelOptions = {
  template: "shock" | "warm" | "quiet";
  reel: Record<string, unknown>;
  hookVoiceUrl: string;
  hookVoiceSeconds: number;
  payoffVoiceUrl: string;
  payoffVoiceSeconds: number;
  backgroundMusicUrl?: string;
  outputPath: string;
};

const CONTENT_REEL_COMPOSITION_ID = {
  shock: "ContentReelShockSpike",
  warm: "ContentReelWarmSpike",
  quiet: "ContentReelQuietSpike",
} as const;

export async function renderContentReel(
  opts: RenderContentReelOptions,
): Promise<string> {
  const compositionId = CONTENT_REEL_COMPOSITION_ID[opts.template];
  const inputProps = {
    reel: opts.reel,
    hookVoiceUrl: opts.hookVoiceUrl,
    hookVoiceSeconds: opts.hookVoiceSeconds,
    payoffVoiceUrl: opts.payoffVoiceUrl,
    payoffVoiceSeconds: opts.payoffVoiceSeconds,
    backgroundMusicUrl: opts.backgroundMusicUrl,
  } satisfies Record<string, unknown>;

  console.log(`[render:content-reel:${compositionId}] bundling…`);
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    publicDir: PUBLIC_DIR,
    webpackOverride,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
    timeoutInMilliseconds: 120_000,
  });

  console.log(`[render:content-reel:${compositionId}] composition resolved:`, {
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: opts.outputPath,
    inputProps,
    timeoutInMilliseconds: 240_000,
    chromiumOptions: { gl: "angle" },
    onBrowserLog: ({ type, text }) => {
      if (type === "error" || type === "warning") {
        console.log(`[remotion-browser:${type}] ${text}`);
      }
    },
  });

  console.log(
    `[render:content-reel:${compositionId}] wrote ${opts.outputPath}`,
  );
  return opts.outputPath;
}
