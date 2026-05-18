/**
 * @vitest-environment node
 *
 * jose's webapi build does an `instanceof Uint8Array` check that fails
 * under jsdom (jsdom provides a different Uint8Array realm). This module
 * is pure Node crypto with zero DOM, so it must run in the node
 * environment.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';

/**
 * Bundle download tokens ARE the auth for paid, guest bundle downloads
 * (buyer paid via Stripe Checkout with just an email, no session). If
 * verification accepts a token of the wrong type, a forged signature, or a
 * malformed payload, a paid product leaks for free. The type discriminator
 * exists specifically so a NextAuth/mobile token can never be replayed
 * here — that guard is pinned below.
 */

type TokenModule = typeof import('./bundle-download-token');
let mod: TokenModule;
const SECRET = 'test-bundle-secret';

beforeAll(async () => {
  process.env.NEXT_AUTH_SECRET = SECRET;
  mod = await import('./bundle-download-token');
});

describe('signBundleDownloadToken / verifyBundleDownloadToken', () => {
  it('round-trips a purchase id', async () => {
    const token = await mod.signBundleDownloadToken('purchase_123');
    expect(await mod.verifyBundleDownloadToken(token)).toBe('purchase_123');
  });

  it('returns null for a garbage / non-JWT string', async () => {
    expect(await mod.verifyBundleDownloadToken('not-a-jwt')).toBeNull();
    expect(await mod.verifyBundleDownloadToken('')).toBeNull();
  });

  it('returns null when the signature does not match our secret', async () => {
    const { SignJWT: Sign } = await import('jose');
    const forged = await new Sign({
      purchaseId: 'purchase_123',
      type: 'bundle-download',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('14d')
      .sign(new TextEncoder().encode('a-different-secret'));

    expect(await mod.verifyBundleDownloadToken(forged)).toBeNull();
  });

  it('rejects a correctly-signed token whose type is not bundle-download', async () => {
    // Same secret, valid signature — but a NextAuth-shaped payload. Must
    // be refused so other token classes can't be replayed here.
    const sneaky = await new SignJWT({
      purchaseId: 'purchase_123',
      type: 'session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('14d')
      .sign(new TextEncoder().encode(SECRET));

    expect(await mod.verifyBundleDownloadToken(sneaky)).toBeNull();
  });

  it('rejects a token missing the purchaseId claim', async () => {
    const noPurchase = await new SignJWT({ type: 'bundle-download' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('14d')
      .sign(new TextEncoder().encode(SECRET));

    expect(await mod.verifyBundleDownloadToken(noPurchase)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expired = await new SignJWT({
      purchaseId: 'purchase_123',
      type: 'bundle-download',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(0)
      .setExpirationTime(1) // epoch+1s — long past
      .sign(new TextEncoder().encode(SECRET));

    expect(await mod.verifyBundleDownloadToken(expired)).toBeNull();
  });
});
