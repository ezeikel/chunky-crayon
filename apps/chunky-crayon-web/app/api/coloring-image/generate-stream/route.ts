/**
 * Vercel-side SSE proxy for streaming coloring-image generation.
 *
 * Owns: auth, credit debit/refund, prompt baking, post-completion
 * persistence (DB row, R2 uploads, derived-asset pipeline kickoff).
 *
 * Delegates to: Hetzner worker `/generate/coloring-image-stream` for the
 * actual OpenAI streaming call. Worker returns SSE events; we pipe most
 * through unchanged, intercept `image_completed` to do the persist, and
 * emit our own `final` event with the new coloringImageId so the client
 * can navigate.
 *
 * SSE event shapes emitted to the browser:
 *   event: partial          data: { type: 'partial', index, b64_json }
 *   event: final            data: { type: 'final', coloringImageId, url, svgUrl }
 *   event: error            data: { type: 'error', message }
 *
 * IMPORTANT: this route runs on the Node runtime (not Edge) because:
 *   - sharp + traceImage require Node APIs
 *   - the persist pipeline writes to Prisma (Edge can use HTTP driver but
 *     all our other actions run Node)
 */
import { NextResponse } from 'next/server';
import {
  db,
  GenerationType,
  CreditTransactionType,
} from '@one-colored-pixel/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { trackWithUser } from '@/utils/analytics-server';
import { REFERENCE_IMAGES, prompts } from '@/lib/ai';
import { persistGeneratedColoringImage } from '@/lib/coloring-image/persist';
import { requestAllPipelineFromWorker } from '@/lib/worker';

// runtime defaults to 'nodejs' on Next 16; declaring it explicitly is
// rejected when cacheComponents is enabled (which it is on CC). We need
// node anyway for sharp + traceImage + Prisma writes in the persist
// pipeline — leaving the runtime implicit is the right call.
export const maxDuration = 300; // Vercel max; gen + stream can run ~3-4min

// Per-mode credit costs. Voice runs richer pipelines (Deepgram + Claude
// follow-up + ElevenLabs), so it's gated higher than text/photo.
const CREDIT_COST: Record<'text' | 'photo' | 'voice', number> = {
  text: 5,
  photo: 5,
  voice: 10,
};

// ---------------------------------------------------------------------------
// SSE writer
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

const writeSSE = (
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
): void => {
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(line));
};

// ---------------------------------------------------------------------------
// Worker SSE consumer
// ---------------------------------------------------------------------------

type WorkerEvent =
  | { type: 'partial'; index: number; b64_json: string }
  | { type: 'image_completed'; b64_json: string }
  | { type: 'error'; message: string };

/**
 * Read the worker's SSE response body and yield parsed events. The worker
 * emits one event per `event: ... \n data: ... \n\n` block; we parse those
 * back into typed JSON.
 */
async function* readWorkerEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<WorkerEvent, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by a blank line. Split-and-yield pattern.
    let blankLineIdx;
    while ((blankLineIdx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, blankLineIdx);
      buffer = buffer.slice(blankLineIdx + 2);

      // Each block has lines starting with `event:` and `data:`. Only data
      // is required for our purposes; event prefix is informational.
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('data:')) {
          dataLine += line.slice(5).trimStart();
        }
      }
      if (!dataLine) continue;
      try {
        const parsed = JSON.parse(dataLine) as WorkerEvent;
        yield parsed;
      } catch (err) {
        console.warn('[generate-stream] failed to parse worker event:', err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Credit helpers
// ---------------------------------------------------------------------------

const debitCredits = async (userId: string, amount: number): Promise<void> => {
  await db.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });
  await db.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: CreditTransactionType.GENERATION,
    },
  });
};

const refundCredits = async (userId: string, amount: number): Promise<void> => {
  await db.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });
  await db.creditTransaction.create({
    data: {
      userId,
      amount,
      // Reuse the same enum — record-keeping shows the +N debit reversal
      // alongside the -N debit. CreditTransactionType.REFUND would be
      // cleaner but would require a schema migration; using GENERATION
      // with a positive amount is unambiguous given the sign.
      type: CreditTransactionType.GENERATION,
    },
  });
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

type StreamBody = {
  /** Selects which input pipeline runs upstream of the OpenAI call. */
  mode?: 'text' | 'photo' | 'voice';
  /** text + voice: the kid's typed/spoken description. */
  description?: string;
  /** photo: base64 of the kid's uploaded photo. Mutually exclusive with
   *  description; we pass the photo to images.edit and rely on
   *  PHOTO_TO_COLORING_SYSTEM to convert it. */
  photoBase64?: string;
  /** voice: the two-turn answers the user gave to Q1/Q2. We concatenate
   *  them into the description used by the prompt. */
  firstAnswer?: string;
  secondAnswer?: string;
  locale?: string;
  clientDistinctId?: string;
};

export const POST = async (request: Request) => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as StreamBody;
  const mode: 'text' | 'photo' | 'voice' = body.mode ?? 'text';

  // Per-mode body validation. Builds the description string up-front so
  // the rest of the handler can stay generic.
  let description: string;
  if (mode === 'text') {
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'description required for text mode' },
        { status: 400 },
      );
    }
    description = body.description.trim();
  } else if (mode === 'voice') {
    const a1 = body.firstAnswer?.trim() ?? '';
    const a2 = body.secondAnswer?.trim() ?? '';
    if (!a1 || !a2) {
      return NextResponse.json(
        { error: 'firstAnswer + secondAnswer required for voice mode' },
        { status: 400 },
      );
    }
    description = `${a1} ${a2}`.trim();
  } else {
    if (!body.photoBase64 || typeof body.photoBase64 !== 'string') {
      return NextResponse.json(
        { error: 'photoBase64 required for photo mode' },
        { status: 400 },
      );
    }
    description = ''; // photo mode has no kid-typed description
  }

  const creditCost = CREDIT_COST[mode];

  // Pre-flight credit check.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user || user.credits < creditCost) {
    return NextResponse.json(
      { error: 'insufficient_credits', credits: user?.credits ?? 0 },
      { status: 402 },
    );
  }

  const activeProfile = await getActiveProfile();

  // Build the fully-baked prompt + image inputs based on mode.
  let workerBody: {
    prompt: string;
    referenceImageUrls?: string[];
    imagesInline?: { b64: string; ext: 'png' | 'jpeg' | 'webp' }[];
    size: '1024x1024';
    quality: 'high';
    partialImages: 3;
  };

  if (mode === 'photo') {
    // Photo path: NO style refs (they cause cartoon drift on photos).
    // The photo IS the input image. Prompt is the photo-to-coloring
    // system+user prompt with optional difficulty modifier.
    const photoPrompt = `${prompts.PHOTO_TO_COLORING_SYSTEM}\n\n${prompts.createPhotoToColoringPrompt(
      activeProfile?.difficulty && activeProfile.difficulty !== 'BEGINNER'
        ? activeProfile.difficulty
        : undefined,
    )}`;

    // Strip any data URL prefix and detect the file extension for the
    // worker. Browsers tend to upload as image/jpeg or image/png; we
    // don't accept HEIC etc on the client so this stays simple.
    const raw = body.photoBase64!.replace(/^data:image\/(\w+);base64,/, '');
    const extMatch = body.photoBase64!.match(/^data:image\/(\w+);base64,/);
    const ext = (extMatch?.[1] ?? 'png') as 'png' | 'jpeg' | 'webp';

    workerBody = {
      prompt: photoPrompt,
      imagesInline: [{ b64: raw, ext }],
      size: '1024x1024',
      quality: 'high',
      partialImages: 3,
    };
  } else {
    // Text + voice paths: build the prompt the same way (concatenated
    // description + style block + closed-contours), use shared style
    // reference images.
    const corePrompt =
      activeProfile?.difficulty && activeProfile.difficulty !== 'BEGINNER'
        ? prompts.createDifficultyAwarePrompt(
            description,
            activeProfile.difficulty,
          )
        : prompts.createColoringImagePrompt(description);
    const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${corePrompt}`;

    workerBody = {
      prompt: styledPrompt,
      referenceImageUrls: REFERENCE_IMAGES.slice(0, 4),
      size: '1024x1024',
      quality: 'high',
      partialImages: 3,
    };
  }

  // Debit credits BEFORE the long stream so concurrent requests can't
  // race to exhaust a balance. We refund on stream failure below.
  await debitCredits(userId, creditCost);

  const startedAt = Date.now();

  // ---------------------------------------------------------------------
  // Open the SSE response back to the browser. The ReadableStream's start
  // callback owns: opening the worker stream, piping events through, and
  // running the post-completion persist on image_completed.
  // ---------------------------------------------------------------------
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let creditsRefunded = false;
      const refundOnce = async (reason: string) => {
        if (creditsRefunded) return;
        creditsRefunded = true;
        try {
          await refundCredits(userId, creditCost);
          console.log(
            `[generate-stream] refunded ${creditCost} credits to ${userId} (${reason})`,
          );
        } catch (err) {
          console.error('[generate-stream] credit refund failed:', err);
        }
      };

      try {
        const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;
        if (!workerUrl) throw new Error('CHUNKY_CRAYON_WORKER_URL not set');

        const workerResp = await fetch(
          `${workerUrl}/generate/coloring-image-stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(workerSecret
                ? { Authorization: `Bearer ${workerSecret}` }
                : {}),
            },
            body: JSON.stringify(workerBody),
          },
        );

        if (!workerResp.ok || !workerResp.body) {
          const text = await workerResp.text().catch(() => '');
          throw new Error(
            `worker stream open failed: ${workerResp.status} ${text.slice(0, 300)}`,
          );
        }

        // Pump events from worker -> browser.
        for await (const evt of readWorkerEvents(workerResp.body)) {
          if (evt.type === 'partial') {
            // Pass through verbatim — client renders the partial img.
            writeSSE(controller, 'partial', evt);
            continue;
          }

          if (evt.type === 'error') {
            // Worker reported an error mid-stream. Refund and re-emit.
            await refundOnce('worker_error');
            writeSSE(controller, 'error', evt);
            controller.close();
            return;
          }

          if (evt.type === 'image_completed') {
            // The big one — decode, persist, emit our final event.
            const imageBuffer = Buffer.from(evt.b64_json, 'base64');

            try {
              const persisted = await persistGeneratedColoringImage({
                imageBuffer,
                // For photo mode there's no kid description to thread through
                // as sourcePrompt; persist accepts an empty string and won't
                // populate sourcePrompt in that case.
                description,
                userId,
                profileId: activeProfile?.id ?? undefined,
                generationType: GenerationType.USER,
                locale: body.locale ?? 'en',
                clientDistinctId: body.clientDistinctId,
                // purposeKey splits voice-sourced rows from text/image so
                // analytics + admin filters can isolate them. Matches the
                // legacy createColoringImageFromVoiceConversation behavior.
                purposeKey: mode === 'voice' ? 'voice' : undefined,
              });

              // Fire derived-asset pipeline (region store, colored ref,
              // ambient music). Same pattern as the existing action —
              // await acks so we don't drop them under Vercel CPU
              // contention; total ~200-400ms.
              if (persisted.url && persisted.svgUrl) {
                await requestAllPipelineFromWorker(persisted.id);
              }

              writeSSE(controller, 'final', {
                type: 'final',
                coloringImageId: persisted.id,
                url: persisted.url,
                svgUrl: persisted.svgUrl,
              });

              const durationMs = Date.now() - startedAt;
              await trackWithUser(userId, TRACKING_EVENTS.CREATION_COMPLETED, {
                coloringImageId: persisted.id,
                description,
                durationMs,
                creditsUsed: creditCost,
              });

              controller.close();
              return;
            } catch (persistErr) {
              await refundOnce('persist_failed');
              const message =
                persistErr instanceof Error
                  ? persistErr.message
                  : String(persistErr);
              console.error('[generate-stream] persist failed:', message);
              writeSSE(controller, 'error', {
                type: 'error',
                message: 'Saving the coloring page failed. Please try again.',
              });
              controller.close();
              return;
            }
          }
        }

        // Stream ended without image_completed — error case.
        await refundOnce('stream_no_completion');
        writeSSE(controller, 'error', {
          type: 'error',
          message: 'Image generation ended without completing.',
        });
        controller.close();
      } catch (err) {
        await refundOnce('exception');
        const message = err instanceof Error ? err.message : String(err);
        console.error('[generate-stream] fatal:', message);
        writeSSE(controller, 'error', { type: 'error', message });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      // Browser disconnected. We've already debited credits but haven't
      // yet detected the close — refund only happens via the start() path
      // above. There's a small risk of leaking 5 credits if the user
      // closes the tab mid-stream AFTER persist has started. Acceptable
      // for now; the persist completes in the background.
      console.log('[generate-stream] client cancelled');
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      // Disable Vercel/proxy buffering so partial events stream live.
      'X-Accel-Buffering': 'no',
    },
  });
};
