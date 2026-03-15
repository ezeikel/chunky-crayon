import crypto from 'node:crypto';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';
const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET!;

/**
 * Generate an HMAC-SHA256 signature for an email address.
 * Used to create tamper-proof unsubscribe URLs.
 */
export function signEmail(email: string): string {
  return crypto
    .createHmac('sha256', unsubscribeSecret)
    .update(email)
    .digest('base64url');
}

/**
 * Verify an HMAC signature for an email address.
 */
export function verifyEmailSignature(email: string, sig: string): boolean {
  const expected = signEmail(email);
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'base64url'),
    Buffer.from(expected, 'base64url'),
  );
}

export function getUnsubscribeUrl(email: string): string {
  const encoded = Buffer.from(email).toString('base64url');
  const sig = signEmail(email);
  return `${baseUrl}/unsubscribe?email=${encoded}&sig=${sig}`;
}
