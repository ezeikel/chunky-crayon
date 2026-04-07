import { ImageResponse } from "next/og";
import { loadOGFonts, OG_FONT_CONFIG } from "@/lib/og/fonts";
import { colors, OG_WIDTH, OG_HEIGHT, accentColors } from "@/lib/og/constants";
import { getSharedArtworkForOG } from "@/lib/og/data";

export const runtime = "nodejs";

export const alt = "Shared Artwork - Coloring Habitat";
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ code: string; locale: string }>;
};

export default async function Image({ params }: Props) {
  const { code } = await params;

  const [fonts, artwork] = await Promise.all([
    loadOGFonts(),
    getSharedArtworkForOG(code),
  ]);

  const [jakartaRegular, jakartaBold, jakartaExtraBold] = fonts;

  // Fallback if artwork not found
  if (!artwork) {
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
            background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.bgCreamDark} 100%)`,
            fontFamily: OG_FONT_CONFIG.jakarta.name,
          }}
        >
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: colors.primary,
            }}
          >
            Artwork Not Found
          </span>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: OG_FONT_CONFIG.jakarta.name,
            data: jakartaExtraBold,
            weight: 800 as const,
          },
        ],
      },
    );
  }

  const displayImageUrl = artwork.thumbnailUrl || artwork.imageUrl;
  const rawTitle = artwork.title || artwork.originalTitle || "Masterpiece";
  const displayTitle =
    rawTitle.length > 40 ? `${rawTitle.substring(0, 40)}...` : rawTitle;
  const displayCreatorName = artwork.creatorName
    ? artwork.creatorName.length > 25
      ? `${artwork.creatorName.substring(0, 25)}...`
      : artwork.creatorName
    : null;

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
          background: `linear-gradient(145deg, ${colors.sageLight} 0%, ${colors.lavenderLight} 50%, ${colors.bgCream} 100%)`,
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
            height: "12px",
          }}
        >
          {accentColors.map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            backgroundColor: colors.sandLight,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            backgroundColor: colors.sageLight,
            opacity: 0.4,
          }}
        />

        {/* Main content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            zIndex: 1,
          }}
        >
          {/* Artwork frame */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "340px",
              height: "340px",
              backgroundColor: colors.bgWhite,
              borderRadius: "24px",
              boxShadow:
                "0 12px 48px rgba(45, 106, 79, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)",
              padding: "16px",
              border: `4px solid ${colors.sageLight}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt={displayTitle}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "12px",
              }}
            />
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: colors.textPrimary,
              textAlign: "center",
              margin: 0,
              maxWidth: "700px",
              lineHeight: 1.2,
            }}
          >
            {displayTitle}
          </h1>

          {/* Creator info */}
          {displayCreatorName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  color: colors.textSecondary,
                }}
              >
                Created by
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: colors.primary,
                }}
              >
                {displayCreatorName}
              </span>
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
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
            height: "10px",
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
