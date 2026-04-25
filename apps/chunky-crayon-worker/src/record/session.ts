import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type RecordSessionOptions = {
  /** The prompt to type into the create form. Every run drives the full flow. */
  prompt: string;
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
   * Per-character delay when typing the prompt (ms). Slower = more natural.
   */
  typingDelayMs?: number;
  /**
   * Called once the image has been created and we have its ID (right after
   * redirect to /coloring-image/:id). Fire-and-forget — the recording
   * continues independently. Use this to trigger region-store generation
   * on CC so it runs in parallel with the line-art / canvas-sizing waits.
   */
  onImageCreated?: (imageId: string) => void;
};

/**
 * Timestamps (ms from recording start) marking each phase of the flow.
 * These drive Remotion's per-section playback rate so we can fast-forward
 * the boring generation wait while keeping typing + reveal at 1×.
 */
export type FlowMarkers = {
  typeStartMs: number;
  submitMs: number;
  redirectMs: number;
  brushReadyMs: number;
  sweepDoneMs: number;
};

export type RecordSessionResult = {
  webmPath: string;
  durationMs: number;
  imageId: string;
  flowMarkers: FlowMarkers;
  /** JPEG bytes of the finished canvas (line art + Magic Brush colours
   *  composited as the user sees them). Used as the social-reel cover. */
  coverJpeg?: Buffer;
  /** PNG bytes of the PDF's first page — the printable coloring page with
   *  QR code and footer text. Shown in the reel's PDF preview section. */
  pdfPreviewPng?: Buffer;
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
  // default. Raise the floor generously — our slowest stage (magic colors prep
  // on a fresh image) can take 3–4 min on a cold worker.
  page.setDefaultTimeout(5 * 60_000);

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

  let imageId = "";
  let coverJpeg: Buffer | undefined;
  let pdfPreviewPng: Buffer | undefined;
  let recordingError: unknown;
  const flowMarkers: Partial<FlowMarkers> = {};

  const log = (msg: string) => console.log(`[record] ${msg}`);
  const phaseStart = Date.now();
  const elapsed = () => ((Date.now() - phaseStart) / 1000).toFixed(1);

  try {
    // ── 1. Homepage → create form ────────────────────────────────────────
    log(`navigating to ${opts.origin}/en`);
    await page.goto(`${opts.origin}/en`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    log(`homepage loaded (${elapsed()}s)`);

    log(
      "waiting for create-prompt textarea (60s — dev first-compile can be slow)",
    );
    const promptInput = page.getByTestId("create-prompt").first();
    await promptInput.waitFor({ state: "visible", timeout: 60_000 });
    await promptInput.click();
    log("create-prompt focused");

    flowMarkers.typeStartMs = Date.now() - start;
    log(
      `typing prompt (${opts.prompt.length} chars @ ${opts.typingDelayMs ?? 80}ms/char)`,
    );
    await promptInput.type(opts.prompt, {
      delay: opts.typingDelayMs ?? 80,
    });
    log(`typing done (${elapsed()}s)`);

    // Tiny pause so the viewer reads the typed text before we hit submit.
    await page.waitForTimeout(800);

    // ── 2. Submit → wait for redirect to coloring page ───────────────────
    flowMarkers.submitMs = Date.now() - start;
    log("clicking submit button");
    const submitBtn = page.getByTestId("create-submit").first();
    await submitBtn.click();
    log("submit clicked — waiting for redirect to /coloring-image/*");

    await page.waitForURL(/\/coloring-image\/[a-z0-9]+/, {
      timeout: 180_000,
    });
    flowMarkers.redirectMs = Date.now() - start;
    const url = page.url();
    const match = url.match(/\/coloring-image\/([a-z0-9]+)/);
    if (!match) throw new Error(`Could not extract image id from URL: ${url}`);
    imageId = match[1];
    log(`redirected to image ${imageId} (${elapsed()}s since submit)`);

    if (opts.onImageCreated) {
      opts.onImageCreated(imageId);
    }

    // ── 3. Wait for line art to paint ────────────────────────────────────
    log("waiting for line art canvas to paint");
    await waitForLineArt(page);
    log(`line art painted (${elapsed()}s)`);

    // ── 4. Wait for drawing canvas to be sized ───────────────────────────
    // Critical: canvas starts at 300×150 (HTML default) until the image loads.
    // The region-store pre-coloured canvas effect reads drawingCanvas.width/
    // height at mount time — if we activate magic-brush before the canvas has
    // been resized, the effect builds a tiny 300×150 mask and every subsequent
    // stroke falls through to the legacy black-crayon fallback path. Manual
    // users don't hit this because they take a couple seconds to click before
    // stroking.
    log("waiting for drawing canvas to be sized (>400×400)");
    await page.waitForFunction(
      () => {
        const canvases = document.querySelectorAll("canvas");
        if (canvases.length < 2) return false;
        const drawing = canvases[0] as HTMLCanvasElement;
        return drawing.width > 400 && drawing.height > 400;
      },
      { timeout: 30_000, polling: 500 },
    );
    const canvasDims = await page.evaluate(() => {
      const d = document.querySelectorAll("canvas")[0] as HTMLCanvasElement;
      return { w: d.width, h: d.height };
    });
    log(`drawing canvas sized: ${canvasDims.w}×${canvasDims.h}`);

    // ── 4b. Wait for region store to land ────────────────────────────────
    // ColoringArea polls the DB after mount and calls router.refresh()
    // when the post-create pipeline has finished backfilling regionMapUrl.
    // After refresh the ImageCanvas effect rebuilds the pre-coloured
    // canvas at full size. We MUST wait for that — falling through to
    // the legacy reveal path triggers CC's "Mixing the magic colours!"
    // modal which (a) can hang for minutes while server-side fill-points
    // gen fails, (b) sits over the canvas so the sweep paints nothing,
    // (c) is visible in the final reel to viewers. None of that is
    // acceptable.
    //
    // Fail HARD if region store never arrives. The worker runs its own
    // in-process gen (typically ~90-180s, up to 4min on complex images)
    // so a 15-min wait is plenty of slack. If we still don't see it,
    // something is genuinely broken upstream and we should surface the
    // error, not ship a bad reel.
    log("waiting for region store to hydrate (preColoured canvas >= 400px)");
    const regionReady = await waitForRegionStoreReady(page, 15 * 60_000);
    if (!regionReady) {
      throw new Error(
        "Region store never landed after 15min wait — refusing to fall through to legacy reveal path (it shows the 'Mixing the magic colours' modal in the final reel). Check worker logs for [region-store] saved/failed, and CC prod for checkRegionStoreReady results.",
      );
    }
    log(`region store ready — preColoured canvas built at ${regionReady}`);

    // ── 5. Capture blank PDF (before sweep — canvas is still empty) ──────
    // Click the Print/Download button while the canvas has no colours. The
    // PDF shows the blank line art + QR code + footer — exactly what a
    // parent would print out for their kid. This happens in the "dead time"
    // between region-store-ready and brush selection, which gets trimmed
    // out of the final video, so viewers never see the click.
    //
    // NOTE: pdf-to-img uses pdfjs-dist which MUST NOT be hoisted into
    // the root node_modules — it conflicts with Remotion's webpack
    // bundler (RangeError in Array allocation). pdf-to-img is installed
    // in an isolated dir (/opt/pdf-tools/) on the box, and we run the
    // conversion via a subprocess so its deps don't touch the monorepo.
    //
    // LOCAL DEV: /opt/pdf-tools/ doesn't exist on your laptop. The
    // subprocess will fail with ENOENT but it's inside a try/catch
    // marked (non-fatal) so the reel still renders — just without the
    // PDF preview frame. To enable locally:
    //   mkdir -p /opt/pdf-tools && cd /opt/pdf-tools
    //   npm init -y && npm i pdf-to-img
    //   cp <repo>/apps/chunky-crayon-worker/src/scripts/pdf-to-png.mjs .
    //
    // HETZNER BOX SETUP (one-time, already done):
    //   mkdir -p /opt/pdf-tools && cd /opt/pdf-tools && npm init -y && npm i pdf-to-img
    //   The deploy workflow copies pdf-to-png.mjs there on each deploy.
    try {
      log("clicking Print button to capture blank PDF");
      const printBtn = page.locator('button[aria-label="Print"]').first();
      const btnVisible = await printBtn.isVisible().catch(() => false);
      if (btnVisible) {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 30_000 }),
          printBtn.click(),
        ]);
        const pdfPath = resolve(opts.outDir, `${Date.now()}-print.pdf`);
        await download.saveAs(pdfPath);
        log(`blank PDF intercepted: ${pdfPath}`);

        const pngPath = pdfPath.replace(".pdf", ".png");
        const { execFileSync } = await import("node:child_process");
        // The script lives IN /opt/pdf-tools/ (alongside its own
        // node_modules) so ESM resolves pdf-to-img from there, not
        // from the monorepo's hoisted tree.
        const output = execFileSync(
          "node",
          ["/opt/pdf-tools/pdf-to-png.mjs", pdfPath, pngPath],
          {
            timeout: 30_000,
            encoding: "utf-8",
          },
        );
        log(`PDF→PNG: ${output.trim()}`);

        const { readFile: readFileAsync } = await import("node:fs/promises");
        pdfPreviewPng = await readFileAsync(pngPath);
        log(`blank PDF converted to PNG (${pdfPreviewPng.byteLength} bytes)`);
      } else {
        log("Print button not visible — skipping PDF capture");
      }
    } catch (err) {
      console.warn(
        "[record] PDF capture failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }

    // ── 6. Activate Magic Brush + pick size ──────────────────────────────
    log("selecting Magic Brush (first time)");
    await selectMagicBrush(page);
    log("selecting large brush size");
    await selectLargeBrush(page);
    await page.waitForTimeout(400);

    // ── 6. Wait for magic-colors prep to finish ──────────────────────────
    // First time on a fresh image, the magic-colors palette has to be prepared
    // server-side. The page shows a "Mixing the magic colors!" overlay
    // (testid="magic-colors-loading"). Wait for it to disappear before sweeping.
    log("waiting for magic-colors modal to detach (server-side prep)");
    await waitForMagicColorsReady(page);
    log(`magic-colors ready (${elapsed()}s since line art)`);

    // Re-select the brush: the modal-driven state transition can leave
    // activeTool in a stale state. Also give the client region store a beat
    // to hydrate after the modal detaches — otherwise the first strokes fire
    // before region queries work and the reveal falls back to the legacy
    // colour-map path. 2s is enough in practice; cheap insurance.
    log("re-selecting Magic Brush (after modal close)");
    await selectMagicBrush(page);
    await page.waitForTimeout(2000);
    // Final sanity check: aria-pressed on magic-reveal must be true right
    // before the sweep. If it's not, the whole sweep will draw black crayon.
    const preSweepState = await page.evaluate(() => {
      const btns = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-testid="tool-magic-reveal"]',
        ),
      );
      return btns.map((b) => ({
        ariaPressed: b.getAttribute("aria-pressed"),
        disabled: b.disabled,
      }));
    });
    log(`pre-sweep magic-reveal state: ${JSON.stringify(preSweepState)}`);
    const anyPressed = preSweepState.some((b) => b.ariaPressed === "true");
    if (!anyPressed) {
      throw new Error(
        `Magic Brush is NOT aria-pressed right before sweep — would produce black strokes. State: ${JSON.stringify(preSweepState)}`,
      );
    }
    flowMarkers.brushReadyMs = Date.now() - start;

    // ── 7. Sweep ─────────────────────────────────────────────────────────
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas has no bounding box");
    log(
      `canvas bounding box: x=${Math.round(box.x)} y=${Math.round(box.y)} ${Math.round(box.width)}×${Math.round(box.height)}`,
    );

    log(`starting ${sweep} sweep (yield=${sweepYieldMs}ms between strokes)`);
    if (sweep === "horizontal") {
      await sweepHorizontal(page, box, sweepYieldMs);
    } else {
      await sweepDiagonal(page, box, sweepYieldMs);
    }
    log(`sweep finished (${elapsed()}s)`);
    flowMarkers.sweepDoneMs = Date.now() - start;

    // Let the reveal worker drain any in-flight mask updates before we close.
    log("draining reveal worker (1.5s tail)");
    await page.waitForTimeout(1500);

    // ── 8. Capture the finished frame as the reel cover ──────────────────
    // Composite the drawing canvas (Magic Brush colours) under the image
    // canvas (line art) with multiply blend — same merge ImageCanvas
    // uses for save-to-gallery. Result is the exact picture the viewer
    // will see at the very end of the reel.
    try {
      log("capturing finished cover frame from canvases");
      const result = await page.evaluate(() => {
        const drawingCanvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-testid="drawing-canvas"]',
        );
        const imageCanvas = document.querySelector<HTMLCanvasElement>(
          'canvas[data-testid="image-canvas"]',
        );
        if (!drawingCanvas || !imageCanvas) {
          return {
            ok: false as const,
            reason: `missing canvas — drawing:${!!drawingCanvas} image:${!!imageCanvas}`,
          };
        }
        // Same recipe as ImageCanvas.getCompositeCanvas: white base,
        // drawing canvas (user colours) first, then line art on top
        // with multiply blend.
        const composite = document.createElement("canvas");
        composite.width = drawingCanvas.width;
        composite.height = drawingCanvas.height;
        const ctx = composite.getContext("2d");
        if (!ctx) return { ok: false as const, reason: "no 2d context" };
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, composite.width, composite.height);
        ctx.drawImage(drawingCanvas, 0, 0);
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(imageCanvas, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        return {
          ok: true as const,
          dataUrl: composite.toDataURL("image/jpeg", 0.92),
          drawingSize: `${drawingCanvas.width}×${drawingCanvas.height}`,
          imageSize: `${imageCanvas.width}×${imageCanvas.height}`,
        };
      });
      if (result.ok && result.dataUrl.startsWith("data:image/jpeg;base64,")) {
        coverJpeg = Buffer.from(
          result.dataUrl.slice("data:image/jpeg;base64,".length),
          "base64",
        );
        log(
          `cover frame captured (${coverJpeg.byteLength} bytes, drawing=${result.drawingSize} image=${result.imageSize})`,
        );
      } else if (!result.ok) {
        log(`cover frame capture skipped: ${result.reason}`);
      }
    } catch (err) {
      console.warn(
        "[record] cover frame capture failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }

    log("recording phase complete, closing browser");
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
        flowMarkers: flowMarkers as FlowMarkers,
        coverJpeg,
        pdfPreviewPng,
      };
    }
  }

  throw new Error("No recorded video was produced");
}

export async function waitForLineArt(page: Page): Promise<void> {
  console.log(
    "[record] waitForLineArt: waiting for first canvas to be visible",
  );
  await page
    .locator("canvas")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  console.log(
    "[record] waitForLineArt: canvas visible, polling image-canvas center pixel for alpha > 0 (180s budget)",
  );
  await page.waitForTimeout(2000);

  // Poll for paint. Sample the canvas densely — a full row and column strip
  // at the image's center. Single-point and even 3×3 grid can all fall on
  // blank paper for sparse line art. If ANY of the sampled pixels along
  // those two crosshair strips has non-zero alpha, we're satisfied.
  try {
    await page.waitForFunction(
      () => {
        const canvases = document.querySelectorAll("canvas");
        if (canvases.length < 2) return false;
        const img = canvases[1] as HTMLCanvasElement;
        const ctx = img.getContext("2d");
        if (!ctx || img.width === 0) return false;
        const w = img.width;
        const h = img.height;
        try {
          // Middle row + middle column strips.
          const rowData = ctx.getImageData(0, Math.floor(h / 2), w, 1).data;
          for (let i = 3; i < rowData.length; i += 4) {
            if (rowData[i] > 0) return true;
          }
          const colData = ctx.getImageData(Math.floor(w / 2), 0, 1, h).data;
          for (let i = 3; i < colData.length; i += 4) {
            if (colData[i] > 0) return true;
          }
        } catch {
          return false;
        }
        return false;
      },
      { timeout: 180_000, polling: 500 },
    );
  } catch (err) {
    const diag = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("canvas")).map((c, i) => {
        const r = c.getBoundingClientRect();
        const ctx = c.getContext("2d");
        let centerAlpha: number | null = null;
        let anyPainted = false;
        try {
          if (ctx && c.width > 0 && c.height > 0) {
            const cx = Math.floor(c.width / 2);
            const cy = Math.floor(c.height / 2);
            centerAlpha = ctx.getImageData(cx, cy, 1, 1).data[3];
            // Sample a 3×3 grid to see if ANY point has paint.
            for (let dy = 0; dy < 3 && !anyPainted; dy++) {
              for (let dx = 0; dx < 3 && !anyPainted; dx++) {
                const px = Math.floor((c.width * (dx + 1)) / 4);
                const py = Math.floor((c.height * (dy + 1)) / 4);
                if (ctx.getImageData(px, py, 1, 1).data[3] > 0) {
                  anyPainted = true;
                }
              }
            }
          }
        } catch {
          centerAlpha = -1;
        }
        return {
          index: i,
          intrinsic: { w: c.width, h: c.height },
          cssRect: { w: Math.round(r.width), h: Math.round(r.height) },
          centerAlpha,
          anyPaintedIn3x3Grid: anyPainted,
        };
      });
    });
    console.error(
      `[record] waitForLineArt TIMEOUT — canvas diag:\n${JSON.stringify(diag, null, 2)}`,
    );
    throw err;
  }

  console.log("[record] waitForLineArt: line art painted");
  await page.waitForTimeout(600);
}

/**
 * Wait for the ImageCanvas pre-coloured canvas to be built at full size.
 * That log fires inside the ImageCanvas effect at line ~1144 of
 * packages/coloring-ui/src/ImageCanvas.tsx when regionStore.isReady becomes
 * true. If dimensions are < 400, it's the stale 300×150 default and doesn't
 * count. Returns the "{w}×{h}" string on success, or null on timeout.
 */
export async function waitForRegionStoreReady(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolvePromise) => {
    const rx = /\[ImageCanvas\] Pre-coloured canvas built:\s*(\d+)×(\d+)/;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      page.off("console", onConsole);
      resolvePromise(null);
    }, timeoutMs);
    const onConsole = (msg: import("playwright").ConsoleMessage) => {
      const m = msg.text().match(rx);
      if (!m) return;
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      if (w < 400 || h < 400) return; // stale default, keep waiting
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      page.off("console", onConsole);
      resolvePromise(`${w}×${h}`);
    };
    page.on("console", onConsole);
  });
}

export async function selectMagicBrush(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="tool-magic-reveal"]'),
    { timeout: 15_000, polling: 250 },
  );
  const buttonCount = await page.evaluate(
    () => document.querySelectorAll('[data-testid="tool-magic-reveal"]').length,
  );
  console.log(
    `[record] selectMagicBrush: found ${buttonCount} tool-magic-reveal button(s)`,
  );

  for (let attempt = 0; attempt < 20; attempt++) {
    const state = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-testid="tool-magic-reveal"]',
        ),
      );
      buttons.forEach((b) => b.click());
      return {
        pressed: buttons.some((b) => b.getAttribute("aria-pressed") === "true"),
        details: buttons.map((b) => ({
          ariaPressed: b.getAttribute("aria-pressed"),
          disabled: b.disabled,
        })),
      };
    });
    if (state.pressed) {
      if (attempt > 0) {
        console.log(
          `[record] selectMagicBrush: activated on attempt ${attempt + 1}`,
        );
      } else {
        console.log("[record] selectMagicBrush: activated");
      }
      return;
    }
    console.log(
      `[record] selectMagicBrush attempt ${attempt + 1}/20 not pressed yet: ${JSON.stringify(state.details)}`,
    );
    await page.waitForTimeout(300);
  }
  throw new Error("Magic Brush failed to activate after 20 attempts");
}

export async function waitForMagicColorsReady(page: Page): Promise<void> {
  // The overlay only mounts AFTER the magic tool is active. Give the page a
  // moment for it to appear if it's going to, then poll until it's gone.
  await page.waitForTimeout(800);
  const modalPresent = await page.evaluate(
    () => !!document.querySelector('[data-testid="magic-colors-loading"]'),
  );
  console.log(
    `[record] magic-colors modal ${modalPresent ? "detected — waiting for it to detach" : "not present (already prepared?)"}`,
  );
  if (!modalPresent) return;

  const start = Date.now();
  try {
    await page
      .locator('[data-testid="magic-colors-loading"]')
      .waitFor({ state: "detached", timeout: 5 * 60_000 });
  } catch (err) {
    // Fail HARD if the modal never detaches — it means server-side prep
    // (fill points, color map etc.) failed/timed out on CC. Continuing
    // and sweeping anyway produces a blank reel: the modal covers the
    // canvas so the sweep never hits it and nothing paints. Better to
    // fail the whole run so the caller can retry.
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    throw new Error(
      `magic-colors modal never detached after ${elapsed}s — server-side prep stuck. Root cause likely upstream (region-store gen or fill-points endpoint). Original: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  console.log(
    `[record] magic-colors modal detached after ${((Date.now() - start) / 1000).toFixed(1)}s`,
  );
}

export async function selectLargeBrush(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="brush-size-large"]')
      .forEach((el) => el.click());
  });
}

export async function sweepHorizontal(
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
  console.log(
    `[record] horizontal sweep: ${rows} rows, ${Math.round(rowHeight)}px apart`,
  );

  for (let r = 0; r < rows; r++) {
    const y = y0 + r * rowHeight;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(x1, y, { steps: 50 });
    await page.mouse.up();
    if ((r + 1) % 5 === 0 || r === rows - 1) {
      console.log(
        `[record]   horizontal row ${r + 1}/${rows}  y=${Math.round(y)}`,
      );
    }
    if (yieldMs > 0) await page.waitForTimeout(yieldMs);
  }
}

export async function sweepDiagonal(
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
  console.log(
    `[record] diagonal sweep: ~${totalStrokes} strokes, step=${strokeStep}px across ${W}×${H} canvas`,
  );

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
