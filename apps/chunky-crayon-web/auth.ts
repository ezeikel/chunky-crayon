import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
// TODO: re-enable when Apple/Facebook sign-in is implemented
// import AppleProvider from 'next-auth/providers/apple';
// import FacebookProvider from 'next-auth/providers/facebook';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@one-colored-pixel/db';
import { getResendFromAddress } from '@/lib/email-config';
import {
  readClientMatchData,
  sendSignupConversionEvents,
} from '@/lib/conversion-api';
import { ADMIN_EMAILS } from '@/constants';

// Bootstrap source for `User.role`: anyone whose email is in the
// hardcoded ADMIN_EMAILS constant gets ADMIN on signin (and is demoted
// back to USER if removed from the list). DB role is the runtime source
// of truth thereafter — `requireAdmin()` reads it from the session
// rather than re-checking the constant on every request.
const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email);

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
          // Sync ADMIN_EMAILS membership on every signin so adding/
          // removing an email from the env var takes effect on next
          // login without needing a DB write elsewhere.
          const shouldBeAdmin = isAdminEmail(existingUser.email);
          const isAdmin = existingUser.role === 'ADMIN';
          if (shouldBeAdmin !== isAdmin) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { role: shouldBeAdmin ? 'ADMIN' : 'USER' },
            });
          }
          return true;
        }

        const created = await db.user.create({
          data: {
            email: profile?.email as string,
            name: profile?.name as string,
            role: isAdminEmail(profile?.email as string) ? 'ADMIN' : 'USER',
          },
        });

        // Fire CompleteRegistration server-side via Meta/Pinterest CAPI.
        // Browser PixelTracker fires the same event with userId as
        // event_id; Meta deduplicates so we don't double-count. Wrapped
        // in catch so a CAPI outage never blocks the signup itself.
        // Pull first/last name from the Google profile (given_name /
        // family_name) — extra match keys push Meta's Match Quality
        // from ~6/10 to ~8/10, which materially improves attribution
        // and lookalike audience seeding.
        const hints = await readClientMatchData();
        const googleProfile = profile as
          | { given_name?: string; family_name?: string }
          | undefined;
        sendSignupConversionEvents({
          email: created.email!,
          userId: created.id,
          firstName: googleProfile?.given_name,
          lastName: googleProfile?.family_name,
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
          // Same ADMIN_EMAILS sync as the google branch.
          const shouldBeAdmin = isAdminEmail(existingUser.email);
          const isAdmin = existingUser.role === 'ADMIN';
          if (shouldBeAdmin !== isAdmin) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { role: shouldBeAdmin ? 'ADMIN' : 'USER' },
            });
          }
          return true;
        }

        const created = await db.user.create({
          data: {
            email: userEmail,
            role: isAdminEmail(userEmail) ? 'ADMIN' : 'USER',
          },
        });

        // Fire CompleteRegistration server-side. Same dedup pattern as
        // the google path above.
        const hints = await readClientMatchData();
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
    // Expose `user.role` on the session so server/client code can gate
    // on it without a second DB roundtrip. With session strategy
    // 'database' the `user` arg here is the full DB row, including the
    // `role` column we just added.
    async session({ session, user }) {
      if (session.user) {
        session.user.dbId = user.id;
        session.user.role = (user as { role?: 'USER' | 'ADMIN' }).role;
      }
      return session;
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
