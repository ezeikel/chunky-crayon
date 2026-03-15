// @ts-nocheck — TODO: wire up Stripe checkout for Habitat plans
"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getUserId } from "@/app/actions/user";
import { db } from "@one-colored-pixel/db";
import { ACTIONS } from "@/constants";

export const createCheckoutSession = async (priceId: string) => {
  const userId = await getUserId(ACTIONS.CREATE_CHECKOUT_SESSION);

  if (!userId) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user?.stripeCustomerId
      ? undefined
      : (user?.email ?? undefined),
    customer: user?.stripeCustomerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    metadata: { userId },
  });

  if (session.url) {
    redirect(session.url);
  }
};
