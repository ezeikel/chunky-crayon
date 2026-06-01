/**
 * Pure credit-merge math for the mobile anonymous→email account merge. Kept in
 * its own module (no `jose`, no `@one-colored-pixel/db` imports) so it can be
 * unit-tested without booting the Prisma client / triggering jose's realm
 * issue — importing the full `mobile-auth.ts` throws "DATABASE_URL is not
 * defined" at module load. Imported back into `mobile-auth.ts` for use.
 */

/**
 * Merge two credit balances when an anonymous device user signs into (or is
 * claimed by) an email account. Revenue-critical: the anon user's
 * earned/purchased credits are CARRIED into the target (summed), never dropped.
 * Clamped at 0 to defend against any negative drift in the scalar.
 *
 * Safe to sum (no double-count) because the only other actor on login — the
 * RevenueCat TRANSFER webhook — re-points the subscription but grants ZERO
 * credits (see app/api/revenuecat/webhook/route.ts case 'TRANSFER').
 */
export function computeMergedCredits(
  anonCredits: number,
  targetCredits: number,
): number {
  return Math.max(0, (anonCredits ?? 0) + (targetCredits ?? 0));
}
