'use client';

import { useFeatureFlagEnabled } from 'posthog-js/react';
import AppStoreButtons from '@/components/AppStoreButtons';

type AppStoreSectionProps = {
  label: string;
};

const AppStoreSection = ({ label }: AppStoreSectionProps) => {
  const showAppStore = useFeatureFlagEnabled('show-app-store-button');
  const showPlayStore = useFeatureFlagEnabled('show-play-store-button');

  if (!showAppStore && !showPlayStore) return null;

  return (
    <div className="mt-6">
      <h3 className="font-bold text-lg mb-2">{label}</h3>
      <AppStoreButtons location="footer" />
    </div>
  );
};

export default AppStoreSection;
