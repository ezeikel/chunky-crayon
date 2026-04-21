import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ADMIN_EMAILS } from '@/constants';

/**
 * Gate a page/route to admin emails only.
 *
 * Two modes:
 *   - 'notFound' (default): renders a 404 if the caller isn't admin. Use
 *      for internal tools / debug pages — prevents leaking their existence.
 *   - 'redirect': bounces to '/' — use for user-facing admin dashboards
 *     where a 404 would look broken.
 *
 * Returns the admin's email on success (you can assume it's non-null in
 * the rest of the handler).
 *
 * If we ever outgrow ADMIN_EMAILS (multi-admin team, tiered perms) swap
 * the check here — every admin route uses this one helper.
 */
export const requireAdmin = async (
  onFail: 'notFound' | 'redirect' = 'notFound',
): Promise<string> => {
  const session = await auth();
  const email = session?.user?.email;
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);

  if (!isAdmin) {
    if (onFail === 'redirect') redirect('/');
    notFound();
  }

  return email as string;
};
