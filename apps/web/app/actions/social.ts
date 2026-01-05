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
 * Static → Colored example → Animation
 */
const INSTAGRAM_CAROUSEL_WITH_COLORED_ADDENDUM = `

IMPORTANT - This is a 3-SLIDE CAROUSEL:
- Slide 1: The printable coloring page (black & white)
- Slide 2: A colored-in example showing what it could look like
- Slide 3: The magical animated version that brings it to life
- You MUST include a call-to-action to swipe through all slides
- Use phrases like "Swipe to see it colored AND animated!", "From blank → colored → alive!", or "Watch the transformation - keep swiping!"
- Highlight the journey: download it, color it like our example, then watch it come alive
- Make it engaging and encourage them to visit the link in bio to download`;

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
