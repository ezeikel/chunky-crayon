// Client-safe exports (no Prisma dependencies)
export * from './types';
export * from './catalog';

// Note: service.ts contains server-only code (Prisma)
// Import it directly where needed: import { ... } from '@/lib/stickers/service';
