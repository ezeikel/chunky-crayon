'use server';

import { generateText } from 'ai';
import { models } from '@/lib/ai/models';

const DESCRIBE_SKETCH_SYSTEM = `You are an expert at analyzing children's hand-drawn sketches and describing them for a coloring page generation system.

Your task is to look at the sketch and provide a detailed, creative description that captures:
1. The main subject(s) of the drawing
2. Any notable features or details
3. The scene or setting if apparent
4. The mood or style of the drawing

Keep the description:
- Concise (1-2 sentences)
- Suitable for generating a coloring page
- Child-friendly and positive
- Focused on visual elements that can be colored

Examples:
- "A friendly dinosaur eating leaves from a tall tree in a sunny meadow"
- "A princess standing in front of a magical castle with towers and flags"
- "A rocket ship flying through space with stars and planets around it"`;

const DESCRIBE_SKETCH_PROMPT = `Please describe this child's sketch for generating a coloring page. Focus on what the child has drawn and describe it in a way that would help create a beautiful coloring page based on their idea.`;

export async function describeSketch(base64Image: string): Promise<string> {
  const { text } = await generateText({
    model: models.text,
    system: DESCRIBE_SKETCH_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: DESCRIBE_SKETCH_PROMPT },
          {
            type: 'image',
            image: base64Image,
          },
        ],
      },
    ],
  });

  return text.trim();
}
