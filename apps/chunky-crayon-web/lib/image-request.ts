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
import { z } from 'zod';
import { runJury, type JudgeVerdict } from '@one-colored-pixel/coloring-core';
import { findBlockedContent } from '@/lib/scene-generation';
import { moderateVoiceText } from '@/lib/moderation';
import { createColoringImageForCommentRequest } from '@/app/actions/createColoringImageForCommentRequest';
import {
  replyToComment,
  replyToFacebookComment,
  sendTextDM,
} from '@/lib/instagram-automation';
import { postBlockKitMessage, buildModerationMessage } from '@/lib/slack';
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

/**
 * Fallback verdict when a single judge erroreed out — treat as borderline
 * for that voter so a missing verdict doesn't auto-pass.
 */
const failedAsBorderline = (v: JudgeVerdict<Judgement>): Judgement =>
  v.ok
    ? v.result
    : { decision: 'borderline', reason: `${v.judge}_unavailable` };

/**
 * Three-vendor parallel verdict using the shared runJury module.
 *
 * Tier 1: haiku-4.5 + gemini-3-flash + gpt-5.4-mini in parallel. Cheap
 * + fast. Different vendors bring different policy training so
 * disagreement is itself signal.
 *
 * Escalation trigger: any `clearly_unsafe` vote OR no clear majority.
 * This is stricter than the default ("escalate unless unanimous")
 * because we want a second look even when 2 vote clearly_safe + 1
 * votes clearly_unsafe.
 *
 * Tier 2: Opus 4.7 with adaptive thinking. Fires on ~5% of prompts.
 * Its verdict is final.
 */
async function judgeKidSafety(prompt: string): Promise<Judgement> {
  const result = await runJury<Judgement>({
    system: KID_SAFETY_SYSTEM,
    prompt: `Prompt to judge: "${prompt}"`,
    schema: kidSafetyJudgementSchema,
    // `getPassed` here flags "clearly_safe" as the pass condition. We
    // don't actually consume `voted.passed` for the final return value —
    // we map verdicts back to {decision, reason} below — but runJury
    // needs the predicate to compute its own counts + escalation trigger.
    getPassed: (v) => v.decision === 'clearly_safe',
    tier1: ['haiku-4.5', 'gemini-3-flash', 'gpt-5.4-mini'],
    tieBreak: 'opus-4.7',
    escalationTrigger: (verdicts) => {
      const decisions = verdicts.map((v) => failedAsBorderline(v).decision);
      // Any clearly_unsafe → escalate, even with two clearly_safe votes.
      if (decisions.includes('clearly_unsafe')) return true;
      // No clear majority → escalate. Each decision needs ≥2 votes.
      const safe = decisions.filter((d) => d === 'clearly_safe').length;
      const borderline = decisions.filter((d) => d === 'borderline').length;
      return safe < 2 && borderline < 2;
    },
  });

  // Map runJury's panel + tie-break verdicts back to a kid-safety Judgement.
  const tier1Decisions = result.verdicts.map(failedAsBorderline);
  const summary = tier1Decisions
    .map((d, i) => `${result.verdicts[i].judge}:${d.decision}`)
    .join(';');

  if (result.escalated && result.tieBreakVerdict) {
    const opus = failedAsBorderline(result.tieBreakVerdict);
    log.info('Kid-safety triad split — escalated to Opus 4.7', {
      action: 'image-request',
      votes: summary,
      prompt: prompt.slice(0, 80),
    });
    return {
      decision: opus.decision,
      reason: `tier2-opus:${opus.decision}|${summary}`,
    };
  }

  // No escalation = unanimous or majority. Pick the majority decision.
  const tally = {
    clearly_safe: tier1Decisions.filter((d) => d.decision === 'clearly_safe')
      .length,
    borderline: tier1Decisions.filter((d) => d.decision === 'borderline')
      .length,
    clearly_unsafe: 0, // escalation trigger above rules this out
  };
  const winning = tally.clearly_safe >= 2 ? 'clearly_safe' : 'borderline';
  const unanimous = tier1Decisions.every((d) => d.decision === winning);
  return {
    decision: winning,
    reason: unanimous
      ? `tier1-unanimous:${winning}`
      : `tier1-majority:${summary}`,
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
    log.info('Image request borderline — posting to Slack', {
      action: 'image-request',
      queueRowId,
      reason: moderation.reason,
      commenterUsername,
    });

    const channel = process.env.SLACK_CC_MODERATION_CHANNEL_ID;
    if (!channel) {
      // No channel configured — fail safe by blocking. Better to skip
      // than auto-fire a prompt the moderation triad couldn't agree on.
      log.warn(
        'SLACK_CC_MODERATION_CHANNEL_ID not set — treating borderline as blocked',
        { action: 'image-request', queueRowId },
      );
      await Promise.allSettled([
        platform === 'INSTAGRAM'
          ? replyToComment(commentId, pickRandom(SORRY_REPLIES))
          : replyToFacebookComment(commentId, pickRandom(SORRY_REPLIES)),
        platform === 'INSTAGRAM'
          ? sendTextDM(commenterId, pickRandom(SORRY_DMS))
          : Promise.resolve(),
        db.socialCommentQueue.update({
          where: { id: queueRowId },
          data: {
            status: 'SKIPPED',
            errorMessage: `borderline-no-slack:${moderation.reason}`,
            processedAt: new Date(),
          },
        }),
      ]);
      return;
    }

    const slackPost = await postBlockKitMessage({
      channel,
      ...buildModerationMessage({
        queueRowId,
        platform,
        commenterUsername,
        prompt,
        triadReasoning: moderation.reason,
      }),
    });

    if (!slackPost.ok) {
      // Same fail-safe: block rather than auto-fire if Slack is down.
      log.warn('Slack post failed for borderline — treating as blocked', {
        action: 'image-request',
        queueRowId,
        error: slackPost.error,
      });
      await Promise.allSettled([
        platform === 'INSTAGRAM'
          ? replyToComment(commentId, pickRandom(SORRY_REPLIES))
          : replyToFacebookComment(commentId, pickRandom(SORRY_REPLIES)),
        platform === 'INSTAGRAM'
          ? sendTextDM(commenterId, pickRandom(SORRY_DMS))
          : Promise.resolve(),
        db.socialCommentQueue.update({
          where: { id: queueRowId },
          data: {
            status: 'SKIPPED',
            errorMessage: `borderline-slack-failed:${slackPost.error}`,
            processedAt: new Date(),
          },
        }),
      ]);
      return;
    }

    // Slack posted — park the row at PENDING until Approve/Reject fires.
    await db.socialCommentQueue.update({
      where: { id: queueRowId },
      data: {
        status: 'PENDING',
        errorMessage: `borderline:${moderation.reason}`,
        slackChannelId: slackPost.channel,
        slackMessageTs: slackPost.ts,
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
