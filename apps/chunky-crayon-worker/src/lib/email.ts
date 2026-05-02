import { Resend } from "resend";

/**
 * Worker-side admin alerts.
 *
 * Mirrors apps/chunky-crayon-web/app/actions/email.ts:sendAdminAlert.
 * Cron pipelines on the worker are fire-and-forget — Vercel never sees
 * failures, so the worker has to surface them itself. Don't throw on
 * delivery failure; alert failures must not break the calling cron.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.SOCIAL_DIGEST_EMAIL;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const fromAddress = (prefix: string, displayName: string): string =>
  `${displayName} <${prefix}@chunkycrayon.com>`;

export const sendAdminAlert = async ({
  subject,
  body,
}: {
  subject: string;
  body: string;
}): Promise<void> => {
  if (!resend) {
    console.warn(
      "[admin-alert] RESEND_API_KEY not set, skipping alert:",
      subject,
    );
    return;
  }
  if (!ADMIN_EMAIL) {
    console.warn(
      "[admin-alert] SOCIAL_DIGEST_EMAIL not set, skipping alert:",
      subject,
    );
    return;
  }

  try {
    await resend.emails.send({
      from: fromAddress("alerts", "Chunky Crayon Alerts"),
      to: ADMIN_EMAIL,
      subject,
      text: body,
    });
    console.log(`[admin-alert] sent: ${subject}`);
  } catch (err) {
    console.error("[admin-alert] failed to send:", err);
  }
};
