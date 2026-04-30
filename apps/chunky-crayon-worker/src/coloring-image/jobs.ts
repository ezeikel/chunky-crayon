/**
 * Detached OpenAI streaming jobs for the canvas-as-loader pipeline.
 *
 * Lifecycle:
 *   1. Vercel inserts a `coloring_images` row with status=GENERATING and
 *      POSTs /jobs/coloring-image/start with the row id + baked prompt.
 *   2. That endpoint calls `startColoringImageJob()` which returns
 *      immediately. The OpenAI stream runs in a detached promise so the
 *      HTTP request can close without killing generation. This is the
 *      whole point of moving the stream off the user's HTTP connection —
 *      refresh-survivable, tab-close-survivable.
 *   3. As partials arrive, we upload to R2 (`pending/{id}/partial-N.png`),
 *      UPDATE the row's `streamingPartialUrl` + `streamingProgress`, and
 *      `pg_notify('coloring_image_update', id)`. Any browser SSE listeners
 *      subscribed via the LISTEN endpoint pick that up and re-emit.
 *   4. On `image_completed`: persist the final image (sharp/potrace/QR/R2),
 *      UPDATE the row to status=READY, pg_notify, and kick off the
 *      derived-asset pipeline (region store, colored ref, ambient music)
 *      via the existing /generate/all endpoint internally.
 *   5. On error: UPDATE the row to status=FAILED with failureReason +
 *      pg_notify. Vercel cron also catches truly stuck rows after 15 min.
 *      Credit refund happens via the existing /api/internal callback once
 *      we wire that in P2.3.
 *
 * Why a single shared NOTIFY pg.Client (not one-per-job): pg_notify is
 * cheap and fire-and-forget; opening a connection per job would be wasteful
 * and brittle. We open one Client at module load, hold it forever, and
 * fire all notifies through it. If it errors, we lazily reconnect.
 */
import OpenAI from "openai";
import pg from "pg";
import { put } from "@one-colored-pixel/storage";
import { db, CreditTransactionType } from "@one-colored-pixel/db";
import { persistGeneratedColoringImage } from "./persist";
import { revalidateVercelCache } from "./revalidate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StartJobInput = {
  /** id of the existing GENERATING row inserted by Vercel. */
  coloringImageId: string;
  /** Fully-baked OpenAI prompt (Vercel side built style + closed-contours). */
  prompt: string;
  /** text/voice path: up to 4 R2 URLs of style reference images. */
  referenceImageUrls?: string[];
  /** photo path: kid's uploaded photo, base64. */
  imagesInline?: { b64: string; ext: "png" | "jpeg" | "webp" }[];
  /** Description for sourcePrompt + metadata (empty string for photo mode). */
  description: string;
  locale?: string;
  /** From row.brand — drives QR code utm_source URL in persist. */
  brand: "CHUNKY_CRAYON" | "COLORING_HABITAT";
  /** Vercel side already debited this many credits — worker refunds on FAILED. */
  creditCost: number;
  size?: "1024x1024";
  quality?: "high";
  partialImages?: 0 | 1 | 2 | 3;
};

type JobState = {
  abort: AbortController;
  startedAt: number;
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

// In-memory map of running jobs. Used for diagnostics + future cancellation.
// Single-worker assumption — if we ever scale to multiple workers, jobIds
// would need routing (sticky by row id), but that's not on the roadmap.
const activeJobs = new Map<string, JobState>();

// Single shared Postgres connection for NOTIFY. Lazy-initialised so module
// import doesn't fail in tests / during build. Reconnects on error.
let notifyClient: pg.Client | null = null;
let notifyClientReady: Promise<pg.Client> | null = null;

const getNotifyClient = async (): Promise<pg.Client> => {
  if (notifyClient) return notifyClient;
  if (notifyClientReady) return notifyClientReady;

  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) {
    throw new Error(
      "[jobs] DATABASE_URL_DIRECT not set — required for pg_notify",
    );
  }

  notifyClientReady = (async () => {
    const client = new pg.Client({ connectionString: url });
    client.on("error", (err) => {
      console.error("[jobs] notify client error, will reconnect:", err.message);
      notifyClient = null;
      notifyClientReady = null;
    });
    await client.connect();
    notifyClient = client;
    return client;
  })();

  return notifyClientReady;
};

const notifyRowUpdate = async (coloringImageId: string): Promise<void> => {
  try {
    const client = await getNotifyClient();
    // pg_notify with payload — subscribers get the row id and re-read.
    // Using parameterised query to avoid quoting nightmares.
    await client.query("SELECT pg_notify($1, $2)", [
      "coloring_image_update",
      coloringImageId,
    ]);
  } catch (err) {
    // NOTIFY failures shouldn't crash the job — the row is still updated,
    // and the SSE endpoint re-reads on every poll-attached notify, so a
    // missed notify just means the browser sees the next update instead.
    console.error("[jobs] pg_notify failed:", err);
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetchReferenceFiles = async (urls: string[]): Promise<File[]> =>
  Promise.all(
    urls.map(async (url, i) => {
      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(`[jobs] ref ${i} fetch failed: ${r.status} ${url}`);
      }
      const buf = await r.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([buf], `ref-${i}.${ext}`, { type: `image/${ext}` });
    }),
  );

const decodeInlineFiles = (
  inline: { b64: string; ext: "png" | "jpeg" | "webp" }[],
): File[] =>
  inline.map((entry, i) => {
    const buf = Buffer.from(entry.b64, "base64");
    return new File([new Uint8Array(buf)], `inline-${i}.${entry.ext}`, {
      type: `image/${entry.ext}`,
    });
  });

const uploadPartial = async (
  coloringImageId: string,
  index: number,
  b64: string,
): Promise<string> => {
  const buf = Buffer.from(b64, "base64");
  const pathname = `pending/${coloringImageId}/partial-${index}.png`;
  // allowOverwrite: partials are a moving target. Browsers fetch the
  // streamingPartialUrl with cache-busting query params on each notify.
  const { url } = await put(pathname, buf, {
    access: "public",
    contentType: "image/png",
    allowOverwrite: true,
  });
  return url;
};

// ---------------------------------------------------------------------------
// Derived-asset pipeline kickoff (region store + colored ref + ambient music)
// ---------------------------------------------------------------------------

const requestDerivedPipeline = (coloringImageId: string): void => {
  // Fire-and-forget fanout to the four existing pipeline endpoints. They
  // each write their own DB columns (regionMapUrl, fillPointsJson,
  // coloredReferenceUrl, backgroundMusicUrl). No `/generate/all` exists
  // on the worker — we just kick all four in parallel like the legacy
  // Vercel `requestAllPipelineFromWorker` did.
  //
  // Routed via localhost so they share the worker's own resources +
  // logging path. No await — these can take 60-90s and we don't block
  // the job's READY transition on them; the row already has the line
  // art at that point.
  const port = process.env.PORT ?? "3030";
  const secret = process.env.WORKER_SECRET;
  const headers = {
    "Content-Type": "application/json",
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
  const body = JSON.stringify({ imageId: coloringImageId });

  const endpoints = [
    "region-store",
    "fill-points",
    "colored-reference",
    "background-music",
  ];

  for (const ep of endpoints) {
    void fetch(`http://localhost:${port}/generate/${ep}`, {
      method: "POST",
      headers,
      body,
    }).catch((err) => {
      console.error(
        `[jobs] /generate/${ep} kickoff failed for ${coloringImageId}:`,
        err,
      );
    });
  }
};

// ---------------------------------------------------------------------------
// Failure path — UPDATE row + refund credits + notify.
// ---------------------------------------------------------------------------

/**
 * Mark a row failed AND refund credits in the same path.
 *
 * Why the worker does the refund (instead of an HTTP callback to Vercel):
 *   - Worker already has full Prisma access (it just wrote `status: FAILED`)
 *   - HTTP callback adds a failure mode (refund-callback flake → user
 *     loses credits) that this avoids entirely.
 *   - Auth boundary is identical: worker holds DATABASE_URL, anything that
 *     can write the row could also refund.
 *
 * Idempotency: refunds are gated on the row not already being FAILED. If
 * markFailed is called twice on the same row (shouldn't happen but defensive
 * coding), only the first one refunds.
 */
const markFailed = async (
  coloringImageId: string,
  reason: string,
  creditCost: number,
): Promise<void> => {
  console.error(`[jobs] ${coloringImageId} FAILED: ${reason}`);
  try {
    // Atomic-ish: only update if not already FAILED. We use a conditional
    // updateMany to get count back so the refund decision is gated on a
    // single row actually transitioning here.
    const result = await db.coloringImage.updateMany({
      where: { id: coloringImageId, status: { not: "FAILED" } },
      data: {
        status: "FAILED",
        failureReason: reason.slice(0, 500),
      },
    });

    // If the row was already FAILED, don't double-refund.
    if (result.count === 0) {
      console.warn(
        `[jobs] markFailed: ${coloringImageId} already FAILED — skipping refund`,
      );
      return;
    }

    if (creditCost > 0) {
      const row = await db.coloringImage.findUnique({
        where: { id: coloringImageId },
        select: { userId: true },
      });
      if (row?.userId) {
        await db.user.update({
          where: { id: row.userId },
          data: { credits: { increment: creditCost } },
        });
        await db.creditTransaction.create({
          data: {
            userId: row.userId,
            amount: creditCost,
            type: CreditTransactionType.GENERATION,
          },
        });
        console.log(
          `[jobs] ${coloringImageId} refunded ${creditCost} credits to ${row.userId}`,
        );
      }
    }

    await notifyRowUpdate(coloringImageId);
  } catch (err) {
    console.error("[jobs] markFailed: row update / refund failed:", err);
  }
};

// ---------------------------------------------------------------------------
// Main job runner
// ---------------------------------------------------------------------------

const runJob = async (input: StartJobInput): Promise<void> => {
  const { coloringImageId } = input;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await markFailed(
      coloringImageId,
      "OPENAI_API_KEY not set on worker",
      input.creditCost,
    );
    return;
  }

  const client = new OpenAI({ apiKey });

  // Resolve image inputs.
  let imageFiles: File[];
  try {
    if (input.imagesInline && input.imagesInline.length > 0) {
      imageFiles = decodeInlineFiles(input.imagesInline);
    } else if (
      input.referenceImageUrls &&
      input.referenceImageUrls.length > 0
    ) {
      imageFiles = await fetchReferenceFiles(input.referenceImageUrls);
    } else {
      await markFailed(
        coloringImageId,
        "neither imagesInline nor referenceImageUrls provided",
        input.creditCost,
      );
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(
      coloringImageId,
      `input image resolution: ${message}`,
      input.creditCost,
    );
    return;
  }

  // Stamp workerJobId early so debug tooling can correlate. The id is
  // just our row id — same scope, but the field exists for a future
  // multi-worker world where job ids might diverge from row ids.
  await db.coloringImage.update({
    where: { id: coloringImageId },
    data: { workerJobId: coloringImageId, streamingProgress: 0 },
  });

  let oaiStream;
  try {
    oaiStream = await client.images.edit({
      model: "gpt-image-2",
      image: imageFiles,
      prompt: input.prompt,
      size: input.size ?? "1024x1024",
      quality: input.quality ?? "high",
      stream: true,
      partial_images: input.partialImages ?? 3,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(
      coloringImageId,
      `images.edit open: ${message}`,
      input.creditCost,
    );
    return;
  }

  let completedB64: string | null = null;

  try {
    for await (const event of oaiStream) {
      const e = event as {
        type?: string;
        b64_json?: string;
        partial_image_index?: number;
      };

      if (
        e.type === "image_edit.partial_image" &&
        typeof e.b64_json === "string"
      ) {
        const index = e.partial_image_index ?? 0;
        try {
          const partialUrl = await uploadPartial(
            coloringImageId,
            index,
            e.b64_json,
          );
          await db.coloringImage.update({
            where: { id: coloringImageId },
            data: {
              streamingPartialUrl: partialUrl,
              streamingProgress: index + 1,
            },
          });
          await notifyRowUpdate(coloringImageId);
          console.log(
            `[jobs] ${coloringImageId} partial ${index} (${(e.b64_json.length / 1024).toFixed(0)}KB) → ${partialUrl}`,
          );
        } catch (partialErr) {
          // Partial upload failure is non-fatal: log and continue. The
          // important thing is that completed lands successfully.
          console.error(
            `[jobs] ${coloringImageId} partial ${index} upload failed:`,
            partialErr,
          );
        }
      } else if (
        e.type === "image_edit.completed" &&
        typeof e.b64_json === "string"
      ) {
        completedB64 = e.b64_json;
        console.log(
          `[jobs] ${coloringImageId} image_completed (${(e.b64_json.length / 1024).toFixed(0)}KB)`,
        );
      } else {
        console.warn(`[jobs] ${coloringImageId} unknown event type: ${e.type}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(coloringImageId, `stream: ${message}`, input.creditCost);
    return;
  }

  if (!completedB64) {
    await markFailed(
      coloringImageId,
      "OpenAI stream ended without image_completed",
      input.creditCost,
    );
    return;
  }

  // Persist (metadata + trace + WebP + R2 + DB UPDATE → READY).
  try {
    await persistGeneratedColoringImage({
      coloringImageId,
      imageBuffer: Buffer.from(completedB64, "base64"),
      description: input.description,
      locale: input.locale,
      brand: input.brand,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markFailed(coloringImageId, `persist: ${message}`, input.creditCost);
    return;
  }

  // Vercel cache invalidation MUST happen before the pg_notify. Otherwise
  // the client's SSE listener gets the "READY" notify, fires
  // router.refresh(), re-fetches the page, and Vercel serves the stale
  // pre-persist snapshot — user sees a blank canvas until they manually
  // reload. Awaiting here adds ~50-200ms before the notify but keeps
  // the cache and the row in sync from the client's POV.
  await revalidateVercelCache(coloringImageId, "jobs");
  await notifyRowUpdate(coloringImageId);

  // Kick off derived-asset pipeline. Doesn't block READY — the row already
  // has line art + svg, so the canvas page can render immediately. Region
  // store etc. land as separate notifies a minute or two later.
  requestDerivedPipeline(coloringImageId);
};

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Kick off a coloring-image generation. Returns immediately — the actual
 * stream + persist runs detached in `runJob`. Caller (the /jobs/start
 * endpoint) returns 202 to Vercel; Vercel returns the row id to the
 * browser, which navigates to /coloring-image/[id] and subscribes to
 * SSE for real-time updates.
 */
export const startColoringImageJob = (input: StartJobInput): void => {
  if (activeJobs.has(input.coloringImageId)) {
    console.warn(
      `[jobs] ${input.coloringImageId} already running — ignoring duplicate start`,
    );
    return;
  }

  const abort = new AbortController();
  activeJobs.set(input.coloringImageId, {
    abort,
    startedAt: Date.now(),
  });

  // Detached: the HTTP request returns 202 and closes; the job keeps
  // running. void+catch keeps it from triggering an unhandledRejection.
  void runJob(input)
    .catch((err) => {
      console.error(`[jobs] ${input.coloringImageId} unexpected error:`, err);
      void markFailed(
        input.coloringImageId,
        err instanceof Error ? err.message : String(err),
        input.creditCost,
      );
    })
    .finally(() => {
      activeJobs.delete(input.coloringImageId);
    });
};

/** Diagnostics — used by status endpoints / future cancel. */
export const getActiveJobIds = (): string[] => Array.from(activeJobs.keys());
