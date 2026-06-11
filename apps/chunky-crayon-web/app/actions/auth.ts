'use server';

import { db } from '@one-colored-pixel/db';
import { del as deleteFromR2 } from '@one-colored-pixel/storage';
import { signOut, auth } from '@/auth';
import { getUserId } from '@/app/actions/user';

export const signOutAction = async () => {
  await signOut({ redirectTo: '/' });
};

/**
 * Returns the current user's signup method ('google' | 'email') for
 * client-side pixel tracking. Maps NextAuth account providers to the
 * same string the server-side CompleteRegistration CAPI fire uses
 * (auth.ts), so browser and server `signup_method` values align in
 * Meta — fragmented values split the funnel report.
 *
 * One DB read per signup ever — the PixelTracker localStorage flag
 * stops the call from repeating.
 */
export const getSignupMethod = async (): Promise<
  'google' | 'email' | undefined
> => {
  const session = await auth();
  const userId = session?.user?.dbId ?? session?.user?.id;
  if (!userId) return undefined;

  const account = await db.account.findFirst({
    where: { userId },
    select: { provider: true },
    orderBy: { id: 'asc' },
  });

  if (!account) return undefined;
  if (account.provider === 'google') return 'google';
  if (account.provider === 'resend') return 'email';
  return undefined;
};

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'not_found' | 'unknown' };

/**
 * Permanently delete the calling user's account and ALL of their data.
 *
 * Backs the in-app "Delete account" flow (Settings, behind a parental gate) and
 * the published deletion instructions at /en/delete-account. Required by Apple
 * Guideline 5.1.1(v), Google Play's data-safety / Designed for Families policy,
 * and GDPR-K / COPPA — so it MUST actually erase data, not just sign out.
 *
 * Works for web (NextAuth session) and mobile (proxy-injected x-user-id, since
 * this is called from /api/mobile/auth/delete-account). NOT guest-friendly:
 * getUserId returns null with no identity, and we refuse.
 *
 * Order matters:
 *   1. Enumerate the user's R2 blobs FIRST and delete them — the DB cascade
 *      removes the rows (and their URLs) but never touches R2, so once the rows
 *      are gone the keys are unrecoverable. R2 deletes are best-effort: an
 *      orphaned blob is not a reason to abort the account deletion.
 *   2. prisma.user.delete() — cascades subscriptions, profiles, saved artwork,
 *      characters, sessions, social tokens, stickers, and the credit ledger
 *      (onDelete: Cascade added in the account_deletion_cascades migration);
 *      coloring images are preserved with userId nulled (SetNull) since
 *      daily/system/community pages outlive their creator.
 *
 * Note: a store-level subscription entitlement (Apple/Google) is NOT canceled
 * by deleting the app account — the in-app confirm copy tells the user to manage
 * it in their store settings.
 */
export const deleteAccount = async (): Promise<DeleteAccountResult> => {
  const userId = await getUserId('delete your account');
  if (!userId) return { ok: false, error: 'unauthorized' };

  try {
    // 1. Gather every R2-backed URL owned by this user BEFORE the cascade wipes
    //    the rows. saved artwork (the primary user content), character
    //    portraits + line art, character voice lines, and canvas progress
    //    thumbnails/snapshots.
    const [savedArtworks, characters, voiceLines, canvasProgress] =
      await Promise.all([
        db.savedArtwork.findMany({
          where: { userId },
          select: { imageUrl: true, thumbnailUrl: true },
        }),
        db.character.findMany({
          where: { userId },
          select: { portraitUrl: true, portraitLineArtUrl: true },
        }),
        db.characterVoiceLine.findMany({
          where: { character: { userId } },
          select: { audioUrl: true },
        }),
        db.canvasProgress.findMany({
          where: { userId },
          select: { previewUrl: true, snapshotUrl: true },
        }),
      ]);

    const r2Urls = [
      ...savedArtworks.flatMap((a) => [a.imageUrl, a.thumbnailUrl]),
      ...characters.flatMap((c) => [c.portraitUrl, c.portraitLineArtUrl]),
      ...voiceLines.map((v) => v.audioUrl),
      ...canvasProgress.flatMap((p) => [p.previewUrl, p.snapshotUrl]),
    ].filter((url): url is string => Boolean(url));

    // Best-effort R2 cleanup — never let a failed blob delete block account
    // deletion (the DB rows are the source of truth for "is this account gone").
    await Promise.allSettled(r2Urls.map((url) => deleteFromR2(url)));

    // 2. Delete the user — cascades everything else; coloring images are NULLed.
    await db.user.delete({ where: { id: userId } });

    return { ok: true };
  } catch (error) {
    // P2025 = record not found (already deleted / race) — treat as not_found.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return { ok: false, error: 'not_found' };
    }
    console.error('Error deleting account:', error);
    return { ok: false, error: 'unknown' };
  }
};
