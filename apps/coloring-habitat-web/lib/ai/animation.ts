/**
 * Animation Prompt Generation — Coloring Habitat
 *
 * Re-exports shared animation from coloring-core with CH-specific prompts.
 */

import { generateAnimationPromptFromImage as sharedGenerate } from "@one-colored-pixel/coloring-core";
import { ANIMATION_PROMPT_SYSTEM, DEFAULT_ANIMATION_PROMPT } from "./prompts";

export const generateAnimationPromptFromImage = async (
  imageUrl: string,
): Promise<string> => {
  return sharedGenerate(imageUrl, {
    system: ANIMATION_PROMPT_SYSTEM,
    userPrompt: `Analyze this adult coloring page and generate a Veo 3 animation prompt.

Look at the SPECIFIC visual elements in the image and create a prompt that:
1. References actual elements you can see (intricate patterns, botanical details, architectural features, etc.)
2. Selects 1 primary motion + 2-3 subtle secondary motions appropriate for these elements
3. Keeps motion intensity at 15-25% for elegant, meditative results
4. Includes a style anchor to preserve the detailed line art aesthetic

Output ONLY the animation prompt. 2-3 sentences maximum.`,
    defaultPrompt: DEFAULT_ANIMATION_PROMPT,
  });
};
