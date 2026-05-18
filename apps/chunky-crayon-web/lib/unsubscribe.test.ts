/**
 * @vitest-environment node
 */
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Unsubscribe links are HMAC-signed so a recipient can't unsubscribe an
 * arbitrary third party by editing the email in the URL. A regression that
 * weakens or skips the signature check is a deliverability + compliance
 * incident (you'd honour forged unsubscribes / accept tampered ones).
 *
 * unsubscribe.ts reads UNSUBSCRIBE_SECRET at module-load, so we set it and
 * NEXT_PUBLIC_BASE_URL before a dynamic import.
 */

type UnsubModule = typeof import('./unsubscribe');
let mod: UnsubModule;

beforeAll(async () => {
  process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://example.test';
  mod = await import('./unsubscribe');
});

describe('signEmail', () => {
  it('is deterministic for the same email', () => {
    expect(mod.signEmail('a@b.com')).toBe(mod.signEmail('a@b.com'));
  });

  it('produces different signatures for different emails', () => {
    expect(mod.signEmail('a@b.com')).not.toBe(mod.signEmail('c@d.com'));
  });

  it('emits url-safe base64 (no +, /, or = padding)', () => {
    const sig = mod.signEmail('someone+tag@example.com');
    expect(sig).not.toMatch(/[+/=]/);
  });
});

describe('verifyEmailSignature', () => {
  it('accepts a signature produced by signEmail', () => {
    const email = 'parent@example.com';
    expect(mod.verifyEmailSignature(email, mod.signEmail(email))).toBe(true);
  });

  it('rejects a valid-length signature that is wrong (tamper resistance)', () => {
    const wrong = mod.signEmail('attacker@evil.com');
    expect(mod.verifyEmailSignature('victim@example.com', wrong)).toBe(false);
  });

  it('rejects a signature bound to a different email', () => {
    const sig = mod.signEmail('a@b.com');
    expect(mod.verifyEmailSignature('different@b.com', sig)).toBe(false);
  });

  it('throws on a length-mismatched signature (documents timingSafeEqual behaviour)', () => {
    // crypto.timingSafeEqual requires equal-length buffers; a garbage/short
    // sig throws rather than returning false. Callers MUST wrap this in
    // try/catch — this test exists so that contract can't silently change.
    expect(() => mod.verifyEmailSignature('a@b.com', 'short')).toThrowError();
  });
});

describe('getUnsubscribeUrl', () => {
  it('embeds the base64url-encoded email and a matching signature', () => {
    const email = 'family@example.com';
    const url = new URL(mod.getUnsubscribeUrl(email));

    expect(url.origin).toBe('https://example.test');
    expect(url.pathname).toBe('/unsubscribe');

    const encoded = url.searchParams.get('email')!;
    const sig = url.searchParams.get('sig')!;
    expect(Buffer.from(encoded, 'base64url').toString()).toBe(email);
    expect(mod.verifyEmailSignature(email, sig)).toBe(true);
  });
});
