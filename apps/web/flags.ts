/* eslint-disable import-x/prefer-default-export */
import { flag } from 'flags/next';
import { edgeConfigAdapter } from '@flags-sdk/edge-config';

export const showAuthButtonsFlag = flag({
  adapter: edgeConfigAdapter(),
  key: 'showAuthButtons',
});
