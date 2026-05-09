/**
 * Hero listing image v6 — Clean, warm scattered layout.
 *
 * Layout (1200×1200):
 *   - Soft cream background with subtle pattern
 *   - Top: Two-tone title with hand-drawn underline squiggle
 *   - Left: Large hero page with book-like shadow and slight tilt
 *   - Right: Scattered stack of thumbnails with organic rotations
 *   - Bottom: Brand logo
 *
 * No badge — the page count is shown in the subtitle text instead.
 */

import satori from "satori";
import { LISTING_SIZE, PALETTE } from "../palette";
import { buildFontConfig, type ListingFonts } from "../fonts";
import { buildSquiggleDataUri } from "../squiggle";

export type HeroInput = {
  bundleName: string;
  /**
   * Optional small prefix shown above/before the bundle name, Wyo-style
   * ("Combo 1:", "Bundle 01:"). Renders in pink with a squiggle underline.
   * Pass null for unlabelled bundles.
   */
  bundlePrefix?: string;
  tagline: string;
  pageCount: number;
  bgDataUri: string;
  ccLogoDataUri: string;
  thumbnails: ReadonlyArray<{ bundleOrder: number; dataUri: string }>;
  fonts: ListingFonts;
};

// Organic rotation values for scattered thumbnails — creates the "thrown
// on table" feel without crashing into neighbour borders. ±4° max with
// small offsets keeps the envelope inside the gap.
const SCATTER_ROTATIONS = [
  { rotate: -4, offsetX: 0, offsetY: 0 },
  { rotate: 3, offsetX: 6, offsetY: -4 },
  { rotate: -2, offsetX: -4, offsetY: 5 },
  { rotate: 4, offsetX: 8, offsetY: -2 },
  { rotate: -3, offsetX: -5, offsetY: 4 },
  { rotate: 2, offsetX: 4, offsetY: -6 },
  { rotate: -3, offsetX: -2, offsetY: 4 },
  { rotate: 2, offsetX: 7, offsetY: -3 },
  { rotate: -2, offsetX: -4, offsetY: 2 },
];

export async function renderHero(input: HeroInput): Promise<string> {
  const { thumbnails } = input;
  const heroPage = thumbnails.find((t) => t.bundleOrder === 1) ?? thumbnails[0];
  const heroOrder = heroPage?.bundleOrder ?? -1;
  const seen = new Set<number>([heroOrder]);
  const gridPages = thumbnails
    .filter((t) => {
      if (seen.has(t.bundleOrder)) return false;
      seen.add(t.bundleOrder);
      return true;
    })
    .slice(0, 9);

  // Layout constants — title sits in top ~32% of the trim; hero card +
  // thumb cluster occupy the middle band (~37-90%). Gaps tuned so each
  // thumb has visible breathing room (gap=4% of trim, thumb=12% wide).
  const TITLE_TOP = 50;
  const HERO_PAGE_SIZE = 500;
  const HERO_PAGE_LEFT = 60;
  const HERO_PAGE_TOP = 440;

  // 3x3 thumbnail cluster on the right of the hero card. Wider gaps
  // between thumbs (~50pt) so the cluster reads as airy rather than
  // crammed.
  const THUMB_SIZE = 145;
  const SCATTER_START_X = 624;
  const SCATTER_START_Y = 440;
  const SCATTER_COLS = 3;
  const SCATTER_GAP_X = 192;
  const SCATTER_GAP_Y = 216;

  // Squiggle anchors the bundle name as the title. Always rendered now
  // (used to gate on bundlePrefix, which is no longer surfaced).
  const squiggleDataUri = buildSquiggleDataUri({
    width: 420,
    height: 32,
    color: PALETTE.crayonPinkLight,
    strokeWidth: 8,
    seed: 11,
  });

  return satori(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: LISTING_SIZE,
        height: LISTING_SIZE,
        fontFamily: "Tondo",
      }}
    >
      {/* Tiled background */}
      <img
        src={input.bgDataUri}
        width={LISTING_SIZE}
        height={LISTING_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Title block — bundle name is the headline; squiggle anchors it
          as the title. The earlier "Bundle 01:" prefix was dropped
          since serial numbering didn't earn its visual space. */}
      <div
        style={{
          position: "absolute",
          top: TITLE_TOP,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1,
            color: "#A06FB0",
            whiteSpace: "nowrap",
            letterSpacing: 2,
          }}
        >
          {input.bundleName.toUpperCase()}
        </div>
        {squiggleDataUri ? (
          <img
            src={squiggleDataUri}
            width={420}
            height={28}
            style={{ marginTop: -2 }}
          />
        ) : null}

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 16,
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 2,
            color: PALETTE.brown,
          }}
        >
          {input.pageCount} COLORING PAGES • PDF + ONLINE
        </div>
      </div>

      {/* Hero page — large with book-like shadow for 3D depth */}
      {heroPage ? (
        <div
          style={{
            position: "absolute",
            top: HERO_PAGE_TOP,
            left: HERO_PAGE_LEFT,
            display: "flex",
            width: HERO_PAGE_SIZE,
            height: HERO_PAGE_SIZE,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            border: `4px solid ${PALETTE.brown}`,
            padding: 16,
            boxSizing: "border-box",
            transform: "rotate(-2deg)",
            boxShadow: `
              8px 8px 0 0 rgba(92, 58, 33, 0.15),
              16px 16px 20px -5px rgba(92, 58, 33, 0.12)
            `,
          }}
        >
          <img
            src={heroPage.dataUri}
            width={HERO_PAGE_SIZE - 40}
            height={HERO_PAGE_SIZE - 40}
            style={{ borderRadius: 12 }}
          />
        </div>
      ) : null}

      {/* Scattered thumbnails — organic layout with rotations */}
      {gridPages.map((t, idx) => {
        const scatter = SCATTER_ROTATIONS[idx % SCATTER_ROTATIONS.length];
        const col = idx % SCATTER_COLS;
        const row = Math.floor(idx / SCATTER_COLS);
        const baseX = SCATTER_START_X + col * SCATTER_GAP_X;
        const baseY = SCATTER_START_Y + row * SCATTER_GAP_Y;
        const finalX = baseX + scatter.offsetX;
        const finalY = baseY + scatter.offsetY;

        return (
          <div
            key={t.bundleOrder}
            style={{
              position: "absolute",
              top: finalY,
              left: finalX,
              display: "flex",
              flexDirection: "column",
              width: THUMB_SIZE,
              transform: `rotate(${scatter.rotate}deg)`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                border: `3px solid ${PALETTE.brown}`,
                padding: 6,
                boxSizing: "border-box",
                boxShadow: `
                  3px 3px 0 0 rgba(92, 58, 33, 0.1),
                  6px 6px 12px -3px rgba(92, 58, 33, 0.08)
                `,
              }}
            >
              <img
                src={t.dataUri}
                width={THUMB_SIZE - 18}
                height={THUMB_SIZE - 18}
                style={{ borderRadius: 8 }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 6,
                fontFamily: "Tondo",
                fontWeight: 700,
                fontSize: 13,
                color: PALETTE.brownLight,
                letterSpacing: 0.5,
              }}
            >
              Page {t.bundleOrder}
            </div>
          </div>
        );
      })}

      {/* Brand logo — bottom centre */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img src={input.ccLogoDataUri} width={68} height={68} />
      </div>
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
