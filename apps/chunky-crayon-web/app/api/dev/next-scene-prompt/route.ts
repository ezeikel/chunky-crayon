import { NextResponse, connection } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/ai';
import { getAIDescription } from '@/lib/scene-generation';

export const maxDuration = 60;

const shortSchema = z.object({
  short: z
    .string()
    .describe(
      'A kid-typed version of the description. Target ~8 words (going a bit over is fine if needed to keep the key elements). Reads naturally, like a 5–8 year old typing what they want to colour. Must keep: the main subject(s), the core activity, and any specific, memorable detail (e.g. "with a crown" or "riding a scooter"). Drop: scenery, weather, lighting, style/art direction, generic adjectives. Lowercase, no trailing punctuation.',
    ),
});

/**
 * Dev/worker-only: returns a fresh scene description for the demo-reel
 * worker. Uses CC's existing daily-scene pipeline (Perplexity Sonar +
 * Claude cleanup + safety blocklist + dedup).
 *
 * Returns TWO versions:
 *   - full: the long, image-gen-quality description we pass to CC's
 *     create form so the generated coloring page is rich.
 *   - short: a 5–10 word version that gets typed on-camera in the reel
 *     so the typing phase feels like something a child actually said.
 *
 * Hard-gated to NODE_ENV != production because it spends real AI credits.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/next-scene-prompt
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  await connection();

  try {
    const full = await getAIDescription();
    const { object } = await generateObject({
      model: models.creative,
      schema: shortSchema,
      system: [
        'You shorten scene descriptions into what a young child would naturally type into a coloring-page app.',
        'Aim for around 8 words. A bit over is fine when the key elements demand it; a bit under is fine when the idea is simple.',
        '',
        'KEEP:',
        '- The main subject(s) — animals, characters, objects',
        '- The core activity or pose (eating, riding, sleeping, holding …)',
        '- Any single memorable detail that makes it THIS scene, not just "a fox" — e.g. "with a crown", "in a party hat", "reading a book"',
        '',
        'DROP:',
        '- Scenery and setting (forest, meadow, bedroom) unless it IS the subject',
        '- Weather, lighting, time of day',
        '- Style/art-direction words (cozy, whimsical, dreamy, vibrant, magical)',
        '- Filler adjectives (lovely, wonderful, charming, delightful)',
        '',
        'Output: lowercase, no trailing punctuation. Natural speech, not a keyword list.',
        '',
        'Examples:',
        '- Long: "A family of curious raccoons celebrating Earth Day in a woodland picnic, surrounded by wildflowers and pine cones"',
        '- Short: "a raccoon family having a picnic"',
        '',
        '- Long: "A joyful spring fox wearing a flower crown, frolicking in a meadow of daffodils under warm morning sunlight"',
        '- Short: "a fox wearing a flower crown"',
        '',
        '- Long: "A cute robot reading a storybook in a cozy bedroom with stars projected on the ceiling"',
        '- Short: "a robot reading a book"',
      ].join('\n'),
      prompt: `Long description:\n"${full}"\n\nWrite the kid-typed version.`,
    });
    return NextResponse.json({ full, short: object.short });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'scene generation failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
