import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  isValidEmail,
  buildEmailChangeIdentifier,
  parseEmailChangeIdentifier,
  emailChangeIdentifierPrefix,
} from './email-change-token';

/**
 * Email-change confirmation is security-critical: the identifier encodes
 * which account and which new address a one-time token applies to. A parse
 * bug could apply a change to the wrong email or accept a token for the
 * wrong user. These cases are pinned explicitly.
 */

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });
  it('rejects garbage', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('buildEmailChangeIdentifier / parseEmailChangeIdentifier', () => {
  const userId = 'cmpazl4az000004l5srwquvgu';

  it('round-trips a normal email', () => {
    const id = buildEmailChangeIdentifier(userId, 'new@example.com');
    expect(parseEmailChangeIdentifier(id, userId)).toEqual({
      newEmail: 'new@example.com',
    });
  });

  it('rejects a token whose userId does not match the caller', () => {
    const id = buildEmailChangeIdentifier(userId, 'new@example.com');
    expect(parseEmailChangeIdentifier(id, 'someone-else')).toBeNull();
  });

  it('rejects a non-email-change identifier', () => {
    expect(
      parseEmailChangeIdentifier(`other:${userId}:new@example.com`, userId),
    ).toBeNull();
  });

  it('rejects a malformed identifier', () => {
    expect(parseEmailChangeIdentifier('email-change', userId)).toBeNull();
    expect(
      parseEmailChangeIdentifier(`email-change:${userId}`, userId),
    ).toBeNull();
    expect(
      parseEmailChangeIdentifier(`email-change:${userId}:`, userId),
    ).toBeNull();
  });

  it('rejects an identifier whose email part is invalid', () => {
    expect(
      parseEmailChangeIdentifier(`email-change:${userId}:garbage`, userId),
    ).toBeNull();
  });

  it('prefix helper is stable for deleteMany scoping', () => {
    expect(emailChangeIdentifierPrefix(userId)).toBe(`email-change:${userId}:`);
  });
});
