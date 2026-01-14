import { NextRequest, NextResponse } from 'next/server';
import satori from 'satori';
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { FactCard } from '@/components/social/FactCard';

// Cache fonts at module level for performance
let rooneySansRegular: ArrayBuffer | null = null;
let rooneySansMedium: ArrayBuffer | null = null;
let tondoBold: ArrayBuffer | null = null;

async function loadFonts() {
  if (!rooneySansRegular || !rooneySansMedium || !tondoBold) {
    const fontsDir = join(process.cwd(), 'public', 'fonts');

    const [regular, medium, bold] = await Promise.all([
      readFile(join(fontsDir, 'rooney-sans-regular.ttf')),
      readFile(join(fontsDir, 'rooney-sans-medium.ttf')),
      readFile(join(fontsDir, 'tondo-bold.ttf')),
    ]);

    rooneySansRegular = regular.buffer.slice(
      regular.byteOffset,
      regular.byteOffset + regular.byteLength,
    ) as ArrayBuffer;
    rooneySansMedium = medium.buffer.slice(
      medium.byteOffset,
      medium.byteOffset + medium.byteLength,
    ) as ArrayBuffer;
    tondoBold = bold.buffer.slice(
      bold.byteOffset,
      bold.byteOffset + bold.byteLength,
    ) as ArrayBuffer;
  }

  return {
    rooneySansRegular,
    rooneySansMedium,
    tondoBold,
  };
}

/**
 * Convert emoji to Twemoji CDN URL.
 * Handles multi-codepoint emojis (skin tones, flags, ZWJ sequences).
 */
function emojiToTwemojiUrl(emoji: string): string {
  const codePoints: string[] = [];
  for (const char of emoji) {
    const codePoint = char.codePointAt(0);
    if (codePoint) {
      codePoints.push(codePoint.toString(16));
    }
  }
  // Filter out fe0f (variation selector-16) for cleaner URLs
  const filtered = codePoints.filter((cp) => cp !== 'fe0f');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${filtered.join('-')}.svg`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fact = searchParams.get('fact');
    const category = searchParams.get('category') || 'Fun Fact';
    const emoji = searchParams.get('emoji') || '✨';
    const format = (searchParams.get('format') || 'square') as
      | 'square'
      | 'vertical';
    const colorIndexParam = searchParams.get('colorIndex');
    const colorIndex =
      colorIndexParam !== null ? parseInt(colorIndexParam, 10) : undefined;

    if (!fact) {
      return NextResponse.json(
        { error: 'Missing required parameter: fact' },
        { status: 400 },
      );
    }

    // Load fonts
    const fonts = await loadFonts();

    // Determine dimensions
    const width = format === 'vertical' ? 1000 : 1080;
    const height = format === 'vertical' ? 1500 : 1080;

    // Generate SVG using satori
    const svg = await satori(
      FactCard({
        fact: decodeURIComponent(fact),
        category: decodeURIComponent(category),
        emoji: decodeURIComponent(emoji),
        format,
        colorIndex,
      }),
      {
        width,
        height,
        fonts: [
          {
            name: 'Rooney Sans',
            data: fonts.rooneySansRegular!,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Rooney Sans',
            data: fonts.rooneySansMedium!,
            weight: 500,
            style: 'normal',
          },
          {
            name: 'Tondo',
            data: fonts.tondoBold!,
            weight: 700,
            style: 'normal',
          },
        ],
        // Load emoji SVGs from Twemoji CDN
        loadAdditionalAsset: async (code, segment) => {
          if (code === 'emoji') {
            const url = emojiToTwemojiUrl(segment);
            try {
              const response = await fetch(url);
              if (response.ok) {
                const svgText = await response.text();
                return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
              }
            } catch (e) {
              console.warn(`[Fact Card] Failed to load emoji: ${segment}`, e);
            }
          }
          return undefined;
        },
      },
    );

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error rendering fact card:', error);
    return NextResponse.json(
      { error: 'Failed to render fact card', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for rendering with JSON body (useful for programmatic access)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fact,
      category = 'Fun Fact',
      emoji = '✨',
      format = 'square',
      colorIndex,
    } = body;

    if (!fact) {
      return NextResponse.json(
        { error: 'Missing required field: fact' },
        { status: 400 },
      );
    }

    // Load fonts
    const fonts = await loadFonts();

    // Determine dimensions
    const width = format === 'vertical' ? 1000 : 1080;
    const height = format === 'vertical' ? 1500 : 1080;

    // Generate SVG using satori
    const svg = await satori(
      FactCard({
        fact,
        category,
        emoji,
        format,
        colorIndex,
      }),
      {
        width,
        height,
        fonts: [
          {
            name: 'Rooney Sans',
            data: fonts.rooneySansRegular!,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Rooney Sans',
            data: fonts.rooneySansMedium!,
            weight: 500,
            style: 'normal',
          },
          {
            name: 'Tondo',
            data: fonts.tondoBold!,
            weight: 700,
            style: 'normal',
          },
        ],
        // Load emoji SVGs from Twemoji CDN
        loadAdditionalAsset: async (code, segment) => {
          if (code === 'emoji') {
            const url = emojiToTwemojiUrl(segment);
            try {
              const response = await fetch(url);
              if (response.ok) {
                const svgText = await response.text();
                return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
              }
            } catch (e) {
              console.warn(`[Fact Card] Failed to load emoji: ${segment}`, e);
            }
          }
          return undefined;
        },
      },
    );

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error rendering fact card:', error);
    return NextResponse.json(
      { error: 'Failed to render fact card', details: String(error) },
      { status: 500 },
    );
  }
}
