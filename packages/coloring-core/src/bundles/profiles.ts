/**
 * Bundle hero profiles — internal source of truth for character identity.
 *
 * Each bundle has a small cast of recurring hero characters (3-4 typical).
 * Profiles drive:
 *   - Reference-image generation (the per-character ref prompts)
 *   - Page generation (which heroes to feed in as conditioning refs per page)
 *   - QA gate (signature-detail checks per page — "does Rex still have his
 *     headphones?")
 *
 * Names are internal. We can surface them on the product page later if we
 * want, but the page line art itself stays text-free.
 *
 * When adding a new bundle, copy the DinoDanceParty pattern:
 *   1. Define 3-4 heroes with internal name + species + signature details
 *   2. Write the per-character reference-sheet prompt (used to generate the
 *      ref image once)
 *   3. Map each of the 10 page numbers to the heroes that appear on it
 */

export type Hero = {
  /** Internal id, kebab-case. Used in R2 paths and ref filenames. */
  id: string;
  /** Internal display name (Rex, Spike, Zip, Dots). Not user-facing yet. */
  name: string;
  /** Species, used in QA checks. */
  species: string;
  /**
   * The non-negotiable details that define this character. QA gate checks
   * each one is visible and recognisable on every page the hero appears on.
   * Keep concise — these become checkbox items in the QA prompt.
   */
  signatureDetails: readonly string[];
  /**
   * Reference-sheet prompt fed to gpt-image-2 once to generate this hero's
   * canonical reference image. Output is reused as conditioning for every
   * page the hero appears on.
   */
  referenceSheetPrompt: string;
};

export type HeroBundle = {
  /** Bundle slug (matches Prisma Bundle.slug). */
  slug: string;
  /** Internal cast roster. */
  heroes: readonly Hero[];
  /**
   * For each page (1-indexed), which hero ids appear. Heroes drive
   * conditioning refs at generation time and signature-detail checks at QA
   * time. An empty array means the page is incidentals-only and uses brand
   * style refs alone.
   */
  pageCast: Readonly<Record<number, readonly string[]>>;
  /**
   * Page-by-page scene prompts, 1-indexed (pagePrompts[0] = page 1).
   * Fed to gpt-image-2 along with hero conditioning refs at generation
   * time. Scene-only — the brand style block + character continuity hints
   * are appended by the generation pipeline.
   */
  pagePrompts: readonly string[];
};

export const DINO_DANCE_PARTY: HeroBundle = {
  slug: "dino-dance-party",
  heroes: [
    {
      id: "rex",
      name: "Rex",
      species: "T-rex",
      signatureDetails: [
        "oversized round headphones with a thick band over the head",
        "big rounded snout, slightly upturned",
        "three small rounded ridge-bumps along the back",
        "thick tail with two stripe-bands near the tip",
        "stubby T-rex arms with three rounded fingers",
      ],
      referenceSheetPrompt: `A friendly cartoon T-rex character standing centered on a plain white background, facing slightly to the side in a relaxed pose. Big rounded snout with a happy half-smile, wide eyes with chunky pupils, three small rounded ridge-bumps along the back. Wearing oversized round headphones with a thick band over the head, like a DJ. Stubby T-rex arms with three rounded fingers, sturdy legs with three toes, thick tail with two stripe-bands near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
    },
    {
      id: "spike",
      name: "Spike",
      species: "Stegosaurus",
      signatureDetails: [
        "six heart-shaped back plates running down the spine",
        "round body with a small round head",
        "thick tail with two rounded soft-edge spikes near the tip",
        "stubby legs with three rounded toes",
      ],
      referenceSheetPrompt: `A friendly cartoon stegosaurus character standing centered on a plain white background, facing slightly to the side. Round body, small round head with a gentle smile, six heart-shaped back plates running down the spine and getting smaller toward the tail. Stubby legs with three rounded toes each, thick tail with two rounded soft-edge spikes near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
    },
    {
      id: "zip",
      name: "Zip",
      species: "Velociraptor",
      signatureDetails: [
        "small tuft of three rounded feathers on top of the head",
        "two thick striped wrist bands, one on each arm",
        "slim two-legged body with a long whippy tail",
        "pointy snout with one small visible tooth",
      ],
      referenceSheetPrompt: `A friendly cartoon velociraptor character standing centered on a plain white background, facing slightly to the side. Slim two-legged body in a relaxed pose, pointy snout with a cheeky grin showing one small tooth, wide eye with a chunky pupil. A small tuft of three rounded feathers on top of the head, like a punk crest. Two striped wrist bands are required — one on each arm — drawn as thick wide bands with three or four horizontal stripes, clearly visible at each wrist. Long whippy tail with a slight curl at the tip. Three-fingered hands, three-toed feet. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
    },
    {
      id: "dots",
      name: "Dots",
      species: "Ankylosaurus",
      signatureDetails: [
        "smooth dome of armor with no spiky scales along the edge",
        "big round polka-dot spots scattered across the armor",
        "soft rounded ball-shaped tail club",
        "four stubby legs with three round toes each",
      ],
      referenceSheetPrompt: `A friendly cartoon ankylosaurus dinosaur character standing centered on a plain white background in profile view, facing slightly toward the viewer. This is a DINOSAUR, not a turtle and not a tortoise. Dinosaur head shape clearly visible at the front: a low-slung snout with wide nostrils, big friendly eye, small horn nubs at the back of the head. Body posture is low and wide on four clearly visible stubby legs, each with three round toes. The back is covered in a smooth dome of armor — the armor edge is a single smooth curved line all the way around the back, with no spiky scales or triangular plates. Big round polka-dot spots scattered evenly across the armor. The tail extends out behind the body and ends in a soft rounded ball-shaped club at the very tip. Gentle smile. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
    },
  ],
  pageCast: {
    1: ["rex"],
    2: ["spike"],
    3: ["zip"],
    4: [],
    5: [],
    6: [],
    7: ["rex", "zip"],
    8: ["spike"],
    9: ["dots", "spike"],
    10: ["rex", "zip"],
  },
  // Pages 9-10 split per the spike: 4-character ensembles broke down in
  // gpt-image-2 even with 16 refs. ≤2 heroes per page is the safe ceiling.
  // Page 9 = Dots joins (Spike welcomes). Page 10 = Rex + Zip DJ finale.
  // Pages 4-6 are deliberately incidentals-only — supporting cast (baby
  // triceratops, brachiosaurus, pterodactyl) appears once each so kids
  // don't get fatigued seeing only the hero quartet across all 10 pages.
  pagePrompts: [
    // page 1
    "A friendly cartoon T-rex standing facing the viewer in a jungle clearing, wearing oversized headphones, both stubby T-rex arms raised up in front of his chest with both hands clearly visible (each hand showing its rounded fingers separately), mouth wide open in a happy roar, palm trees behind",
    // page 2
    "A friendly cartoon stegosaurus standing in a 3/4 angle view (slightly facing the viewer with body turned to show the back), all six heart-shaped back plates clearly visible across the spine in heart-shape silhouette, dancing on a flat rock stage, two baby pterodactyls clapping in the sky behind",
    // page 3
    "A cheeky velociraptor breakdancing on its claws, one foot spinning, palm leaves and bananas flying around it",
    // page 4
    "A baby triceratops practicing dance moves with balloons tied to its three horns",
    // page 5
    "A long-necked brachiosaurus stretching its neck up to reach the highest dance trophy on a shelf",
    // page 6
    "A pterodactyl flying through a rainbow while holding disco balls in its claws",
    // page 7
    "Two friendly cartoon dinosaurs performing a duet on a small rock stage. On the LEFT: a T-rex facing the viewer wearing oversized round headphones, both stubby T-rex arms raised holding two drumsticks above a small bone-drum kit, both arms fully extended forward (NOT held against the body). On the RIGHT: a velociraptor facing the viewer with a small punk-feather tuft on its head, ONE arm raised straight up high above its head holding a microphone (this raised arm clearly shows the wrist with its striped band), the OTHER arm down by its side (this arm also shows the wrist with its striped band). Both wrist bands MUST be clearly visible — they are wide horizontal stripes drawn at each wrist. Simple jungle backdrop, music notes floating around. Both characters fully visible, no overlap.",
    "A friendly cartoon stegosaurus alone in the foreground in a 3/4 angle view (body turned to show the back), all six clearly heart-shaped back plates visible down the spine — these plates have the distinctive heart silhouette (rounded top with V-notch), NOT round and NOT polka-dot spots. The body has plain skin with NO spots, NO polka dots — just heart-shaped plates on the back. Stegosaurus is dancing on its hind legs in a celebratory pose in front of a plain cone-shaped volcano that's gently erupting heart-shaped confetti into the sky. The volcano is just a plain landscape volcano — NO face on the volcano, NO eyes, NO mouth, NO smile — it is not a character, just a normal mountain shape. Stegosaurus is the only character on this page.",
    // page 9 (was previously the shy ankylosaurus joining; now the Dots+Spike scene leading into finale)
    "Two friendly cartoon dinosaurs side by side on a flat rock stage. On the LEFT: an ankylosaurus in a 3/4 angle view (body turned to show the back), smooth dome of armor with big round polka-dot spots clearly visible, a few star-shaped glow stickers stuck on the dotted armor, soft rounded tail club, looking happy. On the RIGHT: a stegosaurus in a 3/4 angle view (body turned to show the back), all heart-shaped back plates clearly visible across the spine, both front legs raised cheering. Both characters fully visible, no overlap, dancing-in-celebration mood.",
    // page 10 (split-finale: Rex DJing + Zip dancing on a tall rock under a starry sky)
    "An epic finale scene of a dinosaur dance party at midnight on top of a TALL DRAMATIC ROCK PEAK silhouetted against a starry night sky filled with fireworks of music notes, swirling confetti, and constellations. On the LEFT atop the peak: a T-rex facing the viewer wearing oversized round headphones, both stubby T-rex arms raised up high above his head in a triumphant DJ pose, rounded fingers fanned out, behind a tall stacked-rock turntable. On the RIGHT atop the peak: a velociraptor facing the viewer with a small punk-feather tuft on its head, ONE arm raised high overhead in a dance pose (clearly showing the striped wrist band), the OTHER arm extended out to the side (also clearly showing the striped wrist band). Both wrist bands MUST be clearly visible. Below the peak: a darker silhouetted jungle and distant volcano. Above: a huge starry sky with crescent moon, music note fireworks bursting in three places, swirling streamers. The composition feels like the climactic moment of the whole bundle — wide, dramatic, celebratory.",
  ],
};

export const HERO_BUNDLES: Record<string, HeroBundle> = {
  [DINO_DANCE_PARTY.slug]: DINO_DANCE_PARTY,
};

export function getBundleProfile(slug: string): HeroBundle | undefined {
  return HERO_BUNDLES[slug];
}

export function getHero(bundle: HeroBundle, heroId: string): Hero | undefined {
  return bundle.heroes.find((h) => h.id === heroId);
}
