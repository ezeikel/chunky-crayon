'use server';

import {
  generateText,
  models,
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  PINTEREST_CAPTION_SYSTEM,
  TIKTOK_CAPTION_SYSTEM,
  LINKEDIN_CAPTION_SYSTEM,
  THREADS_CAPTION_SYSTEM,
  createInstagramCaptionPrompt,
  createFacebookCaptionPrompt,
  createPinterestCaptionPrompt,
  createTikTokCaptionPrompt,
  createLinkedInCaptionPrompt,
  createThreadsCaptionPrompt,
} from '@/lib/ai';
import {
  sanitizeCaption,
  CC_BRAND_VOICE_CORE,
} from '@one-colored-pixel/coloring-core';
import { ColoringImage } from '@one-colored-pixel/db';
// Caption-prompt addendums and per-platform demo-reel builders live in a
// sibling module so this file's `'use server'` directive doesn't force
// them to be async (Next.js Server Actions enforce that on every export).
// Re-exported below so existing import sites (`@/app/actions/social`)
// keep working.
import {
  INSTAGRAM_CAROUSEL_ADDENDUM,
  INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM,
  INSTAGRAM_REEL_ADDENDUM,
  FACEBOOK_VIDEO_ADDENDUM,
  FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM,
  buildDemoReelFraming,
  buildInstagramDemoReelAddendum,
  buildFacebookDemoReelAddendum,
  buildTikTokDemoReelAddendum,
  buildLinkedinDemoReelAddendum,
  INSTAGRAM_COLORED_STATIC_ADDENDUM,
  FACEBOOK_COLORED_STATIC_ADDENDUM,
} from './social-prompts';


export type InstagramPostType =
  | 'image'
  | 'carousel'
  | 'carousel_with_colored'
  | 'reel'
  | 'demo_reel'
  | 'colored_static';

export const generateInstagramCaption = async (
  coloringImage: ColoringImage,
  postType: InstagramPostType = 'image',
) => {
  let systemPrompt = INSTAGRAM_CAPTION_SYSTEM;

  if (postType === 'carousel') {
    systemPrompt += INSTAGRAM_CAROUSEL_ADDENDUM;
  } else if (postType === 'carousel_with_colored') {
    systemPrompt += INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM;
  } else if (postType === 'reel') {
    systemPrompt += INSTAGRAM_REEL_ADDENDUM;
  } else if (postType === 'demo_reel') {
    systemPrompt += buildInstagramDemoReelAddendum(
      coloringImage.demoReelVariant,
    );
  } else if (postType === 'colored_static') {
    systemPrompt += INSTAGRAM_COLORED_STATIC_ADDENDUM;
  }

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt: createInstagramCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return sanitizeCaption(text);
};

export type FacebookPostType =
  | 'image'
  | 'video'
  | 'image_with_video'
  | 'demo_reel'
  | 'colored_static';

export const generateFacebookCaption = async (
  coloringImage: ColoringImage,
  postType: FacebookPostType = 'image',
) => {
  let systemPrompt = FACEBOOK_CAPTION_SYSTEM;

  if (postType === 'video') {
    systemPrompt += FACEBOOK_VIDEO_ADDENDUM;
  } else if (postType === 'image_with_video') {
    systemPrompt += FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM;
  } else if (postType === 'demo_reel') {
    systemPrompt += buildFacebookDemoReelAddendum(
      coloringImage.demoReelVariant,
    );
  } else if (postType === 'colored_static') {
    systemPrompt += FACEBOOK_COLORED_STATIC_ADDENDUM;
  }

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt: createFacebookCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return sanitizeCaption(text);
};

export const generatePinterestCaption = async (
  coloringImage: ColoringImage,
) => {
  const { text } = await generateText({
    model: models.creative,
    system: PINTEREST_CAPTION_SYSTEM,
    prompt: createPinterestCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return sanitizeCaption(text);
};

export type TikTokPostType = 'image' | 'demo_reel';

export const generateTikTokCaption = async (
  coloringImage: ColoringImage,
  postType: TikTokPostType = 'image',
): Promise<string> => {
  let systemPrompt = TIKTOK_CAPTION_SYSTEM;
  if (postType === 'demo_reel') {
    systemPrompt += buildTikTokDemoReelAddendum(coloringImage.demoReelVariant);
  }

  try {
    const { text } = await generateText({
      model: models.creative,
      system: systemPrompt,
      prompt: createTikTokCaptionPrompt(
        coloringImage.title ?? '',
        coloringImage.description ?? '',
        coloringImage.tags ?? [],
      ),
    });

    return sanitizeCaption(text);
  } catch (error) {
    console.error('[TikTok] Caption generation failed:', error);
    return `${coloringImage.title ?? 'New coloring page'} 🎨 Free coloring page! #coloringpage #kidscrafts #artforkids #freecoloringpage`;
  }
};

export type LinkedInPostType = 'image' | 'demo_reel';

export const generateLinkedInCaption = async (
  coloringImage: ColoringImage,
  postType: LinkedInPostType = 'image',
): Promise<string> => {
  let systemPrompt = LINKEDIN_CAPTION_SYSTEM;
  if (postType === 'demo_reel') {
    systemPrompt += buildLinkedinDemoReelAddendum(
      coloringImage.demoReelVariant,
    );
  }

  try {
    const { text } = await generateText({
      model: models.creative,
      system: systemPrompt,
      prompt: createLinkedInCaptionPrompt(
        coloringImage.title ?? '',
        coloringImage.description ?? '',
        coloringImage.tags ?? [],
      ),
    });

    return sanitizeCaption(text);
  } catch (error) {
    console.error('[LinkedIn] Caption generation failed:', error);
    throw error;
  }
};

// Threads has a HARD 500-char server limit; Buffer rejects over-limit
// posts at publish time. The prompt itself (THREADS_CAPTION_SYSTEM +
// ccPlatformAdapter('threads')) is the primary defence. This is the
// safety net for marginal overruns: if Sonnet produced 520 chars, ask
// Haiku to rewrite under 480 preserving voice + structure. ONE retry
// only; if still over, return as-is and let buildCreatePostVariables
// throw a clean publish-time failure rather than ship truncated copy.
const shrinkThreadsCaptionIfOver = async (
  caption: string,
  ctx: { imageId: string },
): Promise<string> => {
  if (caption.length <= 500) return caption;

  console.warn(
    `[Threads] caption ${caption.length} chars > 500, Haiku shrink retry (image ${ctx.imageId})`,
  );

  try {
    const { text } = await generateText({
      model: models.haiku45,
      system: `${CC_BRAND_VOICE_CORE}

You are tightening a Threads post that is over the 500-character platform limit. Rewrite it UNDER 480 characters while preserving:
- the voice (warm, dry, specific; brand "we" not parent "I")
- the opening hook (first 1-2 sentences carry the post)
- one specific observation

Drop secondary phrasing, qualifiers, and anything the post can survive without. No hashtags, no URL. Return ONLY the rewritten caption, no labels, no quotes.`,
      prompt: `Original (${caption.length} chars):\n\n${caption}\n\nRewrite under 480 characters.`,
    });

    const shrunk = sanitizeCaption(text);
    if (shrunk.length > 500) {
      console.warn(
        `[Threads] Haiku shrink retry still ${shrunk.length} chars > 500 (image ${ctx.imageId}); buffer.ts will fail loud`,
      );
    }
    return shrunk;
  } catch (error) {
    console.error('[Threads] shrink retry failed; returning original:', error);
    return caption;
  }
};

// Threads is text-first; one caption shape works across daily / demo-reel /
// content-reel since the post is the thought, not a hook-for-an-asset. We
// keep the API signature compatible with the others (takes a ColoringImage)
// so the Buffer-bridge call sites stay symmetrical.
export const generateThreadsCaption = async (
  coloringImage: ColoringImage,
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: models.creative,
      system: THREADS_CAPTION_SYSTEM,
      prompt: createThreadsCaptionPrompt(
        coloringImage.title ?? '',
        coloringImage.description ?? '',
        coloringImage.tags ?? [],
      ),
    });
    const sanitized = sanitizeCaption(text);
    return shrinkThreadsCaptionIfOver(sanitized, {
      imageId: coloringImage.id,
    });
  } catch (error) {
    console.error('[Threads] Caption generation failed:', error);
    throw error;
  }
};

// =============================================================================
// Fact Card Caption Generation
// =============================================================================

import type { GeneratedFact } from '@/lib/social/facts';

/**
 * System prompt for fact card captions.
 * These are different from coloring page captions - they focus on the fact itself.
 */
const FACT_CARD_CAPTION_SYSTEM = `You are writing captions for Chunky Crayon's fact card posts - beautiful graphics with facts about coloring, creativity, or child development.

VOICE: You ARE Chunky Crayon the brand. Use "we" not "I". Never pretend to be a parent.

FACT CARD TRUTH: These are SHARE-BAIT. People love sharing "did you know" content.

STRUCTURE:
1. REACTION (1 sentence): "We had to share this!" / "This is why we're passionate about coloring"
2. SHAREABILITY: "Tag someone who'd love this!" / "Share this with your friends"
3. ENGAGEMENT: "Did you know this? Yes or No!" / "Does this resonate?"
4. SOFT CTA: "More coloring fun at chunkycrayon.com"

Keep SHORT - the graphic has the main message. Caption supports, doesn't repeat.
Use 1-2 emojis naturally.

OUTPUT FORMAT:
Return ONLY the final caption text. Do NOT include labels like "REACTION:", "SHAREABILITY:", "ENGAGEMENT:", etc. Just the caption itself.`;

const FACT_CARD_INSTAGRAM_ADDENDUM = `

Instagram format:
- Hook + reaction (under 100 chars before hashtags)
- SAVE TRIGGER: "Save this for inspiration"
- 5-6 hashtags: #parentingtips #kidsactivities #coloring #creativity #learningthroughplay #chunkycrayon
- End: "Link in bio for free coloring pages!"

Remember: Output ONLY the final caption text without any labels or section markers.`;

const FACT_CARD_FACEBOOK_ADDENDUM = `

Facebook format:
- Conversational, shareable tone
- SHARE TRIGGER: "Tag someone who'd love this!" / "Share this with your friends"
- 2-3 hashtags max
- Full link: chunkycrayon.com

Remember: Write as Chunky Crayon the brand. Output ONLY the final post text without any labels or section markers.`;

const FACT_CARD_PINTEREST_ADDENDUM = `

Pinterest format:
- SEO-first: Front-load "coloring tips" "kids activities" "parenting" keywords
- 300-400 characters, descriptive and searchable
- NO hashtags, NO emojis
- End with: chunkycrayon.com

Remember: Output ONLY the pin description text without any labels or section markers.`;

export type FactCardPlatform = 'instagram' | 'facebook' | 'pinterest';

/**
 * Generate a caption for a fact card post.
 */
export const generateFactCardCaption = async (
  fact: GeneratedFact,
  platform: FactCardPlatform,
): Promise<string> => {
  let systemPrompt = FACT_CARD_CAPTION_SYSTEM;

  if (platform === 'instagram') {
    systemPrompt += FACT_CARD_INSTAGRAM_ADDENDUM;
  } else if (platform === 'facebook') {
    systemPrompt += FACT_CARD_FACEBOOK_ADDENDUM;
  } else if (platform === 'pinterest') {
    systemPrompt += FACT_CARD_PINTEREST_ADDENDUM;
  }

  const prompt = `Write a caption for this fact card:

Fact: "${fact.fact}"
Category: ${fact.category}
Emoji used on card: ${fact.emoji}

Remember: The fact is already displayed on the graphic. Your caption should complement it with a brief comment and CTA.`;

  const { text } = await generateText({
    model: models.creative,
    system: systemPrompt,
    prompt,
  });

  return sanitizeCaption(text);
};
