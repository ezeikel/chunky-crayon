import BillingSuccess from '@/components/BillingSuccess/BillingSuccess';
import { getStripeSession } from '@/app/actions/stripe';

const BillingSuccessPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) => {
  let sessionData = null;
  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    sessionData = await getStripeSession(sessionId);
  }

  return (
    <BillingSuccess
      amount={sessionData?.amount_total ? sessionData.amount_total / 100 : null}
      currency={sessionData?.currency?.toUpperCase() || 'GBP'}
      sessionId={sessionId}
    />
  );
};

export default BillingSuccessPage;
