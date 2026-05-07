/**
 * Comic-strip cast — internal source of truth for character identity.
 *
 * Mirrors the shape of bundles/profiles.ts (HeroBundle), but specialised
 * for comic strips: 4 named characters with persistent personalities,
 * referenced by id in the script JSON, with R2-hosted reference images
 * fed to gpt-image-2 as conditioning at panel-generation time.
 *
 * Names are user-facing — they appear in dialogue bubbles and are part
 * of the brand. (Internal-only is wrong here, unlike DinoDanceParty
 * where the names live in the QA gate but never the line art.)
 *
 * The cast was designed in spike-comic-cast.ts. References live in R2
 * at reference-images/comic-cast/{id}.png — generated once with Colo
 * himself as the style anchor, so all four characters share the same
 * outline weight, palette logic, and expression vocabulary.
 */

export type ComicCastMember = {
  /** Internal id, kebab-case. Used in script JSON, R2 paths, QA checks. */
  id: string;
  /** User-facing name as used in dialogue. */
  name: string;
  /** What kind of art-supply character (used in QA checks + prompts). */
  species: string;
  /**
   * Personality archetype + voice rules. Embedded into the script-writing
   * prompt so dialogue stays in character across strips.
   */
  personality: {
    archetype: string;
    voice: string;
    gagRole: string;
  };
  /**
   * The non-negotiable visual details that define this character. QA gate
   * checks each one is visible and recognisable on every panel the
   * character appears on. Keep concise — these become checkbox items in
   * the QA prompt.
   */
  signatureDetails: readonly string[];
  /**
   * Public R2 URL of the canonical reference image. Fetched and passed
   * as conditioning to gpt-image-2 at panel-generation time.
   */
  referenceImageUrl: string;
};

// Prod R2 (custom domain). Override via COMIC_CAST_REF_BASE_URL env if a
// non-prod environment needs to point at a different bucket.
const REF_BASE =
  process.env.COMIC_CAST_REF_BASE_URL ||
  "https://assets.chunkycrayon.com/reference-images/comic-cast";

export const COMIC_STRIP_CAST: readonly ComicCastMember[] = [
  {
    id: "colo",
    name: "Colo",
    species: "orange crayon",
    personality: {
      archetype:
        "The hero. Earnest, optimistic, the doer. Almost never the punchline — sets up the action.",
      voice: 'Short exclamations. "Look!" "Try this!" "C\'mon!" Open and warm.',
      gagRole: "Setup / hero",
    },
    signatureDetails: [
      "cylindrical orange crayon body with a paper-wrapper conical tip on top",
      "wavy paper-wrapper band across the middle",
      "pink/peach exposed wax band at the bottom",
      "two stubby orange mitten arms",
    ],
    referenceImageUrl: `${REF_BASE}/colo.png`,
  },
  {
    id: "pip",
    name: "Pip",
    species: "wooden pencil",
    personality: {
      archetype:
        "The worrier. Second-guesses everything. Sometimes the surprise hero whose tiny idea turns out best.",
      voice:
        'Trailing-off sentences with ellipses. "What if… we shouldn\'t…?" "Are we sure?"',
      gagRole: "Tension / surprise hero",
    },
    signatureDetails: [
      "tall slim hexagonal yellow pencil body",
      "sharpened dark grey graphite tip on top",
      "cream metal ferrule band near the bottom",
      "pink eraser below the ferrule",
      "at least one bead of sweat near his temple in any panel showing worry",
    ],
    referenceImageUrl: `${REF_BASE}/pip.png`,
  },
  {
    id: "smudge",
    name: "Smudge",
    species: "paint blob with a brush handle",
    personality: {
      archetype:
        "The silly one. Joyfully oblivious. Breaks rules without realising. The accidental punchline AND the accidental fix.",
      voice:
        'Loud, enthusiastic, single-word responses. "PIZZA." "OOH!" "MINE."',
      gagRole: "Punchline / chaos",
    },
    signatureDetails: [
      "round irregular turquoise paint-blob body",
      "wooden paintbrush handle sticking up from the top",
      "droopy cream-coloured bristles at the top of the brush handle",
      "2-3 small turquoise paint droplets dripping near the feet (mandatory)",
      "eyes squinted shut from grinning by default",
    ],
    referenceImageUrl: `${REF_BASE}/smudge.png`,
  },
  {
    id: "sticky",
    name: "Sticky",
    species: "folded sticky note",
    personality: {
      archetype:
        "The rule-follower. Reads instructions. Quotes rules. Earnest, not bossy — wants everyone to succeed. Gets flustered when plans break.",
      voice:
        'Complete sentences, slightly formal. "The instructions say…" "Actually, page 4…"',
      gagRole: "Straight man / reaction shot",
    },
    signatureDetails: [
      "square folded pale-yellow sticky note body",
      "dog-eared TOP RIGHT corner curled back (mandatory)",
      "round black-rimmed glasses (mandatory)",
      "calm flat-line mouth by default",
    ],
    referenceImageUrl: `${REF_BASE}/sticky.png`,
  },
] as const;

export const COMIC_CAST_BY_ID: Record<string, ComicCastMember> = Object.freeze(
  Object.fromEntries(COMIC_STRIP_CAST.map((m) => [m.id, m])),
);

export type ComicCastId = (typeof COMIC_STRIP_CAST)[number]["id"];

/**
 * Universal style rules for every panel — derived from Colo's canonical
 * design. Locked; deviation breaks the family resemblance across strips.
 */
export const COMIC_STYLE_BLOCK = `Match the EXACT style of the provided reference images:
- Dark brown outlines, uniform thick weight, no thin lines
- Two flat tones per region: one base color + one slightly darker shadow tone, NO gradients, NO rendering, NO shading detail
- Two solid black bean-shaped eyes spaced wide apart, no whites, no pupils (closed-grin eyes are short curved lines)
- Two soft pink oval cheeks under the eyes
- Mitten/blob style hands, no fingers
- Stubby leg-feet, two-tone, no shoes
- Chunky toddler-like proportions
- Comic-strip panel composition with a thin black panel border
- Speech bubbles where indicated use a clean rounded rectangle with a small pointer toward the speaker, white background, dark brown outline matching the character outline weight, lower-case sans-serif text inside`;
