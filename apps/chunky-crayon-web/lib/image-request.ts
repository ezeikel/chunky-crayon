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
import { generateObject } from 'ai';
import { z } from 'zod';
import { findBlockedContent } from '@/lib/scene-generation';
import { moderateVoiceText } from '@/lib/moderation';
import { models } from '@/lib/ai/models';
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
// Delivery messages — used by the process cron when a gen completes
// =============================================================================
//
// IG: image arrives as a DM. The "on it ✨" reply on the comment is left
// as-is (no edit needed); the DM carries the result.
//
// FB: no DM channel for Page comments. The cron posts a nested reply on
// the original comment that contains the canonical URL to the generated
// page. CUID URL (not slugged) — comment-request images aren't publicly
// indexable, but the commenter who asked for it gets a direct link.

const DM_CAPTIONS_IG = [
  "Here's your coloring page! 🎨 Tap to save and print at home ✨",
  'Made just for you 💛 Save it to print + color whenever you like 🖌️',
  'Done! ✨ Long-press to save the image — happy coloring 🌈',
];

const FB_LINK_REPLIES = [
  "Done! ✨ Here's your coloring page: ${url}",
  'Ready! Tap to color: ${url} 🎨',
  'All done! Save + print from here: ${url} 💛',
];

export function pickImageDmCaption(): string {
  return pickRandom(DM_CAPTIONS_IG);
}

export function buildFbLinkReply(canonicalUrl: string): string {
  return pickRandom(FB_LINK_REPLIES).replace('${url}', canonicalUrl);
}

// =============================================================================
// Moderation — three tiers
// =============================================================================
//
// 1. Deterministic blocklist (fast). Same list the daily scene generator
//    uses. Catches the obvious stuff; over-eager by design — "sword" hits
//    even when the kid wants "a knight with a sword".
// 2. OpenAI moderation API via moderateVoiceText. Catches paraphrased
//    unsafe content the blocklist would miss.
// 3. Gemini Flash kid-safety judgement (the gate that makes Slack useful).
//    Returns clearly_safe / clearly_unsafe / borderline. Borderline lets
//    blocklist-flagged-but-actually-fine prompts through to human review
//    instead of auto-rejecting them.
//
// Decision map:
//   blocklist hit            → borderline (was: blocked — too aggressive)
//   moderateVoiceText !ok    → blocked
//   Gemini clearly_safe      → safe
//   Gemini clearly_unsafe    → blocked
//   Gemini borderline        → borderline (Slack approval)

type ModerationResult =
  | { decision: 'safe' }
  | { decision: 'blocked'; reason: string }
  | { decision: 'borderline'; reason: string };

const kidSafetyJudgementSchema = z.object({
  decision: z.enum(['clearly_safe', 'clearly_unsafe', 'borderline']),
  reason: z.string(),
});

const KID_SAFETY_SYSTEM = `You judge whether a short image prompt is appropriate to render as a coloring page for kids aged 3-10.

Output one of three decisions:
- clearly_safe: the subject is wholesome and obviously kid-appropriate. Things kids would draw: animals, fairies, dinosaurs, vehicles, food, sports, family, holidays, fantasy characters. Even mild themes with positive framing (a knight with a sword, a friendly dragon, a brave firefighter) are clearly_safe.
- clearly_unsafe: the subject is hateful, sexual, gory, drug-related, self-harm, or otherwise inappropriate for kids by any reasonable parent's judgement. No grey area.
- borderline: anything where a reasonable parent might split. Realistic weapons in non-fantasy contexts. Real-world political/religious imagery. Anything ambiguous, edgy, or that needs a human eyeball before we draw it.

Bias toward 'clearly_safe' — most prompts kids type are obviously fine. Reserve 'borderline' for cases where you'd genuinely want a human to call it.

The 'reason' field: one short clause explaining your call.`;

type Judgement = z.infer<typeof kidSafetyJudgementSchema>;

// Single-model judgement helper. Wraps generateObject + recovers from
// errors by returning borderline so a missing/erroring verdict doesn't
// auto-pass the prompt.
async function singleJudge(
  modelName: 'haiku45' | 'gemini' | 'gpt54mini' | 'opus47',
  prompt: string,
): Promise<Judgement> {
  try {
    let result;
    if (modelName === 'opus47') {
      // Opus 4.7: adaptive thinking on, runs longer + reasons harder.
      // Higher quality verdict; only used in the Tier-2 escalation path.
      result = await generateObject({
        model: models.opus47,
        schema: kidSafetyJudgementSchema,
        system: KID_SAFETY_SYSTEM,
        prompt: `Prompt to judge: "${prompt}"`,
        providerOptions: {
          anthropic: {
            thinking: { type: 'adaptive' },
          },
        },
      });
    } else {
      const model =
        modelName === 'haiku45'
          ? models.haiku45
          : modelName === 'gpt54mini'
            ? models.gpt54mini
            : models.analytics; // gemini 3 flash
      result = await generateObject({
        model,
        schema: kidSafetyJudgementSchema,
        system: KID_SAFETY_SYSTEM,
        prompt: `Prompt to judge: "${prompt}"`,
      });
    }
    return result.object;
  } catch (err) {
    log.warn(
      'Kid-safety judge errored — treating as borderline for this voter',
      {
        action: 'image-request',
        judge: modelName,
        prompt: prompt.slice(0, 80),
      },
      err instanceof Error ? err : undefined,
    );
    return {
      decision: 'borderline',
      reason: `${modelName}_unavailable`,
    };
  }
}

// Three-vendor parallel verdict. Each vendor brings different policy
// training — disagreement is itself a useful signal. If any voter says
// clearly_unsafe we escalate (safer); otherwise majority wins among the
// non-error voters.
async function judgeKidSafety(prompt: string): Promise<Judgement> {
  // Tier 1: three cheap+fast verdicts in parallel.
  const [haikuVote, geminiVote, gptVote] = await Promise.all([
    singleJudge('haiku45', prompt),
    singleJudge('gemini', prompt),
    singleJudge('gpt54mini', prompt),
  ]);
  const votes = [haikuVote, geminiVote, gptVote];
  const reasons = `haiku:${haikuVote.decision};gemini:${geminiVote.decision};gpt:${gptVote.decision}`;

  // Any clearly_unsafe → escalate. Even one strong vendor saying "no"
  // earns a human review (or Opus tie-break).
  const anyUnsafe = votes.some((v) => v.decision === 'clearly_unsafe');

  // All three agree → that's the answer.
  if (
    haikuVote.decision === geminiVote.decision &&
    geminiVote.decision === gptVote.decision &&
    !anyUnsafe
  ) {
    return {
      decision: haikuVote.decision,
      reason: `tier1-unanimous:${haikuVote.decision}`,
    };
  }

  // 2-out-of-3 majority (and no one says clearly_unsafe) → take it.
  if (!anyUnsafe) {
    const tally = {
      clearly_safe: votes.filter((v) => v.decision === 'clearly_safe').length,
      borderline: votes.filter((v) => v.decision === 'borderline').length,
      clearly_unsafe: 0,
    };
    if (tally.clearly_safe >= 2) {
      return { decision: 'clearly_safe', reason: `tier1-majority:${reasons}` };
    }
    if (tally.borderline >= 2) {
      return { decision: 'borderline', reason: `tier1-majority:${reasons}` };
    }
  }

  // Tier 2: Opus 4.7 tie-break with adaptive thinking. Slow (~3-4s) but
  // only fires on disagreement or any clearly_unsafe vote — empirically
  // <5% of prompts.
  log.info('Kid-safety triad split — escalating to Opus 4.7', {
    action: 'image-request',
    votes: reasons,
    prompt: prompt.slice(0, 80),
  });
  const opusVote = await singleJudge('opus47', prompt);
  return {
    decision: opusVote.decision,
    reason: `tier2-opus:${opusVote.decision}|${reasons}`,
  };
}

async function moderatePrompt(prompt: string): Promise<ModerationResult> {
  // Gate 1: deterministic blocklist. Hits route to borderline (not blocked)
  // so legitimate uses of "sword", "fire", etc. in kid-appropriate contexts
  // still have a path through human review instead of auto-rejecting.
  const blocked = findBlockedContent(prompt);

  // Gate 2: OpenAI moderation. ok=false here means hateful/sexual/violent
  // content the policy explicitly rejects — never borderline, always
  // blocked.
  const m = await moderateVoiceText(prompt);
  if (!m.ok) {
    return { decision: 'blocked', reason: `openai-moderation:${m.code}` };
  }

  // Gate 3: kid-safety judgement. The tie-breaker for blocklist-flagged
  // prompts and the catcher for paraphrased grey areas.
  const judgement = await judgeKidSafety(prompt);

  if (judgement.decision === 'clearly_unsafe') {
    return {
      decision: 'blocked',
      reason: `kid-safety:${judgement.reason}`,
    };
  }

  if (judgement.decision === 'borderline' || blocked) {
    return {
      decision: 'borderline',
      reason: blocked
        ? `blocklist:${blocked};kid-safety:${judgement.reason}`
        : `kid-safety:${judgement.reason}`,
    };
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
