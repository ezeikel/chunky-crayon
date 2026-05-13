/**
 * Meta Graph API helpers — IG + FB comment replies, DMs, like, fetch.
 *
 * Mirrors the pattern from the PTP project (parking-ticket-pal) but adapted
 * for CC's logger + Graph API version. New here vs PTP: sendImageDM, which
 * delivers a generated coloring page back to the commenter via IG/FB DM.
 *
 * All functions return { success, error? } rather than throwing — failures
 * are logged, retries are owned by the calling cron's queue logic.
 */
import * as log from '@/lib/logger';

const GRAPH = 'https://graph.facebook.com/v22.0';

const { INSTAGRAM_ACCOUNT_ID } = process.env;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
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
 * Send a text DM to an IG user. POST /{ig-account-id}/messages
 *
 * Subject to IG's messaging window: we can only DM users we've had inbound
 * contact from in the last 7 days (a comment counts). Comment-triggered DMs
 * are always inside the window.
 */
async function sendTextDM(
  recipientId: string,
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
        recipient: { id: recipientId },
        message: { text },
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`DM send failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to send text DM',
      { action: 'instagram-automation', recipientId },
      err,
    );
    return { success: false, error: err.message };
  }
}

/**
 * Send an IG DM with a URL button (generic template). Falls back to a plain
 * text DM with the URL inlined if the template path fails.
 */
async function sendButtonDM(
  recipientId: string,
  text: string,
  buttonTitle: string,
  buttonUrl: string,
): Promise<GraphResult> {
  try {
    if (!INSTAGRAM_ACCOUNT_ID) {
      throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
    }

    const response = await fetch(`${GRAPH}/${INSTAGRAM_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: text,
                  buttons: [
                    { type: 'web_url', url: buttonUrl, title: buttonTitle },
                  ],
                },
              ],
            },
          },
        },
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      log.warn('Button DM failed, falling back to text', {
        action: 'instagram-automation',
        recipientId,
        error: JSON.stringify(data),
      });
      return await sendTextDM(recipientId, `${text}\n\n${buttonUrl}`);
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to send button DM',
      { action: 'instagram-automation', recipientId },
      err,
    );
    return sendTextDM(recipientId, `${text}\n\n${buttonUrl}`);
  }
}

/**
 * Send an IG DM with an image attachment. Used to deliver the generated
 * coloring page back to the commenter for the #drawthis flow. Followed by
 * a text DM with the caption / CTA so we get caption + image in two clean
 * bubbles instead of one squashed template.
 *
 * Graph API: `attachment.type = 'image'` with `payload.url` pointing at a
 * publicly-readable image. Our R2 imageUrl is public.
 */
export async function sendImageDM(
  recipientId: string,
  imageUrl: string,
  caption: string,
): Promise<GraphResult> {
  try {
    if (!INSTAGRAM_ACCOUNT_ID) {
      throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
    }

    const response = await fetch(`${GRAPH}/${INSTAGRAM_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: false },
          },
        },
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      log.warn('Image DM failed, falling back to text + URL', {
        action: 'instagram-automation',
        recipientId,
        error: JSON.stringify(data),
      });
      return sendTextDM(recipientId, `${caption}\n\n${imageUrl}`);
    }

    // Image bubble delivered; follow up with the caption so the message
    // arrives as two stacked bubbles in the IG inbox.
    const captionResult = await sendTextDM(recipientId, caption);
    if (!captionResult.success) {
      log.warn('Image DM delivered but caption DM failed', {
        action: 'instagram-automation',
        recipientId,
        captionError: captionResult.error,
      });
    }

    return { success: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    log.error(
      'Failed to send image DM',
      { action: 'instagram-automation', recipientId },
      err,
    );
    return sendTextDM(recipientId, `${caption}\n\n${imageUrl}`);
  }
}

// Public re-exports for the queue processor.
export { sendTextDM, sendButtonDM };

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
