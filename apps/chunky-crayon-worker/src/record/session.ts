import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type RecordSessionOptions = {
  /** Coloring image id to navigate to (must be backfilled with region store). */
  imageId: string;
  /** Origin of the CC web app, e.g. "https://chunkycrayon.com" or "http://localhost:3000". */
  origin: string;
  /** Directory where the final webm should land (created if needed). */
  outDir: string;
  /** Output filename (without extension). Defaults to a timestamp. */
  outName?: string;
  /** "diagonal" (default) or "horizontal". */
  sweep?: 'diagonal' | 'horizontal';
};

export type RecordSessionResult = {
  webmPath: string;
  durationMs: number;
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
  const sweep = opts.sweep ?? 'diagonal';
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
      localStorage.setItem('chunky-crayon-muted', 'true');
      localStorage.setItem('chunky-crayon-sfx-muted', 'true');
      localStorage.setItem('chunky-crayon-ambient-muted', 'true');
    } catch {}
  });

  const page: Page = await context.newPage();
  await page.setViewportSize({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT });

  try {
    await page.goto(`${opts.origin}/en/coloring-image/${opts.imageId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await waitForLineArt(page);
    await selectMagicBrush(page);
    await selectLargeBrush(page);
    await page.waitForTimeout(400);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas has no bounding box');

    if (sweep === 'horizontal') {
      await sweepHorizontal(page, box);
    } else {
      await sweepDiagonal(page, box);
    }

    // Let the reveal worker drain any in-flight mask updates before we close.
    await page.waitForTimeout(1500);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const srcPath = await video.path();
      const finalPath = resolve(opts.outDir, `${outName}.webm`);
      await mkdir(dirname(finalPath), { recursive: true });
      await rename(srcPath, finalPath);
      return { webmPath: finalPath, durationMs: Date.now() - start };
    }
  }

  throw new Error('No recorded video was produced');
}

async function waitForLineArt(page: Page): Promise<void> {
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(2000);
  await page.waitForFunction(
    () => {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length < 2) return false;
      const img = canvases[1] as HTMLCanvasElement;
      const ctx = img.getContext('2d');
      if (!ctx || img.width === 0) return false;
      const data = ctx.getImageData(img.width / 2, img.height / 2, 1, 1).data;
      return data[3] > 0;
    },
    { timeout: 30_000, polling: 500 },
  );
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
        document.querySelectorAll<HTMLButtonElement>('[data-testid="tool-magic-reveal"]'),
      );
      buttons.forEach((b) => b.click());
      return buttons.some((b) => b.getAttribute('aria-pressed') === 'true');
    });
    if (pressed) return;
    await page.waitForTimeout(300);
  }
  throw new Error('Magic Brush failed to activate');
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
  }
}

async function sweepDiagonal(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
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
  }
}
