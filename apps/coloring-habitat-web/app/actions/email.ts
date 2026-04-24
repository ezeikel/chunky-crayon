"use server";

import { Readable } from "stream";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { GenerationType, ColoringImage } from "@one-colored-pixel/db";
import { fetchSvg } from "@one-colored-pixel/canvas";
import { getStripe } from "@/lib/stripe";
import { getResendFromAddress } from "@/lib/email-config";
import { getUnsubscribeUrl } from "@/lib/unsubscribe";
import generatePDFNode from "@/utils/generatePDFNode";
import streamToBuffer from "@/utils/streamToBuffer";
import WelcomeEmail from "@/emails/WelcomeEmail";
import PaymentFailedEmail from "@/emails/PaymentFailedEmail";
import DailyColoringEmail from "@/emails/DailyColoringEmail";

// TODO: Route through Mailtrap on localhost (NODE_ENV === 'development')
// instead of real Resend to avoid spamming inboxes during dev. Apply same
// pattern to CC. See memory/project_mailtrap_todo.md.
const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://coloringhabitat.com";
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
    email: (formData.get("email") as string) || "",
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
          error: "This email has previously unsubscribed.",
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
      return { error: "Failed to join the email list", success: false };
    }

    // Send welcome email
    const welcomeEmailHtml = await render(WelcomeEmail({}));

    await resend.emails.send({
      from: getResendFromAddress("no-reply", "Coloring Habitat"),
      to: email,
      subject: "Welcome to Coloring Habitat",
      html: welcomeEmailHtml,
    });

    return { success: true, email };
  } catch (error) {
    console.error({ emailListError: error });

    return {
      error: "Failed to join the email list",
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
  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: "Daily",
    [GenerationType.USER]: "Custom",
    // SYSTEM images (ads, demos) shouldn't reach this email flow, but
    // Record<enum, ...> requires full coverage. Fall back to 'Custom'.
    [GenerationType.SYSTEM]: "Custom",
  };

  return `Your ${typeMap[generationType]} Coloring Page — ${dayName} ${day} ${month}`;
};

const getEmailFilename = (generationType: GenerationType) => {
  const date = new Date();
  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: "Daily",
    [GenerationType.USER]: "Custom",
    [GenerationType.SYSTEM]: "Custom",
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
    from: getResendFromAddress("no-reply", "Coloring Habitat"),
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

// Send daily coloring image email to all subscribers
export const sendColoringImageEmail = async (
  coloringImage: Partial<ColoringImage>,
  generationType: GenerationType,
  customEmails?: string[],
): Promise<void> => {
  if (!coloringImage.svgUrl || !coloringImage.qrCodeUrl) {
    throw new Error("Coloring image URLs are required for email sending");
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
      console.log(`Sent coloring email to: ${emails[i]}`);
    } catch (error) {
      console.error(`Failed to send email to ${emails[i]}:`, error);
    }
  }
};

/**
 * Send an admin alert email when a cron job fails or skips.
 */
export const sendAdminAlert = async ({
  subject,
  body,
}: {
  subject: string;
  body: string;
}): Promise<void> => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  if (!adminEmail) {
    console.warn(
      "[Admin Alert] ADMIN_ALERT_EMAIL not configured, skipping alert",
    );
    return;
  }

  try {
    await resend.emails.send({
      from: getResendFromAddress("alerts", "Coloring Habitat Alerts"),
      to: adminEmail,
      subject,
      text: body,
    });

    console.log(`[Admin Alert] Sent: ${subject}`);
  } catch (error) {
    // Don't throw — alert failure shouldn't break the calling cron
    console.error("[Admin Alert] Failed to send:", error);
  }
};

// Send welcome email to new users
export const sendWelcomeEmail = async ({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const emailHtml = await render(WelcomeEmail({}));

    await resend.emails.send({
      from: getResendFromAddress("no-reply", "Coloring Habitat"),
      to: email,
      subject: "Welcome to Coloring Habitat!",
      html: emailHtml,
    });

    console.log(`Sent welcome email to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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
    const stripe = getStripe();

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
      from: getResendFromAddress("billing", "Coloring Habitat"),
      to: email,
      subject: `Action needed: Your payment couldn't be processed`,
      html: emailHtml,
    });

    console.log(`Sent payment failed email to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send payment failed email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
