import { db } from '@one-colored-pixel/db';

async function main() {
  const row = await db.comicStrip.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { brand: 'CHUNKY_CRAYON' },
  });
  if (!row) {
    console.log('no strip');
    process.exit(0);
  }
  console.log('id:', row.id);
  console.log('slug:', row.slug);
  console.log('title:', row.title);
  console.log('theme:', row.theme);
  console.log('status:', row.status);
  console.log('caption:', row.caption);
  console.log('panel1Url:', row.panel1Url);
  console.log('panel2Url:', row.panel2Url);
  console.log('panel3Url:', row.panel3Url);
  console.log('panel4Url:', row.panel4Url);
  console.log('assembledUrl:', row.assembledUrl);
  console.log('---script---');
  console.log(JSON.stringify(row.scriptJson, null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
