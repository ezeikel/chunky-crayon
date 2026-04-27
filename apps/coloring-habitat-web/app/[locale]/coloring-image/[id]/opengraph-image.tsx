import { ImageResponse } from "next/og";
import { loadOGFonts, OG_FONT_CONFIG } from "@/lib/og/fonts";
import { colors, OG_WIDTH, OG_HEIGHT, accentColors } from "@/lib/og/constants";
import { getColoringImageForOG } from "@/lib/og/data";

export const runtime = "nodejs";

export const alt = "Coloring page on Coloring Habitat";
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = "image/png";

const difficultyColors: Record<string, string> = {
  BEGINNER: colors.sage,
  INTERMEDIATE: colors.primaryLight,
  ADVANCED: colors.terracotta,
  EXPERT: colors.lavenderDark,
};

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [fonts, image] = await Promise.all([
    loadOGFonts(),
    getColoringImageForOG(id),
  ]);

  const [jakartaRegular, jakartaBold, jakartaExtraBold] = fonts;
  const fontExports = [
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
  ];

  const title = image?.title || "Coloring Page";
  const description = image?.description || null;
  const difficulty = image?.difficulty || null;
  const tags = image?.tags?.slice(0, 3) || [];
  // Use line art so the OG card honestly previews what's reproducible in-app.
  // See docs/plans/active/REGION_PALETTE_FROM_JPEG.md
  const imageUrl = image?.svgUrl || image?.url || null;
  const difficultyColor = difficulty ? difficultyColors[difficulty] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.sageLight} 50%, ${colors.bgCreamDark} 100%)`,
          fontFamily: OG_FONT_CONFIG.jakarta.name,
          padding: "48px",
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
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>

        {/* Decorative blob */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            backgroundColor: colors.lavenderLight,
            opacity: 0.4,
          }}
        />

        {/* Left: image preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "420px",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "380px",
              height: "380px",
              backgroundColor: colors.bgWhite,
              borderRadius: "24px",
              boxShadow:
                "0 8px 32px rgba(45, 106, 79, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)",
              padding: "20px",
              overflow: "hidden",
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  backgroundColor: colors.bgCreamDark,
                  borderRadius: "16px",
                  fontSize: "60px",
                }}
              >
                🌿
              </div>
            )}
          </div>
        </div>

        {/* Right: content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingLeft: "48px",
            paddingRight: "16px",
            gap: "18px",
          }}
        >
          {difficulty && difficultyColor && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: difficultyColor,
                }}
              />
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {difficulty}
              </span>
            </div>
          )}

          <h1
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: colors.textPrimary,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-1px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </h1>

          {description && (
            <p
              style={{
                fontSize: "20px",
                fontWeight: 400,
                color: colors.textSecondary,
                lineHeight: 1.4,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          )}

          {tags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              {tags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    color: colors.primaryDark,
                    background: `${colors.sage}40`,
                    padding: "6px 16px",
                    borderRadius: "100px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: "16px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: colors.primary,
              }}
            >
              Coloring Habitat
            </span>
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
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontExports,
    },
  );
}
