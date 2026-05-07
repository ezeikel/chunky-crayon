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
      amount={sessionData?.amount_total ?? null}
      currency={sessionData?.currency || 'gbp'}
      sessionId={sessionId}
      productType={sessionData?.productType}
      planName={sessionData?.planName}
      creditAmount={sessionData?.creditAmount}
      isTrial={sessionData?.isTrial ?? false}
    />
  );
};

export default BillingSuccessWrapper;
