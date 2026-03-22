"use server";

import { Resend } from "resend";
import { render } from "@react-email/components";
import { getStripe } from "@/lib/stripe";
import { getResendFromAddress } from "@/lib/email-config";
import WelcomeEmail from "@/emails/WelcomeEmail";
import PaymentFailedEmail from "@/emails/PaymentFailedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://coloringhabitat.com";

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
