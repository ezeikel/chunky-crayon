/**
 * Seasonal Calendar
 *
 * Globally inclusive calendar of seasonal events, holidays, and observances
 * used to generate contextually-aware daily coloring page descriptions.
 */

export type SeasonalEvent = {
  name: string;
  /** MM-DD start (inclusive). For events that span year boundaries, startDate > endDate. */
  startDate: string;
  /** MM-DD end (inclusive) */
  endDate: string;
  themes: string[];
  region:
    | 'global'
    | 'northern'
    | 'southern'
    | 'east-asia'
    | 'south-asia'
    | 'middle-east'
    | 'americas'
    | 'europe'
    | 'africa';
  childFriendlyDescription: string;
};

/**
 * Curated calendar of ~50 globally inclusive events.
 * Dates are approximate to cover the typical range each year.
 */
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  // ── January ──
  {
    name: 'New Year',
    startDate: '01-01',
    endDate: '01-02',
    themes: ['celebration', 'fireworks', 'fresh start', 'party hats'],
    region: 'global',
    childFriendlyDescription:
      'People around the world celebrate the start of a brand new year!',
  },
  {
    name: 'Winter (Northern Hemisphere)',
    startDate: '12-21',
    endDate: '03-19',
    themes: [
      'snow',
      'snowman',
      'warm clothes',
      'hot cocoa',
      'sledding',
      'ice skating',
    ],
    region: 'northern',
    childFriendlyDescription:
      "It's cold and snowy! Time for warm mittens and building snowmen.",
  },
  {
    name: 'Summer (Southern Hemisphere)',
    startDate: '12-21',
    endDate: '03-19',
    themes: ['beach', 'swimming', 'sunshine', 'ice cream', 'sandcastle'],
    region: 'southern',
    childFriendlyDescription:
      "It's warm and sunny! Perfect for the beach and swimming.",
  },
  {
    name: 'Chinese New Year / Lunar New Year',
    startDate: '01-20',
    endDate: '02-15',
    themes: [
      'dragon',
      'lantern',
      'red envelope',
      'lion dance',
      'fireworks',
      'zodiac animals',
      'dumpling',
    ],
    region: 'east-asia',
    childFriendlyDescription:
      'Families celebrate with dragon dances, lanterns, and yummy dumplings!',
  },
  // ── February ──
  {
    name: 'Groundhog Day',
    startDate: '02-02',
    endDate: '02-02',
    themes: ['groundhog', 'shadow', 'spring prediction', 'cute animal'],
    region: 'americas',
    childFriendlyDescription:
      'A cute groundhog comes out to look for its shadow!',
  },
  {
    name: "Valentine's Day",
    startDate: '02-12',
    endDate: '02-14',
    themes: ['hearts', 'love', 'friendship', 'flowers', 'cards', 'kindness'],
    region: 'global',
    childFriendlyDescription:
      'A day to show love and kindness to friends and family!',
  },
  {
    name: 'Carnival / Mardi Gras',
    startDate: '02-10',
    endDate: '03-05',
    themes: [
      'masks',
      'parade',
      'colorful costumes',
      'music',
      'dancing',
      'feathers',
    ],
    region: 'americas',
    childFriendlyDescription:
      'A big, colorful party with masks, costumes, and parades!',
  },
  // ── March ──
  {
    name: 'Holi',
    startDate: '03-01',
    endDate: '03-20',
    themes: ['colors', 'powder', 'spring', 'celebration', 'dancing', 'rainbow'],
    region: 'south-asia',
    childFriendlyDescription:
      'The Festival of Colors! People throw colored powder and celebrate spring!',
  },
  {
    name: 'Nowruz (Persian New Year)',
    startDate: '03-19',
    endDate: '03-24',
    themes: [
      'spring',
      'table setting',
      'goldfish',
      'sprouts',
      'new beginning',
      'flowers',
    ],
    region: 'middle-east',
    childFriendlyDescription:
      'A spring new year celebration with flowers, goldfish, and fresh sprouts!',
  },
  {
    name: "St. Patrick's Day",
    startDate: '03-16',
    endDate: '03-17',
    themes: ['shamrock', 'rainbow', 'pot of gold', 'leprechaun', 'green'],
    region: 'europe',
    childFriendlyDescription:
      'Everything turns green! Look for shamrocks and rainbows!',
  },
  {
    name: 'World Book Day',
    startDate: '03-01',
    endDate: '03-03',
    themes: [
      'books',
      'reading',
      'stories',
      'library',
      'characters',
      'imagination',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day to celebrate books, reading, and all the amazing stories in the world!',
  },
  {
    name: 'Spring (Northern Hemisphere)',
    startDate: '03-20',
    endDate: '06-19',
    themes: [
      'flowers',
      'butterflies',
      'baby animals',
      'rain',
      'rainbow',
      'garden',
      'birds',
    ],
    region: 'northern',
    childFriendlyDescription:
      'Flowers bloom and baby animals appear! Spring is here!',
  },
  {
    name: 'Autumn (Southern Hemisphere)',
    startDate: '03-20',
    endDate: '06-19',
    themes: ['leaves', 'harvest', 'cozy', 'warm colors', 'acorn', 'squirrel'],
    region: 'southern',
    childFriendlyDescription:
      'Leaves turn beautiful colors and fall from the trees!',
  },
  // ── April ──
  {
    name: 'Easter',
    startDate: '03-22',
    endDate: '04-25',
    themes: [
      'Easter eggs',
      'bunny',
      'spring flowers',
      'chick',
      'basket',
      'egg hunt',
    ],
    region: 'global',
    childFriendlyDescription:
      'Time for Easter egg hunts, cute bunnies, and spring flowers!',
  },
  {
    name: 'Ramadan',
    startDate: '02-28',
    endDate: '04-10',
    themes: [
      'crescent moon',
      'lantern',
      'stars',
      'kindness',
      'sharing food',
      'family',
    ],
    region: 'middle-east',
    childFriendlyDescription:
      'A special month of kindness, sharing, and beautiful lanterns under the moon!',
  },
  {
    name: 'Eid al-Fitr',
    startDate: '03-28',
    endDate: '04-12',
    themes: ['celebration', 'sweets', 'family', 'new clothes', 'gifts', 'moon'],
    region: 'middle-east',
    childFriendlyDescription:
      'A joyful celebration with sweets, new clothes, and family fun!',
  },
  {
    name: 'Earth Day',
    startDate: '04-20',
    endDate: '04-22',
    themes: [
      'planet Earth',
      'trees',
      'recycling',
      'nature',
      'animals',
      'ocean',
      'garden',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day to love and take care of our beautiful planet!',
  },
  // ── May ──
  {
    name: "Mother's Day",
    startDate: '05-08',
    endDate: '05-14',
    themes: ['flowers', 'hearts', 'family', 'love', 'breakfast', 'card'],
    region: 'global',
    childFriendlyDescription:
      'A special day to celebrate moms and mother figures!',
  },
  {
    name: 'Vesak (Buddha Day)',
    startDate: '05-01',
    endDate: '05-25',
    themes: ['lotus flower', 'lantern', 'peace', 'candles', 'nature'],
    region: 'south-asia',
    childFriendlyDescription:
      'A peaceful celebration with lotus flowers and glowing lanterns!',
  },
  // ── June ──
  {
    name: "International Children's Day",
    startDate: '06-01',
    endDate: '06-01',
    themes: [
      'children playing',
      'games',
      'friendship',
      'toys',
      'happiness',
      'playground',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day all about kids! Playing, having fun, and being happy!',
  },
  {
    name: "Father's Day",
    startDate: '06-15',
    endDate: '06-21',
    themes: ['family', 'sports', 'tools', 'love', 'outdoors', 'card'],
    region: 'global',
    childFriendlyDescription:
      'A special day to celebrate dads and father figures!',
  },
  {
    name: 'Summer Solstice',
    startDate: '06-20',
    endDate: '06-21',
    themes: ['sunshine', 'longest day', 'flowers', 'outdoor fun', 'picnic'],
    region: 'northern',
    childFriendlyDescription: 'The longest and brightest day of the year!',
  },
  {
    name: 'Summer (Northern Hemisphere)',
    startDate: '06-20',
    endDate: '09-21',
    themes: [
      'beach',
      'swimming',
      'ice cream',
      'camping',
      'sunshine',
      'vacation',
      'watermelon',
    ],
    region: 'northern',
    childFriendlyDescription:
      'Warm sunny days for swimming, ice cream, and outdoor adventures!',
  },
  {
    name: 'Winter (Southern Hemisphere)',
    startDate: '06-20',
    endDate: '09-21',
    themes: [
      'snow',
      'warm clothes',
      'fireplace',
      'hot chocolate',
      'cozy blanket',
    ],
    region: 'southern',
    childFriendlyDescription: "Bundle up! It's cozy winter time in the south!",
  },
  // ── July ──
  {
    name: 'Independence Day (US)',
    startDate: '07-03',
    endDate: '07-04',
    themes: ['fireworks', 'stars', 'parade', 'picnic', 'celebration'],
    region: 'americas',
    childFriendlyDescription: 'Fireworks, parades, and picnics to celebrate!',
  },
  // ── August ──
  {
    name: 'Back to School',
    startDate: '08-15',
    endDate: '09-10',
    themes: [
      'school bus',
      'backpack',
      'pencils',
      'books',
      'classroom',
      'friends',
      'apple',
    ],
    region: 'global',
    childFriendlyDescription:
      'Time to pack your backpack and get ready for a new school year!',
  },
  // ── September ──
  {
    name: 'Mid-Autumn Festival',
    startDate: '09-10',
    endDate: '10-05',
    themes: ['moon', 'lantern', 'mooncake', 'rabbit', 'family', 'harvest'],
    region: 'east-asia',
    childFriendlyDescription:
      'A beautiful festival with lanterns, mooncakes, and the full moon!',
  },
  {
    name: 'Autumn (Northern Hemisphere)',
    startDate: '09-22',
    endDate: '12-20',
    themes: [
      'falling leaves',
      'pumpkin',
      'harvest',
      'apple picking',
      'squirrel',
      'acorn',
      'cozy',
    ],
    region: 'northern',
    childFriendlyDescription:
      'Leaves turn orange, red, and gold! Time for pumpkins and apple picking!',
  },
  {
    name: 'Spring (Southern Hemisphere)',
    startDate: '09-22',
    endDate: '12-20',
    themes: [
      'flowers',
      'butterflies',
      'baby animals',
      'garden',
      'sunshine',
      'rainbow',
    ],
    region: 'southern',
    childFriendlyDescription:
      'Spring blooms in the south! Flowers and butterflies everywhere!',
  },
  // ── October ──
  {
    name: 'Halloween',
    startDate: '10-25',
    endDate: '10-31',
    themes: [
      'pumpkin',
      'costume',
      'friendly ghost',
      'trick or treat',
      'bat',
      'spider web',
      'black cat',
      'candy',
    ],
    region: 'global',
    childFriendlyDescription:
      'Time for fun costumes, pumpkin carving, and trick-or-treating!',
  },
  {
    name: 'Día de los Muertos (Day of the Dead)',
    startDate: '10-31',
    endDate: '11-02',
    themes: [
      'sugar skull',
      'marigold',
      'candle',
      'skeleton',
      'flowers',
      'altar',
      'celebration',
    ],
    region: 'americas',
    childFriendlyDescription:
      'A colorful celebration remembering loved ones with flowers and decorated skulls!',
  },
  // ── November ──
  {
    name: 'Diwali',
    startDate: '10-15',
    endDate: '11-15',
    themes: [
      'oil lamp',
      'candle',
      'fireworks',
      'rangoli',
      'lights',
      'sweets',
      'celebration',
    ],
    region: 'south-asia',
    childFriendlyDescription:
      'The Festival of Lights! Homes glow with tiny oil lamps and colorful rangoli patterns!',
  },
  {
    name: 'Thanksgiving',
    startDate: '11-20',
    endDate: '11-28',
    themes: [
      'turkey',
      'harvest',
      'pumpkin pie',
      'family dinner',
      'gratitude',
      'cornucopia',
      'autumn leaves',
    ],
    region: 'americas',
    childFriendlyDescription:
      'A day to be thankful, eat yummy food, and spend time with family!',
  },
  // ── December ──
  {
    name: 'Hanukkah',
    startDate: '11-25',
    endDate: '12-30',
    themes: [
      'menorah',
      'dreidel',
      'candles',
      'gifts',
      'latkes',
      'Star of David',
      'family',
    ],
    region: 'global',
    childFriendlyDescription:
      'Eight nights of candle lighting, dreidel games, and family fun!',
  },
  {
    name: 'Christmas',
    startDate: '12-20',
    endDate: '12-25',
    themes: [
      'Christmas tree',
      'presents',
      'Santa',
      'reindeer',
      'snowflake',
      'gingerbread',
      'ornament',
      'candy cane',
    ],
    region: 'global',
    childFriendlyDescription:
      'Decorating trees, opening presents, and spreading holiday cheer!',
  },
  {
    name: 'Kwanzaa',
    startDate: '12-26',
    endDate: '01-01',
    themes: [
      'candles',
      'unity',
      'harvest',
      'family',
      'celebration',
      'community',
    ],
    region: 'americas',
    childFriendlyDescription:
      'A week-long celebration of family, community, and togetherness!',
  },
  {
    name: 'Winter Solstice',
    startDate: '12-20',
    endDate: '12-22',
    themes: ['shortest day', 'candlelight', 'cozy', 'warmth', 'starry night'],
    region: 'northern',
    childFriendlyDescription:
      'The shortest day and longest night — cozy up and watch the stars!',
  },
  // ── Year-round awareness ──
  {
    name: 'World Ocean Day',
    startDate: '06-08',
    endDate: '06-08',
    themes: [
      'ocean',
      'sea creatures',
      'coral reef',
      'whale',
      'turtle',
      'fish',
      'submarine',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day to celebrate and protect our amazing oceans and sea creatures!',
  },
  {
    name: 'World Animal Day',
    startDate: '10-04',
    endDate: '10-04',
    themes: [
      'animals',
      'pets',
      'wildlife',
      'zoo',
      'paw print',
      'kindness to animals',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day to celebrate all the wonderful animals we share our planet with!',
  },
  {
    name: 'International Day of Friendship',
    startDate: '07-30',
    endDate: '07-30',
    themes: ['friends', 'playing together', 'sharing', 'hugs', 'kindness'],
    region: 'global',
    childFriendlyDescription:
      'A day to celebrate your best friends and making new ones!',
  },
  {
    name: 'International Music Day',
    startDate: '10-01',
    endDate: '10-01',
    themes: [
      'music',
      'instruments',
      'singing',
      'dancing',
      'drums',
      'guitar',
      'piano',
    ],
    region: 'global',
    childFriendlyDescription:
      'A day to celebrate music! Sing, dance, and play instruments!',
  },
  {
    name: 'World Space Week',
    startDate: '10-04',
    endDate: '10-10',
    themes: [
      'rocket',
      'astronaut',
      'planets',
      'stars',
      'moon',
      'space station',
      'alien',
    ],
    region: 'global',
    childFriendlyDescription:
      'Blast off! A week to explore space, planets, and the stars!',
  },
  {
    name: 'International Dinosaur Day',
    startDate: '06-01',
    endDate: '06-01',
    themes: [
      'dinosaur',
      'T-Rex',
      'fossil',
      'volcano',
      'prehistoric',
      'triceratops',
    ],
    region: 'global',
    childFriendlyDescription:
      'ROAR! A day to celebrate the coolest creatures that ever lived!',
  },
  {
    name: 'World Bee Day',
    startDate: '05-20',
    endDate: '05-20',
    themes: ['bee', 'honeycomb', 'flowers', 'garden', 'honey', 'pollination'],
    region: 'global',
    childFriendlyDescription:
      'Buzz buzz! Celebrating the amazing bees that help flowers grow!',
  },
  {
    name: 'International Yoga Day',
    startDate: '06-21',
    endDate: '06-21',
    themes: [
      'yoga poses',
      'stretching',
      'peace',
      'nature',
      'mindfulness',
      'breathing',
    ],
    region: 'global',
    childFriendlyDescription:
      'Stretch and breathe! A day to try fun yoga poses!',
  },
  {
    name: 'World Kindness Day',
    startDate: '11-13',
    endDate: '11-13',
    themes: ['hearts', 'helping', 'sharing', 'smiles', 'friendship', 'hug'],
    region: 'global',
    childFriendlyDescription:
      'A day to be extra kind! Share smiles and help others!',
  },
];

/**
 * Parse MM-DD string to month/day numbers for comparison.
 */
function parseMMDD(mmdd: string): { month: number; day: number } {
  const [month, day] = mmdd.split('-').map(Number);
  return { month, day };
}

/**
 * Convert a Date to day-of-year (1-366) for date math.
 */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Convert MM-DD to day-of-year for a given year.
 */
function mmddToDayOfYear(mmdd: string, year: number): number {
  const { month, day } = parseMMDD(mmdd);
  const date = new Date(year, month - 1, day);
  return dayOfYear(date);
}

/**
 * Get events occurring within a given window of days from the target date.
 *
 * @param date - The reference date
 * @param windowDays - Number of days ahead to look (default: 7)
 * @returns Array of events happening within the window
 */
export function getUpcomingEvents(
  date: Date = new Date(),
  windowDays: number = 7,
): SeasonalEvent[] {
  const year = date.getFullYear();
  const currentDoy = dayOfYear(date);
  const daysInYear = dayOfYear(new Date(year, 11, 31));

  return SEASONAL_EVENTS.filter((event) => {
    const startDoy = mmddToDayOfYear(event.startDate, year);
    const endDoy = mmddToDayOfYear(event.endDate, year);

    // Check if current date (with window) overlaps with event range
    for (let offset = 0; offset <= windowDays; offset++) {
      const checkDoy = ((currentDoy + offset - 1) % daysInYear) + 1;

      if (startDoy <= endDoy) {
        // Normal range (doesn't wrap around year boundary)
        if (checkDoy >= startDoy && checkDoy <= endDoy) return true;
      } else {
        // Wraps around year boundary (e.g., Dec 21 - Mar 19)
        if (checkDoy >= startDoy || checkDoy <= endDoy) return true;
      }
    }

    return false;
  });
}

type SeasonInfo = {
  northern: string;
  southern: string;
};

/**
 * Get the current season for both hemispheres.
 */
export function getCurrentSeason(date: Date = new Date()): SeasonInfo {
  const month = date.getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) {
    return { northern: 'spring', southern: 'autumn' };
  } else if (month >= 6 && month <= 8) {
    return { northern: 'summer', southern: 'winter' };
  } else if (month >= 9 && month <= 11) {
    return { northern: 'autumn', southern: 'spring' };
  } else {
    return { northern: 'winter', southern: 'summer' };
  }
}
