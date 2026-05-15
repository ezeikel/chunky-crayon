/**
 * Meta Graph API helpers — IG + FB comment replies, DMs, like, fetch.
 *
 * Mirrors the pattern from the PTP project (parking-ticket-pal) but adapted
 * for CC's logger + Graph API version. Comment→DM delivery uses the
 * Private Replies API (sendCommentPrivateReply, recipient.comment_id) —
 * NOT the general messaging API, which requires the user to message first.
 *
 * All functions return { success, error? } rather than throwing — failures
 * are logged, retries are owned by the calling cron's queue logic.
 */
import * as log from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v22.0';

const { INSTAGRAM_ACCOUNT_ID } = process.env;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const { FACEBOOK_PAGE_ID } = process.env;

type GraphResult = { success: boolean; error?: string };

// ============================================================================
// Comment replies
// ============================================================================

/**
 * Reply to an IG comment. POST /{comment-id}/replies
 */
export async function replyToComment(
  commentId: string,
  message: string,
): Promise<GraphResult> {
  try {
    const response = await fetch(`${GRAPH}/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`IG comment reply failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to reply to IG comment',
      { action: 'instagram-automation', commentId },
      err,
    );
    return { success: false, error: err.message };
  }
}

/**
 * Reply to a Facebook comment. FB uses /comments not /replies.
 */
export async function replyToFacebookComment(
  commentId: string,
  message: string,
): Promise<GraphResult> {
  try {
    const response = await fetch(`${GRAPH}/${commentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`FB comment reply failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to reply to FB comment',
      { action: 'instagram-automation', commentId },
      err,
    );
    return { success: false, error: err.message };
  }
}

/**
 * Like a comment on IG or FB. POST /{comment-id}/likes
 */
export async function likeComment(commentId: string): Promise<GraphResult> {
  try {
    const response = await fetch(`${GRAPH}/${commentId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: PAGE_ACCESS_TOKEN }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Like comment failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to like comment',
      { action: 'instagram-automation', commentId },
      err,
    );
    return { success: false, error: err.message };
  }
}

// ============================================================================
// DMs
// ============================================================================

/**
 * Send a Private Reply — a DM delivered in response to a comment.
 *
 * This is the ManyChat "comment to DM" mechanism, and the ONLY way to DM a
 * commenter who hasn't messaged us first. Uses `recipient.comment_id`
 * instead of `recipient.id`. Requires `instagram_manage_comments` (which
 * our Page token already has — NOT instagram_business_manage_messages, and
 * NO App Review needed).
 *
 * Hard constraints (Meta):
 *   - Exactly ONE message per comment. No follow-ups unless the user
 *     replies first (then a 24h window opens).
 *   - Must be sent within 7 days of the comment.
 *
 * IG DMs render links as clickable (IG comments do NOT), so a text message
 * containing the coloring-page URL is the right delivery shape.
 *
 * https://developers.facebook.com/docs/instagram-platform/private-replies/
 */
export async function sendCommentPrivateReply(
  commentId: string,
  text: string,
): Promise<GraphResult> {
  try {
    if (!INSTAGRAM_ACCOUNT_ID) {
      throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
    }

    const response = await fetch(`${GRAPH}/${INSTAGRAM_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text },
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Private reply failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to send private reply',
      { action: 'instagram-automation', commentId },
      err,
    );
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Fetch helpers — used by the webhook to enrich queue rows with post context
// ============================================================================

/**
 * GET /{media-id}?fields=caption — Instagram post caption.
 */
export async function fetchInstagramPostCaption(
  mediaId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GRAPH}/${mediaId}?fields=caption&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok) {
      log.warn('Failed to fetch IG post caption', {
        action: 'instagram-automation',
        mediaId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return data.caption || null;
  } catch {
    log.warn('Error fetching IG post caption', {
      action: 'instagram-automation',
      mediaId,
    });
    return null;
  }
}

/**
 * GET /{post-id}?fields=message — Facebook post message.
 */
export async function fetchFacebookPostMessage(
  postId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GRAPH}/${postId}?fields=message&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok) {
      log.warn('Failed to fetch FB post message', {
        action: 'instagram-automation',
        postId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return data.message || null;
  } catch {
    log.warn('Error fetching FB post message', {
      action: 'instagram-automation',
      postId,
    });
    return null;
  }
}

/**
 * Fetch the author of a Facebook comment — used by the webhook to detect
 * whether a nested reply's parent was our own comment (so we don't reply
 * to strangers replying to strangers).
 */
export async function fetchFacebookCommentDetails(commentId: string): Promise<{
  id: string;
  message: string;
  fromId: string;
  fromName: string;
} | null> {
  try {
    const response = await fetch(
      `${GRAPH}/${commentId}?fields=id,message,from&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok || !data.from) {
      log.warn('Failed to fetch FB comment details', {
        action: 'instagram-automation',
        commentId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return {
      id: data.id,
      message: data.message || '',
      fromId: data.from.id,
      fromName: data.from.name || '',
    };
  } catch {
    log.warn('Error fetching FB comment details', {
      action: 'instagram-automation',
      commentId,
    });
    return null;
  }
}

// ============================================================================
// Re-export env-derived constants for callers that need to skip own-author
// comments (webhook) or detect post ownership (catch-up cron).
// ============================================================================
export { INSTAGRAM_ACCOUNT_ID, FACEBOOK_PAGE_ID };
