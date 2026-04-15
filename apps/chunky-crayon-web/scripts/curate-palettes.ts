/**
 * One-shot research script.
 *
 * Asks Perplexity Sonar Deep Research to curate 4 mood-themed colour
 * palettes (realistic / pastel / cute / surprise), each exactly 18 colours
 * sequenced by hue so the 6×3 grid reads as a clean rainbow + neutrals.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   tsx scripts/curate-palettes.ts > /tmp/palettes.json
 */

const API_KEY = process.env.PERPLEXITY_API_KEY?.trim();
if (!API_KEY) {
  console.error('PERPLEXITY_API_KEY missing');
  process.exit(1);
}

const SYSTEM = `You are a senior colour designer who has worked on kids' coloring
apps (think Toca Boca, Khan Academy Kids). You specialise in selecting
cohesive 16-colour palettes that read well as buttons in a vertical grid,
with no two adjacent buttons sharing the same hue family.`;

const USER = `Curate FOUR colour palettes for a children's coloring app.
Each palette must be EXACTLY 18 colours. Each colour gets a short kid-friendly name and a hex value.

The 18 colours per palette must be sequenced as a rainbow walk:
red → orange → yellow → green → cyan → blue → violet → pink → neutrals
so that no two adjacent colours share the same hue family. The last 3 should be neutrals (black, white, gray) tinted to match each palette's mood.

The four palettes:

1. **realistic** — full-spectrum saturated colours kids recognise (cherry red, sunset orange, sunshine yellow, grass green, sky blue, grape purple, etc.) Real-world primary/secondary tones.

2. **pastel** — soft, muted, dreamy versions. Lower saturation, higher lightness. Same hue order as realistic. Powder blue, mint, peach, lavender. Cream/blush neutrals.

3. **cute** — bright candy-store palette. Saturated but warm. Strawberry, mango, lemon, apple-green, bubble-blue, grape-soda, hot-pink. Slightly warmer than realistic.

4. **surprise** — neon / electric / unexpected. UV-purple, lime-lightning, electric-cyan, hot-magenta, volcano-orange, neon-yellow. Maximum saturation, dramatic. Black/white/silver neutrals.

CRITICAL CONSTRAINTS:
- Exactly 18 colours per palette
- No two adjacent colours in the same hue family (e.g. don't put two pinks next to each other)
- The 18 colours must "tell a story" — a coherent mood
- Last 3 entries are always neutrals tinted to the palette mood
- Use real kid-friendly names like "Strawberry" not "Brand Red"
- Hex values must be 7-character upper-case (e.g. "#FF1493")

OUTPUT FORMAT: a JSON object exactly like this, no markdown fences, no commentary:

{
  "realistic": [{"name": "...", "hex": "#XXXXXX"}, ... 18 items ...],
  "pastel":    [{"name": "...", "hex": "#XXXXXX"}, ... 18 items ...],
  "cute":      [{"name": "...", "hex": "#XXXXXX"}, ... 18 items ...],
  "surprise":  [{"name": "...", "hex": "#XXXXXX"}, ... 18 items ...]
}`;

async function main() {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-deep-research',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: USER },
      ],
      temperature: 0.4,
      reasoning_effort: 'medium',
    }),
  });

  if (!res.ok) {
    console.error('Perplexity error', res.status, await res.text());
    process.exit(1);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = data.choices[0]?.message?.content ?? '';

  // The deep-research model may wrap output in <think> tags or markdown
  // fences. Try to extract the JSON object from the response.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in response:\n', raw);
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.error('JSON parse failed:', e);
    console.error('Raw extracted:\n', jsonMatch[0]);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
