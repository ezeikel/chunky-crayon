/**
 * Colourise a line-art PNG into a flat-filled coloured PNG.
 *
 * Used by the region-store pipeline to produce one styled render per palette
 * variant, which is then sampled per region to decide colours. The model is
 * configurable so the dev region-store viewer can compare Gemini vs GPT
 * Image 2 on the same image and we can lock in whichever looks better.
 *
 * Two providers, two call shapes, one return contract (a PNG Buffer):
 *
 *   - "gemini": the AI SDK Google path, identical to the existing
 *     generate-colored-reference.ts call (generateText with
 *     responseModalities ['TEXT','IMAGE']). This is today's known-good
 *     `coloredReferenceUrl` model.
 *   - "gpt": OpenAI's images.edit with gpt-image-2, the same SDK pattern the
 *     backfill image generator uses.
 *
 * Both are passed the SAME prompt (built by createColourisePrompt) and the
 * SAME input PNG, so the only variable in the comparison is the model.
 */
import OpenAI from "openai";
import sharp from "sharp";
import { generateText } from "ai";
import { models, MODEL_IDS } from "../models";

export type ColorizeModel = "gemini" | "gpt";

export const DEFAULT_COLORIZE_MODEL: ColorizeModel = "gemini";

export type ColorizeResult =
  | { success: true; pngBuffer: Buffer }
  | { success: false; error: string };

/**
 * Mean chroma of the non-line, non-white pixels of a render, 0..~128.
 *
 * Render quality is the single point of failure for the whole region-palette
 * pipeline (the review loop proved a muddy/desaturated render → muddy region
 * colours, e.g. a green dinosaur sampled as grey "Slate"). A good flat
 * coloring render has healthy chroma; a washed-out / over-shaded one is grey.
 * We score it and retry the model call if it comes back muddy.
 *
 * Chroma here = mean Euclidean distance of (a*,b*) from neutral in a quick
 * Lab-ish space, approximated cheaply from RGB without a full conversion:
 * we use max(r,g,b)-min(r,g,b) (HSV-style chroma) which correlates well
 * enough with "is this image actually colourful" for a gate.
 */
async function meanChroma(pngBuffer: Buffer): Promise<number> {
  // Downsample hard — we only need a global statistic.
  const { data, info } = await sharp(pngBuffer)
    .resize(96, 96, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let n = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const p = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma <= 50) continue; // line art
    if (r >= 240 && g >= 240 && b >= 240) continue; // unfilled white
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    sum += chroma;
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

// A render below this mean chroma is "muddy" — desaturated/over-shaded —
// and worth re-rolling. Tuned from review-loop observations: clean flat
// coloring renders sit well above this; the grey-dinosaur failure was below.
const MIN_ACCEPTABLE_CHROMA = 28;
const MAX_COLORIZE_ATTEMPTS = 3;

/**
 * Colourise `lineArtPng` using `prompt` on the selected model, with a
 * render-quality gate: if the result is muddy/desaturated it's re-rolled
 * (up to MAX_COLORIZE_ATTEMPTS), and the most colourful attempt is kept.
 *
 * Returns a discriminated result rather than throwing — the region pipeline
 * runs four of these in parallel and one failing variant must not abort the
 * others.
 */
export async function colorizeLineArt(
  lineArtPng: Buffer,
  prompt: string,
  model: ColorizeModel = DEFAULT_COLORIZE_MODEL,
): Promise<ColorizeResult> {
  let best: { buf: Buffer; chroma: number } | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_COLORIZE_ATTEMPTS; attempt++) {
    try {
      const r =
        model === "gpt"
          ? await colorizeWithGpt(lineArtPng, prompt)
          : await colorizeWithGemini(lineArtPng, prompt);
      if (!r.success) {
        lastError = r.error;
        continue;
      }
      const chroma = await meanChroma(r.pngBuffer);
      if (!best || chroma > best.chroma) {
        best = { buf: r.pngBuffer, chroma };
      }
      if (chroma >= MIN_ACCEPTABLE_CHROMA) {
        return { success: true, pngBuffer: r.pngBuffer };
      }
      // muddy — log and re-roll (unless out of attempts)
      console.warn(
        `[colorize] ${model} attempt ${attempt}/${MAX_COLORIZE_ATTEMPTS} muddy (chroma ${chroma.toFixed(1)} < ${MIN_ACCEPTABLE_CHROMA}), re-rolling`,
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : `colorizeLineArt(${model}) threw`;
    }
  }

  // Out of attempts — return the most colourful one we got, if any.
  if (best) {
    console.warn(
      `[colorize] ${model} never cleared chroma gate; using best attempt (chroma ${best.chroma.toFixed(1)})`,
    );
    return { success: true, pngBuffer: best.buf };
  }
  return {
    success: false,
    error: lastError || `colorizeLineArt(${model}) failed`,
  };
}

async function colorizeWithGemini(
  lineArtPng: Buffer,
  prompt: string,
): Promise<ColorizeResult> {
  const { files } = await generateText({
    model: models.geminiImage,
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image",
            // AI SDK accepts a data URL or a Buffer here; Buffer keeps us
            // off a round-trip through R2 (we already have the bytes).
            image: lineArtPng,
            mediaType: "image/png",
          },
        ],
      },
    ],
  });

  const generatedImage = files?.find((file) =>
    file.mediaType?.startsWith("image/"),
  );
  if (!generatedImage?.base64) {
    return { success: false, error: "Gemini returned no image" };
  }
  return {
    success: true,
    pngBuffer: Buffer.from(generatedImage.base64, "base64"),
  };
}

async function colorizeWithGpt(
  lineArtPng: Buffer,
  prompt: string,
): Promise<ColorizeResult> {
  // new OpenAI() reads OPENAI_API_KEY from env — same as backfill/index.ts
  // and image-providers.ts. gpt-image-2 via images.edit treats the supplied
  // image as the thing to transform, which is exactly "colour this line art".
  const client = new OpenAI();
  const imageFile = new File([new Uint8Array(lineArtPng)], "line-art.png", {
    type: "image/png",
  });

  const result = await client.images.edit({
    model: MODEL_IDS.GPT_IMAGE_2,
    image: imageFile,
    prompt,
    size: "1024x1024",
    quality: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    return { success: false, error: "GPT Image 2 returned no image data" };
  }
  return { success: true, pngBuffer: Buffer.from(b64, "base64") };
}
