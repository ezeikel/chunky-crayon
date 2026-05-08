/**
 * Smoke test for the multi-judge architecture's three vision providers.
 *
 * Calls each of:
 *   - Claude Opus 4.7 (via @ai-sdk/anthropic)
 *   - GPT-5.5 (via @ai-sdk/openai)
 *   - Gemini 3.1 Pro (via @ai-sdk/google)
 *
 * with the same prompt + image (the latest prod comic strip) and asks
 * them to return a tiny JSON judgement. Confirms:
 *   - Model IDs are valid
 *   - All three accept image input via the AI SDK
 *   - JSON parsing works (so we can build the real jury on top)
 *
 * Cost: 3 cheap calls, ~$0.05 total.
 *
 * Usage: pnpm tsx scripts/spike-multi-judge-smoke.ts
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

const STRIP_URL =
  'https://assets.chunkycrayon.com/comic-strips/weekend-smudge-mops-the-whole-weekend-2026-05-08/strip.png';

const SYSTEM = `You are reviewing a 4-panel children's comic strip. Return a single JSON object with no markdown wrapper:
{
  "passed": boolean,
  "reasoning": "one sentence describing the strip and whether it makes sense"
}`;

const PROMPT = `Look at this 4-panel kids comic strip. Does it tell a coherent story? Return the JSON only.`;

async function judge(
  label: string,
  // Vercel AI SDK accepts any LanguageModelV2-compatible provider here;
  // the per-provider types are deliberately broad and would need a
  // shared union to type strictly. For a one-off smoke test, accept any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  imageBytes: Uint8Array,
) {
  const start = Date.now();
  try {
    const { text } = await generateText({
      model,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image', image: imageBytes },
          ],
        },
      ],
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        text
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim(),
      );
    } catch {
      console.log(
        `[${label}] DONE in ${elapsed}s — RAW (JSON parse failed):\n${text}\n`,
      );
      return;
    }
    console.log(`[${label}] DONE in ${elapsed}s — ${JSON.stringify(parsed)}\n`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(
      `[${label}] FAILED in ${elapsed}s:`,
      err instanceof Error ? err.message : err,
    );
  }
}

async function main() {
  console.log(`[smoke] Fetching ${STRIP_URL}`);
  const res = await fetch(STRIP_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const imageBytes = new Uint8Array(await res.arrayBuffer());
  console.log(`[smoke] Image bytes: ${imageBytes.byteLength}`);

  // Run sequentially so we can read the logs in order.
  console.log('\n[smoke] --- Claude Opus 4.7 ---');
  await judge('opus-4.7', anthropic('claude-opus-4-7'), imageBytes);

  console.log('[smoke] --- GPT-5.5 ---');
  await judge('gpt-5.5', openai('gpt-5.5'), imageBytes);

  console.log('[smoke] --- Gemini 3.1 Pro ---');
  await judge('gemini-3.1-pro', google('gemini-3.1-pro-preview'), imageBytes);

  console.log('[smoke] All done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[smoke] failed:', e);
  process.exit(1);
});
