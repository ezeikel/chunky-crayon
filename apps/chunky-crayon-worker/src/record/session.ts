import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type RecordSessionOptions = {
  /**
   * Coloring image id to navigate to (must be backfilled with region store).
   * In createFlow mode this is ignored — we use whatever id comes back from
   * the actual generation.
   */
  imageId?: string;
  /** Origin of the CC web app, e.g. "https://chunkycrayon.com" or "http://localhost:3000". */
  origin: string;
  /** Directory where the final webm should land (created if needed). */
  outDir: string;
  /** Output filename (without extension). Defaults to a timestamp. */
  outName?: string;
  /** "diagonal" (default) or "horizontal". */
  sweep?: "diagonal" | "horizontal";
  /**
   * Pause between strokes in ms. Defaults to 0. Raise if the reveal worker
   * ever stalls — but note the mid-sweep clipping we spent ages debugging was
   * NOT a perf issue, it was a canvas-size race fixed by the pre-sweep
   * drawing-canvas size wait.
   */
  sweepYieldMs?: number;
  /**
   * If set, drive the full /create flow: type the prompt, submit, wait for
   * redirect, then do the reveal. Otherwise navigate directly to imageId.
   */
  createFlow?: { prompt: string };
  /**
   * Per-character delay when typing the prompt (ms). Slower = more natural.
   */
  typingDelayMs?: number;
};

export type FlowMarkers = {
  /** ms from recording start when prompt typing began. */
  typeStartMs?: number;
  /** ms when "Create" was clicked. */
  submitMs?: number;
  /** ms when redirect to /coloring-image landed. */
  redirectMs?: number;
  /** ms when line art finished painting and brush activated. */
  brushReadyMs?: number;
  /** ms when the sweep finished. */
  sweepDoneMs?: number;
};

export type RecordSessionResult = {
  webmPath: string;
  durationMs: number;
  imageId: string;
  flowMarkers: FlowMarkers;
};

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

/**
 * Drive the Chunky Crayon coloring page via Playwright to produce a screen
 * recording of the Magic Brush revealing a colored panda/scene. Returns the
 * path to a finished webm ready for Remotion to composite.
 */
export async function recordColoringSession(
  opts: RecordSessionOptions,
): Promise<RecordSessionResult> {
  const start = Date.now();
  const sweep = opts.sweep ?? "diagonal";
  const sweepYieldMs = opts.sweepYieldMs ?? 0;
  const outName = opts.outName ?? `record-${start}`;
  await mkdir(opts.outDir, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    screen: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    recordVideo: {
      dir: opts.outDir,
      size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    },
    deviceScaleFactor: 1,
  });

  // Pre-mute audio + wipe persisted coloring progress before page scripts run.
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("chunky-crayon-muted", "true");
      localStorage.setItem("chunky-crayon-sfx-muted", "true");
      localStorage.setItem("chunky-crayon-ambient-muted", "true");
    } catch {}
  });

  const page: Page = await context.newPage();
  await page.setViewportSize({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
  // Long-running flows (image gen, magic-colors prep) exceed the 30s Playwright
  // default. Raise the floor for every call that doesn't pass its own timeout.
  page.setDefaultTimeout(120_000);

  // Mirror browser console to the worker log so we can see what the reveal
  // worker is doing mid-sweep — errors, warnings, or abrupt silence all tell us
  // something.
  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning" || t === "log") {
      console.log(`[browser:${t}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[browser:pageerror] ${err.message}`);
  });
  page.on("crash", () => console.log("[browser:crash] page crashed"));
  page.on("close", () => console.log("[browser:close] page closed"));

  const flowMarkers: FlowMarkers = {};
  let imageId = opts.imageId ?? "";
  let recordingError: unknown;

  try {
    if (opts.createFlow) {
      // Full flow: homepage → type prompt → submit → wait for redirect.
      // The create form lives on the locale homepage, not at /create.
      await page.goto(`${opts.origin}/en`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      const promptInput = page.getByTestId("create-prompt").first();
      await promptInput.waitFor({ state: "visible", timeout: 15_000 });
      await promptInput.click();

      flowMarkers.typeStartMs = Date.now() - start;
      await promptInput.type(opts.createFlow.prompt, {
        delay: opts.typingDelayMs ?? 80,
      });

      // Tiny pause so the viewer reads the typed text before we hit submit.
      await page.waitForTimeout(800);

      flowMarkers.submitMs = Date.now() - start;
      const submitBtn = page.getByTestId("create-submit").first();
      await submitBtn.click();

      // Wait for the server action to redirect us to the coloring page.
      // Generation can take 30–90s, so be generous.
      await page.waitForURL(/\/coloring-image\/[a-z0-9]+/, {
        timeout: 180_000,
      });
      flowMarkers.redirectMs = Date.now() - start;
      const url = page.url();
      const match = url.match(/\/coloring-image\/([a-z0-9]+)/);
      if (!match)
        throw new Error(`Could not extract image id from URL: ${url}`);
      imageId = match[1];
    } else {
      if (!opts.imageId)
        throw new Error("imageId is required when createFlow is not set");
      await page.goto(`${opts.origin}/en/coloring-image/${opts.imageId}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }

    await waitForLineArt(page);
    // Critical: wait for the drawing canvas to be sized (it starts at the HTML
    // default 300×150 until the image loads). The region-store pre-coloured
    // canvas effect reads drawingCanvas.width/height at mount time — if we
    // activate magic-brush before the canvas has been resized, the effect
    // builds a tiny 300×150 mask and every subsequent stroke falls through
    // to the legacy black-crayon fallback path. Manual users don't hit this
    // because they take a couple seconds to click before stroking.
    await page.waitForFunction(
      () => {
        const canvases = document.querySelectorAll("canvas");
        if (canvases.length < 2) return false;
        const drawing = canvases[0] as HTMLCanvasElement;
        return drawing.width > 400 && drawing.height > 400;
      },
      { timeout: 30_000, polling: 500 },
    );
    console.log("[record] drawing canvas sized correctly");
    await selectMagicBrush(page);
    await selectLargeBrush(page);
    await page.waitForTimeout(400);

    // First time on a fresh image, the magic-colors palette has to be prepared
    // server-side. The page shows a "Mixing the magic colors!" overlay
    // (testid="magic-colors-loading"). Wait for it to disappear before sweeping.
    // Generation can take several minutes, so be generous.
    await waitForMagicColorsReady(page);

    // Re-select the brush: the modal-driven state transition can leave
    // activeTool in a stale state. Also give the client region store a beat
    // to hydrate after the modal detaches — otherwise the first strokes fire
    // before region queries work and the reveal falls back to the legacy
    // colour-map path. 2s is enough in practice; cheap insurance.
    await selectMagicBrush(page);
    await page.waitForTimeout(2000);
    flowMarkers.brushReadyMs = Date.now() - start;

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas has no bounding box");

    console.log(`[record] starting ${sweep} sweep (yield=${sweepYieldMs}ms)`);
    if (sweep === "horizontal") {
      await sweepHorizontal(page, box, sweepYieldMs);
    } else {
      await sweepDiagonal(page, box, sweepYieldMs);
    }
    console.log("[record] sweep finished");
    flowMarkers.sweepDoneMs = Date.now() - start;

    // Let the reveal worker drain any in-flight mask updates before we close.
    await page.waitForTimeout(1500);
  } catch (err) {
    recordingError = err;
    console.error("[record] error during session:", err);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (recordingError) {
      // Re-throw AFTER cleanup so callers see the real failure instead of a
      // misleading partial-OK result.
      throw recordingError;
    }

    if (video) {
      const srcPath = await video.path();
      const finalPath = resolve(opts.outDir, `${outName}.webm`);
      await mkdir(dirname(finalPath), { recursive: true });
      await rename(srcPath, finalPath);
      // eslint-disable-next-line no-unsafe-finally
      return {
        webmPath: finalPath,
        durationMs: Date.now() - start,
        imageId,
        flowMarkers,
      };
    }
  }

  throw new Error("No recorded video was produced");
}

async function waitForLineArt(page: Page): Promise<void> {
  console.log("[record] waitForLineArt: waiting for canvas to be visible");
  await page
    .locator("canvas")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  console.log(
    "[record] waitForLineArt: canvas visible, polling for paint (90s budget)",
  );
  await page.waitForTimeout(2000);
  await page.waitForFunction(
    () => {
      const canvases = document.querySelectorAll("canvas");
      if (canvases.length < 2) return false;
      const img = canvases[1] as HTMLCanvasElement;
      const ctx = img.getContext("2d");
      if (!ctx || img.width === 0) return false;
      const data = ctx.getImageData(img.width / 2, img.height / 2, 1, 1).data;
      return data[3] > 0;
    },
    { timeout: 180_000, polling: 500 },
  );
  console.log("[record] waitForLineArt: line art painted");
  await page.waitForTimeout(600);
}

async function selectMagicBrush(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="tool-magic-reveal"]'),
    { timeout: 15_000, polling: 250 },
  );

  for (let attempt = 0; attempt < 20; attempt++) {
    const pressed = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-testid="tool-magic-reveal"]',
        ),
      );
      buttons.forEach((b) => b.click());
      return buttons.some((b) => b.getAttribute("aria-pressed") === "true");
    });
    if (pressed) return;
    await page.waitForTimeout(300);
  }
  throw new Error("Magic Brush failed to activate");
}

async function waitForMagicColorsReady(page: Page): Promise<void> {
  // The overlay only mounts AFTER the magic tool is active. Give the page a
  // moment for it to appear if it's going to, then poll until it's gone.
  await page.waitForTimeout(800);
  await page
    .locator('[data-testid="magic-colors-loading"]')
    .waitFor({ state: "detached", timeout: 5 * 60_000 })
    .catch(() => {
      // If the overlay never appeared (image already had a region store
      // cached) the locator is already detached and waitFor resolves
      // immediately. Anything else is a real timeout — let the caller know.
    });
}

async function selectLargeBrush(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="brush-size-large"]')
      .forEach((el) => el.click());
  });
}

async function sweepHorizontal(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
  yieldMs: number,
): Promise<void> {
  const padding = 8;
  const x0 = box.x + padding;
  const x1 = box.x + box.width - padding;
  const y0 = box.y + padding;
  const y1 = box.y + box.height - padding;
  const rows = 32;
  const rowHeight = (y1 - y0) / (rows - 1);

  for (let r = 0; r < rows; r++) {
    const y = y0 + r * rowHeight;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(x1, y, { steps: 50 });
    await page.mouse.up();
    if (yieldMs > 0) await page.waitForTimeout(yieldMs);
  }
}

async function sweepDiagonal(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
  yieldMs: number,
): Promise<void> {
  const padding = 8;
  const x0 = box.x + padding;
  const x1 = box.x + box.width - padding;
  const y0 = box.y + padding;
  const y1 = box.y + box.height - padding;
  const W = x1 - x0;
  const H = y1 - y0;

  const strokeStep = 32;
  const totalStrokes = Math.ceil((W + H) / strokeStep);

  for (let i = 0; i < totalStrokes; i++) {
    const d = i * strokeStep;
    const startX = d <= H ? x0 : x0 + (d - H);
    const startY = d <= H ? y0 + d : y1;
    const endX = d <= W ? x0 + d : x1;
    const endY = d <= W ? y0 : y0 + (d - W);
    if (Math.hypot(endX - startX, endY - startY) < 10) continue;

    const flip = i % 2 === 1;
    const a = flip ? [endX, endY] : [startX, startY];
    const b = flip ? [startX, startY] : [endX, endY];

    await page.mouse.move(a[0], a[1]);
    await page.mouse.down();
    await page.mouse.move(b[0], b[1], { steps: 30 });
    await page.mouse.up();
    if ((i + 1) % 5 === 0 || i === totalStrokes - 1) {
      console.log(`[record]   diagonal stroke ${i + 1}/${totalStrokes}`);
    }
    if (yieldMs > 0) await page.waitForTimeout(yieldMs);
  }
}
