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

export type ColoringImage = {
  id: string;
  title?: string | null;
  alt?: string | null;
  svgUrl?: string | null;
  qrCodeUrl?: string | null;
};
