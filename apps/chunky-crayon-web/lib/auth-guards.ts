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
 * Source of truth: `User.role` (DB column) exposed on `session.user.role`
 * via the NextAuth session callback in auth.ts. The role is bootstrapped
 * from the ADMIN_EMAILS constant on signin; the email-list check below
 * is a belt-and-braces fallback for sessions issued before the role
 * column existed (drops out once those sessions roll over).
 */
export const requireAdmin = async (
  onFail: 'notFound' | 'redirect' = 'notFound',
): Promise<string> => {
  const session = await auth();
  const email = session?.user?.email;
  const isAdmin =
    session?.user?.role === 'ADMIN' ||
    (!!email && ADMIN_EMAILS.includes(email));

  if (!isAdmin) {
    if (onFail === 'redirect') redirect('/');
    notFound();
  }

  return email as string;
};
