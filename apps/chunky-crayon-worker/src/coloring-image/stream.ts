/**
 * Server-Sent Events handler for streaming coloring-image generation.
 *
 * Adapter only — owns no business logic. The Vercel side bakes the
 * prompt + collects style references + does auth + debits credits, then
 * proxies through here. This module:
 *
 *   1. Calls openai.images.edit({ stream: true, partial_images: 3 })
 *   2. Translates each OpenAI stream event into our SSE event shape
 *   3. Emits final base64 + lets the Vercel side do post-completion
 *      persist (SVG trace, R2 uploads, DB row, derived assets pipeline)
 *
 * Why minimal: keeps the worker dumb. When the web app's style block,
 * difficulty modifiers, profile handling, R2 layout, or DB schema change
 * we only redeploy Vercel, not the worker.
 *
 * SSE event shapes emitted by this module:
 *   - { type: 'partial', index: number, b64_json: string }
 *   - { type: 'image_completed', b64_json: string }
 *   - { type: 'error', message: string }
 *
 * Note: this module does NOT emit { type: 'final' } — that's the Vercel
 * proxy's job to emit *after* it has persisted the row and gathered the
 * coloringImageId. The worker has no visibility into the DB write.
 */
import OpenAI from "openai";
import type { SSEStreamingApi } from "hono/streaming";

export type StreamColoringImageInput = {
  /**
   * Fully-baked prompt the Vercel side built from the user's description
   * + style block + closed-contours instruction + difficulty modifier.
   * Worker passes through unchanged.
   */
  prompt: string;
  /**
   * Reference image URLs (R2-hosted style guides). Up to 4. Worker
   * fetches each as a File before calling images.edit.
   */
  referenceImageUrls: string[];
  /** Currently always 1024x1024 + high but kept overridable for future. */
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
  /**
   * Number of partial frames to request. OpenAI may emit fewer if
   * generation completes quickly. Cap is 3.
   */
  partialImages?: 0 | 1 | 2 | 3;
};

const fetchReferenceFiles = async (urls: string[]): Promise<File[]> => {
  return Promise.all(
    urls.map(async (url, i) => {
      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(`[stream] ref ${i} fetch failed: ${r.status} ${url}`);
      }
      const buf = await r.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([buf], `ref-${i}.${ext}`, { type: `image/${ext}` });
    }),
  );
};

const writeJsonEvent = async (
  stream: SSEStreamingApi,
  data: unknown,
  event?: string,
): Promise<void> => {
  await stream.writeSSE({
    event,
    data: JSON.stringify(data),
  });
};

/**
 * Run the streaming OpenAI call and pipe its events through the SSE stream.
 * Throws on errors — caller wraps in try/catch and emits an error SSE event.
 */
export const streamColoringImage = async (
  stream: SSEStreamingApi,
  input: StreamColoringImageInput,
): Promise<void> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set on worker");
  const client = new OpenAI({ apiKey });

  const refs = await fetchReferenceFiles(input.referenceImageUrls);

  // openai SDK 6 returns an async iterable when stream:true. Each event
  // is one of:
  //   ImageEditPartialImageEvent { type: 'image_edit.partial_image'; b64_json; partial_image_index }
  //   ImageEditCompletedEvent    { type: 'image_edit.completed';      b64_json }
  const oaiStream = await client.images.edit({
    model: "gpt-image-2",
    image: refs,
    prompt: input.prompt,
    size: input.size ?? "1024x1024",
    quality: input.quality ?? "high",
    stream: true,
    partial_images: input.partialImages ?? 3,
  });

  let partialsEmitted = 0;
  let completedSeen = false;

  for await (const event of oaiStream) {
    // The SDK union type is awkward to narrow without a discriminator switch;
    // we cast and check `type` manually since both variants share b64_json.
    const e = event as {
      type?: string;
      b64_json?: string;
      partial_image_index?: number;
    };

    if (
      e.type === "image_edit.partial_image" &&
      typeof e.b64_json === "string"
    ) {
      partialsEmitted += 1;
      const index = e.partial_image_index ?? partialsEmitted - 1;
      console.log(
        `[stream] partial ${index} emitted (${(e.b64_json.length / 1024).toFixed(0)}KB b64)`,
      );
      await writeJsonEvent(
        stream,
        { type: "partial", index, b64_json: e.b64_json },
        "partial",
      );
    } else if (
      e.type === "image_edit.completed" &&
      typeof e.b64_json === "string"
    ) {
      completedSeen = true;
      console.log(
        `[stream] image_completed emitted (${(e.b64_json.length / 1024).toFixed(0)}KB b64)`,
      );
      await writeJsonEvent(
        stream,
        { type: "image_completed", b64_json: e.b64_json },
        "image_completed",
      );
    } else {
      // Unknown event type — log but don't bail. Future OpenAI changes
      // shouldn't break the stream.
      console.warn(`[stream] unknown event type: ${e.type}`);
    }
  }

  if (!completedSeen) {
    throw new Error("[stream] OpenAI stream ended without image_completed");
  }
};
