import { getColoringTier } from "./deviceUtils";

// getColoringTier(width, height) picks the coloring layout. Width drives
// three-column / middle / phone; a wide-but-SHORT window (iPhone-landscape) gets
// a height-adaptive three-column instead of the bottom sheet. The short-wide
// branch is subtle and must NOT affect portrait or iPad — these lock it.
describe("getColoringTier", () => {
  it("iPhone portrait → phone (bottom sheet)", () => {
    expect(getColoringTier(402, 874)).toBe("phone"); // iPhone 17 Pro portrait
    expect(getColoringTier(375, 812)).toBe("phone");
  });

  it("iPhone landscape (short + wide ≥740) → three-column", () => {
    expect(getColoringTier(932, 430)).toBe("three-column"); // iPhone 17 Pro
    expect(getColoringTier(852, 393)).toBe("three-column");
    expect(getColoringTier(745, 430)).toBe("three-column");
  });

  it("short but too NARROW for rails (<740) → phone", () => {
    expect(getColoringTier(700, 393)).toBe("phone");
  });

  it("short but BELOW the landscape floor (<380) → phone", () => {
    expect(getColoringTier(900, 360)).toBe("phone");
  });

  it("iPad (tall) → width tiers unchanged", () => {
    expect(getColoringTier(834, 1194)).toBe("middle"); // iPad Pro 11 portrait
    expect(getColoringTier(1366, 1024)).toBe("three-column"); // iPad 13 landscape
    expect(getColoringTier(1194, 834)).toBe("three-column"); // iPad 11 landscape
  });

  it("tall mid-width → middle", () => {
    expect(getColoringTier(800, 900)).toBe("middle");
  });

  it("width-only (height omitted) keeps the old behaviour", () => {
    expect(getColoringTier(1366)).toBe("three-column");
    expect(getColoringTier(800)).toBe("middle");
    expect(getColoringTier(400)).toBe("phone");
  });
});
