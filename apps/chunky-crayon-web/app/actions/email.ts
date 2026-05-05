'use server';

import { Readable } from 'stream';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { GenerationType, ColoringImage } from '@one-colored-pixel/db';
import generatePDFNode from '@/utils/generatePDFNode';
import streamToBuffer from '@/utils/streamToBuffer';
import { fetchSvg } from '@one-colored-pixel/canvas';
import { getUnsubscribeUrl } from '@/lib/unsubscribe';
import DailyColoringEmail from '@/emails/DailyColoringEmail';
import WelcomeEmail from '@/emails/WelcomeEmail';
import PaymentFailedEmail from '@/emails/PaymentFailedEmail';
import TrialEndingEmail from '@/emails/TrialEndingEmail';
import SocialDigestEmail from '@/emails/SocialDigestEmail';
import { stripe } from '@/lib/stripe';
import { getResendFromAddress } from '@/lib/email-config';
import {
  readClientMatchData,
  sendLeadConversionEvents,
} from '@/lib/conversion-api';

export type SocialDigestEntry = {
  platform: string;
  caption: string;
  /** Will the cron auto-post this entry today? false = needs manual posting. */
  willAutoPost: boolean;
  assetType: 'image' | 'video';
  assetUrl?: string;
  /** When the cron is scheduled to fire today, in UTC HH:MM. Undefined for
   *  manual-only entries. */
  scheduledTimeUtc?: string;
};

// TODO: Route through Mailtrap on localhost (NODE_ENV === 'development')
// instead of real Resend to avoid spamming inboxes during dev. Apply same
// pattern to CH.
const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';
const audienceId = process.env.RESEND_DAILY_EMAIL_SEGMENT_ID!;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type JoinColoringPageEmailListState = {
  success: boolean;
  error?: unknown;
  email?: string;
};

export const joinColoringPageEmailList = async (
  previousState: JoinColoringPageEmailListState,
  formData: FormData,
): Promise<JoinColoringPageEmailListState> => {
  const rawFormData = {
    email: (formData.get('email') as string) || '',
  };

  const email = normalizeEmail(rawFormData.email);

  try {
    // Check if contact already exists in the audience
    const { data: existing } = await resend.contacts.get({
      audienceId,
      email,
    });

    if (existing) {
      if (existing.unsubscribed) {
        return {
          error: 'This email has previously unsubscribed.',
          success: false,
        };
      }
      // Already subscribed
      return { success: true, email };
    }

    // Create new contact
    const { error: createError } = await resend.contacts.create({
      audienceId,
      email,
    });

    if (createError) {
      console.error({ contactCreateError: createError });
      return { error: 'Failed to join the email list', success: false };
    }

    // Send welcome email
    const unsubscribeUrl = getUnsubscribeUrl(email);
    const welcomeEmailHtml = await render(WelcomeEmail({ unsubscribeUrl }));

    await resend.emails.send({
      from: getResendFromAddress('no-reply', 'Chunky Crayon'),
      to: email,
      subject: 'Welcome to Chunky Crayon! 🎨',
      html: welcomeEmailHtml,
    });

    // Server-side Lead event. Mirrors the browser trackLead fire from
    // JoinColoringPageEmailListForm so Meta still gets the signal when
    // the pixel is blocked (iOS in-app browsers, ad blockers). eventId
    // = email matches the client fire so Meta deduplicates. Fire-and-
    // forget; CAPI failures must never block the signup itself.
    void (async () => {
      try {
        const match = await readClientMatchData();
        await sendLeadConversionEvents({
          email,
          eventId: email,
          contentName: 'Email List Signup',
          contentCategory: 'email_list',
          ...match,
        });
      } catch (err) {
        console.error('[joinColoringPageEmailList] Lead CAPI failed:', err);
      }
    })();

    return { success: true, email };
  } catch (error) {
    console.error({ emailListError: error });

    return {
      error: 'Failed to join the email list',
      success: false,
    };
  }
};

export const getEmailListMembers = async (): Promise<string[]> => {
  const { data } = await resend.contacts.list({ audienceId });

  if (!data?.data) return [];

  return data.data
    .filter((contact) => !contact.unsubscribed)
    .map((contact) => contact.email);
};

// Resend's default rate limit is 2 requests per second
const RESEND_RATE_LIMIT_PER_SECOND = 2;
const RESEND_RATE_LIMIT_DELAY = 1000 / RESEND_RATE_LIMIT_PER_SECOND;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getEmailSubject = (generationType: GenerationType) => {
  const date = new Date();
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: 'Daily',
    [GenerationType.USER]: 'Custom',
    // SYSTEM images (ads, demos) shouldn't reach this email flow, but
    // Record<enum, ...> requires full coverage. Fall back to 'Custom'.
    [GenerationType.SYSTEM]: 'Custom',
  };

  return `${typeMap[generationType]} Coloring Page for ${dayName} ${day} ${month} 🎨`;
};

const getEmailFilename = (generationType: GenerationType) => {
  const date = new Date();
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: 'Daily',
    [GenerationType.USER]: 'Custom',
    [GenerationType.SYSTEM]: 'Custom',
  };

  return `${typeMap[generationType].toLowerCase()}-coloring-page-${dayName}-${day}-${month}.pdf`;
};

const sendSingleColoringEmail = async (
  to: string,
  subject: string,
  filename: string,
  coloringImagePdf: Buffer,
) => {
  const unsubscribeUrl = getUnsubscribeUrl(to);
  const emailHtml = await render(DailyColoringEmail({ unsubscribeUrl }));

  return resend.emails.send({
    from: getResendFromAddress('no-reply', 'Chunky Crayon'),
    to,
    subject,
    html: emailHtml,
    attachments: [
      {
        filename,
        content: coloringImagePdf,
      },
    ],
  });
};

// Separate function to send email for a specific coloring image
export const sendColoringImageEmail = async (
  coloringImage: Partial<ColoringImage>,
  generationType: GenerationType,
  customEmails?: string[],
): Promise<void> => {
  if (!coloringImage.svgUrl || !coloringImage.qrCodeUrl) {
    throw new Error('Coloring image URLs are required for email sending');
  }

  const imageSvg = await fetchSvg(coloringImage.svgUrl);
  const qrCodeSvg = await fetchSvg(coloringImage.qrCodeUrl);

  const pdfStream = await generatePDFNode(coloringImage, imageSvg, qrCodeSvg);

  // convert PDF stream to buffer
  const pdfBuffer = await streamToBuffer(pdfStream as Readable);

  // use custom emails if provided, otherwise get from Resend Contacts
  let emails: string[];

  if (customEmails) {
    emails = customEmails;
  } else {
    emails = await getEmailListMembers();
  }

  const subject = getEmailSubject(generationType);
  const filename = getEmailFilename(generationType);

  // Send emails with rate limiting
  for (let i = 0; i < emails.length; i++) {
    if (i > 0) {
      await sleep(RESEND_RATE_LIMIT_DELAY);
    }

    try {
      await sendSingleColoringEmail(emails[i], subject, filename, pdfBuffer);
      console.log(`📧 Sent coloring email to: ${emails[i]}`);
    } catch (error) {
      console.error(`Failed to send email to ${emails[i]}:`, error);
    }
  }
};

// Send payment failed notification email
export const sendPaymentFailedEmail = async ({
  email,
  userName,
  planName,
  attemptCount,
  stripeCustomerId,
}: {
  email: string;
  userName?: string | null;
  planName: string;
  attemptCount: number;
  stripeCustomerId: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create a billing portal URL for the user to update payment
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account/billing`,
    });

    const emailHtml = await render(
      PaymentFailedEmail({
        userName: userName || undefined,
        planName,
        attemptCount,
        billingPortalUrl: portalSession.url,
      }),
    );

    await resend.emails.send({
      from: getResendFromAddress('billing', 'Chunky Crayon'),
      to: email,
      subject: `Action needed: Your payment couldn't be processed`,
      html: emailHtml,
    });

    console.log(`📧 Sent payment failed email to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send payment failed email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Send the 7-day trial reminder ~24h before the first charge lands.
// Triggered from the Stripe `customer.subscription.trial_will_end`
// webhook (configured to fire 1 day before in stripe-webhook config).
// Includes a billing portal link so the user can cancel in one click.
export const sendTrialEndingEmail = async ({
  email,
  userName,
  planName,
  chargeDate,
  amount,
  stripeCustomerId,
}: {
  email: string;
  userName?: string | null;
  planName: string;
  chargeDate: string;
  amount: string;
  stripeCustomerId: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account/billing`,
    });

    const emailHtml = await render(
      TrialEndingEmail({
        userName: userName || undefined,
        planName,
        chargeDate,
        amount,
        billingPortalUrl: portalSession.url,
      }),
    );

    await resend.emails.send({
      from: getResendFromAddress('billing', 'Chunky Crayon'),
      to: email,
      subject: `Your trial ends tomorrow — ${amount} on ${chargeDate}`,
      html: emailHtml,
    });

    console.log(`📧 Sent trial ending email to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send trial ending email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Send the daily posting brief email.
//
// Renamed from "social digest" — this fires in the morning before posts go out,
// so it's a forward-looking brief of what will post today (and gives you the
// raw assets + captions for anything that needs manual posting), not a recap
// of yesterday. Function name kept as `sendSocialDigest` for back-compat
// with existing callers; the email subject + UI copy are the user-visible
// rename.
export const sendSocialDigest = async ({
  coloringImageTitle,
  coloringImageUrl,
  dailyImageAssetUrl,
  dailyEntries,
  demoReelTitle,
  demoReelUrl,
  demoReelCoverUrl,
  demoReelEntries,
  statReelTitle,
  statReelUrl,
  statReelCoverUrl,
  statReelEntries,
}: {
  coloringImageTitle: string;
  coloringImageUrl: string;
  dailyImageAssetUrl?: string;
  dailyEntries: SocialDigestEntry[];
  demoReelTitle?: string;
  demoReelUrl?: string;
  demoReelCoverUrl?: string;
  demoReelEntries: SocialDigestEntry[];
  statReelTitle?: string;
  statReelUrl?: string;
  statReelCoverUrl?: string;
  statReelEntries?: SocialDigestEntry[];
}): Promise<{ success: boolean; error?: string }> => {
  const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;

  if (!digestEmail) {
    return { success: false, error: 'SOCIAL_DIGEST_EMAIL not configured' };
  }

  try {
    const timestamp = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const emailHtml = await render(
      SocialDigestEmail({
        coloringImageTitle,
        coloringImageUrl,
        dailyImageAssetUrl,
        dailyEntries,
        demoReelTitle,
        demoReelUrl,
        demoReelCoverUrl,
        demoReelEntries,
        statReelTitle,
        statReelUrl,
        statReelCoverUrl,
        statReelEntries,
        timestamp,
      }),
    );

    const date = new Date();
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });

    await resend.emails.send({
      from: getResendFromAddress('no-reply', 'Chunky Crayon'),
      to: digestEmail,
      subject: `Posting Brief - ${dayName} ${day} ${month}`,
      html: emailHtml,
    });

    console.log(`📧 Sent posting brief email to: ${digestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send posting brief email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send an admin alert email when a cron job fails or skips.
 * Uses SOCIAL_DIGEST_EMAIL as the recipient.
 */
export type FeedbackPayload = {
  feedbackType: 'bug' | 'idea' | 'help' | 'other';
  message: string;
  email?: string;
  userName?: string;
  pageUrl?: string;
};

const FEEDBACK_TYPE_LABELS: Record<FeedbackPayload['feedbackType'], string> = {
  bug: '🐛 Bug Report',
  idea: '💡 Feature Request',
  help: '❓ Help Request',
  other: '💬 Other',
};

export const sendFeedbackEmail = async (
  payload: FeedbackPayload,
): Promise<void> => {
  const adminEmail = process.env.SOCIAL_DIGEST_EMAIL;

  if (!adminEmail) {
    console.warn('[Feedback] SOCIAL_DIGEST_EMAIL not configured, skipping');
    return;
  }

  const { feedbackType, message, email, userName, pageUrl } = payload;
  const label = FEEDBACK_TYPE_LABELS[feedbackType];
  const subject = `[CC Feedback] ${label}`;

  const lines = [
    `Type: ${label}`,
    '',
    `Message:`,
    message,
    '',
    userName ? `From: ${userName}` : null,
    email ? `Email: ${email}` : null,
    pageUrl ? `Page: ${pageUrl}` : null,
    '',
    `Sent at: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await resend.emails.send({
      from: getResendFromAddress('feedback', 'Chunky Crayon Feedback'),
      to: adminEmail,
      replyTo: email || undefined,
      subject,
      text: lines,
    });
    console.log(`[Feedback] Sent: ${subject}`);
  } catch (error) {
    console.error('[Feedback] Failed to send:', error);
  }
};

export const sendAdminAlert = async ({
  subject,
  body,
}: {
  subject: string;
  body: string;
}): Promise<void> => {
  const adminEmail = process.env.SOCIAL_DIGEST_EMAIL;

  if (!adminEmail) {
    console.warn(
      '[Admin Alert] SOCIAL_DIGEST_EMAIL not configured, skipping alert',
    );
    return;
  }

  try {
    await resend.emails.send({
      from: getResendFromAddress('alerts', 'Chunky Crayon Alerts'),
      to: adminEmail,
      subject,
      text: body,
    });

    console.log(`[Admin Alert] Sent: ${subject}`);
  } catch (error) {
    // Don't throw — alert failure shouldn't break the calling cron
    console.error('[Admin Alert] Failed to send:', error);
  }
};
