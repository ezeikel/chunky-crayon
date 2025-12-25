import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImages,
  faCalendarStar,
  faUsers,
} from '@fortawesome/pro-duotone-svg-icons';
import { getGalleryStats } from '@/app/data/gallery';
import cn from '@/utils/cn';

type SocialProofStatsProps = {
  className?: string;
};

const SocialProofStats = async ({ className }: SocialProofStatsProps) => {
  const stats = await getGalleryStats();

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  const statItems = [
    {
      icon: faImages,
      value: stats.totalImages.toLocaleString(),
      label: 'Coloring Pages Created',
    },
    {
      icon: faCalendarStar,
      value: stats.dailyImages.toLocaleString(),
      label: 'Daily Pages',
    },
    {
      icon: faUsers,
      value: stats.communityImages.toLocaleString(),
      label: 'Free Library Pages',
    },
  ];

  return (
    <section className={cn('w-full py-8 md:py-10', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-paper-cream-dark shadow-sm hover:shadow-md transition-shadow"
          >
            <FontAwesomeIcon
              icon={stat.icon}
              className="text-3xl md:text-4xl mb-3"
              style={iconStyle}
            />
            <span className="font-tondo font-bold text-3xl md:text-4xl text-text-primary mb-1">
              {stat.value}+
            </span>
            <span className="text-text-secondary text-sm md:text-base">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SocialProofStats;
