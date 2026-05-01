import { ImageResponse } from 'next/og';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { loadOGLogo } from '@/lib/og/logo';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import {
  getFeaturedColoringImagesForOG,
  type FeaturedOGImage,
} from '@/lib/og/data';

const TILE_ROTATIONS = [-2, 1, -1, 2, -1, 1.5];
const HEADLINE = 'Your kid describes it. We draw it.';
const SUBLINE = 'A printable coloring page in about 2 minutes.';
const CTA_TEXT = '2 free pages, no signup';

const renderStartOG = (images: FeaturedOGImage[], logo: string) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 50%, ${colors.bgCreamDark} 100%)`,
      fontFamily: OG_FONT_CONFIG.rooneySans.name,
      padding: '48px 56px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Top crayon stripe */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        height: '12px',
      }}
    >
      {crayonColors.map((color, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </div>

    {/* Decorative corner blob */}
    <div
      style={{
        position: 'absolute',
        bottom: '-100px',
        right: '-100px',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        backgroundColor: colors.crayonYellowLight,
        opacity: 0.4,
      }}
    />

    {/* Left: collage of real coloring pages */}
    {images.length > 0 && (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '560px',
          height: '100%',
          alignItems: 'center',
          alignContent: 'center',
          gap: '14px',
        }}
      >
        {images.slice(0, 6).map((img, i) => (
          <div
            key={img.id}
            style={{
              display: 'flex',
              width: '170px',
              height: '170px',
              backgroundColor: colors.bgWhite,
              borderRadius: '20px',
              boxShadow: `0 6px 20px rgba(227, 119, 72, 0.18), 0 2px 6px rgba(0, 0, 0, 0.06)`,
              overflow: 'hidden',
              transform: `rotate(${TILE_ROTATIONS[i] ?? 0}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={img.title}
              width={170}
              height={170}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ))}
      </div>
    )}

    {/* Right: brand + headline + CTA pill */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        paddingLeft: images.length > 0 ? '40px' : '0',
        paddingRight: '8px',
        gap: '20px',
        zIndex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={72}
          height={72}
          style={{ width: '72px', height: '72px' }}
        />
        <span
          style={{
            fontFamily: OG_FONT_CONFIG.tondo.name,
            fontSize: '48px',
            fontWeight: 700,
            color: colors.textPrimary,
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          Chunky Crayon
        </span>
      </div>

      <p
        style={{
          fontFamily: OG_FONT_CONFIG.tondo.name,
          fontSize: '40px',
          fontWeight: 700,
          color: colors.textPrimary,
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: '-0.5px',
        }}
      >
        {HEADLINE}
      </p>

      <p
        style={{
          fontSize: '24px',
          fontWeight: 400,
          color: colors.textSecondary,
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {SUBLINE}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          alignSelf: 'flex-start',
          background: `linear-gradient(135deg, ${colors.crayonOrange} 0%, ${colors.crayonOrangeDark} 100%)`,
          color: colors.textInverted,
          padding: '14px 28px',
          borderRadius: '100px',
          fontSize: '24px',
          fontWeight: 700,
          marginTop: '8px',
          boxShadow: `0 6px 16px rgba(218, 115, 83, 0.35)`,
        }}
      >
        {CTA_TEXT}
      </div>
    </div>

    {/* Bottom crayon stripe */}
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        height: '8px',
      }}
    >
      {[...crayonColors].reverse().map((color, i) => (
        <div key={i} style={{ flex: 1, backgroundColor: color }} />
      ))}
    </div>
  </div>
);

const buildFontExports = (fonts: Awaited<ReturnType<typeof loadOGFonts>>) => {
  const [tondoBold, rooneySansRegular, rooneySansBold] = fonts;
  return [
    {
      name: OG_FONT_CONFIG.tondo.name,
      data: tondoBold,
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: OG_FONT_CONFIG.rooneySans.name,
      data: rooneySansRegular,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: OG_FONT_CONFIG.rooneySans.name,
      data: rooneySansBold,
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];
};

/**
 * Build an ImageResponse for the /start OG. Used by both the dynamic
 * file-convention route AND the regenerate-og cron that pre-renders the
 * PNG to R2 (so Meta's scraper gets a fast static asset, not a 15s
 * dynamic render).
 */
export const renderStartOGImageResponse = async (): Promise<ImageResponse> => {
  const [fonts, logo, featured] = await Promise.all([
    loadOGFonts(),
    loadOGLogo(),
    getFeaturedColoringImagesForOG(6).catch(() => [] as FeaturedOGImage[]),
  ]);

  return new ImageResponse(renderStartOG(featured, logo), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: buildFontExports(fonts),
  });
};
