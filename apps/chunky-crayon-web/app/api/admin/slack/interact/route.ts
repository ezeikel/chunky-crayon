/**
 * Slack interactivity endpoint — handles Approve / Reject button taps on
 * borderline #drawthis moderation messages.
 *
 * Slack POSTs `application/x-www-form-urlencoded` with a `payload` field
 * containing the actual interaction JSON. We verify the signature against
 * the raw body BEFORE parsing (per Slack's recommendation — even a
 * single-byte change invalidates the signature).
 *
 * Response timing: Slack requires a 200 within 3 seconds. We respond
 * immediately and run the actual work in the background via `void`.
 * Errors in the background work surface in logs only — Slack won't see
 * them.
 *
 * Action ID format: `cc:image-request:<approve|reject>:<queueRowId>`
 *   - The `cc:` prefix lets PTP / AM share the same dispatch endpoint
 *     later without ambiguity.
 *   - Unknown prefixes 200-OK silently (don't leak feature flags).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, CommentQueueStatus } from '@one-colored-pixel/db';
import {
  verifySlackSignature,
  updateMessage,
  buildDecidedMessage,
} from '@/lib/slack';
import { createColoringImageForCommentRequest } from '@/app/actions/createColoringImageForCommentRequest';
import {
  replyToComment,
  replyToFacebookComment,
} from '@/lib/instagram-automation';
import * as log from '@/lib/logger';

const SORRY_REPLY =
  "We couldn't draw that one — try something simpler next time 💛";

type SlackInteractionPayload = {
  type: string;
  user: { id: string; username?: string; name?: string };
  actions: Array<{
    action_id: string;
    value: string;
  }>;
  response_url?: string;
};

async function handleApprove(
  queueRowId: string,
  decidedBy: string,
): Promise<void> {
  const row = await db.socialCommentQueue.findUnique({
    where: { id: queueRowId },
  });
  if (!row) {
    log.warn('Approve fired for missing row', {
      action: 'slack-interact',
      queueRowId,
    });
    return;
  }
  if (
    row.status === CommentQueueStatus.AWAITING_GENERATION ||
    row.status === CommentQueueStatus.DM_SENT
  ) {
    log.info('Approve fired but row already past PENDING — no-op', {
      action: 'slack-interact',
      queueRowId,
      status: row.status,
    });
    return;
  }
  if (!row.extractedPrompt) {
    log.warn('Approve fired on row with no extractedPrompt', {
      action: 'slack-interact',
      queueRowId,
    });
    return;
  }

  const gen = await createColoringImageForCommentRequest({
    description: row.extractedPrompt,
    locale: 'en',
    requestedByUsername: row.authorUsername ?? row.authorId,
  });

  if (!gen.ok) {
    log.error('Approve gen kickoff failed', {
      action: 'slack-interact',
      queueRowId,
      error: gen.error,
      reason: gen.reason,
    });
    await db.socialCommentQueue.update({
      where: { id: queueRowId },
      data: {
        status: CommentQueueStatus.FAILED,
        errorMessage: `approve-gen:${gen.error}:${gen.reason ?? ''}`,
        processedAt: new Date(),
      },
    });
    return;
  }

  await db.socialCommentQueue.update({
    where: { id: queueRowId },
    data: {
      status: CommentQueueStatus.AWAITING_GENERATION,
      coloringImageId: gen.coloringImageId,
    },
  });

  // Update the Slack message in place so the queue stays clean.
  if (row.slackChannelId && row.slackMessageTs) {
    await updateMessage({
      channel: row.slackChannelId,
      ts: row.slackMessageTs,
      ...buildDecidedMessage({
        decision: 'approve',
        decidedBy,
        prompt: row.extractedPrompt,
        commenterUsername: row.authorUsername ?? row.authorId,
      }),
    });
  }
}

async function handleReject(
  queueRowId: string,
  decidedBy: string,
): Promise<void> {
  const row = await db.socialCommentQueue.findUnique({
    where: { id: queueRowId },
  });
  if (!row) return;
  if (row.status !== CommentQueueStatus.PENDING) {
    log.info('Reject fired on non-PENDING row — no-op', {
      action: 'slack-interact',
      queueRowId,
      status: row.status,
    });
    return;
  }

  // Polite public reply on the original comment. We deliberately do NOT
  // also send a Private Reply DM here — Private Replies are capped at one
  // per comment and we reserve that single shot for the success path.
  // A public "couldn't make that" reply is enough for a rejection.
  await Promise.allSettled([
    row.platform === 'INSTAGRAM'
      ? replyToComment(row.commentId, SORRY_REPLY)
      : replyToFacebookComment(row.commentId, SORRY_REPLY),
    db.socialCommentQueue.update({
      where: { id: queueRowId },
      data: {
        status: CommentQueueStatus.SKIPPED,
        errorMessage: `rejected-by:${decidedBy}`,
        processedAt: new Date(),
      },
    }),
  ]);

  if (row.slackChannelId && row.slackMessageTs && row.extractedPrompt) {
    await updateMessage({
      channel: row.slackChannelId,
      ts: row.slackMessageTs,
      ...buildDecidedMessage({
        decision: 'reject',
        decidedBy,
        prompt: row.extractedPrompt,
        commenterUsername: row.authorUsername ?? row.authorId,
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (
    !verifySlackSignature({
      rawBody,
      signature: req.headers.get('x-slack-signature'),
      timestamp: req.headers.get('x-slack-request-timestamp'),
    })
  ) {
    log.warn('Slack signature verification failed', {
      action: 'slack-interact',
    });
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // Slack interactivity payloads are form-encoded with the JSON in `payload`.
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) {
    return new NextResponse('OK', { status: 200 });
  }

  let payload: SlackInteractionPayload;
  try {
    payload = JSON.parse(payloadStr) as SlackInteractionPayload;
  } catch {
    return new NextResponse('OK', { status: 200 });
  }

  if (payload.type !== 'block_actions' || !payload.actions?.length) {
    return new NextResponse('OK', { status: 200 });
  }

  const action = payload.actions[0];
  const parts = action.action_id.split(':');
  // Expected: ['cc', 'image-request', '<approve|reject>', queueRowId]
  if (parts.length !== 4 || parts[0] !== 'cc' || parts[1] !== 'image-request') {
    return new NextResponse('OK', { status: 200 });
  }
  const verb = parts[2];
  const queueRowId = parts[3];
  const decidedBy =
    payload.user.username ?? payload.user.name ?? payload.user.id;

  // Background the work — Slack needs a 200 within 3s.
  void (async () => {
    try {
      if (verb === 'approve') {
        await handleApprove(queueRowId, decidedBy);
      } else if (verb === 'reject') {
        await handleReject(queueRowId, decidedBy);
      }
    } catch (err) {
      log.error(
        'Slack interact background work threw',
        { action: 'slack-interact', queueRowId, verb },
        err instanceof Error ? err : undefined,
      );
    }
  })();

  return new NextResponse('', { status: 200 });
}
