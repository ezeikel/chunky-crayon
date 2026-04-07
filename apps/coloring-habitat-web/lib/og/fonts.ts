/**
 * OG Image Font Loading
 *
 * Loads Plus Jakarta Sans from Google Fonts for OG image generation.
 * CH uses Plus Jakarta Sans as its brand font.
 */

const GOOGLE_FONTS_API = "https://fonts.googleapis.com/css2";

async function fetchGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
  const url = `${GOOGLE_FONTS_API}?family=${encodeURIComponent(family)}:wght@${weight}`;

  const cssResponse = await fetch(url, {
    headers: {
      // Request woff format (lighter than ttf)
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  });

  const css = await cssResponse.text();
  const fontUrl = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/,
  )?.[1];

  if (!fontUrl) {
    throw new Error(`Could not find font URL for ${family} ${weight}`);
  }

  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
}

/**
 * Load all OG fonts in parallel.
 * Returns: [jakartaRegular, jakartaBold, jakartaExtraBold]
 */
export async function loadOGFonts(): Promise<
  [ArrayBuffer, ArrayBuffer, ArrayBuffer]
> {
  return Promise.all([
    fetchGoogleFont("Plus Jakarta Sans", 400),
    fetchGoogleFont("Plus Jakarta Sans", 700),
    fetchGoogleFont("Plus Jakarta Sans", 800),
  ]);
}

export const OG_FONT_CONFIG = {
  jakarta: {
    name: "Plus Jakarta Sans",
  },
} as const;
