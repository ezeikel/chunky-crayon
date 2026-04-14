#!/usr/bin/env node
/**
 * Playwright spike: can we drive magic fill + magic brush via synthetic events?
 *
 * Usage:
 *   node spike.mjs fill     # click Auto Color button, watch it reveal
 *   node spike.mjs brush    # select Magic Brush, sweep mouse across canvas
 *
 * Prereqs:
 *   - CC web running on http://localhost:3000
 *   - Coloring image id backfilled with region store
 *   - Playwright installed (apps/chunky-crayon-web already has it)
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const IMAGE_ID = 'cmnby66fr00003j6lvnz4seb3'; // Panda, has region store
const PORT = process.env.TARGET_PORT || '3000'; // 3000 = dev, 3100 = prod build
const URL = `http://localhost:${PORT}/en/coloring-image/${IMAGE_ID}`;

const mode = process.argv[2] || 'fill';
if (!['fill', 'brush'].includes(mode)) {
  console.error('Mode must be "fill" or "brush"');
  process.exit(1);
}

// Sweep pattern for brush mode. Diagonal looks more organic and covers cleanly
// at strokeStep=32. Horizontal is the fallback if the reveal worker stalls.
const sweep = process.env.SWEEP || 'diagonal';
if (!['horizontal', 'diagonal'].includes(sweep)) {
  console.error('SWEEP must be "horizontal" or "diagonal"');
  process.exit(1);
}

const recordingDir = resolve(__dirname, `recordings/${mode}`);
await mkdir(recordingDir, { recursive: true });

console.log(`[spike] Mode: ${mode}`);
console.log(`[spike] Target: ${URL}`);
console.log(`[spike] Recording to: ${recordingDir}`);

// Fixed recording size. Per Playwright docs, video is viewport scaled to fit
// `recordVideo.size`. Setting viewport == recordVideo.size means no scaling and
// the full page fills the frame — regardless of the actual OS window chrome.
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 1325;

const browser = await chromium.launch({
  headless: false,
  args: [
    `--window-size=${VIDEO_WIDTH},${VIDEO_HEIGHT}`,
    '--window-position=0,0',
  ],
});
const context = await browser.newContext({
  viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
  screen: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
  recordVideo: {
    dir: recordingDir,
    size: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
  },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.setViewportSize({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT });

// Clear storage so previous runs' coloring state doesn't linger and disable the button,
// and pre-mute audio so the recording has no SFX/music.
await page.addInitScript(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    // ColoringContextProvider reads these on mount (see context.tsx hydration).
    localStorage.setItem('chunky-crayon-muted', 'true');
    localStorage.setItem('chunky-crayon-sfx-muted', 'true');
    localStorage.setItem('chunky-crayon-ambient-muted', 'true');
  } catch {}
});

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[page:error]', msg.text());
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

await page.waitForTimeout(4000);
await page.screenshot({
  path: resolve(__dirname, `recordings/${mode}/01-loaded.png`),
  fullPage: true,
});

// Screenshot before any interaction so we can see the page layout
await page.waitForTimeout(2000);
await page.screenshot({
  path: resolve(__dirname, `recordings/${mode}/01-initial.png`),
  fullPage: true,
});

// Wait for canvas to be interactive. The drawing canvas is the one with onPointerDown.
const canvas = page.locator('canvas').first();
await canvas.waitFor({ state: 'visible', timeout: 15_000 });

// Fresh Playwright context = empty localStorage, so server-persisted progress is the
// only way state can carry over between runs. For this spike we skip the Start Over
// dance — if progress from a prior run shows up, reload the page manually or rerun.
await page.waitForTimeout(2000);

// Wait for the image canvas to actually have pixels drawn (not just be mounted).
// The image canvas is the second <canvas> — the one with mix-blend-multiply.
console.log('[spike] Waiting for line art to paint...');
await page.waitForFunction(
  () => {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length < 2) return false;
    const img = canvases[1]; // image canvas (line art)
    const ctx = img.getContext('2d');
    if (!ctx || img.width === 0) return false;
    // Sample center pixel — if it's not pure white/transparent, the line art has rendered.
    const data = ctx.getImageData(img.width / 2, img.height / 2, 1, 1).data;
    return data[3] > 0; // alpha > 0 means something painted
  },
  { timeout: 30_000, polling: 500 },
);
console.log('[spike] Line art rendered.');
await page.waitForTimeout(1000);


const readProgress = async () => {
  // ProgressIndicator only renders when progress > 0, so missing element = 0%.
  try {
    return await page.evaluate(() => {
      const el = document.querySelector('[data-testid="coloring-progress"]');
      if (!el) return 0;
      return parseInt(el.getAttribute('data-progress') || '0', 10);
    });
  } catch {
    return 0;
  }
};

if (mode === 'fill') {
  console.log('[spike] Clicking Auto Color button...');
  // Find the VISIBLE instance among possibly duplicated renders (desktop sidebar + mobile drawer).
  const clickedLabel = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[data-testid="tool-magic-auto"]'));
    const info = buttons.map((b) => {
      const r = b.getBoundingClientRect();
      const style = getComputedStyle(b);
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      };
    });
    const target =
      buttons.find((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) || buttons[0];
    if (!target) return { clicked: false, count: buttons.length, info };
    target.scrollIntoView({ block: 'center' });
    target.click();
    return { clicked: true, count: buttons.length, info };
  });
  console.log('[spike] Click result:', JSON.stringify(clickedLabel, null, 2));

  // Auto color may open a preview modal — look for an "Apply"/"Use this" confirmation, otherwise assume instant fill.
  console.log('[spike] Waiting for reveal to complete...');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const p = await readProgress();
    console.log(`[spike]   progress = ${p}%`);
    if (p >= 99) break;
  }
} else {
  // Brush mode: activate Magic Brush, then sweep the mouse across the canvas in a serpentine pattern.
  console.log('[spike] Waiting for magic-reveal button to mount...');
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="tool-magic-reveal"]'),
    { timeout: 15_000, polling: 250 },
  );
  console.log('[spike] Selecting Magic Brush...');
  let pressed = false;
  let diagnostics = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    diagnostics = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[data-testid="tool-magic-reveal"]'));
      const info = buttons.map((b) => ({
        disabled: b.disabled,
        ariaPressed: b.getAttribute('aria-pressed'),
        rect: (() => {
          const r = b.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        })(),
      }));
      buttons.forEach((b) => b.click());
      return { count: buttons.length, info };
    });
    pressed = diagnostics.info.some((b) => b.ariaPressed === 'true');
    if (pressed) break;
    await page.waitForTimeout(300);
  }
  console.log('[spike] Magic Brush diagnostics:', JSON.stringify(diagnostics));
  console.log(`[spike] Magic Brush aria-pressed=${pressed}`);
  await page.screenshot({
    path: resolve(__dirname, `recordings/${mode}/02a-after-brush-select.png`),
    fullPage: true,
  });
  if (!pressed) {
    // Dump what tool testids DO exist so we can spot layout divergence at this viewport.
    const debug = await page.evaluate(() => ({
      toolTestIds: Array.from(document.querySelectorAll('[data-testid^="tool-"]')).map((b) => ({
        id: b.getAttribute('data-testid'),
        disabled: b.disabled,
      })),
      viewport: { w: window.innerWidth, h: window.innerHeight },
    }));
    console.log('[spike] Debug:', JSON.stringify(debug, null, 2));
    throw new Error('Magic Brush failed to activate');
  }

  // Chunky brush size.
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="brush-size-large"]').forEach((el) => el.click());
  });
  await page.waitForTimeout(300);
  console.log('[spike] Brush size set to large.');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  console.log(`[spike] Canvas box:`, box, ' sweep=', sweep);

  // Sanity check: is magic-reveal STILL the active tool right before the sweep?
  const preSweepActive = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="tool-magic-reveal"]');
    return {
      ariaPressed: btn?.getAttribute('aria-pressed'),
      disabled: btn?.disabled,
    };
  });
  console.log('[spike] magic-reveal pre-sweep:', JSON.stringify(preSweepActive));

  // Diagonal sweep (TL → BR). Each stroke is a short 45° segment running from
  // top-right edge of its band down to bottom-left, sequenced from the TL corner
  // across to the BR. Gives a hand-filled-in feel rather than a scanline wipe.
  const padding = 8;
  const x0 = box.x + padding;
  const x1 = box.x + box.width - padding;
  const y0 = box.y + padding;
  const y1 = box.y + box.height - padding;
  const W = x1 - x0;
  const H = y1 - y0;

  if (sweep === 'horizontal') {
    // Straight horizontal L→R strokes, top to bottom. Simple, reliable.
    const rows = 32;
    const rowHeight = (y1 - y0) / (rows - 1);
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * rowHeight;
      await page.mouse.move(x0, y);
      await page.mouse.down();
      await page.mouse.move(x1, y, { steps: 50 });
      await page.mouse.up();
      const p = await readProgress();
      console.log(`[spike]   row ${r + 1}/${rows}  y=${Math.round(y)}  progress=${p}%`);
      if (p >= 99) break;
    }
  } else {
    // Diagonal TL→BR sweep using diagonals PARALLEL to the main TL→BR diagonal.
    // Each stroke runs at +45°. We parameterize by t = (y - y0) - (x - x0):
    //   t = -W  → stroke clings to the top-right corner (short)
    //   t =  0  → stroke IS the main diagonal (longest, TL → BR)
    //   t = +H  → stroke clings to the bottom-left corner (short)
    // Sweeping t from -W → +H walks the reveal from TR down to BL, but we want
    // TL → BR, so we iterate t from +H → -W and the cursor fills in from TL outward.
    // TL→BR diagonal sweep. Each stroke is a short 45° segment; d grows from 0
    // so the reveal propagates out of the TL corner. Step 32 closes gaps
    // between strokes without overwhelming the reveal worker.
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
      const p = await readProgress();
      if ((i + 1) % 5 === 0 || i === totalStrokes - 1) {
        console.log(`[spike]   diag ${i + 1}/${totalStrokes}  d=${d}  progress=${p}%`);
      }
      if (p >= 99) break;
    }
  }

  await page.waitForTimeout(1500);
}

const finalProgress = await readProgress();
console.log(`[spike] Final progress: ${finalProgress}%`);

// Screenshot the final state
await page.waitForTimeout(1500);
await page.screenshot({
  path: resolve(__dirname, `recordings/${mode}/02-final.png`),
  fullPage: true,
});

// Hold the final frame so the video has a nice ending
await page.waitForTimeout(1500);

await context.close();
await browser.close();
console.log(`[spike] Done. Video in ${recordingDir}`);
