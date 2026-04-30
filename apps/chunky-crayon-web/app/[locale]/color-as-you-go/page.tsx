import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getCurrentUser } from '@/app/actions/user';
import Loading from '@/components/Loading/Loading';
import { SubscriptionStatus } from '@one-colored-pixel/db/types';
import ColorAsYouGoClient from './ColorAsYouGoClient';

// Server shell — fully static, no auth read here. Auth + the
// subscriber-redirect happen inside <ColorAsYouGoGate /> below, which
// is wrapped in Suspense. With Cache Components on, calling
// getCurrentUser() at page level blocks the prerender (it reads the
// auth cookie). Pushing it into a Suspense-bounded child keeps the
// page prerenderable; only the user-specific branch is dynamic.
const ColorAsYouGoPage = () => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[600px]">
          <Loading size="lg" />
        </div>
      }
    >
      <ColorAsYouGoGate />
    </Suspense>
  );
};

const ColorAsYouGoGate = async () => {
  const user = await getCurrentUser();

  const isSubscriber = user?.subscriptions?.some(
    (sub) => sub.status === SubscriptionStatus.ACTIVE,
  );

  if (isSubscriber) {
    // Subs see the cheaper member packs in /account/billing — never
    // the inferior public pricing.
    redirect('/account/billing');
  }

  return <ColorAsYouGoClient isLoggedIn={!!user} />;
};

export default ColorAsYouGoPage;
