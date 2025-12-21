import BillingSuccess from './BillingSuccess';
import { getStripeSession } from '@/app/actions/stripe';

type BillingSuccessWrapperProps = {
  sessionId?: string;
};

const BillingSuccessWrapper = async ({
  sessionId,
}: BillingSuccessWrapperProps) => {
  let sessionData = null;

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

export default BillingSuccessWrapper;
