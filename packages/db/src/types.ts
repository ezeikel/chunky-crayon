// Types-only exports that don't import the database client
// This file uses browser.ts which is safe to import on the client side
export * from "./generated/prisma/browser";

// Re-export Prisma types and enums
export { Prisma } from "./generated/prisma/browser";

// Re-export specific model types with custom names
export type {
  User as DbUserType,
  Subscription as DbSubscriptionType,
  CreditTransaction as DbCreditTransactionType,
  ColoringImage as DbColoringImageType,
  Account as DbAccountType,
  Session as DbSessionType,
  Profile as DbProfileType,
  SavedArtwork as DbSavedArtworkType,
} from "./generated/prisma/browser";
