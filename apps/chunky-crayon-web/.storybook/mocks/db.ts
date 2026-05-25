export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
}

export enum PlanName {
  SPLASH = 'SPLASH',
  RAINBOW = 'RAINBOW',
  SPARKLE = 'SPARKLE',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum AgeGroup {
  TODDLER = 'TODDLER',
  CHILD = 'CHILD',
  TWEEN = 'TWEEN',
  TEEN = 'TEEN',
  ADULT = 'ADULT',
}

export enum Brand {
  CHUNKY_CRAYON = 'CHUNKY_CRAYON',
  COLORING_HABITAT = 'COLORING_HABITAT',
}

export enum CharacterStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export const db = new Proxy(
  {},
  {
    get: () =>
      new Proxy(
        {},
        {
          get: () => async () => null,
        },
      ),
  },
);

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  credits?: number | null;
  role?: string | null;
};

// Storybook-only shape — wide enough for every component story to
// pass through without `as any`, narrow enough that adding to the
// real Prisma model never touches this file. New stories: add the
// fields you read, don't import the real Prisma type (it pulls in
// Decimal, JsonValue, etc. which Vite can't resolve in browser).
export type ColoringImage = {
  id: string;
  title?: string | null;
  alt?: string | null;
  description?: string | null;
  svgUrl?: string | null;
  url?: string | null;
  qrCodeUrl?: string | null;
  backgroundMusicUrl?: string | null;
  tags?: string[] | null;
  slugBase?: string | null;
  // Region store (the magic-brush + auto-color backbone).
  regionMapUrl?: string | null;
  regionMapWidth?: number | null;
  regionMapHeight?: number | null;
  regionsJson?: unknown;
  // Legacy fill data (kept as fallback for un-backfilled images).
  colorMapJson?: string | null;
  fillPointsJson?: string | null;
  // Lifecycle / classification.
  status?: 'GENERATING' | 'READY' | 'FAILED';
  generationType?: 'USER' | 'SYSTEM' | 'DAILY' | 'COMMENT_REQUEST';
  brand?: 'CHUNKY_CRAYON' | 'COLORING_HABITAT';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  showInCommunity?: boolean | null;
  userId?: string | null;
  profileId?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};
