import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { headers } from 'next/headers';
import GoogleProvider from 'next-auth/providers/google';
// TODO: re-enable when Apple/Facebook sign-in is implemented
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from 'next-auth/providers/facebook';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@one-colored-pixel/db';
import { getResendFromAddress } from '@/lib/email-config';
import { sendSignupConversionEvents } from '@/lib/conversion-api';

// Reads the client's IP + UA from the incoming request headers so we
// can pass them to Meta/Pinterest CAPI for better identity matching.
// Headers are only available inside server components / actions / route
// handlers — the NextAuth signIn callback runs in that context, so this
// is safe. Returns nullish strings when unavailable rather than empty
// strings to keep the CAPI payload tidy.
const readClientHints = async () => {
  try {
    const h = await headers();
    return {
      ipAddress:
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        undefined,
      userAgent: h.get('user-agent') || undefined,
    };
  } catch {
    return { ipAddress: undefined, userAgent: undefined };
  }
};

// TODO: re-enable when Apple sign-in is implemented
// type AppleProfile = Profile & {
//   user?: {
//     firstName?: string;
//     lastName?: string;
//   };
// };

const config = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/signin',
    verifyRequest: '/verify-request',
    error: '/auth-error',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    // TODO: re-enable when Apple/Facebook sign-in is implemented
    // AppleProvider({
    //   clientId: process.env.AUTH_APPLE_ID as string,
    //   clientSecret: process.env.AUTH_APPLE_SECRET as string,
    //   allowDangerousEmailAccountLinking: true,
    // }),
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_APP_ID as string,
    //   clientSecret: process.env.FACEBOOK_APP_SECRET as string,
    //   allowDangerousEmailAccountLinking: true,
    // }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: getResendFromAddress('no-reply'),
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user, account, profile, email, credentials }) {
      // handle magic link request
      if (email?.verificationRequest) {
        return true;
      }

      if (account?.provider === 'google') {
        const existingUser = profile?.email
          ? await db.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          return true;
        }

        const created = await db.user.create({
          data: {
            email: profile?.email as string,
            name: profile?.name as string,
          },
        });

        // Fire CompleteRegistration server-side via Meta/Pinterest CAPI.
        // Browser PixelTracker fires the same event with userId as
        // event_id; Meta deduplicates so we don't double-count. Wrapped
        // in catch so a CAPI outage never blocks the signup itself.
        const hints = await readClientHints();
        sendSignupConversionEvents({
          email: created.email!,
          userId: created.id,
          signupMethod: 'google',
          ...hints,
        }).catch((err) => {
          console.error('[CAPI] signup conversion failed (google)', err);
        });

        return true;
      }

      // TODO: re-enable when Apple/Facebook sign-in is implemented
      // if (account?.provider === 'apple') {
      //   const appleProfile = profile as AppleProfile;
      //   const existingUser = profile?.email
      //     ? await db.user.findUnique({ where: { email: profile.email } })
      //     : null;
      //   if (existingUser) return true;
      //   const name = appleProfile?.user
      //     ? `${appleProfile.user.firstName} ${appleProfile.user.lastName}`
      //     : undefined;
      //   await db.user.create({
      //     data: { email: profile?.email as string, name: name as string },
      //   });
      //   return true;
      // }
      //
      // if (account?.provider === 'facebook') {
      //   const existingUser = profile?.email
      //     ? await db.user.findUnique({ where: { email: profile.email } })
      //     : null;
      //   if (existingUser) return true;
      //   await db.user.create({
      //     data: { email: profile?.email as string, name: profile?.name as string },
      //   });
      //   return true;
      // }

      if (account?.provider === 'resend') {
        const userEmail = account.providerAccountId;

        if (!userEmail) return false;

        const existingUser = await db.user.findUnique({
          where: { email: userEmail },
        });

        if (existingUser) {
          return true;
        }

        const created = await db.user.create({
          data: {
            email: userEmail,
          },
        });

        // Fire CompleteRegistration server-side. Same dedup pattern as
        // the google path above.
        const hints = await readClientHints();
        sendSignupConversionEvents({
          email: created.email!,
          userId: created.id,
          signupMethod: 'email',
          ...hints,
        }).catch((err) => {
          console.error('[CAPI] signup conversion failed (resend)', err);
        });

        return true;
      }

      return false;
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
} satisfies NextAuthConfig;

// pass the config to NextAuth
export const {
  handlers,
  auth,
  signIn,
  signOut,
  // @ts-ignore - Type 'typeof import("next-auth")' has no call signatures
} = NextAuth(config);
