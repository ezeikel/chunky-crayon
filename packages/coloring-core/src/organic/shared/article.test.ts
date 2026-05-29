import { describe, expect, it } from "vitest";

import { extractReadableText } from "./article";

/**
 * extractReadableText is the grounding foundation — the writer + fact-check
 * pass only see what this returns, so if it leaks script/style noise or
 * drops the article body, grounding degrades silently. Pinned for the
 * boilerplate-stripping + entity-decoding behaviour.
 */

describe("extractReadableText", () => {
  it("strips script/style/nav and keeps body prose", () => {
    const html = `
      <html><head><style>.x{color:red}</style><script>alert(1)</script></head>
      <body>
        <nav>Home About Contact</nav>
        <article><p>A study of 1,800 schools found phone bans barely moved scores.</p></article>
        <footer>copyright 2026</footer>
      </body></html>`;
    const text = extractReadableText(html);
    expect(text).toContain(
      "A study of 1,800 schools found phone bans barely moved scores.",
    );
    expect(text).not.toContain("alert(1)");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("Home About Contact");
    expect(text).not.toContain("copyright 2026");
  });

  it("decodes common HTML entities", () => {
    const text = extractReadableText(
      "<p>Parents &amp; teachers said &quot;enough&quot; &#39;today&#39;</p>",
    );
    expect(text).toContain("Parents & teachers said \"enough\" 'today'");
  });

  it("collapses whitespace", () => {
    const text = extractReadableText("<p>one\n\n  two\t\tthree</p>");
    expect(text).toBe("one two three");
  });

  it("caps very long input", () => {
    const long = "<p>" + "word ".repeat(5000) + "</p>";
    expect(extractReadableText(long).length).toBeLessThanOrEqual(12000);
  });
});
