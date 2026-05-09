/**
 * PageGrid listing image v2 — CocoWyo-inspired scattered page preview.
 *
 * Layout (1200×1200):
 *   - Soft cream background with subtle pattern
 *   - Header: "PDF DOWNLOAD" badge + bundle name in playful type
 *   - 4 pages displayed with organic rotations and shadows — NOT a
 *     rigid 2x2 grid, but scattered like photos on a table
 *   - Each page has a soft shadow and slight tilt for depth
 *   - Footer with logo + sheet indicator
 *
 * The scattered layout gives warmth and personality, suggesting a
 * curated collection rather than a sterile product shot.
 */

import satori from "satori";
import { LISTING_SIZE, PALETTE } from "../palette";
import { buildFontConfig, type ListingFonts } from "../fonts";

export type PageGridInput = {
  bundleName: string;
  bgDataUri: string;
  ccLogoDataUri: string;
  /**
   * Pre-fetched + base64-encoded thumbnails for THIS sheet only (not all
   * 10 bundle pages — caller slices to the relevant 1-4 of them).
   * Sorted by bundleOrder ascending.
   */
  thumbnails: ReadonlyArray<{ bundleOrder: number; dataUri: string }>;
  /** 1-indexed sheet number (1, 2, or 3). Used in subtle "Sheet N of 3" cue. */
  sheetIndex: number;
  /** Total sheet count for this bundle. */
  totalSheets: number;
  fonts: ListingFonts;
};

// 2x2 positions for the 4-page layout. Tilts kept to ±2° so rotation
// envelopes stay inside the gap. Y gap between rows is wide enough that
// caption text below row 1 doesn't crash into row 2 thumbs.
const SCATTER_POSITIONS = [
  { x: 95, y: 200, rotate: -2 },
  { x: 645, y: 200, rotate: 2 },
  { x: 95, y: 720, rotate: 2 },
  { x: 645, y: 720, rotate: -2 },
];

const THUMB_SIZE = 460;

export async function renderPageGrid(input: PageGridInput): Promise<string> {
  // Pad thumbnails out to 4 slots. Empty slots become a "Happy coloring!"
  // decorative card on the last sheet.
  const slots: Array<
    { kind: "thumb"; bundleOrder: number; dataUri: string } | { kind: "empty" }
  > = [];
  for (let i = 0; i < 4; i++) {
    const t = input.thumbnails[i];
    if (t) {
      slots.push({
        kind: "thumb",
        bundleOrder: t.bundleOrder,
        dataUri: t.dataUri,
      });
    } else {
      slots.push({ kind: "empty" });
    }
  }

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

      {/* Header — small eyebrow ("PDF DOWNLOAD") above the bundle
          name. Eyebrow is ~40% of the headline size + muted brown so
          it reads as a category label. */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 6,
            color: PALETTE.brownLight,
            textTransform: "uppercase",
          }}
        >
          PDF Download
        </span>
        <span
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: 1,
            color: "#A06FB0",
          }}
        >
          {input.bundleName.toUpperCase()}
        </span>
      </div>

      {/* Scattered page thumbnails */}
      {slots.map((slot, idx) => {
        const pos = SCATTER_POSITIONS[idx];
        return slot.kind === "thumb" ? (
          <div
            key={`thumb-${slot.bundleOrder}`}
            style={{
              position: "absolute",
              top: pos.y,
              left: pos.x,
              display: "flex",
              flexDirection: "column",
              width: THUMB_SIZE,
              transform: `rotate(${pos.rotate}deg)`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                border: `4px solid ${PALETTE.brown}`,
                padding: 16,
                boxSizing: "border-box",
                boxShadow: `
                  4px 4px 0 0 rgba(92, 58, 33, 0.12),
                  8px 8px 16px -4px rgba(92, 58, 33, 0.1)
                `,
              }}
            >
              <img
                src={slot.dataUri}
                width={THUMB_SIZE - 40}
                height={THUMB_SIZE - 40}
                style={{ borderRadius: 12 }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 12,
                fontFamily: "Tondo",
                fontWeight: 700,
                fontSize: 20,
                color: PALETTE.brownLight,
                letterSpacing: 0.5,
                fontStyle: "italic",
              }}
            >
              Page {slot.bundleOrder}
            </div>
          </div>
        ) : (
          <div
            key={`empty-${idx}`}
            style={{
              position: "absolute",
              top: pos.y,
              left: pos.x,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              border: `4px dashed ${PALETTE.crayonOrangeLight}`,
              padding: 30,
              boxSizing: "border-box",
              transform: `rotate(${pos.rotate}deg)`,
              boxShadow: `
                4px 4px 0 0 rgba(92, 58, 33, 0.08),
                8px 8px 16px -4px rgba(92, 58, 33, 0.06)
              `,
            }}
          >
            <img
              src={input.ccLogoDataUri}
              width={100}
              height={100}
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Tondo",
                fontWeight: 700,
                fontSize: 36,
                color: PALETTE.crayonOrangeDark,
                textAlign: "center",
              }}
            >
              Happy coloring!
            </div>
          </div>
        );
      })}
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
