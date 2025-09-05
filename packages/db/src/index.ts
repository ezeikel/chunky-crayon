// Re-export the Prisma client
export { prisma as db } from "./client";
export * from "../generated/prisma";

// Re-export Prisma types and enums
export { Prisma } from "../generated/prisma";

// Re-export specific model types with custom names
export type {
  User as DbUserType,
  Subscription as DbSubscriptionType,
  CreditTransaction as DbCreditTransactionType,
  ColoringImage as DbColoringImageType,
  Account as DbAccountType,
  Session as DbSessionType,
} from "../generated/prisma";
