/**
 * One-shot: pull every contact from the legacy Resend audience into
 * the new `email_subscribers` Neon table.
 *
 * Idempotent — re-running skips rows already present (matched on
 * brand + email). Safe to run on dev or prod. Doesn't delete from
 * Resend; the audience stays as a read-only backup until we're
 * confident the new pipeline is solid.
 *
 * Run:
 *   pnpm tsx scripts/backfill-email-subscribers-from-resend.ts            # dry-run summary
 *   pnpm tsx scripts/backfill-email-subscribers-from-resend.ts --apply    # actually write
 *
 * Requires:
 *   RESEND_API_KEY
 *   RESEND_DAILY_EMAIL_SEGMENT_ID
 *   DATABASE_URL (Neon branch you want to load — set per env)
 */
import { Resend } from 'resend';
import { db } from '@one-colored-pixel/db';

const resend = new Resend(process.env.RESEND_API_KEY);
const audienceId = process.env.RESEND_DAILY_EMAIL_SEGMENT_ID;

async function main() {
  const apply = process.argv.includes('--apply');

  if (!audienceId) {
    console.error('RESEND_DAILY_EMAIL_SEGMENT_ID not set');
    process.exit(1);
  }

  console.log(`[backfill-subs] starting${apply ? '' : ' (dry-run)'}…`);
  console.log(`[backfill-subs] audience: ${audienceId}`);

  const { data, error } = await resend.contacts.list({ audienceId });
  if (error) {
    console.error('[backfill-subs] Resend list failed:', error);
    process.exit(1);
  }
  if (!data?.data) {
    console.log('[backfill-subs] no contacts to backfill');
    return;
  }

  const contacts = data.data;
  console.log(`[backfill-subs] ${contacts.length} contacts from Resend`);

  let created = 0;
  let skippedExisting = 0;
  let skippedNoEmail = 0;
  let willUnsubscribe = 0;

  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }

    const existing = await db.emailSubscriber.findUnique({
      where: { brand_email: { brand: 'CHUNKY_CRAYON', email } },
      select: { id: true },
    });

    if (existing) {
      skippedExisting += 1;
      continue;
    }

    if (contact.unsubscribed) willUnsubscribe += 1;

    if (apply) {
      await db.emailSubscriber.create({
        data: {
          brand: 'CHUNKY_CRAYON',
          email,
          source: 'migrate:resend-backfill',
          // Historical Resend contacts all signed up via the daily
          // coloring CTAs (homepage hero, footer, modal). They never
          // had per-list semantics, so default them all to the
          // daily-coloring list. Future signups can multi-list as
          // needed.
          lists: ['daily-coloring'],
          // Preserve the historical opt-out state — if they were
          // already unsubscribed in Resend, mark them as such here
          // too so the signup action keeps refusing re-subs.
          unsubscribedAt: contact.unsubscribed ? new Date() : null,
          // We can't recover the original subscribedAt from the
          // Resend export, so accept "today" as the floor. Doesn't
          // matter for the daily cron, which just iterates whatever's
          // active.
        },
      });
    }
    created += 1;
    if (created % 50 === 0) {
      console.log(
        `[backfill-subs] ${created} ${apply ? 'written' : 'would write'}…`,
      );
    }
  }

  console.log('[backfill-subs] done');
  console.log(`  ${apply ? 'written' : 'would write'}:  ${created}`);
  console.log(`  skipped (already in DB):  ${skippedExisting}`);
  console.log(`  skipped (no email):       ${skippedNoEmail}`);
  console.log(`  of those, unsubscribed:   ${willUnsubscribe}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('[backfill-subs] failed:', err);
  process.exit(1);
});
