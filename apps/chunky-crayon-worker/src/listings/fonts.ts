/**
 * Tondo font loader for Satori — module-cached so batch renders don't
 * pay TTF read cost per call. Same pattern as
 * src/video/content-reel/shared/cover.tsx.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

let _tondoRegular: ArrayBuffer | null = null;
let _tondoBold: ArrayBuffer | null = null;
let _bubblegumSans: ArrayBuffer | null = null;

async function readAsArrayBuffer(path: string): Promise<ArrayBuffer> {
  const buf = await readFile(path);
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

export type ListingFonts = {
  tondoRegular: ArrayBuffer;
  tondoBold: ArrayBuffer;
  bubblegumSans: ArrayBuffer;
};

export async function loadFonts(): Promise<ListingFonts> {
  if (!_tondoRegular || !_tondoBold || !_bubblegumSans) {
    const fontsDir = join(process.cwd(), "public", "fonts");
    const [regular, bold, bubblegum] = await Promise.all([
      readAsArrayBuffer(join(fontsDir, "tondo-regular.ttf")),
      readAsArrayBuffer(join(fontsDir, "tondo-bold.ttf")),
      readAsArrayBuffer(join(fontsDir, "bubblegum-sans-regular.ttf")),
    ]);
    _tondoRegular = regular;
    _tondoBold = bold;
    _bubblegumSans = bubblegum;
  }
  return {
    tondoRegular: _tondoRegular,
    tondoBold: _tondoBold,
    bubblegumSans: _bubblegumSans,
  };
}

/**
 * Default Satori font config for listing templates. Two families:
 * - "Tondo" (regular 400 + bold 700) for body / tagline / subtitle
 * - "Bubblegum Sans" (regular 400) for chunky display title text
 */
export function buildFontConfig(fonts: ListingFonts) {
  return [
    {
      name: "Tondo",
      data: fonts.tondoRegular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Tondo",
      data: fonts.tondoBold,
      weight: 700 as const,
      style: "normal" as const,
    },
    {
      name: "Bubblegum Sans",
      data: fonts.bubblegumSans,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
}
