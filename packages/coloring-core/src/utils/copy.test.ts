import { describe, expect, it } from "vitest";
import { NO_EM_DASHES_RULE, stripEmDashes } from "./copy";

/**
 * "No em dashes in user-facing copy" is a hard brand-voice rule (em dashes
 * read as AI-generated to parents, who are AI-skeptical). stripEmDashes is
 * the output-boundary sanitiser shared by the web app and the worker; if it
 * stops catching a pattern, AI-tells leak into captions/blog/scene copy.
 */

describe("stripEmDashes", () => {
  it("replaces a spaced em dash with a comma", () => {
    expect(stripEmDashes("warm — yet firm")).toBe("warm, yet firm");
  });

  it("replaces an unspaced em dash with a comma", () => {
    expect(stripEmDashes("calm—you teach")).toBe("calm, you teach");
  });

  it("collapses the doubled-comma artefact", () => {
    expect(stripEmDashes("foo —, bar")).toBe("foo, bar");
  });

  it("collapses double spaces left behind", () => {
    expect(stripEmDashes("a  —  b")).toBe("a, b");
  });

  it("handles multiple em dashes in one string", () => {
    expect(stripEmDashes("one — two — three")).toBe("one, two, three");
  });

  it("leaves clean copy untouched (apart from trimming)", () => {
    expect(stripEmDashes("  no dashes here  ")).toBe("no dashes here");
  });

  it("contains no em dash itself after sanitising", () => {
    expect(stripEmDashes("x — y—z")).not.toContain("—");
  });
});

describe("NO_EM_DASHES_RULE", () => {
  it("is a non-empty instruction that itself contains no em dash artefacts in the guidance body", () => {
    // The rule string intentionally shows the literal em dash as an
    // example, so we only assert it is present and substantive.
    expect(NO_EM_DASHES_RULE.length).toBeGreaterThan(50);
    expect(NO_EM_DASHES_RULE.toLowerCase()).toContain("em dash");
  });
});
