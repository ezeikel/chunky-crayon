import { Resend } from 'resend';
import { GenerationType } from '@prisma/client';
import nodemailer from 'nodemailer';

const isDevelopment = process.env.NODE_ENV === 'development';

const resend = new Resend(process.env.RESEND_API_KEY as string);

const mailtrapTransporter = isDevelopment
  ? nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    })
  : null;

// Resend's default rate limit is 2 requests per second
const RESEND_RATE_LIMIT_PER_SECOND = 2;
const RESEND_RATE_LIMIT_DELAY = 1000 / RESEND_RATE_LIMIT_PER_SECOND;

// Mailtrap free plan is more restrictive - 1 email per 2 seconds to be safe
const MAILTRAP_RATE_LIMIT_PER_SECOND = 0.5;
const MAILTRAP_RATE_LIMIT_DELAY = 1000 / MAILTRAP_RATE_LIMIT_PER_SECOND;

type EmailData = {
  to: string | string[];
  coloringImagePdf: Buffer;
  generationType: GenerationType;
};

const getEmailSubject = (generationType: GenerationType) => {
  const date = new Date();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: 'Daily',
    [GenerationType.WEEKLY]: 'Weekly',
    [GenerationType.MONTHLY]: 'Monthly',
    [GenerationType.USER]: 'Custom',
  };

  return `${typeMap[generationType]} Coloring Image for ${dayName} ${day} ${month}`;
};

const getEmailFilename = (generationType: GenerationType) => {
  const date = new Date();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });

  const typeMap: Record<GenerationType, string> = {
    [GenerationType.DAILY]: 'Daily',
    [GenerationType.WEEKLY]: 'Weekly',
    [GenerationType.MONTHLY]: 'Monthly',
    [GenerationType.USER]: 'Custom',
  };

  return `${typeMap[generationType].toLowerCase()}-coloring-image-${dayName}-${day}-${month}.pdf`;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const sendSingleEmail = async (
  to: string,
  subject: string,
  filename: string,
  coloringImagePdf: Buffer,
) => {
  if (isDevelopment && mailtrapTransporter) {
    console.log(`📧 [MAILTRAP] Sending email to: ${to}`);

    return mailtrapTransporter.sendMail({
      from: 'Chunky Crayon <no-reply@chunkycrayon.com>',
      to,
      subject,
      html: `
        <h2>🎨 ${subject}</h2>
        <p>Here's your latest coloring page!</p>
        <p>Happy coloring! 🖍️</p>
        <p>Visit <a href="https://chunkycrayon.com">chunkycrayon.com</a> for more coloring pages.</p>
      `,
      attachments: [
        {
          filename,
          content: coloringImagePdf,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  return resend.emails.send({
    from: 'Chunky Crayon <no-reply@chunkycrayon.com>',
    to,
    subject,
    text: 'Please find attached the coloring image for today',
    attachments: [
      {
        filename,
        content: coloringImagePdf,
      },
    ],
  });
};

// eslint-disable-next-line import-x/prefer-default-export
export const sendEmail = async ({
  to,
  coloringImagePdf,
  generationType,
}: EmailData) => {
  const subject = getEmailSubject(generationType);
  const filename = getEmailFilename(generationType);

  // if to is a string, use single email send
  if (typeof to === 'string') {
    return sendSingleEmail(to, subject, filename, coloringImagePdf);
  }

  // apply rate limiting based on the email service being used
  const rateLimit = isDevelopment
    ? MAILTRAP_RATE_LIMIT_DELAY
    : RESEND_RATE_LIMIT_DELAY;

  // WORKAROUND: Resend's batch API doesn't support attachments yet
  // https://resend.com/docs/dashboard/emails/attachments
  // Once they add support, we can switch to using resend.batch.send
  return to.reduce<Promise<unknown[]>>(async (promise, recipient, index) => {
    const results = await promise;
    if (index > 0) {
      await sleep(rateLimit);
    }
    const result = await sendSingleEmail(
      recipient,
      subject,
      filename,
      coloringImagePdf,
    );
    return [...results, result];
  }, Promise.resolve([]));
};
