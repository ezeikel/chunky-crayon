import { Suspense } from "react";
import { getStripe } from "@/lib/stripe";
import BillingSuccess from "@/components/BillingSuccess/BillingSuccess";

export const metadata = {
  title: "Payment Successful | Coloring Habitat",
};

type SearchParams = Promise<{
  session_id?: string;
}>;

const BillingSuccessContent = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
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
};

export default function BillingSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-8 min-h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <BillingSuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
