/**
 * BrandCard listing image — the "Hey there!" welcome page that ships
 * alongside Hero + 3 page grids in a Coco-Wyo-style listing set.
 *
 * Layout (1200×1200):
 *   - Tiled bg (cream + crayon scribbles)
 *   - Centered "Hey there!" headline in Tondo Bold (sentence case)
 *   - Welcome paragraph below
 *   - Featured bundle character (e.g. colored Rex) bottom half, large
 *   - C logo bottom-right corner (replaces wordmark)
 *
 * Character sourcing: prefers `brandCharacterUrl` (the bundle's polished
 * colored mascot, e.g. Rex for Dino Dance Party). Falls back to the Colo
 * waving SVG when a bundle hasn't generated its character yet.
 */

import satori from "satori";
import { LISTING_SIZE, PALETTE } from "../palette";
import { buildFontConfig, type ListingFonts } from "../fonts";

export type BrandCardInput = {
  bundleName: string;
  bgDataUri: string; // tiled-bg full-size PNG data URI
  characterDataUri: string; // colored bundle character OR Colo fallback
  ccLogoDataUri: string;
  fonts: ListingFonts;
};

export async function renderBrandCard(input: BrandCardInput): Promise<string> {
  // Character sized to 560px = ~47% of canvas height. Bigger than v1 (380),
  // gives the welcome page warmth Wyo's frog-on-haystack has.
  const CHARACTER_SIZE = 560;

  return satori(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: LISTING_SIZE,
        height: LISTING_SIZE,
        fontFamily: "Tondo",
      }}
    >
      {/* Tiled background — single PNG covers full canvas */}
      <img
        src={input.bgDataUri}
        width={LISTING_SIZE}
        height={LISTING_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Headline — sentence case, larger, slightly higher on canvas */}
      <div
        style={{
          display: "flex",
          marginTop: 100,
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: 138,
          lineHeight: 1,
          color: PALETTE.crayonOrangeDark,
        }}
      >
        Hey there!
      </div>

      {/* Welcome paragraph */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 940,
          marginTop: 36,
          textAlign: "center",
          fontFamily: "Tondo",
          fontWeight: 400,
          fontSize: 38,
          lineHeight: 1.35,
          color: PALETTE.brown,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          A big warm thank you for picking up
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontWeight: 700,
            color: PALETTE.crayonOrangeDark,
            marginTop: 6,
          }}
        >
          {input.bundleName}!
        </div>
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 18 }}
        >
          We hope it brings hours of cozy, creative fun.
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          Happy coloring!
        </div>
      </div>

      {/* Featured character — bottom centre, large */}
      <img
        src={input.characterDataUri}
        width={CHARACTER_SIZE}
        height={CHARACTER_SIZE}
        style={{
          position: "absolute",
          bottom: 40,
          left: (LISTING_SIZE - CHARACTER_SIZE) / 2,
        }}
      />

      {/* C logo — bottom right corner, replaces the wordmark */}
      <img
        src={input.ccLogoDataUri}
        width={96}
        height={96}
        style={{
          position: "absolute",
          bottom: 40,
          right: 48,
        }}
      />
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
