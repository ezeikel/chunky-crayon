import { db } from '@one-colored-pixel/db';

async function main() {
  const row = await db.comicStrip.findFirst({
    where: { brand: 'CHUNKY_CRAYON' },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, status: true, qcResults: true },
  });
  if (!row) {
    console.log('no strip');
    process.exit(0);
  }
  console.log('slug:', row.slug);
  console.log('status:', row.status);
  console.log('---qcResults---');
  console.log(JSON.stringify(row.qcResults, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
