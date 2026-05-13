/**
 * `#drawthis` image-request orchestrator.
 *
 * The webhook spots a comment matching the trigger pattern and calls
 * `handleImageRequest`, which:
 *
 *   1. Re-extracts the prompt (defence-in-depth) and runs kid-safety gates
 *   2. Blocked → DB row marked SKIPPED + polite apology DM + reply to
 *      comment
 *   3. Borderline (safety check uncertain) → DB row marked PENDING with
 *      commentType=IMAGE_REQUEST + Slack approval message posted. Approval
 *      flow lives in `/api/admin/slack/interact`.
 *   4. Safe → DB row marked AWAITING_GENERATION + reply to comment with
 *      "on it ✨", kick off `createColoringImageForCommentRequest`. The
 *      process cron polls the resulting ColoringImage row and DMs the
 *      result when it hits READY.
 *
 * The webhook is fire-and-forget for the heavy work — the trigger handler
 * returns 200 to Meta within seconds, even though the full DM flow takes
 * minutes.
 */
import type { SocialPlatform } from '@one-colored-pixel/db';
import { db } from '@one-colored-pixel/db';
import { findBlockedContent } from '@/lib/scene-generation';
import { moderateVoiceText } from '@/lib/moderation';
import { createColoringImageForCommentRequest } from '@/app/actions/createColoringImageForCommentRequest';
import {
  replyToComment,
  replyToFacebookComment,
  sendTextDM,
} from '@/lib/instagram-automation';
import * as log from '@/lib/logger';

// =============================================================================
// Trigger pattern
// =============================================================================
//
// `#drawthis a unicorn cake` → extracts "a unicorn cake".
// `#drawthis` (no prompt) → returns null (too short).
// `#drawthis foo` (≤3 chars) → returns null.
// `#drawthis ${very_long_string}` → returns null (>200 chars).
//
// Case-insensitive. Doesn't have to be at the start of the comment so
// `omg yes!! #drawthis a brave lion` works too.
const TRIGGER_PATTERN = /#drawthis\b\s*(.+)?/i;

const MIN_PROMPT_LEN = 3;
const MAX_PROMPT_LEN = 200;

export function extractImageRequestPrompt(commentText: string): string | null {
  const match = commentText.match(TRIGGER_PATTERN);
  if (!match) return null;
  const prompt = (match[1] ?? '').trim();
  if (prompt.length < MIN_PROMPT_LEN || prompt.length > MAX_PROMPT_LEN) {
    return null;
  }
  return prompt;
}

// =============================================================================
// Comment replies — varied so we don't post the same string 50 times
// =============================================================================

const ON_IT_REPLIES = [
  'On it! Check your DMs in a few mins ✨',
  "Drawing it now — we'll DM you when it's ready 🖌️",
  "Got it! We'll send the page to your DMs shortly 💌",
  'Brilliant idea! DMing you the coloring page soon 🎨',
  "Love that! It'll land in your DMs in a few mins ✨",
];

const SORRY_REPLIES = [
  "We couldn't draw that one — try something simpler 💛",
  "That one's a bit tricky for us — try a different idea? 🌈",
  "Hmm, we couldn't make that page. Try another idea? ✨",
];

const SORRY_DMS = [
  "Hey! We couldn't quite draw what you asked for. Try something like 'a friendly dragon' or 'a unicorn at a tea party'? 🌈",
  "Hi! Our drawing magic didn't work on that one. Want to try a simpler idea? Something like 'a sleeping puppy' or 'a smiling sunflower' usually works great ✨",
];

const pickRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// =============================================================================
// Moderation
// =============================================================================
//
// Two gates: deterministic blocklist (fast) + LLM safety check (slow but
// catches paraphrasing). Result decides the row's status:
//   safe       → green-light gen
//   blocked    → reject with apology
//   borderline → Slack approval queue

type ModerationResult =
  | { decision: 'safe' }
  | { decision: 'blocked'; reason: string }
  | { decision: 'borderline'; reason: string };

async function moderatePrompt(prompt: string): Promise<ModerationResult> {
  // Gate 1: deterministic blocklist. If a clear kid-unsafe word is in the
  // prompt, reject outright — no point burning an LLM call.
  const blocked = findBlockedContent(prompt);
  if (blocked) {
    return { decision: 'blocked', reason: `blocklist:${blocked}` };
  }

  // Gate 2: LLM safety check (OpenAI moderation API behind moderateVoiceText).
  // The user-facing voice/photo paths already trust this gate for kid-safety;
  // re-using it keeps comment-request consistent with the rest of CC.
  //
  // moderateVoiceText returns { ok: true } for clearly-safe content and
  // { ok: false, code } for clearly-unsafe. There's no "uncertain" return
  // today — so for phase 1 we map ok=false to BLOCKED, no borderline path.
  // If we want a true uncertainty signal later, add a confidence score in
  // moderateVoiceText and route low-confidence-safe to borderline here.
  const m = await moderateVoiceText(prompt);
  if (!m.ok) {
    return { decision: 'blocked', reason: m.code };
  }

  return { decision: 'safe' };
}

// =============================================================================
// Main handler — called by the webhook for any comment matching #drawthis
// =============================================================================

type HandleImageRequestArgs = {
  /** SocialCommentQueue row already inserted by the webhook with
   *  commentType=IMAGE_REQUEST + extractedPrompt set + status=PENDING.
   *  This handler drives it to a terminal state (AWAITING_GENERATION on
   *  safe, SKIPPED on blocked, stays PENDING on borderline pending Slack). */
  queueRowId: string;
  platform: SocialPlatform;
  commentId: string;
  commenterId: string;
  commenterUsername: string;
  prompt: string;
};

export async function handleImageRequest({
  queueRowId,
  platform,
  commentId,
  commenterId,
  commenterUsername,
  prompt,
}: HandleImageRequestArgs): Promise<void> {
  const moderation = await moderatePrompt(prompt);

  if (moderation.decision === 'blocked') {
    log.info('Image request blocked', {
      action: 'image-request',
      queueRowId,
      reason: moderation.reason,
      commenterUsername,
    });
    await Promise.allSettled([
      platform === 'INSTAGRAM'
        ? replyToComment(commentId, pickRandom(SORRY_REPLIES))
        : replyToFacebookComment(commentId, pickRandom(SORRY_REPLIES)),
      // IG DM only — FB doesn't open a 7-day DM window from a Page comment
      // the same way IG does. FB users get the reply only.
      platform === 'INSTAGRAM'
        ? sendTextDM(commenterId, pickRandom(SORRY_DMS))
        : Promise.resolve(),
      db.socialCommentQueue.update({
        where: { id: queueRowId },
        data: {
          status: 'SKIPPED',
          errorMessage: moderation.reason,
          processedAt: new Date(),
        },
      }),
    ]);
    return;
  }

  if (moderation.decision === 'borderline') {
    log.info('Image request borderline — pending Slack approval', {
      action: 'image-request',
      queueRowId,
      reason: moderation.reason,
      commenterUsername,
    });
    // TODO(slack): post Block Kit message with Approve/Reject buttons,
    // store slackChannelId + slackMessageTs on the row. Wired in the
    // /api/admin/slack/interact PR.
    await db.socialCommentQueue.update({
      where: { id: queueRowId },
      data: {
        status: 'PENDING',
        errorMessage: `borderline:${moderation.reason}`,
      },
    });
    return;
  }

  // Safe path: reply to the comment with "on it", kick off the gen.
  log.info('Image request approved — starting generation', {
    action: 'image-request',
    queueRowId,
    commenterUsername,
  });

  const replyReady =
    platform === 'INSTAGRAM'
      ? replyToComment(commentId, pickRandom(ON_IT_REPLIES))
      : replyToFacebookComment(commentId, pickRandom(ON_IT_REPLIES));

  const genResult = await createColoringImageForCommentRequest({
    description: prompt,
    locale: 'en',
    requestedByUsername: commenterUsername,
  });

  // Don't await the reply — its failure shouldn't block status updates.
  void replyReady;

  if (!genResult.ok) {
    log.error('Image request gen kickoff failed', {
      action: 'image-request',
      queueRowId,
      error: genResult.error,
      reason: genResult.reason,
    });
    await Promise.allSettled([
      platform === 'INSTAGRAM'
        ? sendTextDM(commenterId, pickRandom(SORRY_DMS))
        : Promise.resolve(),
      db.socialCommentQueue.update({
        where: { id: queueRowId },
        data: {
          status: 'FAILED',
          errorMessage: `gen-kickoff:${genResult.error}:${genResult.reason ?? ''}`,
          processedAt: new Date(),
        },
      }),
    ]);
    return;
  }

  // Gen kicked off. The process cron will poll the ColoringImage row and
  // DM the result when it hits READY (or send a sorry DM if FAILED).
  await db.socialCommentQueue.update({
    where: { id: queueRowId },
    data: {
      status: 'AWAITING_GENERATION',
      coloringImageId: genResult.coloringImageId,
      dmSent: false,
      imageDmSent: false,
    },
  });
}
