"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getUserId } from "@/app/actions/user";
import { db } from "@one-colored-pixel/db";
import { ACTIONS } from "@/constants";
import {
  mapStripePriceToPlanName,
  getCreditAmountFromPlanName,
  getCreditAmountFromPriceId,
} from "@/utils/stripe";
import {
  readClientMatchData,
  sendInitiateCheckoutConversionEvents,
} from "@/lib/conversion-api";

export const createCheckoutSession = async (
  priceId: string,
  mode: "subscription" | "payment" = "subscription",
  cancelPath: string = "/pricing",
) => {
  const userId = await getUserId(ACTIONS.CREATE_CHECKOUT_SESSION);

  if (!userId) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  const stripe = getStripe();

  // Capture Meta match data (fbp/fbc cookies + IP/UA) and round-trip
  // them via Stripe metadata. The webhook fires Purchase server-side
  // from Stripe's IP — without this round-trip, Meta has no browser
  // identity for the buyer and match quality drops sharply.
  const matchData = await readClientMatchData();
  const initiateCheckoutEventId = crypto.randomUUID();

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      customer_email: user?.stripeCustomerId
        ? undefined
        : (user?.email ?? undefined),
      customer: user?.stripeCustomerId ?? undefined,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/account/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}${cancelPath}`,
      metadata: {
        userId,
        ...(matchData.fbp && { fbp: matchData.fbp }),
        ...(matchData.fbc && { fbc: matchData.fbc }),
        ...(matchData.ipAddress && { client_ip_address: matchData.ipAddress }),
        ...(matchData.userAgent && { client_user_agent: matchData.userAgent }),
      },
    });

    // Fire InitiateCheckout server-side. Survives ad-blockers / iOS 14+
    // tracking restrictions that suppress the browser pixel fire.
    const planMapping =
      mode === "subscription" ? mapStripePriceToPlanName(priceId) : null;
    const creditAmount =
      mode === "payment" ? getCreditAmountFromPriceId(priceId) : null;
    const contentName = planMapping
      ? `${planMapping.planName} Subscription`
      : creditAmount
        ? `${creditAmount} Credits Pack`
        : "Checkout";
    const value = session.amount_total ?? 0;
    const currency = (session.currency ?? "gbp").toUpperCase();

    sendInitiateCheckoutConversionEvents({
      ...(user?.email && { email: user.email }),
      userId,
      value,
      currency,
      eventId: initiateCheckoutEventId,
      contentName,
      ...matchData,
    }).catch((err) => {
      console.error("[CAPI] InitiateCheckout failed", err);
    });

    return { id: session.id, url: session.url };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create checkout session",
    };
  }
};

export const createCustomerPortalSession = async () => {
  const userId = await getUserId(ACTIONS.CREATE_CHECKOUT_SESSION);

  if (!userId) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return { error: "No Stripe customer found" };
  }

  const stripe = getStripe();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/account/billing`,
  });

  return { url: portalSession.url };
};

export const changeSubscription = async ({
  currentPlanName,
  newPlanName,
  newPriceId,
}: {
  currentPlanName: string;
  newPlanName: string;
  newPriceId: string;
}) => {
  const userId = await getUserId(ACTIONS.CREATE_CHECKOUT_SESSION);

  if (!userId) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return { error: "No Stripe customer found" };
  }

  const stripe = getStripe();

  // Get the current subscription from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return { error: "No active subscription found" };
  }

  const subscription = subscriptions.data[0];
  const subscriptionItemId = subscription.items.data[0].id;

  // Update the subscription with the new price
  await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscriptionItemId,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });

  return {
    success: true,
    message: `Plan changed from ${currentPlanName} to ${newPlanName}`,
  };
};
