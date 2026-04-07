import { NextRequest, NextResponse, connection } from "next/server";
import { createColoringImage } from "@/app/actions/coloring-image";
import { GenerationType } from "@one-colored-pixel/db";

export const maxDuration = 300;

/**
 * POST /api/seed/gallery
 *
 * Batch-generates coloring images for gallery seeding.
 * Protected by CRON_SECRET. Each prompt targets a specific category.
 *
 * Body: { batchIndex?: number }
 * - batchIndex 0 (default): first ~17 prompts
 * - batchIndex 1: next ~17 prompts
 * - batchIndex 2: remaining prompts
 *
 * Generates sequentially to avoid overwhelming the image API.
 */

const SEED_PROMPTS = [
  // Mandalas (3)
  "An intricate circular mandala with lotus petals, swirling vines, and geometric nested patterns radiating from the center",
  "A celestial mandala featuring crescent moons, stars, and flowing cosmic waves in a symmetrical design",
  "A nature-inspired mandala with layered leaf patterns, acorns, and woodland ferns in a balanced circular composition",

  // Nature (3)
  "A dense enchanted forest with towering trees, mushroom clusters, hanging moss, and a winding stone path",
  "A detailed botanical garden scene with roses, dahlias, and trailing ivy on an ornate garden trellis",
  "A serene mountain lake surrounded by pine trees, with reflections in the water and wildflowers along the shore",

  // Geometric (3)
  "An Islamic-inspired geometric pattern with interlocking stars, hexagons, and arabesques forming an infinite tessellation",
  "An Art Deco fan pattern with layered arches, sunburst rays, and intricate line work filling each segment",
  "A Celtic knot pattern with woven interlocking bands forming a complex square design with no beginning or end",

  // Landscapes (3)
  "A detailed Japanese garden with a curved bridge over a koi pond, cherry blossoms, stone lanterns, and bamboo",
  "A coastal cliff scene with a lighthouse, crashing waves, seabirds, and wildflowers growing on rocky ledges",
  "A vineyard hillside in Tuscany with rolling grape rows, a stone villa, cypress trees, and distant mountains",

  // Fantasy (3)
  "A majestic phoenix rising from ornate flames, with detailed feathers, swirling fire tendrils, and celestial stars",
  "An enchanted treehouse village connected by rope bridges, with fairy lights, mushroom roofs, and forest creatures",
  "A crystal cave with stalactites, glowing gems, an underground river, and a dragon sleeping on a treasure hoard",

  // Animals (3)
  "A majestic lion portrait with an elaborate mane made of flowing ornamental patterns and tribal-inspired designs",
  "Three koi fish swimming in a circular pattern through lotus flowers, water ripples, and decorative waves",
  "A detailed owl perched on a twisted branch with intricate feather patterns, leaves, and a full moon behind",

  // Architecture (3)
  "A Gothic cathedral interior with ribbed vaulted ceilings, stained glass rose windows, and ornate stone columns",
  "A cozy European village street with half-timbered houses, flower boxes, cobblestones, and a bakery storefront",
  "A Moroccan riad courtyard with intricate tile mosaics, an arched doorway, a fountain, and potted citrus trees",

  // Abstract (3)
  "A flowing abstract composition of swirling waves, spirals, and organic shapes interlocking in a dreamlike pattern",
  "A psychedelic abstract design with paisley teardrops, concentric circles, and detailed zentangle-style fill patterns",
  "An abstract doodle art piece with faces hidden among organic curves, eyes, flowers, and flowing hair",

  // Flowers (3)
  "A bouquet of detailed peonies, roses, and hydrangeas with intricate petals, leaves, and trailing ribbon",
  "A field of sunflowers with detailed seed heads, overlapping leaves, bees, and butterflies in the background",
  "A Victorian botanical illustration of orchids with detailed root systems, stems, and cross-section diagrams",

  // Ocean & Marine (3)
  "An underwater coral reef scene with a sea turtle, angelfish, anemones, seahorses, and swaying kelp forests",
  "A giant octopus with ornately patterned tentacles wrapping around sunken ship ruins and treasure chests",
  "A mermaid sitting on a rock formation surrounded by detailed seashells, starfish, coral, and tropical fish",

  // Patterns & Tiles (3)
  "A Moroccan zellige tile pattern with interlocking geometric stars, diamonds, and floral medallion centers",
  "A Japanese wave pattern (seigaiha) with layered concentric arcs and detailed foam crests filling each wave",
  "A William Morris-style repeating pattern with intertwined acanthus leaves, birds, and strawberry vines",

  // Wildlife (3)
  "A wolf howling at the moon on a mountain ridge with pine trees, stars, and northern lights in the sky",
  "An African savanna scene with an elephant, giraffe, and zebra among acacia trees at golden hour sunset",
  "A red fox curled up in a woodland den with fallen leaves, ferns, mushrooms, and a sleeping squirrel nearby",

  // Mythology (3)
  "A Greek goddess Athena in flowing robes holding a shield and spear, with an owl and olive branches",
  "A Norse world tree Yggdrasil with intertwined roots and branches, connecting nine realms with Viking knot work",
  "A Chinese dragon coiling through clouds, with ornate scales, whiskers, and a pearl clutched in its claw",

  // Steampunk (3)
  "A steampunk airship with brass gears, propellers, riveted hull plates, and a clockwork navigation system",
  "A Victorian inventor's workshop with gear mechanisms, brass telescopes, clockwork automatons, and blueprint sketches",
  "A steampunk-style mechanical hummingbird with visible gears, springs, brass wings, and tiny exhaust pipes",

  // Food & Drink (3)
  "An elaborate afternoon tea spread with tiered cake stands, teapots, macarons, scones, and ornate china patterns",
  "A detailed Italian kitchen scene with pasta hanging to dry, olive oil bottles, garlic braids, and herb bundles",
  "A whimsical candy shop window with jars of sweets, lollipops, cupcakes, and a gingerbread house centerpiece",
];

export async function POST(request: NextRequest) {
  await connection();

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let batchIndex = 0;
  try {
    const body = await request.json();
    batchIndex = body.batchIndex ?? 0;
  } catch {
    // use default
  }

  // Split into batches of ~17 to stay within timeout
  const batchSize = 17;
  const start = batchIndex * batchSize;
  const batch = SEED_PROMPTS.slice(start, start + batchSize);

  if (batch.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No more prompts to process",
      totalPrompts: SEED_PROMPTS.length,
      batchIndex,
    });
  }

  const results: Array<{ prompt: string; success: boolean; error?: string }> =
    [];

  // Generate sequentially to avoid rate limits
  for (const prompt of batch) {
    try {
      const formData = new FormData();
      formData.append("description", prompt);
      formData.append("generationType", GenerationType.DAILY);

      const result = await createColoringImage(formData);

      if ("error" in result) {
        results.push({ prompt, success: false, error: result.error });
      } else {
        results.push({ prompt, success: true });
      }

      // Small delay between generations
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({
        prompt,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    batchIndex,
    totalPrompts: SEED_PROMPTS.length,
    processed: batch.length,
    succeeded,
    failed,
    nextBatchIndex:
      start + batchSize < SEED_PROMPTS.length ? batchIndex + 1 : null,
    results,
  });
}
