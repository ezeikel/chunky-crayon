import {
  faCloudRain,
  faChalkboard,
  faCakeCandles,
  faCar,
  faMoon,
  faTent,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type CraftContext = {
  slug: string;
  name: string;
  icon: IconDefinition;
  color: string;
  tags: string[];
  description: string;
};

export const CRAFT_CONTEXTS: CraftContext[] = [
  {
    slug: 'rainy-days',
    name: 'Rainy Days',
    icon: faCloudRain,
    color: 'text-crayon-blue',
    tags: ['rainy-day', 'indoor', 'quiet-activity'],
    description:
      "Quiet, screen-free coloring pages to fill a rainy afternoon without melting anyone's brain.",
  },
  {
    slug: 'classroom',
    name: 'Classroom',
    icon: faChalkboard,
    color: 'text-crayon-green',
    // 'group-activity' dropped here too — same overlap with
    // birthday-parties that caused leak through the combo extraTagsAny.
    tags: ['classroom', 'school'],
    description:
      'Group-friendly coloring pages teachers can print in bulk for the whole class.',
  },
  {
    slug: 'birthday-parties',
    name: 'Birthday Parties',
    icon: faCakeCandles,
    color: 'text-crayon-pink',
    tags: ['birthday', 'party', 'group-activity'],
    description:
      'Party-ready coloring pages that double as activity table favors and goodie-bag fillers.',
  },
  {
    slug: 'road-trips',
    name: 'Road Trips',
    icon: faCar,
    color: 'text-crayon-orange',
    tags: ['road-trip', 'travel', 'quiet-activity'],
    description:
      'Travel-sized coloring pages that survive a long car ride and keep small hands busy.',
  },
  {
    slug: 'sleepovers',
    name: 'Sleepovers',
    icon: faMoon,
    color: 'text-crayon-purple',
    tags: ['sleepover', 'evening', 'group-activity'],
    description:
      'Wind-down coloring pages for that hour between pizza and lights-out.',
  },
  {
    slug: 'summer-camp',
    name: 'Summer Camp',
    icon: faTent,
    color: 'text-crayon-yellow',
    tags: ['summer-camp', 'outdoors', 'group-activity'],
    description:
      'Camp-friendly coloring pages for rainy-day cabin afternoons and quiet rest periods.',
  },
];

export const getCraftContextBySlug = (slug: string): CraftContext | undefined =>
  CRAFT_CONTEXTS.find((c) => c.slug === slug);
