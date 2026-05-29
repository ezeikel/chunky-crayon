/**
 * Organic-post caption generation — shared by the organic post route and
 * the morning Posting Brief. Mirrors lib/content-reel/captions.ts but
 * takes an OrganicPost shape (engine + hook/payoff/source) instead of a
 * ContentReel kind.
 *
 * Brand-wide rules apply: US spelling, no em dashes, no "AI" framing, no
 * condescension, punch up at systems not down at parents/teachers.
 */
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { sanitizeCaption } from '@one-colored-pixel/coloring-core';

export type OrganicCaptionPlatform =
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'tiktok'
  | 'linkedin'
  | 'threads';

export type OrganicCaptionInput = {
  engine: 'NEWS' | 'DATASET';
  hook: string;
  payoff: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

const claude = anthropic('claude-sonnet-4-6');

const CAPTION_SYSTEM = `You write social captions for Chunky Crayon, a brand whose audience is parents and teachers. Posts are content-first (childhood, school, play, creativity), never product ads.

Voice rules:
- US-friendly spelling (color, vacation, organize)
- No em dashes. Use commas or fresh sentences.
- No "AI" framing.
- Plain, warm parent-to-parent voice. Never condescending.
- Punch up at systems and policies, never down at individual parents, teachers, or children.
- For news posts, stay curious and pro-child: "here is what is happening, what do you think", never "pick a side and fight".`;

const angle = (engine: OrganicCaptionInput['engine']) =>
  engine === 'NEWS'
    ? 'This is a news/discussion post. End on a genuine question that invites parents and teachers to share their take.'
    : 'This is a data/curiosity post built from public statistics. End on a light, poll-shaped question.';

const CAPTION_PROMPTS: Record<
  OrganicCaptionPlatform,
  (p: OrganicCaptionInput) => string
> = {
  instagram: (p) =>
    [
      `Write an Instagram Reels caption.`,
      angle(p.engine),
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      `Source: ${p.sourceTitle ?? 'public data / reporting'}`,
      '',
      'Format: 1-2 short paragraphs, then a question to drive comments, then 5-8 relevant hashtags on a separate line. Under 200 words. No URLs in the body (IG strips them).',
    ].join('\n'),
  facebook: (p) =>
    [
      `Write a Facebook Reels caption.`,
      angle(p.engine),
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      `Source: ${p.sourceTitle ?? 'public data / reporting'}`,
      `Source URL: ${p.sourceUrl ?? 'omit'}`,
      '',
      'Format: 2-3 short conversational paragraphs, then a question for engagement, then the source URL on its own line at the end. Under 250 words. No hashtags.',
    ].join('\n'),
  pinterest: (p) =>
    [
      `Write a Pinterest pin description.`,
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      '',
      'Format: 1-2 short, searchable paragraphs leaning into terms parents/teachers search (kids, parenting, school, activities). Under 400 chars. No hashtags, no URLs in body.',
    ].join('\n'),
  tiktok: (p) =>
    [
      `Write a TikTok caption.`,
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      '',
      'Format: 2-3 short lines, casual + scroll-stopping, then 3-5 hashtags. Under 150 characters total.',
    ].join('\n'),
  linkedin: (p) =>
    [
      `Write a LinkedIn caption for working parents, educators, and early-years professionals.`,
      angle(p.engine),
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      `Source: ${p.sourceTitle ?? 'public data / reporting'}`,
      `Source URL: ${p.sourceUrl ?? 'omit'}`,
      '',
      'Format: a grounded 120-200 word post, a point of view plus the practical takeaway. Source URL on its own line at the end if present. 0-3 hashtags. No buzzwords.',
    ].join('\n'),
  threads: (p) =>
    [
      `Write a Threads post.`,
      `Hook: ${p.hook}`,
      `Payoff: ${p.payoff}`,
      '',
      'Format: 1 to 3 short sentences, ideally under 200 characters. Text-first, dry-warm parent voice. Lead with the take, not a hook-for-asset opener. No hashtags. No URL in body (a reply post carries the source).',
    ].join('\n'),
};

export async function generateOrganicCaption(
  platform: OrganicCaptionPlatform,
  post: OrganicCaptionInput,
): Promise<string> {
  const result = await generateText({
    model: claude,
    system: CAPTION_SYSTEM,
    prompt: CAPTION_PROMPTS[platform](post),
    temperature: 0.6,
  });
  return sanitizeCaption(result.text);
}
