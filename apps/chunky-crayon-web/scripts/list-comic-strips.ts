import { db } from '@one-colored-pixel/db';

async function main() {
  const strips = await db.comicStrip.findMany({
    where: { brand: 'CHUNKY_CRAYON' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      panel1Url: true,
      assembledUrl: true,
      createdAt: true,
    },
  });
  for (const s of strips) {
    console.log(
      `${s.id} | ${s.status.padEnd(11)} | ${s.title.slice(0, 40).padEnd(40)} | hasAssets=${!!s.assembledUrl}`,
    );
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
