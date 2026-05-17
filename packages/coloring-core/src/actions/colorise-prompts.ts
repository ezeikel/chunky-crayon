/**
 * Variant-specific "colourise this line art" prompts.
 *
 * These drive the styled render that the region store samples to decide each
 * region's colour. There are two consumers of the same model call in the
 * codebase:
 *
 *   - generate-colored-reference.ts / record/colored-reference.ts produce the
 *     painterly `coloredReferenceUrl` shown in OG-ish previews.
 *   - the region-store pipeline (generate-regions.ts) now generates one render
 *     PER palette variant and samples the dominant colour of each region.
 *
 * The second use case has an extra constraint the painterly reference doesn't:
 * we are going to *sample* a single representative colour per region, then snap
 * it to the constrained palette. Heavy gradients / shading / texture make the
 * per-region dominant colour noisy and the snapped result muddy. So these
 * prompts explicitly ask for FLAT, even fills with crisp boundaries — "colour
 * inside the lines like a child with markers", not "render a painting".
 *
 * `realistic` keeps the proven colored-reference wording (naturalistic, lines
 * untouched, no invented detail). `pastel` / `cute` / `surprise` reuse the same
 * structural rules and swap only the aesthetic clause, mirroring
 * DEFAULT_PALETTE_VARIANT_MODIFIERS so the four renders stay coherent with the
 * four palette variants the client switches between.
 */
import type { PaletteVariant } from "./generate-regions";

const FLAT_FILL_RULES = `ABSOLUTE RULES — follow every one:
- Keep ALL black outlines/lines EXACTLY as they are — do not remove, lighten, thicken, or alter any line
- Color ONLY within the existing line art — do NOT invent new details, textures, patterns, or shading that aren't drawn in the original
- PURE FLAT FILLS ONLY. Every enclosed shape gets exactly ONE single uniform RGB color, edge to edge, like a paint-bucket fill or a vector flat-color illustration. ZERO gradients. ZERO shading. ZERO highlights. ZERO shadows. ZERO ambient occlusion. ZERO airbrushing. ZERO texture. ZERO lighting of any kind. If you are tempted to make one part of a shape lighter or darker than another part of the SAME shape, DON'T — it must be one identical color value throughout
- Think "cartoon cel / coloring-book app paint bucket", NOT "digital painting". A child's finished coloring page where each region is one crayon color pressed evenly
- Do NOT add backgrounds, wallpapers, scenery, or decorations to empty/white areas — fill each large blank/background area with ONE single flat color
- The LINE ART itself must remain unchanged — same shapes, same lines, same composition
- SAME OBJECT = SAME COLOR. Every part of one object is the identical color value: a character's two arms match exactly, both legs match, both ears match, the whole body is one skin/fur color, a whole wall is one color, a whole sky is one color. This is the most important rule after "flat fills"
- Adjacent shapes that are different objects must use clearly different colors so every shape stays visually distinct
- The result must look like the same coloring page, filled in perfectly evenly with solid colors`;

const VARIANT_AESTHETIC: Record<PaletteVariant, string> = {
  realistic:
    "COLOR STYLE: REALISTIC. Choose colors that match real-world expectations. Grass is green, sky is blue, skin is a warm natural tone, wood is brown, water is blue. Naturalistic and grounded — the colors a thoughtful illustrator would pick for a true-to-life rendition.",
  pastel:
    "COLOR STYLE: PASTEL. Use soft, desaturated colors throughout: gentle pinks, mints, lavenders, peaches, powder blues, soft butter yellows. Everything calm, airy, and dreamy. Keep objects identifiable (sky still reads as sky) but in their soft pastel form. Avoid bold or fully-saturated hues.",
  cute: "COLOR STYLE: CUTE. Use playful, high-saturation colors: bubblegum pink, sunny yellow, mint green, sky blue, coral. Warm, friendly, inviting — like a children's cartoon. Objects stay recognisable but rendered in their cheerful, candy-bright form.",
  surprise:
    "COLOR STYLE: SURPRISE. Make unexpected, imaginative color choices that defy real-world expectations — a pink tree, a purple sky, teal skin, a rainbow animal. Be bold and creative, BUT the overall palette must still feel deliberate and harmonious across the whole page, not random noise. Same-object-same-color and adjacent-contrast rules still apply.",
};

/**
 * Build the colourise prompt for a given palette variant.
 *
 * @param variant   which palette variant this render feeds
 * @param sceneHint optional `This is: "<title>". <description>` context line
 *                  (helps the model identify ambiguous objects correctly)
 */
export function createColourisePrompt(
  variant: PaletteVariant,
  sceneHint?: string,
): string {
  const hint = sceneHint && sceneHint.trim() ? ` ${sceneHint.trim()}` : "";
  return `Color this children's coloring page.${hint}

${VARIANT_AESTHETIC[variant]}

${FLAT_FILL_RULES}`;
}
