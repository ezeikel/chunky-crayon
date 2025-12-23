'use client';

import { SessionProvider } from 'next-auth/react';
import { ColoringContextProvider } from '@/contexts/coloring';
import { ParentalGateProvider } from '@/components/ParentalGate';
import UserIdentify from '@/components/UserIdentify/UserIdentify';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <ColoringContextProvider>
    <SessionProvider>
      <ParentalGateProvider>
        <UserIdentify />
        {children}
      </ParentalGateProvider>
    </SessionProvider>
  </ColoringContextProvider>
);

export default Providers;
