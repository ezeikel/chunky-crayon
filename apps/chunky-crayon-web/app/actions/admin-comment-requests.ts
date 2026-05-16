'use server';

import { revalidatePath } from 'next/cache';
import { db, CommentQueueStatus } from '@one-colored-pixel/db';
import { requireAdmin } from '@/lib/auth-guards';

/**
 * Mark an image-request comment row as DM'd.
 *
 * Used by the /admin/comment-requests "DM Composer". Until the
 * `instagram_business_manage_messages` permission is approved by Meta App
 * Review, the final IG DM is sent manually: the admin copies the
 * pre-formatted message from the composer, pastes it into the Instagram
 * DM to the commenter, then clicks "Mark as DM'd" here so the row leaves
 * the actionable queue. Once the permission is live, the process cron's
 * sendCommentPrivateReply does this automatically and this manual path
 * becomes redundant (kept as a fallback).
 *
 * Idempotent — sets the terminal state directly rather than reading then
 * flipping, so double-clicks settle deterministically.
 */
export const markCommentRequestDmSent = async (
  queueRowId: string,
): Promise<{ ok: true } | { error: string }> => {
  await requireAdmin('notFound');

  try {
    await db.socialCommentQueue.update({
      where: { id: queueRowId },
      data: {
        status: CommentQueueStatus.DM_SENT,
        dmSent: true,
        imageDmSent: true,
        processedAt: new Date(),
      },
    });
    revalidatePath('/[locale]/admin/comment-requests', 'page');
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'failed to mark DM sent',
    };
  }
};
