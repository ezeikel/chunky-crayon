import Link from 'next/link';
import PurchaseTracking from '@/app/account/billing/PurchaseTracking';

type BillingSuccessProps = {
  amount: number | null;
  currency: string;
  sessionId?: string;
};

const BillingSuccess = ({
  amount,
  currency,
  sessionId,
}: BillingSuccessProps) => (
  <div>
    <h1>Thanks for your purchase!</h1>
    <Link href="/account/billing">Go to billing</Link>
    {amount !== null && sessionId && (
      <PurchaseTracking
        value={amount}
        currency={currency}
        eventId={`stripe_purchase_${sessionId}`}
        quantity={1}
      />
    )}
  </div>
);

export default BillingSuccess;
