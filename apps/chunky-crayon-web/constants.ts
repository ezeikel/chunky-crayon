import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import {
  faInstagram,
  faThreads,
  faFacebookF,
  faTiktok,
  faPinterest,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';
import {
  faPaw,
  faWandMagicSparkles,
  faDragon,
  faHorseHead,
  faCrown,
  faMask,
  faDinosaur,
  faRocket,
  faFishFins,
  faCar,
  faSkullCrossbones,
  faFlower,
  faTreeChristmas,
  faRobot,
  faPizzaSlice,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
// Import from the /gallery SUBPATH (pure data), NOT the root barrel — the root
// barrel re-exports the Node-native AI pipeline (resvg, sharp, potrace…), and
// constants.ts is imported widely on the CLIENT, so the barrel would drag those
// native bindings into the client bundle and fail the build.
import {
  GALLERY_CATEGORIES as CORE_GALLERY_CATEGORIES,
  type GalleryCategory as CoreGalleryCategory,
} from '@one-colored-pixel/coloring-core/gallery';
import type { Currency } from '@/lib/currency';

export const MAX_IMAGE_GENERATION_ATTEMPTS = 3;

// Admin emails for social media posting and admin features
export const ADMIN_EMAILS = ['ezeikelpemberton@gmail.com'];

// Legacy colors - kept for backwards compatibility
export const COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#000000',
  '#FFFFFF',
];

// Enhanced 24-color kid-friendly palette for coloring experience
export const COLORING_PALETTE = {
  // Primary colors (8) - Large buttons, most used
  primary: [
    { name: 'Cherry Red', hex: '#E53935' },
    { name: 'Sunset Orange', hex: '#FB8C00' },
    { name: 'Sunshine Yellow', hex: '#FDD835' },
    { name: 'Grass Green', hex: '#43A047' },
    { name: 'Sky Blue', hex: '#1E88E5' },
    { name: 'Grape Purple', hex: '#8E24AA' },
    { name: 'Bubblegum Pink', hex: '#EC407A' },
    { name: 'Chocolate Brown', hex: '#6D4C41' },
  ],
  // Secondary colors (8) - Medium buttons
  secondary: [
    { name: 'Coral', hex: '#FF7043' },
    { name: 'Mint', hex: '#26A69A' },
    { name: 'Lavender', hex: '#AB47BC' },
    { name: 'Peach', hex: '#FFAB91' },
    { name: 'Navy', hex: '#3949AB' },
    { name: 'Forest', hex: '#2E7D32' },
    { name: 'Gold', hex: '#FFD54F' },
    { name: 'Rose', hex: '#F48FB1' },
  ],
  // Essentials (4) - Always visible
  essentials: [
    { name: 'Black', hex: '#212121' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Gray', hex: '#9E9E9E' },
    { name: 'Skin Tone', hex: '#FFCC80' },
  ],
  // Skin tones (6) - Accessible via long-press on Skin Tone
  skinTones: [
    { name: 'Light', hex: '#FFE0B2' },
    { name: 'Medium Light', hex: '#FFCC80' },
    { name: 'Medium', hex: '#DEB887' },
    { name: 'Medium Dark', hex: '#A0522D' },
    { name: 'Dark', hex: '#8B4513' },
    { name: 'Deep', hex: '#5D4037' },
  ],
  // Extended colors — available to AI auto-color and power users.
  // More natural tones and vivid options for realistic scene coloring.
  extended: [
    { name: 'Turquoise', hex: '#00ACC1' },
    { name: 'Teal', hex: '#00897B' },
    { name: 'Indigo', hex: '#283593' },
    { name: 'Magenta', hex: '#C2185B' },
    { name: 'Lime', hex: '#7CB342' },
    { name: 'Amber', hex: '#FFB300' },
    { name: 'Crimson', hex: '#B71C1C' },
    { name: 'Olive', hex: '#827717' },
    { name: 'Tan', hex: '#D2B48C' },
    { name: 'Salmon', hex: '#FF8A65' },
    { name: 'Slate', hex: '#546E7A' },
    { name: 'Cream', hex: '#FFF8E1' },
    // Natural mid-tones — AI auto-color / Magic Brush ONLY (not shown as kid
    // crayon buttons). Added to close measured snap-ΔE gaps where realistic
    // renders crammed soft earth/neutral colours onto a few far-apart entries
    // (49 regions were landing on "Medium Dark" alone, avg ΔE 11.7). These
    // bridge the warm-neutral, sage-green, soft-blue and neutral-grey gaps.
    { name: 'Taupe', hex: '#B59A7C' },
    { name: 'Warm Beige', hex: '#E3C9A6' },
    { name: 'Mushroom', hex: '#A68A6D' },
    { name: 'Sienna', hex: '#B5784B' },
    { name: 'Sage', hex: '#9CAF88' },
    { name: 'Moss', hex: '#6B8E4E' },
    { name: 'Steel Blue', hex: '#5B7B9A' },
    { name: 'Dusty Blue', hex: '#8AA4B8' },
    { name: 'Charcoal', hex: '#3F4448' },
    { name: 'Stone Gray', hex: '#B0AEA6' },
    // Pale cool tones — windows/glass/highlights/snow read as a soft icy
    // off-white, not warm Cream. Closes the last measured gap.
    { name: 'Pale Ice', hex: '#E4EEF2' },
    { name: 'Pale Sky', hex: '#C5DCEA' },
  ],
} as const;

// Flat array of all coloring palette colors for easy iteration (UI palette)
export const ALL_COLORING_COLORS = [
  ...COLORING_PALETTE.primary,
  ...COLORING_PALETTE.secondary,
  ...COLORING_PALETTE.essentials,
];

// Extended palette including all colors — used by AI auto-color for richer results
export const ALL_COLORING_COLORS_EXTENDED = [
  ...ALL_COLORING_COLORS,
  ...COLORING_PALETTE.extended,
  ...COLORING_PALETTE.skinTones,
];

// Brush size configuration optimized for children's motor skills
export const BRUSH_SIZES = {
  small: { radius: 4, name: 'Fine', icon: '•' },
  medium: { radius: 12, name: 'Regular', icon: '●' },
  large: { radius: 24, name: 'Chunky', icon: '⬤' },
} as const;

export type BrushSize = keyof typeof BRUSH_SIZES;
export type BrushType =
  | 'crayon'
  | 'marker'
  | 'eraser'
  | 'glitter'
  | 'sparkle'
  | 'rainbow'
  | 'glow'
  | 'neon';
export type ColoringTool =
  | 'brush'
  | 'fill'
  | 'pan'
  | 'sticker'
  | 'magic-reveal'
  | 'magic-auto';

// Canvas-sticker config now lives in the shared package as the SINGLE source
// of truth (the 36-sticker transparent-PNG catalog), consumed by both web and
// mobile. Re-exported here so existing `@/constants` importers (StickerSelector)
// keep working without churn. See packages/coloring-ui/src/types.ts.
export type { Sticker, StickerCategory } from '@one-colored-pixel/coloring-ui';
export {
  CANVAS_STICKERS,
  STICKER_CATEGORIES,
} from '@one-colored-pixel/coloring-ui';

// Fill pattern types for the fill tool
export type FillPattern =
  | 'solid'
  | 'dots'
  | 'stripes'
  | 'stripes-diagonal'
  | 'checkerboard'
  | 'hearts'
  | 'stars'
  | 'zigzag';

// Fill pattern configuration with kid-friendly names and icons
export const FILL_PATTERNS = {
  solid: { name: 'Solid', icon: '⬤', description: 'Fill with solid color' },
  dots: { name: 'Polka Dots', icon: '⚬', description: 'Fun polka dot pattern' },
  stripes: { name: 'Stripes', icon: '≡', description: 'Horizontal stripes' },
  'stripes-diagonal': {
    name: 'Diagonal',
    icon: '⟋',
    description: 'Diagonal stripes',
  },
  checkerboard: {
    name: 'Checkers',
    icon: '▦',
    description: 'Checkerboard pattern',
  },
  hearts: { name: 'Hearts', icon: '♥', description: 'Lovely heart pattern' },
  stars: { name: 'Stars', icon: '★', description: 'Sparkly star pattern' },
  zigzag: { name: 'Zigzag', icon: '⚡', description: 'Zigzag waves' },
} as const;

export const NUMBER_OF_CONCURRENT_IMAGE_GENERATION_REQUESTS = 1;

export const UNLEASH_STRINGS = [
  'creativity',
  'imagination',
  'fun',
  'adventure',
  'discovery',
  'exploration',
  'inspiration',
  'art',
  'joy',
  'learning',
  'wonder',
  'dreams',
  'playtime',
  'innovation',
  'magic',
  'curiosity',
  'expression',
  'fantasy',
  'stories',
  'excitement',
];

export const SETTINGS = [
  'forest',
  'beach',
  'city',
  'mountain',
  'space',
  'underwater reef',
  'desert oasis',
  'tropical jungle',
  'snowy tundra',
  'haunted castle',
  'fairy glade',
  'ancient ruins',
  'volcanic island',
  'wild west town',
  'floating sky island',
  'enchanted garden',
  'steampunk factory',
  'medieval village',
  'circus big top',
  'pirate ship deck',
  'alien planet',
  'magical library',
  'sunflower field',
  'frozen lake',
  'rainbow bridge',
  'toy workshop',
  'crystal cave',
  'cloud kingdom',
  'robot city',
  'giant treehouse',
] as const;

export const CHARACTERS = [
  'dragon',
  'unicorn',
  'knight',
  'astronaut',
  'pirate',
  'mermaid',
  'wizard',
  'fairy',
  'robot',
  'alien',
  'princess',
  'superhero',
  'detective',
  'cowboy',
  'samurai',
  'vampire',
  'werewolf',
  'elf',
  'giant',
  'goblin',
  'penguin',
  'polar bear',
  'fox',
  'panda',
  'lion',
  'frog prince',
  'genie',
  'time traveler',
  'ninja',
  'inventor',
] as const;

export const ACTIVITIES = [
  'dancing',
  'reading',
  'playing',
  'exploring',
  'fighting',
  'painting',
  'building',
  'flying',
  'swimming',
  'singing',
  'gardening',
  'cooking',
  'camping',
  'treasure hunting',
  'ice skating',
  'surfing',
  'skateboarding',
  'rock climbing',
  'casting spells',
  'time traveling',
  'racing',
  'juggling',
  'drawing',
  'training a pet',
  'rescuing someone',
  'performing magic tricks',
  'sewing',
  'conducting science experiments',
  'storytelling',
  'exploring a maze',
] as const;

export const LOCATIONS = [
  'a magical forest',
  'a sunny beach',
  'a busy marketplace',
  'the moon’s surface',
  'a coral reef',
  'a desert canyon',
  'a crystal palace',
  'a carnival',
  'a jungle temple',
  'a mountain peak',
  'a spooky graveyard',
  'a royal throne room',
  'a dragon’s cave',
  'a secret garden',
  'a futuristic city',
  'a candy land',
  'a wizard’s tower',
  'a spaceship',
  'a giant mushroom field',
  'a floating castle',
  'a snow-covered village',
  'a pirate cove',
  'a maze of mirrors',
  'a medieval fair',
  'a lava river',
  'a rainbow waterfall',
  'a hedge maze',
  'a hidden underwater city',
  'a golden desert',
  'a huge toy store',
] as const;

// theme aware map
export type ThemeMap = Record<
  string,
  {
    characters: string[];
    activities: string[];
    locations: string[];
  }
>;

export const THEME_MAP: ThemeMap = {
  forest: {
    characters: ['elf', 'fairy', 'fox', 'unicorn', 'goblin', 'dragon'],
    activities: [
      'exploring',
      'gardening',
      'building',
      'storytelling',
      'treasure hunting',
    ],
    locations: [
      'a magical forest',
      'a treehouse',
      'a hidden waterfall',
      'a woodland clearing',
    ],
  },
  beach: {
    characters: ['pirate', 'mermaid', 'surfer', 'dolphin', 'explorer', 'crab'],
    activities: [
      'surfing',
      'swimming',
      'building',
      'treasure hunting',
      'playing',
    ],
    locations: [
      'a sunny beach',
      'a tropical island',
      'a coral reef',
      'a lighthouse shore',
    ],
  },
  city: {
    characters: [
      'superhero',
      'detective',
      'robot',
      'inventor',
      'artist',
      'street performer',
    ],
    activities: [
      'skateboarding',
      'painting',
      'performing magic tricks',
      'playing',
      'reading',
    ],
    locations: [
      'a busy marketplace',
      'a rooftop garden',
      'a subway station',
      'a bustling plaza',
    ],
  },
  mountain: {
    characters: ['knight', 'wizard', 'yeti', 'eagle', 'mountaineer', 'goat'],
    activities: [
      'rock climbing',
      'camping',
      'exploring',
      'skiing',
      'storytelling',
    ],
    locations: [
      'a mountain peak',
      'a snowy peak',
      'a rocky trail',
      'a hidden cave',
    ],
  },
  space: {
    characters: [
      'astronaut',
      'alien',
      'robot',
      'space pirate',
      'time traveler',
    ],
    activities: [
      'spacewalking',
      'exploring',
      'flying',
      'collecting stardust',
      'moon jumping',
    ],
    locations: [
      'the moon’s surface',
      'a space station',
      'a distant galaxy',
      'a meteor field',
      'a spaceship',
    ],
  },
  'underwater reef': {
    characters: ['mermaid', 'dolphin', 'pirate', 'alien'],
    activities: ['swimming', 'treasure hunting', 'exploring'],
    locations: ['a coral reef', 'a hidden underwater city'],
  },
  'desert oasis': {
    characters: ['genie', 'cowboy', 'camel', 'explorer', 'pirate'],
    activities: ['treasure hunting', 'storytelling', 'camping'],
    locations: ['a golden desert', 'a desert canyon'],
  },
  'tropical jungle': {
    characters: ['explorer', 'monkey', 'parrot', 'lion', 'fairy'],
    activities: ['exploring', 'treasure hunting', 'building'],
    locations: ['a jungle temple', 'a secret garden'],
  },
  'haunted castle': {
    characters: ['vampire', 'werewolf', 'wizard', 'ghost', 'knight'],
    activities: ['exploring', 'storytelling', 'performing magic tricks'],
    locations: [
      'a spooky graveyard',
      'a crystal palace',
      'a royal throne room',
    ],
  },
  'wild west town': {
    characters: ['cowboy', 'horse', 'inventor'],
    activities: ['racing', 'treasure hunting', 'performing magic tricks'],
    locations: ['a busy marketplace', 'a desert canyon'],
  },
  'pirate ship deck': {
    characters: ['pirate', 'mermaid', 'dolphin', 'dragon'],
    activities: ['treasure hunting', 'sailing', 'storytelling'],
    locations: ['a pirate cove', 'a sunny beach'],
  },
  'magical library': {
    characters: ['wizard', 'princess', 'inventor', 'dragon'],
    activities: ['reading', 'casting spells', 'storytelling'],
    locations: ['a magical forest', 'a wizard’s tower'],
  },
  'steampunk factory': {
    characters: ['inventor', 'robot', 'detective', 'time traveler'],
    activities: ['building', 'conducting science experiments'],
    locations: ['a futuristic city', 'a busy marketplace'],
  },
  'cloud kingdom': {
    characters: ['unicorn', 'fairy', 'princess', 'dragon'],
    activities: ['flying', 'storytelling', 'playing'],
    locations: ['a floating castle', 'a rainbow bridge'],
  },
};

export const FREE_CREDITS = 15;

export const ACTIONS = {
  CREATE_COLORING_IMAGE: 'create coloring image',
  TRANSCRIBE_AUDIO: 'transcribe audio',
  DESCRIBE_IMAGE: 'describe image',
  MAGIC_COLOR: 'magic color',
  CREATE_CHECKOUT_SESSION: 'create a checkout session',
  CREATE_BUNDLE_CHECKOUT_SESSION: 'create a bundle checkout session',
  GET_CURRENT_USER: 'get the current user',
  GET_ENTITLEMENTS: 'get entitlements',
  GET_USER_CREDITS: 'get the user credits',
  GET_USER_SUBSCRIPTIONS: 'get the user subscriptions',
  GET_USER_SUBSCRIPTION: 'get the user subscription',
  GET_USER_SUBSCRIPTION_STATUS: 'get the user subscription status',
  GET_USER_SUBSCRIPTION_STATUS_BY_ID: 'get the user subscription status by id',
  GET_USER_SUBSCRIPTION_STATUS_BY_NAME:
    'get the user subscription status by name',
  GET_USER_SUBSCRIPTION_STATUS_BY_ID_AND_NAME:
    'get the user subscription status by id and name',
  GET_USER_SUBSCRIPTION_STATUS_BY_ID_AND_NAME_AND_STATUS:
    'get the user subscription status by id and name and status',
  GET_ALL_COLORING_IMAGES: 'get all coloring images',
  GENERATE_LOADING_AUDIO: 'generate loading audio',
  // Profile actions
  GET_PROFILES: 'get profiles',
  CREATE_PROFILE: 'create profile',
  UPDATE_PROFILE: 'update profile',
  DELETE_PROFILE: 'delete profile',
  SET_ACTIVE_PROFILE: 'set active profile',
  GET_ACTIVE_PROFILE: 'get active profile',
  // Colo evolution actions
  GET_COLO_STATE: 'get colo state',
  CHECK_COLO_EVOLUTION: 'check colo evolution',
  // Challenge actions
  GET_CURRENT_CHALLENGE: 'get current challenge',
  GET_CHALLENGE_HISTORY: 'get challenge history',
  UPDATE_CHALLENGE_PROGRESS: 'update challenge progress',
  CLAIM_CHALLENGE_REWARD: 'claim challenge reward',
  // Saved artwork actions
  SAVE_ARTWORK: 'save artwork',
  GET_SAVED_ARTWORKS: 'get saved artworks',
  DELETE_MY_CREATION: 'delete my coloring image',
  // Conversion tracking actions
  RECORD_RESOURCE_SAVED: 'record resource saved',
};

export type PlanInterval = 'monthly' | 'annual';

export type PriceEntry = {
  display: string; // e.g '£7.99' or '$7.99'
  stripePriceEnv: string; // env var name resolved to a Stripe Price ID
};

export type SubscriptionPlan = {
  key: PlanName;
  credits: string;
  featureKeys: string[]; // Translation keys for features (e.g. 'textPrompts', 'advancedEditing')
  prices: Record<Currency, PriceEntry>;
  mostPopular?: boolean;
};

// Pull the right localized price entry for a plan or credit pack. Both
// types share the `prices` shape so this works for both.
export const getPriceForCurrency = <
  T extends { prices: Record<Currency, PriceEntry> },
>(
  item: T,
  currency: Currency,
): PriceEntry => item.prices[currency];

// Monthly credit allotment per plan (same for monthly and annual billing)
// Annual subscribers get the same monthly credits via cron job, just billed yearly
export const PLAN_CREDITS_MONTHLY = {
  [PlanName.SPLASH]: 250,
  [PlanName.RAINBOW]: 500,
  [PlanName.SPARKLE]: 1000,
} as const;

// Rollover caps: max credits that can carry over to next month
// Splash: no rollover (credits reset each month)
// Rainbow: 1 month rollover (500 max carryover)
// Sparkle: 2 months rollover (2000 max carryover)
export const PLAN_ROLLOVER_CAPS = {
  [PlanName.SPLASH]: 0,
  [PlanName.RAINBOW]: 500,
  [PlanName.SPARKLE]: 2000,
} as const;

// Legacy export for backwards compatibility - now uses monthly amounts for both
export const PLAN_CREDITS = {
  [PlanName.SPLASH]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.SPLASH],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.SPLASH],
  },
  [PlanName.RAINBOW]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.RAINBOW],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.RAINBOW],
  },
  [PlanName.SPARKLE]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.SPARKLE],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.SPARKLE],
  },
} as const;

export const CREDIT_PACK_AMOUNTS = {
  CREDITS_100: 100,
  CREDITS_500: 500,
  CREDITS_1000: 1000,
  PUBLIC_CREDITS_50: 50,
  PUBLIC_CREDITS_200: 200,
  PUBLIC_CREDITS_500: 500,
} as const;

export const SUBSCRIPTION_PLANS: Record<PlanInterval, SubscriptionPlan[]> = {
  monthly: [
    {
      key: PlanName.SPLASH,
      credits: `${PLAN_CREDITS[PlanName.SPLASH][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: ['credits250', 'profiles2', 'allFeatures', 'noRollover'],
      prices: {
        GBP: {
          display: '£7.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY_GBP as string,
        },
        USD: {
          display: '$7.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY_USD as string,
        },
      },
    },
    {
      key: PlanName.RAINBOW,
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: [
        'credits500',
        'profiles4',
        'allFeatures',
        'rollover1Month',
        'prioritySupport',
      ],
      prices: {
        GBP: {
          display: '£13.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY_GBP as string,
        },
        USD: {
          display: '$13.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY_USD as string,
        },
      },
      mostPopular: true,
    },
    {
      key: PlanName.SPARKLE,
      credits: `${PLAN_CREDITS[PlanName.SPARKLE][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: [
        'credits1000',
        'profiles10',
        'allFeatures',
        'rollover2Months',
        'commercialUse',
      ],
      prices: {
        GBP: {
          display: '£24.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY_GBP as string,
        },
        USD: {
          display: '$24.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY_USD as string,
        },
      },
    },
  ],
  annual: [
    {
      key: PlanName.SPLASH,
      credits: `${PLAN_CREDITS[PlanName.SPLASH][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: ['credits250', 'profiles2', 'allFeatures', 'noRollover'],
      prices: {
        GBP: {
          display: '£79.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL_GBP as string,
        },
        USD: {
          display: '$79.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL_USD as string,
        },
      },
    },
    {
      key: PlanName.RAINBOW,
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: [
        'credits500',
        'profiles4',
        'allFeatures',
        'rollover1Month',
        'prioritySupport',
      ],
      prices: {
        GBP: {
          display: '£139.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL_GBP as string,
        },
        USD: {
          display: '$139.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL_USD as string,
        },
      },
      mostPopular: true,
    },
    {
      key: PlanName.SPARKLE,
      credits: `${PLAN_CREDITS[PlanName.SPARKLE][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: [
        'credits1000',
        'profiles10',
        'allFeatures',
        'rollover2Months',
        'commercialUse',
      ],
      prices: {
        GBP: {
          display: '£249.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL_GBP as string,
        },
        USD: {
          display: '$249.99',
          stripePriceEnv: process.env
            .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL_USD as string,
        },
      },
    },
  ],
};

export const STRIPE_API_VERSION = '2025-08-27.basil';

export type CreditPack = {
  key: keyof typeof CREDIT_PACK_AMOUNTS;
  name: string;
  credits: number;
  prices: Record<Currency, PriceEntry>;
};

// Subscriber-only packs surfaced in /account/billing as a member perk.
// Per-credit prices intentionally beat every public pack so subscribers
// get a tangible "you save more by being a member" signal.
export const CREDIT_PACKS_MEMBER: CreditPack[] = [
  {
    key: 'CREDITS_100',
    name: '100 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_100,
    prices: {
      GBP: {
        display: '£3.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100_GBP as string,
      },
      USD: {
        display: '$3.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100_USD as string,
      },
    },
  },
  {
    key: 'CREDITS_500',
    name: '500 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_500,
    prices: {
      GBP: {
        display: '£12.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500_GBP as string,
      },
      USD: {
        display: '$12.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500_USD as string,
      },
    },
  },
  {
    key: 'CREDITS_1000',
    name: '1,000 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_1000,
    prices: {
      GBP: {
        display: '£20.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000_GBP as string,
      },
      USD: {
        display: '$20.00',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000_USD as string,
      },
    },
  },
];

// Color As You Go — public packs for non-subscribers. Per-credit prices
// are deliberately worse than every subscription tier so heavy usage
// still funnels to a sub. Surfaced on /color-as-you-go.
export const CREDIT_PACKS_PUBLIC: CreditPack[] = [
  {
    key: 'PUBLIC_CREDITS_50',
    name: 'Color As You Go - 50 Credits',
    credits: CREDIT_PACK_AMOUNTS.PUBLIC_CREDITS_50,
    prices: {
      GBP: {
        display: '£2.49',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_50_GBP as string,
      },
      USD: {
        display: '$2.49',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_50_USD as string,
      },
    },
  },
  {
    key: 'PUBLIC_CREDITS_200',
    name: 'Color As You Go - 200 Credits',
    credits: CREDIT_PACK_AMOUNTS.PUBLIC_CREDITS_200,
    prices: {
      GBP: {
        display: '£8.99',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_200_GBP as string,
      },
      USD: {
        display: '$8.99',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_200_USD as string,
      },
    },
  },
  {
    key: 'PUBLIC_CREDITS_500',
    name: 'Color As You Go - 500 Credits',
    credits: CREDIT_PACK_AMOUNTS.PUBLIC_CREDITS_500,
    prices: {
      GBP: {
        display: '£19.99',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_500_GBP as string,
      },
      USD: {
        display: '$19.99',
        stripePriceEnv: process.env
          .NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_500_USD as string,
      },
    },
  },
];

export const SOCIAL_LINKS = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/getchunkycrayon',
    icon: faInstagram,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://facebook.com/getchunkycrayon',
    icon: faFacebookF,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://tiktok.com/@getchunkycrayon',
    icon: faTiktok,
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    href: 'https://pinterest.com/getchunkycrayon',
    icon: faPinterest,
  },
  // {
  //   id: 'x',
  //   label: 'X',
  //   href: 'https://x.com/chunkycrayon',
  //   icon: faXTwitter,
  // },
  // {
  //   id: 'threads',
  //   label: 'Threads',
  //   href: 'https://threads.net/@getchunkycrayon',
  //   icon: faThreads,
  // },
  // {
  //   id: 'youtube',
  //   label: 'YouTube',
  //   href: 'https://youtube.com/@getchunkycrayon',
  //   icon: faYoutube,
  // },
  // {
  //   id: 'whatsapp',
  //   label: 'WhatsApp',
  //   href: 'https://wa.me/447932442879',
  //   icon: faWhatsapp,
  // },
];

// Mobile app store links - set to null until apps are published
// Update these with actual URLs when apps are live
export const APP_STORE_LINKS = {
  APPLE: null as string | null, // e.g., 'https://apps.apple.com/gb/app/chunky-crayon/id...'
  GOOGLE: null as string | null, // e.g., 'https://play.google.com/store/apps/details?id=com.chunkycrayon.app'
} as const;

export const APP_STORE_IMAGES = {
  APPLE: {
    LIGHT: '/images/app-store-light.svg',
    DARK: '/images/app-store-dark.svg',
  },
  GOOGLE: {
    LIGHT: '/images/play-store-light.svg',
    DARK: '/images/play-store-dark.svg',
  },
} as const;

// Helper to check if mobile apps are available
export const ARE_MOBILE_APPS_AVAILABLE =
  APP_STORE_LINKS.APPLE !== null || APP_STORE_LINKS.GOOGLE !== null;

/**
 * Header used to forward the browser's PostHog distinct_id from a client
 * fetch to an API route, so server-side `track()` attributes the event
 * to the same person the client-side events landed on. Without it, every
 * logged-out caller of a server-tracked route collapses onto the shared
 * 'anonymous' distinct_id (which is why tool_completed historically
 * looked like a single person). Defined here — in a directive-free
 * module imported by both client and server — to avoid importing across
 * the 'use client' / 'server-only' boundary.
 */
export const POSTHOG_DISTINCT_ID_HEADER = 'x-ph-distinct-id';

/**
 * Comprehensive tracking events for analytics dashboards.
 * Events are organized by category for easy filtering in PostHog.
 *
 * Naming convention: category_action (snake_case)
 * - Enables filtering by prefix (e.g., all "auth_*" events)
 * - Consistent with PostHog best practices
 */
export const TRACKING_EVENTS = {
  // ===== AUTHENTICATION & USER LIFECYCLE =====
  AUTH_SIGN_IN_STARTED: 'auth_sign_in_started', // User clicks sign in
  AUTH_SIGN_IN_COMPLETED: 'auth_sign_in_completed', // Sign in successful
  AUTH_SIGN_IN_FAILED: 'auth_sign_in_failed', // Sign in failed
  AUTH_SIGN_UP_COMPLETED: 'auth_sign_up_completed', // New user registered
  AUTH_SIGN_OUT: 'auth_sign_out', // User signs out

  // ===== GUEST MODE (Anonymous Demo) =====
  GUEST_GENERATION_USED: 'guest_generation_used', // Guest used a free generation
  GUEST_LIMIT_REACHED: 'guest_limit_reached', // Guest exhausted free tries
  GUEST_SIGNUP_CLICKED: 'guest_signup_clicked', // Guest clicked signup CTA

  // ===== IN-FORM PAYWALL MODAL =====
  // Modal that opens above the create form when the user can't generate
  // (guest out of tries, signed-in user out of credits). Plan-card taps
  // inside the modal reuse PRICING_PLAN_CLICKED with source:'paywall_modal'.
  PAYWALL_VIEWED: 'paywall_viewed', // Paywall modal opened
  PAYWALL_DISMISSED: 'paywall_dismissed', // Modal closed without converting
  PAYWALL_SECONDARY_CLICKED: 'paywall_secondary_clicked', // 'See packs' / 'Sign up' / etc.

  // ===== COLORING PAGE CREATION (Core Funnel) =====
  CREATION_STARTED: 'creation_started', // User starts typing description
  CREATION_SUBMITTED: 'creation_submitted', // Description submitted
  CREATION_COMPLETED: 'creation_completed', // Image generated successfully
  CREATION_FAILED: 'creation_failed', // Generation failed
  CREATION_RETRIED: 'creation_retried', // User retried after failure
  CREATION_ANALYZED: 'creation_analyzed', // Image content analyzed for insights
  EXAMPLE_PROMPT_CLICKED: 'example_prompt_clicked', // Clicked a pre-filled example pill on homepage/start

  // ===== INPUT MODE (Voice/Image/Text) =====
  INPUT_MODE_CHANGED: 'input_mode_changed', // User switches input mode
  VOICE_INPUT_STARTED: 'voice_input_started', // Started recording
  VOICE_INPUT_COMPLETED: 'voice_input_completed', // Recording finished & transcribed
  VOICE_INPUT_FAILED: 'voice_input_failed', // Transcription failed
  VOICE_INPUT_CANCELLED: 'voice_input_cancelled', // Recording cancelled
  IMAGE_INPUT_UPLOADED: 'image_input_uploaded', // Image uploaded from file
  IMAGE_INPUT_CAPTURED: 'image_input_captured', // Photo taken with camera
  IMAGE_INPUT_PROCESSED: 'image_input_processed', // Image described successfully
  IMAGE_INPUT_FAILED: 'image_input_failed', // Description failed

  // ===== COLORING PAGE ENGAGEMENT =====
  PAGE_VIEWED: 'page_viewed', // Coloring page viewed
  PAGE_COLORED: 'page_colored', // Session ended (page closed/unmounted) — has duration + stroke count
  PAGE_COLOR_SELECTED: 'page_color_selected', // Color picked
  PAGE_STROKE_MADE: 'page_stroke_made', // Drawing stroke completed
  PAGE_SAVED: 'page_saved', // Saved to gallery
  PAGE_FIRST_STROKE: 'page_first_stroke', // First stroke after page mount — measures time-to-engage
  TOOL_SELECTED: 'tool_selected', // Tile click in toolbar (crayon, marker, fill, magic-reveal, etc.)
  BRUSH_SIZE_CHANGED: 'brush_size_changed', // Switched between small/medium/large
  BRUSH_TYPE_CHANGED: 'brush_type_changed', // Switched between crayon/marker/pencil/paintbrush/glitter
  PALETTE_VARIANT_CHANGED: 'palette_variant_changed', // Switched between realistic/pastel/cute/surprise
  CANVAS_UNDO: 'canvas_undo', // Undo button clicked
  CANVAS_REDO: 'canvas_redo', // Redo button clicked
  AUTO_COLOR_USED: 'auto_color_used', // Magic auto-color (one-click) used inside the coloring page
  SAVE_TO_GALLERY_CLICKED: 'save_to_gallery_clicked', // Logged-in users save artwork to gallery

  // ===== DOWNLOAD & PRINT (Key Conversions) =====
  DOWNLOAD_PDF_CLICKED: 'download_pdf_clicked', // PDF download initiated
  DOWNLOAD_PDF_COMPLETED: 'download_pdf_completed', // PDF download successful
  PRINT_CLICKED: 'print_clicked', // Print button clicked
  // SEO landing page primary CTA — 12-page printable pack served by
  // /api/coloring-pages/[slug]/pack.pdf. The CLICKED event fires
  // client-side at button press; COMPLETED fires server-side once the
  // PDF is rendered, with { slug, pageCount, bytes, durationMs }.
  LANDING_PACK_DOWNLOAD_CLICKED: 'landing_pack_download_clicked',
  LANDING_PACK_DOWNLOAD_COMPLETED: 'landing_pack_download_completed',
  // Per-card download icon on gallery thumbnails — single-page PDF for
  // one image via /api/coloring-images/[id]/pdf. CLICKED fires client-
  // side; COMPLETED fires server-side after render.
  GALLERY_CARD_DOWNLOAD_CLICKED: 'gallery_card_download_clicked',
  COLORING_IMAGE_PDF_DOWNLOADED: 'coloring_image_pdf_downloaded',

  // ===== EMAIL LIST (Lead Generation) =====
  EMAIL_SIGNUP_STARTED: 'email_signup_started', // Started entering email
  EMAIL_SIGNUP_COMPLETED: 'email_signup_completed', // Email submitted
  EMAIL_SIGNUP_FAILED: 'email_signup_failed', // Signup failed

  // ===== PRICING & CONVERSION FUNNEL =====
  PRICING_PAGE_VIEWED: 'pricing_page_viewed', // Pricing page loaded
  PRICING_INTERVAL_TOGGLED: 'pricing_interval_toggled', // Monthly/Annual toggle
  // Fires for BOTH subscription plan AND credit pack clicks on /pricing.
  // Distinguish via the `productType: 'subscription' | 'pack'` property.
  PRICING_PLAN_CLICKED: 'pricing_plan_clicked',
  PRICING_CREDITS_CLICKED: 'pricing_credits_clicked', // Legacy: credit pack clicked (pre-experiment)
  PRICING_TEASER_CLICKED: 'pricing_teaser_clicked', // Inline pricing teaser link clicked (homepage/start)
  // Layout experiment events — A/B between subscriptions-primary and packs-primary.
  // Flag: pricing-page-layout (PostHog project 110135).
  PRICING_VARIANT_ASSIGNED: 'pricing_variant_assigned', // Fires once per page load with `variant`
  PRICING_SECONDARY_SECTION_VIEWED: 'pricing_secondary_section_viewed', // Secondary section scrolled into view
  PRICING_SECONDARY_CTA_CLICKED: 'pricing_secondary_cta_clicked', // Secondary section header CTA clicked
  SOCIAL_PROOF_CLICKED: 'social_proof_clicked', // Rating / "X.X from N reviews" link clicked
  FAQ_OPENED: 'faq_opened', // FAQ accordion item opened (intent signal)
  COLOR_AS_YOU_GO_PAGE_VIEWED: 'color_as_you_go_page_viewed', // /color-as-you-go loaded
  COLOR_AS_YOU_GO_PACK_CLICKED: 'color_as_you_go_pack_clicked', // Public pack CTA clicked

  // ===== CHECKOUT & PAYMENTS (Revenue) =====
  CHECKOUT_STARTED: 'checkout_started', // Stripe session created, redirecting to Stripe
  CHECKOUT_FAILED: 'checkout_failed', // Session create or redirect failed before reaching Stripe
  CHECKOUT_COMPLETED: 'checkout_completed', // Payment successful (fires on /account/billing/success)
  CHECKOUT_ABANDONED: 'checkout_abandoned', // User returned without paying

  // ===== SUBSCRIPTION MANAGEMENT =====
  SUBSCRIPTION_STARTED: 'subscription_started', // New subscription
  SUBSCRIPTION_RENEWED: 'subscription_renewed', // Auto-renewed
  SUBSCRIPTION_CHANGED: 'subscription_changed', // Plan change
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled', // Cancelled
  SUBSCRIPTION_PORTAL_OPENED: 'subscription_portal_opened', // Stripe portal

  // ===== CREDITS =====
  CREDITS_PURCHASED: 'credits_purchased', // Credit pack bought (Stripe/web)
  CREDIT_PACK_PURCHASED: 'credit_pack_purchased', // Credit pack bought (RevenueCat/mobile)
  CREDITS_USED: 'credits_used', // Credit consumed
  CREDITS_LOW: 'credits_low', // Credits running low (trigger)

  // ===== BILLING & ACCOUNT =====
  BILLING_PAGE_VIEWED: 'billing_page_viewed', // Billing page visited
  ACCOUNT_SETTINGS_VIEWED: 'account_settings_viewed', // Account page

  // ===== MARKETING & GROWTH =====
  CTA_CLICKED: 'cta_clicked', // Any CTA button
  FEATURE_DISCOVERED: 'feature_discovered', // New feature interaction
  REFERRAL_SHARED: 'referral_shared', // User shared referral
  SOCIAL_LINK_CLICKED: 'social_link_clicked', // Social media click

  // ===== MOBILE APP =====
  APP_STORE_CLICKED: 'app_store_clicked', // Apple App Store button clicked
  PLAY_STORE_CLICKED: 'play_store_clicked', // Google Play Store button clicked

  // ===== ERRORS (for debugging dashboards) =====
  ERROR_OCCURRED: 'error_occurred', // Any error
  ERROR_API: 'error_api', // API error
  ERROR_GENERATION: 'error_generation', // Image gen error
  ERROR_PAYMENT: 'error_payment', // Payment error

  // ===== AI/LLM OBSERVABILITY =====
  IMAGE_GENERATION_COMPLETED: 'image_generation_completed', // Image generated with timing
  IMAGE_GENERATION_FAILED: 'image_generation_failed', // Image generation failed
  GENERATION_STARTED: 'generation_started', // User pressed Submit on the create form (client-side, fires before any server work). Pair with IMAGE_GENERATION_COMPLETED to measure perceived wait.
  QUALITY_TIER_SELECTED: 'quality_tier_selected', // User picked Fast/Better/Best on the QualityPicker

  // ===== LOADING EXPERIENCE (Colo mascot voice) =====
  LOADING_AUDIO_GENERATED: 'loading_audio_generated', // Colo voice audio generated
  LOADING_AUDIO_PLAYED: 'loading_audio_played', // Audio playback started
  LOADING_AUDIO_FAILED: 'loading_audio_failed', // Audio generation failed

  // ===== LOCALIZATION =====
  LANGUAGE_CHANGED: 'language_changed', // User switches language/locale

  // ===== PAID-AD LANDING (logged-out funnel) =====
  LANDING_PAGE_VIEWED: 'landing_page_viewed', // /start (or /) loaded with utm_campaign in scope
  LANDING_HERO_POLAROID_CLICKED: 'landing_hero_polaroid_clicked', // Hero polaroid → coloring-image page
  START_HERO_CANVAS_INTERACTED: 'start_hero_canvas_interacted', // First stroke on the embedded /start canvas (replaces the polaroid click as the engagement signal)
  COLORING_PAGE_TAP_PROMPT_SHOWN: 'coloring_page_tap_prompt_shown', // Mobile-only "Tap to color" hint rendered on /coloring-image/[id] for first-time visitors
  COLORING_PAGE_TAP_PROMPT_DISMISSED: 'coloring_page_tap_prompt_dismissed', // Visitor's first canvas interaction dismissed the hint
  START_HERO_COLOR_PICKED: 'start_hero_color_picked', // Visitor picked a swatch on the /start canvas
  START_HERO_TOOL_CHANGED: 'start_hero_tool_changed', // Visitor switched tools (crayon / magic / eraser) on /start
  START_HERO_AUTO_REVEAL_CLICKED: 'start_hero_auto_reveal_clicked', // One-click magic auto-reveal — paints the entire pre-coloured canvas in one shot
  START_HERO_PDF_DOWNLOADED: 'start_hero_pdf_downloaded', // Visitor downloaded their /start canvas as a PDF
  START_HERO_PDF_PRINTED: 'start_hero_pdf_printed', // Visitor opened the print dialog for their /start canvas
  START_HERO_CTA_CLICKED: 'start_hero_cta_clicked', // Primary signin CTA clicked from the /start hero
  START_BRIDGE_SHOWN: 'start_bridge_shown', // Post-engagement bridge prompt rendered (after first canvas interaction) — exp-start-post-engagement-bridge=bridge only
  START_BRIDGE_CLICKED: 'start_bridge_clicked', // Visitor clicked the bridge CTA through to the guest create flow
  START_BRIDGE_DISMISSED: 'start_bridge_dismissed', // Visitor dismissed the bridge prompt without clicking through
  LANDING_DEMO_PLAYED: 'landing_demo_played', // User pressed play on the phone-frame demo
  LANDING_DEMO_COMPLETED: 'landing_demo_completed', // Demo cycled through every scenario at least once
  LANDING_DEMO_CTA_CLICKED: 'landing_demo_cta_clicked', // "Color this one" CTA inside demo result frame

  // ===== FREE TOOLS FUNNEL (Phase 2 growth) =====
  TOOL_VIEWED: 'tool_viewed', // User viewed a /tools/* page
  TOOL_SUBMITTED: 'tool_submitted', // User submitted a tool form
  TOOL_COMPLETED: 'tool_completed', // Tool produced its output (PDF download, etc.)
  TOOL_FAILED: 'tool_failed', // Tool failed to produce output
  TEACHER_HUB_VIEWED: 'teacher_hub_viewed', // /for-teachers page viewed

  // ===== SEO LANDING PAGES (long-tail /coloring-pages/[slug]) =====
  // Distinct from LANDING_PAGE_VIEWED above which targets /start + / paid funnels.
  SEO_LANDING_PAGE_VIEWED: 'seo_landing_page_viewed', // /coloring-pages/[slug] page view
  SEO_LANDING_PAGE_CTA_CLICKED: 'seo_landing_page_cta_clicked', // CTA on /coloring-pages/[slug] clicked

  // ===== SOCIAL POST ATTRIBUTION (alternating demo reel A/B) =====
  DEMO_REEL_CLICKED: 'demo_reel_clicked', // Traffic arrives via ?utm_campaign=demo-reel

  // ===== A/B EXPERIMENTS =====
  EXPERIMENT_EXPOSED: 'experiment_exposed',

  // ===== FEEDBACK =====
  FEEDBACK_SUBMITTED: 'feedback_submitted',

  // ===== CHARACTERS (persistent kid-created figures) =====
  // Lifecycle: create → READY → use in coloring page / profile actions.
  // Names are PII: only characterId is sent as a property, never name.
  CHARACTER_CREATE_STARTED: 'character_create_started', // Modal opened, parent gate not yet passed
  CHARACTER_CREATE_SUBMITTED: 'character_create_submitted', // Form submitted to server action
  CHARACTER_CREATE_COMPLETED: 'character_create_completed', // Worker flipped row READY
  CHARACTER_CREATE_FAILED: 'character_create_failed', // Generation FAILED
  CHARACTER_PARENT_GATE_SHOWN: 'character_parent_gate_shown',
  CHARACTER_PARENT_GATE_PASSED: 'character_parent_gate_passed',
  CHARACTER_PARENT_GATE_FAILED: 'character_parent_gate_failed',
  CHARACTER_GRID_VIEWED: 'character_grid_viewed', // /characters list page rendered
  CHARACTER_PROFILE_VIEWED: 'character_profile_viewed', // /characters/[id] rendered
  CHARACTER_FED: 'character_fed', // Feed pill tapped (cosmetic + voice line)
  CHARACTER_EXERCISED: 'character_exercised',
  CHARACTER_DRESSED: 'character_dressed', // Outfit equipped
  CHARACTER_OUTFIT_UNLOCKED: 'character_outfit_unlocked', // 5 credits spent
  CHARACTER_VOICE_PLAYED: 'character_voice_played', // Cached preset line played
  CHARACTER_VOICE_GENERATED: 'character_voice_generated', // First-play synthesis or custom line (1 credit)
  CHARACTER_PICKED_FOR_PAGE: 'character_picked_for_page', // Picker selection in CreateColoringPageForm
  CHARACTER_USED_IN_PAGE: 'character_used_in_page', // Server-side; fires inside createPendingColoringImage so it survives mobile
  CHARACTER_LANDING_HERO_VIEWED: 'character_landing_hero_viewed', // /start CharactersHookSection scrolled into view
} as const;

// Limits for the Characters feature. Sourced as constants so action-layer
// gates, UI copy ("you've got a full house"), and analytics share one truth.
export const CHARACTER_LIMITS = {
  /** Hard cap per profile. UI hides the add-tile beyond this. */
  MAX_PER_PROFILE: 8,
  /** v1 — gpt-image-2 multi-subject fidelity is fragile (bundles confirmed). */
  MAX_PER_SCENE: 1,
  /** Outfit unlock charge. Equipping an already-unlocked outfit is free. */
  OUTFIT_UNLOCK_CREDIT_COST: 5,
  /** Parent-gated custom voice line (free-text). Presets are free after first synth. */
  CUSTOM_VOICE_CREDIT_COST: 1,
  CUSTOM_VOICE_MAX_CHARS: 80,
} as const;

// ===== SOCIAL PROOF / TESTIMONIALS =====

// Full testimonial type (includes translated content)
export type Testimonial = {
  id: string;
  name: string;
  role?: string; // e.g. "Mum of 2", "Primary Teacher"
  avatar: string; // Path to avatar image (placeholder until AI-generated)
  quote: string;
  date?: string; // Optional date for recency
  rating?: number; // 1-5 stars
};

// Non-translatable testimonial data (rating only)
// Translatable content (name, role, quote, avatar) comes from translation files
export type TestimonialMeta = {
  id: string;
  translationKey: string; // Key to look up in translations (e.g., "1", "2")
  rating: number;
};

// Testimonial metadata - translatable content lives in translation files.
// Star distribution mirrors the believable-mix research: a sprinkling of
// 4-star reviews dotted between 5-stars produces a 4.6 average and reads
// far more authentic than all-5-stars (which converts ~10-15% worse, per
// Spiegel Research Center). The 4-star quotes each name a specific
// real friction (prompt learning curve, generation wait, in-app vs print)
// without undermining buy intent.
export const TESTIMONIAL_META: TestimonialMeta[] = [
  { id: 'testimonial-1', translationKey: '1', rating: 5 },
  { id: 'testimonial-2', translationKey: '2', rating: 5 },
  { id: 'testimonial-3', translationKey: '3', rating: 4 },
  { id: 'testimonial-4', translationKey: '4', rating: 5 },
  { id: 'testimonial-5', translationKey: '5', rating: 5 },
  { id: 'testimonial-6', translationKey: '6', rating: 4 },
  { id: 'testimonial-7', translationKey: '7', rating: 5 },
  { id: 'testimonial-8', translationKey: '8', rating: 4 },
];

// Legacy TESTIMONIALS export for backwards compatibility
// Components should migrate to using TESTIMONIAL_META + translations
export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Sarah M.',
    role: 'Mum of 2',
    avatar: '/images/testimonials/avatar-1.svg',
    quote:
      'My kids absolutely love this! They spend hours creating and coloring their own magical worlds. No more screen time battles!',
    rating: 5,
  },
  {
    id: 'testimonial-2',
    name: 'James T.',
    role: 'Dad of 3',
    avatar: '/images/testimonials/avatar-2.svg',
    quote:
      'Finally, something that combines creativity with technology in a healthy way. My daughter made a unicorn princess castle and it was perfect!',
    rating: 5,
  },
  {
    id: 'testimonial-3',
    name: 'Emily R.',
    role: 'Primary Teacher',
    avatar: '/images/testimonials/avatar-3.svg',
    quote:
      "I use this in my classroom for creative writing prompts. The children describe what they want, then color their creations. They're so engaged!",
    rating: 5,
  },
  {
    id: 'testimonial-4',
    name: 'David K.',
    role: 'Grandad',
    avatar: '/images/testimonials/avatar-4.svg',
    quote:
      'My grandchildren visit every weekend now just to make new coloring pages together. Such wonderful bonding time!',
    rating: 5,
  },
  {
    id: 'testimonial-5',
    name: 'Rachel B.',
    role: 'Childminder',
    avatar: '/images/testimonials/avatar-5.svg',
    quote:
      "The kids I look after can't get enough. Dragons, fairies, rockets - whatever they imagine comes to life!",
    rating: 5,
  },
  {
    id: 'testimonial-6',
    name: 'Michael P.',
    role: 'Dad & Designer',
    avatar: '/images/testimonials/avatar-6.svg',
    quote:
      'As a designer, I appreciate the quality. As a dad, I appreciate the endless entertainment. Win-win!',
    rating: 5,
  },
];

// Hero social proof stats. Numbers are deliberately modest for an
// early-stage product: a young brand claiming 183 reviews at 4.9
// average reads as fake. ~50 reviews at 4.6 (matches the actual
// TESTIMONIAL_META distribution) reads as honest social proof.
export const SOCIAL_PROOF_STATS = {
  reviewCount: 47,
  averageRating: 4.6,
  totalPagesCreated: 50000, // Will be dynamic later
} as const;

// ===== FAQ =====

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is Chunky Crayon?',
    answer:
      'Chunky Crayon is a magical coloring page generator designed for children and families. Simply describe what you want to color - like "a dragon having a tea party" or "my favourite superhero on the moon" - and we create a unique, printable coloring page in seconds. It\'s perfect for rainy days, quiet time, or sparking your child\'s imagination!',
  },
  {
    id: 'faq-2',
    question: 'Is it safe and appropriate for children?',
    answer:
      'Absolutely! Chunky Crayon is built by parents, for parents. All generated images are designed to be child-friendly with age-appropriate content. Our AI is specially tuned to create wholesome, fun coloring pages suitable for children of all ages.',
  },
  {
    id: 'faq-3',
    question: 'How do I create a coloring page?',
    answer:
      'It\'s as easy as 1-2-3! Just type what you want to color (e.g., "a unicorn in a magical forest"), click Generate, and wait about 30 seconds. Your unique coloring page will appear ready to download and print. You can also use voice input or upload a photo for inspiration!',
  },
  {
    id: 'faq-4',
    question: 'How long does it take to generate a page?',
    answer:
      'Most coloring pages are ready in about 30 seconds. Our friendly mascot Colo will keep you entertained while you wait! Complex scenes with lots of details might take a tiny bit longer.',
  },
  {
    id: 'faq-5',
    question: 'Can I print the coloring pages?',
    answer:
      'Yes! Every coloring page you create can be downloaded as a high-quality PDF, perfect for printing at home. The pages are optimised for A4 paper and look great with crayons, colored pencils, or markers.',
  },
  {
    id: 'faq-6',
    question: "What if my child's request doesn't work?",
    answer:
      "Sometimes the AI might not get it quite right on the first try - that's part of the creative adventure! You can simply try again with slightly different words. Tips: be specific about what you want, and describe the scene clearly. If you're stuck, try our voice input - kids often explain things better by talking!",
  },
  {
    id: 'faq-7',
    question: 'Is Chunky Crayon free to use?',
    answer:
      'You can try Chunky Crayon with 2 free generations - no account needed! After that, you can sign up for a free account to get 15 bonus credits, or choose one of our affordable subscription plans for unlimited creative fun.',
  },
  {
    id: 'faq-8',
    question: "What's included in the subscription plans?",
    answer:
      'Our plans range from Splash (perfect for casual coloring) to Sparkle (for super-creative families). All plans include: unlimited coloring page generation, high-quality PDF downloads, voice and photo input modes, and access to new features as we add them. Higher tiers include credit rollover and commercial use rights.',
  },
  {
    id: 'faq-9',
    question: 'Can I use pages for my classroom or nursery?',
    answer:
      "Yes! Our Splash and Rainbow plans work great for personal and home-school use. For nurseries, classrooms, and schools, we're launching Chunky Crayon for Education - a dedicated platform with special features for educators. In the meantime, Sparkle includes commercial licensing for personal business use like party supplies or craft fairs.",
  },
  {
    id: 'faq-10',
    question: 'How do credits work?',
    answer:
      'Each coloring page you generate uses 5 credits. Credits refresh monthly with your subscription, and some plans allow unused credits to roll over. You can also purchase credit packs if you need a little extra creativity boost!',
  },
];

// ===== BLOG TOPICS (for automated SEO content generation) =====
//
// Runtime values (BLOG_CATEGORIES, BLOG_TOPICS) live in
// @one-colored-pixel/coloring-core so the worker can use them. Importing
// the runtime values here would pull coloring-core (and transitively
// `sharp`) into client bundles that import `@/constants` — this file is
// imported by client components for unrelated values like TRACKING_EVENTS.
//
// Server-side callers should import from coloring-core directly:
//   import { BLOG_TOPICS, BLOG_CATEGORIES } from '@one-colored-pixel/coloring-core';
//
// Types are safe to re-export — they're erased at compile time.
export type { BlogCategory, BlogTopic } from '@one-colored-pixel/coloring-core';

// ===== GALLERY CATEGORIES (for SEO landing pages) =====

// The category DATA (slug, name, description, keywords, tags) is the shared
// source of truth in @one-colored-pixel/coloring-core (CORE_GALLERY_CATEGORIES,
// imported above). Web layers its PRESENTATION (FA icon + Tailwind colours)
// on top here, keyed by slug — same data-only pattern as the scene catalogue.
// The exported GalleryCategory shape (with .icon/.color/.bgColor) is unchanged,
// so every existing gallery route keeps working.
export type GalleryCategory = CoreGalleryCategory & {
  icon: IconDefinition;
  color: string; // Tailwind text color class for the icon
  bgColor: string; // Tailwind bg color class for the icon container
};

const GALLERY_CATEGORY_PRESENTATION: Record<
  string,
  { icon: IconDefinition; color: string; bgColor: string }
> = {
  animals: {
    icon: faPaw,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
  },
  fantasy: {
    icon: faWandMagicSparkles,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
  },
  dragons: {
    icon: faDragon,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
  },
  unicorns: {
    icon: faHorseHead,
    color: 'text-crayon-pink',
    bgColor: 'bg-crayon-pink/10',
  },
  princesses: {
    icon: faCrown,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
  },
  superheroes: {
    icon: faMask,
    color: 'text-crayon-yellow',
    bgColor: 'bg-crayon-yellow/10',
  },
  dinosaurs: {
    icon: faDinosaur,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
  },
  space: {
    icon: faRocket,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
  },
  underwater: {
    icon: faFishFins,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
  },
  vehicles: {
    icon: faCar,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
  },
  pirates: {
    icon: faSkullCrossbones,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
  },
  nature: {
    icon: faFlower,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
  },
  holidays: {
    icon: faTreeChristmas,
    color: 'text-crayon-pink',
    bgColor: 'bg-crayon-pink/10',
  },
  robots: {
    icon: faRobot,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
  },
  food: {
    icon: faPizzaSlice,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
  },
};

// Fallback presentation for any future shared category without a web mapping.
const DEFAULT_CATEGORY_PRESENTATION = {
  icon: faPaw,
  color: 'text-crayon-orange',
  bgColor: 'bg-crayon-orange/10',
};

// SEO-optimized gallery categories targeting popular search terms.
// Maps to tags[] field in ColoringImage model. Data from coloring-core; web
// presentation merged in by slug.
export const GALLERY_CATEGORIES: GalleryCategory[] =
  CORE_GALLERY_CATEGORIES.map((cat) => ({
    ...cat,
    ...(GALLERY_CATEGORY_PRESENTATION[cat.slug] ??
      DEFAULT_CATEGORY_PRESENTATION),
  }));

// Helper to find category by slug
export const getCategoryBySlug = (slug: string): GalleryCategory | undefined =>
  GALLERY_CATEGORIES.find((cat) => cat.slug === slug);

// Helper to find categories that match a tag
export const getCategoriesForTag = (tag: string): GalleryCategory[] =>
  GALLERY_CATEGORIES.filter((cat) =>
    cat.tags.some((t) => tag.toLowerCase().includes(t.toLowerCase())),
  );

// Authors for generated blog posts — runtime value lives in
// @one-colored-pixel/coloring-core; import there directly (see the
// BLOG_TOPICS comment block above for why).
export type { BlogAuthor } from '@one-colored-pixel/coloring-core';

// ─── Voice mode ────────────────────────────────────────────────────────────
//
// Cached Q1 audio for the 2-turn voice flow ("Tell us what you want to
// colour."). Generated once via `scripts/generate-voice-q1.ts` and uploaded
// to prod R2 — the URL resolves the same in dev and prod since we point at
// `assets.chunkycrayon.com`. If the Q1 copy, voice id, or TTS model changes,
// re-run the generate script and update this URL (the cache key includes
// all three so a new file gets uploaded to a new path).
//
// See `docs/voice-mode/README.md` for the full Q1/Q2 flow.
export const VOICE_Q1_TEXT = '[warm] Tell us what you want to colour.';
export const VOICE_Q1_AUDIO_URL =
  'https://assets.chunkycrayon.com/voice-tts/fb5e5f11aab81d0a2a93632ec3e737869706515e0edd1e7494a70a4fe175cdba.mp3';
