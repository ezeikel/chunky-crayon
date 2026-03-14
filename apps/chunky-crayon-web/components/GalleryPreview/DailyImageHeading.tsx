'use client';

import { useTranslations } from 'next-intl';

type DailyImageHeadingProps = {
  createdAt: Date | null;
};

const DailyImageHeading = ({ createdAt }: DailyImageHeadingProps) => {
  const t = useTranslations('homepage.galleryPreview');

  // Check if it's today's image or a fallback
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const imageDate = createdAt ? new Date(createdAt) : null;
  const isToday = imageDate && imageDate >= today;

  return (
    <h3 className="font-tondo font-bold text-lg text-text-primary">
      {isToday ? t('todaysDailyPage') : t('latestDailyPage')}
    </h3>
  );
};

export default DailyImageHeading;
