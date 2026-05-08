/**
 * One-shot — flip a comic strip's status to POSTED so the Vercel build
 * gets at least one slug for `generateStaticParams`.
 *
 * Use only when the post route can't run (because the deploy that
 * contains it is itself blocked by the missing-POSTED-strip chicken-and-
 * egg). After flipping status, redeploy Vercel; afterwards the post
 * route exists and can be hit normally for the social posts.
 */
import { db } from '@one-colored-pixel/db';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('usage: pnpm tsx scripts/mark-strip-posted.ts <slug>');
    process.exit(1);
  }
  const row = await db.comicStrip.findUnique({ where: { slug } });
  if (!row) {
    console.error(`no strip with slug=${slug}`);
    process.exit(1);
  }
  if (row.status === 'POSTED') {
    console.log(`already POSTED: ${slug}`);
    process.exit(0);
  }
  await db.comicStrip.update({
    where: { slug },
    data: { status: 'POSTED', postedAt: new Date() },
  });
  console.log(
    `flipped status: ${row.status} -> POSTED (slug=${slug}, postedAt=${new Date().toISOString()})`,
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
