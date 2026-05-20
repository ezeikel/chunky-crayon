import { describe, expect, it } from "vitest";
import {
  CC_BRAND_VOICE_CORE,
  ccContentTypeAdapter,
  ccPlatformAdapter,
  ccVoice,
} from "./brand-voice";

/**
 * The brand voice is the single source of truth for every CC surface. If
 * the core stops carrying its hard rules, or the demo-reel framing drifts
 * back to ventriloquising a kid, off-brand / trust-eroding copy ships
 * across captions, blog, and comment replies at once.
 */

describe("CC_BRAND_VOICE_CORE", () => {
  it("encodes the non-negotiable brand rules", () => {
    const c = CC_BRAND_VOICE_CORE.toLowerCase();
    expect(c).toContain('"we", never "i"');
    expect(c).toContain("we are a brand, not a single author");
    // The AI ban is stated.
    expect(c).toContain('the word "ai"');
    // Anti-ventriloquism is stated.
    expect(c).toContain("never pretend a parent or child");
  });

  it("contains no em dash in the voice copy itself", () => {
    // The voice doc tells the model not to use em dashes; it must not
    // model the bad behaviour by containing one.
    expect(CC_BRAND_VOICE_CORE).not.toContain("—");
  });
});

describe("ccContentTypeAdapter demo_reel (the Phase 0 fix)", () => {
  const reel = ccContentTypeAdapter("demo_reel").toLowerCase();

  it("frames the reel as the brand showing its own product", () => {
    expect(reel).toContain("demo of our own product");
    expect(reel).toContain("no real child");
    expect(reel).toContain("we are the brand showing");
  });

  it("explicitly forbids the fake-testimonial framing Perplexity flagged", () => {
    expect(reel).toContain("never write it as a parent or child reacting");
    expect(reel).toContain("my kid loved this");
    expect(reel).toContain("fake-testimonial");
  });

  it("sells the outcome, not the technology or workflow", () => {
    expect(reel).toContain("sell the outcome");
    expect(reel).toContain("never the technology");
  });
});

describe("ccPlatformAdapter 2026 length norms", () => {
  it("instagram is tightened (70-150 words, 5-8 hashtags, not 20)", () => {
    const ig = ccPlatformAdapter("instagram");
    expect(ig).toContain("70 to 150 words");
    expect(ig).toContain("5 to 8 specific");
    expect(ig).toContain("not 20");
  });

  it("facebook is short, first sentence does the work", () => {
    const fb = ccPlatformAdapter("facebook").toLowerCase();
    expect(fb).toContain("short");
    expect(fb).toContain("first sentence does all the work");
  });

  it("pinterest stays search-engine-first, no emojis/hashtags", () => {
    const p = ccPlatformAdapter("pinterest").toLowerCase();
    expect(p).toContain("search engine");
    expect(p).toContain("no emojis. no hashtags");
  });

  it("threads is text-first, short, no hashtags, link goes in a reply", () => {
    const t = ccPlatformAdapter("threads").toLowerCase();
    expect(t).toContain("text-first");
    expect(t).toContain("no hashtags");
    // The link-in-reply rule is the algo-aware play we want preserved.
    expect(t).toContain("metadata.threads.thread");
  });
});

describe("ccVoice composition", () => {
  it("always includes the core", () => {
    expect(ccVoice("tiktok", "demo_reel")).toContain(CC_BRAND_VOICE_CORE);
  });

  it("includes platform + content adapters when given", () => {
    const v = ccVoice("linkedin", "daily_image");
    expect(v).toContain(ccPlatformAdapter("linkedin"));
    expect(v).toContain(ccContentTypeAdapter("daily_image"));
  });

  it("works with no platform (e.g. comment reply has no platform delta)", () => {
    const v = ccVoice(null, "comment_reply");
    expect(v).toContain(CC_BRAND_VOICE_CORE);
    expect(v).toContain(ccContentTypeAdapter("comment_reply"));
  });

  it("the composed voice for any surface contains no em dash", () => {
    const surfaces: [
      Parameters<typeof ccVoice>[0],
      Parameters<typeof ccVoice>[1],
    ][] = [
      ["instagram", "daily_image"],
      ["tiktok", "demo_reel"],
      ["linkedin", "content_reel"],
      [null, "comment_reply"],
    ];
    for (const [p, c] of surfaces) {
      expect(ccVoice(p, c)).not.toContain("—");
    }
  });
});
