import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { FlowMarkers, RecordSessionResult } from "./session.js";
import {
  selectLargeBrush,
  selectMagicBrush,
  sweepDiagonal,
  sweepHorizontal,
  waitForLineArt,
  waitForMagicColorsReady,
  waitForRegionStoreReady,
} from "./session.js";

export type RecordImageSessionOptions = {
  /** Public URL of the source photo (R2). We download it into the browser. */
  photoUrl: string;
  /** Origin of the CC web app, e.g. "https://chunkycrayon.com" or "http://localhost:3000". */
  origin: string;
  /** Directory where the final webm should land (created if needed). */
  outDir: string;
  /** Output filename (without extension). Defaults to a timestamp. */
  outName?: string;
  /** "diagonal" (default) or "horizontal". */
  sweep?: "diagonal" | "horizontal";
  /** Pause between strokes in ms. Defaults to 0. */
  sweepYieldMs?: number;
  /** Fired once the image has been created; mirrors session.ts contract. */
  onImageCreated?: (imageId: string) => void;
};

/**
 * Image-mode flow markers — same shape as text-mode so downstream trim
 * logic stays identical. We reuse `typeStartMs`/`submitMs` to mark the
 * **upload phase** boundaries so the trim helper doesn't need to branch.
 *
 *   typeStartMs  = clicking the "photo" input-mode tab
 *   submitMs     = the "Use This" button (processImage) click
 *   redirectMs   = redirect to /coloring-image/:id
 *   brushReadyMs = Magic Brush activated + ready to sweep
 *   sweepDoneMs  = sweep finished
 */
export type ImageFlowMarkers = FlowMarkers;

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

/**
 * Drive the Chunky Crayon image-upload coloring flow via Playwright and
 * produce a webm ready for Remotion's ImageDemoReel composition.
 *
 * The shape of the result mirrors `recordColoringSession` (text mode) so
 * the worker dispatcher can treat them interchangeably.
 */
export async function recordImageColoringSession(
  opts: RecordImageSessionOptions,
): Promise<RecordSessionResult> {
  const start = Date.now();
  const sweep = opts.sweep ?? "diagonal";
  const sweepYieldMs = opts.sweepYieldMs ?? 0;
  const outName = opts.outName ?? `image-record-${start}`;
  await mkdir(opts.outDir, { recursive: true });

  // Download the photo locally so we can setInputFiles() with a real path.
  const photoRes = await fetch(opts.photoUrl);
  if (!photoRes.ok) {
    throw new Error(`photo fetch failed: ${photoRes.status} ${opts.photoUrl}`);
  }
  const photoBuf = Buffer.from(await photoRes.arrayBuffer());
  const photoExt =
    opts.photoUrl.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i)?.[1] ?? "jpg";
  const photoPath = resolve(opts.outDir, `${start}-source.${photoExt}`);
  await writeFile(photoPath, photoBuf);

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
  page.setDefaultTimeout(5 * 60_000);

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

  const log = (msg: string) => console.log(`[image-record] ${msg}`);
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

    // Wait for the input-mode selector — it owns the photo-mode tab.
    log("waiting for input-mode selector");
    const photoModeButton = page.locator(
      '[role="tab"][aria-controls="image-input-panel"]',
    );
    await photoModeButton.waitFor({ state: "visible", timeout: 60_000 });

    // ── 2. Click the "photo" tab ─────────────────────────────────────────
    flowMarkers.typeStartMs = Date.now() - start;
    log("clicking photo mode tab");
    await photoModeButton.click();
    // Tiny hold so the tab-switch animation lands before the upload moment.
    await page.waitForTimeout(600);

    // ── 3. Upload the photo via the hidden file input ────────────────────
    // ImageInput renders two hidden inputs (camera + file picker). The
    // file-picker one is the second `<input type="file">` in the DOM
    // order (camera has `capture="environment"`). Use a locator that
    // specifically excludes the camera input so we don't trigger OS UI.
    log("setting file on hidden file-picker input");
    const fileInput = page.locator('input[type="file"]:not([capture])').first();
    await fileInput.setInputFiles(photoPath);
    log("file set — waiting for preview state");

    // The `state === 'preview'` UI shows a "Use This" button. Wait for it.
    const useThisButton = page
      .getByRole("button", { name: /use this/i })
      .first();
    await useThisButton.waitFor({ state: "visible", timeout: 30_000 });
    // Hold a beat so viewers can see the chosen photo.
    await page.waitForTimeout(1200);

    // ── 4. Click "Use This" → processImage() fires ────────────────────────
    flowMarkers.submitMs = Date.now() - start;
    log("clicking Use This");
    await useThisButton.click();

    // Wait for the AI-description "complete" card. Matches the `iSee`
    // bold phrase rendered once `state === 'complete' && aiDescription`.
    log("waiting for AI description card");
    await page
      .locator('[role="tabpanel"]#image-input-panel:has-text("I see")')
      .waitFor({ state: "visible", timeout: 60_000 });
    log(`AI description shown (${elapsed()}s since photo tab)`);

    // ── 5. Submit the form → redirect to /coloring-image/:id ─────────────
    // The global FormCTA Create button. aria-label matches the CC form.
    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Create")')
      .first();
    await submitBtn.waitFor({ state: "visible", timeout: 10_000 });
    await submitBtn.click();
    log("submit clicked — waiting for redirect");

    // Local dev: GPT Image 1.5 + post-processing can exceed 180s on a cold run
    // (we've seen 98s, 98s, and then >180s across runs). 5 min padding covers it
    // without noticeably slowing prod (where the fast path resolves in <90s).
    await page.waitForURL(/\/coloring-image\/[a-z0-9]+/, {
      timeout: 5 * 60_000,
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

    // ── 6. Wait for line art + region store + magic brush ───────────────
    // Identical to text-mode session.ts from this point. We import the
    // helpers inline to avoid duplicating the (fragile, carefully-tuned)
    // waits that the worker already relies on.
    log("waiting for line art canvas to paint");
    await waitForLineArt(page);
    log(`line art painted (${elapsed()}s)`);

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

    // Local dev polls the DB once per ~30s (slow Neon WebSocket cold-start)
    // so 25 polls can consume the 15min Hetzner-tuned budget before the
    // server-side region-store gen signals ready. Allow an env override and
    // default to 25min for image mode — the extra slack doesn't cost us on
    // prod (resolves on the first successful poll).
    const regionStoreTimeoutMs = parseInt(
      process.env.REGION_STORE_WAIT_MS ?? `${25 * 60_000}`,
      10,
    );
    log(
      `waiting for region store to hydrate (timeout=${Math.round(regionStoreTimeoutMs / 1000)}s)`,
    );
    const regionReady = await waitForRegionStoreReady(
      page,
      regionStoreTimeoutMs,
    );
    if (!regionReady) {
      throw new Error(
        `Region store never landed after ${Math.round(regionStoreTimeoutMs / 1000)}s — refusing to fall through to legacy reveal path.`,
      );
    }
    log(`region store ready — preColoured canvas built at ${regionReady}`);

    // ── 7. Capture blank PDF preview ─────────────────────────────────────
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
        const pngPath = pdfPath.replace(".pdf", ".png");
        const { execFileSync } = await import("node:child_process");
        const output = execFileSync(
          "node",
          ["/opt/pdf-tools/pdf-to-png.mjs", pdfPath, pngPath],
          { timeout: 30_000, encoding: "utf-8" },
        );
        log(`PDF→PNG: ${output.trim()}`);
        const { readFile: readFileAsync } = await import("node:fs/promises");
        pdfPreviewPng = await readFileAsync(pngPath);
      } else {
        log("Print button not visible — skipping PDF capture");
      }
    } catch (err) {
      console.warn(
        "[image-record] PDF capture failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }

    // ── 8. Magic Brush + sweep (same as text mode) ───────────────────────
    log("selecting Magic Brush");
    await selectMagicBrush(page);
    log("selecting large brush size");
    await selectLargeBrush(page);
    await page.waitForTimeout(400);

    log("waiting for magic-colors modal to detach");
    await waitForMagicColorsReady(page);

    log("re-selecting Magic Brush (after modal close)");
    await selectMagicBrush(page);
    await page.waitForTimeout(2000);
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
    const anyPressed = preSweepState.some((b) => b.ariaPressed === "true");
    if (!anyPressed) {
      throw new Error(
        `Magic Brush is NOT aria-pressed right before sweep: ${JSON.stringify(preSweepState)}`,
      );
    }
    flowMarkers.brushReadyMs = Date.now() - start;

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas has no bounding box");

    log(`starting ${sweep} sweep`);
    if (sweep === "horizontal") {
      await sweepHorizontal(page, box, sweepYieldMs);
    } else {
      await sweepDiagonal(page, box, sweepYieldMs);
    }
    log(`sweep finished (${elapsed()}s)`);
    flowMarkers.sweepDoneMs = Date.now() - start;

    await page.waitForTimeout(1500);

    // ── 9. Capture cover frame ───────────────────────────────────────────
    try {
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
        };
      });
      if (result.ok && result.dataUrl.startsWith("data:image/jpeg;base64,")) {
        coverJpeg = Buffer.from(
          result.dataUrl.slice("data:image/jpeg;base64,".length),
          "base64",
        );
      }
    } catch (err) {
      console.warn(
        "[image-record] cover frame capture failed (non-fatal):",
        err instanceof Error ? err.message : err,
      );
    }

    log("recording phase complete, closing browser");
  } catch (err) {
    recordingError = err;
    console.error("[image-record] error during session:", err);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (recordingError) {
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
      } satisfies RecordSessionResult;
    }
  }

  throw new Error("No recorded video was produced");
}
