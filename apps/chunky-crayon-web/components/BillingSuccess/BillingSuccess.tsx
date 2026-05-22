import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faSparkles,
  faEnvelopeOpenText,
} from '@fortawesome/pro-duotone-svg-icons';
import { PlanName } from '@one-colored-pixel/db/types';
import type { PostCheckoutSigninStatus } from '@/app/actions/stripe';
import PurchaseTracking from '@/app/[locale]/account/billing/PurchaseTracking';
import ManageSubscriptionButton from '@/components/buttons/ManageSubscriptionButton/ManageSubscriptionButton';
import FinishCreationButton from './FinishCreationButton';

type BillingSuccessProps = {
  amount: number | null;
  currency: string;
  sessionId?: string;
  productType?: 'subscription' | 'credits';
  planName?: PlanName;
  creditAmount?: number;
  isTrial?: boolean;
  signinStatus?: PostCheckoutSigninStatus;
};

const BillingSuccess = ({
  amount,
  currency,
  sessionId,
  productType = 'subscription',
  planName,
  creditAmount,
  isTrial = false,
  signinStatus = 'not_applicable',
}: BillingSuccessProps) => {
  const headlineText =
    productType === 'subscription'
      ? `You're all set${planName ? `, ${planName} pal` : ''}!`
      : 'Credits added!';
  const headlineIcon = productType === 'subscription' ? faPalette : faSparkles;
  const headlineIconColor =
    productType === 'subscription'
      ? 'text-crayon-orange'
      : 'text-crayon-yellow';
  const body =
    productType === 'subscription'
      ? 'Your plan is active and your crayons are ready. Time to make something colourful!'
      : `${creditAmount ?? ''} fresh credits are in your account, ready to colour with.`;

  // A guest buyer is signed out and has just been emailed a sign-in link.
  // ('pending' means the webhook that creates their account is still
  // catching up; the link still works once it does, so the guidance is the
  // same: check your email.) Show them what to do next instead of a
  // "Go to Billing" button that would bounce a logged-out guest.
  const needsEmailSignin =
    signinStatus === 'magic_link_sent' || signinStatus === 'pending';
  const isAuthenticated = signinStatus === 'already_authenticated';

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-crayon-orange mb-4 flex items-center justify-center gap-2">
          <span>{headlineText}</span>
          <FontAwesomeIcon icon={headlineIcon} className={headlineIconColor} />
        </h1>
        <p className="text-text-secondary">{body}</p>
        {amount !== null &&
          (() => {
            const cur = currency.toLowerCase();
            const symbol =
              cur === 'gbp'
                ? '£'
                : cur === 'usd'
                  ? '$'
                  : cur === 'eur'
                    ? '€'
                    : `${currency.toUpperCase()} `;
            return (
              <p className="text-sm text-text-secondary mt-2">
                Amount charged: {symbol}
                {(amount / 100).toFixed(2)}
              </p>
            );
          })()}
      </div>

      {needsEmailSignin && (
        <div className="mb-8 rounded-2xl bg-crayon-orange/10 px-6 py-5 text-left">
          <p className="flex items-center gap-2 font-semibold text-crayon-orange">
            <FontAwesomeIcon icon={faEnvelopeOpenText} />
            <span>Check your email to finish</span>
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            We have sent a sign-in link to the email you used at checkout. Click
            it and you will land straight on your account, where you can manage
            or cancel your plan any time.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            You can close this page once you have the email.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* If they subscribed mid-creation, the create form stashed
            their scene in localStorage before the Stripe redirect.
            This button (renders only when such a snapshot exists)
            takes them back to finish it — the primary action for a
            fresh subscriber, so it sits at the top of the stack. */}
        <FinishCreationButton />
        {isAuthenticated && (
          <Link
            href="/account/billing"
            className="inline-block bg-crayon-orange hover:bg-crayon-orange-dark text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            Go to Billing
          </Link>
        )}
        {isAuthenticated && productType === 'subscription' && (
          <ManageSubscriptionButton
            source="billing_success"
            className="text-crayon-orange hover:text-crayon-orange-dark font-medium"
          >
            Manage or cancel subscription
          </ManageSubscriptionButton>
        )}
        {needsEmailSignin && (
          <Link
            href="/signin"
            className="inline-block bg-crayon-orange hover:bg-crayon-orange-dark text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            Sign in another way
          </Link>
        )}
        <Link
          href="/"
          className="text-crayon-orange hover:text-crayon-orange-dark font-medium"
        >
          Start Colouring
        </Link>
      </div>
      {amount !== null && sessionId && (
        <PurchaseTracking
          value={amount}
          currency={currency}
          eventId={sessionId}
          productType={productType}
          planName={planName}
          creditAmount={creditAmount}
          isTrial={isTrial}
        />
      )}
    </div>
  );
};

export default BillingSuccess;
