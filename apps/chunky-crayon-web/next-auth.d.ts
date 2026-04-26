// types/next-auth.d.ts

import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@one-colored-pixel/db/types';

declare module 'next-auth' {
  interface Session {
    userId?: string;
    user: {
      dbId?: string;
      role?: UserRole;
    } & DefaultSession['user'];
  }
}
