#!/usr/bin/env tsx

/**
 * Test email templates by sending to a specific email address
 *
 * Usage: pnpm tsx scripts/test-email-template.ts <email> [template]
 *
 * Templates: welcome, daily (default: welcome)
 */

import { Resend } from 'resend';
import { render } from '@react-email/components';
import * as dotenv from 'dotenv';
import WelcomeEmail from '@/emails/WelcomeEmail';
import DailyColoringEmail from '@/emails/DailyColoringEmail';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const template = args[1] || 'welcome';

  if (!email) {
    console.log(
      'Usage: pnpm tsx scripts/test-email-template.ts <email> [template]',
    );
    console.log('Templates: welcome, daily');
    process.exit(1);
  }

  console.log(`📧 Sending ${template} email to ${email}...`);

  const unsubscribeUrl =
    'https://chunkycrayon.com/unsubscribe?token=test-token';

  let html: string;
  let subject: string;

  if (template === 'daily') {
    html = await render(DailyColoringEmail({ unsubscribeUrl }));
    subject = 'Test: Daily Coloring Page 🎨';
  } else {
    html = await render(WelcomeEmail({ unsubscribeUrl }));
    subject = 'Test: Welcome to Chunky Crayon! 🎨';
  }

  try {
    const result = await resend.emails.send({
      from: 'Chunky Crayon <no-reply@chunkycrayon.com>',
      to: email,
      subject,
      html,
    });

    console.log('✅ Email sent!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

main();
