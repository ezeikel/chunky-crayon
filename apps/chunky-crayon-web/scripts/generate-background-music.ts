/**
 * Script to generate ambient sounds for existing coloring images
 *
 * Usage:
 *   pnpm tsx apps/chunky-crayon-web/scripts/generate-background-music.ts [limit]
 *
 * Examples:
 *   pnpm tsx apps/chunky-crayon-web/scripts/generate-background-music.ts       # Process 5 images (default)
 *   pnpm tsx apps/chunky-crayon-web/scripts/generate-background-music.ts 10    # Process 10 images
 *   pnpm tsx apps/chunky-crayon-web/scripts/generate-background-music.ts 0     # Process all images
 */

// Note: Run with dotenv preload:
// DOTENV_CONFIG_PATH=apps/chunky-crayon-web/.env.local pnpm tsx -r dotenv/config apps/chunky-crayon-web/scripts/generate-background-music.ts [limit]

import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';
import { generateBackgroundMusic } from '../lib/elevenlabs';
import { createMusicPrompt } from '../lib/audio/prompts';

// Parse limit from command line args
const limitArg = process.argv[2];
const limit = limitArg === '0' ? undefined : parseInt(limitArg || '5', 10);

async function generateBackgroundMusicForImages() {
  console.log(`\n🎵 Generating ambient sounds for coloring images...\n`);

  // Find images without ambient sounds
  const images = await db.coloringImage.findMany({
    where: { backgroundMusicUrl: null },
    select: { id: true, title: true, description: true, tags: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${images.length} images without ambient sounds\n`);

  if (images.length === 0) {
    console.log('✅ All images already have ambient sounds!');
    return;
  }

  let processed = 0;
  let failed = 0;

  for (const image of images) {
    const index = processed + failed + 1;
    console.log(`[${index}/${images.length}] Processing: "${image.title}"`);

    try {
      // Generate the ambient sound prompt (async — calls Claude)
      const prompt = await createMusicPrompt(
        image.title,
        image.description,
        image.tags,
      );
      console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

      // Generate the ambient sound using ElevenLabs
      const audioBuffer = await generateBackgroundMusic(prompt);
      console.log(`  Generated ${audioBuffer.length} bytes of audio`);

      // Upload to blob storage
      const audioFileName = `uploads/coloring-images/${image.id}/ambient.mp3`;
      const { url: backgroundMusicUrl } = await put(
        audioFileName,
        audioBuffer,
        {
          access: 'public',
          contentType: 'audio/mpeg',
        },
      );
      console.log(`  Uploaded to: ${backgroundMusicUrl}`);

      // Update the database
      await db.coloringImage.update({
        where: { id: image.id },
        data: { backgroundMusicUrl },
      });

      processed++;
      console.log(`  ✅ Done!\n`);
    } catch (error) {
      failed++;
      console.error(
        `  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
      );
    }

    // Add a small delay between requests to avoid rate limiting
    if (index < images.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📝 Remaining: ${198 - processed - failed} (approximate)\n`);
}

// Run the script
generateBackgroundMusicForImages()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
