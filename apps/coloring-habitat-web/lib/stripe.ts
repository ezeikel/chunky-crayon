import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET) {
      throw new Error("STRIPE_SECRET is not defined");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET, {
      apiVersion: "2025-08-27.basil",
    });
  }
  return _stripe;
}

// Alias for convenience — use getStripe() in webhook where lazy init matters
export { getStripe as stripe };
