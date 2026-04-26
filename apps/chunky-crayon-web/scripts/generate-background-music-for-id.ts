/**
 * One-off: generate ambient music for a single coloring image by ID.
 * Overwrites any existing backgroundMusicUrl.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/chunky-crayon-web/.env.local \
 *     pnpm tsx -r dotenv/config \
 *     apps/chunky-crayon-web/scripts/generate-background-music-for-id.ts <id>
 */

import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';
import { generateBackgroundMusic } from '../lib/elevenlabs';
import { createMusicPrompt } from '../lib/audio/prompts';

const id = process.argv[2];
if (!id) {
  console.error(
    'Usage: generate-background-music-for-id.ts <coloring-image-id>',
  );
  process.exit(1);
}

async function run() {
  const image = await db.coloringImage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      backgroundMusicUrl: true,
    },
  });

  if (!image) {
    console.error(`Image not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n🎵 "${image.title}"`);
  if (image.backgroundMusicUrl) {
    console.log(`  Existing backgroundMusicUrl: ${image.backgroundMusicUrl}`);
    console.log(`  Overwriting...`);
  }

  const prompt = await createMusicPrompt(
    image.title,
    image.description,
    image.tags,
  );
  console.log(`\nPrompt:\n${prompt}\n`);

  console.time('  generated in');
  const audioBuffer = await generateBackgroundMusic(prompt);
  console.timeEnd('  generated in');
  console.log(`  ${audioBuffer.length} bytes`);

  const audioFileName = `uploads/coloring-images/${image.id}/ambient.mp3`;
  const { url: backgroundMusicUrl } = await put(audioFileName, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });
  console.log(`\n  ↑ ${backgroundMusicUrl}`);

  await db.coloringImage.update({
    where: { id: image.id },
    data: { backgroundMusicUrl },
  });

  console.log(`\n✅ Done\n`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
