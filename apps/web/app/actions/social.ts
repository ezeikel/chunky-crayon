'use server';

import {
  generateText,
  models,
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  PINTEREST_CAPTION_SYSTEM,
  createInstagramCaptionPrompt,
  createFacebookCaptionPrompt,
  createPinterestCaptionPrompt,
} from '@/lib/ai';
import { ColoringImage } from '@chunky-crayon/db';

/**
 * Instagram carousel-specific system prompt addition.
 * Static image first (conversion), video second (engagement).
 */
const INSTAGRAM_CAROUSEL_ADDENDUM = `

CAROUSEL POST - Create ANTICIPATION for swiping:

Slides: 1) Printable coloring page 2) Animated version coming to life

REQUIREMENTS:
1. Hook MUST create swipe urge: "Watch what happens when this [subject] comes to life... (slide 2 is everything)"
2. Natural swipe CTAs: "Swipe to watch the magic unfold" / "Slide 2 is *chef's kiss*"
3. SAVE TRIGGER (essential): "Save this for your next coloring adventure"
4. Final CTA: "Love it? Grab this page free - link in bio!"`;

/**
 * Instagram carousel with colored example (3 slides).
 * Static → Animation → Colored example (finale)
 */
const INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM = `

3-SLIDE CAROUSEL - Build excitement through ALL slides:

Slides: 1) Printable B&W 2) Animated magic 3) Colored example (inspiration)

REQUIREMENTS:
1. Journey hook: "From blank page → animated magic → your kid's masterpiece (keep swiping!)"
2. Slide 3 payoff: "The last slide shows what YOUR kid could create"
3. SAVE TRIGGER: "Save this for weekend crafts"
4. CTA: "Ready to create your own? Free download - link in bio!"`;

/**
 * Instagram Reel-specific system prompt addition.
 * Cross-promotes the carousel post for downloads.
 */
const INSTAGRAM_REEL_ADDENDUM = `

REEL - Optimized for DISCOVERY and REACH:

REQUIREMENTS:
1. VIRAL HOOK (choose one that fits):
   - "Parents, you're welcome."
   - "POV: Your kid gets exactly the coloring page they asked for"
   - "This is why I love screen-free activities"

2. SHORT caption (under 150 chars before hashtags) - Reel captions get clipped

3. CROSS-PROMO to feed: "Want to color this? Check our latest post for the free printable!"

4. ENGAGEMENT: "Double tap if your kid would love this" / "Comment what we should make next!"

5. DISCOVERY HASHTAGS (8-12): Mix #reels #explorepage with niche tags like #kidsactivities #coloringpage`;

/**
 * Facebook video-specific system prompt addition.
 */
const FACEBOOK_VIDEO_ADDENDUM = `

VIDEO POST - Optimize for watch time and shares:

REQUIREMENTS:
1. WATCH-TIME hook: "Watch until the end - the animation is SO satisfying"
2. SHARE TRIGGER: "Share this with a parent who needs a screen-free activity idea"
3. COMMENT DRIVER: "What animal should we animate next? Drop your vote!"
4. CTA: "Download the printable version at chunkycrayon.com"`;

/**
 * Facebook image post when video is also posted.
 * Cross-references the video post.
 */
const FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM = `

IMAGE POST (video also posted) - Cross-reference naturally:

REQUIREMENTS:
1. Reference the video: "Saw our animated video? Here's the printable so your kid can color it themselves!"
2. OR lead with printable: "The printable version of today's animated coloring page"
3. Download CTA: "Free download at chunkycrayon.com"
4. Keep warm and family-focused`;

export type InstagramPostType =
  | 'image'
  | 'carousel'
  | 'carousel_with_colored'
  | 'reel';

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
  }

  const { text } = await generateText({
    model: models.text,
    system: systemPrompt,
    prompt: createInstagramCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export type FacebookPostType = 'image' | 'video' | 'image_with_video';

export const generateFacebookCaption = async (
  coloringImage: ColoringImage,
  postType: FacebookPostType = 'image',
) => {
  let systemPrompt = FACEBOOK_CAPTION_SYSTEM;

  if (postType === 'video') {
    systemPrompt += FACEBOOK_VIDEO_ADDENDUM;
  } else if (postType === 'image_with_video') {
    systemPrompt += FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM;
  }

  const { text } = await generateText({
    model: models.text,
    system: systemPrompt,
    prompt: createFacebookCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export const generatePinterestCaption = async (
  coloringImage: ColoringImage,
) => {
  const { text } = await generateText({
    model: models.text,
    system: PINTEREST_CAPTION_SYSTEM,
    prompt: createPinterestCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
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

FACT CARD TRUTH: These are SHARE-BAIT. Parents love sharing "did you know" content to look like informed parents.

STRUCTURE:
1. REACTION (1 sentence): "I had to share this!" / "This is why we're passionate about coloring"
2. SHAREABILITY: "Tag a parent who needs to see this!" / "Share with your parenting group"
3. ENGAGEMENT: "Did you know this? Yes or No!" / "Does this resonate?"
4. SOFT CTA: "More coloring fun at chunkycrayon.com"

Keep SHORT - the graphic has the main message. Caption supports, doesn't repeat.
Use 1-2 emojis naturally.`;

const FACT_CARD_INSTAGRAM_ADDENDUM = `

Instagram format:
- Hook + reaction (under 100 chars before hashtags)
- SAVE TRIGGER: "Save this for inspiration"
- 5-6 hashtags: #parentingtips #kidsactivities #coloring #creativity #learningthroughplay #chunkycrayon
- End: "Link in bio for free coloring pages!"`;

const FACT_CARD_FACEBOOK_ADDENDUM = `

Facebook format:
- Conversational, shareable tone
- SHARE TRIGGER: "Tag a parent who'd love this!" / "Share to your mommy group"
- 2-3 hashtags max
- Full link: chunkycrayon.com`;

const FACT_CARD_PINTEREST_ADDENDUM = `

Pinterest format:
- SEO-first: Front-load "coloring tips" "kids activities" "parenting" keywords
- 300-400 characters, descriptive and searchable
- NO hashtags, NO emojis
- End with: chunkycrayon.com`;

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
    model: models.text,
    system: systemPrompt,
    prompt,
  });

  return text;
};
