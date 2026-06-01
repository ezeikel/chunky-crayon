import { describe, expect, it } from 'vitest';
import { computeMergedCredits } from './mobile-auth-credits';

/**
 * Revenue-critical: when an anonymous device user signs into an email account,
 * their credits must be CARRIED (summed), never dropped or double-counted.
 * The RevenueCat TRANSFER webhook grants no credits, so this sum is the only
 * credit movement on login — these cases lock that contract.
 */
describe('computeMergedCredits', () => {
  it('returns 0 when both balances are 0', () => {
    expect(computeMergedCredits(0, 0)).toBe(0);
  });

  it('sums anon + target (anon subscriber merging into a fresh email user)', () => {
    expect(computeMergedCredits(250, 15)).toBe(265);
  });

  it('keeps target credits when anon has none', () => {
    expect(computeMergedCredits(0, 500)).toBe(500);
  });

  it('carries anon credits when target is empty', () => {
    expect(computeMergedCredits(500, 0)).toBe(500);
  });

  it('is commutative', () => {
    expect(computeMergedCredits(123, 77)).toBe(computeMergedCredits(77, 123));
  });

  it('clamps negative drift to 0 (never grants negative)', () => {
    expect(computeMergedCredits(-5, 10)).toBe(5);
    expect(computeMergedCredits(0, -3)).toBe(0);
    expect(computeMergedCredits(-10, -10)).toBe(0);
  });

  it('treats null/undefined balances as 0 (defensive)', () => {
    expect(computeMergedCredits(undefined as never, 10)).toBe(10);
    expect(computeMergedCredits(10, null as never)).toBe(10);
  });
});
