import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@one-colored-pixel/db";
import Billing from "@/components/Billing/Billing";

export const metadata = {
  title: "Billing | Coloring Habitat",
  description: "Manage your Coloring Habitat subscription and credits",
};

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
      subscriptions: {
        select: {
          id: true,
          planName: true,
          status: true,
          currentPeriodEnd: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/signin");
  }

  return <Billing user={user} />;
}
