import { getLandscapeRailFit, getLandscapeSidebarWidths } from "./Sizes";

// getLandscapeRailFit is the SINGLE source of truth for the height-adaptive
// landscape rail fit. The rails render with it AND getLandscapeSidebarWidths
// splits the columns with it, so the canvas always reclaims exactly the width
// the rails give up. Two invariants matter most:
//   1. A tall window (iPad / undefined height) MUST resolve to today's CEIL
//      sizes — the iPad layout is byte-for-byte unchanged.
//   2. On a short window (iPhone landscape) the swatch grid (6 rows) MUST fit
//      inside the rail's available height — no bottom-row overflow.
describe("getLandscapeRailFit", () => {
  it("tall window (undefined) → iPad CEIL sizes", () => {
    const fit = getLandscapeRailFit(undefined);
    expect(fit.swatchSize).toBe(51);
    expect(fit.pillHeight).toBe(48);
    expect(fit.tileSize).toBe(61);
    expect(fit.controlSize).toBe(48);
    // 3 × 51 + 2×6 gap + 2×16 padding = 197 → matches LEFT_RAIL_CARD_WIDTH (198±1)
    expect(fit.leftCardWidth).toBe(3 * (51 + 6) + 32);
    // CEIL tools content = the 3-tile grid (199): 3×61 + 2×8.
    expect(fit.toolsContentWidth).toBe(3 * 61 + 2 * 8);
    // Card = content + 2×16 padding + 2×2 border (border-box: the border eats
    // the content width, so it MUST be included or the rightmost tile clips).
    expect(fit.rightCardWidth).toBe(3 * 61 + 2 * 8 + 32 + 4);
  });

  it("tall numeric window (iPad landscape height) → still CEIL", () => {
    expect(getLandscapeRailFit(900).swatchSize).toBe(51);
    expect(getLandscapeRailFit(900).tileSize).toBe(61);
  });

  it("short window (iPhone landscape) → shrinks below CEIL", () => {
    const fit = getLandscapeRailFit(350);
    expect(fit.swatchSize).toBeLessThan(51);
    expect(fit.swatchSize).toBeGreaterThanOrEqual(30); // FLOOR
    expect(fit.tileSize).toBeLessThan(61);
    expect(fit.tileSize).toBeGreaterThanOrEqual(Math.round(61 * 0.72)); // FLOOR_FACTOR
  });

  it("swatch grid fits the rail height whenever the swatch FLOOR isn't hit", () => {
    // When the resize can solve the fit (swatchSize stays above the 30px floor),
    // the whole vertical stack MUST fit inside `h` — no clip. Below that the
    // floor is hit and the ScrollView net (in the rail) catches the overflow, so
    // we don't assert exact fit there (it intentionally scrolls).
    for (const h of [330, 350, 400, 450, 520]) {
      const fit = getLandscapeRailFit(h);
      if (fit.swatchSize <= 30) continue; // floor hit → ScrollView handles it
      const cardChrome = 2 * 2 + 2 * 16; // border + padding
      const pillsBlock = 2 * fit.pillHeight + 16;
      const railGap = 12;
      const gridPadTop = 2;
      const gridHeight = 6 * (fit.swatchSize + 6); // 6 rows, swatch + gap
      const total = cardChrome + pillsBlock + railGap + gridPadTop + gridHeight;
      expect(total).toBeLessThanOrEqual(h);
    }
  });

  it("swatch size never drops below the 30px tap-target floor", () => {
    for (const h of [200, 250, 300, 330]) {
      expect(getLandscapeRailFit(h).swatchSize).toBeGreaterThanOrEqual(30);
    }
  });
});

// The column split must use the SAME shrunk card widths as the rails, so the
// canvas reclaims the freed width (instead of the old fixed-iPad-width gutter).
describe("getLandscapeSidebarWidths × rail fit", () => {
  it("iPhone 17 Pro landscape: canvas reclaims width from shrunk rails", () => {
    // 932×430, notch on the right (≈59), rails fit ~350px tall.
    const wide = getLandscapeSidebarWidths(932, 430, 0, 59, 350);
    const tallNoop = getLandscapeSidebarWidths(932, 430, 0, 59, undefined);
    // Shrunk rails → narrower side columns → BIGGER canvas than the iPad-width
    // (un-shrunk) split would give.
    expect(wide.canvasSize).toBeGreaterThan(tallNoop.canvasSize);
    expect(wide.canvasSize).toBeGreaterThan(0);
    // The right column reserves the notch inset.
    expect(wide.rightWidth).toBeGreaterThan(wide.leftWidth);
  });

  it("iPad landscape (tall): side widths = iPad CEIL card + gap, unchanged", () => {
    const fit = getLandscapeRailFit(undefined);
    const { leftWidth, rightWidth } = getLandscapeSidebarWidths(
      1366,
      1024,
      0,
      0,
      900,
    );
    expect(leftWidth).toBe(fit.leftCardWidth + 16); // + CANVAS_COLUMN_GAP
    expect(rightWidth).toBe(fit.rightCardWidth + 16);
  });
});
