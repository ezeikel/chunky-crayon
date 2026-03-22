import Link from "next/link";

type BillingSuccessProps = {
  amount: number | null;
  currency: string;
  sessionId?: string;
};

const BillingSuccess = ({
  amount,
  currency,
  sessionId,
}: BillingSuccessProps) => (
  <div className="max-w-lg mx-auto py-16 px-4 text-center">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-green-800 mb-4">
        Thanks for your purchase!
      </h1>
      <p className="text-muted-foreground">
        Your subscription is now active. Your credits have been added to your
        account.
      </p>
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
        Start Coloring
      </Link>
    </div>
  </div>
);

export default BillingSuccess;
