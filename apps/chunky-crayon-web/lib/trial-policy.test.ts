import { describe, expect, it } from 'vitest';
import {
  TRIAL_GENERATION_CAP,
  isUnpaidTrial,
  isTrialSpendExhausted,
  reclaimTarget,
  shouldReclaim,
} from './trial-policy';

/**
 * Trial-abuse policy is revenue-critical: too loose and a 7-day trial drains
 * a year of paid API spend for £0; too strict and a real evaluator is
 * blocked or a paying converter loses credits. Boundaries pinned explicitly.
 */

describe('isUnpaidTrial', () => {
  it('only TRIALING is an unpaid trial', () => {
    expect(isUnpaidTrial({ status: 'TRIALING' })).toBe(true);
    expect(isUnpaidTrial({ status: 'ACTIVE' })).toBe(false);
    expect(isUnpaidTrial({ status: 'CANCELLED' })).toBe(false);
    expect(isUnpaidTrial({ status: 'EXPIRED' })).toBe(false);
    expect(isUnpaidTrial(null)).toBe(false);
    expect(isUnpaidTrial(undefined)).toBe(false);
  });
});

describe('isTrialSpendExhausted', () => {
  it('blocks at and beyond the cap, allows below', () => {
    expect(isTrialSpendExhausted(0)).toBe(false);
    expect(isTrialSpendExhausted(TRIAL_GENERATION_CAP - 1)).toBe(false);
    expect(isTrialSpendExhausted(TRIAL_GENERATION_CAP)).toBe(true);
    expect(isTrialSpendExhausted(TRIAL_GENERATION_CAP + 1)).toBe(true);
  });
  it('cap is 10', () => {
    expect(TRIAL_GENERATION_CAP).toBe(10);
    expect(isTrialSpendExhausted(9)).toBe(false);
    expect(isTrialSpendExhausted(10)).toBe(true);
  });
  it('respects a custom cap', () => {
    expect(isTrialSpendExhausted(4, 5)).toBe(false);
    expect(isTrialSpendExhausted(5, 5)).toBe(true);
  });
});

describe('reclaimTarget', () => {
  it('caps a large balance down to the free baseline', () => {
    expect(reclaimTarget(1015)).toBe(15);
    expect(reclaimTarget(16)).toBe(15);
  });
  it('leaves a balance already at/under the baseline untouched', () => {
    expect(reclaimTarget(15)).toBe(15);
    expect(reclaimTarget(3)).toBe(3);
    expect(reclaimTarget(0)).toBe(0);
  });
  it('never goes negative', () => {
    expect(reclaimTarget(-5)).toBe(0);
  });
  it('respects a custom baseline', () => {
    expect(reclaimTarget(1000, 0)).toBe(0);
    expect(reclaimTarget(1000, 50)).toBe(50);
  });
});

describe('shouldReclaim', () => {
  it('only when there is excess above the baseline', () => {
    expect(shouldReclaim(1015)).toBe(true);
    expect(shouldReclaim(16)).toBe(true);
    expect(shouldReclaim(15)).toBe(false);
    expect(shouldReclaim(0)).toBe(false);
  });
});
