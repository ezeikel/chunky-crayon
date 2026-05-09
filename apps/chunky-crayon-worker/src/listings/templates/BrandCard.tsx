/**
 * BrandCard listing image v3 — Warm welcome page.
 *
 * Layout (1200×1200):
 *   - Soft cream background with subtle pattern
 *   - "Hey there!" headline with hand-drawn squiggle underline
 *   - Friendly, concise welcome message
 *   - Featured bundle character (e.g. colored Rex) bottom centre, large
 *   - Decorative floating elements (hearts, stars) for warmth
 *
 * No logo — the character provides the brand presence.
 */

import satori from "satori";
import { LISTING_SIZE, PALETTE } from "../palette";
import { buildFontConfig, type ListingFonts } from "../fonts";
import { buildSquiggleDataUri } from "../squiggle";

export type BrandCardInput = {
  bundleName: string;
  bgDataUri: string; // tiled-bg full-size PNG data URI
  characterDataUri: string; // colored bundle character OR Colo fallback
  ccLogoDataUri: string;
  fonts: ListingFonts;
};

export async function renderBrandCard(input: BrandCardInput): Promise<string> {
  // Character sized to leave breathing room between sign-off and image.
  // 410pt char at bottom 60 starts at y = 1200 - 60 - 410 = 730. Body
  // block ends ~y=620 (post-sign-off), so ~110pt of clear cream between
  // "Happy coloring!" and the character.
  const CHARACTER_SIZE = 410;

  // Generate a warm underline squiggle for the headline
  const headlineSquiggle = buildSquiggleDataUri({
    width: 480,
    height: 36,
    color: PALETTE.crayonPink,
    strokeWidth: 10,
    seed: 42,
  });

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
      {/* Tiled background */}
      <img
        src={input.bgDataUri}
        width={LISTING_SIZE}
        height={LISTING_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Decorative floating hearts — adds warmth like CocoWyo */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 100,
          display: "flex",
          fontSize: 36,
          color: PALETTE.crayonPinkLight,
          transform: "rotate(-12deg)",
        }}
      >
        {"♥"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 240,
          right: 120,
          display: "flex",
          fontSize: 28,
          color: PALETTE.crayonYellowLight,
          transform: "rotate(15deg)",
        }}
      >
        {"★"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 80,
          display: "flex",
          fontSize: 24,
          color: PALETTE.crayonYellow,
          transform: "rotate(-8deg)",
        }}
      >
        {"✦"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 380,
          right: 90,
          display: "flex",
          fontSize: 32,
          color: PALETTE.crayonPink,
          transform: "rotate(10deg)",
        }}
      >
        {"♥"}
      </div>

      {/* Headline — Tondo Bold with squiggle underline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 90,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 120,
            lineHeight: 1,
            color: PALETTE.crayonOrangeDark,
          }}
        >
          Hey there!
        </div>
        <img
          src={headlineSquiggle}
          width={420}
          height={32}
          style={{ marginTop: -8 }}
        />
      </div>

      {/* Welcome paragraph — clear typographic rhythm with a separated
          sign-off block so the closing reads as a flourish, not a 5th
          line of paragraph. Whole block lives in top half of card,
          ending around y=620 so it clears the character at y=720. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 900,
          marginTop: 28,
          textAlign: "center",
          fontFamily: "Tondo",
          fontWeight: 400,
          fontSize: 30,
          lineHeight: 1.35,
          color: PALETTE.brown,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          Thanks for picking up
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontWeight: 700,
            color: "#A06FB0",
            marginTop: 8,
            fontSize: 46,
            letterSpacing: 0.5,
          }}
        >
          {input.bundleName}!
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 36,
            fontSize: 28,
            lineHeight: 1.5,
          }}
        >
          Print every page, color them online,
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 28,
            lineHeight: 1.5,
          }}
        >
          do both. Whatever your tiny artist wants.
        </div>
        {/* Sign-off — wider top margin separates from body. No
            "Chunky Crayon" attribution because the character below
            IS the brand presence. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 56,
            fontWeight: 700,
            color: PALETTE.crayonOrangeDark,
            fontSize: 36,
          }}
        >
          Happy coloring!
        </div>
      </div>

      {/* Featured character — bottom centre, slightly larger with shadow */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: (LISTING_SIZE - CHARACTER_SIZE) / 2,
          display: "flex",
          filter: "drop-shadow(4px 6px 8px rgba(92, 58, 33, 0.15))",
        }}
      >
        <img
          src={input.characterDataUri}
          width={CHARACTER_SIZE}
          height={CHARACTER_SIZE}
        />
      </div>
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
