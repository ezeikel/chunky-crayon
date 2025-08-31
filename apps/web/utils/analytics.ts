/* eslint-disable import-x/prefer-default-export */

import { track } from '@vercel/analytics';
import { ANALYTICS_EVENTS } from '@/constants';

export const trackEvent = (
  event: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS],
  payload?: Record<string, any>,
) => {
  console.log('event', event);
  console.log('payload', payload);
  track(event, payload);
};
