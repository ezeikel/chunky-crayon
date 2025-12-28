import { getTranslations } from 'next-intl/server';
import {
  faImages,
  faCalendarStar,
  faUsers,
} from '@fortawesome/pro-duotone-svg-icons';
import { getGalleryStats } from '@/app/data/gallery';
import cn from '@/utils/cn';
import AnimatedStatCard from './AnimatedStatCard';
import AnimatedStatsContainer from './AnimatedStatsContainer';

type SocialProofStatsProps = {
  className?: string;
};

const SocialProofStats = async ({ className }: SocialProofStatsProps) => {
  const t = await getTranslations('homepage.stats');
  const stats = await getGalleryStats();

  const statItems = [
    {
      icon: faImages,
      value: stats.totalImages,
      label: t('coloringPagesCreated'),
    },
    {
      icon: faCalendarStar,
      value: stats.dailyImages,
      label: t('dailyPages'),
    },
    {
      icon: faUsers,
      value: stats.communityImages,
      label: t('freeLibraryPages'),
    },
  ];

  return (
    <section className={cn('w-full py-8 md:py-10', className)}>
      <AnimatedStatsContainer className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
        {statItems.map((stat, index) => (
          <AnimatedStatCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            index={index}
          />
        ))}
      </AnimatedStatsContainer>
    </section>
  );
};

export default SocialProofStats;
