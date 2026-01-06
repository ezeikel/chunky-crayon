import { generateText } from 'ai';
import { models } from './models';
import {
  ANIMATION_PROMPT_SYSTEM,
  DEFAULT_ANIMATION_PROMPT,
} from './prompts';

/**
 * Generate an expert-level Veo 3 animation prompt by analyzing the actual image.
 *
 * This function uses the full expert animation prompt system while viewing
 * the actual coloring page image, allowing it to reference specific visual
 * elements (the unicorn's mane, butterfly wings, background flowers, etc.).
 *
 * Designed to be called in Next.js `after()` callbacks to avoid latency.
 *
 * @param imageUrl - The URL of the coloring page image to analyze
 * @returns A tailored Veo 3 animation prompt for this specific image
 *
 * @example
 * ```ts
 * after(async () => {
 *   const animationPrompt = await generateAnimationPromptFromImage(imageUrl);
 *   await db.coloringImage.update({
 *     where: { id },
 *     data: { animationPrompt },
 *   });
 * });
 * ```
 */
export const generateAnimationPromptFromImage = async (
  imageUrl: string,
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: models.textFast, // Fast model is sufficient for prompt generation
      system: ANIMATION_PROMPT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this children's coloring page and generate a Veo 3 animation prompt.

Look at the SPECIFIC visual elements in the image and create a prompt that:
1. References actual elements you can see (character features, background items, etc.)
2. Selects 1 primary motion + 2-3 subtle secondary motions appropriate for these elements
3. Keeps motion intensity at 15-25% for elegant, non-AI-slop results
4. Includes a style anchor to preserve the coloring book aesthetic

Output ONLY the animation prompt. 2-3 sentences maximum.`,
            },
            {
              type: 'image',
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    const prompt = text.trim();

    // Validate we got a reasonable prompt back
    if (!prompt || prompt.length < 20) {
      // eslint-disable-next-line no-console
      console.warn('[Animation] Generated prompt too short, using default');
      return DEFAULT_ANIMATION_PROMPT;
    }

    return prompt;
  } catch (error) {
    // Log error but don't throw - use default prompt as fallback
    // eslint-disable-next-line no-console
    console.error('[Animation] Error generating prompt from image:', error);
    return DEFAULT_ANIMATION_PROMPT;
  }
};
