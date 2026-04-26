/**
 * In-process background-music generation for the worker.
 *
 * The CC web app used to do this inline in its after() server-action hook,
 * but Vercel silently drops long after() tasks (see comment in
 * apps/chunky-crayon-web/app/actions/coloring-image.ts). Running here on
 * the Hetzner box has no timeout, no drops, persists until the DB write
 * lands.
 *
 * Ported from apps/chunky-crayon-web/app/actions/background-music.ts +
 * apps/chunky-crayon-web/lib/elevenlabs/index.ts +
 * apps/chunky-crayon-web/lib/audio/prompts.ts.
 *
 * Keep prompts in sync with the web copy if they change.
 */
import { put } from "@one-colored-pixel/storage";
import { db } from "@one-colored-pixel/db";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Hardcoded so we don't pull coloring-core's barrel (which transitively
// imports sharp). Keep in sync with MODEL_IDS.CLAUDE_SONNET_4_5 in
// packages/coloring-core/src/models.ts.
const CLAUDE_SONNET_4_5 = "claude-sonnet-4-5-20250929";

// ---------------------------------------------------------------------------
// Prompts — ported verbatim from apps/chunky-crayon-web/lib/ai/prompts.ts.
// If the web copy changes, update this file too.
// ---------------------------------------------------------------------------

const TARGET_AGE = "3-8";

const MUSIC_PROMPT_SYSTEM = `<role>You are a music director for Chunky Crayon, a children's coloring page platform for ages ${TARGET_AGE}. You write prompts for the ElevenLabs Music API that translate a coloring page scene into a bespoke instrumental background track.</role>

<goal>Produce ONE short, vivid music prompt (40–80 words) that ElevenLabs will turn into a calming, kid-friendly background loop tailored to the scene. The track must feel like it was made for THIS specific image — not generic kids music.</goal>

<rules>
- Lead with the scene and the feeling it evokes, not boilerplate. The first sentence should make ElevenLabs picture the music.
- Use specific musical language: real instruments (felt piano, music box, glockenspiel, marimba, ukulele, soft bowed cello, recorder, whistle, hand percussion, kalimba, harp, gentle pizzicato strings), articulations, and textures.
- Translate scene elements into musical motifs: e.g. a scooter → light bicycle-bell ostinato; underwater → bubbling marimba arpeggios; rain → soft pitter-patter mallets; fire engine → playful brass dabs; bakery → warm wooden xylophone.
- Always state tempo (60–80 BPM is the safe ambient zone for kids) and key feel (major, lydian for whimsy, mixolydian for adventure).
- Always end with: "instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children".
- NEVER use generic descriptors like "soft", "gentle", "calming" alone — always pair with a specific instrument or texture.
- NEVER include vocals, drums, distortion, electric guitar, sub-bass, or anything jarring.
- Output the prompt as a SINGLE plain-text paragraph. No labels, no quotes, no markdown, no preamble.
</rules>

<good_example>
Scene: A happy cat in a helmet riding a scooter on a sunny day.
Output: A breezy, sunlit afternoon ride: a playful felt-piano melody bounces over a tiny bicycle-bell ostinato, light pizzicato strings, and a warm ukulele strum. Add a mellow whistled countermelody and an airy pad underneath for sky and clouds. Around 72 BPM, G major, joyful and curious but never frantic. Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.
</good_example>

<bad_example>
A soft, gentle, kid-friendly piano track that is calming and nice for children to color to. Slow tempo. No vocals.
</bad_example>`;

const createMusicPromptUserPrompt = (
  title: string,
  description: string,
  tags: string[],
): string => `Write an ElevenLabs music prompt for this coloring page.

<title>${title}</title>
<description>${description}</description>
<tags>${tags.join(", ")}</tags>

Translate the scene into specific musical choices following the rules in your role. Output ONLY the music prompt as a single paragraph.`;

const stripQuotes = (text: string): string => {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
};

const buildFallbackPrompt = (
  title: string,
  description: string,
  tags: string[],
): string => {
  const themes = [title, ...tags.slice(0, 3)]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
  const sceneHint = description?.trim() ? ` Scene: ${description.trim()}.` : "";

  return [
    `Translate this children's coloring page scene into a bespoke instrumental background loop:${sceneHint}`,
    `Use playful felt piano, music box, glockenspiel, ukulele or pizzicato strings to evoke ${themes}.`,
    "Around 70 BPM, warm major key, joyful and curious but never frantic.",
    "Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.",
  ].join(" ");
};

const createMusicPromptViaClaude = async (
  title: string,
  description: string,
  tags: string[],
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: anthropic(CLAUDE_SONNET_4_5),
      system: MUSIC_PROMPT_SYSTEM,
      prompt: createMusicPromptUserPrompt(title, description, tags),
    });
    const cleaned = stripQuotes(text.trim());
    if (cleaned.length > 0) return cleaned;
  } catch (error) {
    console.warn(
      "[background-music] Claude prompt generation failed, using fallback:",
      error instanceof Error ? error.message : error,
    );
  }
  return buildFallbackPrompt(title, description, tags);
};

const generateAmbientMusic = async (prompt: string): Promise<Buffer> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: 90_000,
      force_instrumental: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `ElevenLabs music generation failed (${res.status}): ${err}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
};

export type GenerateBackgroundMusicResult =
  | { success: true; backgroundMusicUrl: string }
  | { success: false; error: string };

/**
 * Generate ambient music for a coloring image, upload to R2, write URL to
 * the DB. Idempotent — early-returns success if `backgroundMusicUrl` is
 * already set on the row.
 */
export const generateBackgroundMusicLocal = async (
  coloringImageId: string,
): Promise<GenerateBackgroundMusicResult> => {
  try {
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        backgroundMusicUrl: true,
      },
    });

    if (!coloringImage) {
      return { success: false, error: "Coloring image not found" };
    }

    if (coloringImage.backgroundMusicUrl) {
      return {
        success: true,
        backgroundMusicUrl: coloringImage.backgroundMusicUrl,
      };
    }

    const prompt = await createMusicPromptViaClaude(
      coloringImage.title ?? "",
      coloringImage.description ?? "",
      (coloringImage.tags as string[]) ?? [],
    );
    console.log(
      `[background-music] Generating for "${coloringImage.title}": ${prompt}`,
    );

    const audioBuffer = await generateAmbientMusic(prompt);

    const audioFileName = `uploads/coloring-images/${coloringImageId}/ambient.mp3`;
    const { url: backgroundMusicUrl } = await put(audioFileName, audioBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { backgroundMusicUrl },
    });

    console.log(
      `[background-music] Generated for "${coloringImage.title}": ${backgroundMusicUrl}`,
    );
    return { success: true, backgroundMusicUrl };
  } catch (error) {
    console.error("[background-music] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
