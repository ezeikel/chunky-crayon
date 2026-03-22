"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import UserIdentify from "@/components/UserIdentify";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserIdentify />
      {children}
      <Toaster />
    </SessionProvider>
  );
}
