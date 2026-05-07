'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@one-colored-pixel/db';
import { stripe } from '@/lib/stripe';
import { ACTIONS } from '@/constants';
import { getUserId } from './user';
import {
  readClientMatchData,
  sendInitiateCheckoutConversionEvents,
} from '@/lib/conversion-api';

/**
 * Create a Stripe Checkout Session for buying a bundle. One-time payment,
 * no subscription, no trial. Works for logged-in users AND guests — for
 * guests, Stripe collects email at checkout and the webhook resolves it
 * to a User row at fulfilment time (same pattern as guest credit packs).
 *
 * Returns the Checkout Session id; the client redirects via
 * stripe.redirectToCheckout({ sessionId }).
 */
export const createBundleCheckoutSession = async (
  bundleSlug: string,
  // Caller-provided id used for the InitiateCheckout CAPI fire below.
  // Pass the same id to the browser's `trackInitiateCheckout({ eventId })`
  // call so Meta deduplicates client + server.
  initiateCheckoutEventId?: string,
): Promise<{
  id: string;
  error?: string;
} | null> => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const bundle = await db.bundle.findUnique({
    where: { slug: bundleSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      pricePence: true,
      stripePriceId: true,
      published: true,
    },
  });

  if (!bundle) {
    return { id: '', error: `Bundle not found: ${bundleSlug}` };
  }
  if (!bundle.published) {
    return { id: '', error: 'Bundle is not yet available for purchase.' };
  }
  if (!bundle.stripePriceId) {
    return {
      id: '',
      error:
        'Bundle is missing a Stripe price. Run create-stripe-bundle-product.ts first.',
    };
  }

  const userId = await getUserId(ACTIONS.CREATE_BUNDLE_CHECKOUT_SESSION);

  let user = null;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });

    // Idempotent ownership: if this user already owns the bundle, send
    // them straight to the success page instead of charging them again.
    const existingPurchase = await db.bundlePurchase.findUnique({
      where: { userId_bundleId: { userId, bundleId: bundle.id } },
    });
    if (existingPurchase && !existingPurchase.refundedAt) {
      return {
        id: '',
        error: 'You already own this bundle — find it in your account.',
      };
    }
  }

  const matchData = await readClientMatchData();
  const checkoutEventId = initiateCheckoutEventId ?? crypto.randomUUID();

  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [{ price: bundle.stripePriceId, quantity: 1 }],
    mode: 'payment',
    // Always create a Stripe customer so the webhook can resolve guest
    // checkouts back to a User row by email.
    customer_creation: 'always',
    success_url: `${origin}/products/digital/${bundle.slug}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/products/digital/${bundle.slug}`,
    metadata: {
      // Bundle identification — read by the webhook to find/create the
      // BundlePurchase row.
      bundleSlug: bundle.slug,
      bundleId: bundle.id,
      // Conversion-API match data — same round-trip pattern as the
      // subscription/credits flow. Webhook fires Purchase server-side
      // from Stripe's IP, so without this round-trip Meta has no
      // browser identity for the buyer.
      ...(matchData.fbp && { fbp: matchData.fbp }),
      ...(matchData.fbc && { fbc: matchData.fbc }),
      ...(matchData.epik && { epik: matchData.epik }),
      ...(matchData.anonymousId && { anonymous_id: matchData.anonymousId }),
      ...(matchData.eventSourceUrl && {
        event_source_url: matchData.eventSourceUrl,
      }),
      ...(matchData.ipAddress && { client_ip_address: matchData.ipAddress }),
      ...(matchData.userAgent && { client_user_agent: matchData.userAgent }),
    },
  };

  if (userId && user) {
    sessionOptions.client_reference_id = userId;
    sessionOptions.customer = user.stripeCustomerId ?? undefined;
    sessionOptions.customer_email = user.stripeCustomerId
      ? undefined
      : (user.email ?? undefined);
  }

  const stripeSession = await stripe.checkout.sessions.create(sessionOptions);

  // InitiateCheckout — fire-and-forget. Don't block the redirect.
  sendInitiateCheckoutConversionEvents({
    ...(user?.email && { email: user.email }),
    ...(userId && { userId }),
    value: stripeSession.amount_total ?? bundle.pricePence,
    currency: (stripeSession.currency ?? 'gbp').toUpperCase(),
    eventId: checkoutEventId,
    contentName: `${bundle.name} Bundle`,
    ...matchData,
  }).catch((err) => {
    console.error('[CAPI] Bundle InitiateCheckout failed', err);
  });

  return { id: stripeSession.id };
};
