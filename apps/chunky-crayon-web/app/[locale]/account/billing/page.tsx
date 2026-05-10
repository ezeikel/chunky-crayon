import { Suspense } from 'react';
import BillingWrapper from '@/components/Billing/BillingWrapper';
import Loading from '@/components/Loading/Loading';

type BillingPageProps = {
  searchParams: Promise<{ currency?: string }>;
};

// This page can be mostly static - only the user-specific data needs Suspense
const BillingPage = ({ searchParams }: BillingPageProps) => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[600px]">
          <Loading size="lg" />
        </div>
      }
    >
      <BillingWrapper searchParams={searchParams} />
    </Suspense>
  );
};

export default BillingPage;
