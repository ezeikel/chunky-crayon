import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CURRENCY,
  getCurrencyForCountry,
  isCurrency,
} from './currency';

/**
 * Currency resolution drives which Stripe price (and therefore which
 * amount) a visitor is shown. Defaulting wrong = charging the wrong
 * amount or showing the wrong symbol, so the fallback behaviour is
 * pinned explicitly.
 */

describe('getCurrencyForCountry', () => {
  it('maps the US to USD', () => {
    expect(getCurrencyForCountry('US')).toBe('USD');
    expect(getCurrencyForCountry('us')).toBe('USD'); // case-insensitive
  });

  it('falls back to the default currency for unmapped countries', () => {
    expect(getCurrencyForCountry('FR')).toBe(DEFAULT_CURRENCY);
    expect(getCurrencyForCountry('DE')).toBe(DEFAULT_CURRENCY);
  });

  it('falls back to the default currency for null/undefined/empty input', () => {
    expect(getCurrencyForCountry(null)).toBe(DEFAULT_CURRENCY);
    expect(getCurrencyForCountry(undefined)).toBe(DEFAULT_CURRENCY);
    expect(getCurrencyForCountry('')).toBe(DEFAULT_CURRENCY);
  });

  it('keeps GBP as the default (UK-first product)', () => {
    expect(DEFAULT_CURRENCY).toBe('GBP');
  });
});

describe('isCurrency', () => {
  it('accepts supported currency codes', () => {
    expect(isCurrency('GBP')).toBe(true);
    expect(isCurrency('USD')).toBe(true);
  });

  it('rejects anything not in the supported list', () => {
    expect(isCurrency('EUR')).toBe(false);
    expect(isCurrency('gbp')).toBe(false); // exact case required
    expect(isCurrency('')).toBe(false);
  });
});
