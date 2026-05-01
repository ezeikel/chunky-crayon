import { ImageResponse } from 'next/og';
import { getTranslationsForLocale } from '@/i18n/messages';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { loadOGLogo } from '@/lib/og/logo';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import {
  getFeaturedColoringImagesForOG,
  type FeaturedOGImage,
} from '@/lib/og/data';

export const runtime = 'nodejs';

export const alt = 'Chunky Crayon — custom coloring pages, made in seconds.';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

type Props = {
  params: Promise<{ locale: string }>;
};

const TILE_ROTATIONS = [-2, 1, -1, 2, -1, 1.5];

export default async function Image({ params }: Props) {
  const { locale } = await params;
  const t = (getTranslationsForLocale(locale) as any).og.homepage;

  // Wrap the DB query in a catch — if Neon hiccups during a cold start,
  // we'd rather render the text-only fallback than serve a blank image
  // back to Meta / X / LinkedIn. A blank cached at Meta is much harder
  // to recover from than a slightly-less-pretty render, and Meta caches
  // the first thing it sees per URL.
  const [fonts, featured, logo] = await Promise.all([
    loadOGFonts(),
    getFeaturedColoringImagesForOG(6).catch(() => [] as FeaturedOGImage[]),
    loadOGLogo(),
  ]);

  const [tondoBold, rooneySansRegular, rooneySansBold] = fonts;
  const fontExports = [
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

  if (featured.length === 0) {
    return new ImageResponse(renderTextFallback(t.tagline, logo), {
      ...size,
      fonts: fontExports,
    });
  }

  return new ImageResponse(renderCollage(featured, t.tagline, logo), {
    ...size,
    fonts: fontExports,
  });
}

const renderCollage = (
  images: FeaturedOGImage[],
  tagline: string,
  logo: string,
) => (
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

    {/* Left: collage grid */}
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: '620px',
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
            width: '190px',
            height: '190px',
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
            width={190}
            height={190}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ))}
    </div>

    {/* Right: brand + tagline */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        paddingLeft: '40px',
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
          width={88}
          height={88}
          style={{ width: '88px', height: '88px' }}
        />
        <span
          style={{
            fontFamily: OG_FONT_CONFIG.tondo.name,
            fontSize: '60px',
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
          fontSize: '34px',
          fontWeight: 700,
          color: colors.textPrimary,
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {tagline}
      </p>

      <span
        style={{
          fontSize: '22px',
          fontWeight: 600,
          color: colors.crayonOrangeDark,
          marginTop: '8px',
        }}
      >
        chunkycrayon.com
      </span>
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

const renderTextFallback = (tagline: string, logo: string) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 40%, ${colors.bgCreamDark} 100%)`,
      fontFamily: OG_FONT_CONFIG.rooneySans.name,
      padding: '60px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
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

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        width={104}
        height={104}
        style={{ width: '104px', height: '104px' }}
      />
      <span
        style={{
          fontFamily: OG_FONT_CONFIG.tondo.name,
          fontSize: '72px',
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
        fontSize: '32px',
        fontWeight: 600,
        color: colors.textSecondary,
        marginTop: '16px',
      }}
    >
      {tagline}
    </p>

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
