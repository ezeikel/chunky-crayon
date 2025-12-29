import { ImageResponse } from 'next/og';
import { translations } from '@chunky-crayon/translations';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import { getSharedArtworkForOG } from '@/lib/og/data';

export const runtime = 'nodejs';

export const alt = 'Shared Artwork - Chunky Crayon';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

type Props = {
  params: Promise<{ code: string; locale: string }>;
};

export default async function Image({ params }: Props) {
  const { code, locale } = await params;
  const t = (
    translations[locale as keyof typeof translations] as typeof translations.en
  ).og;

  const [fonts, artwork] = await Promise.all([
    loadOGFonts(),
    getSharedArtworkForOG(code),
  ]);

  const [tondoBold, rooneySansRegular, rooneySansBold] = fonts;

  // Fallback to generic if artwork not found
  if (!artwork) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.bgCreamDark} 100%)`,
            fontFamily: OG_FONT_CONFIG.rooneySans.name,
          }}
        >
          <span
            style={{
              fontFamily: OG_FONT_CONFIG.tondo.name,
              fontSize: '48px',
              fontWeight: 700,
              color: colors.crayonOrange,
            }}
          >
            {t.sharedArtwork.notFound}
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: OG_FONT_CONFIG.tondo.name, data: tondoBold, weight: 700 },
          {
            name: OG_FONT_CONFIG.rooneySans.name,
            data: rooneySansRegular,
            weight: 400,
          },
        ],
      },
    );
  }

  // Use thumbnail if available, otherwise use full image
  const displayImageUrl = artwork.thumbnailUrl || artwork.imageUrl;
  const rawTitle = artwork.title || artwork.originalTitle || 'Masterpiece';
  // Truncate title if too long (satori doesn't support webkit line clamp)
  const displayTitle =
    rawTitle.length > 40 ? `${rawTitle.substring(0, 40)}...` : rawTitle;
  // Truncate creator name if too long
  const displayCreatorName = artwork.creatorName
    ? artwork.creatorName.length > 25
      ? `${artwork.creatorName.substring(0, 25)}...`
      : artwork.creatorName
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(145deg, ${colors.crayonPinkLight} 0%, ${colors.crayonPurpleLight} 50%, ${colors.bgCream} 100%)`,
          fontFamily: OG_FONT_CONFIG.rooneySans.name,
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative crayon stripes at top */}
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

        {/* Decorative stars */}
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: '80px',
            fontSize: '40px',
            opacity: 0.6,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: 'absolute',
            top: '100px',
            right: '100px',
            fontSize: '32px',
            opacity: 0.5,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '120px',
            fontSize: '28px',
            opacity: 0.4,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            right: '80px',
            fontSize: '36px',
            opacity: 0.5,
          }}
        >
          ⭐
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: colors.crayonYellowLight,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            backgroundColor: colors.crayonGreenLight,
            opacity: 0.4,
          }}
        />

        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            zIndex: 1,
          }}
        >
          {/* Artwork frame */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '340px',
              height: '340px',
              backgroundColor: colors.bgWhite,
              borderRadius: '24px',
              boxShadow: `0 12px 48px rgba(200, 115, 136, 0.3), 0 4px 16px rgba(0, 0, 0, 0.1)`,
              padding: '16px',
              border: `4px solid ${colors.crayonPurpleLight}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt={displayTitle}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: OG_FONT_CONFIG.tondo.name,
              fontSize: '36px',
              fontWeight: 700,
              color: colors.textPrimary,
              textAlign: 'center',
              margin: 0,
              maxWidth: '700px',
              lineHeight: 1.2,
            }}
          >
            {displayTitle}
          </h1>

          {/* Creator info */}
          {displayCreatorName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  color: colors.textSecondary,
                }}
              >
                {t.sharedArtwork.createdBy}
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.crayonPurple,
                }}
              >
                {displayCreatorName}
              </span>
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '20px',
                fontWeight: 700,
                color: colors.crayonOrange,
              }}
            >
              Chunky
            </span>
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '20px',
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Crayon
            </span>
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            height: '10px',
          }}
        >
          {[...crayonColors].reverse().map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: OG_FONT_CONFIG.tondo.name,
          data: tondoBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: OG_FONT_CONFIG.rooneySans.name,
          data: rooneySansRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: OG_FONT_CONFIG.rooneySans.name,
          data: rooneySansBold,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}
