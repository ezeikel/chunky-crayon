/**
 * Process queued social comments — every 2 minutes.
 *
 * Two flows the cron drives:
 *
 *   1. AI auto-reply: PENDING rows with no IMAGE_REQUEST type. Classify
 *      via Gemini Flash, generate reply via Sonnet 4.5, POST back to
 *      the comment via Graph API.
 *
 *   2. #drawthis image delivery: AWAITING_GENERATION rows. Poll the
 *      linked ColoringImage row's status. On READY, deliver via IG DM
 *      (image attachment + caption) or FB nested-reply (canonical URL).
 *      On FAILED, send polite sorry message.
 *
 * Both flows share the same retry semantics: 3 retries with 5min backoff,
 * then terminal FAILED. Rate-limit responses from Graph API (code 4 / 32)
 * pause the batch and reset processAfter +5min so we don't burn through
 * the queue against an angry rate limiter.
 *
 * Auth: CRON_SECRET bearer.
 */
import { NextRequest, NextResponse, connection } from 'next/server';
import { db, CommentQueueStatus } from '@one-colored-pixel/db';
import { generateCommentReply } from '@/lib/social-comment-reply';
import {
  replyToComment,
  replyToFacebookComment,
  likeComment,
  sendImageDM,
  sendTextDM,
} from '@/lib/instagram-automation';
import { pickImageDmCaption, buildFbLinkReply } from '@/lib/image-request';
import { getColoringImageCanonicalUrl } from '@/lib/seo/coloring-image-url';
import * as log from '@/lib/logger';

export const maxDuration = 300;

const BATCH_SIZE = parseInt(process.env.SOCIAL_COMMENT_BATCH_SIZE || '10', 10);

// Graph API rate-limit error codes worth treating as "stop the batch".
function isRateLimited(err: string | undefined): boolean {
  if (!err) return false;
  return err.includes('"code":4') || err.includes('"code":32');
}

// ============================================================================
// AI auto-reply branch
// ============================================================================

type QueueRow = Awaited<
  ReturnType<typeof db.socialCommentQueue.findMany>
>[number];

async function processAiReply(comment: QueueRow): Promise<{
  result: 'replied' | 'liked' | 'skipped' | 'failed' | 'rate_limited';
}> {
  const reply = await generateCommentReply({
    commentText: comment.commentText,
    postCaption: comment.postCaption,
    platform: comment.platform,
  });

  if (reply.skipped) {
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.SKIPPED,
        commentType: reply.commentType,
        processedAt: new Date(),
        errorMessage: reply.skipReason ?? null,
      },
    });
    return { result: 'skipped' };
  }

  // Post the reply. IG uses /replies, FB uses /comments.
  const replyResult =
    comment.platform === 'INSTAGRAM'
      ? await replyToComment(comment.commentId, reply.reply!)
      : await replyToFacebookComment(comment.commentId, reply.reply!);

  if (!replyResult.success && isRateLimited(replyResult.error)) {
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.PENDING,
        processAfter: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    return { result: 'rate_limited' };
  }

  if (!replyResult.success) {
    throw new Error(replyResult.error || 'reply post failed');
  }

  await db.socialCommentQueue.update({
    where: { id: comment.id },
    data: {
      status: CommentQueueStatus.REPLIED,
      commentType: reply.commentType,
      replyText: reply.reply,
      processedAt: new Date(),
    },
  });

  // Like the original comment too (best-effort, never fail the row over it).
  void likeComment(comment.commentId).then((res) => {
    if (res.success) {
      void db.socialCommentQueue
        .update({
          where: { id: comment.id },
          data: { liked: true },
        })
        .catch(() => {});
    }
  });

  return { result: 'replied' };
}

// ============================================================================
// #drawthis delivery branch
// ============================================================================
//
// AWAITING_GENERATION rows: poll the linked ColoringImage.status.
//   - GENERATING → not ready yet. Bump processAfter +60s and leave the
//     row's status as AWAITING_GENERATION.
//   - READY → IG: sendImageDM. FB: nested reply with canonical URL.
//   - FAILED → polite sorry message + terminal FAILED on the queue row.

async function processImageRequestDelivery(comment: QueueRow): Promise<{
  result: 'delivered' | 'not_ready' | 'sorry_sent' | 'rate_limited';
}> {
  if (!comment.coloringImageId) {
    // Shouldn't happen — handler always sets coloringImageId before
    // flipping to AWAITING_GENERATION. Treat as terminal failure.
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.FAILED,
        errorMessage: 'AWAITING_GENERATION row missing coloringImageId',
        processedAt: new Date(),
      },
    });
    return { result: 'sorry_sent' };
  }

  const img = await db.coloringImage.findUnique({
    where: { id: comment.coloringImageId },
    select: {
      id: true,
      url: true,
      status: true,
      slugBase: true,
      userId: true,
      showInCommunity: true,
    },
  });

  if (!img) {
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.FAILED,
        errorMessage: 'linked ColoringImage row not found',
        processedAt: new Date(),
      },
    });
    return { result: 'sorry_sent' };
  }

  if (img.status === 'GENERATING') {
    // Not ready yet. Push the next check out 60s. Worker has its own
    // 15-min stale-cleanup cron, so a stuck gen will eventually become
    // FAILED and we'll handle it on the next tick.
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: { processAfter: new Date(Date.now() + 60 * 1000) },
    });
    return { result: 'not_ready' };
  }

  if (img.status === 'FAILED') {
    // Sorry path. IG gets a DM; FB gets a reply (no DM channel).
    const sorryText =
      "Hey! Our drawing magic didn't quite work this time. Want to try another idea? 🌈";
    if (comment.platform === 'INSTAGRAM') {
      await sendTextDM(comment.authorId, sorryText);
    } else {
      await replyToFacebookComment(comment.commentId, sorryText);
    }
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.FAILED,
        errorMessage: 'linked ColoringImage FAILED',
        dmSent: true,
        processedAt: new Date(),
      },
    });
    return { result: 'sorry_sent' };
  }

  // status === 'READY' — deliver.
  if (!img.url) {
    // READY without a URL shouldn't happen but is theoretically possible
    // during a brief window after the worker flips status. Push out 60s.
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: { processAfter: new Date(Date.now() + 60 * 1000) },
    });
    return { result: 'not_ready' };
  }

  if (comment.platform === 'INSTAGRAM') {
    const dmResult = await sendImageDM(
      comment.authorId,
      img.url,
      pickImageDmCaption(),
    );

    if (!dmResult.success && isRateLimited(dmResult.error)) {
      await db.socialCommentQueue.update({
        where: { id: comment.id },
        data: { processAfter: new Date(Date.now() + 5 * 60 * 1000) },
      });
      return { result: 'rate_limited' };
    }
    if (!dmResult.success) {
      throw new Error(dmResult.error || 'image DM failed');
    }

    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: {
        status: CommentQueueStatus.DM_SENT,
        imageDmSent: true,
        dmSent: true,
        processedAt: new Date(),
      },
    });
    return { result: 'delivered' };
  }

  // FACEBOOK: post a nested reply on the original comment with the
  // canonical URL. CUID URL (comment-request rows aren't community/public).
  const canonical = getColoringImageCanonicalUrl(
    {
      id: img.id,
      slugBase: img.slugBase,
      userId: img.userId,
      showInCommunity: img.showInCommunity,
      status: img.status,
    },
    'en',
  );

  const replyResult = await replyToFacebookComment(
    comment.commentId,
    buildFbLinkReply(canonical),
  );

  if (!replyResult.success && isRateLimited(replyResult.error)) {
    await db.socialCommentQueue.update({
      where: { id: comment.id },
      data: { processAfter: new Date(Date.now() + 5 * 60 * 1000) },
    });
    return { result: 'rate_limited' };
  }
  if (!replyResult.success) {
    throw new Error(replyResult.error || 'FB link reply failed');
  }

  await db.socialCommentQueue.update({
    where: { id: comment.id },
    data: {
      status: CommentQueueStatus.DM_SENT, // reuse — "delivered" for both
      processedAt: new Date(),
    },
  });
  return { result: 'delivered' };
}

// ============================================================================
// Cron entry
// ============================================================================

async function processBatch(request: NextRequest): Promise<NextResponse> {
  await connection();
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const comments = await db.socialCommentQueue.findMany({
    where: {
      status: {
        in: [
          CommentQueueStatus.PENDING,
          CommentQueueStatus.AWAITING_GENERATION,
        ],
      },
      processAfter: { lte: now },
    },
    orderBy: { processAfter: 'asc' },
    take: BATCH_SIZE,
  });

  if (comments.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  log.info('Processing social comment batch', {
    action: 'cron-social-comments',
    count: comments.length,
  });

  let replied = 0;
  let liked = 0;
  let skipped = 0;
  let delivered = 0;
  let notReady = 0;
  let sorrySent = 0;
  let failed = 0;
  let rateLimited = false;

  for (const comment of comments) {
    if (rateLimited) break;

    try {
      // Mark as PROCESSING so a parallel cron tick doesn't double-process.
      // Only flip when starting actual work (not for AWAITING_GENERATION
      // polls — those stay in their own status so the next tick can
      // pick them up again).
      if (comment.status === CommentQueueStatus.PENDING) {
        await db.socialCommentQueue.update({
          where: { id: comment.id },
          data: { status: CommentQueueStatus.PROCESSING },
        });
      }

      const isImageRequest =
        comment.commentType === 'IMAGE_REQUEST' &&
        comment.status === CommentQueueStatus.AWAITING_GENERATION;

      const outcome = isImageRequest
        ? await processImageRequestDelivery(comment)
        : await processAiReply(
            // PROCESSING rows are mid-flight; pass through as-is. The
            // status update inside processAiReply terminates the row.
            { ...comment, status: CommentQueueStatus.PROCESSING },
          );

      if (outcome.result === 'rate_limited') {
        rateLimited = true;
        log.warn('Graph API rate-limited — pausing batch', {
          action: 'cron-social-comments',
          commentId: comment.commentId,
        });
        break;
      }

      if (outcome.result === 'replied') replied += 1;
      else if (outcome.result === 'liked') liked += 1;
      else if (outcome.result === 'skipped') skipped += 1;
      else if (outcome.result === 'delivered') delivered += 1;
      else if (outcome.result === 'not_ready') notReady += 1;
      else if (outcome.result === 'sorry_sent') sorrySent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(
        'Social comment processing failed',
        { action: 'cron-social-comments', commentId: comment.commentId },
        err instanceof Error ? err : undefined,
      );

      const newRetryCount = comment.retryCount + 1;
      await db.socialCommentQueue
        .update({
          where: { id: comment.id },
          data: {
            status:
              newRetryCount >= 3
                ? CommentQueueStatus.FAILED
                : CommentQueueStatus.PENDING,
            errorMessage: message.slice(0, 500),
            retryCount: newRetryCount,
            ...(newRetryCount < 3
              ? { processAfter: new Date(Date.now() + 5 * 60 * 1000) }
              : { processedAt: new Date() }),
          },
        })
        .catch(() => {});
      failed += 1;
    }
  }

  const summary = {
    processed: comments.length,
    replied,
    liked,
    skipped,
    delivered,
    notReady,
    sorrySent,
    failed,
    rateLimited,
  };
  log.info('Batch complete', {
    action: 'cron-social-comments',
    ...summary,
  });

  return NextResponse.json(summary);
}

export async function GET(request: NextRequest) {
  return processBatch(request);
}

export async function POST(request: NextRequest) {
  return processBatch(request);
}
