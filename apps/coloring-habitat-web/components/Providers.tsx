"use client";

import { SessionProvider } from "next-auth/react";
import { setR2Hosts } from "@one-colored-pixel/coloring-ui";
import { Toaster } from "@/components/ui/sonner";
import UserIdentify from "@/components/UserIdentify";

// Configure R2 hosts for canvas CORS proxy. Matches both the production
// custom domain and the R2 dev public URL so browser fetches stay
// same-origin via the /_r2/* rewrite in next.config.
setR2Hosts([
  "https://assets.coloringhabitat.com",
  "https://pub-6786013d1ffa411aa84ff29f787d7387.r2.dev",
]);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserIdentify />
      {children}
      <Toaster />
    </SessionProvider>
  );
}
