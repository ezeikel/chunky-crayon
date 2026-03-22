import { getStripe } from "@/lib/stripe";
import BillingSuccess from "@/components/BillingSuccess/BillingSuccess";

export const metadata = {
  title: "Payment Successful | Coloring Habitat",
};

type SearchParams = Promise<{
  session_id?: string;
}>;

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id: sessionId } = await searchParams;

  let amount: number | null = null;
  let currency = "gbp";

  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      amount = session.amount_total;
      currency = session.currency || "gbp";
    } catch (error) {
      console.error("Error retrieving checkout session:", error);
    }
  }

  return (
    <BillingSuccess amount={amount} currency={currency} sessionId={sessionId} />
  );
}
