/**
 * Classify + generate a reply to an inbound IG/FB comment.
 *
 * The webhook drops comments into `social_comment_queue` with status=PENDING.
 * The process cron picks them up and calls `generateCommentReply` for each.
 * Output is either a reply string we POST back to the comment, or a skip
 * signal (the row terminates as SKIPPED).
 *
 * Adapted from the PTP project's classifier. Differences for CC:
 *   - Brand voice: kid-friendly, warm, parent-trusted. No legal/factual
 *     fact-checking (PTP needed it for parking-law questions; CC doesn't
 *     have facts to check). The `factChecked` flag is dropped entirely.
 *   - No video transcript / visual context — CC posts are images, not
 *     narrated video reels. The classifier sees caption + comment text only.
 *   - Thread-reply path is also dropped in v1 — CC's comment volume is
 *     tiny (<50 followers) so distinguishing thread-replies from top-level
 *     comments isn't worth the LLM call. Add it back when volume justifies.
 */
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { ccVoice } from '@one-colored-pixel/coloring-core';
import { models } from '@/lib/ai/models';
import type { CommentType } from '@one-colored-pixel/db';

// =============================================================================
// Brand voice — sourced from the single CC brand-voice core in
// coloring-core (same source captions and the blog use). ccVoice(null,
// 'comment_reply') = the brand core + the reply-specific framing (SHORT,
// one emoji, friendly-deflect, SKIP). One definition, no drift.
// =============================================================================

const BRAND_VOICE = `${ccVoice(null, 'comment_reply')}

No promises we can't keep ("we'll make that for you!", "DM us for a free pack"). No "Great question!" / "Thanks for sharing!" filler.

If you genuinely can't add value, reply with exactly "SKIP" and nothing else.`;

// =============================================================================
// Per-type guidance — fed into the reply prompt for the chosen comment type
// =============================================================================

const COMMENT_TYPE_GUIDANCE: Record<CommentType, string> = {
  AGREEMENT:
    "Acknowledge warmly and add one tiny extra observation about the page — what's fun about it, what kids tend to enjoy coloring. Don't gush.",
  QUESTION:
    'Answer directly and briefly. If we genuinely don\'t know, say so cheerfully ("good question, we\'re not sure!"). Never make up an answer.',
  CORRECTION:
    "If they're right, acknowledge it kindly. If they're not, gently disagree without being defensive. One line.",
  COMBATIVE:
    'Stay friendly. Defuse with one short positive line. Do not escalate, do not match their energy. Often "SKIP" is correct.',
  APPRECIATION:
    'Warm thank-you in one short line. No emoji avalanche. Add one small specific touch when possible ("the elephant is our favorite this week").',
  EMOJI_ONLY:
    'Reply with a short warm phrase + matching emoji. Don\'t overthink it. "🌈 thank you!" energy.',
  SPAM: 'Always SKIP.',
  IMAGE_REQUEST:
    'This should not be hitting this path — image requests are handled upstream by the #drawthis flow. SKIP.',
  OTHER:
    "Treat as appreciation or a light comment. One short warm reply if there's anything to say, otherwise SKIP.",
};

// =============================================================================
// Step 1 — classify
// =============================================================================

const classifySchema = z.object({
  commentType: z.enum([
    'AGREEMENT',
    'QUESTION',
    'CORRECTION',
    'COMBATIVE',
    'APPRECIATION',
    'EMOJI_ONLY',
    'SPAM',
    'OTHER',
  ]),
  shouldReply: z.boolean(),
  reason: z.string(),
});

type ClassifyResult = {
  commentType: CommentType;
  shouldReply: boolean;
  reason: string;
};

async function classifyComment(
  commentText: string,
  postCaption: string | null,
): Promise<ClassifyResult> {
  const { object } = await generateObject({
    model: models.analytics,
    schema: classifySchema,
    prompt: `Classify this social media comment on a kids' coloring page brand account.

Post caption: ${postCaption ?? '(not available)'}

Comment: "${commentText}"

Classify the comment type and decide whether to reply:

shouldReply rules:
- Default TRUE. Only set FALSE for: clear spam, non-English with no context, just a stranger's @-tag with no real message, or genuinely abusive/inappropriate content.
- Questions ALWAYS get a reply (even if we can only partially answer).
- Emoji-only comments ALSO get a reply.
- Combative comments USUALLY get a short friendly deflect, sometimes SKIP — depends on tone.

Be honest in 'reason' — one short sentence on why you classified it this way.`,
  });

  return object as ClassifyResult;
}

// =============================================================================
// Step 2 — generate reply (or return null for skip)
// =============================================================================

type ReplyResult = {
  reply: string | null;
  commentType: CommentType;
  skipped: boolean;
  skipReason?: string;
};

export async function generateCommentReply({
  commentText,
  postCaption,
  platform,
}: {
  commentText: string;
  postCaption: string | null;
  platform: 'INSTAGRAM' | 'FACEBOOK';
}): Promise<ReplyResult> {
  const classification = await classifyComment(commentText, postCaption);

  if (!classification.shouldReply) {
    return {
      reply: null,
      commentType: classification.commentType,
      skipped: true,
      skipReason: classification.reason,
    };
  }

  const typeGuidance =
    COMMENT_TYPE_GUIDANCE[classification.commentType] ??
    COMMENT_TYPE_GUIDANCE.OTHER;

  const { text } = await generateText({
    model: models.creative,
    system: BRAND_VOICE,
    prompt: `Write a reply to this ${platform.toLowerCase()} comment on one of our coloring page posts.

Comment type: ${classification.commentType}
Guidance for this type: ${typeGuidance}

Post caption: ${postCaption ?? '(not available)'}

Their comment: "${commentText}"

Reply with ONLY the reply text. No quotes, no labels, no preamble. If you genuinely can't add value, reply with exactly "SKIP".`,
  });

  const trimmed = text.trim();
  if (trimmed === 'SKIP' || trimmed === '') {
    return {
      reply: null,
      commentType: classification.commentType,
      skipped: true,
      skipReason: 'AI returned SKIP',
    };
  }

  return {
    reply: trimmed,
    commentType: classification.commentType,
    skipped: false,
  };
}
