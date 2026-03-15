import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * OG Image Font Loading Utilities
 *
 * Loads local Tondo and Rooney Sans fonts for use in Next.js ImageResponse.
 * Fonts are loaded from the public/fonts directory.
 */

// Resolve font paths relative to the project root
const FONTS_DIR = join(process.cwd(), 'public', 'fonts');

/**
 * Load Tondo Bold font (700) - playful, rounded font for headings
 */
export async function loadTondoBold(): Promise<ArrayBuffer> {
  const fontPath = join(FONTS_DIR, 'tondo-bold.ttf');
  const fontData = await readFile(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load Tondo Regular font (400) - for lighter heading text
 */
export async function loadTondoRegular(): Promise<ArrayBuffer> {
  const fontPath = join(FONTS_DIR, 'tondo-regular.ttf');
  const fontData = await readFile(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load Rooney Sans Regular font (400) - clean body text
 */
export async function loadRooneySansRegular(): Promise<ArrayBuffer> {
  const fontPath = join(FONTS_DIR, 'rooney-sans-regular.ttf');
  const fontData = await readFile(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load Rooney Sans Bold font (700) - emphasized body text
 */
export async function loadRooneySansBold(): Promise<ArrayBuffer> {
  const fontPath = join(FONTS_DIR, 'rooney-sans-bold.ttf');
  const fontData = await readFile(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load Rooney Sans Medium font (500) - medium weight body text
 */
export async function loadRooneySansMedium(): Promise<ArrayBuffer> {
  const fontPath = join(FONTS_DIR, 'rooney-sans-medium.ttf');
  const fontData = await readFile(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;
}

/**
 * Load all commonly used OG fonts in parallel
 * Returns: [tondoBold, rooneySansRegular, rooneySansBold]
 */
export async function loadOGFonts(): Promise<
  [ArrayBuffer, ArrayBuffer, ArrayBuffer]
> {
  return Promise.all([
    loadTondoBold(),
    loadRooneySansRegular(),
    loadRooneySansBold(),
  ]);
}

/**
 * Font configuration for ImageResponse
 */
export const OG_FONT_CONFIG = {
  tondo: {
    name: 'Tondo',
  },
  rooneySans: {
    name: 'Rooney Sans',
  },
} as const;
