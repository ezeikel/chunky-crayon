import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/user';
import { getCurrencyForRequest } from '@/lib/currency.server';
import Billing from './Billing';

type BillingWrapperProps = {
  searchParams: Promise<{ currency?: string }>;
};

const BillingWrapper = async ({ searchParams }: BillingWrapperProps) => {
  const search = await searchParams;
  const [user, currency] = await Promise.all([
    getCurrentUser(),
    getCurrencyForRequest(search.currency),
  ]);

  if (!user) {
    redirect('/signin');
  }

  return <Billing user={user} currency={currency} />;
};

export default BillingWrapper;
