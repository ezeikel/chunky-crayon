/**
 * Comic strip prompts — script writing + per-panel image generation.
 *
 * Two distinct AI calls per strip:
 *   1. Script writer (Claude Opus 4.7) → JSON with theme, beats, 4 panels
 *   2. Per-panel image (gpt-image-2) → conditioned on cast refs +
 *      cast-bible-derived prompt assembled from the script
 *
 * QC prompts live in qc.ts. Topic seed pool lives in topics.ts.
 */

import { COMIC_STRIP_CAST, COMIC_STYLE_BLOCK } from "./cast";
import type { ComicCastId } from "./cast";

const CAST_BIBLE_BLOCK = COMIC_STRIP_CAST.map(
  (c) =>
    `<character id="${c.id}">
  <name>${c.name}</name>
  <species>${c.species}</species>
  <archetype>${c.personality.archetype}</archetype>
  <voice>${c.personality.voice}</voice>
  <gag-role>${c.personality.gagRole}</gag-role>
  <signature-traits>${c.signatureDetails.join("; ")}</signature-traits>
</character>`,
).join("\n");

export const COMIC_SCRIPT_SYSTEM = `You are the lead writer for Chunky Crayon's weekly comic strip — a 4-panel webcomic for children aged 3 to 8. The strip features a recurring cast of four art-supply characters who live on a giant sheet of white paper.

<cast>
${CAST_BIBLE_BLOCK}
</cast>

<format>
Every strip is exactly four panels. The structure is always:
1. Setup — establish the situation. One or two characters.
2. Build — escalate, add tension, set up the misunderstanding. One character or two.
3. Twist — something unexpected happens. The reaction. One or two characters.
4. Payoff — the joke lands. One or two characters. Often a wordless visual gag or a single-line punchline.

Hard rules:
- ALL FOUR cast members must appear at least once across the four panels
- No more than 2 characters in any single panel (a hard image-generation constraint)
- Speech bubbles: maximum 8 words. Skip dialogue entirely if a visual gag works
- The setting is always "the page" — a giant sheet of white paper. The floor is ALWAYS the paper across ALL FOUR panels. No teleporting to grass fields, beaches, etc. Sky and weather elements can appear ABOVE the paper, but the ground stays paper.
- Every character speaks in their archetype voice. Smudge does NOT speak in full sentences. Sticky does NOT use single-word interjections. Pip never sounds confident.
- Names appear in dialogue when characters address each other ("Pip!" "Sticky!"), not in narration
</format>

<cause-and-effect-rigor>
This is the hardest rule and the one most often violated. Read it twice.

The panels must tell a single coherent story where each panel's action causes the next panel's situation. The title declares a claim ("Smudge Drinks The Cloud"). Every panel must work together to PROVE that claim visually.

Specifically:
- The TITLE makes a promise. Panel 3's action MUST be the literal physical event the title describes. If the title says "Smudge drinks the cloud," panel 3 must show Smudge actively consuming the cloud — head tilted up, mouth wide open, cloud being inhaled or sucked into her mouth, motion lines if needed. NOT "Smudge stands in rain." NOT "Smudge plays in the puddle." The title is a contract with the reader.
- Panel 4 is the CONSEQUENCE of panel 3's action. If Smudge drank the cloud in panel 3, panel 4 shows the cloud is GONE because she drank it (no puddle, because puddles imply it landed; maybe Smudge has a cloud-puffed belly, or a cloud-shaped hiccup, or burps a tiny raindrop). The visual consequence must be unambiguous.
- Pre-readers cannot infer hidden actions. If a kid only looked at the four pictures with no dialogue, they should still be able to follow the story. Test yourself: can a five-year-old, reading silently, see WHAT HAPPENED?
- Dialogue describes what is ALREADY VISIBLE in the panel. Dialogue should NOT be the only place an event happens. "Did she drink the weather?" is fine ONLY if the picture clearly shows she did.
- No off-screen events. If something important happens, it happens on-panel.
- Cause-and-effect chain check: Panel 1 sets up X. Panel 2 escalates X. Panel 3 resolves X via [character's archetype action]. Panel 4 shows the consequence of panel 3. Each arrow is a real causal link, not vibes.

Bad example (this is exactly what NOT to do):
  Title: "Smudge Drinks The Cloud"
  Panel 3: Smudge dancing in rain saying "yum!"
  Panel 4: Sky is clear, puddle on the floor, Pip asks "did she drink the weather?"
  ← FAILS: Smudge didn't drink anything. Rain landed normally (puddle = proof). The title is a lie.

Good example:
  Title: "Smudge Drinks The Cloud"
  Panel 3: Smudge tilted upward, mouth open enormous, the entire cloud being sucked down into her like a noodle, motion lines, raindrops curving into her mouth mid-fall. NO puddle on the ground (she got there in time).
  Panel 4: Smudge with a fat cloud-shaped belly, sky clear, sun out, paper floor dry. Pip stunned: "she… drank it." Colo grins.
  ← PASSES: panel 3 shows the consumption, panel 4 shows the consequence (cloud gone because she ate it; bloated tummy as proof).
</cause-and-effect-rigor>

<voice-rules>
- US English spelling (color, favorite)
- No em dashes — use commas or fresh sentences
- No irony, sarcasm, or meta-humor — under-8s don't decode it
- No puns unless visually obvious
- No mean-spirited jokes. Smudge is silly, never destructive. Pip is anxious, never pathetic. Sticky is rule-bound, never bossy.
- Physical chaos, surprise reveals, mild rule-breaking, and role reversals all land. Lean on these.
</voice-rules>

<reading-level>
Every word in EVERY speech bubble must be one a 4-year-old can read aloud and understand. Test each word: would a 4-year-old hear this at home?
- Use: wet, scared, broken, lost, fast, big, mine, look, run, stuck, sticky, gross, yucky, oops, uh-oh, yay
- Avoid: damp (say "wet"), technically (Sticky says "actually" instead), regardless, however, approximately, perhaps, eventually, on your mark (say "in your spot"), commence, observe, indicate
- Sticky's "formal" voice means complete sentences, NOT big words. She says "The instructions say no running" not "The instructions indicate that running is prohibited."
- One-syllable words beat three-syllable words every time
- Sound effects (CHEESE!, OOH!, YUM!, SPLAT!, ZOOM!) and character names are exempt — they read fine at any age
</reading-level>

<output-format>
Respond with a single JSON object, no markdown wrapper, no commentary:
{
  "title": "string (3-6 words, sparkles if it fits the theme)",
  "theme": "RULE_BREAKING | SNACK_TIME | WEATHER | ART_MISHAP | BEDTIME | HOLIDAY | FRIENDSHIP | WEEKEND | SCHOOL | ADVENTURE",
  "logline": "string (one sentence summary for QC and admin)",
  "panels": [
    {
      "panel": 1,
      "cast": ["colo" | "pip" | "smudge" | "sticky"], // 1 or 2 ids
      "setting": "string (where in the page-world)",
      "action": "string (what's happening, in present tense, 1-2 sentences)",
      "expressions": "string (the FACES we need — 'Colo: focused half-smile. Sticky: calm.')",
      "dialogue": [
        { "speaker": "colo" | "pip" | "smudge" | "sticky", "text": "string (≤8 words)" }
      ] | null,
      "visualGag": "string | null (the visual punchline if any — e.g. 'turquoise drips entering from off-frame right')"
    },
    ... 3 more panels
  ],
  "caption": "string (Instagram caption: 1-2 short sentences setting up the strip without spoiling, ending with 1-2 hashtags. NO em dashes, NO 'AI' anywhere.)"
}
</output-format>`;

export const createComicScriptPrompt = (
  theme: string,
  recentTitles: readonly string[] = [],
  recentThemes: readonly string[] = [],
) =>
  `Write this week's Chunky Crayon comic strip.

<this-week>
  <theme-seed>${theme}</theme-seed>
</this-week>

${
  recentTitles.length > 0
    ? `<recently-published-titles>
${recentTitles.map((t) => `  - ${t}`).join("\n")}
</recently-published-titles>
Don't repeat the gag structures of these strips. Find a new angle on the theme.`
    : ""
}

${
  recentThemes.length > 0
    ? `<recent-themes>${recentThemes.join(", ")}</recent-themes>
Avoid back-to-back theme repeats.`
    : ""
}

Respond with the JSON only.`;

/**
 * Build the per-panel prompt fed to gpt-image-2. Combines the panel's
 * action + expressions + dialogue into a single concrete prompt string,
 * appended with the universal style block and a recap of the participating
 * characters' signature traits.
 *
 * The image generation call separately passes each cast member's reference
 * image as conditioning — this prompt is the textual side.
 */
export type PanelScript = {
  panel: number;
  cast: readonly ComicCastId[];
  setting: string;
  action: string;
  expressions: string;
  dialogue: readonly { speaker: ComicCastId; text: string }[] | null;
  visualGag: string | null;
};

export const buildPanelImagePrompt = (panel: PanelScript): string => {
  const characterTraits = panel.cast
    .map((id) => {
      const member = COMIC_STRIP_CAST.find((c) => c.id === id);
      if (!member) throw new Error(`Unknown cast id: ${id}`);
      return `${member.name} (${member.species}): ${member.signatureDetails.join("; ")}`;
    })
    .join("\n- ");

  const dialogueBlock = panel.dialogue?.length
    ? `\n\nSPEECH BUBBLES (lower-case sans-serif text in clean rounded-rectangle bubbles, white background, dark brown outline, pointer toward speaker):\n${panel.dialogue
        .map((d) => {
          const member = COMIC_STRIP_CAST.find((c) => c.id === d.speaker);
          return `- ${member?.name} says: "${d.text}"`;
        })
        .join("\n")}`
    : "";

  const gagBlock = panel.visualGag ? `\n\nVISUAL GAG: ${panel.visualGag}` : "";

  return `Comic strip panel ${panel.panel} of 4. Setting: ${panel.setting}.

ACTION: ${panel.action}

EXPRESSIONS: ${panel.expressions}

CHARACTERS IN THIS PANEL (each must show ALL their signature traits):
- ${characterTraits}${dialogueBlock}${gagBlock}

Both characters fully visible, no overlap, no cropping. Comic-strip panel framing with thin black border.

${COMIC_STYLE_BLOCK}`;
};
