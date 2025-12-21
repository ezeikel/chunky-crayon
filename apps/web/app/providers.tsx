'use client';

import { SessionProvider } from 'next-auth/react';
import { ColoringContextProvider } from '@/contexts/coloring';
import PostHogIdentify from '@/components/PostHogIdentify/PostHogIdentify';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <ColoringContextProvider>
    <SessionProvider>
      <PostHogIdentify />
      {children}
    </SessionProvider>
  </ColoringContextProvider>
);

export default Providers;
