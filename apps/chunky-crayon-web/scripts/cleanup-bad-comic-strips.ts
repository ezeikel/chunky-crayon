import { db } from '@one-colored-pixel/db';
import { del } from '@one-colored-pixel/storage';

const TO_DELETE = [
  'cmousoer600001p6l0bq0auph', // Smudge Drinks The Cloud (READY but bad gag)
  'cmourb6x400006d6lq9marzpt', // The Moon Got Wet (QC_FAILED)
  'cmouqid4700000q6lghayfrm8', // Sunset With Extra Stars (early failure)
];

async function main() {
  for (const id of TO_DELETE) {
    const strip = await db.comicStrip.findUnique({ where: { id } });
    if (!strip) {
      console.log(`[skip] ${id} not found`);
      continue;
    }
    const urls = [
      strip.panel1Url,
      strip.panel2Url,
      strip.panel3Url,
      strip.panel4Url,
      strip.assembledUrl,
    ].filter((u): u is string => !!u);

    for (const url of urls) {
      try {
        await del(url);
        console.log(`[r2 ✓] ${url}`);
      } catch (err) {
        console.warn(
          `[r2 ⚠] ${url}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    await db.comicStrip.delete({ where: { id } });
    console.log(`[db ✓] ${id} ("${strip.title}") deleted`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
