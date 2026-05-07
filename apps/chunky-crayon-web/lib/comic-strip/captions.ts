/**
 * Comic-strip caption generation — shared by:
 *   - /api/social/comic-strip-post (live posting at scheduled times)
 *   - /api/social/digest (Posting Brief email, generates captions
 *     ahead-of-time so the recipient can copy-paste for manual platforms
 *     like TikTok)
 *
 * The script writer already produces a base `caption` field at script-write
 * time. Here we extend it per platform — base + platform-specific tail
 * (hashtags, CTAs). No second Claude call required for the typical case;
 * we only fall back to Claude if the base caption is missing.
 *
 * Per-platform tone:
 *   instagram → base caption + IG-style "swipe ➡️" CTA + 5-7 hashtags
 *   facebook  → base caption + soft CTA pointing at chunkycrayon.com.
 *               No hashtags (FB downranks them).
 *   pinterest → base caption shortened to ≤400 chars, search-friendly.
 *               No hashtags, no URLs in body. The pin itself links out.
 *   tiktok    → base caption + casual tail + 3-5 hashtags. Under 150 chars.
 *               Manual platform — caption surfaces in the posting brief
 *               email so we copy-paste it.
 *
 * All captions follow the brand-wide rules: US spelling, no em dashes,
 * no "AI" framing.
 */

export type ComicStripCaptionPlatform =
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'tiktok';

export type ComicStripCaptionInput = {
  title: string;
  /** Base caption authored by the script writer (already brand-voice-tuned). */
  baseCaption: string;
  /** Theme — used as a search keyword on Pinterest. */
  theme: string;
};

const STANDARD_HASHTAGS = [
  '#ChunkyCrayon',
  '#KidsComics',
  '#FunnyForKids',
  '#KidsActivities',
  '#ColoringPagesForKids',
];

const stripEmDashes = (s: string): string =>
  s.replace(/—/g, ',').replace(/–/g, ',');

const ensurePeriod = (s: string): string => {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  // Don't add a period if the line ends with a hashtag, emoji, or
  // existing terminal punctuation. "...#KidsComics." reads as a typo.
  if (/[.!?…]$/.test(trimmed)) return trimmed;
  // Hashtag-trailing or emoji-trailing — leave alone.
  if (/(?:#\w+|[\p{Extended_Pictographic}])$/u.test(trimmed)) return trimmed;
  return `${trimmed}.`;
};

const buildInstagramCaption = (input: ComicStripCaptionInput): string => {
  const base = ensurePeriod(stripEmDashes(input.baseCaption));
  const cta = 'Swipe through to read it ➡️';
  const tags = STANDARD_HASHTAGS.join(' ');
  return `${base}\n\n${cta}\n\n${tags}`;
};

const buildFacebookCaption = (input: ComicStripCaptionInput): string => {
  const base = ensurePeriod(stripEmDashes(input.baseCaption));
  const cta =
    'More free coloring pages and weekly comics at chunkycrayon.com 🎨';
  return `${base}\n\n${cta}`;
};

const buildPinterestCaption = (input: ComicStripCaptionInput): string => {
  // Pinterest descriptions max 500 chars; we target ≤400 to leave headroom.
  // Strip our brand hashtags from base and tighten to title + 1 line.
  const base = ensurePeriod(
    stripEmDashes(input.baseCaption)
      .replace(/#\w+\s*/g, '')
      .trim(),
  );
  const themeWord = input.theme.toLowerCase().replace(/_/g, ' ');
  const description = `${input.title} — a 4-panel kids comic strip for ages 3-8. ${base} A free weekly comic from Chunky Crayon. Theme: ${themeWord}.`;
  // Truncate at 395 char to keep clean room.
  return description.length > 395
    ? `${description.slice(0, 395).trim()}…`
    : description;
};

const buildTikTokCaption = (input: ComicStripCaptionInput): string => {
  const base = ensurePeriod(
    stripEmDashes(input.baseCaption)
      .replace(/#\w+\s*/g, '')
      .trim(),
  );
  const tags = '#kidscomics #funnykids #chunkycrayon';
  // TikTok caption sweet spot ~150 chars.
  const targetLen = 150 - tags.length - 2;
  const trimmed =
    base.length > targetLen ? `${base.slice(0, targetLen - 1).trim()}…` : base;
  return `${trimmed}\n${tags}`;
};

export const buildComicStripCaption = (
  platform: ComicStripCaptionPlatform,
  input: ComicStripCaptionInput,
): string => {
  switch (platform) {
    case 'instagram':
      return buildInstagramCaption(input);
    case 'facebook':
      return buildFacebookCaption(input);
    case 'pinterest':
      return buildPinterestCaption(input);
    case 'tiktok':
      return buildTikTokCaption(input);
  }
};
