'use server';
/**
 * Comment-request gen entry point.
 *
 * Webhook → moderation gate decides this is safe → call this action to:
 *   1. INSERT a `coloring_images` row with status=GENERATING +
 *      generationType=COMMENT_REQUEST (so analytics + dedup don't conflate
 *      with user-initiated creates)
 *   2. POST the worker /jobs/coloring-image/start
 *
 * Deliberately skips everything `createPendingColoringImage` does for
 * logged-in users:
 *   - No userId / getUserId — commenter is anonymous to us beyond their
 *     IG handle
 *   - No credit debit/refund — comment-request is free, we eat the cost
 *   - No active profile — no per-profile difficulty modifier
 *   - No character resolution — commenter has no character roster
 *   - No CAPI Lead fire — they're not a tracked user yet
 *
 * Shares the same prompt-building + worker-dispatch primitives via
 * lib/coloring-worker.ts so the actual gen pipeline is identical to the
 * user-facing path.
 */
import { db, GenerationType, Brand } from '@one-colored-pixel/db';
import {
  type ImageQuality,
  resolveDefaultQuality,
} from '@one-colored-pixel/coloring-core/image-quality';
import { postToWorker, buildTextModeWorkerBody } from '@/lib/coloring-worker';
import { moderateVoiceText } from '@/lib/moderation';
import { findBlockedContent } from '@/lib/scene-generation';

const BRAND: Brand = 'CHUNKY_CRAYON';

export type CommentRequestGenArgs = {
  /** Extracted prompt from the comment, e.g. "a unicorn cake". 3-200 chars. */
  description: string;
  /** Locale to render the worker pipeline in. IG/FB don't tell us locale so
   *  default to 'en' at the call site. */
  locale: string;
  /** IG/FB username the result will be DM'd to. Stored on the row's
   *  sourcePrompt for traceability when debugging "who got this image". */
  requestedByUsername: string;
};

export type CommentRequestGenResult =
  | { ok: true; coloringImageId: string }
  | {
      ok: false;
      error: 'invalid_input' | 'moderation_blocked' | 'worker_unavailable';
      reason?: string;
    };

const MIN_PROMPT_LEN = 3;
const MAX_PROMPT_LEN = 200;

export const createColoringImageForCommentRequest = async (
  args: CommentRequestGenArgs,
): Promise<CommentRequestGenResult> => {
  const description = args.description.trim();
  if (
    description.length < MIN_PROMPT_LEN ||
    description.length > MAX_PROMPT_LEN
  ) {
    return { ok: false, error: 'invalid_input', reason: 'length' };
  }

  // Two-stage kid-safety gate. Blocklist is the fast deterministic pass;
  // moderateVoiceText is the LLM safety check (catches paraphrasing the
  // blocklist would miss). Webhook should have already run findBlockedContent
  // synchronously and routed borderline-but-not-blocked prompts to Slack —
  // we re-run both here as defence-in-depth so a bug upstream can't smuggle
  // an unsafe prompt into the gen pipeline.
  const blocked = findBlockedContent(description);
  if (blocked) {
    return {
      ok: false,
      error: 'moderation_blocked',
      reason: `blocklist:${blocked}`,
    };
  }
  const m = await moderateVoiceText(description);
  if (!m.ok) {
    return { ok: false, error: 'moderation_blocked', reason: m.code };
  }

  // Quality: medium. Comment-request is anonymous, no subscriber tier to
  // resolve, but 'low' gives bad-looking results and the cost difference
  // at our volume is trivial. resolveDefaultQuality({ isSubscriber: false })
  // returns 'low'; override to medium for this surface.
  const quality: ImageQuality = 'medium';
  void resolveDefaultQuality; // keep import — kept for future tier wiring

  let pendingRowId: string | null = null;
  try {
    const placeholder = description;
    const pending = await db.coloringImage.create({
      data: {
        title: placeholder,
        description: placeholder,
        alt: placeholder,
        tags: [],
        generationType: GenerationType.COMMENT_REQUEST,
        // sourcePrompt doubles as the audit trail of "who asked for this".
        // No PII beyond the public IG handle.
        sourcePrompt: `comment-request:${args.requestedByUsername}:${description}`,
        purposeKey: 'comment-request',
        brand: BRAND,
        status: 'GENERATING',
      },
      select: { id: true },
    });
    pendingRowId = pending.id;

    const workerBody = buildTextModeWorkerBody({
      coloringImageId: pending.id,
      description,
      locale: args.locale,
      brand: BRAND,
      quality,
      creditCost: 0, // comment-request is free; nothing to refund on FAILED
    });

    await postToWorker(workerBody);

    return { ok: true, coloringImageId: pending.id };
  } catch (err) {
    console.error('[createColoringImageForCommentRequest]', err);
    if (pendingRowId) {
      // Flip to FAILED so the stale-cleanup cron doesn't have to. No credit
      // refund needed (comment-request is free) and no user to notify here —
      // the caller (image-request handler) DMs the apology.
      await db.coloringImage
        .update({
          where: { id: pendingRowId },
          data: {
            status: 'FAILED',
            failureReason:
              err instanceof Error ? err.message.slice(0, 500) : 'unknown',
          },
        })
        .catch(() => {});
    }
    return {
      ok: false,
      error: 'worker_unavailable',
      reason: err instanceof Error ? err.message : 'unknown',
    };
  }
};
