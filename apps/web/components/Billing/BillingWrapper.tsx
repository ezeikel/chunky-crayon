import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/user';
import Billing from './Billing';

const BillingWrapper = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/signin');
  }

  return <Billing user={user} />;
};

export default BillingWrapper;
