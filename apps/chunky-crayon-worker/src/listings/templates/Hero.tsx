/**
 * Hero listing image v4 — Wyo-inspired warmth.
 *
 * Layout (1200×1200):
 *   - Tiled bg
 *   - Top: two-tone Bubblegum Sans display title ("Bundle 01:" pink +
 *     "DINO DANCE PARTY" purple), with a hand-drawn pink squiggle under
 *     the prefix
 *   - Subtitle: "10 COLORING PAGES • PDF + ONLINE" in Tondo Bold
 *   - Mid-left: enlarged page 1 with brown frame + slight tilt
 *   - Mid-right: 3x3 thumbnail grid of pages 2-10, each with a soft
 *     "Page N" caption
 *   - Floating scalloped pink badge "10 PAGES" overlapping hero/grid
 *     divider, hand-drawn feel
 *   - Bottom centre: C logo + "Chunky Crayon" wordmark
 */

import satori from "satori";
import { LISTING_SIZE, PALETTE } from "../palette";
import { buildFontConfig, type ListingFonts } from "../fonts";
import { buildSquiggleDataUri } from "../squiggle";
import { buildBadgeDataUri } from "../badge";

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

  // Layout constants
  const TITLE_TOP = 70;
  const HERO_PAGE_SIZE = 540;
  const HERO_PAGE_LEFT = 50;
  const HERO_PAGE_TOP = 380;
  const GRID_LEFT = HERO_PAGE_LEFT + HERO_PAGE_SIZE + 20;
  const GRID_TOP = HERO_PAGE_TOP + 4;
  const GRID_THUMB = 175;
  const GRID_GAP = 10;
  const BADGE_SIZE = 220;

  const prefix = input.bundlePrefix?.trim();
  const showPrefix = prefix && prefix.length > 0;

  // Pre-build the squiggle + badge data URIs. These are cheap and only
  // generated once per render call.
  const squiggleDataUri = showPrefix
    ? buildSquiggleDataUri({
        width: 360,
        height: 32,
        color: PALETTE.crayonPinkLight ? "#E89098" : "#E89098",
        strokeWidth: 7,
        seed: 11,
      })
    : null;

  const badgeDataUri = buildBadgeDataUri({
    size: BADGE_SIZE,
    fill: PALETTE.crayonPink,
    stroke: PALETTE.brown,
    strokeWidth: 6,
    bumps: 12,
    bumpDepth: 0.05,
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
      {/* Tiled bg */}
      <img
        src={input.bgDataUri}
        width={LISTING_SIZE}
        height={LISTING_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Title block — two-tone Bubblegum Sans on stacked rows so the
          bundle name always fits regardless of length. Prefix line above
          (smaller, pink, with squiggle), bundle name below (larger,
          purple). */}
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
        {showPrefix ? (
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Tondo",
                fontWeight: 700,
                fontSize: 52,
                lineHeight: 1,
                color: "#E5639A", // crayon-pink-dark
                whiteSpace: "nowrap",
                letterSpacing: 1,
              }}
            >
              {prefix}
            </div>
            {squiggleDataUri ? (
              <img
                src={squiggleDataUri}
                width={300}
                height={28}
                style={{ marginTop: -2 }}
              />
            ) : null}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: showPrefix ? 6 : 0,
            fontFamily: "Bubblegum Sans",
            fontSize: 102,
            lineHeight: 1,
            color: "#A06FB0", // crayon-purple
            whiteSpace: "nowrap",
          }}
        >
          {input.bundleName.toUpperCase()}
        </div>

        {/* Subtitle — leans into the differentiator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 14,
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: 2,
            color: PALETTE.brown,
          }}
        >
          {input.pageCount} COLORING PAGES • PDF + ONLINE
        </div>
      </div>

      {/* Hero page — large, slight tilt, brown frame */}
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
            borderRadius: 24,
            border: `5px solid ${PALETTE.brown}`,
            padding: 18,
            boxSizing: "border-box",
            transform: "rotate(-3deg)",
          }}
        >
          <img
            src={heroPage.dataUri}
            width={HERO_PAGE_SIZE - 46}
            height={HERO_PAGE_SIZE - 46}
            style={{ borderRadius: 14 }}
          />
        </div>
      ) : null}

      {/* 3x3 thumbnail grid — pages 2-10 with per-thumb captions */}
      <div
        style={{
          position: "absolute",
          top: GRID_TOP,
          left: GRID_LEFT,
          display: "flex",
          flexWrap: "wrap",
          width: GRID_THUMB * 3 + GRID_GAP * 2,
          gap: GRID_GAP,
        }}
      >
        {gridPages.map((t) => (
          <div
            key={t.bundleOrder}
            style={{
              display: "flex",
              flexDirection: "column",
              width: GRID_THUMB,
            }}
          >
            <div
              style={{
                display: "flex",
                width: GRID_THUMB,
                height: GRID_THUMB,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                border: `3px solid ${PALETTE.brown}`,
                padding: 6,
                boxSizing: "border-box",
              }}
            >
              <img
                src={t.dataUri}
                width={GRID_THUMB - 18}
                height={GRID_THUMB - 18}
                style={{ borderRadius: 8 }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 4,
                fontFamily: "Tondo",
                fontWeight: 700,
                fontSize: 14,
                color: PALETTE.brownLight,
                letterSpacing: 0.5,
              }}
            >
              Page {t.bundleOrder}
            </div>
          </div>
        ))}
      </div>

      {/* Scalloped pink badge — top-right corner of the hero page,
          rotated +12deg so it reads as a sticker. Doesn't overlap the
          thumbnail grid. */}
      <div
        style={{
          position: "absolute",
          top: HERO_PAGE_TOP - BADGE_SIZE / 2 + 30,
          left: HERO_PAGE_LEFT + HERO_PAGE_SIZE - BADGE_SIZE / 2 - 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          transform: "rotate(12deg)",
        }}
      >
        <img
          src={badgeDataUri}
          width={BADGE_SIZE}
          height={BADGE_SIZE}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        <div
          style={{
            display: "flex",
            position: "relative",
            fontFamily: "Bubblegum Sans",
            fontSize: 78,
            lineHeight: 1,
            color: "#FFFFFF",
            textShadow: `2px 2px 0 ${PALETTE.brown}`,
          }}
        >
          {input.pageCount}
        </div>
        <div
          style={{
            display: "flex",
            position: "relative",
            marginTop: 4,
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 26,
            color: "#FFFFFF",
            letterSpacing: 1.5,
          }}
        >
          PAGES
        </div>
      </div>

      {/* Brand anchor — bottom centre, just the C logo. The logo is the
          brand mark; we don't need the wordmark too (and it was reading
          off-key in Bubblegum Sans). */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img src={input.ccLogoDataUri} width={72} height={72} />
      </div>
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
