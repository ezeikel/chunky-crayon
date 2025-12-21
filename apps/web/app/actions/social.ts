'use server';

import OpenAI from 'openai';
import {
  OPENAI_MODEL_GPT_4O,
  INSTAGRAM_CAPTION_PROMPT,
  FACEBOOK_CAPTION_PROMPT,
} from '@/constants';
import { ColoringImage } from '@chunky-crayon/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateInstagramCaption = async (
  coloringImage: ColoringImage,
) => {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: INSTAGRAM_CAPTION_PROMPT,
      },
      {
        role: 'user',
        content: `Generate an Instagram caption for this coloring page:
Title: ${coloringImage.title}
Description: ${coloringImage.description}
Tags: ${coloringImage.tags?.join(', ')}`,
      },
    ],
  });

  return response.choices[0].message.content;
};

export const generateFacebookCaption = async (coloringImage: ColoringImage) => {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: FACEBOOK_CAPTION_PROMPT,
      },
      {
        role: 'user',
        content: `Generate a Facebook post for this coloring page:
Title: ${coloringImage.title}
Description: ${coloringImage.description}
Tags: ${coloringImage.tags?.join(', ')}

Website: https://chunkycrayon.com`,
      },
    ],
  });

  return response.choices[0].message.content;
};
