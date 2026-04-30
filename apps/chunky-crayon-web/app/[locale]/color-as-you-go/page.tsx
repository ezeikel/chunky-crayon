import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/app/actions/user';
import Loading from '@/components/Loading/Loading';
import { SubscriptionStatus } from '@one-colored-pixel/db/types';
import ColorAsYouGoClient from './ColorAsYouGoClient';

// Server shell. We do the subscriber-redirect here so subs never see
// the inferior public-pack pricing — they go straight to /account/billing
// where the cheaper member packs live. Doing this server-side avoids
// flashing the public packs for one render before the redirect kicks
// in client-side.
const ColorAsYouGoPage = async () => {
  const user = await getCurrentUser();

  const isSubscriber = user?.subscriptions?.some(
    (sub) => sub.status === SubscriptionStatus.ACTIVE,
  );

  if (isSubscriber) {
    redirect('/account/billing');
  }

  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[600px]">
          <Loading size="lg" />
        </div>
      }
    >
      <ColorAsYouGoClient isLoggedIn={!!user} />
    </Suspense>
  );
};

export default ColorAsYouGoPage;
