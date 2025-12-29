import { ImageResponse } from 'next/og';
import { translations } from '@chunky-crayon/translations';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';
import { getColoringImageForOG } from '@/lib/og/data';

export const runtime = 'nodejs';

export const alt = 'Coloring Page - Chunky Crayon';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

// Difficulty badge colors (labels come from translations)
const difficultyColors = {
  BEGINNER: colors.crayonGreen,
  INTERMEDIATE: colors.crayonYellow,
  ADVANCED: colors.crayonOrange,
  EXPERT: colors.crayonPink,
} as const;

type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function Image({ params }: Props) {
  const { id, locale } = await params;
  const t = (
    translations[locale as keyof typeof translations] as typeof translations.en
  ).og;

  const [fonts, coloringImage] = await Promise.all([
    loadOGFonts(),
    getColoringImageForOG(id),
  ]);

  const [tondoBold, rooneySansRegular, rooneySansBold] = fonts;

  // Fallback to generic if image not found
  if (!coloringImage) {
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
            {t.coloringImage.notFound}
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

  const imageUrl = coloringImage.svgUrl || coloringImage.url;
  const difficultyKey = coloringImage.difficulty;
  const difficultyColor = difficultyKey
    ? difficultyColors[difficultyKey]
    : null;
  const difficultyLabel = difficultyKey
    ? t.difficulty[difficultyKey.toLowerCase() as keyof typeof t.difficulty]
    : null;
  const displayTags = coloringImage.tags.slice(0, 3); // Show max 3 tags

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 40%, ${colors.bgCreamDark} 100%)`,
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
            height: '10px',
          }}
        >
          {crayonColors.map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            right: '-60px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: colors.crayonYellowLight,
            opacity: 0.4,
          }}
        />

        {/* Left side: Image preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '420px',
            height: '100%',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '380px',
              height: '380px',
              backgroundColor: colors.bgWhite,
              borderRadius: '24px',
              boxShadow: `0 8px 32px rgba(227, 119, 72, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)`,
              padding: '20px',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={coloringImage.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: colors.bgCreamDark,
                  borderRadius: '16px',
                  fontSize: '60px',
                }}
              >
                🎨
              </div>
            )}
          </div>
        </div>

        {/* Right side: Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingLeft: '48px',
            paddingRight: '24px',
            gap: '20px',
          }}
        >
          {/* Difficulty badge */}
          {difficultyColor && difficultyLabel && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: difficultyColor,
                }}
              />
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {difficultyLabel}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontFamily: OG_FONT_CONFIG.tondo.name,
              fontSize: '48px',
              fontWeight: 700,
              color: colors.textPrimary,
              lineHeight: 1.15,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {coloringImage.title}
          </h1>

          {/* Description */}
          {coloringImage.description && (
            <p
              style={{
                fontSize: '22px',
                fontWeight: 400,
                color: colors.textSecondary,
                lineHeight: 1.4,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {coloringImage.description}
            </p>
          )}

          {/* Tags */}
          {displayTags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginTop: '8px',
              }}
            >
              {displayTags.map((tag, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: `${colors.crayonOrange}20`,
                    color: colors.crayonOrangeDark,
                    padding: '8px 16px',
                    borderRadius: '100px',
                    fontSize: '16px',
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: 'auto',
              paddingTop: '16px',
            }}
          >
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '24px',
                fontWeight: 700,
                color: colors.crayonOrange,
              }}
            >
              Chunky
            </span>
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '24px',
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
            height: '8px',
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
