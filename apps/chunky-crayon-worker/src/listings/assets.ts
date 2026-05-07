/**
 * Asset loader for listing templates. Embeds the Tondo-adjacent static
 * assets (bg tile + Colo welcome) as data URIs so Satori can `<img>` them
 * without an HTTP fetch.
 *
 * The bg tile + Colo welcome assets live in
 * `apps/chunky-crayon-worker/public/listings/`.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { LISTING_SIZE, PALETTE } from "./palette";

let _bgTileDataUri: string | null = null;
let _coloWelcomeDataUri: string | null = null;
let _ccLogoDataUri: string | null = null;
let _tiledBackgroundDataUri: string | null = null;

async function readAsDataUri(
  relPath: string,
  mimeType: string,
): Promise<string> {
  const buf = await readFile(
    join(process.cwd(), "public", "listings", relPath),
  );
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

export async function loadAssets(): Promise<{
  bgTileDataUri: string;
  coloWelcomeDataUri: string;
  ccLogoDataUri: string;
  tiledBackgroundDataUri: string;
}> {
  if (!_bgTileDataUri || !_coloWelcomeDataUri || !_ccLogoDataUri) {
    const [bg, colo, logo] = await Promise.all([
      readAsDataUri("bg-tile.svg", "image/svg+xml"),
      readAsDataUri("colo-welcome.svg", "image/svg+xml"),
      readAsDataUri("cc-logo.svg", "image/svg+xml"),
    ]);
    _bgTileDataUri = bg;
    _coloWelcomeDataUri = colo;
    _ccLogoDataUri = logo;
  }
  if (!_tiledBackgroundDataUri) {
    _tiledBackgroundDataUri = await buildTiledBackground();
  }
  return {
    bgTileDataUri: _bgTileDataUri,
    coloWelcomeDataUri: _coloWelcomeDataUri,
    ccLogoDataUri: _ccLogoDataUri,
    tiledBackgroundDataUri: _tiledBackgroundDataUri,
  };
}

/**
 * Pre-render the bg tile composited across the full LISTING_SIZE canvas
 * with cream backdrop. Satori doesn't support `background-image` repeat
 * patterns, so the alternative is a one-shot full-size PNG that templates
 * use as a single `<img>` background layer.
 *
 * Cached as a data URI on the module so subsequent renders are zero-cost.
 */
async function buildTiledBackground(): Promise<string> {
  const tileBuf = await readFile(
    join(process.cwd(), "public", "listings", "bg-tile.svg"),
  );
  // Render the SVG once at the tile native 200×200, then composite a 6×6
  // grid (bg-tile is 200px square, 6 × 200 = 1200 = LISTING_SIZE).
  const tilePng = await sharp(tileBuf, { density: 144 })
    .resize(200, 200)
    .png()
    .toBuffer();

  const composites = [];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      composites.push({ input: tilePng, top: y * 200, left: x * 200 });
    }
  }
  const out = await sharp({
    create: {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      channels: 4,
      background: PALETTE.cream,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  return `data:image/png;base64,${out.toString("base64")}`;
}
