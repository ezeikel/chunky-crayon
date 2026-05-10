import 'server-only';
import { headers } from 'next/headers';
import { getCurrencyForCountry, isCurrency, type Currency } from './currency';

export const getCurrencyForRequest = async (
  // Dev-only override. Pages may pass searchParams.currency through so a
  // local tester can flip currencies via ?currency=USD without a VPN.
  // Ignored entirely outside development.
  devOverride?: string,
): Promise<Currency> => {
  if (process.env.NODE_ENV === 'development' && devOverride) {
    const upper = devOverride.toUpperCase();
    if (isCurrency(upper)) return upper;
  }

  const h = await headers();
  const country = h.get('x-vercel-ip-country');
  return getCurrencyForCountry(country);
};
