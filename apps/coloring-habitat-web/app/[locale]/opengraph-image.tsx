import { ImageResponse } from "next/og";
import { getTranslationsForLocale } from "@/i18n/messages";
import { loadOGFonts, OG_FONT_CONFIG } from "@/lib/og/fonts";
import { colors, OG_WIDTH, OG_HEIGHT, accentColors } from "@/lib/og/constants";
import {
  getFeaturedColoringImagesForOG,
  type FeaturedOGImage,
} from "@/lib/og/data";

export const runtime = "nodejs";

export const alt = "Coloring Habitat — adult coloring pages, made on demand.";
export const size = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ locale: string }>;
};

const TILE_ROTATIONS = [-2, 1, -1, 2, -1, 1.5];

export default async function Image({ params }: Props) {
  const { locale } = await params;
  const t = (getTranslationsForLocale(locale) as any).og?.homepage ?? {};
  const tagline: string = t.tagline ?? "Adult coloring pages, made on demand.";

  const [fonts, featured] = await Promise.all([
    loadOGFonts(),
    getFeaturedColoringImagesForOG(6),
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

  if (featured.length === 0) {
    return new ImageResponse(renderTextFallback(tagline), {
      ...size,
      fonts: fontExports,
    });
  }

  return new ImageResponse(renderCollage(featured, tagline), {
    ...size,
    fonts: fontExports,
  });
}

const renderCollage = (images: FeaturedOGImage[], tagline: string) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      background: `linear-gradient(145deg, ${colors.bgCream} 0%, ${colors.sageLight} 50%, ${colors.bgCreamDark} 100%)`,
      fontFamily: OG_FONT_CONFIG.jakarta.name,
      padding: "48px 56px",
      position: "relative",
      overflow: "hidden",
    }}
  >
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

    <div
      style={{
        position: "absolute",
        bottom: "-100px",
        right: "-100px",
        width: "320px",
        height: "320px",
        borderRadius: "50%",
        backgroundColor: colors.lavenderLight,
        opacity: 0.4,
      }}
    />

    {/* Left: collage grid */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        width: "620px",
        height: "100%",
        alignItems: "center",
        alignContent: "center",
        gap: "14px",
      }}
    >
      {images.slice(0, 6).map((img, i) => (
        <div
          key={img.id}
          style={{
            display: "flex",
            width: "190px",
            height: "190px",
            backgroundColor: colors.bgWhite,
            borderRadius: "20px",
            boxShadow:
              "0 6px 20px rgba(45, 106, 79, 0.18), 0 2px 6px rgba(0, 0, 0, 0.06)",
            overflow: "hidden",
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
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      ))}
    </div>

    {/* Right: brand + tagline */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        paddingLeft: "40px",
        paddingRight: "8px",
        gap: "20px",
        zIndex: 1,
      }}
    >
      <span
        style={{
          fontSize: "56px",
          fontWeight: 800,
          color: colors.primary,
          letterSpacing: "-2px",
          lineHeight: 1.05,
        }}
      >
        Coloring Habitat
      </span>

      <p
        style={{
          fontSize: "30px",
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
          fontSize: "22px",
          fontWeight: 600,
          color: colors.primary,
          marginTop: "8px",
        }}
      >
        coloringhabitat.com
      </span>
    </div>

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
);

const renderTextFallback = (tagline: string) => (
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

    <p
      style={{
        fontSize: "30px",
        fontWeight: 600,
        color: colors.textSecondary,
        marginTop: "16px",
      }}
    >
      {tagline}
    </p>

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
);
