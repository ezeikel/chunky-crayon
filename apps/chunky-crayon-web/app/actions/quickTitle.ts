'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { getTracedModels } from '@/lib/ai';

/**
 * Quick subject + title generation for the streaming-canvas view.
 *
 * The streaming page (canvas-as-loader) shows the row's `title` as a heading
 * and feeds the row's `sourcePrompt` into Colo's voiceover ("Wow, a [thing]!").
 * Both fields are stamped at row-insert time, BEFORE the worker has finished
 * generating + persisting the actual image, so we can't rely on the worker's
 * AI title-gen pass — the user would see the raw input flash on screen first.
 *
 * - Voice mode user says: "A birthday cake on top of the Eiffel Tower." then
 *   "A dinosaur." → without this, title is the verbose concatenation and
 *   Colo says "Wow, a birthday cake on top of the Eiffel Tower a dinosaur!".
 * - Photo mode has no kid-typed prompt at all → without this, sourcePrompt
 *   is null and Colo falls back to "Wow, a coloring page!".
 *
 * This action runs on Vercel inline before the worker fetch. ~700-1500ms on
 * Sonnet 4.5 for voice (text-only); ~1500-2500ms on GPT-5-2 for photo
 * (vision pass on a 1024x1024 image).
 *
 * Text mode skips this entirely — what the user typed IS already a good
 * title and subject (e.g. "a tiger playing tennis").
 */

export type QuickTitleResult = {
  /** 2-4 words, kid-friendly, used for the streaming page heading. */
  title: string;
  /**
   * Short noun phrase for Colo's voiceover. The script generator will
   * wrap it as "Wow, a [subject]!" so the phrase should read naturally
   * after "a" or "an" — e.g. "diving elephant", "Eiffel Tower dinosaur".
   */
  subject: string;
};

const SCHEMA = z.object({
  title: z
    .string()
    .min(1)
    .max(60)
    .describe('2-4 word kid-friendly page title, e.g. "Eiffel Tower Dinosaur"'),
  subject: z
    .string()
    .min(1)
    .max(60)
    .describe(
      'Short noun phrase that reads naturally after "a" or "an", e.g. "diving elephant"',
    ),
});

const VOICE_SYSTEM = `You read a kid's freeform spoken description and produce a short, kid-friendly summary used for two things:

1. A 2-4 word page title (capitalised words). Examples: "Eiffel Tower Dinosaur", "Diving Elephant", "Ninja Frog".
2. A short noun phrase that reads naturally after "a" or "an" (lower-case unless proper noun). Examples: "diving elephant", "Eiffel Tower dinosaur", "ninja frog".

Pick the most fun, picture-able subject. If the kid mentioned multiple things, combine them naturally. Avoid generic words like "scene" or "picture".`;

const PHOTO_SYSTEM = `You look at a photo and produce a short, kid-friendly summary used for two things:

1. A 2-4 word page title (capitalised words). Examples: "Fluffy Puppy", "Birthday Cake", "Toy Dinosaur".
2. A short noun phrase that reads naturally after "a" or "an" (lower-case unless proper noun). Examples: "fluffy puppy", "birthday cake", "toy dinosaur".

Identify the most prominent subject in the photo. If multiple things are present, pick the one a kid would most want to colour. Keep it concrete and visual.`;

export async function generateQuickTitleFromVoice(
  firstAnswer: string,
  secondAnswer: string,
): Promise<QuickTitleResult> {
  const tracedModels = getTracedModels({
    properties: { action: 'quick-title-voice' },
  });

  const { object } = await generateObject({
    model: tracedModels.creative,
    system: VOICE_SYSTEM,
    schema: SCHEMA,
    prompt: `Q1 (what to colour): "${firstAnswer}"\nQ2 (more detail): "${secondAnswer}"`,
  });

  return object;
}

export async function generateQuickTitleFromPhoto(
  photoBase64: string,
): Promise<QuickTitleResult> {
  const tracedModels = getTracedModels({
    properties: { action: 'quick-title-photo' },
  });

  // The base64 may arrive with the data: URL prefix. The AI SDK accepts
  // raw base64 with a mediaType, OR a data URL — we strip and re-derive
  // mediaType for clarity.
  const dataUrlMatch = photoBase64.match(
    /^data:image\/(\w+);base64,([\s\S]*)$/,
  );
  const mediaType = dataUrlMatch ? `image/${dataUrlMatch[1]}` : 'image/png';
  const data = dataUrlMatch ? dataUrlMatch[2] : photoBase64;

  const { object } = await generateObject({
    model: tracedModels.vision,
    system: PHOTO_SYSTEM,
    schema: SCHEMA,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this photo for the title fields.' },
          { type: 'image', image: data, mediaType },
        ],
      },
    ],
  });

  return object;
}
