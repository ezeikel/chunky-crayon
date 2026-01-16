'use client';

import { SessionProvider } from 'next-auth/react';
import PlausibleProvider from 'next-plausible';
import { ColoringContextProvider } from '@/contexts/coloring';
import { ParentalGateProvider } from '@/components/ParentalGate';
import UserIdentify from '@/components/UserIdentify/UserIdentify';
import PixelTracker from '@/components/PixelTracker/PixelTracker';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <PlausibleProvider domain="chunkycrayon.com" trackOutboundLinks>
    <ColoringContextProvider>
      <SessionProvider>
        <ParentalGateProvider>
          <UserIdentify />
          <PixelTracker />
          {children}
        </ParentalGateProvider>
      </SessionProvider>
    </ColoringContextProvider>
  </PlausibleProvider>
);

export default Providers;
