import { Suspense } from 'react';
import BillingSuccessWrapper from '@/components/BillingSuccess/BillingSuccessWrapper';
import Loading from '@/components/Loading/Loading';

// Non-async page component to avoid prerendering issues
const BillingSuccessPage = ({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[400px]">
          <Loading size="lg" />
        </div>
      }
    >
      <BillingSuccessWrapperAsync searchParams={searchParams} />
    </Suspense>
  );
};

// Async wrapper to handle searchParams
async function BillingSuccessWrapperAsync({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return <BillingSuccessWrapper sessionId={sessionId} />;
}

export default BillingSuccessPage;
