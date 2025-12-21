/* eslint-disable import-x/prefer-default-export */
import { flag } from 'flags/next';
import { edgeConfigAdapter } from '@flags-sdk/edge-config';

// Base flag definition - exported for discovery endpoint
export const showAuthButtonsFlagDefinition = flag({
  adapter: edgeConfigAdapter(),
  key: 'showAuthButtons',
});

// Wrapper with 'use cache: private' for per-request caching - used in app
export async function showAuthButtonsFlag() {
  'use cache: private';

  // Call the base flag function which can access headers/cookies
  return showAuthButtonsFlagDefinition();
}
