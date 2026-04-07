import { ImageResponse } from "next/og";
import { loadOGFonts, OG_FONT_CONFIG } from "@/lib/og/fonts";
import { colors, OG_WIDTH, OG_HEIGHT, accentColors } from "@/lib/og/constants";

export const runtime = "nodejs";

export const alt = "Coloring Habitat - Mindful Coloring for Adults";
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = "image/png";

export default async function Image() {
  const [jakartaRegular, jakartaBold, jakartaExtraBold] = await loadOGFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.sageLight} 40%, ${colors.bgCreamDark} 100%)`,
          fontFamily: OG_FONT_CONFIG.jakarta.name,
          padding: "60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            height: "10px",
          }}
        >
          {accentColors.map((color, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
              }}
            />
          ))}
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            backgroundColor: colors.sageLight,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            backgroundColor: colors.lavenderLight,
            opacity: 0.4,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            zIndex: 1,
          }}
        >
          {/* Brand name */}
          <span
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: colors.primary,
              letterSpacing: "-2px",
            }}
          >
            Coloring Habitat
          </span>

          {/* Tagline */}
          <p
            style={{
              fontSize: "30px",
              fontWeight: 400,
              color: colors.textSecondary,
              marginTop: "-8px",
            }}
          >
            Mindful coloring for relaxation and creativity
          </p>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "32px",
            }}
          >
            {[
              { emoji: "🎨", text: "Intricate Designs" },
              { emoji: "✨", text: "AI Generated" },
              { emoji: "🧘", text: "Mindful Relaxation" },
            ].map((badge, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: colors.bgWhite,
                  padding: "14px 28px",
                  borderRadius: "100px",
                  boxShadow: "0 4px 16px rgba(45, 106, 79, 0.12)",
                }}
              >
                <span style={{ fontSize: "24px" }}>{badge.emoji}</span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: colors.textPrimary,
                  }}
                >
                  {badge.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            height: "8px",
          }}
        >
          {[...accentColors].reverse().map((color, i) => (
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
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaRegular,
          weight: 400 as const,
          style: "normal" as const,
        },
        {
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaBold,
          weight: 700 as const,
          style: "normal" as const,
        },
        {
          name: OG_FONT_CONFIG.jakarta.name,
          data: jakartaExtraBold,
          weight: 800 as const,
          style: "normal" as const,
        },
      ],
    },
  );
}
