/**
 * Markdown → Portable Text converter for Sanity blog posts.
 *
 * Mirrors apps/chunky-crayon-web/app/actions/blog.ts. Worker-side copy so
 * the cron pipeline doesn't have to import the Next-bound action module.
 * This is stable formatting code; if you change the parser semantics,
 * change both copies (or hoist into a shared package).
 */

type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _type: string;
  _key: string;
  href?: string;
};

export type PortableTextBlock = {
  _type: "block";
  _key: string;
  style?: string;
  children?: PortableTextSpan[];
  listItem?: string;
  level?: number;
  markDefs?: PortableTextMarkDef[];
};

function parseInlineFormatting(
  text: string,
  keyPrefix: string,
): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } {
  const children: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  let spanIndex = 0;

  const inlinePattern =
    /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        children.push({
          _type: "span",
          _key: `${keyPrefix}_span_${spanIndex++}`,
          text: beforeText,
        });
      }
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith("**") || fullMatch.startsWith("__")) {
      const boldText = match[2] || match[3];
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: boldText,
        marks: ["strong"],
      });
    } else if (fullMatch.startsWith("[")) {
      const linkText = match[6];
      const linkHref = match[7];
      const linkKey = `link_${keyPrefix}_${spanIndex}`;
      markDefs.push({
        _type: "link",
        _key: linkKey,
        href: linkHref,
      });
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: linkText,
        marks: [linkKey],
      });
    } else if (fullMatch.startsWith("*") || fullMatch.startsWith("_")) {
      const italicText = match[4] || match[5];
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: italicText,
        marks: ["em"],
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      children.push({
        _type: "span",
        _key: `${keyPrefix}_span_${spanIndex++}`,
        text: remainingText,
      });
    }
  }

  if (children.length === 0) {
    children.push({
      _type: "span",
      _key: `${keyPrefix}_span_0`,
      text,
    });
  }

  return { children, markDefs };
}

export function markdownToPortableText(markdown: string): PortableTextBlock[] {
  const lines = markdown.split("\n");
  const blocks: PortableTextBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `block_${i}`;

    if (!line.trim()) continue;
    if (/^[-*_]{3,}\s*$/.test(line.trim())) continue;

    if (line.startsWith("# ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h1",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("## ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(3), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h2",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("### ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(4), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h3",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("#### ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(5), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "h4",
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "normal",
        listItem: "bullet",
        level: 1,
        children,
        markDefs,
      });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "");
      const { children, markDefs } = parseInlineFormatting(text, key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "normal",
        listItem: "number",
        level: 1,
        children,
        markDefs,
      });
      continue;
    }
    if (line.startsWith("> ")) {
      const { children, markDefs } = parseInlineFormatting(line.slice(2), key);
      blocks.push({
        _type: "block",
        _key: key,
        style: "blockquote",
        children,
        markDefs,
      });
      continue;
    }

    const { children, markDefs } = parseInlineFormatting(line, key);
    blocks.push({
      _type: "block",
      _key: key,
      style: "normal",
      children,
      markDefs,
    });
  }

  return blocks;
}
