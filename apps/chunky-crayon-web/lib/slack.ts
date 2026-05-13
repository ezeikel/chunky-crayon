/**
 * Slack helpers — Bot Token API + signature verification.
 *
 * Used by the kid-safety moderation flow: when the triad lands on
 * `borderline`, post a Block Kit message with Approve / Reject buttons to
 * #cc-moderation. The buttons hit /api/admin/slack/interact, which
 * verifies the signed payload and updates the message in place.
 *
 * Why a single dispatch endpoint per workspace (not one per project):
 *   Slack apps have one Interactivity Request URL per app. We share the
 *   Chewy Bytes Ops bot across CC, PTP, AM, etc. by namespacing every
 *   action_id with a project prefix ("cc:image-request:approve:…"). The
 *   route fans out based on the prefix.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as log from '@/lib/logger';

const SLACK_API = 'https://slack.com/api';

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// =============================================================================
// Signature verification — X-Slack-Signature + X-Slack-Request-Timestamp
// =============================================================================
//
// Slack signs every interactivity payload with our signing secret. We
// verify HMAC SHA256 over `v0:${timestamp}:${rawBody}` and reject
// timestamps more than 5 minutes old (replay protection).

const REPLAY_WINDOW_SECONDS = 5 * 60;

export function verifySlackSignature({
  rawBody,
  signature,
  timestamp,
}: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
}): boolean {
  if (!SIGNING_SECRET) {
    log.warn('SLACK_SIGNING_SECRET not configured — denying Slack request', {
      action: 'slack',
    });
    return false;
  }
  if (!signature || !timestamp) return false;

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - ts;
  if (Math.abs(ageSeconds) > REPLAY_WINDOW_SECONDS) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    'v0=' + createHmac('sha256', SIGNING_SECRET).update(base).digest('hex');

  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// =============================================================================
// Bot Token API — chat.postMessage, chat.update
// =============================================================================

type SlackBlock = Record<string, unknown>;

type ChatPostResult =
  | { ok: true; channel: string; ts: string }
  | { ok: false; error: string };

export async function postBlockKitMessage({
  channel,
  blocks,
  text,
}: {
  channel: string;
  blocks: SlackBlock[];
  /** Fallback for notifications + accessibility — never shown if blocks render. */
  text: string;
}): Promise<ChatPostResult> {
  if (!BOT_TOKEN) {
    log.warn('SLACK_BOT_TOKEN not configured — skipping post', {
      action: 'slack',
    });
    return { ok: false, error: 'no-bot-token' };
  }

  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, blocks, text }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    channel?: string;
    ts?: string;
    error?: string;
  };
  if (!data.ok || !data.channel || !data.ts) {
    log.warn('Slack postMessage failed', {
      action: 'slack',
      error: data.error,
    });
    return { ok: false, error: data.error ?? 'unknown' };
  }
  return { ok: true, channel: data.channel, ts: data.ts };
}

export async function updateMessage({
  channel,
  ts,
  blocks,
  text,
}: {
  channel: string;
  ts: string;
  blocks: SlackBlock[];
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN) {
    return { ok: false, error: 'no-bot-token' };
  }
  const res = await fetch(`${SLACK_API}/chat.update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel, ts, blocks, text }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    log.warn('Slack chat.update failed', {
      action: 'slack',
      error: data.error,
    });
    return { ok: false, error: data.error };
  }
  return { ok: true };
}

// =============================================================================
// Block Kit builders — moderation message + status updates
// =============================================================================
//
// action_id format: `cc:image-request:<approve|reject>:<queueRowId>`
//
// The :cc: prefix lets a future PTP/AM Slack integration share the same
// dispatch endpoint without ambiguity.

export function buildModerationMessage({
  queueRowId,
  platform,
  commenterUsername,
  prompt,
  triadReasoning,
}: {
  queueRowId: string;
  platform: 'INSTAGRAM' | 'FACEBOOK';
  commenterUsername: string;
  prompt: string;
  triadReasoning: string;
}): { blocks: SlackBlock[]; text: string } {
  const fallback = `Borderline #drawthis request from @${commenterUsername}: "${prompt}"`;

  return {
    text: fallback,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎨 Borderline coloring request — needs review',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Platform*\n${platform}` },
          { type: 'mrkdwn', text: `*From*\n@${commenterUsername}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Prompt*\n\`\`\`${prompt}\`\`\`` },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Triad reasoning:_ \`${triadReasoning}\``,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Approve & generate',
              emoji: true,
            },
            style: 'primary',
            action_id: `cc:image-request:approve:${queueRowId}`,
            value: queueRowId,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject', emoji: true },
            style: 'danger',
            action_id: `cc:image-request:reject:${queueRowId}`,
            value: queueRowId,
          },
        ],
      },
    ],
  };
}

export function buildDecidedMessage({
  decision,
  decidedBy,
  prompt,
  commenterUsername,
}: {
  decision: 'approve' | 'reject';
  decidedBy: string;
  prompt: string;
  commenterUsername: string;
}): { blocks: SlackBlock[]; text: string } {
  const verb = decision === 'approve' ? '✅ Approved' : '❌ Rejected';
  const tail =
    decision === 'approve'
      ? 'Generating now. The commenter will get the page within a few minutes.'
      : 'Polite apology sent to the commenter.';

  return {
    text: `${verb} by ${decidedBy}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${verb} by ${decidedBy}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*From*\n@${commenterUsername}` },
          { type: 'mrkdwn', text: `*Decision*\n${decision}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Prompt*\n\`\`\`${prompt}\`\`\`` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: tail }],
      },
    ],
  };
}
