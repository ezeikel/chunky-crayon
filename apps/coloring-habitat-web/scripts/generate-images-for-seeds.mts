/**
 * Generate actual coloring page images for seeded database records.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/coloring-habitat-web/.env.local pnpm tsx -r dotenv/config apps/coloring-habitat-web/scripts/generate-images-for-seeds.mts [limit]
 */

import { db } from '../../packages/db/src/index.js';

const limit = parseInt(process.argv[2] || '5', 10);

const images = await db.coloringImage.findMany({
  where: {
    brand: 'COLORING_HABITAT',
    url: null,  // Only generate for images without URLs
  },
  select: { id: true, title: true, description: true },
  take: limit,
  orderBy: { createdAt: 'asc' },
});

console.log(`Found ${images.length} images without generated artwork (limit: ${limit})\n`);

if (images.length === 0) {
  console.log('All images already have artwork!');
  process.exit(0);
}

// Call the generate endpoint for each image
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

for (const image of images) {
  console.log(`Generating: ${image.title} (${image.id})`);

  try {
    const response = await fetch(`${baseUrl}/api/coloring-image/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        type: 'DAILY',
        description: image.description,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`  ✓ Generated: ${result.coloringImage?.title || 'success'}`);
    } else {
      const error = await response.text();
      console.log(`  ✗ Failed (${response.status}): ${error.slice(0, 100)}`);
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
  }

  // Small delay between generations to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('\nDone!');
process.exit(0);
