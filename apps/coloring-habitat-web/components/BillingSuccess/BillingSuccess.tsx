import Link from "next/link";
import PurchaseTracking from "@/app/[locale]/account/billing/PurchaseTracking";

type BillingSuccessProps = {
  amount: number | null;
  currency: string;
  sessionId?: string;
  productType?: "subscription" | "credits";
  planName?: string;
  creditAmount?: number;
};

const BillingSuccess = ({
  amount,
  currency,
  sessionId,
  productType = "subscription",
  planName,
  creditAmount,
}: BillingSuccessProps) => {
  const headline =
    productType === "subscription"
      ? `You're all set${planName ? `, welcome to ${planName}` : ""}.`
      : `Credits added.`;
  const body =
    productType === "subscription"
      ? "Your subscription is active. Settle in and start colouring."
      : `${creditAmount ?? ""} new credits are ready in your account.`;

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-800 mb-4">{headline}</h1>
        <p className="text-muted-foreground">{body}</p>
        {amount !== null && (
          <p className="text-sm text-muted-foreground mt-2">
            Amount charged:{" "}
            {currency === "gbp" ? "\u00a3" : currency.toUpperCase()}{" "}
            {(amount / 100).toFixed(2)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Link
          href="/account/billing"
          className="inline-block bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Go to Billing
        </Link>
        <Link
          href="/"
          className="text-green-700 hover:text-green-800 font-medium"
        >
          Start Colouring
        </Link>
      </div>
      {amount !== null && sessionId && (
        <PurchaseTracking
          value={amount}
          currency={currency}
          eventId={sessionId}
          productType={productType}
          planName={planName}
          creditAmount={creditAmount}
        />
      )}
    </div>
  );
};

export default BillingSuccess;
