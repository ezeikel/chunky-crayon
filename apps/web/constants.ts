import { PlanName, BillingPeriod } from '@chunky-crayon/db/types';
import {
  faInstagram,
  faThreads,
  faFacebookF,
  faTiktok,
  faPinterest,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';

export const MAX_IMAGE_GENERATION_ATTEMPTS = 3;

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
  CREATE_CHECKOUT_SESSION: 'create a checkout session',
  GET_CURRENT_USER: 'get the current user',
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
};

export type PlanInterval = 'monthly' | 'annual';

export type SubscriptionPlan = {
  key: PlanName;
  name: string;
  tagline: string;
  price: string; // e.g '£7.99'
  credits: string;
  features: string[];
  audience: string;
  stripePriceEnv: string; // e.g 'NEXT_PUBLIC_STRIPE_PRICE_CRAYON_MONTHLY'
  mostPopular?: boolean;
};

// Monthly credit allotment per plan (same for monthly and annual billing)
// Annual subscribers get the same monthly credits via cron job, just billed yearly
export const PLAN_CREDITS_MONTHLY = {
  [PlanName.CRAYON]: 250,
  [PlanName.RAINBOW]: 500,
  [PlanName.MASTERPIECE]: 1000,
  [PlanName.STUDIO]: 5000,
} as const;

// Rollover caps: max credits that can carry over to next month
// Crayon: no rollover (credits reset each month)
// Rainbow: 1 month rollover (500 max carryover)
// Masterpiece: 2 months rollover (2000 max carryover)
// Studio: 3 months rollover (15000 max carryover)
export const PLAN_ROLLOVER_CAPS = {
  [PlanName.CRAYON]: 0,
  [PlanName.RAINBOW]: 500,
  [PlanName.MASTERPIECE]: 2000,
  [PlanName.STUDIO]: 15000,
} as const;

// Legacy export for backwards compatibility - now uses monthly amounts for both
export const PLAN_CREDITS = {
  [PlanName.CRAYON]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.CRAYON],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.CRAYON],
  },
  [PlanName.RAINBOW]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.RAINBOW],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.RAINBOW],
  },
  [PlanName.MASTERPIECE]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.MASTERPIECE],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.MASTERPIECE],
  },
  [PlanName.STUDIO]: {
    [BillingPeriod.MONTHLY]: PLAN_CREDITS_MONTHLY[PlanName.STUDIO],
    [BillingPeriod.ANNUAL]: PLAN_CREDITS_MONTHLY[PlanName.STUDIO],
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
      key: PlanName.CRAYON,
      name: 'Crayon Plan',
      tagline: 'Start your coloring adventure',
      price: '£7.99',
      credits: `${PLAN_CREDITS[PlanName.CRAYON][BillingPeriod.MONTHLY]} credits/month`,
      features: [
        'Create coloring pages from text prompts',
        'Create coloring pages with words, names, and numbers',
        'Adjust color, contrast, and brightness',
        'Turn photos into coloring pages',
      ],
      audience: 'Perfect for casual colorers and young artists',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_CRAYON_MONTHLY as string,
    },
    {
      key: PlanName.RAINBOW,
      name: 'Rainbow Plan',
      tagline: 'Fun for the whole family',
      price: '£13.99',
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.MONTHLY]} credits/month`,
      features: [
        'All Crayon Plan features',
        'Advanced editing features',
        'Early access to new models and features',
        'Credits roll over (up to 1 month)',
      ],
      audience: 'Great for creative families and siblings',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY as string,
      mostPopular: true,
    },
    {
      key: PlanName.MASTERPIECE,
      name: 'Masterpiece Plan',
      tagline: 'For color enthusiasts',
      price: '£24.99',
      credits: `${PLAN_CREDITS[PlanName.MASTERPIECE][BillingPeriod.MONTHLY]} credits/month`,
      features: [
        'All Rainbow Plan features',
        'Bulk generation',
        'Commercial use',
        'Credits roll over (up to 2 months)',
      ],
      audience: 'Perfect for adults and serious colorers',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_MASTERPIECE_MONTHLY as string,
    },
    {
      key: PlanName.STUDIO,
      name: 'Studio Plan',
      tagline: 'For super creators and small businesses',
      price: '£59.99',
      credits: `${PLAN_CREDITS[PlanName.STUDIO][BillingPeriod.MONTHLY]} credits/month`,
      features: [
        'All Masterpiece Plan features',
        'Credits roll over (up to 3 months)',
      ],
      audience: 'Best for studios, teachers, and high-volume users',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_STUDIO_MONTHLY as string,
    },
  ],
  annual: [
    {
      key: PlanName.CRAYON,
      name: 'Crayon Plan',
      tagline: 'Start your coloring adventure',
      price: '£79.99',
      credits: `${PLAN_CREDITS[PlanName.CRAYON][BillingPeriod.ANNUAL]} credits/month`,
      features: [
        'Create coloring pages from text prompts',
        'Create coloring pages with words, names, and numbers',
        'Adjust color, contrast, and brightness',
        'Turn photos into coloring pages',
      ],
      audience: 'Perfect for casual colorers and young artists',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_CRAYON_ANNUAL as string,
    },
    {
      key: PlanName.RAINBOW,
      name: 'Rainbow Plan',
      tagline: 'Fun for the whole family',
      price: '£139.99',
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.ANNUAL]} credits/month`,
      features: [
        'All Crayon Plan features',
        'Advanced editing features',
        'Early access to new models and features',
        'Credits roll over (up to 1 month)',
      ],
      audience: 'Great for creative families and siblings',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL as string,
      mostPopular: true,
    },
    {
      key: PlanName.MASTERPIECE,
      name: 'Masterpiece Plan',
      tagline: 'For color enthusiasts',
      price: '£249.99',
      credits: `${PLAN_CREDITS[PlanName.MASTERPIECE][BillingPeriod.ANNUAL]} credits/month`,
      features: [
        'All Rainbow Plan features',
        'Bulk generation',
        'Commercial use',
        'Credits roll over (up to 2 months)',
      ],
      audience: 'Perfect for adults and serious colorers',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_MASTERPIECE_ANNUAL as string,
    },
    {
      key: PlanName.STUDIO,
      name: 'Studio Plan',
      tagline: 'For super creators and small businesses',
      price: '£599.00',
      credits: `${PLAN_CREDITS[PlanName.STUDIO][BillingPeriod.ANNUAL]} credits/month`,
      features: [
        'All Masterpiece Plan features',
        'Credits roll over (up to 3 months)',
      ],
      audience: 'Best for studios, teachers, and high-volume users',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_STUDIO_ANNUAL as string,
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
  CREDITS_PURCHASED: 'credits_purchased', // Credit pack bought
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
} as const;
