import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SettingsForm from "./SettingsForm";
import { getUserSettings } from "@/app/actions/settings";

export const metadata: Metadata = {
  title: "Settings | Coloring Habitat",
  description: "Manage your Coloring Habitat account settings.",
};

const SettingsContent = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const settings = await getUserSettings();

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notifications.
        </p>
      </div>
      <SettingsForm initialSettings={settings} />
    </>
  );
};

const SettingsPage = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-96 bg-muted animate-pulse rounded" />
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
              </div>
            }
          >
            <SettingsContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SettingsPage;
