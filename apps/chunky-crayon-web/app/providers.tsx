'use client';

import { SessionProvider } from 'next-auth/react';
import PlausibleProvider from 'next-plausible';
import {
  ColoringContextProvider,
  setR2Hosts,
} from '@one-colored-pixel/coloring-ui';
import { ParentalGateProvider } from '@/components/ParentalGate';
import UserIdentify from '@/components/UserIdentify/UserIdentify';
import PixelTracker from '@/components/PixelTracker/PixelTracker';

// Configure R2 hosts for canvas CORS proxy. Matches both the production
// custom domain and the R2 dev public URL so browser fetches stay
// same-origin via the /_r2/* rewrite in next.config.
setR2Hosts([
  'https://assets.chunkycrayon.com',
  'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev',
]);

const Providers = ({ children }: { children: React.ReactNode }) => (
  <PlausibleProvider domain="chunkycrayon.com" trackOutboundLinks>
    <ColoringContextProvider variant="kids" storagePrefix="chunky-crayon">
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
