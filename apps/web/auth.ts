import NextAuth from 'next-auth';
import type { NextAuthConfig, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import FacebookProvider from 'next-auth/providers/facebook';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@chunky-crayon/db';
import { getResendFromAddress } from '@/lib/email-config';

type AppleProfile = Profile & {
  user?: {
    firstName?: string;
    lastName?: string;
  };
};

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
    AppleProvider({
      clientId: process.env.AUTH_APPLE_ID as string,
      clientSecret: process.env.AUTH_APPLE_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_APP_ID as string,
      clientSecret: process.env.FACEBOOK_APP_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
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

      if (
        account?.provider === 'google' ||
        account?.provider === 'apple' ||
        account?.provider === 'facebook'
      ) {
        const appleProfile = profile as AppleProfile;
        const existingUser = profile?.email
          ? await db.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          return true;
        }

        let name;

        if (
          account?.provider === 'google' ||
          account?.provider === 'facebook'
        ) {
          name = profile?.name;
        } else if (account?.provider === 'apple' && appleProfile?.user) {
          // Apple only returns the user object this first time the user authorises the app - subsequent authorisations don't return the user object https://stackoverflow.com/questions/63500926/apple-sign-in-authorize-method-returns-name-only-first-time
          name = `${appleProfile.user.firstName} ${appleProfile.user.lastName}`;
        }

        await db.user.create({
          data: {
            email: profile?.email as string,
            name: name as string,
          },
        });

        return true;
      }

      if (account?.provider === 'resend') {
        const userEmail = account.providerAccountId;

        if (!userEmail) return false;

        const existingUser = await db.user.findUnique({
          where: { email: userEmail },
        });

        if (existingUser) {
          return true;
        }

        await db.user.create({
          data: {
            email: userEmail,
          },
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
