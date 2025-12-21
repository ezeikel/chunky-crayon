import Link from 'next/link';
import { PlanName } from '@chunky-crayon/db/types';
import PurchaseTracking from '@/app/account/billing/PurchaseTracking';

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
  productType = 'credits',
  planName,
  creditAmount,
}: BillingSuccessProps) => (
  <div>
    <h1>Thanks for your purchase!</h1>
    <Link href="/account/billing">Go to billing</Link>
    {amount !== null && sessionId && (
      <PurchaseTracking
        value={amount}
        currency={currency}
        transactionId={sessionId}
        quantity={1}
        productType={productType}
        planName={planName}
        creditAmount={creditAmount}
      />
    )}
  </div>
);

export default BillingSuccess;
