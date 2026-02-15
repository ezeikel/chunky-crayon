/**
 * One-time migration: Redis email subscribers → Resend Contacts
 *
 * Reads all subscribers from Redis, checks unsub flags, and creates
 * corresponding contacts in the Resend audience.
 *
 * Usage:
 *   cd apps/web
 *   pnpm tsx scripts/migrate-redis-to-resend.ts
 *
 * Requires env vars in .env.local:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 *   RESEND_API_KEY, RESEND_DAILY_EMAIL_SEGMENT_ID
 */

import { Redis } from '@upstash/redis';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const audienceId = process.env.RESEND_DAILY_EMAIL_SEGMENT_ID!;

const REDIS_KEYS = {
  EMAILS_SET: 'coloringlist:emails',
  UNSUB_FLAG: (email: string) => `coloringlist:unsub:${email}`,
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function migrate() {
  console.log('Reading subscribers from Redis...');
  const emails = await redis.smembers(REDIS_KEYS.EMAILS_SET);
  console.log(`Found ${emails.length} emails in Redis\n`);

  let created = 0;
  let skippedUnsub = 0;
  let errors = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    // Check if unsubscribed in Redis
    const isUnsub = await redis.get<boolean>(REDIS_KEYS.UNSUB_FLAG(email));

    // Rate limit: 2 requests/sec (we just made a GET, now we make a POST)
    await sleep(500);

    const { error } = await resend.contacts.create({
      audienceId,
      email,
      unsubscribed: !!isUnsub,
    });

    if (error) {
      console.error(
        `  [${i + 1}/${emails.length}] FAIL ${email}: ${error.message}`,
      );
      errors++;
    } else {
      const status = isUnsub ? '(unsubscribed)' : '';
      console.log(`  [${i + 1}/${emails.length}] OK   ${email} ${status}`);
      if (isUnsub) skippedUnsub++;
      else created++;
    }

    // Extra delay every 10 to stay well within rate limits
    if (i > 0 && i % 10 === 0) {
      await sleep(1000);
    }
  }

  console.log('\nMigration complete!');
  console.log(`  Created (active):      ${created}`);
  console.log(`  Created (unsubscribed): ${skippedUnsub}`);
  console.log(`  Errors:                ${errors}`);
  console.log(`  Total processed:       ${emails.length}`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
