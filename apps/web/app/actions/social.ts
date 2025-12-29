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

export const generateInstagramCaption = async (
  coloringImage: ColoringImage,
) => {
  const { text } = await generateText({
    model: models.text,
    system: INSTAGRAM_CAPTION_SYSTEM,
    prompt: createInstagramCaptionPrompt(
      coloringImage.title ?? '',
      coloringImage.description ?? '',
      coloringImage.tags ?? [],
    ),
  });

  return text;
};

export const generateFacebookCaption = async (coloringImage: ColoringImage) => {
  const { text } = await generateText({
    model: models.text,
    system: FACEBOOK_CAPTION_SYSTEM,
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
