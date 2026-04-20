import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import {
  faInstagram,
  faThreads,
  faFacebookF,
  faTiktok,
  faPinterest,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';

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

// Sticker configuration for canvas decorations
export type StickerCategory =
  | 'shapes'
  | 'emojis'
  | 'stars'
  | 'hearts'
  | 'nature'
  | 'fun';

export type Sticker = {
  id: string;
  name: string;
  category: StickerCategory;
  emoji: string; // Emoji representation for the sticker
};

// Available stickers for canvas decoration
export const CANVAS_STICKERS: Sticker[] = [
  // Stars category
  { id: 'star-yellow', name: 'Yellow Star', category: 'stars', emoji: '⭐' },
  { id: 'star-sparkle', name: 'Sparkle Star', category: 'stars', emoji: '✨' },
  { id: 'star-glow', name: 'Glowing Star', category: 'stars', emoji: '🌟' },
  {
    id: 'star-shooting',
    name: 'Shooting Star',
    category: 'stars',
    emoji: '💫',
  },

  // Hearts category
  { id: 'heart-red', name: 'Red Heart', category: 'hearts', emoji: '❤️' },
  { id: 'heart-pink', name: 'Pink Heart', category: 'hearts', emoji: '💕' },
  {
    id: 'heart-sparkle',
    name: 'Sparkle Heart',
    category: 'hearts',
    emoji: '💖',
  },
  {
    id: 'heart-rainbow',
    name: 'Rainbow Heart',
    category: 'hearts',
    emoji: '🩷',
  },

  // Shapes category
  { id: 'circle', name: 'Circle', category: 'shapes', emoji: '🔵' },
  { id: 'square', name: 'Square', category: 'shapes', emoji: '🟦' },
  { id: 'triangle', name: 'Triangle', category: 'shapes', emoji: '🔺' },
  { id: 'diamond', name: 'Diamond', category: 'shapes', emoji: '💎' },

  // Nature category
  { id: 'flower', name: 'Flower', category: 'nature', emoji: '🌸' },
  { id: 'sun', name: 'Sun', category: 'nature', emoji: '☀️' },
  { id: 'rainbow', name: 'Rainbow', category: 'nature', emoji: '🌈' },
  { id: 'cloud', name: 'Cloud', category: 'nature', emoji: '☁️' },
  { id: 'butterfly', name: 'Butterfly', category: 'nature', emoji: '🦋' },
  { id: 'leaf', name: 'Leaf', category: 'nature', emoji: '🍃' },

  // Emojis category
  { id: 'smile', name: 'Smile', category: 'emojis', emoji: '😊' },
  { id: 'love', name: 'Love Eyes', category: 'emojis', emoji: '😍' },
  { id: 'cool', name: 'Cool', category: 'emojis', emoji: '😎' },
  { id: 'wink', name: 'Wink', category: 'emojis', emoji: '😉' },

  // Fun category
  { id: 'crown', name: 'Crown', category: 'fun', emoji: '👑' },
  { id: 'unicorn', name: 'Unicorn', category: 'fun', emoji: '🦄' },
  { id: 'rocket', name: 'Rocket', category: 'fun', emoji: '🚀' },
  { id: 'balloon', name: 'Balloon', category: 'fun', emoji: '🎈' },
  { id: 'gift', name: 'Gift', category: 'fun', emoji: '🎁' },
  { id: 'cake', name: 'Cake', category: 'fun', emoji: '🎂' },
];

// Group stickers by category for UI
export const STICKER_CATEGORIES = {
  stars: { name: 'Stars', icon: '⭐' },
  hearts: { name: 'Hearts', icon: '❤️' },
  shapes: { name: 'Shapes', icon: '🔷' },
  nature: { name: 'Nature', icon: '🌸' },
  emojis: { name: 'Emojis', icon: '😊' },
  fun: { name: 'Fun', icon: '🎉' },
} as const;

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
};

export type PlanInterval = 'monthly' | 'annual';

export type SubscriptionPlan = {
  key: PlanName;
  price: string; // e.g '£7.99'
  credits: string;
  featureKeys: string[]; // Translation keys for features (e.g. 'textPrompts', 'advancedEditing')
  stripePriceEnv: string; // e.g 'NEXT_PUBLIC_STRIPE_PRICE_CRAYON_MONTHLY'
  mostPopular?: boolean;
};

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
} as const;

export const SUBSCRIPTION_PLANS: Record<PlanInterval, SubscriptionPlan[]> = {
  monthly: [
    {
      key: PlanName.SPLASH,
      price: '£7.99',
      credits: `${PLAN_CREDITS[PlanName.SPLASH][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: ['credits250', 'allFeatures', 'noRollover'],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY as string,
    },
    {
      key: PlanName.RAINBOW,
      price: '£13.99',
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: [
        'credits500',
        'allFeatures',
        'rollover1Month',
        'prioritySupport',
      ],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY as string,
      mostPopular: true,
    },
    {
      key: PlanName.SPARKLE,
      price: '£24.99',
      credits: `${PLAN_CREDITS[PlanName.SPARKLE][BillingPeriod.MONTHLY]} credits/month`,
      featureKeys: [
        'credits1000',
        'allFeatures',
        'rollover2Months',
        'commercialUse',
      ],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY as string,
    },
  ],
  annual: [
    {
      key: PlanName.SPLASH,
      price: '£79.99',
      credits: `${PLAN_CREDITS[PlanName.SPLASH][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: ['credits250', 'allFeatures', 'noRollover'],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL as string,
    },
    {
      key: PlanName.RAINBOW,
      price: '£139.99',
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: [
        'credits500',
        'allFeatures',
        'rollover1Month',
        'prioritySupport',
      ],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL as string,
      mostPopular: true,
    },
    {
      key: PlanName.SPARKLE,
      price: '£249.99',
      credits: `${PLAN_CREDITS[PlanName.SPARKLE][BillingPeriod.ANNUAL]} credits/month`,
      featureKeys: [
        'credits1000',
        'allFeatures',
        'rollover2Months',
        'commercialUse',
      ],
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL as string,
    },
  ],
};

export const STRIPE_API_VERSION = '2025-08-27.basil';

export type CreditPack = {
  key: keyof typeof CREDIT_PACK_AMOUNTS;
  name: string;
  credits: number;
  price: string;
  stripePriceEnv: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    key: 'CREDITS_100',
    name: '100 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_100,
    price: '£3.00',
    stripePriceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100 as string,
  },
  {
    key: 'CREDITS_500',
    name: '500 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_500,
    price: '£12.00',
    stripePriceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500 as string,
  },
  {
    key: 'CREDITS_1000',
    name: '1,000 Credits Pack',
    credits: CREDIT_PACK_AMOUNTS.CREDITS_1000,
    price: '£20.00',
    stripePriceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000 as string,
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
  {
    id: 'x',
    label: 'X',
    href: 'https://x.com/chunkycrayon',
    icon: faXTwitter,
  },
  {
    id: 'threads',
    label: 'Threads',
    href: 'https://threads.net/@getchunkycrayon',
    icon: faThreads,
  },
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

  // ===== COLORING PAGE CREATION (Core Funnel) =====
  CREATION_STARTED: 'creation_started', // User starts typing description
  CREATION_SUBMITTED: 'creation_submitted', // Description submitted
  CREATION_COMPLETED: 'creation_completed', // Image generated successfully
  CREATION_FAILED: 'creation_failed', // Generation failed
  CREATION_RETRIED: 'creation_retried', // User retried after failure
  CREATION_ANALYZED: 'creation_analyzed', // Image content analyzed for insights

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
  PAGE_COLORED: 'page_colored', // User started coloring
  PAGE_COLOR_SELECTED: 'page_color_selected', // Color picked
  PAGE_STROKE_MADE: 'page_stroke_made', // Drawing stroke completed
  PAGE_SAVED: 'page_saved', // Saved to gallery
  PAGE_SHARED: 'page_shared', // Shared via link

  // ===== DOWNLOAD & PRINT (Key Conversions) =====
  DOWNLOAD_PDF_CLICKED: 'download_pdf_clicked', // PDF download initiated
  DOWNLOAD_PDF_COMPLETED: 'download_pdf_completed', // PDF download successful
  PRINT_CLICKED: 'print_clicked', // Print button clicked

  // ===== EMAIL LIST (Lead Generation) =====
  EMAIL_SIGNUP_STARTED: 'email_signup_started', // Started entering email
  EMAIL_SIGNUP_COMPLETED: 'email_signup_completed', // Email submitted
  EMAIL_SIGNUP_FAILED: 'email_signup_failed', // Signup failed

  // ===== PRICING & CONVERSION FUNNEL =====
  PRICING_PAGE_VIEWED: 'pricing_page_viewed', // Pricing page loaded
  PRICING_INTERVAL_TOGGLED: 'pricing_interval_toggled', // Monthly/Annual toggle
  PRICING_PLAN_CLICKED: 'pricing_plan_clicked', // Plan CTA clicked
  PRICING_CREDITS_CLICKED: 'pricing_credits_clicked', // Credit pack clicked

  // ===== CHECKOUT & PAYMENTS (Revenue) =====
  CHECKOUT_STARTED: 'checkout_started', // Redirecting to Stripe
  CHECKOUT_COMPLETED: 'checkout_completed', // Payment successful
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

  // ===== LOADING EXPERIENCE (Colo mascot voice) =====
  LOADING_AUDIO_GENERATED: 'loading_audio_generated', // Colo voice audio generated
  LOADING_AUDIO_PLAYED: 'loading_audio_played', // Audio playback started
  LOADING_AUDIO_FAILED: 'loading_audio_failed', // Audio generation failed

  // ===== LOCALIZATION =====
  LANGUAGE_CHANGED: 'language_changed', // User switches language/locale
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

// Testimonial metadata - translatable content lives in translation files
export const TESTIMONIAL_META: TestimonialMeta[] = [
  { id: 'testimonial-1', translationKey: '1', rating: 5 },
  { id: 'testimonial-2', translationKey: '2', rating: 5 },
  { id: 'testimonial-3', translationKey: '3', rating: 5 },
  { id: 'testimonial-4', translationKey: '4', rating: 5 },
  { id: 'testimonial-5', translationKey: '5', rating: 5 },
  { id: 'testimonial-6', translationKey: '6', rating: 5 },
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

// Hero social proof stats
export const SOCIAL_PROOF_STATS = {
  reviewCount: 183,
  averageRating: 4.9,
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

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: 'parenting',
    name: 'Parenting & Family',
    slug: 'parenting',
    description: 'Tips for creative family time and child development',
  },
  {
    id: 'educational',
    name: 'Educational Activities',
    slug: 'educational',
    description: 'Learning through coloring and creativity',
  },
  {
    id: 'seasonal',
    name: 'Seasonal & Holidays',
    slug: 'seasonal',
    description: 'Holiday-themed coloring activities',
  },
  {
    id: 'adult-coloring',
    name: 'Adult Coloring',
    slug: 'adult-coloring',
    description: 'Mindfulness, relaxation, and art therapy',
  },
  {
    id: 'themes',
    name: 'Popular Themes',
    slug: 'themes',
    description: 'Trending characters and themes kids love',
  },
  {
    id: 'techniques',
    name: 'Coloring Techniques',
    slug: 'techniques',
    description: 'Tips for better coloring results',
  },
];

export type BlogTopic = {
  topic: string;
  category: string;
  keywords: string[];
};

// Comprehensive blog topics for SEO - targeting parents AND adults
export const BLOG_TOPICS: BlogTopic[] = [
  // ===== PARENTING & FAMILY (Target: Parents) =====
  {
    topic: 'Benefits of coloring for child development',
    category: 'parenting',
    keywords: ['child development', 'motor skills', 'creativity', 'learning'],
  },
  {
    topic: 'Screen-free activities for kids',
    category: 'parenting',
    keywords: ['screen time', 'offline activities', 'creative play'],
  },
  {
    topic: 'Rainy day coloring activities for kids',
    category: 'parenting',
    keywords: ['rainy day', 'indoor activities', 'kids activities'],
  },
  {
    topic: 'How coloring helps with anxiety in children',
    category: 'parenting',
    keywords: ['anxiety', 'calm', 'emotional regulation'],
  },
  {
    topic: 'Family coloring night ideas',
    category: 'parenting',
    keywords: ['family activities', 'bonding', 'quality time'],
  },
  {
    topic: 'Best coloring supplies for toddlers',
    category: 'parenting',
    keywords: ['toddler', 'crayons', 'supplies', 'art materials'],
  },
  {
    topic: 'Teaching patience through coloring',
    category: 'parenting',
    keywords: ['patience', 'focus', 'concentration'],
  },
  {
    topic: 'Coloring activities for long car journeys',
    category: 'parenting',
    keywords: ['car journey', 'travel activities', 'road trip'],
  },
  {
    topic: 'Why personalised coloring pages engage kids more',
    category: 'parenting',
    keywords: ['personalised', 'engagement', 'creativity'],
  },
  {
    topic: 'Coloring activities for children with ADHD',
    category: 'parenting',
    keywords: ['ADHD', 'focus', 'calming activities'],
  },
  {
    topic: 'How to encourage reluctant artists',
    category: 'parenting',
    keywords: ['reluctant artist', 'encouragement', 'creativity'],
  },
  {
    topic: 'Grandparent and grandchild coloring activities',
    category: 'parenting',
    keywords: ['grandparents', 'bonding', 'intergenerational'],
  },
  {
    topic: 'Coloring for children with special needs',
    category: 'parenting',
    keywords: ['special needs', 'inclusive', 'accessibility'],
  },
  {
    topic: 'Birthday party coloring activities',
    category: 'parenting',
    keywords: ['birthday party', 'party activities', 'kids party'],
  },
  {
    topic: 'Sibling coloring activities to reduce rivalry',
    category: 'parenting',
    keywords: ['siblings', 'rivalry', 'cooperative play'],
  },

  // ===== EDUCATIONAL (Target: Parents & Teachers) =====
  {
    topic: 'Using coloring pages to teach letters and numbers',
    category: 'educational',
    keywords: ['letters', 'numbers', 'alphabet', 'learning'],
  },
  {
    topic: 'Color recognition activities for preschoolers',
    category: 'educational',
    keywords: ['preschool', 'colors', 'early learning'],
  },
  {
    topic: 'Coloring pages for learning about animals',
    category: 'educational',
    keywords: ['animals', 'wildlife', 'nature', 'learning'],
  },
  {
    topic: 'Geography coloring activities for kids',
    category: 'educational',
    keywords: ['geography', 'maps', 'countries', 'world'],
  },
  {
    topic: 'Science-themed coloring pages for curious kids',
    category: 'educational',
    keywords: ['science', 'STEM', 'space', 'dinosaurs'],
  },
  {
    topic: 'History through coloring pages',
    category: 'educational',
    keywords: ['history', 'ancient', 'historical figures'],
  },
  {
    topic: 'Coloring activities for vocabulary building',
    category: 'educational',
    keywords: ['vocabulary', 'words', 'language'],
  },
  {
    topic: 'Maths-themed coloring activities',
    category: 'educational',
    keywords: ['maths', 'counting', 'shapes'],
  },
  {
    topic: 'Coloring pages for learning about emotions',
    category: 'educational',
    keywords: ['emotions', 'feelings', 'social skills'],
  },
  {
    topic: 'Seasonal learning with themed coloring pages',
    category: 'educational',
    keywords: ['seasons', 'weather', 'nature'],
  },
  {
    topic: 'Music and instrument coloring activities',
    category: 'educational',
    keywords: ['music', 'instruments', 'musical'],
  },
  {
    topic: 'Coloring activities for teaching kindness',
    category: 'educational',
    keywords: ['kindness', 'empathy', 'values'],
  },
  {
    topic: 'Environmental awareness through coloring',
    category: 'educational',
    keywords: ['environment', 'recycling', 'planet'],
  },
  {
    topic: 'Cultural diversity coloring pages',
    category: 'educational',
    keywords: ['culture', 'diversity', 'world cultures'],
  },
  {
    topic: 'Safety lessons through coloring activities',
    category: 'educational',
    keywords: ['safety', 'road safety', 'fire safety'],
  },

  // ===== SEASONAL & HOLIDAYS (Target: Parents) =====
  {
    topic: 'Christmas coloring activities for kids',
    category: 'seasonal',
    keywords: ['Christmas', 'holiday', 'Santa', 'festive'],
  },
  {
    topic: 'Easter coloring page ideas',
    category: 'seasonal',
    keywords: ['Easter', 'bunny', 'eggs', 'spring'],
  },
  {
    topic: 'Halloween coloring pages that are not too scary',
    category: 'seasonal',
    keywords: ['Halloween', 'pumpkin', 'spooky', 'costumes'],
  },
  {
    topic: 'Summer holiday coloring activities',
    category: 'seasonal',
    keywords: ['summer', 'beach', 'holiday', 'vacation'],
  },
  {
    topic: 'Back to school coloring pages',
    category: 'seasonal',
    keywords: ['school', 'back to school', 'September'],
  },
  {
    topic: 'Winter wonderland coloring ideas',
    category: 'seasonal',
    keywords: ['winter', 'snow', 'snowman', 'cold'],
  },
  {
    topic: 'Spring flower coloring activities',
    category: 'seasonal',
    keywords: ['spring', 'flowers', 'garden', 'nature'],
  },
  {
    topic: "Valentine's Day coloring pages for kids",
    category: 'seasonal',
    keywords: ['Valentine', 'hearts', 'love', 'friendship'],
  },
  {
    topic: "Mother's Day coloring gift ideas",
    category: 'seasonal',
    keywords: ['Mother Day', 'mum', 'gift', 'family'],
  },
  {
    topic: "Father's Day coloring activities",
    category: 'seasonal',
    keywords: ['Father Day', 'dad', 'gift', 'family'],
  },
  {
    topic: 'Diwali festival of lights coloring pages',
    category: 'seasonal',
    keywords: ['Diwali', 'festival', 'lights', 'celebration'],
  },
  {
    topic: 'Chinese New Year coloring activities',
    category: 'seasonal',
    keywords: ['Chinese New Year', 'lunar', 'dragon', 'celebration'],
  },
  {
    topic: 'Hanukkah coloring page ideas',
    category: 'seasonal',
    keywords: ['Hanukkah', 'menorah', 'holiday'],
  },
  {
    topic: 'Eid celebration coloring pages',
    category: 'seasonal',
    keywords: ['Eid', 'celebration', 'festival'],
  },
  {
    topic: 'Autumn leaves and harvest coloring',
    category: 'seasonal',
    keywords: ['autumn', 'fall', 'leaves', 'harvest'],
  },

  // ===== ADULT COLOURING (Target: Adults) =====
  {
    topic: 'Benefits of adult coloring for stress relief',
    category: 'adult-coloring',
    keywords: ['stress relief', 'relaxation', 'mindfulness'],
  },
  {
    topic: 'Mandala coloring for meditation',
    category: 'adult-coloring',
    keywords: ['mandala', 'meditation', 'zen', 'mindfulness'],
  },
  {
    topic: 'Art therapy through coloring',
    category: 'adult-coloring',
    keywords: ['art therapy', 'mental health', 'healing'],
  },
  {
    topic: 'Coloring for anxiety and depression',
    category: 'adult-coloring',
    keywords: ['anxiety', 'depression', 'mental wellness'],
  },
  {
    topic: 'Nature patterns coloring for adults',
    category: 'adult-coloring',
    keywords: ['nature', 'botanical', 'floral', 'patterns'],
  },
  {
    topic: 'Geometric patterns coloring therapy',
    category: 'adult-coloring',
    keywords: ['geometric', 'patterns', 'abstract'],
  },
  {
    topic: 'Coloring as a hobby for busy adults',
    category: 'adult-coloring',
    keywords: ['hobby', 'relaxation', 'self-care'],
  },
  {
    topic: 'Creating a coloring routine for wellbeing',
    category: 'adult-coloring',
    keywords: ['routine', 'wellbeing', 'self-care'],
  },
  {
    topic: 'Best colored pencils for adult coloring',
    category: 'adult-coloring',
    keywords: ['pencils', 'supplies', 'art materials'],
  },
  {
    topic: 'Coloring for insomnia and better sleep',
    category: 'adult-coloring',
    keywords: ['insomnia', 'sleep', 'bedtime routine'],
  },
  {
    topic: 'Workplace coloring breaks for productivity',
    category: 'adult-coloring',
    keywords: ['workplace', 'productivity', 'breaks'],
  },
  {
    topic: 'Coloring for seniors and cognitive health',
    category: 'adult-coloring',
    keywords: ['seniors', 'elderly', 'cognitive health'],
  },
  {
    topic: 'Couples coloring activities for date night',
    category: 'adult-coloring',
    keywords: ['couples', 'date night', 'bonding'],
  },
  {
    topic: 'Coloring communities and social groups',
    category: 'adult-coloring',
    keywords: ['community', 'social', 'groups', 'clubs'],
  },
  {
    topic: 'The science behind why coloring is calming',
    category: 'adult-coloring',
    keywords: ['science', 'psychology', 'calming'],
  },

  // ===== POPULAR THEMES (Target: Parents) =====
  {
    topic: 'Dinosaur coloring pages kids love',
    category: 'themes',
    keywords: ['dinosaurs', 'T-Rex', 'prehistoric'],
  },
  {
    topic: 'Unicorn and rainbow coloring ideas',
    category: 'themes',
    keywords: ['unicorn', 'rainbow', 'magical'],
  },
  {
    topic: 'Superhero coloring pages for kids',
    category: 'themes',
    keywords: ['superhero', 'hero', 'action'],
  },
  {
    topic: 'Princess and fairy tale coloring pages',
    category: 'themes',
    keywords: ['princess', 'fairy tale', 'castle'],
  },
  {
    topic: 'Space and astronaut coloring activities',
    category: 'themes',
    keywords: ['space', 'astronaut', 'planets', 'rocket'],
  },
  {
    topic: 'Ocean and sea creatures coloring pages',
    category: 'themes',
    keywords: ['ocean', 'sea', 'fish', 'underwater'],
  },
  {
    topic: 'Farm animals coloring for toddlers',
    category: 'themes',
    keywords: ['farm', 'animals', 'toddler'],
  },
  {
    topic: 'Dragon and fantasy coloring pages',
    category: 'themes',
    keywords: ['dragon', 'fantasy', 'magical'],
  },
  {
    topic: 'Vehicle and transport coloring pages',
    category: 'themes',
    keywords: ['vehicles', 'cars', 'trains', 'planes'],
  },
  {
    topic: 'Mermaid coloring page ideas',
    category: 'themes',
    keywords: ['mermaid', 'underwater', 'magical'],
  },
  {
    topic: 'Robot and technology coloring pages',
    category: 'themes',
    keywords: ['robot', 'technology', 'futuristic'],
  },
  {
    topic: 'Jungle and safari animal coloring',
    category: 'themes',
    keywords: ['jungle', 'safari', 'lion', 'elephant'],
  },
  {
    topic: 'Pirate adventure coloring pages',
    category: 'themes',
    keywords: ['pirate', 'treasure', 'adventure'],
  },
  {
    topic: 'Sports-themed coloring activities',
    category: 'themes',
    keywords: ['sports', 'football', 'games'],
  },
  {
    topic: 'Fairy garden coloring pages',
    category: 'themes',
    keywords: ['fairy', 'garden', 'magical', 'nature'],
  },

  // ===== TECHNIQUES (Target: Parents & Adults) =====
  {
    topic: 'Blending techniques for colored pencils',
    category: 'techniques',
    keywords: ['blending', 'pencils', 'technique'],
  },
  {
    topic: 'Choosing the right colors for coloring pages',
    category: 'techniques',
    keywords: ['colors', 'color theory', 'palette'],
  },
  {
    topic: 'How to color within the lines tips',
    category: 'techniques',
    keywords: ['lines', 'control', 'beginners'],
  },
  {
    topic: 'Adding shading to coloring pages',
    category: 'techniques',
    keywords: ['shading', 'depth', '3D effect'],
  },
  {
    topic: 'Watercolor techniques for coloring pages',
    category: 'techniques',
    keywords: ['watercolor', 'painting', 'technique'],
  },
  {
    topic: 'Marker techniques for bold coloring',
    category: 'techniques',
    keywords: ['markers', 'bold', 'vibrant'],
  },
  {
    topic: 'Creating gradient effects in coloring',
    category: 'techniques',
    keywords: ['gradient', 'ombre', 'blending'],
  },
  {
    topic: 'Tips for coloring large detailed pages',
    category: 'techniques',
    keywords: ['detailed', 'intricate', 'patience'],
  },
  {
    topic: 'Mixing media in coloring projects',
    category: 'techniques',
    keywords: ['mixed media', 'creative', 'experiment'],
  },
  {
    topic: 'Displaying and framing finished coloring pages',
    category: 'techniques',
    keywords: ['display', 'frame', 'art'],
  },
  {
    topic: 'Digital coloring tips for beginners',
    category: 'techniques',
    keywords: ['digital', 'tablet', 'apps'],
  },
  {
    topic: 'How to fix coloring mistakes',
    category: 'techniques',
    keywords: ['mistakes', 'corrections', 'tips'],
  },
  {
    topic: 'Creating texture effects in coloring',
    category: 'techniques',
    keywords: ['texture', 'effects', 'technique'],
  },
  {
    topic: 'Metallic and gel pen effects',
    category: 'techniques',
    keywords: ['metallic', 'gel pen', 'special effects'],
  },
  {
    topic: 'Background coloring techniques',
    category: 'techniques',
    keywords: ['background', 'composition', 'technique'],
  },

  // ===== PARENTING & FAMILY (research 2026) =====
  {
    topic: 'Sensory Coloring Kits for Autistic Toddlers',
    category: 'parenting',
    keywords: [
      'sensory coloring kit for autism',
      'toddler coloring activities autism',
      'adaptive coloring tools',
      'autism-friendly coloring pages',
      'tactile coloring experiences',
    ],
  },
  {
    topic: 'Digital Detox Coloring Evenings for Tech-Overwhelmed Families',
    category: 'parenting',
    keywords: [
      'digital detox coloring night',
      'family tech-free activities',
      'unplugged parenting ideas',
      'screen-free family bonding',
      'mindful tech breaks for kids',
    ],
  },
  {
    topic: 'Multilingual Coloring Pages for Bilingual Household Bonding',
    category: 'parenting',
    keywords: [
      'bilingual coloring pages',
      'language learning through coloring',
      'multilingual family activities',
      'cultural connection coloring',
      'dual language coloring sheets',
    ],
  },
  {
    topic: 'Parent-Child Co-Coloring for Emotional Intelligence Development',
    category: 'parenting',
    keywords: [
      'parent child emotional coloring',
      'co coloring for feelings',
      'emotional intelligence coloring activities',
      'family emotional literacy',
      'coloring conversations for kids',
    ],
  },
  {
    topic: 'Postpartum Recovery Coloring Sessions for New Moms',
    category: 'parenting',
    keywords: [
      'postpartum coloring therapy',
      'new mom relaxation activities',
      'coloring for postpartum recovery',
      'self-care for mothers',
      'mental wellness post-birth',
    ],
  },
  {
    topic: 'Single-Parent Coloring Rituals for Quality Time',
    category: 'parenting',
    keywords: [
      'single parent bonding activities',
      'coloring for solo parents',
      'quality time with one parent',
      'parent child connection time',
      'coloring as solo parenting tool',
    ],
  },
  {
    topic: 'Neurodivergent-Friendly Coloring Strategies for Calm Transitions',
    category: 'parenting',
    keywords: [
      'neurodivergent transition strategies',
      'calm coloring for sensory shifts',
      'adaptive routines for neurodiverse kids',
      'transition support through coloring',
      'neurodivergent friendly activities',
    ],
  },
  {
    topic: 'Intergenerational Coloring Projects for Memory Care Support',
    category: 'parenting',
    keywords: [
      'intergenerational coloring activities',
      'memory care coloring projects',
      'family history coloring pages',
      'grandparent grandchild memory sharing',
      'coloring for dementia support',
    ],
  },
  {
    topic: 'Attachment-Based Coloring for Reactive Attachment Disorder',
    category: 'parenting',
    keywords: [
      'coloring for RAD support',
      'attachment therapy through art',
      'RAD parenting strategies',
      'coloring to build trust',
      'therapeutic parent-child coloring',
    ],
  },
  {
    topic: 'Eco-Conscious Coloring Practices for Zero-Waste Parenting',
    category: 'parenting',
    keywords: [
      'eco friendly coloring activities',
      'zero waste art projects',
      'sustainable coloring practices',
      'green parenting art time',
      'non-toxic coloring supplies',
    ],
  },
  {
    topic: 'Galentines Coloring Parties for Mom Friendships',
    category: 'parenting',
    keywords: [
      'mom friendship coloring events',
      'galentines parent gatherings',
      'mom self-care through coloring',
      'parent social support activities',
      "women's coloring groups",
    ],
  },
  {
    topic: 'Sensory Modulation Coloring for Overwhelmed Children',
    category: 'parenting',
    keywords: [
      'sensory modulation techniques',
      'coloring for emotional regulation',
      'sensory overload coloring strategies',
      'calming art activities',
      'modulation through creative expression',
    ],
  },
  {
    topic: 'Parent-Child Coloring Contracts for Healthy Boundaries',
    category: 'parenting',
    keywords: [
      'parenting boundaries through art',
      'contract coloring agreements',
      'co-created family rules',
      'boundary setting with coloring',
      'collaborative parenting tools',
    ],
  },
  {
    topic: 'Color-Based Emotion Tracking for Special Needs Communication',
    category: 'parenting',
    keywords: [
      'emotion tracking for nonverbal kids',
      'color coding feelings',
      'special needs emotional expression',
      'visual communication through coloring',
      'color emotion charts',
    ],
  },
  {
    topic: 'Post-Divorce Coloring Rituals for Family Reconnection',
    category: 'parenting',
    keywords: [
      'divorce recovery coloring',
      'blended family bonding',
      'post separation activities',
      'co-parenting connection tools',
      'divorce healing through art',
    ],
  },
  {
    topic: 'Cultural Heritage Coloring for Immigrant Families',
    category: 'parenting',
    keywords: [
      'immigrant family identity activities',
      'cultural preservation through coloring',
      'heritage connection coloring',
      'bicultural parenting activities',
      'family ancestry coloring pages',
    ],
  },
  {
    topic: 'Hospitalization Prep Coloring for Pediatric Anxiety',
    category: 'parenting',
    keywords: [
      'hospital prep for children',
      'medical anxiety coloring',
      'procedure preparation activities',
      'healthcare comfort coloring',
      'pediatric stress reduction',
    ],
  },
  {
    topic: 'Nature-Inspired Coloring for Urban Family Connection',
    category: 'parenting',
    keywords: [
      'urban nature coloring activities',
      'city family outdoor connection',
      'bringing nature indoors through art',
      'urban mindfulness coloring',
      'nature awareness in cities',
    ],
  },
  {
    topic: "Parental Self-Care Coloring During Children's Activities",
    category: 'parenting',
    keywords: [
      'parent self care during kids sports',
      'waiting time self care',
      'parallel coloring activities',
      'mindful parenting moments',
      'self care while supervising kids',
    ],
  },
  {
    topic: 'Racial Identity Coloring for Multiracial Families',
    category: 'parenting',
    keywords: [
      'multiracial family identity',
      'racial identity exploration',
      'coloring for diversity education',
      'family conversations about race',
      'inclusive coloring pages for mixed families',
    ],
  },
  {
    topic: 'First Responders Family Coloring for Trauma Support',
    category: 'parenting',
    keywords: [
      'first responder family activities',
      'trauma support coloring',
      'emergency worker family connection',
      'stress relief for responder families',
      'occupational hazard coloring pages',
    ],
  },
  {
    topic: 'Seasonal Affective Coloring for Winter Parent Wellness',
    category: 'parenting',
    keywords: [
      'seasonal affective disorder parenting',
      'winter blues relief activities',
      'light therapy coloring combinations',
      'parent wellness in dark months',
      'seasonal mood support coloring',
    ],
  },
  {
    topic: 'Parent-Child Mindful Coloring for ADHD Focus',
    category: 'parenting',
    keywords: [
      'ADHD calm through coloring',
      'mindful coloring for attention',
      'focus strategies for hyperactive children',
      'parenting ADHD without medication',
      'sensory focused coloring',
    ],
  },
  {
    topic: 'Grief Processing Coloring for Families After Loss',
    category: 'parenting',
    keywords: [
      'grief support coloring activities',
      'processing loss through art',
      'family bereavement activities',
      'healing after death coloring',
      'memorial coloring pages',
    ],
  },
  {
    topic: 'Religious Upbringing Coloring for Interfaith Families',
    category: 'parenting',
    keywords: [
      'interfaith family activities',
      'religious education coloring',
      'faith blending through art',
      'interfaith parenting resources',
      'spiritual exploration coloring pages',
    ],
  },
  {
    topic: 'Financial Literacy Coloring for Kid Entrepreneurship',
    category: 'parenting',
    keywords: [
      'money management for kids',
      'entrepreneurship coloring pages',
      'financial literacy activities',
      'kids business ideas coloring',
      'teaching kids about money',
    ],
  },
  {
    topic: 'Military Deployment Prep Coloring for Family Connection',
    category: 'parenting',
    keywords: [
      'military family deployment activities',
      'preparation for separation',
      'parent deployment support',
      'military children emotional support',
      'deployment coping strategies',
    ],
  },
  {
    topic: 'Food Allergy Awareness Coloring for School Safety',
    category: 'parenting',
    keywords: [
      'food allergy education coloring',
      'school safety coloring pages',
      'allergy awareness activities',
      'managing allergies through art',
      'allergy preparedness for kids',
    ],
  },
  {
    topic: 'Positive Discipline Coloring for Consistent Routines',
    category: 'parenting',
    keywords: [
      'positive parenting through art',
      'discipline strategies coloring',
      'routine building activities',
      'behavior expectations coloring',
      'gentle parenting visual tools',
    ],
  },
  {
    topic: 'Bonding Through Braille Coloring for Visually Impaired Families',
    category: 'parenting',
    keywords: [
      'braille coloring activities',
      'visually impaired family bonding',
      'tactile coloring for blind children',
      'accessible art for sight loss',
      'multisensory coloring experiences',
    ],
  },
  // ===== EDUCATIONAL (research 2026) =====
  {
    topic: 'Ocean Currents Mapping Through Themed Coloring',
    category: 'educational',
    keywords: [
      'ocean current educational activities',
      'marine science coloring pages',
      'current mapping for kids',
      'ocean literacy through art',
      'marine geography coloring',
    ],
  },
  {
    topic: 'Microscopic Worlds Coloring for Cell Biology Understanding',
    category: 'educational',
    keywords: [
      'cell biology coloring pages',
      'microscopic organism art',
      'science visualization for kids',
      'biology education through coloring',
      'microscopic world exploration',
    ],
  },
  {
    topic: 'Solar System Scale Modeling via Coloring Activities',
    category: 'educational',
    keywords: [
      'solar system scale activities',
      'space education coloring pages',
      'astronomy for kids',
      'planetary science through art',
      'scale model space projects',
    ],
  },
  {
    topic: 'Historical Timeline Coloring for Cause-Effect Understanding',
    category: 'educational',
    keywords: [
      'educational timeline activities',
      'historical cause effect coloring',
      'chronological thinking for kids',
      'history through visual timelines',
      'storytelling timeline pages',
    ],
  },
  {
    topic: 'Architectural Styles Coloring Across Cultures',
    category: 'educational',
    keywords: [
      'world architecture educational pages',
      'cultural building styles coloring',
      'architectural history for kids',
      'cross-cultural building comparison',
      'design history coloring',
    ],
  },
  {
    topic: 'Periodic Table Elements Coloring for Chemistry Foundations',
    category: 'educational',
    keywords: [
      'periodic table learning activities',
      'element science coloring pages',
      'chemistry education for kids',
      'scientific visualization through art',
      'molecular structure coloring',
    ],
  },
  {
    topic: 'Sign Language Alphabet Coloring for Communication Skills',
    category: 'educational',
    keywords: [
      'sign language learning activities',
      'ASL alphabet coloring pages',
      'communication skills for kids',
      'multilingual education through art',
      'deaf culture awareness pages',
    ],
  },
  {
    topic: 'State Capitals and Geopolitical Context Coloring',
    category: 'educational',
    keywords: [
      'state capitals geography activities',
      'geopolitical understanding coloring',
      'US state educational pages',
      'regional context learning',
      'capital city context for kids',
    ],
  },
  {
    topic: 'Human Anatomy Layers Coloring for Medical Understanding',
    category: 'educational',
    keywords: [
      'anatomy education coloring pages',
      'human body systems for kids',
      'medical science visualization',
      'layered anatomy learning',
      'body structure educational activities',
    ],
  },
  {
    topic: 'Ancient Writing Systems Coloring for Linguistic Evolution',
    category: 'educational',
    keywords: [
      'writing system history activities',
      'linguistic evolution coloring pages',
      'ancient language education',
      'historical communication methods',
      'script development for kids',
    ],
  },
  {
    topic: 'Mathematical Fractals Coloring for Pattern Recognition',
    category: 'educational',
    keywords: [
      'fractal mathematics education',
      'pattern recognition through art',
      'geometric math coloring pages',
      'recursive pattern activities',
      'visual mathematics learning',
    ],
  },
  {
    topic: 'Bird Migration Pathways Coloring for Conservation Awareness',
    category: 'educational',
    keywords: [
      'bird migration education activities',
      'wildlife conservation coloring pages',
      'migration pathway visualization',
      'avian science for kids',
      'ecological awareness through art',
    ],
  },
  {
    topic: 'Comparative Religion Symbols Coloring for Interfaith Understanding',
    category: 'educational',
    keywords: [
      'religious symbol education',
      'interfaith understanding activities',
      'spiritual symbol coloring pages',
      'religious literacy through art',
      'world faiths educational pages',
    ],
  },
  {
    topic: 'Climate Change Indicators Coloring for Environmental Literacy',
    category: 'educational',
    keywords: [
      'climate science education',
      'environmental indicators coloring',
      'climate change for kids',
      'global warming visualization',
      'eco literacy activities',
    ],
  },
  {
    topic: 'Musical Notation Coloring for Theory Fundamentals',
    category: 'educational',
    keywords: [
      'music theory education activities',
      'musical notation coloring pages',
      'score reading for kids',
      'rhythm visualization through art',
      'instrumental music education',
    ],
  },
  {
    topic: 'Cultural Mythology Story Coloring for Cross-Cultural Learning',
    category: 'educational',
    keywords: [
      'mythology education activities',
      'cultural stories coloring pages',
      'cross-cultural understanding through art',
      'folklore educational resources',
      'world mythologies for kids',
    ],
  },
  {
    topic: 'Engineering Design Cycle Coloring for STEM Fundamentals',
    category: 'educational',
    keywords: [
      'engineering education activities',
      'design process visual learning',
      'STEM cycle coloring pages',
      'prototyping concepts for kids',
      'invention process visualization',
    ],
  },
  {
    topic: 'Time Zones and Daylight Coloring for Global Awareness',
    category: 'educational',
    keywords: [
      'time zone education activities',
      'global daylight visualization',
      'geographical understanding coloring',
      'world clock concepts for kids',
      'international time awareness',
    ],
  },
  {
    topic: 'Botanical Anatomy Coloring for Plant Science Education',
    category: 'educational',
    keywords: [
      'plant biology education',
      'botanical anatomy coloring pages',
      'flower structure learning',
      'photosynthesis visualization',
      'plant science for kids',
    ],
  },
  {
    topic: 'Indigenous Language Revitalization Coloring for Cultural Awareness',
    category: 'educational',
    keywords: [
      'indigenous language education',
      'cultural preservation coloring',
      'native language revitalization',
      'linguistic heritage activities',
      'indigenous culture awareness pages',
    ],
  },
  {
    topic: 'Quantum Physics Concepts Simplified Through Coloring',
    category: 'educational',
    keywords: [
      'quantum physics for kids',
      'simplified science coloring pages',
      'particle physics education',
      'quantum concepts visualization',
      'advanced science for young learners',
    ],
  },
  {
    topic: 'Financial Ledgers Coloring for Early Accounting Concepts',
    category: 'educational',
    keywords: [
      'financial literacy coloring pages',
      'accounting education for kids',
      'ledger systems visualization',
      'money management concepts',
      'financial education activities',
    ],
  },
  {
    topic: 'Nutritional Science Coloring for Dietary Awareness',
    category: 'educational',
    keywords: [
      'nutrition education activities',
      'food science coloring pages',
      'dietary components visualization',
      'healthy eating concepts for kids',
      'vitamin knowledge development',
    ],
  },
  {
    topic: 'Optical Illusion Coloring for Visual Perception Learning',
    category: 'educational',
    keywords: [
      'visual perception activities',
      'optical illusion science',
      'perception education coloring',
      'brain visual processing',
      'cognitive science for kids',
    ],
  },
  {
    topic: 'Civil Rights Movement Timeline Coloring for Historical Context',
    category: 'educational',
    keywords: [
      'civil rights education activities',
      'historical timeline coloring',
      'social justice learning pages',
      'equality movement visualization',
      'historical context for modern issues',
    ],
  },
  {
    topic: 'Body Mechanics Coloring for Physical Education Fundamentals',
    category: 'educational',
    keywords: [
      'body mechanics education',
      'physical education coloring pages',
      'movement science for kids',
      'anatomy in motion visualization',
      'sports science concepts',
    ],
  },
  {
    topic: 'Coding Syntax Coloring for Beginner Programming Concepts',
    category: 'educational',
    keywords: [
      'coding education for kids',
      'programming syntax visualization',
      'computer science coloring pages',
      'algorithm learning activities',
      'beginner programming concepts',
    ],
  },
  {
    topic: 'Transportation Evolution Coloring for Technological Progress',
    category: 'educational',
    keywords: [
      'transportation history activities',
      'tech evolution coloring pages',
      'vehicle development visualization',
      'engineering progress for kids',
      'innovation timeline education',
    ],
  },
  {
    topic: 'Lunar Phases and Tidal Patterns Coloring for Earth Science',
    category: 'educational',
    keywords: [
      'lunar science education',
      'tidal pattern coloring pages',
      'moon phase understanding',
      'earth-moon system visualization',
      'astronomy education for kids',
    ],
  },
  {
    topic: 'Petrology and Rock Formation Coloring for Geology Fundamentals',
    category: 'educational',
    keywords: [
      'geology education activities',
      'rock formation coloring pages',
      'earth science visualization',
      'petrology concepts for kids',
      'mineral science learning',
    ],
  },
  // ===== SEASONAL (research 2026) =====
  {
    topic: 'July 4th Fire Safety Coloring for Community Preparedness',
    category: 'seasonal',
    keywords: [
      'fireworks safety coloring pages',
      'Fourth of July community activities',
      'summer safety education',
      'public safety coloring for kids',
      'holiday safety awareness',
    ],
  },
  {
    topic: 'Earth Day Community Cleanup Coloring for Environmental Action',
    category: 'seasonal',
    keywords: [
      'Earth Day cleanup activities',
      'community service coloring pages',
      'environmental action education',
      'sustainability projects for kids',
      'local ecosystem restoration',
    ],
  },
  {
    topic: 'Labor Day Historical Significance Coloring for Worker Appreciation',
    category: 'seasonal',
    keywords: [
      'Labor Day history education',
      'worker appreciation coloring pages',
      'labor movement understanding',
      'historical significance for kids',
      'union history activities',
    ],
  },
  {
    topic: 'Memorial Day Cemetery Etiquette Coloring for Family Traditions',
    category: 'seasonal',
    keywords: [
      'Memorial Day education activities',
      'cemetery etiquette coloring pages',
      'military tradition understanding',
      'family remembrance activities',
      'historical respect education',
    ],
  },
  {
    topic: 'Juneteenth Freedom Education Coloring for Cultural Heritage',
    category: 'seasonal',
    keywords: [
      'Juneteenth educational activities',
      'freedom celebration coloring',
      'African American history education',
      'cultural heritage learning pages',
      'historical significance for children',
    ],
  },
  {
    topic: 'National Library Week Bookmark Coloring for Reading Promotion',
    category: 'seasonal',
    keywords: [
      'library week activities',
      'reading promotion coloring pages',
      'book appreciation education',
      'literacy awareness activities',
      'library resource education',
    ],
  },
  {
    topic: 'Thanksgiving Gratitude Journal Coloring for Family Reflection',
    category: 'seasonal',
    keywords: [
      'Thanksgiving gratitude activities',
      'family reflection coloring pages',
      'appreciation education for kids',
      'mindful holiday traditions',
      'positive psychology activities',
    ],
  },
  {
    topic: 'Cinco de Mayo Cultural Celebration Coloring for Heritage Awareness',
    category: 'seasonal',
    keywords: [
      'Cinco de Mayo educational activities',
      'cultural heritage coloring pages',
      'Mexican history education',
      'cultural awareness for kids',
      'international celebration understanding',
    ],
  },
  {
    topic: 'International Day of Peace Dove Coloring for Global Harmony',
    category: 'seasonal',
    keywords: [
      'peace day educational activities',
      'global harmony coloring pages',
      'conflict resolution education',
      'international understanding for kids',
      'peacebuilding activities',
    ],
  },
  {
    topic: 'National Hispanic Heritage Month Coloring for Cultural Recognition',
    category: 'seasonal',
    keywords: [
      'Hispanic heritage educational activities',
      'cultural recognition coloring pages',
      'Latino contributions education',
      'heritage month learning',
      'diversity appreciation activities',
    ],
  },
  {
    topic: 'Veterans Day Card Making Coloring for Appreciation Messages',
    category: 'seasonal',
    keywords: [
      'Veterans Day educational activities',
      'appreciation card coloring pages',
      'military service recognition',
      'thank you message creation',
      'service member gratitude activities',
    ],
  },
  {
    topic: 'Summer Solstice Nature Observation Coloring for Seasonal Awareness',
    category: 'seasonal',
    keywords: [
      'solstice educational activities',
      'seasonal change coloring pages',
      'nature observation techniques',
      'celestial event understanding',
      'summer solstice traditions',
    ],
  },
  {
    topic: 'Kwanzaa Principle Coloring for Family Values Discussion',
    category: 'seasonal',
    keywords: [
      'Kwanzaa educational activities',
      'family values coloring pages',
      'cultural tradition understanding',
      'principle-based learning',
      'African heritage celebration',
    ],
  },
  {
    topic: "New Year's Resolutions Visualizing Coloring for Goal Setting",
    category: 'seasonal',
    keywords: [
      'New Year goal setting activities',
      'resolution visualization coloring',
      'future planning for kids',
      'positive habit development',
      'annual planning education',
    ],
  },
  {
    topic: 'Ramadan Cultural Significance Coloring for Religious Understanding',
    category: 'seasonal',
    keywords: [
      'Ramadan educational activities',
      'cultural understanding coloring pages',
      'religious significance education',
      'interfaith learning resources',
      'Muslim traditions for kids',
    ],
  },
  {
    topic: 'National Pollinator Week Coloring for Ecosystem Awareness',
    category: 'seasonal',
    keywords: [
      'pollinator education activities',
      'ecosystem awareness coloring pages',
      'bee conservation understanding',
      'environmental science for kids',
      'native habitat education',
    ],
  },
  {
    topic: 'International Day of Yoga Coloring for Mindful Movement',
    category: 'seasonal',
    keywords: [
      'yoga day educational activities',
      'mindful movement coloring pages',
      'wellness education for kids',
      'physical mindfulness activities',
      'global wellness day celebration',
    ],
  },
  {
    topic: 'Patriot Day Remembrance Coloring for National Reflection',
    category: 'seasonal',
    keywords: [
      'Patriot Day educational activities',
      'national remembrance coloring pages',
      'historical significance understanding',
      'community reflection activities',
      'unity education for children',
    ],
  },
  {
    topic: 'National STEM Day Coloring for Future Inventors Inspiration',
    category: 'seasonal',
    keywords: [
      'STEM Day educational activities',
      'invention inspiration coloring pages',
      'science career exploration',
      'technology education for kids',
      'future innovator activities',
    ],
  },
  {
    topic: 'World Kindness Day Coloring for Community Building',
    category: 'seasonal',
    keywords: [
      'kindness day educational activities',
      'community building coloring pages',
      'social emotional learning',
      'positive behavior reinforcement',
      'empathy development activities',
    ],
  },
  {
    topic: 'Black Friday Upcycling Project Coloring for Sustainable Shopping',
    category: 'seasonal',
    keywords: [
      'Black Friday sustainability activities',
      'upcycling education coloring pages',
      'conscious consumerism for kids',
      'post-holiday waste reduction',
      'sustainable shopping habits',
    ],
  },
  {
    topic:
      'Hanukkah Environmental Themes Coloring for Eco-Conscious Celebrations',
    category: 'seasonal',
    keywords: [
      'Hanukkah educational activities',
      'eco-friendly celebration coloring',
      'sustainable holiday practices',
      'environmental themes for holidays',
      'green celebration ideas',
    ],
  },
  {
    topic:
      "Valentine's Day Inclusion Focus Coloring for Diverse Love Expressions",
    category: 'seasonal',
    keywords: [
      'inclusive Valentine activities',
      'diverse love expressions coloring',
      'relationship understanding for kids',
      'beyond romantic love education',
      'valentine community celebration',
    ],
  },
  {
    topic: 'Daylight Saving Time Transition Coloring for Routine Adjustment',
    category: 'seasonal',
    keywords: [
      'DST educational activities',
      'time change adjustment coloring',
      'sleep routine education',
      'circadian rhythm understanding',
      'time management activities',
    ],
  },
  {
    topic: 'National Pi Day Math Coloring for Mathematical Appreciation',
    category: 'seasonal',
    keywords: [
      'Pi Day educational activities',
      'math appreciation coloring pages',
      'mathematical concepts visualization',
      'STEM celebration for kids',
      'circle geometry understanding',
    ],
  },
  {
    topic: 'National Pet Week Coloring for Animal Responsibility Education',
    category: 'seasonal',
    keywords: [
      'pet education activities',
      'animal responsibility coloring pages',
      'pet care knowledge for kids',
      'veterinary science understanding',
      'companion animal education',
    ],
  },
  {
    topic:
      'National Coffee Day Flavor Chemistry Coloring for Science Connection',
    category: 'seasonal',
    keywords: [
      'coffee science activities',
      'flavor chemistry coloring pages',
      'food science education',
      'chemistry concepts for kids',
      'beverage science understanding',
    ],
  },
  {
    topic: 'Back-to-School Mental Health Coloring for Anxiety Reduction',
    category: 'seasonal',
    keywords: [
      'school anxiety reduction activities',
      'mental health coloring for transitions',
      'back to school readiness',
      'emotional preparation for education',
      'transition stress management',
    ],
  },
  {
    topic: 'National Sourdough Bread Day Fermentation Science Coloring',
    category: 'seasonal',
    keywords: [
      'bread science activities',
      'fermentation education coloring pages',
      'microbiology concepts for kids',
      'food chemistry understanding',
      'sourdough science exploration',
    ],
  },
  {
    topic: 'Labor Day Parks Appreciation Coloring for Community Resources',
    category: 'seasonal',
    keywords: [
      'park appreciation activities',
      'community resource coloring pages',
      'public space education',
      'outdoor recreation understanding',
      'local park history exploration',
    ],
  },
  // ===== ADULT COLORING & MINDFULNESS (research 2026) =====
  {
    topic: 'Hyper-Realistic VR Coloring for Immersive Art Therapy',
    category: 'adult-coloring',
    keywords: [
      'VR coloring therapy',
      'immersive art therapy experiences',
      'virtual reality wellbeing activities',
      'digital mindfulness coloring',
      'advanced relaxation techniques',
    ],
  },
  {
    topic: 'Neuroaesthetic Coloring Patterns for Cognitive Restoration',
    category: 'adult-coloring',
    keywords: [
      'cognitive restoration coloring',
      'neuroaesthetic patterns for wellbeing',
      'brain-focused relaxation techniques',
      'mental recovery through art',
      'science-based coloring therapy',
    ],
  },
  {
    topic: 'Biophilic Design Coloring for Nature Connection in Urban Spaces',
    category: 'adult-coloring',
    keywords: [
      'biophilic art therapy',
      'urban nature connection activities',
      'environmental psychology coloring',
      'natural elements for wellbeing',
      'city dweller wellness activities',
    ],
  },
  {
    topic: 'Somatic Trauma Release Coloring for Emotional Processing',
    category: 'adult-coloring',
    keywords: [
      'trauma release coloring techniques',
      'somatic processing through art',
      'emotional healing activities',
      'post-trauma recovery methods',
      'body-based therapy coloring',
    ],
  },
  {
    topic: 'Chronotherapy Coloring Routines for Circadian Rhythm Optimization',
    category: 'adult-coloring',
    keywords: [
      'circadian rhythm coloring activities',
      'chronotherapy wellbeing practices',
      'sleep optimization through art',
      'body clock regulation techniques',
      'time-based wellness routines',
    ],
  },
  {
    topic: 'Generative AI Coloring Journeys for Digital Mindfulness',
    category: 'adult-coloring',
    keywords: [
      'AI assisted mindfulness',
      'generative art therapy',
      'digital wellbeing activities',
      'technology enhanced relaxation',
      'AI driven meditation coloring',
    ],
  },
  {
    topic: 'Soundwave Visualization Coloring for Audio Meditation Pairing',
    category: 'adult-coloring',
    keywords: [
      'sound therapy coloring',
      'audio meditation paired activities',
      'multisensory relaxation techniques',
      'frequency visualization art',
      'mindful listening through coloring',
    ],
  },
  {
    topic: 'Hormone Cycle Tracking Coloring for Female Wellness Awareness',
    category: 'adult-coloring',
    keywords: [
      'hormonal wellness coloring',
      'menstrual cycle awareness activities',
      'fertility tracking through art',
      'female health education',
      'hormonal phase understanding',
    ],
  },
  {
    topic: 'Post-Traumatic Growth Coloring for Adversity Resilience',
    category: 'adult-coloring',
    keywords: [
      'resilience building coloring',
      'post-trauma recovery activities',
      'growth through adversity',
      'trauma to strength transformation',
      'psychological resilience development',
    ],
  },
  {
    topic: 'Digital Detox Coloring Retreats for Screen Fatigue Recovery',
    category: 'adult-coloring',
    keywords: [
      'digital detox activities',
      'screen fatigue recovery techniques',
      'unplugged relaxation coloring',
      'technology abstinence therapy',
      'offline wellbeing practices',
    ],
  },
  {
    topic: 'Biofeedback-Guided Coloring for Stress Level Awareness',
    category: 'adult-coloring',
    keywords: [
      'biometric feedback coloring',
      'stress awareness through art',
      'physiological monitoring relaxation',
      'data-driven mindfulness',
      'health metrics guided therapy',
    ],
  },
  {
    topic: 'Nostalgia Therapy Coloring for Mental Time Travel Benefits',
    category: 'adult-coloring',
    keywords: [
      'nostalgia mental health activities',
      'memory recall therapy through art',
      'time travel wellbeing techniques',
      'past positive experience reinforcement',
      'emotional comfort through memories',
    ],
  },
  {
    topic: 'Ecopsychology Coloring for Climate Anxiety Relief',
    category: 'adult-coloring',
    keywords: [
      'climate anxiety relief activities',
      'ecopsychology therapy techniques',
      'environmental stress management',
      'nature connection healing',
      'climate worry reduction methods',
    ],
  },
  {
    topic: 'Workplace Conflict Resolution Coloring for Professional Harmony',
    category: 'adult-coloring',
    keywords: [
      'workplace stress coloring activities',
      'professional conflict resolution techniques',
      'office harmony development',
      'colleague relationship building',
      'corporate mindfulness practices',
    ],
  },
  {
    topic:
      'Psychedelic Integration Coloring for Aftercare Emotional Processing',
    category: 'adult-coloring',
    keywords: [
      'psychedelic aftercare therapy',
      'integration coloring activities',
      'post-experience emotional processing',
      'mindfulness continuation techniques',
      'chemically enhanced therapy support',
    ],
  },
  {
    topic: 'Breathwork Pattern Coloring for Respiratory-Mind Connection',
    category: 'adult-coloring',
    keywords: [
      'breathwork visualization activities',
      'respiratory mindfulness coloring',
      'breathing pattern integration',
      'mind body connection techniques',
      'conscious breathing therapy',
    ],
  },
  {
    topic: 'Forest Bathing Inspired Coloring for Sensory Engagement',
    category: 'adult-coloring',
    keywords: [
      'forest bathing art therapy',
      'sensory engagement coloring activities',
      'Shinrin-yoku inspired techniques',
      'natural mindfulness practices',
      'outdoor therapy visualization',
    ],
  },
  {
    topic: 'Moon Cycle Coloring for Intuitive Energy Management',
    category: 'adult-coloring',
    keywords: [
      'lunar cycle mindfulness',
      'intuitive wellness coloring activities',
      'feminine energy cycles',
      'moon phase awareness practices',
      'natural rhythm alignment',
    ],
  },
  {
    topic: 'Empty Nest Transition Coloring for Identity Rebuilding',
    category: 'adult-coloring',
    keywords: [
      'empty nest therapy activities',
      'parent identity transition coloring',
      'post-parenting phase wellbeing',
      'self rediscovery after kids',
      'life stage transition support',
    ],
  },
  {
    topic: 'Retirement Planning Coloring for Future Self Connection',
    category: 'adult-coloring',
    keywords: [
      'retirement transition activities',
      'future self visualization techniques',
      'long term planning through art',
      'career closure therapy',
      'post work identity development',
    ],
  },
  {
    topic: 'Grief Cycle Coloring for Loss Processing Timelines',
    category: 'adult-coloring',
    keywords: [
      'grief process therapy activities',
      'loss management coloring pages',
      'emotional timeline visualization',
      'bereavement support techniques',
      'stages of grief processing',
    ],
  },
  {
    topic: 'Burnout Recovery Path Coloring for Professional Rejuvenation',
    category: 'adult-coloring',
    keywords: [
      'burnout recovery activities',
      'workplace rejuvenation therapy',
      'professional exhaustion relief',
      'career sustainability techniques',
      'occupational wellbeing recovery',
    ],
  },
  {
    topic: 'Cultural Heritage Coloring for Ancestral Connection Healing',
    category: 'adult-coloring',
    keywords: [
      'ancestral healing activities',
      'cultural identity connection',
      'heritage reclamation through art',
      'past lineage wellness',
      'genealogical mindfulness practices',
    ],
  },
  {
    topic: 'Aging Gracefully Coloring for Elder Wisdom Appreciation',
    category: 'adult-coloring',
    keywords: [
      'positive aging activities',
      'elder wisdom appreciation coloring',
      'senior wellness practices',
      'aging with dignity techniques',
      'life experience visualization',
    ],
  },
  {
    topic: 'EcoGrief Resolution Coloring for Environmental Loss Processing',
    category: 'adult-coloring',
    keywords: [
      'ecological grief therapy',
      'environmental loss processing',
      'climate change emotional impact',
      'nature connection healing',
      'planet loss mourning techniques',
    ],
  },
  {
    topic: 'Tech-Free Travel Coloring for Digital Nomad Grounding',
    category: 'adult-coloring',
    keywords: [
      'travel mindfulness activities',
      'digital detox travel techniques',
      'nomad grounding practices',
      'location presence through art',
      'mobile relaxation techniques',
    ],
  },
  {
    topic: 'Natural Fertility Awareness Coloring for Reproductive Health',
    category: 'adult-coloring',
    keywords: [
      'fertility education activities',
      'reproductive health awareness',
      'natural family planning through art',
      'cyclical body understanding',
      'hormonal health visualization',
    ],
  },
  {
    topic: 'Generational Trauma Release Coloring for Healing Lineages',
    category: 'adult-coloring',
    keywords: [
      'generational trauma therapy',
      'family healing through art',
      'ancestral pain release techniques',
      'lineage wellness practices',
      'inherited trauma resolution',
    ],
  },
  {
    topic: 'Financial Stress Relief Coloring for Money Anxiety Management',
    category: 'adult-coloring',
    keywords: [
      'money anxiety therapy',
      'financial stress coloring activities',
      'wealth mindset building',
      'economic worry reduction techniques',
      'prosperity mindset practices',
    ],
  },
  {
    topic: 'Solo Travel Confidence Coloring for Independent Adventurers',
    category: 'adult-coloring',
    keywords: [
      'solo travel preparation activities',
      'independent adventurer confidence',
      'travel safety visualization',
      'self reliance building techniques',
      'personal empowerment through travel',
    ],
  },
  // ===== THEMES (research 2026) =====
  {
    topic: 'Bioluminescent Marine Life Coloring for Ocean Enthusiasts',
    category: 'themes',
    keywords: [
      'bioluminescent creatures coloring pages',
      'marine glow effects art',
      'ocean life illumination',
      'deep sea exploration visuals',
      'glowing sea creatures for kids',
    ],
  },
  {
    topic: 'Ancient Mythical Creatures Coloring for Cross-Cultural Legends',
    category: 'themes',
    keywords: [
      'mythical creature educational pages',
      'cultural legends comparison',
      'legendary beast mythology',
      'mythology exploration for kids',
      'folklore figure coloring',
    ],
  },
  {
    topic: 'Microscopic Organism Coloring for Scientific Exploration',
    category: 'themes',
    keywords: [
      'microscopic life coloring pages',
      'cellular organism visualization',
      'scientific exploration through art',
      'bacteria and protist education',
      'microbiology learning visuals',
    ],
  },
  {
    topic: 'Steampunk Mechanical Design Coloring for Creative Engineering',
    category: 'themes',
    keywords: [
      'steampunk art coloring pages',
      'mechanical design inspiration',
      'creative engineering visuals',
      'vintage tech fantasy',
      'industrial age innovation',
    ],
  },
  {
    topic: 'Avian Migration Patterns Coloring for Birdwatching Enthusiasts',
    category: 'themes',
    keywords: [
      'bird migration coloring pages',
      'avian flight patterns visual',
      'birdwatching education materials',
      'migration route exploration',
      'feathered traveler illustrations',
    ],
  },
  {
    topic: 'Architectural Wonders Coloring for World Heritage Sites',
    category: 'themes',
    keywords: [
      'world architecture coloring pages',
      'heritage site visualization',
      'famous building education',
      'architectural marvel exploration',
      'historic structure illustrations',
    ],
  },
  {
    topic: 'Celestial Phenomena Coloring for Astronomy Lovers',
    category: 'themes',
    keywords: [
      'astronomy education coloring pages',
      'celestial event visualization',
      'space phenomenon exploration',
      'cosmic wonder illustrations',
      'universe beauty art',
    ],
  },
  {
    topic: 'Mythological Garden Coloring for Legendary Botany',
    category: 'themes',
    keywords: [
      'mythological plant coloring',
      'legendary garden visualization',
      'fantasy flora exploration',
      'symbolic plant life education',
      'mythic garden designs',
    ],
  },
  {
    topic: 'Underwater Ruins Coloring for Lost Civilization Exploration',
    category: 'themes',
    keywords: [
      'underwater city coloring pages',
      'lost civilization visuals',
      'sunken architecture exploration',
      'submerged history illustrations',
      'aquatic archaeology art',
    ],
  },
  {
    topic: 'Fiber Art Techniques Coloring for Craft Enthusiasts',
    category: 'themes',
    keywords: [
      'textile art coloring pages',
      'fiber craft education visuals',
      'weaving technique exploration',
      'artistic textile patterns',
      'craft technique inspiration',
    ],
  },
  {
    topic: 'Pollinator Garden Ecosystem Coloring for Bee Lovers',
    category: 'themes',
    keywords: [
      'pollinator habitat coloring',
      'bee garden visualization',
      'ecosystem interconnection',
      'beneficial insect education',
      'natural gardening support',
    ],
  },
  {
    topic: 'Prehistoric Landscapes Coloring for Paleontology Fans',
    category: 'themes',
    keywords: [
      'paleontology education coloring',
      'dinosaur habitat visualization',
      'ancient earth exploration',
      'prehistoric ecosystem art',
      'fossil site recreation',
    ],
  },
  {
    topic: 'Cultural Hairstyle Evolution Coloring for Anthropological Interest',
    category: 'themes',
    keywords: [
      'hair history coloring pages',
      'cultural hairstyle exploration',
      'anthropological fashion evolution',
      'tradition hairstyle education',
      'hair as cultural expression',
    ],
  },
  {
    topic: 'Astronaut Training Simulation Coloring for Space Campers',
    category: 'themes',
    keywords: [
      'astronaut training coloring',
      'space mission preparation',
      'NASA simulation visualization',
      'space exploration education',
      'future astronaut inspiration',
    ],
  },
  {
    topic: 'World Cuisine Iconography Coloring for Foodie Kids',
    category: 'themes',
    keywords: [
      'global food coloring pages',
      'cuisine education visuals',
      'cultural food exploration',
      'culinary tradition art',
      'international dish illustrations',
    ],
  },
  {
    topic: 'Elemental Magic Systems Coloring for Fantasy Worldbuilding',
    category: 'themes',
    keywords: [
      'magic system coloring pages',
      'fantasy element visualization',
      'worldbuilding technique art',
      'mythological power systems',
      'creative magic exploration',
    ],
  },
  {
    topic: 'Urban Wildlife Adaptation Coloring for City Nature Lovers',
    category: 'themes',
    keywords: [
      'urban wildlife coloring',
      'city animal adaptation',
      'metropolitan ecology education',
      'nature in concrete environments',
      'wildlife survival strategies',
    ],
  },
  {
    topic: 'Historical Battle Formations Coloring for Strategy Enthusiasts',
    category: 'themes',
    keywords: [
      'military history coloring pages',
      'battle formation visualization',
      'historical strategy exploration',
      'tactical warfare education',
      'famous battle recreation',
    ],
  },
  {
    topic: 'Celestial Navigation Constellations Coloring for Explorer Kids',
    category: 'themes',
    keywords: [
      'star navigation coloring pages',
      'constellation education visuals',
      'celestial navigation history',
      'ancient guidance systems',
      'astronomy exploration tools',
    ],
  },
  {
    topic: 'Cultural Festivals Mask Coloring for Global Celebration Lovers',
    category: 'themes',
    keywords: [
      'festival mask coloring pages',
      'celebration costume visualization',
      'cultural mask traditions',
      'global festival art',
      'ceremonial face covering education',
    ],
  },
  {
    topic: 'Underwater Geothermal Vent Coloring for Deep Sea Exploration',
    category: 'themes',
    keywords: [
      'hydrothermal vent coloring pages',
      'deep sea ecosystem visualization',
      'extreme environment exploration',
      'ocean floor phenomena',
      'submarine geology art',
    ],
  },
  {
    topic: 'Ancient Trade Route Exploration Coloring for History Buffs',
    category: 'themes',
    keywords: [
      'trade route history coloring',
      'ancient commerce visualization',
      'historical trade path education',
      'cultural exchange routes',
      'economic history exploration',
    ],
  },
  {
    topic: 'Sensory Garden Design Coloring for Special Needs Education',
    category: 'themes',
    keywords: [
      'sensory garden coloring pages',
      'accessible garden design',
      'therapeutic landscape visualization',
      'special needs outdoor space',
      'multi-sensory environment education',
    ],
  },
  {
    topic: 'Microscopic Crystal Structures Coloring for Geology Enthusiasts',
    category: 'themes',
    keywords: [
      'crystal structure coloring',
      'mineral formation visualization',
      'geological science art',
      'molecular arrangement education',
      'crystallography exploration',
    ],
  },
  {
    topic: 'Culinary Molecular Gastronomy Coloring for Food Science Kids',
    category: 'themes',
    keywords: [
      'molecular gastronomy coloring',
      'food science visualization',
      'culinary science education',
      'modern cooking techniques',
      'food chemistry exploration',
    ],
  },
  {
    topic: 'Folk Art Traditions Coloring for Cultural Storytelling',
    category: 'themes',
    keywords: [
      'folk art education coloring',
      'cultural tradition visuals',
      'traditional craft exploration',
      'artistic heritage preservation',
      'global folk art techniques',
    ],
  },
  {
    topic:
      'Space Debris Tracking Patterns Coloring for Environmental Awareness',
    category: 'themes',
    keywords: [
      'space debris coloring pages',
      'orbital pollution visualization',
      'satellite graveyard education',
      'space environmental awareness',
      'cosmic waste management',
    ],
  },
  {
    topic: 'Mythological Weapon Symbolism Coloring for Heroic Legends',
    category: 'themes',
    keywords: [
      'legendary weapon coloring',
      'mythological arms symbolism',
      'heroic legend visualization',
      'cultural weapon traditions',
      'symbolic armament education',
    ],
  },
  {
    topic: 'Underground Ecosystems Coloring for Cave Exploration',
    category: 'themes',
    keywords: [
      'cave ecosystem coloring',
      'subterranean habitat visualization',
      'underground wildlife education',
      'cave exploration art',
      'dark zone ecology',
    ],
  },
  {
    topic: 'Language Evolution Tree Coloring for Linguistic Interest',
    category: 'themes',
    keywords: [
      'language development coloring',
      'linguistic evolution visualization',
      'language family education',
      'historical linguistics',
      'communication evolution art',
    ],
  },
  // ===== TECHNIQUES (research 2026) =====
  {
    topic:
      'Retro-Futurism Transportation Coloring for Vintage Tech Enthusiasts',
    category: 'techniques',
    keywords: [
      'retro futurism coloring pages',
      'vintage future visualization',
      'historical concept design',
      'nostalgic technology art',
      'past future transportation',
    ],
  },
  {
    topic: 'Mandala Geometric Fusion for Cross-Cultural Art',
    category: 'techniques',
    keywords: [
      'mandala art fusion techniques',
      'cross cultural geometric patterns',
      'design integration methods',
      'cultural art synthesis',
      'symbolic pattern blending',
    ],
  },
  {
    topic: 'Watercolor Resist Techniques Using Natural Elements',
    category: 'techniques',
    keywords: [
      'natural resist coloring methods',
      'eco friendly watercolor techniques',
      'biological element resist art',
      'earth material based techniques',
      'sustainable watercolor practices',
    ],
  },
  {
    topic: 'Glow-in-the-Dark Anatomy Layers Coloring for Educational Depth',
    category: 'techniques',
    keywords: [
      'glow anatomy coloring techniques',
      'educational layer visualization',
      'bioluminescent anatomy',
      'educational science art',
      'multilayer body visualization',
    ],
  },
  {
    topic: 'Color Theory Emotion Mapping for Psychological Depth',
    category: 'techniques',
    keywords: [
      'color psychology coloring',
      'emotional color mapping',
      'psychological art techniques',
      'hue emotional value',
      'psychological color theory',
    ],
  },
  {
    topic: 'Optical Illusion Shading for 3D Perspective Creation',
    category: 'techniques',
    keywords: [
      'optical illusion coloring techniques',
      '3D perspective shading',
      'visual trick art methods',
      'dimension creation in art',
      'perception bending techniques',
    ],
  },
  {
    topic: 'Grayscale to Full-Color Transformation Techniques',
    category: 'techniques',
    keywords: [
      'grayscale conversion techniques',
      'monochrome to color art',
      'color introduction methods',
      'value scale transition',
      'color application progression',
    ],
  },
  {
    topic: 'Mixed Media Collage Border Integration for Page Enhancement',
    category: 'techniques',
    keywords: [
      'collage border coloring techniques',
      'mixed media integration',
      'page enhancement methods',
      'artistic border creation',
      'textural element addition',
    ],
  },
  {
    topic: 'Cultural Pattern Embroidery Simulation Coloring',
    category: 'techniques',
    keywords: [
      'embroidery simulation coloring',
      'cultural textile art techniques',
      'stitch pattern visualization',
      'traditional craft simulation',
      'needlework pattern art',
    ],
  },
  {
    topic:
      'Hyper-Realistic Weather Effects Coloring for Environmental Storytelling',
    category: 'techniques',
    keywords: [
      'weather effect coloring techniques',
      'environmental realism art',
      'atmospheric condition visualization',
      'weather storytelling methods',
      'natural phenomenon art',
    ],
  },
  {
    topic: 'Digital Layering Techniques for Modern Art Styles',
    category: 'techniques',
    keywords: [
      'digital layering coloring techniques',
      'modern art style simulation',
      'contemporary art integration',
      'digital art method',
      'technology enhanced coloring',
    ],
  },
  {
    topic:
      'Biomimicry Design Principles Coloring for Nature-Inspired Innovation',
    category: 'techniques',
    keywords: [
      'biomimicry art techniques',
      'nature inspired design coloring',
      'biological innovation visualization',
      'natural solution art',
      'ecological design principles',
    ],
  },
  {
    topic: 'Stained Glass Leading Simulation for Window Art Effect',
    category: 'techniques',
    keywords: [
      'stained glass simulation techniques',
      'leading line visualization',
      'window art effect coloring',
      'cathedral glass art methods',
      'transparent medium simulation',
    ],
  },
  {
    topic: 'Pixel Art Block Integration for Digital Aesthetic',
    category: 'techniques',
    keywords: [
      'pixel art coloring techniques',
      'digital aesthetic simulation',
      'block art integration',
      'retro computing style',
      'modern medieval art techniques',
    ],
  },
  {
    topic: 'Textured Fabric Simulation Using Colored Pencil',
    category: 'techniques',
    keywords: [
      'fabric texture coloring techniques',
      'material simulation art',
      'textile effect visualization',
      'surface texture replication',
      'textured art methods',
    ],
  },
  {
    topic: 'Atmospheric Perspective Techniques for Landscape Depth',
    category: 'techniques',
    keywords: [
      'atmospheric perspective coloring',
      'landscape depth creation',
      'distance effect visualization',
      'environmental perspective art',
      'spatial realism techniques',
    ],
  },
  {
    topic: 'Cultural Art Movement Integration for Historical Context',
    category: 'techniques',
    keywords: [
      'art movement coloring techniques',
      'historical style integration',
      'cultural movement visualization',
      'art history techniques',
      'period style simulation',
    ],
  },
  {
    topic: 'Kinetic Movement Simulation for Dynamic Art',
    category: 'techniques',
    keywords: [
      'movement simulation coloring',
      'dynamic art techniques',
      'motion effect visualization',
      'kinetic art integration',
      'energy flow art methods',
    ],
  },
  {
    topic: 'Scientific Diagram Annotation Coloring for Educational Enhancement',
    category: 'techniques',
    keywords: [
      'scientific diagram coloring techniques',
      'educational annotation art',
      'labeled visualization methods',
      'informational enhancement',
      'learning diagram integration',
    ],
  },
  {
    topic: 'UV Reactive Ink Effects Simulation for Special Media',
    category: 'techniques',
    keywords: [
      'UV effect coloring techniques',
      'special media simulation',
      'light reactive art visualization',
      'alternate spectrum art',
      'invisible ink effect methods',
    ],
  },
  {
    topic: 'Anatomical Cross-Section Coloring for Medical Detail',
    category: 'techniques',
    keywords: [
      'medical cross section coloring',
      'anatomical detail visualization',
      'body layer exploration',
      'surgical detail art',
      'physiology education techniques',
    ],
  },
  {
    topic: 'Architectural Blueprint Effects for Technical Drawing',
    category: 'techniques',
    keywords: [
      'blueprint coloring techniques',
      'technical drawing visualization',
      'architectural plan art',
      'drafting effect simulation',
      'engineering drawing methods',
    ],
  },
  {
    topic: 'Ecosystem Biodiversity Mapping for Environmental Education',
    category: 'techniques',
    keywords: [
      'biodiversity map coloring',
      'ecosystem visualization techniques',
      'habitat mapping art',
      'species distribution education',
      'environmental interconnection visualization',
    ],
  },
  {
    topic: 'Historical Costume Embroidery Detail Coloring',
    category: 'techniques',
    keywords: [
      'costume detail coloring techniques',
      'historical embroidery visualization',
      'garment detail art',
      'fashion history illustration',
      'textile craft replication',
    ],
  },
  {
    topic: 'Time-Lapse Natural Process Coloring for Growth Visualization',
    category: 'techniques',
    keywords: [
      'natural process coloring',
      'growth visualization techniques',
      'time lapse art methods',
      'developmental stages visualization',
      'biological progression art',
    ],
  },
  {
    topic: 'Typography Integration Techniques for Lettering Art',
    category: 'techniques',
    keywords: [
      'typography coloring techniques',
      'lettering integration art',
      'text design visualization',
      'typographic art methods',
      'font integration techniques',
    ],
  },
  {
    topic: 'Mood-Based Color Palette Development for Psychological Art',
    category: 'techniques',
    keywords: [
      'mood palette coloring techniques',
      'psychological color development',
      'emotional tone art',
      'affective color theory',
      'mental state palette creation',
    ],
  },
  {
    topic: 'Luminescent Color Transition Effects for Light Simulation',
    category: 'techniques',
    keywords: [
      'luminescent transition coloring',
      'light effect visualization',
      'glow effect techniques',
      'luminescence color theory',
      'artificial light simulation',
    ],
  },
  {
    topic: 'Cultural Tattoo Symbolism Integration for Artistic Expression',
    category: 'techniques',
    keywords: [
      'tattoo symbolism coloring',
      'cultural body art techniques',
      'symbolic design integration',
      'traditional tattoo education',
      'body art historical context',
    ],
  },
  {
    topic: 'Pointillism Technique Adaptation for Dot Art',
    category: 'techniques',
    keywords: [
      'pointillism coloring techniques',
      'dot art visualization',
      'stippling effect methods',
      'micro dot art',
      'precision dot creation',
    ],
  },
];

// ===== GALLERY CATEGORIES (for SEO landing pages) =====

export type GalleryCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  keywords: string[]; // SEO keywords this category targets
  tags: string[]; // Tags from AI-generated metadata that map to this category
  emoji: string;
};

// SEO-optimized gallery categories targeting popular search terms
// Maps to tags[] field in ColoringImage model
export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    id: 'animals',
    name: 'Animals',
    slug: 'animals',
    description: 'Cute and wild animal coloring pages for kids and adults',
    keywords: [
      'animal coloring pages',
      'zoo animals',
      'pet coloring',
      'wildlife coloring',
    ],
    tags: [
      'animal',
      'animals',
      'zoo',
      'pet',
      'wildlife',
      'dog',
      'cat',
      'lion',
      'elephant',
      'bear',
      'fox',
      'panda',
      'penguin',
      'bird',
      'fish',
    ],
    emoji: '🐾',
  },
  {
    id: 'fantasy',
    name: 'Fantasy & Magic',
    slug: 'fantasy',
    description: 'Magical creatures and fantasy world coloring pages',
    keywords: [
      'fantasy coloring pages',
      'magical coloring',
      'mythical creatures',
    ],
    tags: [
      'fantasy',
      'magic',
      'magical',
      'mythical',
      'fairy',
      'wizard',
      'witch',
      'elf',
      'goblin',
      'giant',
      'genie',
    ],
    emoji: '✨',
  },
  {
    id: 'dragons',
    name: 'Dragons',
    slug: 'dragons',
    description: 'Epic dragon coloring pages from cute to fierce',
    keywords: [
      'dragon coloring pages',
      'fire breathing dragon',
      'baby dragon coloring',
    ],
    tags: ['dragon', 'dragons', 'fire-breathing', 'mythical'],
    emoji: '🐉',
  },
  {
    id: 'unicorns',
    name: 'Unicorns',
    slug: 'unicorns',
    description: 'Beautiful unicorn and rainbow coloring pages',
    keywords: ['unicorn coloring pages', 'rainbow unicorn', 'magical horse'],
    tags: ['unicorn', 'unicorns', 'rainbow', 'magical horse', 'pegasus'],
    emoji: '🦄',
  },
  {
    id: 'princesses',
    name: 'Princesses & Royalty',
    slug: 'princesses',
    description: 'Princess, prince, and castle coloring pages',
    keywords: [
      'princess coloring pages',
      'castle coloring',
      'royalty coloring',
    ],
    tags: [
      'princess',
      'prince',
      'queen',
      'king',
      'royalty',
      'castle',
      'crown',
      'throne',
    ],
    emoji: '👑',
  },
  {
    id: 'superheroes',
    name: 'Superheroes',
    slug: 'superheroes',
    description: 'Action-packed superhero coloring pages',
    keywords: ['superhero coloring pages', 'hero coloring', 'comic coloring'],
    tags: [
      'superhero',
      'hero',
      'superheroes',
      'action',
      'comic',
      'cape',
      'mask',
    ],
    emoji: '🦸',
  },
  {
    id: 'dinosaurs',
    name: 'Dinosaurs',
    slug: 'dinosaurs',
    description: 'Prehistoric dinosaur coloring pages for all ages',
    keywords: [
      'dinosaur coloring pages',
      't-rex coloring',
      'prehistoric coloring',
    ],
    tags: [
      'dinosaur',
      'dinosaurs',
      'prehistoric',
      't-rex',
      'trex',
      'raptor',
      'brontosaurus',
      'pterodactyl',
    ],
    emoji: '🦕',
  },
  {
    id: 'space',
    name: 'Space & Astronauts',
    slug: 'space',
    description: 'Outer space, rockets, and astronaut coloring pages',
    keywords: [
      'space coloring pages',
      'astronaut coloring',
      'rocket coloring',
      'planet coloring',
    ],
    tags: [
      'space',
      'astronaut',
      'rocket',
      'planet',
      'moon',
      'star',
      'galaxy',
      'alien',
      'spaceship',
      'ufo',
    ],
    emoji: '🚀',
  },
  {
    id: 'underwater',
    name: 'Underwater & Ocean',
    slug: 'underwater',
    description: 'Ocean life and underwater adventure coloring pages',
    keywords: [
      'ocean coloring pages',
      'underwater coloring',
      'sea creature coloring',
      'mermaid coloring',
    ],
    tags: [
      'underwater',
      'ocean',
      'sea',
      'mermaid',
      'fish',
      'whale',
      'dolphin',
      'shark',
      'coral',
      'reef',
    ],
    emoji: '🌊',
  },
  {
    id: 'vehicles',
    name: 'Vehicles & Transport',
    slug: 'vehicles',
    description: 'Cars, trucks, planes, and train coloring pages',
    keywords: [
      'vehicle coloring pages',
      'car coloring',
      'truck coloring',
      'plane coloring',
    ],
    tags: [
      'vehicle',
      'car',
      'truck',
      'plane',
      'train',
      'boat',
      'ship',
      'helicopter',
      'motorcycle',
      'bus',
      'transport',
    ],
    emoji: '🚗',
  },
  {
    id: 'pirates',
    name: 'Pirates',
    slug: 'pirates',
    description: 'Swashbuckling pirate adventure coloring pages',
    keywords: [
      'pirate coloring pages',
      'treasure coloring',
      'pirate ship coloring',
    ],
    tags: [
      'pirate',
      'pirates',
      'treasure',
      'ship',
      'island',
      'parrot',
      'skull',
    ],
    emoji: '🏴‍☠️',
  },
  {
    id: 'nature',
    name: 'Nature & Flowers',
    slug: 'nature',
    description: 'Beautiful nature scenes and flower coloring pages',
    keywords: [
      'nature coloring pages',
      'flower coloring',
      'garden coloring',
      'tree coloring',
    ],
    tags: [
      'nature',
      'flower',
      'flowers',
      'garden',
      'tree',
      'forest',
      'landscape',
      'plant',
      'botanical',
    ],
    emoji: '🌸',
  },
  {
    id: 'holidays',
    name: 'Holidays & Seasons',
    slug: 'holidays',
    description: 'Christmas, Easter, Halloween and seasonal coloring pages',
    keywords: [
      'holiday coloring pages',
      'christmas coloring',
      'easter coloring',
      'halloween coloring',
    ],
    tags: [
      'holiday',
      'christmas',
      'easter',
      'halloween',
      'thanksgiving',
      'winter',
      'summer',
      'spring',
      'autumn',
      'snow',
      'santa',
    ],
    emoji: '🎄',
  },
  {
    id: 'robots',
    name: 'Robots & Technology',
    slug: 'robots',
    description: 'Futuristic robot and technology coloring pages',
    keywords: [
      'robot coloring pages',
      'technology coloring',
      'futuristic coloring',
    ],
    tags: [
      'robot',
      'robots',
      'technology',
      'machine',
      'futuristic',
      'cyborg',
      'android',
    ],
    emoji: '🤖',
  },
  {
    id: 'food',
    name: 'Food & Sweets',
    slug: 'food',
    description: 'Delicious food, candy, and dessert coloring pages',
    keywords: [
      'food coloring pages',
      'candy coloring',
      'dessert coloring',
      'fruit coloring',
    ],
    tags: [
      'food',
      'candy',
      'cake',
      'dessert',
      'fruit',
      'ice cream',
      'pizza',
      'sweet',
      'cupcake',
    ],
    emoji: '🍕',
  },
];

// Helper to find category by slug
export const getCategoryBySlug = (slug: string): GalleryCategory | undefined =>
  GALLERY_CATEGORIES.find((cat) => cat.slug === slug);

// Helper to find categories that match a tag
export const getCategoriesForTag = (tag: string): GalleryCategory[] =>
  GALLERY_CATEGORIES.filter((cat) =>
    cat.tags.some((t) => tag.toLowerCase().includes(t.toLowerCase())),
  );

// Authors for generated blog posts
export type BlogAuthor = {
  name: string;
  title: string;
  bio: string;
};

export const BLOG_AUTHORS: BlogAuthor[] = [
  {
    name: 'Sophie Chen',
    title: 'Child Development Specialist',
    bio: 'Sophie is a child psychologist with over 15 years of experience in early childhood development and creative education.',
  },
  {
    name: 'James Fletcher',
    title: 'Art Therapy Practitioner',
    bio: 'James is a certified art therapist who works with both children and adults, using creative activities to promote mental wellbeing.',
  },
  {
    name: 'Emily Rodriguez',
    title: 'Primary School Teacher',
    bio: 'Emily has been teaching for 12 years and loves incorporating creative activities into her classroom curriculum.',
  },
  {
    name: 'David Park',
    title: 'Parenting Writer',
    bio: 'David is a father of three and writes about creative ways to engage children away from screens.',
  },
  {
    name: 'Rachel Thompson',
    title: 'Mindfulness Coach',
    bio: 'Rachel specialises in using creative activities for stress relief and meditation practices.',
  },
  {
    name: "Michael O'Brien",
    title: 'Illustrator & Art Educator',
    bio: 'Michael is a professional illustrator who teaches art techniques to all ages, from toddlers to adults.',
  },
  {
    name: 'Aisha Patel',
    title: 'Early Years Educator',
    bio: 'Aisha works in early years education and is passionate about play-based learning and creative development.',
  },
  {
    name: 'Tom Williams',
    title: 'Family Activities Writer',
    bio: 'Tom is a dad blogger and freelance writer who shares practical tips for fun family activities.',
  },
];
