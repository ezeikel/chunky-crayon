'use server';

import { revalidateTag } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { createColoringImage } from '@/app/actions/coloring-image';

const NAME_THEME_PROMPTS: Record<string, string> = {
  animals:
    'friendly cartoon animals (puppies, kittens, bunnies) peeking around and inside the letters',
  flowers: 'blooming daisies, tulips, and sunflowers decorating the letters',
  unicorns:
    'cute unicorns with rainbows, hearts and stars dancing around the letters',
  space:
    'smiling planets, rockets, moons and friendly stars orbiting the letters',
  dinosaurs:
    'happy cartoon dinosaurs (T-rex, stegosaurus, triceratops) playing around the letters',
  vehicles:
    'cheerful cartoon cars, fire trucks, planes and trains zooming around the letters',
};

const NAME_THEME_LABEL: Record<string, string> = {
  animals: 'Cute Animals',
  flowers: 'Flowers',
  unicorns: 'Unicorns',
  space: 'Space',
  dinosaurs: 'Dinosaurs',
  vehicles: 'Vehicles',
};

export type NameTheme = keyof typeof NAME_THEME_PROMPTS;

export type GenerateNamePageInput = {
  name: string;
  theme: NameTheme;
  locale?: string;
};

export type GenerateNamePageResult =
  | { id: string; slug?: string }
  | { error: string };

/**
 * Build a kid-safe bubble-letter prompt from a child's name + theme and
 * hand it off to the existing createColoringImage pipeline (which already
 * runs the full post-processing per memory feedback_generation_parity.md).
 */
export const generateNamePage = async (
  input: GenerateNamePageInput,
): Promise<GenerateNamePageResult> => {
  const name = input.name.trim();
  if (!name) return { error: 'Name is required' };
  if (name.length > 24)
    return { error: "Name's a bit long — keep it under 24 characters." };
  if (!/^[\p{L}\p{M}0-9 '\-]+$/u.test(name))
    return { error: 'Only letters, numbers, spaces, hyphens and apostrophes.' };

  const theme = input.theme in NAME_THEME_PROMPTS ? input.theme : 'animals';
  const themeCopy = NAME_THEME_PROMPTS[theme];

  const description =
    `The name "${name}" in large bold bubble letters, each letter outlined with thick black lines. ` +
    `${themeCopy}. White background, simple line art, no shading, suitable for a coloring page. ` +
    `Cute and playful style for kids ages 3-8.`;

  const formData = new FormData();
  formData.set('description', description);
  formData.set('locale', input.locale ?? 'en');

  const result = await createColoringImage(formData);
  if ('error' in result) return { error: result.error };
  if (!result.id) return { error: 'Image generation failed' };

  // Vision-generated titles are unreliable for uncommon names — the model
  // mis-reads "Erinma" as "Emma", "Keanu" as "Kevin", etc. We already know
  // the exact name + theme on the server, so override the title directly
  // and skip the vision round-trip. alt/description stay AI-generated so
  // SEO + a11y still benefit from the analysis of the actual image.
  const themeLabel = NAME_THEME_LABEL[theme] ?? 'Fun Theme';
  const forcedTitle = `${name} Name Coloring Page — ${themeLabel}`;
  try {
    await db.coloringImage.update({
      where: { id: result.id },
      data: { title: forcedTitle },
    });
    revalidateTag(`coloring-image-${result.id}`, { expire: 0 });
  } catch (err) {
    console.error('[generate-name-page] forced title update failed:', err);
    // Non-fatal — the image still works, title is just the AI guess.
  }

  return { id: result.id };
};
