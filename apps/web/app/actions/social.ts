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
 * Encourages viewers to swipe to see the printable coloring page.
 */
const INSTAGRAM_CAROUSEL_ADDENDUM = `

IMPORTANT - This is a CAROUSEL post with video first, image second:
- The first slide is an animated video that brings the coloring page to life
- The second slide is the actual printable coloring page
- You MUST include a call-to-action to swipe/scroll to see the colorable version
- Use phrases like "Swipe to see the colorable version", "Scroll for the printable page", or "Watch it come alive, then swipe to color it yourself"
- Make it engaging and encourage them to visit the link in bio to download`;

/**
 * Facebook video-specific system prompt addition.
 */
const FACEBOOK_VIDEO_ADDENDUM = `

IMPORTANT - This is a VIDEO post:
- The video shows the coloring page coming to life with magical animation
- Encourage viewers to visit the website to download the printable version
- Use phrases like "Watch it come alive!" or "See the magic, then visit our website to color it yourself"
- Include a clear call-to-action to visit chunkycrayon.com`;

export const generateInstagramCaption = async (
  coloringImage: ColoringImage,
  isCarousel: boolean = false,
) => {
  const systemPrompt = isCarousel
    ? INSTAGRAM_CAPTION_SYSTEM + INSTAGRAM_CAROUSEL_ADDENDUM
    : INSTAGRAM_CAPTION_SYSTEM;

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

export const generateFacebookCaption = async (
  coloringImage: ColoringImage,
  isVideo: boolean = false,
) => {
  const systemPrompt = isVideo
    ? FACEBOOK_CAPTION_SYSTEM + FACEBOOK_VIDEO_ADDENDUM
    : FACEBOOK_CAPTION_SYSTEM;

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
