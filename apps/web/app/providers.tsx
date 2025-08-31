'use client';

import { SessionProvider } from 'next-auth/react';
import { ColoringContextProvider } from '@/contexts/coloring';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <ColoringContextProvider>
    <SessionProvider>{children}</SessionProvider>
  </ColoringContextProvider>
);

export default Providers;
