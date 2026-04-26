import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@one-colored-pixel/db";
import { getResendFromAddress } from "@/lib/email-config";
import {
  readClientMatchData,
  sendSignupConversionEvents,
} from "@/lib/conversion-api";

const config = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: getResendFromAddress("no-reply", "Coloring Habitat"),
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email }) {
      if (email?.verificationRequest) {
        return true;
      }

      if (account?.provider === "google") {
        const existingUser = profile?.email
          ? await db.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) return true;

        const created = await db.user.create({
          data: {
            email: profile?.email as string,
            name: profile?.name as string,
            brand: "COLORING_HABITAT",
          },
        });

        // Fire CompleteRegistration server-side via Meta/Pinterest CAPI.
        // Browser PixelTracker fires the same event with userId as
        // event_id; Meta deduplicates so we don't double-count. Wrapped
        // in catch so a CAPI outage never blocks the signup itself.
        const hints = await readClientMatchData();
        sendSignupConversionEvents({
          email: created.email!,
          userId: created.id,
          signupMethod: "google",
          ...hints,
        }).catch((err) => {
          console.error("[CAPI] signup conversion failed (google)", err);
        });

        return true;
      }

      if (account?.provider === "resend") {
        const userEmail = account.providerAccountId;
        if (!userEmail) return false;

        const existingUser = await db.user.findUnique({
          where: { email: userEmail },
        });

        if (existingUser) return true;

        const created = await db.user.create({
          data: {
            email: userEmail,
            brand: "COLORING_HABITAT",
          },
        });

        // Fire CompleteRegistration server-side. Same dedup pattern as
        // the google path above.
        const hints = await readClientMatchData();
        sendSignupConversionEvents({
          email: created.email!,
          userId: created.id,
          signupMethod: "email",
          ...hints,
        }).catch((err) => {
          console.error("[CAPI] signup conversion failed (resend)", err);
        });

        return true;
      }

      return false;
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
} satisfies NextAuthConfig;

export const {
  handlers,
  auth,
  signIn,
  signOut,
  // @ts-ignore - Type 'typeof import("next-auth")' has no call signatures
} = NextAuth(config);
