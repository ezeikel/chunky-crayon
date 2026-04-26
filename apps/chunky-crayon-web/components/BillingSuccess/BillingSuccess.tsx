import Link from 'next/link';
import { PlanName } from '@one-colored-pixel/db/types';
import PurchaseTracking from '@/app/[locale]/account/billing/PurchaseTracking';

type BillingSuccessProps = {
  amount: number | null;
  currency: string;
  sessionId?: string;
  productType?: 'subscription' | 'credits';
  planName?: PlanName;
  creditAmount?: number;
};

const BillingSuccess = ({
  amount,
  currency,
  sessionId,
  productType = 'subscription',
  planName,
  creditAmount,
}: BillingSuccessProps) => {
  const headline =
    productType === 'subscription'
      ? `You're all set${planName ? `, ${planName} pal` : ''}! 🎨`
      : `Credits added! ✨`;
  const body =
    productType === 'subscription'
      ? 'Your plan is active and your crayons are ready. Time to make something colourful!'
      : `${creditAmount ?? ''} fresh credits are in your account, ready to colour with.`;

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-crayon-orange mb-4">
          {headline}
        </h1>
        <p className="text-text-secondary">{body}</p>
        {amount !== null && (
          <p className="text-sm text-text-secondary mt-2">
            Amount charged: {currency === 'gbp' ? '£' : currency.toUpperCase()}{' '}
            {(amount / 100).toFixed(2)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Link
          href="/account/billing"
          className="inline-block bg-crayon-orange hover:bg-crayon-orange-dark text-white px-6 py-3 rounded-full font-semibold transition-colors"
        >
          Go to Billing
        </Link>
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
        />
      )}
    </div>
  );
};

export default BillingSuccess;
