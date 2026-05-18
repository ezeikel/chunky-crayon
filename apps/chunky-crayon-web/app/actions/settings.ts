'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { stripe } from '@/lib/stripe';
import { sendEmail } from '@/app/actions/email';
import { getResendFromAddress } from '@/lib/email-config';
import {
  normalizeEmail,
  isValidEmail,
  buildEmailChangeIdentifier,
  parseEmailChangeIdentifier,
  emailChangeIdentifierPrefix,
} from '@/lib/email-change-token';
import { getUserId } from './user';

export const updateShowCommunityImages = async (
  showCommunityImages: boolean,
) => {
  const userId = await getUserId('update settings');

  if (!userId) {
    return { error: 'You must be logged in to update settings.' };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { showCommunityImages },
    });

    revalidatePath('/');
    revalidatePath('/account/settings');

    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { error: 'Failed to update settings.' };
  }
};

export const getUserSettings = async () => {
  const userId = await getUserId('get settings');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      showCommunityImages: true,
    },
  });

  return user;
};

// --- Email change (verified) ---------------------------------------------
//
// Changing the account email is security-sensitive: an unverified change can
// lock the real owner out (typo) or hand the account to an attacker (change
// to an address you don't control). So this is a two-step flow:
//   1. requestEmailChange  -> validates, then emails a one-time link to the
//      NEW address. The change is NOT applied yet.
//   2. confirmEmailChange  -> consumes the token (from the link), re-checks
//      uniqueness, applies the change AND updates the Stripe customer email
//      in lockstep so billing identity never silently desyncs.
//
// No new schema: we reuse NextAuth's existing `VerificationToken` table with
// a namespaced identifier (`email-change:<userId>:<newEmail>`). This keeps
// Option-1 (no migration) intact.

const EMAIL_CHANGE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

export const requestEmailChange = async (newEmailRaw: string) => {
  const userId = await getUserId('change account email');
  if (!userId) {
    return { error: 'You must be logged in to change your email.' };
  }

  const newEmail = normalizeEmail(newEmailRaw ?? '');
  if (!isValidEmail(newEmail)) {
    return { error: 'Please enter a valid email address.' };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    return { error: 'Account not found.' };
  }

  if (user.email && normalizeEmail(user.email) === newEmail) {
    return { error: 'That is already your email address.' };
  }

  // Don't leak whether the target email exists with a distinct message —
  // same generic copy whether taken or not, but still block the change.
  const taken = await db.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (taken) {
    return {
      error:
        'We could not start the change for that address. Try a different one.',
    };
  }

  // One pending change at a time: clear any prior tokens for this user.
  await db.verificationToken.deleteMany({
    where: { identifier: { startsWith: emailChangeIdentifierPrefix(userId) } },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const identifier = buildEmailChangeIdentifier(userId, newEmail);

  await db.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
    },
  });

  const verifyUrl = `${baseUrl}/api/account/verify-email-change?token=${token}&uid=${userId}`;

  const result = await sendEmail({
    to: newEmail,
    from: getResendFromAddress('no-reply', 'Chunky Crayon'),
    subject: 'Confirm your new Chunky Crayon email',
    html: `<p>Hi,</p><p>We received a request to change the email on your Chunky Crayon account to this address. Click the link below within 30 minutes to confirm it.</p><p><a href="${verifyUrl}">Confirm this email address</a></p><p>If you did not request this, you can ignore this email and nothing will change.</p><p>The Chunky Crayon team</p>`,
    text: `We received a request to change the email on your Chunky Crayon account to this address. Confirm it within 30 minutes:\n\n${verifyUrl}\n\nIf you did not request this, ignore this email and nothing will change.\n\nThe Chunky Crayon team`,
  });

  if (!result.success) {
    return { error: 'We could not send the confirmation email. Try again.' };
  }

  return { success: true };
};

// Applies a verified email change. Called by the verify route handler (which
// owns the HTTP/redirect concerns); the real work lives here so it stays a
// reusable, testable server action.
export const confirmEmailChange = async (token: string, userId: string) => {
  if (!token || !userId) {
    return { error: 'Invalid confirmation link.' };
  }

  const record = await db.verificationToken.findFirst({
    where: {
      token,
      identifier: { startsWith: emailChangeIdentifierPrefix(userId) },
    },
  });

  if (!record) {
    return { error: 'This confirmation link is invalid or already used.' };
  }

  // Single-use regardless of outcome below.
  await db.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) {
    return { error: 'This confirmation link has expired. Please try again.' };
  }

  // Re-derive the target email from the token identifier (verifies the
  // prefix + that the token belongs to this user, and that the email is
  // well-formed). See email-change-token.ts for why split-on-':' is safe.
  const parsed = parseEmailChangeIdentifier(record.identifier, userId);
  if (!parsed) {
    return { error: 'This confirmation link is invalid.' };
  }
  const { newEmail } = parsed;

  // Re-check uniqueness at confirm time (someone else may have taken it in
  // the window).
  const taken = await db.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (taken && taken.id !== userId) {
    return {
      error: 'That email address is no longer available.',
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, stripeCustomerId: true },
  });
  if (!user) {
    return { error: 'Account not found.' };
  }

  // Update Stripe FIRST when a customer exists. If Stripe fails we abort
  // before touching our DB, so billing identity can never silently desync
  // (app email changed but Stripe still on the old address -> future
  // webhooks/portal email mismatches). App email is the login identity;
  // Stripe is kept in lockstep where a customer exists.
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.update(user.stripeCustomerId, {
        email: newEmail,
      });
    } catch (error) {
      console.error('Stripe customer email update failed:', error);
      return {
        error:
          'We could not update billing with the new email. Please try again.',
      };
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { email: newEmail, emailVerified: new Date() },
  });

  revalidatePath('/account/settings');
  revalidatePath('/account/billing');

  return { success: true };
};
