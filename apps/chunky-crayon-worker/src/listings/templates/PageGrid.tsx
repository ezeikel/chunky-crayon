/**
 * PageGrid listing image — 2x2 sheet of bundle page thumbnails with a
 * Wyo-style header strip ("PDF DOWNLOAD ♥ {BUNDLE NAME}") and per-page
 * captions. One template renders 3 sheets per bundle (pages 1-4, 5-8,
 * 9-10) by passing different `pageSlice` and `sheetIndex` values.
 *
 * The last sheet (9-10) only has 2 pages, so the remaining slots are
 * filled with a friendly "Happy coloring!" message + C logo.
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

const HEADER_HEIGHT = 110;
const FRAME_PAD = 50;
const GRID_GAP = 30;

export async function renderPageGrid(input: PageGridInput): Promise<string> {
  // Vertical budget walkthrough so the grid stops cutting off:
  //   Canvas:                      1200
  //   Header strip block ends at:   110
  //   Top pad after header:          60   → grid starts at y = 170
  //   Footer strip occupies:        100 from bottom → grid must end ≤ 1100
  //   Available for grid+captions: 1100 - 170 = 930
  //   2 thumbs vertically + GRID_GAP + 2× caption (≈45 each) ≤ 930
  //   → THUMB ≤ (930 - 30 - 90) / 2 = 405
  //
  // Pick THUMB_SIZE = 400 with breathing room. The grid width then is
  // 2×400 + 30 = 830, centered horizontally on the canvas.
  const THUMB_SIZE = 400;
  const THUMB_AREA_TOP = HEADER_HEIGHT + 60;
  const GRID_WIDTH = THUMB_SIZE * 2 + GRID_GAP;
  const THUMB_AREA_LEFT = (LISTING_SIZE - GRID_WIDTH) / 2;
  const THUMB_AREA_WIDTH = GRID_WIDTH;

  // Pad thumbnails out to 4 slots so the 2x2 always renders. Empty slots
  // become a "Happy coloring!" decorative card on the last sheet.
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
      {/* Tiled bg */}
      <img
        src={input.bgDataUri}
        width={LISTING_SIZE}
        height={LISTING_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      {/* Header strip — Wyo-style "PDF DOWNLOAD ♥ BUNDLE NAME". Tondo
          Bold (our standard body font) for "PDF DOWNLOAD" and the heart;
          bundle name stays in Bubblegum Sans purple to mirror the Hero
          title treatment. */}
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <span
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 44,
            letterSpacing: 1.5,
            color: PALETTE.crayonOrangeDark,
          }}
        >
          PDF DOWNLOAD
        </span>
        <span
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 44,
            color: "#E5639A",
          }}
        >
          ♥
        </span>
        <span
          style={{
            display: "flex",
            fontFamily: "Bubblegum Sans",
            fontSize: 52,
            color: "#A06FB0",
          }}
        >
          {input.bundleName.toUpperCase()}
        </span>
      </div>

      {/* 2x2 grid */}
      <div
        style={{
          position: "absolute",
          top: THUMB_AREA_TOP,
          left: THUMB_AREA_LEFT,
          display: "flex",
          flexWrap: "wrap",
          width: THUMB_AREA_WIDTH,
          gap: GRID_GAP,
        }}
      >
        {slots.map((slot, idx) =>
          slot.kind === "thumb" ? (
            <div
              key={`thumb-${slot.bundleOrder}`}
              style={{
                display: "flex",
                flexDirection: "column",
                width: THUMB_SIZE,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 22,
                  border: `5px solid ${PALETTE.brown}`,
                  padding: 18,
                  boxSizing: "border-box",
                }}
              >
                <img
                  src={slot.dataUri}
                  width={THUMB_SIZE - 46}
                  height={THUMB_SIZE - 46}
                  style={{ borderRadius: 14 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 10,
                  fontFamily: "Tondo",
                  fontWeight: 700,
                  fontSize: 22,
                  color: PALETTE.brownLight,
                  letterSpacing: 0.5,
                }}
              >
                Chunky Crayon · Page {slot.bundleOrder}
              </div>
            </div>
          ) : (
            <div
              key={`empty-${idx}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                backgroundColor: "#FFFFFF",
                borderRadius: 22,
                border: `5px dashed ${PALETTE.crayonOrangeLight}`,
                padding: 30,
                boxSizing: "border-box",
              }}
            >
              <img
                src={input.ccLogoDataUri}
                width={140}
                height={140}
                style={{ marginBottom: 24 }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: "Bubblegum Sans",
                  fontSize: 50,
                  color: PALETTE.crayonOrangeDark,
                  textAlign: "center",
                }}
              >
                Happy coloring!
              </div>
            </div>
          ),
        )}
      </div>

      {/* Footer — C logo + sheet count cue. Wordmark dropped — logo is
          enough brand signal. */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <img src={input.ccLogoDataUri} width={56} height={56} />
        <div
          style={{
            display: "flex",
            fontFamily: "Tondo",
            fontWeight: 400,
            fontSize: 22,
            color: PALETTE.brownLight,
          }}
        >
          Sheet {input.sheetIndex} of {input.totalSheets}
        </div>
      </div>
    </div>,
    {
      width: LISTING_SIZE,
      height: LISTING_SIZE,
      fonts: buildFontConfig(input.fonts),
    },
  );
}
