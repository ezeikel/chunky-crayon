import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImages,
  faPalette,
  faUsers,
  faSun,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import cn from '@/utils/cn';

/**
 * Gallery stats row.
 *
 * Was an inlined 4-column flex of naked tondo numbers on the page
 * background — read as raw "1,280 1,235 45 50" floating in dead space,
 * none of CC's chunky chrome. Extracted + redesigned to match the
 * brand modal/card vocabulary used everywhere else (PaywallModal,
 * FeedbackDialog, character tiles): bordered chunky cards, FA duotone
 * icons in tinted brand-colour circles, big tondo number, friendly
 * label. Same four counts as before (total / our / community / daily)
 * but each becomes a proper stat tile.
 *
 * The icon for "Daily" is a sun (faSun) — daily-image reads as
 * sunshine, calendar/star felt off. Colour mapping:
 *   total      = crayon-orange  (brand primary, the headline number)
 *   our        = crayon-green   (we made these)
 *   community  = crayon-purple  (people / community)
 *   daily      = crayon-yellow  (sunshine — was crayon-blue, which
 *                                CC barely uses; switched to keep the
 *                                row inside the warm core palette)
 */

type Stat = {
  icon: IconDefinition;
  value: number;
  label: string;
  /** Colour key, used for both the value text and the icon circle. */
  tone: 'orange' | 'green' | 'purple' | 'yellow';
};

// Per-tone classes pulled out so the tile JSX stays clean. Tailwind
// needs the full class strings statically, hence the literal map.
const TONE_VALUE: Record<Stat['tone'], string> = {
  orange: 'text-crayon-orange',
  green: 'text-crayon-green',
  purple: 'text-crayon-purple',
  yellow: 'text-crayon-yellow-dark',
};

const TONE_ICON_BG: Record<Stat['tone'], string> = {
  orange: 'bg-crayon-orange/10',
  green: 'bg-crayon-green/10',
  purple: 'bg-crayon-purple/10',
  yellow: 'bg-crayon-yellow/15',
};

const TONE_DUOTONE: Record<Stat['tone'], React.CSSProperties> = {
  orange: {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties,
  green: {
    '--fa-primary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties,
  purple: {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties,
  yellow: {
    '--fa-primary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties,
};

export type GalleryStatsData = {
  totalImages: number;
  systemImages: number;
  communityImages: number;
  dailyImages: number;
};

export type GalleryStatsLabels = {
  totalPages: string;
  ourPages: string;
  communityPages: string;
  dailyPages: string;
};

type GalleryStatsProps = {
  stats: GalleryStatsData;
  /**
   * Translated labels — the app owns i18n so this presentation
   * component stays pure and storyable. The route's data-loading
   * wrapper passes them in.
   */
  labels: GalleryStatsLabels;
  className?: string;
};

const GalleryStats = ({ stats, labels, className }: GalleryStatsProps) => {
  const items: Stat[] = [
    {
      icon: faImages,
      value: stats.totalImages,
      label: labels.totalPages,
      tone: 'orange',
    },
    {
      icon: faPalette,
      value: stats.systemImages,
      label: labels.ourPages,
      tone: 'green',
    },
    {
      icon: faUsers,
      value: stats.communityImages,
      label: labels.communityPages,
      tone: 'purple',
    },
    {
      icon: faSun,
      value: stats.dailyImages,
      label: labels.dailyPages,
      tone: 'yellow',
    },
  ];

  return (
    <div
      className={cn(
        'mb-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5',
        className,
      )}
    >
      {items.map((stat) => (
        <article
          key={stat.label}
          className="flex flex-col items-center gap-3 rounded-3xl border-2 border-paper-cream-dark bg-white p-5 text-center shadow-card"
        >
          <span
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              TONE_ICON_BG[stat.tone],
            )}
          >
            <FontAwesomeIcon
              icon={stat.icon}
              className="text-2xl"
              style={TONE_DUOTONE[stat.tone]}
            />
          </span>
          <p
            className={cn(
              'font-tondo text-3xl font-bold leading-none md:text-4xl',
              TONE_VALUE[stat.tone],
            )}
          >
            {stat.value.toLocaleString()}
          </p>
          <p className="font-tondo text-sm font-bold text-text-secondary">
            {stat.label}
          </p>
        </article>
      ))}
    </div>
  );
};

export default GalleryStats;
