/**
 * Character trait extraction.
 *
 * Turns a parent's short free-text prompt (e.g. "small purple dragon who
 * likes biscuits and has yellow scarf") into the structured payload that
 * downstream stages need:
 *
 *   - `species`       → grid filter + display label ("dragon")
 *   - `traits`        → personality hints used in scene prompts later
 *                       ("brave", "sleepy", "loves biscuits")
 *   - `signatureDetails` → the visual-fidelity QA gate. Mirrors
 *                       Hero.signatureDetails from packages/coloring-core/src/bundles.
 *                       Each item must be visually CHECKABLE on a render
 *                       ("yellow scarf around neck"; "small triangular horns").
 *   - `referenceSheetPrompt` → the actual gpt-image-2 prompt used to generate
 *                       the character portrait. Inlines signatureDetails verbatim.
 *   - `suggestedVoicePersona` → soft suggestion shown in the parent UI as
 *                       a starting pick in the voice persona scroll.
 *
 * Pattern matches `Hero.referenceSheetPrompt` style:
 *   - Single character, plain white background, no scenery
 *   - Child-friendly cartoon line-art aesthetic
 *   - signatureDetails appear in the prompt body verbatim so gpt-image-2
 *     gets unambiguous instructions for the QA-checkable elements.
 *
 * Output is moderated upstream of this call (raw user input) AND downstream
 * (the extracted fields) — `createCharacter` runs moderation against both
 * sides because the LLM can still emit unsafe content from clean input
 * (rare but observed in the bundles work).
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getTracedModels } from '@/lib/ai';

const EXTRACTION_SYSTEM = `You are helping a parent set up a recurring cartoon character that their 3-8 year old will see in coloring pages and on a profile page.

Your job: turn the parent's short description into a structured profile.

Hard rules:
- The character MUST be a friendly, child-safe cartoon figure.
- Never reference real people, celebrities, or licensed/trademarked characters (no "like Bluey", no "Spider-Man style", etc.).
- Never invent traits that aren't supported by the description, but DO infer obvious ones (a "dragon who loves biscuits" is gentle and food-motivated).
- The signatureDetails array is the most important output: each entry must be a single VISUAL feature that a person could look at a generated drawing and verify ("yellow scarf around neck" — yes/no checkable; "happy" — not checkable, do not include).
- Aim for 3-5 signatureDetails. Fewer than 3 makes the character generic; more than 5 confuses the image model.
- Output the referenceSheetPrompt as a single English paragraph that names every signatureDetail verbatim and ends with "Drawn as a children's coloring book line-art portrait, single character, plain white background, no scenery." Do not add stylistic embellishments beyond that.

Voice persona keys you may suggest (pick one that best fits the species + traits):
  warm-girl-7yo, warm-boy-7yo, playful-girl-5yo, playful-boy-5yo,
  sleepy-neutral, brave-neutral, silly-neutral, gentle-neutral`;

const extractionSchema = z.object({
  species: z
    .string()
    .min(2)
    .max(40)
    .describe(
      'Lowercase singular noun for what this character is (e.g. "dragon", "puppy", "robot", "kid", "fairy").',
    ),
  traits: z
    .array(z.string().min(1).max(60))
    .describe(
      'Personality + interest hints, 2-5 entries. Short lowercase phrases ("brave", "loves muffins").',
    ),
  signatureDetails: z
    .array(z.string().min(1).max(120))
    .describe(
      '3-5 visually checkable details. Each must name a specific feature (colour + part).',
    ),
  referenceSheetPrompt: z
    .string()
    .min(40)
    .describe(
      'Single-paragraph gpt-image-2 prompt that inlines every signatureDetail verbatim.',
    ),
  suggestedVoicePersona: z
    .enum([
      'warm-girl-7yo',
      'warm-boy-7yo',
      'playful-girl-5yo',
      'playful-boy-5yo',
      'sleepy-neutral',
      'brave-neutral',
      'silly-neutral',
      'gentle-neutral',
    ])
    .describe('Best-fit voice persona key from the allowed list.'),
});

export type ExtractedCharacter = z.infer<typeof extractionSchema>;

/**
 * Run the parent's short description through Claude to produce a structured
 * character profile. Throws on model failure or schema validation failure;
 * the caller (createCharacter) wraps this in a try/catch and refunds nothing
 * because no credits have been debited at this point.
 */
export const extractCharacterTraits = async ({
  name,
  shortPrompt,
  userId,
}: {
  name: string;
  shortPrompt: string;
  userId: string;
}): Promise<ExtractedCharacter> => {
  const models = getTracedModels({
    userId,
    properties: { feature: 'characters', stage: 'trait-extraction' },
  });

  const result = await generateText({
    model: models.creative,
    output: Output.object({ schema: extractionSchema }),
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `Character name (set by the parent): ${name}`,
              `Parent's short description: ${shortPrompt}`,
              '',
              'Produce the structured profile.',
            ].join('\n'),
          },
        ],
      },
    ],
  });

  const output = result.output;
  if (!output) {
    throw new Error('[trait-extraction] model returned no structured output');
  }

  return output;
};
