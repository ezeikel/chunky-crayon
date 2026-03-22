// Canvas-related constants for Coloring Habitat (adult coloring)

export const FREE_CREDITS = 10;

export const MAX_IMAGE_GENERATION_ATTEMPTS = 3;

// Admin emails
export const ADMIN_EMAILS = ["ezeikelpemberton@gmail.com"];

// Legacy colors - kept for backwards compatibility
export const COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#000000",
  "#FFFFFF",
];

// Adult-oriented coloring palette
export const COLORING_PALETTE = {
  // Primary colors (8) - Most used
  primary: [
    { name: "Cherry Red", hex: "#E53935" },
    { name: "Sunset Orange", hex: "#FB8C00" },
    { name: "Sunshine Yellow", hex: "#FDD835" },
    { name: "Grass Green", hex: "#43A047" },
    { name: "Sky Blue", hex: "#1E88E5" },
    { name: "Grape Purple", hex: "#8E24AA" },
    { name: "Bubblegum Pink", hex: "#EC407A" },
    { name: "Chocolate Brown", hex: "#6D4C41" },
  ],
  // Secondary colors (8)
  secondary: [
    { name: "Coral", hex: "#FF7043" },
    { name: "Mint", hex: "#26A69A" },
    { name: "Lavender", hex: "#AB47BC" },
    { name: "Peach", hex: "#FFAB91" },
    { name: "Navy", hex: "#3949AB" },
    { name: "Forest", hex: "#2E7D32" },
    { name: "Gold", hex: "#FFD54F" },
    { name: "Rose", hex: "#F48FB1" },
  ],
  // Essentials (4) - Always visible
  essentials: [
    { name: "Black", hex: "#212121" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Gray", hex: "#9E9E9E" },
    { name: "Skin Tone", hex: "#FFCC80" },
  ],
  // Skin tones (6)
  skinTones: [
    { name: "Light", hex: "#FFE0B2" },
    { name: "Medium Light", hex: "#FFCC80" },
    { name: "Medium", hex: "#DEB887" },
    { name: "Medium Dark", hex: "#A0522D" },
    { name: "Dark", hex: "#8B4513" },
    { name: "Deep", hex: "#5D4037" },
  ],
} as const;

// Flat array of all coloring palette colors for easy iteration
export const ALL_COLORING_COLORS = [
  ...COLORING_PALETTE.primary,
  ...COLORING_PALETTE.secondary,
  ...COLORING_PALETTE.essentials,
];

// Brush size configuration
export const BRUSH_SIZES = {
  small: { radius: 4, name: "Fine", icon: "•" },
  medium: { radius: 12, name: "Regular", icon: "●" },
  large: { radius: 24, name: "Chunky", icon: "⬤" },
} as const;

export type BrushSize = keyof typeof BRUSH_SIZES;
export type BrushType =
  | "crayon"
  | "marker"
  | "eraser"
  | "glitter"
  | "sparkle"
  | "rainbow"
  | "glow"
  | "neon";
export type ColoringTool =
  | "brush"
  | "fill"
  | "pan"
  | "sticker"
  | "magic-reveal"
  | "magic-auto";

// Sticker types (kept for canvas action compatibility, stickers not actively used)
export type StickerCategory =
  | "shapes"
  | "emojis"
  | "stars"
  | "hearts"
  | "nature"
  | "fun";

export type Sticker = {
  id: string;
  name: string;
  category: StickerCategory;
  emoji: string;
};

export const CANVAS_STICKERS: Sticker[] = [];

// Fill pattern types for the fill tool
export type FillPattern =
  | "solid"
  | "dots"
  | "stripes"
  | "stripes-diagonal"
  | "checkerboard"
  | "hearts"
  | "stars"
  | "zigzag";

// Fill pattern configuration
export const FILL_PATTERNS = {
  solid: { name: "Solid", icon: "⬤", description: "Fill with solid color" },
  dots: { name: "Polka Dots", icon: "⚬", description: "Fun polka dot pattern" },
  stripes: { name: "Stripes", icon: "≡", description: "Horizontal stripes" },
  "stripes-diagonal": {
    name: "Diagonal",
    icon: "⟋",
    description: "Diagonal stripes",
  },
  checkerboard: {
    name: "Checkers",
    icon: "▦",
    description: "Checkerboard pattern",
  },
  hearts: { name: "Hearts", icon: "♥", description: "Lovely heart pattern" },
  stars: { name: "Stars", icon: "★", description: "Sparkly star pattern" },
  zigzag: { name: "Zigzag", icon: "⚡", description: "Zigzag waves" },
} as const;

export const NUMBER_OF_CONCURRENT_IMAGE_GENERATION_REQUESTS = 1;

// Action constants used for getUserId logging
export const ACTIONS = {
  GET_CURRENT_USER: "get current user",
  GET_ENTITLEMENTS: "get entitlements",
  GET_ALL_COLORING_IMAGES: "get all coloring images",
  CREATE_COLORING_IMAGE: "create coloring image",
  CREATE_CHECKOUT_SESSION: "create checkout session",
  GET_ACTIVE_PROFILE: "get active profile",
  GET_PROFILES: "get profiles",
  CREATE_PROFILE: "create profile",
  UPDATE_PROFILE: "update profile",
  DELETE_PROFILE: "delete profile",
  SET_ACTIVE_PROFILE: "set active profile",
  GET_COLO_STATE: "get colo state",
  CHECK_COLO_EVOLUTION: "check colo evolution",
  TRANSCRIBE_AUDIO: "transcribe audio",
  DESCRIBE_IMAGE: "describe image",
  GENERATE_LOADING_AUDIO: "generate loading audio",
  MAGIC_COLOR: "magic color",
  SAVE_ARTWORK: "save artwork",
  GET_SAVED_ARTWORKS: "get saved artworks",
} as const;

// Tracking events for analytics
export const TRACKING_EVENTS = {
  AUTH_SIGN_IN_STARTED: "auth_sign_in_started",
  AUTH_SIGN_IN_COMPLETED: "auth_sign_in_completed",
  AUTH_SIGN_IN_FAILED: "auth_sign_in_failed",
  AUTH_SIGN_UP_COMPLETED: "auth_sign_up_completed",
  AUTH_SIGN_OUT: "auth_sign_out",
  GUEST_GENERATION_USED: "guest_generation_used",
  GUEST_LIMIT_REACHED: "guest_limit_reached",
  GUEST_SIGNUP_CLICKED: "guest_signup_clicked",
  CREATION_STARTED: "creation_started",
  CREATION_SUBMITTED: "creation_submitted",
  CREATION_COMPLETED: "creation_completed",
  CREATION_FAILED: "creation_failed",
  CREATION_RETRIED: "creation_retried",
  CREATION_ANALYZED: "creation_analyzed",
  INPUT_MODE_CHANGED: "input_mode_changed",
  VOICE_INPUT_STARTED: "voice_input_started",
  VOICE_INPUT_COMPLETED: "voice_input_completed",
  VOICE_INPUT_FAILED: "voice_input_failed",
  VOICE_INPUT_CANCELLED: "voice_input_cancelled",
  IMAGE_INPUT_UPLOADED: "image_input_uploaded",
  IMAGE_INPUT_CAPTURED: "image_input_captured",
  IMAGE_INPUT_PROCESSED: "image_input_processed",
  IMAGE_INPUT_FAILED: "image_input_failed",
  PAGE_VIEWED: "page_viewed",
  PAGE_COLORED: "page_colored",
  PAGE_COLOR_SELECTED: "page_color_selected",
  PAGE_STROKE_MADE: "page_stroke_made",
  PAGE_SAVED: "page_saved",
  PAGE_SHARED: "page_shared",
  DOWNLOAD_PDF_CLICKED: "download_pdf_clicked",
  DOWNLOAD_PDF_COMPLETED: "download_pdf_completed",
  PRINT_CLICKED: "print_clicked",
  EMAIL_SIGNUP_STARTED: "email_signup_started",
  EMAIL_SIGNUP_COMPLETED: "email_signup_completed",
  EMAIL_SIGNUP_FAILED: "email_signup_failed",
  PRICING_PAGE_VIEWED: "pricing_page_viewed",
  PRICING_INTERVAL_TOGGLED: "pricing_interval_toggled",
  PRICING_PLAN_CLICKED: "pricing_plan_clicked",
  PRICING_CREDITS_CLICKED: "pricing_credits_clicked",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_ABANDONED: "checkout_abandoned",
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_CHANGED: "subscription_changed",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_PORTAL_OPENED: "subscription_portal_opened",
  CREDITS_PURCHASED: "credits_purchased",
  CREDIT_PACK_PURCHASED: "credit_pack_purchased",
  CREDITS_USED: "credits_used",
  CREDITS_LOW: "credits_low",
  BILLING_PAGE_VIEWED: "billing_page_viewed",
  ACCOUNT_SETTINGS_VIEWED: "account_settings_viewed",
  CTA_CLICKED: "cta_clicked",
  FEATURE_DISCOVERED: "feature_discovered",
  REFERRAL_SHARED: "referral_shared",
  SOCIAL_LINK_CLICKED: "social_link_clicked",
  APP_STORE_CLICKED: "app_store_clicked",
  PLAY_STORE_CLICKED: "play_store_clicked",
  ERROR_OCCURRED: "error_occurred",
  ERROR_API: "error_api",
  ERROR_GENERATION: "error_generation",
  ERROR_PAYMENT: "error_payment",
  IMAGE_GENERATION_COMPLETED: "image_generation_completed",
  IMAGE_GENERATION_FAILED: "image_generation_failed",
  LOADING_AUDIO_GENERATED: "loading_audio_generated",
  LOADING_AUDIO_PLAYED: "loading_audio_played",
  LOADING_AUDIO_FAILED: "loading_audio_failed",
  LANGUAGE_CHANGED: "language_changed",
} as const;

// Scene generation seed data
export const SETTINGS = [
  "forest",
  "beach",
  "city",
  "mountain",
  "space",
  "underwater reef",
  "desert oasis",
  "tropical jungle",
  "haunted castle",
  "magical library",
  "cloud kingdom",
] as const;

export const CHARACTERS = [
  "dragon",
  "unicorn",
  "knight",
  "astronaut",
  "pirate",
  "mermaid",
  "wizard",
  "fairy",
  "robot",
  "alien",
  "princess",
  "superhero",
  "detective",
  "explorer",
] as const;

export const ACTIVITIES = [
  "dancing",
  "reading",
  "playing",
  "exploring",
  "painting",
  "building",
  "flying",
  "swimming",
  "singing",
  "gardening",
  "cooking",
  "camping",
  "treasure hunting",
  "storytelling",
] as const;

export const LOCATIONS = [
  "a magical forest",
  "a sunny beach",
  "a busy marketplace",
  "a coral reef",
  "a crystal palace",
  "a secret garden",
  "a futuristic city",
  "a floating castle",
  "a pirate cove",
] as const;

export type ThemeMap = Record<
  string,
  { characters: string[]; activities: string[]; locations: string[] }
>;

export const THEME_MAP: ThemeMap = {
  forest: {
    characters: ["elf", "fairy", "fox", "unicorn", "dragon"],
    activities: ["exploring", "gardening", "building", "storytelling"],
    locations: ["a magical forest", "a hidden waterfall"],
  },
  beach: {
    characters: ["pirate", "mermaid", "surfer", "dolphin"],
    activities: ["surfing", "swimming", "treasure hunting"],
    locations: ["a sunny beach", "a coral reef"],
  },
  city: {
    characters: ["superhero", "detective", "robot", "inventor"],
    activities: ["skateboarding", "painting", "playing"],
    locations: ["a busy marketplace", "a rooftop garden"],
  },
  mountain: {
    characters: ["knight", "wizard", "eagle", "mountaineer"],
    activities: ["rock climbing", "camping", "exploring"],
    locations: ["a mountain peak", "a hidden cave"],
  },
  space: {
    characters: ["astronaut", "alien", "robot", "time traveler"],
    activities: ["exploring", "flying", "collecting stardust"],
    locations: ["a space station", "a distant galaxy"],
  },
};
