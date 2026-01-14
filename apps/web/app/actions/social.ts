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

IMPORTANT - This is a CAROUSEL post with static image first, animated video second:
- The first slide shows the printable coloring page (what they can download)
- The second slide is the magical animated version that brings it to life
- You MUST include a call-to-action to swipe to see the animation
- Use phrases like "Swipe to watch it come alive!", "Scroll to see the magic!", or "This coloring page comes to LIFE - swipe to see!"
- Make it engaging and encourage them to visit the link in bio to download`;

/**
 * Instagram carousel with colored example (3 slides).
 * Static → Animation → Colored example (finale)
 */
const INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM = `

IMPORTANT - This is a 3-SLIDE CAROUSEL:
- Slide 1: The printable coloring page (black & white) - what they download
- Slide 2: The magical animated version that brings it to life
- Slide 3: A beautifully colored-in example showing what THEY could create!
- You MUST include a call-to-action to swipe through all slides
- Use phrases like "Swipe to see the magic, then see what you could create!", "Keep swiping for the full journey!", or "B&W → Animated → Your masterpiece awaits!"
- End with encouragement: the colored example shows what's possible when THEY color it
- Make it engaging and encourage them to visit the link in bio to download and create their own`;

/**
 * Instagram Reel-specific system prompt addition.
 * Cross-promotes the carousel post for downloads.
 */
const INSTAGRAM_REEL_ADDENDUM = `

IMPORTANT - This is a REEL (vertical video) post:
- The video shows the coloring page coming to life with magical animation
- This Reel is for discovery/reach - direct them to our profile for the downloadable version
- Use phrases like "Love this? Check our latest post to download and color it yourself!" or "Want to color this? Head to our profile for the printable version!"
- Keep it short, punchy, and engaging
- Include relevant hashtags for discovery`;

/**
 * Facebook video-specific system prompt addition.
 */
const FACEBOOK_VIDEO_ADDENDUM = `

IMPORTANT - This is a VIDEO post:
- The video shows the coloring page coming to life with magical animation
- Encourage viewers to visit the website to download the printable version
- Use phrases like "Watch it come alive!" or "See the magic, then visit our website to color it yourself"
- Include a clear call-to-action to visit chunkycrayon.com`;

/**
 * Facebook image post when video is also posted.
 * Cross-references the video post.
 */
const FACEBOOK_IMAGE_WITH_VIDEO_ADDENDUM = `

IMPORTANT - This is the PRINTABLE IMAGE post (we also posted a video):
- This is the downloadable coloring page
- Reference that they might have seen our animated version: "Saw our animated video? Here's the printable version!"
- Encourage them to download from chunkycrayon.com
- Keep it warm and inviting for families`;

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
const FACT_CARD_CAPTION_SYSTEM = `You are a social media expert for Chunky Crayon, a children's coloring app. Your task is to write an engaging caption for a fact card post.

The post features a beautiful graphic with a short fact about coloring, creativity, or child development.

Your caption should:
1. Expand on the fact with a brief, conversational comment (1-2 sentences)
2. Use 1-2 relevant emojis naturally
3. Include a soft call-to-action to visit chunkycrayon.com for free coloring pages
4. Use a warm, friendly tone that resonates with parents
5. Include 3-5 relevant hashtags at the end

Keep it concise - the graphic already contains the main message. Your caption should complement it, not repeat it.`;

const FACT_CARD_INSTAGRAM_ADDENDUM = `
Format for Instagram:
- Keep caption under 150 characters before hashtags
- Use 4-5 popular hashtags (#coloring #kidsactivities #parentingtips #creativity #learningthroughplay)
- End with "Link in bio!" or similar CTA`;

const FACT_CARD_FACEBOOK_ADDENDUM = `
Format for Facebook:
- Conversational, community-building tone
- Use 2-3 hashtags maximum
- Encourage comments: "Did you know this?" or "Tag a parent who'd love this!"
- Include full website link: chunkycrayon.com`;

const FACT_CARD_PINTEREST_ADDENDUM = `
Format for Pinterest:
- Front-load keywords for search (coloring tips, kids activities, parenting)
- Be descriptive and searchable
- Include 3-4 relevant keywords naturally
- Link goes to chunkycrayon.com`;

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
