import {
  faTreeChristmas,
  faPumpkin,
  faRabbit,
  faTurkey,
  faHeart,
  faSnowflake,
  faFlower,
  faSun,
  faLeaf,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type HolidayEvent = {
  slug: string;
  name: string;
  icon: IconDefinition;
  color: string;
  tags: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export const HOLIDAY_EVENTS: HolidayEvent[] = [
  {
    slug: 'christmas',
    name: 'Christmas',
    icon: faTreeChristmas,
    color: 'text-crayon-green',
    tags: ['christmas', 'santa', 'holiday'],
    description:
      'Festive Christmas coloring pages featuring Santa, snowmen, ornaments, and holiday cheer.',
    seoTitle: 'Christmas Coloring Pages - Free Printable Holiday Pages',
    seoDescription:
      'Free printable Christmas coloring pages for kids and adults. Santa, snowmen, reindeer, ornaments, and more festive designs. Color online or print!',
  },
  {
    slug: 'halloween',
    name: 'Halloween',
    icon: faPumpkin,
    color: 'text-crayon-orange',
    tags: ['halloween', 'pumpkin', 'spooky'],
    description:
      'Spooky and fun Halloween coloring pages with pumpkins, friendly ghosts, and costumes.',
    seoTitle: 'Halloween Coloring Pages - Free Printable Spooky Pages',
    seoDescription:
      'Free printable Halloween coloring pages. Pumpkins, friendly ghosts, witches, and spooky fun designs for kids. Color online or print!',
  },
  {
    slug: 'easter',
    name: 'Easter',
    icon: faRabbit,
    color: 'text-crayon-purple',
    tags: ['easter', 'bunny', 'eggs'],
    description:
      'Cheerful Easter coloring pages with bunnies, decorated eggs, and spring flowers.',
    seoTitle: 'Easter Coloring Pages - Free Printable Spring Pages',
    seoDescription:
      'Free printable Easter coloring pages. Easter bunnies, decorated eggs, spring flowers, and more. Color online or print!',
  },
  {
    slug: 'thanksgiving',
    name: 'Thanksgiving',
    icon: faTurkey,
    color: 'text-crayon-orange',
    tags: ['thanksgiving', 'autumn'],
    description:
      'Thanksgiving coloring pages featuring turkeys, autumn leaves, and harvest themes.',
    seoTitle: 'Thanksgiving Coloring Pages - Free Printable Autumn Pages',
    seoDescription:
      'Free printable Thanksgiving coloring pages. Turkeys, autumn leaves, pumpkins, and harvest designs. Color online or print!',
  },
  {
    slug: 'valentines-day',
    name: "Valentine's Day",
    icon: faHeart,
    color: 'text-crayon-pink',
    tags: ['valentine', 'hearts', 'love'],
    description:
      "Valentine's Day coloring pages with hearts, flowers, and messages of love and friendship.",
    seoTitle: "Valentine's Day Coloring Pages - Free Printable Heart Pages",
    seoDescription:
      "Free printable Valentine's Day coloring pages. Hearts, flowers, and friendship designs for kids. Color online or print!",
  },
  {
    slug: 'winter',
    name: 'Winter',
    icon: faSnowflake,
    color: 'text-crayon-blue',
    tags: ['winter', 'snow'],
    description:
      'Winter-themed coloring pages with snowflakes, snowmen, and cozy winter scenes.',
    seoTitle: 'Winter Coloring Pages - Free Printable Snow & Ice Pages',
    seoDescription:
      'Free printable winter coloring pages. Snowflakes, snowmen, and cozy winter scenes. Color online or print!',
  },
  {
    slug: 'spring',
    name: 'Spring',
    icon: faFlower,
    color: 'text-crayon-green',
    tags: ['spring'],
    description:
      'Spring coloring pages with blooming flowers, butterflies, and sunny outdoor scenes.',
    seoTitle: 'Spring Coloring Pages - Free Printable Flower Pages',
    seoDescription:
      'Free printable spring coloring pages. Blooming flowers, butterflies, gardens, and sunny scenes. Color online or print!',
  },
  {
    slug: 'summer',
    name: 'Summer',
    icon: faSun,
    color: 'text-crayon-yellow',
    tags: ['summer'],
    description:
      'Summer coloring pages featuring beach scenes, sunshine, and outdoor adventures.',
    seoTitle: 'Summer Coloring Pages - Free Printable Beach Pages',
    seoDescription:
      'Free printable summer coloring pages. Beach scenes, sunshine, ice cream, and outdoor fun. Color online or print!',
  },
  {
    slug: 'autumn',
    name: 'Autumn',
    icon: faLeaf,
    color: 'text-crayon-yellow',
    tags: ['autumn'],
    description:
      'Autumn coloring pages with falling leaves, harvest scenes, and cozy fall themes.',
    seoTitle: 'Autumn Coloring Pages - Free Printable Fall Pages',
    seoDescription:
      'Free printable autumn coloring pages. Falling leaves, harvest scenes, and cozy fall designs. Color online or print!',
  },
];

export const getHolidayEventBySlug = (slug: string): HolidayEvent | undefined =>
  HOLIDAY_EVENTS.find((e) => e.slug === slug);
