/**
 * Content-reel caption generation — shared by:
 *   - /api/social/content-reel-post (live posting at scheduled times)
 *   - /api/social/digest (Posting Brief email, generates captions
 *     ahead-of-time so the recipient can copy-paste for manual platforms
 *     like TikTok)
 *
 * Per-platform tone:
 *   instagram → 1-2 short paragraphs, then question for engagement, then
 *               5-8 hashtags. Under 200 words. Mention source in body.
 *   facebook  → 2-3 paragraphs in conversational parent-voice, source URL
 *               on its own line at the end. No hashtags.
 *   pinterest → 1-2 short search-friendly paragraphs. Under 400 chars.
 *               No hashtags, no URLs in body.
 *   tiktok    → 2-3 short lines, casual tone, 3-5 hashtags. Under
 *               150 chars (TikTok's caption sweet spot).
 *
 * All captions follow the brand-wide rules: US spelling, no em dashes,
 * no "AI" framing, no condescending tone.
 */
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export type ContentReelCaptionPlatform =
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'tiktok';

export type ContentReelCaptionInput = {
  kind: 'STAT' | 'FACT' | 'TIP' | 'MYTH';
  hook: string;
  payoff: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

const claude = anthropic('claude-sonnet-4-6');

const CAPTION_SYSTEM = `You write social-media captions for Chunky Crayon, a parenting brand that posts research-backed reels about kids, coloring, screen time, and brain development.

Voice rules:
- US-friendly spelling (color, vacation, organize)
- No em dashes — use commas or fresh sentences
- No "AI" framing
- Plain conversational parent-to-parent voice
- Never condescending`;

const CAPTION_PROMPTS: Record<
  ContentReelCaptionPlatform,
  (reel: ContentReelCaptionInput) => string
> = {
  instagram: (reel) =>
    [
      `Write an Instagram Reels caption for this ${reel.kind} content reel.`,
      `Hook: ${reel.hook}`,
      `Payoff: ${reel.payoff}`,
      `Source: ${reel.sourceTitle ?? 'parenting research'}`,
      '',
      'Format: 1-2 short paragraphs, then a question to drive comments, then 5-8 relevant hashtags on a separate line. Total under 200 words. Mention the source briefly. Do not include any URLs in the body — IG strips them.',
    ].join('\n'),
  facebook: (reel) =>
    [
      `Write a Facebook Reels caption for this ${reel.kind} content reel.`,
      `Hook: ${reel.hook}`,
      `Payoff: ${reel.payoff}`,
      `Source: ${reel.sourceTitle ?? 'parenting research'}`,
      `Source URL: ${reel.sourceUrl ?? 'omit'}`,
      '',
      'Format: 2-3 short paragraphs in conversational parent-voice, then a question for engagement, then the source URL on its own line at the end. Total under 250 words. No hashtags (FB downranks them).',
    ].join('\n'),
  pinterest: (reel) =>
    [
      `Write a Pinterest pin description for this ${reel.kind} content reel.`,
      `Hook: ${reel.hook}`,
      `Payoff: ${reel.payoff}`,
      `Source: ${reel.sourceTitle ?? 'parenting research'}`,
      '',
      'Format: 1-2 short paragraphs that read as helpful + searchable. Lean into keywords parents actually search for (kids, parenting, screen time, etc.). Total under 400 chars. No hashtags. No URLs in body.',
    ].join('\n'),
  tiktok: (reel) =>
    [
      `Write a TikTok caption for this ${reel.kind} content reel.`,
      `Hook: ${reel.hook}`,
      `Payoff: ${reel.payoff}`,
      '',
      "Format: 2-3 short lines, casual + scroll-stopping tone, then 3-5 hashtags on the same or next line. Total under 150 characters (TikTok's caption sweet spot — long captions get truncated). Lead with a hook that makes the user want to watch the full reel.",
    ].join('\n'),
};

export async function generateContentReelCaption(
  platform: ContentReelCaptionPlatform,
  reel: ContentReelCaptionInput,
): Promise<string> {
  const result = await generateText({
    model: claude,
    system: CAPTION_SYSTEM,
    prompt: CAPTION_PROMPTS[platform](reel),
    temperature: 0.6,
  });
  return result.text.trim();
}
