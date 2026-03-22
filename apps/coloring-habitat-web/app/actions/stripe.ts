"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getUserId } from "@/app/actions/user";
import { db } from "@one-colored-pixel/db";
import { ACTIONS } from "@/constants";
import {
  mapStripePriceToPlanName,
  getCreditAmountFromPlanName,
} from "@/utils/stripe";

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
      metadata: { userId },
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
