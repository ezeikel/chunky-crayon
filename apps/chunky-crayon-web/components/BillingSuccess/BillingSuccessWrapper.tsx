import BillingSuccess from './BillingSuccess';
import {
  getStripeSession,
  triggerPostCheckoutSignin,
} from '@/app/actions/stripe';

type BillingSuccessWrapperProps = {
  sessionId?: string;
};

const BillingSuccessWrapper = async ({
  sessionId,
}: BillingSuccessWrapperProps) => {
  let sessionData = null;

  // Get a GUEST buyer signed in (or confirm they already are). Guest Stripe
  // checkout never establishes a session, so without this the buyer lands
  // here logged out with no way to reach what they paid for. Verified
  // server-side against Stripe; emails the existing magic link to the
  // Stripe-verified address. See triggerPostCheckoutSignin for the why.
  const signinStatus = sessionId
    ? await triggerPostCheckoutSignin(sessionId)
    : 'not_applicable';

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
      signinStatus={signinStatus}
    />
  );
};

export default BillingSuccessWrapper;
