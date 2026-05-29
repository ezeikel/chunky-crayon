import { describe, expect, it } from "vitest";

import { isCredibleArticleUrl } from "./discovery";

/**
 * The URL filter is the guard that keeps non-article sources (YouTube,
 * Reddit, social) out of the news engine. A live dry-run surfaced
 * Perplexity returning a YouTube link that passed a HEAD 200 check and
 * would have become a reel with a broken-looking source card. Pinned so
 * that regression can't quietly let social links back in.
 */

describe("isCredibleArticleUrl", () => {
  it("accepts real news article URLs", () => {
    expect(
      isCredibleArticleUrl("https://www.bbc.co.uk/news/education-123"),
    ).toBe(true);
    expect(
      isCredibleArticleUrl(
        "https://www.theguardian.com/education/2026/jan/01/x",
      ),
    ).toBe(true);
    expect(
      isCredibleArticleUrl("http://nytimes.com/2026/01/01/us/schools.html"),
    ).toBe(true);
  });

  it("rejects YouTube (both hosts)", () => {
    expect(isCredibleArticleUrl("https://www.youtube.com/watch?v=abc")).toBe(
      false,
    );
    expect(isCredibleArticleUrl("https://youtu.be/abc")).toBe(false);
  });

  it("rejects social + forum hosts", () => {
    for (const u of [
      "https://reddit.com/r/parenting/x",
      "https://twitter.com/x/status/1",
      "https://x.com/x/status/1",
      "https://www.facebook.com/post/1",
      "https://instagram.com/p/1",
      "https://www.tiktok.com/@x/video/1",
      "https://pinterest.com/pin/1",
      "https://threads.net/@x/post/1",
    ]) {
      expect(isCredibleArticleUrl(u)).toBe(false);
    }
  });

  it("rejects subdomains of blocked hosts (e.g. m.youtube.com)", () => {
    expect(isCredibleArticleUrl("https://m.youtube.com/watch?v=abc")).toBe(
      false,
    );
  });

  it("does NOT reject a host that merely contains a blocked name as a substring", () => {
    // 'xtwitter.com' / 'notreddit.com' are different domains — must pass.
    expect(isCredibleArticleUrl("https://xtwitter.com/article")).toBe(true);
    expect(isCredibleArticleUrl("https://notreddit.com/article")).toBe(true);
  });

  it("rejects non-http and malformed urls", () => {
    expect(isCredibleArticleUrl("ftp://example.com/x")).toBe(false);
    expect(isCredibleArticleUrl("not a url")).toBe(false);
    expect(isCredibleArticleUrl("")).toBe(false);
  });
});
