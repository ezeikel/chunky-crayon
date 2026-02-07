'use server';

import crypto from 'node:crypto';
import { Readable } from 'stream';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { GenerationType, ColoringImage } from '@chunky-crayon/db';
import generatePDFNode from '@/utils/generatePDFNode';
import streamToBuffer from '@/utils/streamToBuffer';
import fetchSvg from '@/utils/fetchSvg';
import redis, { REDIS_KEYS } from '@/lib/redis';
import DailyColoringEmail from '@/emails/DailyColoringEmail';
import WelcomeEmail from '@/emails/WelcomeEmail';
import PaymentFailedEmail from '@/emails/PaymentFailedEmail';
import SocialDigestEmail from '@/emails/SocialDigestEmail';
import type { SocialDigestEntry } from '@/emails/SocialDigestEmail';
import { stripe } from '@/lib/stripe';
import { getResendFromAddress } from '@/lib/email-config';

export type { SocialDigestEntry };

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function generateUnsubscribeToken(email: string): Promise<string> {
  const token = crypto.randomBytes(24).toString('base64url');
  // Token expires in 1 year
  await redis.set(REDIS_KEYS.UNSUB_TOKEN(token), email, {
    ex: 60 * 60 * 24 * 365,
  });
  return token;
}

async function getUnsubscribeUrl(email: string): Promise<string> {
  const token = await generateUnsubscribeToken(email);
  return `${baseUrl}/unsubscribe?token=${token}`;
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
    // Check if email has unsubscribed
    const isUnsubscribed = await redis.get<boolean>(
      REDIS_KEYS.UNSUB_FLAG(email),
    );
    if (isUnsubscribed) {
      return {
        error: 'This email has previously unsubscribed.',
        success: false,
      };
    }

    // Check if already subscribed
    const isSubscribed = await redis.sismember(REDIS_KEYS.EMAILS_SET, email);
    if (isSubscribed) {
      return {
        success: true,
        email,
      };
    }

    // Add to email set
    await redis.sadd(REDIS_KEYS.EMAILS_SET, email);

    // Store metadata
    const now = Date.now();
    await redis.hset(REDIS_KEYS.EMAIL_META(email), {
      tsJoined: now,
      source: 'coloring_page_footer',
    });

    // Send welcome email
    const unsubscribeUrl = await getUnsubscribeUrl(email);
    const welcomeEmailHtml = await render(WelcomeEmail({ unsubscribeUrl }));

    await resend.emails.send({
      from: getResendFromAddress('no-reply', 'Chunky Crayon'),
      to: email,
      subject: 'Welcome to Chunky Crayon! 🎨',
      html: welcomeEmailHtml,
    });

    return {
      success: true,
      email,
    };
  } catch (error) {
    console.error({ emailListError: error });

    return {
      error: 'Failed to join the email list',
      success: false,
    };
  }
};

export const getEmailListMembers = async (): Promise<string[]> => {
  const emails = await redis.smembers(REDIS_KEYS.EMAILS_SET);
  return emails;
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
    [GenerationType.WEEKLY]: 'Weekly',
    [GenerationType.MONTHLY]: 'Monthly',
    [GenerationType.USER]: 'Custom',
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
    [GenerationType.WEEKLY]: 'Weekly',
    [GenerationType.MONTHLY]: 'Monthly',
    [GenerationType.USER]: 'Custom',
  };

  return `${typeMap[generationType].toLowerCase()}-coloring-page-${dayName}-${day}-${month}.pdf`;
};

const sendSingleColoringEmail = async (
  to: string,
  subject: string,
  filename: string,
  coloringImagePdf: Buffer,
) => {
  const unsubscribeUrl = await getUnsubscribeUrl(to);
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

  // use custom emails if provided, otherwise get from Redis
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

// Send social media digest email
export const sendSocialDigest = async ({
  coloringImageTitle,
  coloringImageUrl,
  svgUrl,
  animationUrl,
  entries,
}: {
  coloringImageTitle: string;
  coloringImageUrl: string;
  svgUrl?: string;
  animationUrl?: string;
  entries: SocialDigestEntry[];
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
        svgUrl,
        animationUrl,
        entries,
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
      subject: `Social Digest - ${dayName} ${day} ${month}`,
      html: emailHtml,
    });

    console.log(`📧 Sent social digest email to: ${digestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send social digest email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
