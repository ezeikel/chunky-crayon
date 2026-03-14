import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/constants';

// eslint-disable-next-line import-x/prefer-default-export
export const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: STRIPE_API_VERSION,
});
