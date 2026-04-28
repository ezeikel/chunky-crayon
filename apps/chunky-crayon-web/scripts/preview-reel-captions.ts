#!/usr/bin/env tsx

/**
 * Pre-generate captions for the 3 V2 demo reels we're about to post,
 * so we can review the AI-generated copy BEFORE going live to social.
 *
 * Run with: pnpm tsx scripts/preview-reel-captions.ts
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

import { db } from '@one-colored-pixel/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generateTikTokCaption,
} from '@/app/actions/social';

const IDS = [
  'cmohqxwzj000004kwjqeidw6a', // Bumblebee — text
  'cmohqz5j2000104kw1uc2c708', // Wildflower — image
  'cmohr0oxp000004jp3c8pvcxu', // Space Bear — voice
];

const main = async () => {
  for (const id of IDS) {
    const image = await db.coloringImage.findUnique({ where: { id } });
    if (!image) {
      console.log(`\n${id}: NOT FOUND\n`);
      continue;
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`${image.title}`);
    console.log(`${id} — variant=${image.demoReelVariant}`);
    console.log('═'.repeat(80));

    const [ig, fb, tt] = await Promise.all([
      generateInstagramCaption(image, 'demo_reel'),
      generateFacebookCaption(image, 'demo_reel'),
      generateTikTokCaption(image, 'demo_reel'),
    ]);

    console.log('\n📷 INSTAGRAM:');
    console.log(ig);
    console.log('\n📘 FACEBOOK:');
    console.log(fb);
    console.log('\n🎵 TIKTOK:');
    console.log(tt);
  }

  await db.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
