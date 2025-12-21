'use client';

import { SessionProvider } from 'next-auth/react';
import { ColoringContextProvider } from '@/contexts/coloring';
import UserIdentify from '@/components/UserIdentify/UserIdentify';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <ColoringContextProvider>
    <SessionProvider>
      <UserIdentify />
      {children}
    </SessionProvider>
  </ColoringContextProvider>
);

export default Providers;
