import { NextResponse, connection } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/ai';

export const maxDuration = 30;

const shortSchema = z.object({
  short: z
    .string()
    .describe(
      'A kid-typed version of the description. Target ~8 words (going a bit over is fine if needed to keep the key elements). Reads naturally, like a 5–8 year old typing what they want to colour. Must keep: the main subject(s), the core activity, and any specific, memorable detail (e.g. "with a crown" or "riding a scooter"). Drop: scenery, weather, lighting, style/art direction, generic adjectives. Lowercase, no trailing punctuation.',
    ),
});

/**
 * Worker-callable shortener: turns a coloring image's title + AI description
 * into the ~8-word kid-typed prompt used in V2 demo reels.
 *
 *   - The text reel TYPES this string into the on-screen textarea.
 *   - The text + image reel kid VOICEOVER reads it verbatim.
 *
 * Lifted from the existing `/api/dev/next-scene-prompt` shortener so the
 * Bluey-tone guardrails stay in one place. That route runs Perplexity
 * upstream; this one starts from an existing row.
 *
 * Auth: prod requires `Authorization: Bearer ${WORKER_SECRET}`. Dev is open
 * for local iteration.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get('authorization');
    if (!auth || auth !== `Bearer ${process.env.WORKER_SECRET}`) {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }
  }

  await connection();

  let body: { title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description } = body;
  if (!title && !description) {
    return NextResponse.json(
      { error: 'title or description is required' },
      { status: 400 },
    );
  }

  // Prefer description (richer scene info); fall back to title alone.
  const long = description?.trim() || title!.trim();

  try {
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
        '- Words like "coloring page", "for kids", "black and white" — these describe the OUTPUT format, not what the kid asked for',
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
      prompt: [
        title ? `Title: "${title}"` : null,
        description ? `Description: "${description}"` : null,
        '',
        'Write the kid-typed version.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
    return NextResponse.json({ short: object.short });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'shortener failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
