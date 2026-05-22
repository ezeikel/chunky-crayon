import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import { ColoringContextProvider } from '@one-colored-pixel/coloring-ui';
import { ParentalGateProvider } from '@/components/ParentalGate';
import appMessages from '../messages/en.json';
import sharedMessages from '../../../packages/translations/src/en.json';
import '../global.css';
import './storybook.css';

const mergeMessages = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    const baseValue = merged[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      merged[key] = mergeMessages(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      return;
    }

    merged[key] = value;
  });

  return merged;
};

const messages = mergeMessages(
  sharedMessages as Record<string, unknown>,
  appMessages as Record<string, unknown>,
);

messages.auth = sharedMessages.auth;

const installStorybookFetchMocks = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const win = window as typeof window & {
    __chunkyStorybookFetchMocked?: boolean;
  };

  if (win.__chunkyStorybookFetchMocked) {
    return;
  }

  win.__chunkyStorybookFetchMocked = true;
  const originalFetch = win.fetch.bind(win);

  win.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes('/api/canvas/previews')) {
      return new Response(JSON.stringify({ previews: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };
};

const preview: Preview = {
  globalTypes: {
    authState: {
      description: 'Auth state',
      toolbar: {
        title: 'Auth',
        icon: 'user',
        items: [
          { value: 'guest', title: 'Guest' },
          { value: 'signed-in', title: 'Signed in' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    authState: 'guest',
  },
  decorators: [
    (Story, context) => {
      const signedIn = context.globals.authState === 'signed-in';
      const session = signedIn
        ? {
            user: {
              id: 'storybook-user',
              name: 'Maya Parent',
              email: 'maya@example.com',
            },
            expires: '2099-01-01T00:00:00.000Z',
          }
        : null;

      if (typeof document !== 'undefined') {
        installStorybookFetchMocks();
        document.documentElement.lang = 'en';
        document.documentElement.style.setProperty('--font-tondo', '"Tondo"');
        document.documentElement.style.setProperty(
          '--font-rooney-sans',
          '"Rooney Sans"',
        );
      }

      return (
        <NextIntlClientProvider locale="en" messages={messages}>
          <SessionProvider session={session}>
            <ColoringContextProvider variant="kids" storagePrefix="storybook">
              {/* InputModeSelector (and anything under CreateColoringPageForm)
                  calls useParentalGate, which throws without this provider.
                  Global so every story has the gate context available. */}
              <ParentalGateProvider>
                <div className="min-h-screen bg-paper font-rooney-sans text-text-primary">
                  <Story />
                  <Toaster />
                </div>
              </ParentalGateProvider>
            </ColoringContextProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
  },
};

export default preview;
