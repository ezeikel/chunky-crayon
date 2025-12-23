'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

const UnsubscribeToast = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const unsubStatus = searchParams.get('unsub');

  useEffect(() => {
    if (!unsubStatus) return;

    if (unsubStatus === 'success') {
      toast('Unsubscribed', {
        description:
          "You've been removed from our mailing list. We're sad to see you go!",
      });
    } else if (unsubStatus === 'invalid') {
      toast.error('Invalid link', {
        description: 'This unsubscribe link is invalid or has expired.',
      });
    }

    // Remove the query param from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('unsub');
    router.replace(url.pathname, { scroll: false });
  }, [unsubStatus, router]);

  return null;
};

export default UnsubscribeToast;
