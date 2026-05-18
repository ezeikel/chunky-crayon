'use server';

import { Readable } from 'stream';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { db, GenerationType, ColoringImage } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import {
  EMAIL_LIST,
  DEFAULT_LISTS,
  VALID_LIST_SLUGS,
  type EmailListSlug,
} from '@/lib/email-lists';
import generatePDFNode from '@/utils/generatePDFNode';
import streamToBuffer from '@/utils/streamToBuffer';
import { fetchSvg } from '@one-colored-pixel/canvas';
import { getUnsubscribeUrl } from '@/lib/unsubscribe';
import DailyColoringEmail from '@/emails/DailyColoringEmail';
import { getDailyUpsell, type DailyUpsell } from '@/lib/email-upsell';
import WelcomeEmail from '@/emails/WelcomeEmail';
import MagicLinkEmail from '@/emails/MagicLinkEmail';
import PaymentFailedEmail from '@/emails/PaymentFailedEmail';
import TrialEndingEmail from '@/emails/TrialEndingEmail';
import TrialStartedEmail from '@/emails/TrialStartedEmail';
import SocialDigestEmail from '@/emails/SocialDigestEmail';
import BundlePurchaseEmail from '@/emails/BundlePurchaseEmail';
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

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';
const audienceId = process.env.RESEND_DAILY_EMAIL_SEGMENT_ID!;

/**
 * Build a Mailtrap SMTP transport for local dev. Returns null in prod
 * or when MAILTRAP env vars are missing — callers should fall back to
 * Resend in that case.
 *
 * Mirrors the pattern PTP uses (apps/web/lib/email.ts). New email
 * sends should go through `sendEmail()` below to pick this up
 * automatically. Existing direct `resend.emails.send` calls scattered
 * through this file still hit Resend on localhost — migrate them as
 * we touch them, no big-bang refactor.
 */
const getMailtrapTransport = (): nodemailer.Transporter | null => {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.MAILTRAP_HOST &&
    process.env.MAILTRAP_PORT
  ) {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: parseInt(process.env.MAILTRAP_PORT, 10),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }
  return null;
};

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Pass an explicit From, otherwise getResendFromAddress() default is used. */
  from?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  headers?: Record<string, string>;
};

/**
 * Single send wrapper that auto-routes through Mailtrap on localhost
 * when configured, and Resend in prod. Use this for any new email send;
 * the file's existing direct `resend.emails.send` calls predate this
 * wrapper and will be migrated lazily.
 */
export const sendEmail = async (
  input: SendEmailInput,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const fromAddress = input.from ?? getResendFromAddress('hi', 'Chunky Crayon');

  const mailtrap = getMailtrapTransport();
  if (mailtrap) {
    try {
      const result = await mailtrap.sendMail({
        from: fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        attachments: input.attachments,
        headers: input.headers,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Mailtrap error';
      console.error('[email] mailtrap send failed:', message);
      return { success: false, error: message };
    }
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.headers,
      attachments: input.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
      })),
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Resend error';
    console.error('[email] resend send failed:', message);
    return { success: false, error: message };
  }
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type JoinColoringPageEmailListState = {
  success: boolean;
  error?: unknown;
  email?: string;
};

/**
 * Add an email to the daily-coloring list.
 *
 * Storage moved off Resend Audiences in May 2026 — the free-tier 3K
 * contact cap was a silly thing to pay for given we only need a list
 * to iterate at send time, and Resend's per-email `emails.send` (used
 * by the daily cron) doesn't care where the list lives. Subscribers
 * now live in our own `email_subscribers` Neon table; the daily cron
 * reads from there.
 *
 * Behaviour preserved from the Resend-Audience era:
 *   - Re-subscribing an active subscriber: no-op, return success.
 *   - Re-subscribing a previously-unsubscribed contact: refuse with a
 *     friendly error (we honour their previous opt-out).
 *   - First-time signup: create row, send welcome email, fire Meta
 *     Lead CAPI.
 *
 * The `source` form field is optional and free-form — landing pages,
 * modals, footer, etc. all pass their own identifier so we can attribute
 * which surface converts best (`email_subscribers.source` / `.sourceSlug`).
 */
export const joinColoringPageEmailList = async (
  previousState: JoinColoringPageEmailListState,
  formData: FormData,
): Promise<JoinColoringPageEmailListState> => {
  const rawEmail = (formData.get('email') as string) || '';
  const rawSource = (formData.get('source') as string) || '';
  const rawSourceSlug = (formData.get('sourceSlug') as string) || '';
  // `lists` arrives as a comma-separated string from the hidden input
  // so a single field can express multi-list signups ("subscribe me to
  // daily + bundles announcements from this footer form"). Defaults to
  // DEFAULT_LISTS when absent. Every slug is validated against
  // VALID_LIST_SLUGS — never trust raw form input.
  const rawLists = (formData.get('lists') as string) || '';

  const email = normalizeEmail(rawEmail);
  const source = rawSource.trim().slice(0, 80) || null;
  const sourceSlug = rawSourceSlug.trim().slice(0, 120) || null;

  const requestedLists = rawLists
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const validLists =
    requestedLists.length > 0
      ? (requestedLists.filter((s) =>
          VALID_LIST_SLUGS.has(s),
        ) as EmailListSlug[])
      : (DEFAULT_LISTS as readonly EmailListSlug[]);
  // Guarantee at least one list — caller may have passed garbage.
  const finalLists =
    validLists.length > 0
      ? validLists
      : (DEFAULT_LISTS as readonly EmailListSlug[]);

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email.', success: false };
  }

  try {
    // Look up existing row (any status).
    const existing = await db.emailSubscriber.findUnique({
      where: { brand_email: { brand: BRAND, email } },
      select: { id: true, unsubscribedAt: true, lists: true },
    });

    if (existing) {
      if (existing.unsubscribedAt) {
        // Honour the previous opt-out. Asking us to opt them back in
        // requires more than re-submitting the form — they have to
        // explicitly re-subscribe via a separate flow we haven't built
        // yet. For now, surface the same error the Resend-era code did.
        return {
          error: 'This email has previously unsubscribed.',
          success: false,
        };
      }
      // Already active. Merge new list slugs into the existing array
      // so a daily-coloring subscriber who later opts into bundles-
      // announce via a different form actually gets both. Idempotent —
      // duplicate slugs filtered out.
      const merged = Array.from(new Set([...existing.lists, ...finalLists]));
      if (merged.length !== existing.lists.length) {
        await db.emailSubscriber.update({
          where: { brand_email: { brand: BRAND, email } },
          data: { lists: merged },
        });
      }
      return { success: true, email };
    }

    // First-time signup.
    let welcomeEmailId: string | null = null;
    // Only send the welcome email if they signed up for the daily list.
    // A pure bundles-announce signup (no daily-coloring) shouldn't get
    // the "welcome to daily coloring!" welcome — that'd be misleading.
    const shouldSendWelcome = finalLists.includes(EMAIL_LIST.DAILY_COLORING);
    if (shouldSendWelcome) {
      try {
        const unsubscribeUrl = getUnsubscribeUrl(email);
        const welcomeEmailHtml = await render(WelcomeEmail({ unsubscribeUrl }));
        const sendResult = await resend.emails.send({
          from: getResendFromAddress('no-reply', 'Chunky Crayon'),
          to: email,
          subject: 'Welcome to Chunky Crayon! 🎨',
          html: welcomeEmailHtml,
        });
        welcomeEmailId = sendResult.data?.id ?? null;
      } catch (err) {
        // Welcome email failure shouldn't block the signup itself.
        // Subscriber row gets created anyway; the daily cron is the
        // primary value-delivery channel, not the welcome.
        console.error('[joinColoringPageEmailList] welcome email failed:', err);
      }
    }

    await db.emailSubscriber.create({
      data: {
        brand: BRAND,
        email,
        source,
        sourceSlug,
        lists: [...finalLists],
        welcomeEmailId,
      },
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

/**
 * List active subscribers for a given list slug.
 *
 * Reads from our `email_subscribers` Neon table (post-2026-05 migration
 * off Resend Audiences). Filters by:
 *   - brand (so CC + CH don't bleed)
 *   - nuclear unsubscribe (`unsubscribedAt IS NULL`)
 *   - per-list membership (`listSlug = ANY(lists)`)
 *
 * Default `listSlug` is the daily-coloring list, preserving the
 * pre-multi-list behaviour for the daily cron.
 */
export const getEmailListMembers = async (
  listSlug: EmailListSlug = EMAIL_LIST.DAILY_COLORING,
): Promise<string[]> => {
  const rows = await db.emailSubscriber.findMany({
    where: {
      brand: BRAND,
      unsubscribedAt: null,
      lists: { has: listSlug },
    },
    select: { email: true },
    orderBy: { subscribedAt: 'asc' },
  });
  return rows.map((row) => row.email);
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
    // SYSTEM (ads, demos) and COMMENT_REQUEST (delivered via IG/FB DM)
    // shouldn't reach this email flow, but Record<enum, ...> requires
    // full coverage. Fall back to 'Custom'.
    [GenerationType.SYSTEM]: 'Custom',
    [GenerationType.COMMENT_REQUEST]: 'Custom',
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
    [GenerationType.COMMENT_REQUEST]: 'Custom',
  };

  return `${typeMap[generationType].toLowerCase()}-coloring-page-${dayName}-${day}-${month}.pdf`;
};

const sendSingleColoringEmail = async (
  to: string,
  subject: string,
  filename: string,
  coloringImagePdf: Buffer,
  upsell?: DailyUpsell,
) => {
  const unsubscribeUrl = getUnsubscribeUrl(to);
  const emailHtml = await render(
    DailyColoringEmail({ unsubscribeUrl, upsell }),
  );

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

  // Resolve today's upsell variant once and reuse for every recipient.
  // The variant is day-of-week based (see lib/email-upsell.ts), so
  // it's identical for every subscriber in this batch. Bundle variants
  // additionally need a DB lookup to fill in the runtime fields
  // (name, tagline, price, slug → URL).
  const upsell = await resolveDailyUpsell();

  // Send emails with rate limiting
  for (let i = 0; i < emails.length; i++) {
    if (i > 0) {
      await sleep(RESEND_RATE_LIMIT_DELAY);
    }

    try {
      await sendSingleColoringEmail(
        emails[i],
        subject,
        filename,
        pdfBuffer,
        upsell,
      );
      console.log(`📧 Sent coloring email to: ${emails[i]}`);
    } catch (error) {
      console.error(`Failed to send email to ${emails[i]}:`, error);
    }
  }
};

/**
 * Resolve today's daily-email upsell variant. Pure variants (subscription,
 * app, share, comic-strip) are returned as-is from getDailyUpsell().
 * Bundle variants need a DB lookup to fill in the runtime fields —
 * picks the latest published CC bundle. If no bundle is published,
 * returns the variant with empty bundle fields so the email template
 * falls back to its generic CTA.
 */
const resolveDailyUpsell = async (): Promise<DailyUpsell> => {
  const variant = getDailyUpsell();

  if (variant.kind !== 'bundle') return variant;

  try {
    const bundle = await db.bundle.findFirst({
      where: { brand: 'CHUNKY_CRAYON', published: true },
      select: {
        slug: true,
        name: true,
        tagline: true,
        pricePence: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!bundle) return variant;

    const ctaUrl = `${baseUrl}/products/digital/${bundle.slug}?utm_source=daily-email&utm_medium=email&utm_campaign=upsell-bundle-${bundle.slug}`;
    // Default to GBP display since this list is UK-skewed. The product
    // page itself geo-detects so the click-through shows correct
    // currency at checkout. pricePence is in 1/100ths (GBP minor units).
    const bundlePriceDisplay = bundle.pricePence
      ? `£${(bundle.pricePence / 100).toFixed(2)}`
      : undefined;

    return {
      ...variant,
      bundleSlug: bundle.slug,
      bundleName: bundle.name,
      bundleTagline: bundle.tagline,
      bundlePriceDisplay,
      ctaUrl,
    };
  } catch (err) {
    console.error('[daily-email] bundle lookup failed:', err);
    return variant;
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

// Send the subscription-welcome / activation email once, immediately
// after a Stripe subscription is created (checkout.session.completed).
// Its job is activation: get the new subscriber to make their first
// coloring page. Trial-aware: pass chargeDate/amount when on the
// 7-day trial so the copy states the real first charge up front.
// No billing-portal link here (this is an activation email, not a
// billing one); the later TrialEndingEmail owns the cancel CTA.
export const sendTrialStartedEmail = async ({
  email,
  userName,
  planName,
  credits,
  isTrialing,
  chargeDate,
  amount,
}: {
  email: string;
  userName?: string | null;
  planName: string;
  credits: number;
  isTrialing: boolean;
  chargeDate?: string;
  amount?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const emailHtml = await render(
      TrialStartedEmail({
        userName: userName || undefined,
        planName,
        credits,
        isTrialing,
        chargeDate,
        amount,
      }),
    );

    await resend.emails.send({
      from: getResendFromAddress('no-reply', 'Chunky Crayon'),
      to: email,
      subject: isTrialing
        ? 'Your Chunky Crayon trial is live 🎨'
        : 'Welcome to Chunky Crayon 🎨',
      html: emailHtml,
    });

    console.log(`📧 Sent trial started email to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send trial started email to ${email}:`, error);
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
  blogTitle,
  blogExcerpt,
  blogImageUrl,
  blogUrl,
  coloringImageTitle,
  coloringImageUrl,
  dailyImageAssetUrl,
  dailyEntries,
  demoReelTitle,
  demoReelUrl,
  demoReelCoverUrl,
  demoReelEntries,
  contentReel,
  comicStrip,
  pipelineStatus,
}: {
  blogTitle?: string;
  blogExcerpt?: string;
  blogImageUrl?: string;
  blogUrl?: string;
  coloringImageTitle: string;
  coloringImageUrl: string;
  dailyImageAssetUrl?: string;
  dailyEntries: SocialDigestEntry[];
  demoReelTitle?: string;
  demoReelUrl?: string;
  demoReelCoverUrl?: string;
  demoReelEntries: SocialDigestEntry[];
  contentReel?: {
    id: string;
    kind: 'STAT' | 'FACT' | 'TIP' | 'MYTH';
    hook: string;
    sourceTitle?: string;
    sourceUrl?: string;
    reelUrl?: string;
    coverUrl?: string;
    /**
     * Per-platform entries (caption + scheduled UTC fire time + manual
     * flag). TikTok rows always carry willAutoPost=false because we post
     * TikTok manually via this brief; the rest auto-fire from the
     * /api/social/content-reel-post crons.
     */
    entries?: SocialDigestEntry[];
  };
  /**
   * Weekly 4-panel comic strip — Sunday-only generation, posts later
   * Sunday afternoon. Optional: brief omits the section if no strip
   * exists in the past 7 days.
   */
  comicStrip?: {
    id: string;
    title: string;
    theme: string;
    /** R2 URL of the 2x2 assembled strip — primary asset. */
    assembledUrl?: string;
    /** Individual panel URLs — exposed for download (TikTok manual carousel). */
    panel1Url?: string;
    panel2Url?: string;
    panel3Url?: string;
    panel4Url?: string;
    /**
     * Per-platform entries. TikTok always renders as manual (we post
     * TikTok comic carousels by hand from this brief).
     */
    entries?: SocialDigestEntry[];
  };
  /**
   * Pipeline status panel rendered at the top of the brief — one
   * entry per content section. Replaces per-cron admin-alert emails;
   * partial-failure days are visible inline instead of arriving as
   * a separate "X cron skipped" email at 1am.
   */
  pipelineStatus?: Array<{
    label: string;
    status: 'ok' | 'missing' | 'skipped';
    note?: string;
  }>;
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
        blogTitle,
        blogExcerpt,
        blogImageUrl,
        blogUrl,
        coloringImageTitle,
        coloringImageUrl,
        dailyImageAssetUrl,
        dailyEntries,
        demoReelTitle,
        demoReelUrl,
        demoReelCoverUrl,
        demoReelEntries,
        contentReel,
        comicStrip,
        pipelineStatus,
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
  // PostHog distinct_id of the submitter. The typed `email` often differs
  // from the account/billing email; this is the stable handle support uses
  // to pivot to the real person + Stripe customer in PostHog.
  distinctId?: string;
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

  const { feedbackType, message, email, userName, pageUrl, distinctId } =
    payload;
  const label = FEEDBACK_TYPE_LABELS[feedbackType];
  const subject = `[CC Feedback] ${label}`;

  const lines = [
    `Type: ${label}`,
    '',
    `Message:`,
    message,
    '',
    userName ? `From: ${userName}` : null,
    email ? `Email (as typed, may differ from billing): ${email}` : null,
    pageUrl ? `Page: ${pageUrl}` : null,
    distinctId ? `PostHog person: ${distinctId}` : null,
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

export const sendBundlePurchaseEmail = async ({
  to,
  buyerName,
  bundleName,
  bundleSlug,
  bundleTagline,
  pageCount,
  priceDisplay,
  coverImageUrl,
  downloadUrl,
}: {
  to: string;
  buyerName?: string;
  bundleName: string;
  bundleSlug: string;
  bundleTagline: string;
  pageCount: number;
  priceDisplay: string;
  coverImageUrl: string;
  downloadUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const productPageUrl = `${baseUrl}/products/digital/${bundleSlug}`;

  const html = await render(
    BundlePurchaseEmail({
      buyerName,
      bundleName,
      bundleTagline,
      pageCount,
      priceDisplay,
      coverImageUrl,
      downloadUrl,
      productPageUrl,
    }),
  );
  const text = await render(
    BundlePurchaseEmail({
      buyerName,
      bundleName,
      bundleTagline,
      pageCount,
      priceDisplay,
      coverImageUrl,
      downloadUrl,
      productPageUrl,
    }),
    { plainText: true },
  );

  return sendEmail({
    to,
    subject: `Your ${bundleName} bundle is ready!`,
    html,
    text,
  });
};

/**
 * Send the branded magic-link sign-in email.
 *
 * Called from `auth.ts` via the Resend provider's `sendVerificationRequest`
 * override. Replaces Auth.js's stock "Sign in to {host}" HTML, which was
 * a brutal first impression for a kids' coloring brand.
 */
export const sendMagicLinkEmail = async (
  to: string,
  magicLink: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const html = await render(MagicLinkEmail({ magicLink }));
  const text = await render(MagicLinkEmail({ magicLink }), { plainText: true });

  return sendEmail({
    to,
    from: getResendFromAddress('no-reply', 'Chunky Crayon'),
    subject: 'Sign in to Chunky Crayon',
    html,
    text,
  });
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
