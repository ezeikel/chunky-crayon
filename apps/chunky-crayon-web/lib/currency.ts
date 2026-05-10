// Client-safe currency types and constants. Anything that touches
// next/headers lives in `lib/currency.server.ts` so client components
// can import from this module without dragging server-only APIs into
// the browser bundle.

export type Currency = 'GBP' | 'USD';

export const SUPPORTED_CURRENCIES: readonly Currency[] = [
  'GBP',
  'USD',
] as const;

export const DEFAULT_CURRENCY: Currency = 'GBP';

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
};

const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  US: 'USD',
};

export const getCurrencyForCountry = (
  countryCode: string | null | undefined,
): Currency => {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
};

export const isCurrency = (value: string): value is Currency =>
  (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
