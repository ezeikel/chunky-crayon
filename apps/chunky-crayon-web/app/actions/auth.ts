'use server';

import { db } from '@one-colored-pixel/db';
import { signOut, auth } from '@/auth';

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
