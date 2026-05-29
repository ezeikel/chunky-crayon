import { describe, expect, it } from "vitest";

import {
  babyNameExternalId,
  buildBabyNameContent,
  countDeltaPct,
  isPostWorthyPair,
  type BabyNameRow,
} from "./babynames";

/**
 * The baby-names engine cycles a public dataset into endless posts. The
 * delta math + post-worthy filter decide WHICH name trends become content,
 * and the content builder writes the words that go out under the brand.
 * All pure, all directly shaping what publishes, so they're pinned here:
 * a divide-by-zero or an off-by-one in the filter means either junk posts
 * or a silent empty catalogue.
 */

const row = (over: Partial<BabyNameRow>): BabyNameRow => ({
  region: "uk",
  name: "Aria",
  sex: "F",
  year: 2010,
  count: 100,
  ...over,
});

describe("countDeltaPct", () => {
  it("computes a rounded percentage rise", () => {
    expect(countDeltaPct(100, 150)).toBe(50);
  });

  it("computes a percentage fall as negative", () => {
    expect(countDeltaPct(200, 50)).toBe(-75);
  });

  it("returns null when the earlier count is zero (no meaningful pct)", () => {
    expect(countDeltaPct(0, 500)).toBeNull();
    expect(countDeltaPct(-1, 500)).toBeNull();
  });
});

describe("babyNameExternalId", () => {
  it("is stable + lower-cased for dedup", () => {
    expect(babyNameExternalId(row({ name: "Aria", year: 2023 }))).toBe(
      "uk-2023-F-aria",
    );
  });
});

describe("isPostWorthyPair", () => {
  it("flags a rise from near-zero to substantial", () => {
    expect(
      isPostWorthyPair(
        row({ year: 1996, count: 5 }),
        row({ year: 2023, count: 500 }),
      ),
    ).toBe(true);
  });

  it("flags a big rank move", () => {
    expect(
      isPostWorthyPair(
        row({ rank: 120, count: 300 }),
        row({ rank: 8, count: 900 }),
      ),
    ).toBe(true);
  });

  it("flags a big proportional swing", () => {
    expect(isPostWorthyPair(row({ count: 400 }), row({ count: 60 }))).toBe(
      true,
    ); // -85%
  });

  it("rejects a boring drift", () => {
    expect(isPostWorthyPair(row({ count: 100 }), row({ count: 104 }))).toBe(
      false,
    );
  });
});

describe("buildBabyNameContent", () => {
  it("frames a near-zero rise as 'almost none' with the later count center", () => {
    const c = buildBabyNameContent(
      row({ year: 1996, count: 5, name: "Aria" }),
      row({ year: 2023, count: 500, name: "Aria" }),
    );
    expect(c.hook).toContain("almost no");
    expect(c.hook).toContain("1996");
    expect(c.centerBlock).toBe("500");
    expect(c.category).toBe("baby-names");
    expect(c.sourceUrl).toContain("ons.gov.uk");
  });

  it("uses a percentage center block for ordinary swings", () => {
    const c = buildBabyNameContent(
      row({ year: 2010, count: 100 }),
      row({ year: 2023, count: 175 }),
    );
    expect(c.centerBlock).toBe("+75%");
  });

  it("uses the US source for us rows", () => {
    const c = buildBabyNameContent(
      row({ region: "us", year: 2000, count: 50, name: "Aiden", sex: "M" }),
      row({ region: "us", year: 2010, count: 900, name: "Aiden", sex: "M" }),
    );
    expect(c.sourceUrl).toContain("ssa.gov");
    expect(c.hook).toContain("boys");
    expect(c.hook).toContain("the US");
  });

  it("never emits an em dash in generated copy", () => {
    const c = buildBabyNameContent(
      row({ year: 1996, count: 5 }),
      row({ year: 2023, count: 500 }),
    );
    const all = `${c.hook} ${c.payoff} ${c.coverTeaser}`;
    expect(all).not.toContain("—");
    expect(all).not.toContain("–");
  });
});
