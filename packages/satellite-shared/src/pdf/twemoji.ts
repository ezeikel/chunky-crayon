import { parse } from "@twemoji/parser";

const TWEMOJI_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72";

const cache = new Map<string, string>();

const resolveCodepoint = (emoji: string): string | null => {
  const entities = parse(emoji);
  if (entities.length === 0) return null;
  const first = entities[0];
  if (!first?.url) return null;
  const filename = first.url.split("/").pop();
  if (!filename) return null;
  return filename.replace(/\.svg$/, "");
};

const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Twemoji fetch failed: ${response.status} ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
};

export const resolveEmojiToDataUrl = async (
  emoji: string,
): Promise<string | null> => {
  const codepoint = resolveCodepoint(emoji);
  if (!codepoint) return null;

  const cached = cache.get(codepoint);
  if (cached) return cached;

  const url = `${TWEMOJI_CDN_BASE}/${codepoint}.png`;
  try {
    const dataUrl = await fetchAsDataUrl(url);
    cache.set(codepoint, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
};
