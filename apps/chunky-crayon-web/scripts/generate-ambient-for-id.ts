/**
 * One-off: generate ambient music for a single coloring image by ID.
 * Overwrites any existing ambientSoundUrl.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/chunky-crayon-web/.env.local \
 *     pnpm tsx -r dotenv/config \
 *     apps/chunky-crayon-web/scripts/generate-ambient-for-id.ts <id>
 */

import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';
import { generateAmbientSound } from '../lib/elevenlabs';
import { createAmbientPrompt } from '../lib/audio/prompts';

const id = process.argv[2];
if (!id) {
  console.error('Usage: generate-ambient-for-id.ts <coloring-image-id>');
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
      ambientSoundUrl: true,
    },
  });

  if (!image) {
    console.error(`Image not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n🎵 "${image.title}"`);
  if (image.ambientSoundUrl) {
    console.log(`  Existing ambientSoundUrl: ${image.ambientSoundUrl}`);
    console.log(`  Overwriting...`);
  }

  const prompt = await createAmbientPrompt(
    image.title,
    image.description,
    image.tags,
  );
  console.log(`\nPrompt:\n${prompt}\n`);

  console.time('  generated in');
  const audioBuffer = await generateAmbientSound(prompt);
  console.timeEnd('  generated in');
  console.log(`  ${audioBuffer.length} bytes`);

  const audioFileName = `uploads/coloring-images/${image.id}/ambient.mp3`;
  const { url: ambientSoundUrl } = await put(audioFileName, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });
  console.log(`\n  ↑ ${ambientSoundUrl}`);

  await db.coloringImage.update({
    where: { id: image.id },
    data: { ambientSoundUrl },
  });

  console.log(`\n✅ Done\n`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
