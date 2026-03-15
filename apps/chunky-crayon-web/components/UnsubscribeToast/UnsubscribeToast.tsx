'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const UnsubscribeToast = () => {
  const t = useTranslations('email');
  const searchParams = useSearchParams();
  const router = useRouter();
  const unsubStatus = searchParams.get('unsub');

  useEffect(() => {
    if (!unsubStatus) return;

    if (unsubStatus === 'success') {
      toast(t('unsubscribe.success'), {
        description: t('unsubscribe.successDescription'),
      });
    } else if (unsubStatus === 'invalid') {
      toast.error(t('unsubscribe.invalid'), {
        description: t('unsubscribe.invalidDescription'),
      });
    }

    // Remove the query param from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('unsub');
    router.replace(url.pathname, { scroll: false });
  }, [unsubStatus, router, t]);

  return null;
};

export default UnsubscribeToast;
