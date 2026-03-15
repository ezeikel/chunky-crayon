/**
 * Seed Coloring Habitat with initial coloring images.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=apps/coloring-habitat-web/.env.local pnpm tsx -r dotenv/config apps/coloring-habitat-web/scripts/seed-coloring-images.ts
 *
 * This script generates coloring images using the AI pipeline and stores them
 * in the database with brand: COLORING_HABITAT.
 */

import { db } from "@one-colored-pixel/db";

const SEED_DESCRIPTIONS = [
  // Mandalas
  "An intricate mandala with lotus flower motifs, geometric patterns radiating outward, and delicate filigree details",
  "A celestial mandala featuring crescent moons, stars, and swirling cosmic patterns with fine linework",

  // Nature & Botanicals
  "A dense garden of wildflowers with butterflies, bees, and intricate leaf veins — every petal detailed",
  "A tropical rainforest canopy with exotic birds, hanging vines, and detailed fern fronds",
  "A coral reef underwater scene with seahorses, tropical fish, anemones, and intricate coral structures",

  // Geometric Patterns
  "An Islamic geometric pattern with interlocking stars, hexagons, and arabesques in repeating tessellation",
  "An Art Deco geometric design with fan shapes, chevrons, and sunburst patterns",

  // Landscapes
  "A serene Japanese zen garden with raked sand patterns, stepping stones, a wooden bridge, and a pagoda",
  "A mountain landscape at sunset with pine forests, a winding river, and detailed cloud formations",
  "A cozy European village street with half-timbered houses, flower boxes, cobblestones, and a fountain",

  // Fantasy
  "A dragon perched on a cliff overlooking a medieval castle, with intricate scale patterns and wing membranes",
  "An enchanted forest with mushroom houses, fairy doors in tree trunks, and glowing fireflies",

  // Animals
  "A majestic owl with intricate feather patterns, sitting on a gnarled branch with autumn leaves",
  "A koi pond with three detailed koi fish, lily pads, lotus flowers, and rippling water patterns",
  "An elephant decorated with henna-style patterns, mandalas within its body, surrounded by tropical flowers",

  // Architecture
  "A detailed Gothic cathedral interior with ribbed vaults, rose windows, and ornate column capitals",
  "A Victorian greenhouse filled with exotic plants, iron framework details, and glass panel patterns",

  // Art Nouveau
  "An Art Nouveau woman surrounded by flowing hair, lilies, and organic decorative borders in Mucha style",

  // Abstract
  "A zentangle abstract pattern with waves, spirals, crosshatching, and organic flowing shapes filling the entire page",
  "A psychedelic abstract design with paisley patterns, swirls, eyes, and interconnected organic forms",
];

async function main() {
  console.log(`Seeding ${SEED_DESCRIPTIONS.length} coloring image records...`);

  for (const description of SEED_DESCRIPTIONS) {
    const title = description
      .split(",")[0]
      .replace(/^An?\s+/i, "")
      .trim();

    // Create the database record (image generation happens separately)
    const image = await db.coloringImage.create({
      data: {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description,
        alt: `Adult coloring page: ${title}`,
        tags: extractTags(description),
        difficulty: assignDifficulty(description),
        generationType: "DAILY",
        brand: "COLORING_HABITAT",
      },
    });

    console.log(`  Created: ${image.title} (${image.id})`);
  }

  console.log(
    "\nDone! Run image generation separately to create the actual images.",
  );
}

function extractTags(description: string): string[] {
  const tagMap: Record<string, string[]> = {
    mandala: ["mandala", "geometric", "meditation"],
    garden: ["nature", "botanical", "flowers"],
    forest: ["nature", "trees", "woodland"],
    coral: ["ocean", "underwater", "marine"],
    geometric: ["geometric", "patterns", "abstract"],
    "art deco": ["art-deco", "geometric", "vintage"],
    japanese: ["japanese", "zen", "peaceful"],
    mountain: ["landscape", "nature", "mountain"],
    village: ["architecture", "european", "cozy"],
    dragon: ["fantasy", "mythical", "medieval"],
    enchanted: ["fantasy", "magical", "whimsical"],
    owl: ["animals", "birds", "nature"],
    koi: ["animals", "japanese", "water"],
    elephant: ["animals", "henna", "decorative"],
    cathedral: ["architecture", "gothic", "detailed"],
    greenhouse: ["architecture", "victorian", "botanical"],
    "art nouveau": ["art-nouveau", "decorative", "vintage"],
    zentangle: ["abstract", "zentangle", "patterns"],
    psychedelic: ["abstract", "psychedelic", "patterns"],
  };

  const lower = description.toLowerCase();
  for (const [key, tags] of Object.entries(tagMap)) {
    if (lower.includes(key)) return tags;
  }
  return ["coloring", "adult"];
}

function assignDifficulty(
  description: string,
): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" {
  const lower = description.toLowerCase();
  if (
    lower.includes("intricate") ||
    lower.includes("detailed") ||
    lower.includes("filigree")
  )
    return "ADVANCED";
  if (
    lower.includes("zentangle") ||
    lower.includes("tessellation") ||
    lower.includes("psychedelic")
  )
    return "EXPERT";
  if (
    lower.includes("simple") ||
    lower.includes("flowing") ||
    lower.includes("serene")
  )
    return "BEGINNER";
  return "INTERMEDIATE";
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
