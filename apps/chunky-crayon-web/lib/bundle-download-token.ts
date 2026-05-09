import { SignJWT, jwtVerify } from 'jose';

/**
 * Bundle download tokens.
 *
 * Why we need them:
 *   The download endpoint at /api/bundles/[slug]/download has to work for
 *   guests who never log in — they bought via Stripe Checkout with just an
 *   email and got the download link in their purchase confirmation email.
 *   We can't auth them by session cookie. The token in the link IS the
 *   auth.
 *
 * Why JWT (not opaque DB token):
 *   - No schema change required (BundlePurchase already has the id)
 *   - Replays naturally expire after 14 days, no cron cleanup needed
 *   - Re-issuing is just sign-again, no DB write
 *
 * Token payload is intentionally minimal — just the BundlePurchase id.
 * The endpoint resolves it back to a row and re-checks the row hasn't
 * been refunded. So a leaked token can be invalidated by refunding the
 * purchase.
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXT_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev-secret-change-me',
);

const TOKEN_EXPIRATION = '14d';

type BundleDownloadTokenPayload = {
  /** The BundlePurchase id this token grants download for. */
  purchaseId: string;
  /** Discriminator so we can never accidentally accept a mobile-auth or
   * NextAuth token in this code path. */
  type: 'bundle-download';
};

export async function signBundleDownloadToken(
  purchaseId: string,
): Promise<string> {
  return new SignJWT({
    purchaseId,
    type: 'bundle-download',
  } satisfies BundleDownloadTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verify a bundle download token. Returns the purchaseId on success,
 * null on any failure (expired, malformed, wrong type, bad signature).
 * Logs the failure reason — caller just sees null.
 */
export async function verifyBundleDownloadToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'bundle-download') {
      console.warn('[bundle-download-token] wrong type:', payload.type);
      return null;
    }
    if (typeof payload.purchaseId !== 'string') {
      console.warn('[bundle-download-token] missing purchaseId');
      return null;
    }
    return payload.purchaseId;
  } catch (error) {
    console.warn('[bundle-download-token] verify failed:', error);
    return null;
  }
}
