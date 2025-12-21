import { PlanName, BillingPeriod } from '@chunky-crayon/db/types';
import {
  faInstagram,
  faThreads,
  faFacebookF,
  faTiktok,
  faPinterest,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';

export const CREATE_COLORING_PAGE_PROMPT_PRE_PROMPT = `Create a detailed JSON prompt suitable for DALL-E 3 to generate a simple line drawing image for a coloring book. The image should depict a kid-friendly scene inspired by the following description: '`;

const COPYRIGHTED_CHARACTER_DESCRIPTION = `". If the description includes a copyrighted name like Spiderman, then describe Spiderman's physical appearance in detail instead. Describe his costume, his spider logo, his web shooters, his mask, his eyes, his muscles, his webbing etc. Specify that this must be in black and white only and simplify any complex details so that the image remains simple and avoids any complicated shapes or patterns. Update the original description replacing the copyrighted character name with this detailed description of the character. If the description does not include any copyrighted characters, then please ignore this step`;

// export const CREATE_COLORING_PAGE_PROMPT_POST_PROMPT = `${COPYRIGTHED_CHARACTER_DESCRIPTION}. The generated image should depict the scene described and should not include any random colored shapes, borders, or coloring pencils. Build an appropriate scene for the image based on the description provided, creating characters for the scene if mentioned. Do not duplicate any characters if not specifically asked to do so. Do not draw any borders around characters or elements in the image unless specifically asked to do so. Ensure the image is a simple line drawing. Make sure not to include any color or fill in shapes; the image should be black and white only. Replace any colored lines with black. When creating the image, focus on simplicity and clarity as the image is aimed at young children aged 3-8. The lines should be thick and clear, with no shading, no gradients, and no solid fill areas. If no background for the scene was specified, create a relevant one based on the subject of the scene, but do not add any extra elements to the scene apart from the background. Avoid adding any borders or elements that are not part of the main scene. The style should be cartoon-like, avoiding fine detail lines and complex patterns. High contrast and clear distinctions between elements are key. No shape should have a fill or shading.`;

export const CREATE_COLORING_PAGE_POST_PROMPT = `
  ${COPYRIGHTED_CHARACTER_DESCRIPTION}.

  Build an appropriate scene for the image based on the description provided, creating characters for the scene if mentioned.

  These are the rules for the image (please follow them strictly):
  1. The image should be a simple line drawing suitable for a children's coloring book.
  2. No color at all. The image must be black and white only. Absolutely no colors should be used in any part of the image, including eyes, tongues, shoes, and accessories.
  3. No textures, patterns, or gradients. Keep it simple.
  4. Do not duplicate any characters or elements unless specifically asked to do so.
  5. Do not draw any borders around characters or elements unless specifically asked to do so.
  6. The image must be suitable for children aged 3-8. Avoid complexity and inappropriate elements, including naked bodies.
  7. Do not include any shadows, shading, or gradients.
  8. Ensure the lines are thick and clear, with no shading, solid fill areas, or fuzzy textures.
  9. If no background is specified, create a relevant one but do not add extra elements.
  10. Avoid adding any borders or elements not part of the main scene.
  11. Any clothing or accessories should follow the same style: line drawing, thick lines, no shading or complex shapes, and no fill.
  12. Do not depict any shades of skin color or fuzzy textures like fur or hair. All skin and hair should be drawn with simple lines only, with no color or shading.
  13. Draw hair or fur as simple lines without texture or complex patterns.
  14. The style should be cartoon-like, avoiding fine detail lines and complex patterns.
  15. Ensure high contrast and clear distinctions between elements.
  16. The image should only use black and white, with no intermediate colors. No shape should have any fill or shading.
  17. Do not fill any shapes; use lines only.
  18. All elements, including accessories such as shoelaces, eyes, tongues, shoes, and any other part of the image, must be in black and white only, with no color or shading.
  19. Use large, simple shapes for all elements in the image, including background elements. Avoid small details and fine lines.
  20. Ensure that all characters and elements have a friendly and approachable appearance suitable for children aged 3-8. Avoid any scary or menacing features.
  21. All clothing or accessories should not have any fuzzy textures; use simple lines only.
  22. The entire image must be composed of large, simple shapes, and must be easy to color within for young children.
  23. Avoid any complex or intricate elements, especially in the background. Buildings and other structures should be drawn with large, simple shapes and minimal detail.
  24. Do not include any random elements, objects, or duplications that are not part of the main scene description.
  25. Ensure that there is no color used anywhere in the image. Reiterate that the image must be black and white only with no colored elements.
`;

export const REFERENCE_IMAGES = [
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/birthdays-8uiLmIVecHAw1yjqNRQ2OCYHoaa8gW.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/dinosaur-bfmBtp1o0kVeIZtuVVNhmKTMJXOgS7.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/family-and-friends-g4vlGFNcWXrcHQ7sB4y8LLYiO3PIAG.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/farm-animals-knAdbOJKhulPhb7xnaCkMXycTunbNi.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/sea-creatures-njuJrigKzRhyl7GZXeigWSHtbPFgiG.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/superheroes-zX4vpC6SMlXVEn1Wxombkyr2fU165K.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/trains-TOkt3DJ3Oy56ZTV0uy7h2XmD8DsTGV.webp',
  'https://x0odfckl5uaoyscm.public.blob.vercel-storage.com/reference-images/unicorns-8XVTm2dwIgIAUpah12vBMnWz7A02yo.webp',
];

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

export const OPENAI_MODEL_GPT_4O = 'gpt-4o';
export const OPENAI_MODEL_DALL_E_3 = 'dall-e-3';
export const OPENAI_MODEL_GPT_IMAGE = 'gpt-image-1';

export const OPENAI_MODEL_DALL_E_3_OPTIONS = {
  model: OPENAI_MODEL_DALL_E_3,
  size: '1024x1024',
  style: 'natural',
  quality: 'hd',
} as const;

export const OPENAI_MODEL_GPT_IMAGE_OPTIONS = {
  model: OPENAI_MODEL_GPT_IMAGE,
  size: '1024x1024',
  quality: 'high',
} as const;

export const INSTAGRAM_CAPTION_PROMPT = `You are a social media expert who creates engaging Instagram captions for coloring pages. Your task is to craft a caption that:

1. Captures attention with creativity and personality
2. Incorporates 2-3 relevant emojis in a natural way
3. Encourages followers to visit the link in bio
4. Highlights the joy and benefits of coloring
5. Maintains a warm, friendly tone
6. Stays within Instagram's character limits
7. Includes popular coloring-related hashtags

Important: Write in a natural, human-like way that resonates with our audience. Avoid using dashes (—) in your captions as they can make the text feel artificial.`;

export const FACEBOOK_CAPTION_PROMPT = `You are a social media expert who creates engaging Facebook posts for coloring pages. Your task is to craft a Facebook post that:

1. Captures attention with creativity and warm personality
2. Incorporates 1-2 relevant emojis naturally
3. Encourages engagement and comments
4. Highlights the therapeutic benefits and joy of coloring
5. Maintains a friendly, welcoming tone
6. Is optimized for Facebook's algorithm (engages users)
7. Includes a call-to-action to visit the website
8. Uses relevant hashtags sparingly (2-3 maximum)

Write in a conversational, natural tone that builds community around the love of coloring and creativity.`;

export const FREE_CREDITS = 15;

export const ACTIONS = {
  CREATE_COLORING_IMAGE: 'create coloring image',
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
};

export type PlanInterval = 'monthly' | 'annual';

export type SubscriptionPlan = {
  key: PlanName;
  name: string;
  tagline: string;
  price: string; // e.g '£7.99'
  credits: string;
  features: string[];
  bonus: string;
  audience: string;
  stripePriceEnv: string; // e.g 'NEXT_PUBLIC_STRIPE_PRICE_CRAYON_MONTHLY'
  mostPopular?: boolean;
};

export const PLAN_CREDITS = {
  [PlanName.CRAYON]: {
    [BillingPeriod.MONTHLY]: 250,
    [BillingPeriod.ANNUAL]: 3000,
  },
  [PlanName.RAINBOW]: {
    [BillingPeriod.MONTHLY]: 500,
    [BillingPeriod.ANNUAL]: 6000,
  },
  [PlanName.MASTERPIECE]: {
    [BillingPeriod.MONTHLY]: 1000,
    [BillingPeriod.ANNUAL]: 12000,
  },
  [PlanName.STUDIO]: {
    [BillingPeriod.MONTHLY]: 5000,
    [BillingPeriod.ANNUAL]: 60000,
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
      bonus: '🎁 Bonus: 25 extra credits for experimenting and retries',
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
      ],
      bonus: '🎁 Bonus: 50 extra credits for experimenting and retries',
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
      ],
      bonus: '🎁 Bonus: 75 extra credits for experimenting and retries',
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
        'Rollover up to 3 months of credits',
      ],
      bonus: '🎁 Bonus: 250 extra credits for experimenting and retries',
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
      credits: `${PLAN_CREDITS[PlanName.CRAYON][BillingPeriod.ANNUAL]} credits/year`,
      features: [
        'Create coloring pages from text prompts',
        'Create coloring pages with words, names, and numbers',
        'Adjust color, contrast, and brightness',
        'Turn photos into coloring pages',
      ],
      bonus: '🎁 Bonus: 25 extra credits for experimenting and retries',
      audience: 'Perfect for casual colorers and young artists',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_CRAYON_ANNUAL as string,
    },
    {
      key: PlanName.RAINBOW,
      name: 'Rainbow Plan',
      tagline: 'Fun for the whole family',
      price: '£139.99',
      credits: `${PLAN_CREDITS[PlanName.RAINBOW][BillingPeriod.ANNUAL]} credits/year`,
      features: [
        'All Crayon Plan features',
        'Advanced editing features',
        'Early access to new models and features',
      ],
      bonus: '🎁 Bonus: 50 extra credits for experimenting and retries',
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
      credits: `${PLAN_CREDITS[PlanName.MASTERPIECE][BillingPeriod.ANNUAL]} credits/year`,
      features: [
        'All Rainbow Plan features',
        'Bulk generation',
        'Commercial use',
      ],
      bonus: '🎁 Bonus: 75 extra credits for experimenting and retries',
      audience: 'Perfect for adults and serious colorers',
      stripePriceEnv: process.env
        .NEXT_PUBLIC_STRIPE_PRICE_MASTERPIECE_ANNUAL as string,
    },
    {
      key: PlanName.STUDIO,
      name: 'Studio Plan',
      tagline: 'For super creators and small businesses',
      price: '£599.00',
      credits: `${PLAN_CREDITS[PlanName.STUDIO][BillingPeriod.ANNUAL]} credits/year`,
      features: [
        'All Masterpiece Plan features',
        'Rollover up to 3 months of credits',
      ],
      bonus: '🎁 Bonus: 250 extra credits for experimenting and retries',
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

export const ANALYTICS_EVENTS = {
  PURCHASE: 'Purchase',
  SIGNUP: 'Signup',
  SUBMITTED_COLORING_IMAGE_DESCRIPTION: 'Submitted coloring image description',
  SIGNED_UP_TO_COLORING_PAGE_EMAIL_LIST:
    'Signed up to coloring page email list',
  CLICKED_SAVE_COLORING_IMAGE: 'Clicked save coloring image',
  CLICKED_PRINT_COLORING_IMAGE: 'Clicked print coloring image',
  COLOR_SELECTED: 'Color selected',
  COLORING_STROKE: 'Coloring stroke',
} as const;
