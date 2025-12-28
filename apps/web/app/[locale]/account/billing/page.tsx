import { Suspense } from 'react';
import BillingWrapper from '@/components/Billing/BillingWrapper';
import Loading from '@/components/Loading/Loading';

// This page can be mostly static - only the user-specific data needs Suspense
const BillingPage = () => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[600px]">
          <Loading size="lg" />
        </div>
      }
    >
      <BillingWrapper />
    </Suspense>
  );
};

export default BillingPage;
