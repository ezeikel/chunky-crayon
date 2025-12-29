import { ImageResponse } from 'next/og';
import { translations } from '@chunky-crayon/translations';
import { loadOGFonts, OG_FONT_CONFIG } from '@/lib/og/fonts';
import { colors, OG_WIDTH, OG_HEIGHT, crayonColors } from '@/lib/og/constants';

export const runtime = 'nodejs';

// Root OG is outside [locale] folder - use English as default
const t = translations.en.og.homepage;

export const alt = 'Chunky Crayon - Creative Coloring & Learning Fun';
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = 'image/png';

export default async function Image() {
  const [tondoBold, rooneySansRegular, rooneySansBold] = await loadOGFonts();

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
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.crayonSkyLight} 40%, ${colors.bgCreamDark} 100%)`,
          fontFamily: OG_FONT_CONFIG.rooneySans.name,
          padding: '60px',
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
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
              }}
            />
          ))}
        </div>

        {/* Decorative circles in corners */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            backgroundColor: colors.crayonYellowLight,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            backgroundColor: colors.crayonPinkLight,
            opacity: 0.4,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            zIndex: 1,
          }}
        >
          {/* Brand name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '72px',
                fontWeight: 700,
                color: colors.crayonOrange,
                letterSpacing: '-1px',
              }}
            >
              Chunky
            </span>
            <span
              style={{
                fontFamily: OG_FONT_CONFIG.tondo.name,
                fontSize: '72px',
                fontWeight: 700,
                color: colors.textPrimary,
                letterSpacing: '-1px',
              }}
            >
              Crayon
            </span>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: '32px',
              fontWeight: 400,
              color: colors.textSecondary,
              marginTop: '-8px',
            }}
          >
            {t.tagline}
          </p>

          {/* Feature badges */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: colors.bgWhite,
                padding: '14px 28px',
                borderRadius: '100px',
                boxShadow: `0 4px 16px rgba(227, 119, 72, 0.15)`,
              }}
            >
              <span style={{ fontSize: '24px' }}>🎨</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {t.features.pages}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: colors.bgWhite,
                padding: '14px 28px',
                borderRadius: '100px',
                boxShadow: `0 4px 16px rgba(227, 119, 72, 0.15)`,
              }}
            >
              <span style={{ fontSize: '24px' }}>✨</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {t.features.aiGenerated}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: colors.bgWhite,
                padding: '14px 28px',
                borderRadius: '100px',
                boxShadow: `0 4px 16px rgba(227, 119, 72, 0.15)`,
              }}
            >
              <span style={{ fontSize: '24px' }}>🖨️</span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {t.features.freePrintables}
              </span>
            </div>
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
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
              }}
            />
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
