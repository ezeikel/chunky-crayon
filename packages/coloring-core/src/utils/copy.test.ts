import { describe, expect, it } from "vitest";
import {
  cleanTitle,
  NO_EM_DASHES_RULE,
  NO_MARKDOWN_RULE,
  sanitizeCaption,
  stripEmDashes,
  stripMarkdown,
} from "./copy";

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

  // En dashes (U+2013, narrower than em dashes) drift in via copy-paste
  // and from AI output describing numeric ranges. The brand-voice rule
  // covers them too.
  it("replaces an en dash between digits with ' to ' (natural English)", () => {
    expect(stripEmDashes("150–220 words")).toBe("150 to 220 words");
    expect(stripEmDashes("3–5 hashtags")).toBe("3 to 5 hashtags");
  });

  it("replaces a non-numeric en dash with a comma", () => {
    expect(stripEmDashes("clean copy – no clutter")).toBe(
      "clean copy, no clutter",
    );
  });

  it("contains no en dash after sanitising", () => {
    expect(stripEmDashes("a – b, 2–3 sentences")).not.toContain("–");
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

/**
 * Social platforms render no markdown — a LinkedIn post once shipped with
 * literal "# LinkedIn Post:" and "**" because the model formatted its
 * output and nothing stripped it. stripMarkdown is the deterministic fix;
 * the critical invariant is that #hashtags survive while # headings don't.
 */
describe("stripMarkdown", () => {
  it("removes an ATX heading marker but keeps the heading text", () => {
    expect(stripMarkdown("# LinkedIn Post: Wedding Parking")).toBe(
      "LinkedIn Post: Wedding Parking",
    );
    expect(stripMarkdown("### Tips")).toBe("Tips");
  });

  it("keeps #hashtags (no space after #) untouched", () => {
    expect(stripMarkdown("#WeddingPlanning #UKWedding #PCN")).toBe(
      "#WeddingPlanning #UKWedding #PCN",
    );
  });

  it("strips bold and italic but keeps the words", () => {
    expect(stripMarkdown("**Attention planners** and *event* teams")).toBe(
      "Attention planners and event teams",
    );
    expect(stripMarkdown("***very*** ___strong___ __bold__ _it_")).toBe(
      "very strong bold it",
    );
  });

  it("does not leave a stray asterisk from nested bold", () => {
    expect(stripMarkdown("**bold**")).not.toContain("*");
  });

  it("strips inline code and fences, keeping contents", () => {
    expect(stripMarkdown("use `npm run build` now")).toBe(
      "use npm run build now",
    );
  });

  it("flattens markdown links to text + url", () => {
    expect(
      stripMarkdown("[the full guide](https://parkingticketpal.com/blog/x)"),
    ).toBe("the full guide https://parkingticketpal.com/blog/x");
  });

  it("strips list markers but keeps list text", () => {
    expect(stripMarkdown("- first\n- second\n1. third")).toBe(
      "first\nsecond\nthird",
    );
  });

  it("leaves a plain bare URL untouched", () => {
    expect(stripMarkdown("Read it: https://parkingticketpal.com/blog/x")).toBe(
      "Read it: https://parkingticketpal.com/blog/x",
    );
  });

  it("preserves emojis and line breaks", () => {
    expect(stripMarkdown("🎩 hook\n\nbody 🚗")).toBe("🎩 hook\n\nbody 🚗");
  });
});

describe("sanitizeCaption (markdown + em dashes, the real LinkedIn failure)", () => {
  it("fixes the exact post that shipped broken", () => {
    const broken = [
      "# LinkedIn Post: Wedding Venue Parking Rules UK",
      "",
      "🎩 **Attention event planners** — parking compliance is the hidden risk.",
      "",
      "📋 **Venue restrictions vary** — private land rules apply differently",
      "",
      "#EventManagement #WeddingIndustry",
    ].join("\n");
    const clean = sanitizeCaption(broken);

    expect(clean).not.toContain("#  "); // no heading-with-space artefact
    expect(clean).not.toMatch(/(^|\n)#\s/); // no leading "# " heading line
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("—");
    // Hashtags and emojis survive.
    expect(clean).toContain("#EventManagement");
    expect(clean).toContain("🎩");
    // Heading text is kept, just unmarked.
    expect(clean).toContain("LinkedIn Post: Wedding Venue Parking Rules UK");
  });

  it("is idempotent on already-clean copy", () => {
    const clean = "Great free coloring page today! 🎨 #coloring #kids";
    expect(sanitizeCaption(clean)).toBe(clean);
  });
});

describe("NO_MARKDOWN_RULE", () => {
  it("is a substantive plain-text instruction", () => {
    expect(NO_MARKDOWN_RULE.length).toBeGreaterThan(50);
    expect(NO_MARKDOWN_RULE.toLowerCase()).toContain("plain text");
  });
});

/**
 * A combo-backfill batch leaked raw generation prompts (ending in a
 * "(seed NNN)" uniqueness suffix) into the title field — those read as an
 * internal artifact to a 3-8 y/o, not a name. cleanTitle is the display-boundary
 * guarantee that no prompt-shaped title ever reaches a kid's screen.
 */
describe("cleanTitle", () => {
  it("strips a trailing (seed NNN) suffix", () => {
    expect(cleanTitle("animal portrait, friendly expression (seed 530)")).toBe(
      "Animal portrait, friendly expression",
    );
  });

  it("strips the seed suffix with no leading space", () => {
    expect(cleanTitle("happy puppy(seed 12)")).toBe("Happy puppy");
  });

  it("strips a leading article and capitalises", () => {
    expect(cleanTitle("a friendly puppy")).toBe("Friendly puppy");
    expect(cleanTitle("the magic castle")).toBe("Magic castle");
    expect(cleanTitle("an owl in a tree")).toBe("Owl in a tree");
  });

  it("strips a trailing period", () => {
    expect(cleanTitle("a cat playing with yarn.")).toBe(
      "Cat playing with yarn",
    );
  });

  it("strips article + seed + period together", () => {
    expect(cleanTitle("a rabbit, for toddlers (seed 472).")).toBe(
      "Rabbit, for toddlers",
    );
  });

  it("leaves a clean AI title untouched", () => {
    expect(cleanTitle("Spring Wildflower Meadow")).toBe(
      "Spring Wildflower Meadow",
    );
  });

  it("never returns empty — falls back when only a seed suffix", () => {
    expect(cleanTitle("(seed 999)")).toBe("Coloring page");
    expect(cleanTitle("")).toBe("Coloring page");
    expect(cleanTitle(null)).toBe("Coloring page");
    expect(cleanTitle(undefined)).toBe("Coloring page");
  });

  it("does not strip an inner 'seed' that is not the suffix", () => {
    expect(cleanTitle("a packet of seeds")).toBe("Packet of seeds");
  });
});
