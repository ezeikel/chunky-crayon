/**
 * Script to generate ambient music for existing coloring images
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/coloring-habitat-web/.env.local \
 *     pnpm tsx -r dotenv/config \
 *     apps/coloring-habitat-web/scripts/generate-ambient-sounds.ts [limit]
 *
 * Examples:
 *   ... generate-ambient-sounds.ts        # Process 5 images (default)
 *   ... generate-ambient-sounds.ts 10     # Process 10 images
 *   ... generate-ambient-sounds.ts 0      # Process all images
 */

import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { Brand } from "@one-colored-pixel/db";
import { generateAmbientSound } from "../lib/elevenlabs";
import { createAmbientPrompt } from "../lib/audio/prompts";

const limitArg = process.argv[2];
const limit = limitArg === "0" ? undefined : parseInt(limitArg || "5", 10);

async function generateAmbientSoundsForImages() {
  console.log(`\n🎵 Generating ambient music for Coloring Habitat images...\n`);

  const images = await db.coloringImage.findMany({
    where: { brand: Brand.COLORING_HABITAT, ambientSoundUrl: null },
    select: { id: true, title: true, description: true, tags: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${images.length} images without ambient music\n`);

  if (images.length === 0) {
    console.log("✅ All images already have ambient music!");
    return;
  }

  let processed = 0;
  let failed = 0;

  for (const image of images) {
    const index = processed + failed + 1;
    console.log(`[${index}/${images.length}] Processing: "${image.title}"`);

    try {
      const prompt = await createAmbientPrompt(
        image.title,
        image.description,
        image.tags,
      );
      console.log(`  Prompt: ${prompt.slice(0, 80)}...`);

      const audioBuffer = await generateAmbientSound(prompt);
      console.log(`  Generated ${audioBuffer.length} bytes of audio`);

      const audioFileName = `uploads/coloring-images/${image.id}/ambient.mp3`;
      const { url: ambientSoundUrl } = await put(audioFileName, audioBuffer, {
        access: "public",
        contentType: "audio/mpeg",
      });
      console.log(`  Uploaded to: ${ambientSoundUrl}`);

      await db.coloringImage.update({
        where: { id: image.id },
        data: { ambientSoundUrl },
      });

      processed++;
      console.log(`  ✅ Done!\n`);
    } catch (error) {
      failed++;
      console.error(
        `  ❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`,
      );
    }

    if (index < images.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ❌ Failed: ${failed}\n`);
}

generateAmbientSoundsForImages()
  .then(() => {
    console.log("Script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
