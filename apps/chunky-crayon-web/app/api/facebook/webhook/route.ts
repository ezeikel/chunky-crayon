/**
 * Meta webhook receiver — IG comments + FB Page feed events.
 *
 * Two inbound flows feed our `social_comment_queue`:
 *
 *   1. `#drawthis ...` comments → image-request handler runs inline,
 *      moderates the prompt, kicks off the gen + posts an "on it ✨" reply.
 *
 *   2. Every other comment → queued for AI auto-reply, which the process
 *      cron picks up after a 2-5 min jitter (looks more natural).
 *
 * Meta calls this endpoint synchronously and expects a 200 within a few
 * seconds. The image-request flow can take 3-10s (moderation triad + gen
 * kickoff); we run it inline today because Vercel's 30s default is enough.
 * If volume grows, push handleImageRequest into a queued job triggered by
 * a separate cron.
 *
 * Always returns 200 OK to Meta — even on processing failure. Meta retries
 * non-200 responses aggressively, and a transient internal error
 * (DB hiccup, etc.) shouldn't trigger a retry storm.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import {
  fetchInstagramPostCaption,
  fetchFacebookPostMessage,
  fetchFacebookCommentDetails,
  INSTAGRAM_ACCOUNT_ID,
  FACEBOOK_PAGE_ID,
} from '@/lib/instagram-automation';
import {
  extractImageRequestPrompt,
  handleImageRequest,
} from '@/lib/image-request';
import * as log from '@/lib/logger';

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

// =============================================================================
// GET — subscription handshake (Meta calls this once when we register the URL)
// =============================================================================

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!VERIFY_TOKEN) {
    log.warn('Webhook verify token not configured', {
      action: 'facebook-webhook',
    });
    return new NextResponse('Webhook not configured', { status: 500 });
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    log.info('Webhook subscription verified', { action: 'facebook-webhook' });
    return new NextResponse(challenge, { status: 200 });
  }
  log.warn('Webhook verification failed', { action: 'facebook-webhook' });
  return new NextResponse('Verification failed', { status: 403 });
};

// =============================================================================
// Queue insert — common path for both #drawthis and AI-reply flows
// =============================================================================

type QueueArgs = {
  platform: 'INSTAGRAM' | 'FACEBOOK';
  commentId: string;
  postId: string;
  authorId: string;
  authorUsername: string | null;
  commentText: string;
  postCaption: string | null;
  isThreadReply?: boolean;
  parentCommentId?: string;
  parentCommentText?: string;
  /** When set, the row is for the #drawthis flow — commentType + the
   *  extracted prompt are stamped at insert time. */
  imageRequestPrompt?: string;
};

async function queueComment(args: QueueArgs): Promise<string | null> {
  // Jitter so we don't post replies a second after the user hit submit.
  // Image-request rows process immediately — the user is actively waiting
  // for the "on it" reply. Thread replies get longer jitter (looks more
  // natural for the AI-reply flow).
  let delayMs: number;
  if (args.imageRequestPrompt) {
    delayMs = 0;
  } else if (args.isThreadReply) {
    delayMs = (240 + Math.random() * 240) * 1000;
  } else {
    delayMs = (120 + Math.random() * 180) * 1000;
  }
  const processAfter = new Date(Date.now() + delayMs);

  try {
    const row = await db.socialCommentQueue.create({
      data: {
        platform: args.platform,
        commentId: args.commentId,
        postId: args.postId,
        authorId: args.authorId,
        authorUsername: args.authorUsername,
        commentText: args.commentText,
        postCaption: args.postCaption,
        isThreadReply: args.isThreadReply ?? false,
        parentCommentId: args.parentCommentId ?? null,
        parentCommentText: args.parentCommentText ?? null,
        processAfter,
        ...(args.imageRequestPrompt
          ? {
              commentType: 'IMAGE_REQUEST',
              extractedPrompt: args.imageRequestPrompt,
            }
          : {}),
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    // Unique constraint on commentId — Meta sometimes redelivers the same
    // event. Safe no-op.
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      log.info('Duplicate webhook ignored', {
        action: 'facebook-webhook',
        commentId: args.commentId,
      });
      return null;
    }
    log.error(
      'Queue insert failed',
      { action: 'facebook-webhook', commentId: args.commentId },
      err instanceof Error ? err : undefined,
    );
    return null;
  }
}

// =============================================================================
// POST — comment + feed events
// =============================================================================

export const POST = async (req: NextRequest) => {
  // No signature verification yet — Meta signs every body with X-Hub-Signature-256
  // and we should verify it, but PTP doesn't and rolling it out here uncovered
  // env-config friction we deferred. Re-add as a hardening pass; track in
  // the runbook. The webhook URL is not advertised so blast radius is low.

  let body: {
    object?: string;
    entry?: Array<{
      changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // Diagnostic — log the full payload so we can see what Meta is sending
  // and why we may have filtered it out. PTP does the same. Trim later.
  // eslint-disable-next-line no-console
  console.log(
    `[facebook-webhook] FULL BODY: ${JSON.stringify(body).slice(0, 2000)}`,
  );

  // Collect work then await all in parallel so the response can return
  // quickly. Each promise catches its own errors — one failed insert
  // shouldn't poison the others.
  const pending: Promise<unknown>[] = [];

  try {
    if (body.object === 'instagram') {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'comments') continue;

          const v = (change.value ?? {}) as {
            id?: string;
            text?: string;
            from?: { id?: string; username?: string };
            media?: { id?: string };
          };

          if (!v.id || !v.text || !v.from?.id || !v.media?.id) {
            continue;
          }
          if (v.from.id === INSTAGRAM_ACCOUNT_ID) {
            // our own reply — never queue
            continue;
          }

          const commentId = v.id;
          const commentText = v.text.trim();
          const authorId = v.from.id;
          const authorUsername = v.from.username ?? null;
          const mediaId = v.media.id;

          const imageRequestPrompt = extractImageRequestPrompt(commentText);

          pending.push(
            (async () => {
              const caption = await fetchInstagramPostCaption(mediaId);
              const rowId = await queueComment({
                platform: 'INSTAGRAM',
                commentId,
                postId: mediaId,
                authorId,
                authorUsername,
                commentText,
                postCaption: caption,
                imageRequestPrompt: imageRequestPrompt ?? undefined,
              });

              if (rowId && imageRequestPrompt) {
                await handleImageRequest({
                  queueRowId: rowId,
                  platform: 'INSTAGRAM',
                  commentId,
                  commenterUsername: authorUsername ?? 'there',
                  prompt: imageRequestPrompt,
                });
              }
            })().catch((err) => {
              log.error(
                'IG comment handling failed',
                { action: 'facebook-webhook', commentId },
                err instanceof Error ? err : undefined,
              );
            }),
          );
        }
      }
    }

    if (body.object === 'page') {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'feed') continue;

          const v = (change.value ?? {}) as {
            item?: string;
            verb?: string;
            comment_id?: string;
            message?: string;
            from?: { id?: string; name?: string };
            post_id?: string;
            parent_id?: string;
          };

          if (v.item !== 'comment' || v.verb !== 'add') continue;
          if (!v.comment_id || !v.message || !v.from?.id || !v.post_id) {
            continue;
          }
          if (v.from.id === FACEBOOK_PAGE_ID) continue;

          const commentId = v.comment_id;
          const commentText = v.message.trim();
          const authorId = v.from.id;
          const authorUsername = v.from.name ?? null;
          const postId = v.post_id;
          const parentId = v.parent_id;
          const isNestedReply = !!(parentId && parentId !== postId);

          const imageRequestPrompt = extractImageRequestPrompt(commentText);

          pending.push(
            (async () => {
              // For nested replies, only queue if the parent comment is
              // OUR comment (someone replying to our auto-reply).
              // Otherwise we'd be jumping into strangers' conversations.
              // Also caps thread exchanges at one per (post, user, 24h)
              // to stop infinite-reply loops.
              let threadCtx:
                | {
                    isThreadReply: true;
                    parentCommentId: string;
                    parentCommentText: string;
                  }
                | undefined;

              if (isNestedReply) {
                const parent = await fetchFacebookCommentDetails(parentId!);
                if (!parent || parent.fromId !== FACEBOOK_PAGE_ID) {
                  return; // parent isn't ours — ignore
                }

                const recent = await db.socialCommentQueue.findFirst({
                  where: {
                    postId,
                    authorId,
                    isThreadReply: true,
                    status: { in: ['REPLIED', 'LIKED', 'DM_SENT'] },
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                  },
                });
                if (recent) return; // loop prevention

                threadCtx = {
                  isThreadReply: true,
                  parentCommentId: parentId!,
                  parentCommentText: parent.message,
                };
              }

              const caption = await fetchFacebookPostMessage(postId);
              const rowId = await queueComment({
                platform: 'FACEBOOK',
                commentId,
                postId,
                authorId,
                authorUsername,
                commentText,
                postCaption: caption,
                imageRequestPrompt: imageRequestPrompt ?? undefined,
                ...threadCtx,
              });

              if (rowId && imageRequestPrompt) {
                await handleImageRequest({
                  queueRowId: rowId,
                  platform: 'FACEBOOK',
                  commentId,
                  commenterUsername: authorUsername ?? 'there',
                  prompt: imageRequestPrompt,
                });
              }
            })().catch((err) => {
              log.error(
                'FB comment handling failed',
                { action: 'facebook-webhook', commentId },
                err instanceof Error ? err : undefined,
              );
            }),
          );
        }
      }
    }

    if (pending.length > 0) {
      await Promise.allSettled(pending);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    // Surface the error to logs but still return 200 — Meta retries on
    // non-2xx and a transient error shouldn't trigger a retry storm.
    log.error(
      'Webhook handler threw',
      { action: 'facebook-webhook' },
      err instanceof Error ? err : undefined,
    );
    return new NextResponse('OK', { status: 200 });
  }
};
