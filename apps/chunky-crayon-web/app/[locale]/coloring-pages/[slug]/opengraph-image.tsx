import { ImageResponse } from 'next/og';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { loadOGLogo } from '@/lib/og/logo';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import {
  getFeaturedColoringImagesForOG,
  type FeaturedOGImage,
} from '@/lib/og/data';
import { getLandingPageBySlug } from '@/lib/seo/landing-pages';

export const runtime = 'nodejs';

export const alt = 'Free printable coloring pages — Chunky Crayon';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

const TILE_ROTATIONS = [-2, 1, -1, 2, -1, 1.5];

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const config = getLandingPageBySlug(slug);

  const tagline = config?.tagline ?? 'Custom coloring pages, made in seconds.';
  const headline = config?.title ?? 'Free Printable Coloring Pages';
  const primaryTag = config?.tags[0];

  const [fonts, featured, logo] = await Promise.all([
    loadOGFonts(),
    getFeaturedColoringImagesForOG(6, primaryTag),
    loadOGLogo(),
  ]);

  // If a tag-filtered query came back empty, retry without the filter so the
  // card still showcases real work rather than falling back to text.
  const images =
    featured.length > 0 || !primaryTag
      ? featured
      : await getFeaturedColoringImagesForOG(6);

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

  if (images.length === 0) {
    return new ImageResponse(renderTextFallback(headline, tagline, logo), {
      ...size,
      fonts: fontExports,
    });
  }

  return new ImageResponse(renderCollage(images, headline, tagline, logo), {
    ...size,
    fonts: fontExports,
  });
}

const renderCollage = (
  images: FeaturedOGImage[],
  headline: string,
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
        position: 'absolute',
        bottom: '-100px',
        right: '-100px',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        backgroundColor: colors.crayonPinkLight,
        opacity: 0.4,
      }}
    />

    {/* Left: collage */}
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

    {/* Right: headline + tagline + brand */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        paddingLeft: '40px',
        paddingRight: '8px',
        gap: '18px',
        zIndex: 1,
      }}
    >
      <h1
        style={{
          fontFamily: OG_FONT_CONFIG.tondo.name,
          fontSize: '38px',
          fontWeight: 700,
          color: colors.textPrimary,
          lineHeight: 1.15,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {headline}
      </h1>

      <p
        style={{
          fontSize: '22px',
          fontWeight: 400,
          color: colors.textSecondary,
          lineHeight: 1.35,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tagline}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: 'auto',
          paddingTop: '20px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={44}
          height={44}
          style={{ width: '44px', height: '44px' }}
        />
        <span
          style={{
            fontFamily: OG_FONT_CONFIG.tondo.name,
            fontSize: '28px',
            fontWeight: 700,
            color: colors.textPrimary,
            lineHeight: 1,
          }}
        >
          Chunky Crayon
        </span>
      </div>
    </div>

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

const renderTextFallback = (
  headline: string,
  tagline: string,
  logo: string,
) => (
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
      textAlign: 'center',
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

    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={logo}
      alt=""
      width={88}
      height={88}
      style={{ width: '88px', height: '88px', marginBottom: '16px' }}
    />

    <h1
      style={{
        fontFamily: OG_FONT_CONFIG.tondo.name,
        fontSize: '52px',
        fontWeight: 700,
        color: colors.textPrimary,
        margin: 0,
        maxWidth: '900px',
        lineHeight: 1.15,
      }}
    >
      {headline}
    </h1>

    <p
      style={{
        fontSize: '28px',
        fontWeight: 400,
        color: colors.textSecondary,
        marginTop: '20px',
        maxWidth: '900px',
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
