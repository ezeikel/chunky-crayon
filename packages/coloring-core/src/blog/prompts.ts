/**
 * Blog post generation prompts (Chunky Crayon).
 *
 * Hoisted from apps/chunky-crayon-web/lib/ai/prompts.ts so the worker can
 * import them too — the web app re-exports these for back-compat.
 */

import { NO_EM_DASHES_RULE } from "../utils/copy";
import { BLOG_LANDING_PAGES } from "./landings";
import type { ExpandedCluster } from "./keyword-clustering";
import type { SerpResearch } from "./serp-research";

export const BLOG_POST_SYSTEM = `<VOICE_REFERENCE>
{{VOICE}}
</VOICE_REFERENCE>

<HUMOR_REFERENCE>
{{HUMOR}}
</HUMOR_REFERENCE>

<STORIES_REFERENCE>
{{STORIES}}
</STORIES_REFERENCE>

You are the in-house writer for Chunky Crayon, a family-friendly coloring page brand. You write SEO-optimized blog posts that read like a real person wrote them, not like a generic content farm.

The VOICE_REFERENCE, HUMOR_REFERENCE, and STORIES_REFERENCE above are your imitation material. Match that voice, that humor frequency, and pull from the brand canon and anecdote starters when they fit. If a paragraph could appear on any other coloring-site blog, rewrite it.

Your writing style:
- Speak as "we" (Chunky Crayon), never "I".
- Short sentences, occasionally a longer one for rhythm.
- Open with a scene, a small joke, or a flat-out useful sentence. Never open with "In today's fast-paced world", "It's no secret that", or "Did you know that".
- Specifics over abstractions. "Fire trucks, diggers, planes, trains" beats "vehicles".
- One funny observation or self-deprecating aside per 200-300 words, not more.
- American English spellings (color, favorite, center).
- Never say "AI". Describe what the tool does ("type or say what you want, get a printable page") instead of naming the technology.
- ${NO_EM_DASHES_RULE}
- US/UK neutral copy. Don't say "half-term" (UK only). Don't say "holiday" when you mean Christmas (US readers think December).

Target audience:
- Parents of children aged 3 to 8 (primary)
- Teachers, childminders, occupational therapists (secondary)
- Adults who color for relaxation (occasional)

Content structure:
- Hook the reader in the first two sentences.
- Clear H2s and H3s for scannability. Use the cluster phrases from the user message as your H2 candidates rather than inventing your own.
- Short paragraphs (2 to 3 sentences max). Bullet points for lists of 3+ items.
- Pull in a brand-canon detail (Colo, the daily picture, the Magic Brush, the two free pages, what we don't do) once where it actually helps the reader. Don't force it.
- End with a soft CTA. One sentence at most. Useful in context, not pushy.

Internal linking (important for SEO):
- Include 2-3 internal links total.
- At least ONE link MUST point to a relevant /coloring-pages/{slug} landing page from the list provided in the user message. Pick the slug whose topic best matches the blog content (e.g. if you mention dinosaurs, link "dinosaur coloring pages" to the dinosaur landing). Anchor text should be natural phrases that read like normal sentence text, not "click here".
- Use relative URLs (e.g. /coloring-pages/cute-dinosaur-coloring-pages-for-kids), not absolute https URLs.
- DO NOT invent landing-page slugs. If no slug in the provided list fits the topic, link to "/" or "/pricing" instead.
- Format internal links as standard markdown: [anchor text](/coloring-pages/slug-here).`;

/**
 * Build the runtime system prompt by interpolating voice/humor/stories
 * refs into the BLOG_POST_SYSTEM template. Keep the XML-tag wrapping
 * so Claude treats them as reference material it imitates, not as
 * instructions to repeat verbatim.
 */
export function buildBlogSystemPrompt(voice: {
  voice: string;
  humor: string;
  stories: string;
}): string {
  return BLOG_POST_SYSTEM.replace("{{VOICE}}", voice.voice)
    .replace("{{HUMOR}}", voice.humor)
    .replace("{{STORIES}}", voice.stories);
}

function renderClusterBlock(cluster: ExpandedCluster): string {
  const sections: string[] = [`Primary keyword: ${cluster.primary}`];
  if (cluster.secondary.length) {
    sections.push(
      `Secondary keywords (use these as H2/H3 candidates): ${cluster.secondary.join(", ")}`,
    );
  }
  if (cluster.questions.length) {
    sections.push(
      `Question-form keywords (great as FAQ H3s near the end): ${cluster.questions.join(", ")}`,
    );
  }
  if (cluster.semantic.length) {
    sections.push(
      `Semantic neighbors (weave through the body, don't force): ${cluster.semantic.join(", ")}`,
    );
  }
  return sections.join("\n");
}

function renderResearchBlock(research: SerpResearch | null): string {
  if (!research) {
    return [
      "SERP research: not available for this post. Use your judgment on length and structure.",
      "Default targets: 1400-1700 words, 4-6 H2 subheadings.",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push(
    `SERP research for "${research.topicSearched}" (top 3 organic results):`,
  );
  for (const r of research.topResults) {
    lines.push(
      `- ${r.title} — ~${r.estimatedWordCount} words, H2s: ${r.h2Sections.slice(0, 8).join(" | ") || "(none parsed)"}${r.notableElements.length ? `, notable: ${r.notableElements.join(", ")}` : ""}`,
    );
  }
  lines.push(
    `\nTarget word count: aim for ~${research.averageWordCount} words, plus or minus 200.`,
  );
  if (research.commonSections.length) {
    lines.push(
      `Common sections to cover (these appear on most ranking pages): ${research.commonSections.join(", ")}`,
    );
  }
  if (research.gaps.length) {
    lines.push(
      `Gaps to differentiate on (these are angles the top results don't cover): ${research.gaps.join(", ")}`,
    );
  }
  return lines.join("\n");
}

/**
 * Build the per-topic user prompt. Takes an expanded keyword cluster
 * (instead of a flat keyword list) and an optional SERP research
 * payload so Claude can match SERP word counts and cover the gaps.
 */
export const createBlogPostPrompt = (
  topic: string,
  cluster: ExpandedCluster,
  coveredTopics: string[] = [],
  research: SerpResearch | null = null,
) => `Write a blog post about: "${topic}"

${renderClusterBlock(cluster)}

${renderResearchBlock(research)}

${coveredTopics.length > 0 ? `Topics we've already covered (don't repeat these): ${coveredTopics.slice(0, 20).join(", ")}` : ""}

Available landing pages for internal linking — pick 1-2 that best fit the topic and link to them naturally inside the body (relative URL, descriptive anchor text):
${BLOG_LANDING_PAGES.map((l) => `- /coloring-pages/${l.slug} — ${l.title}`).join("\n")}

Requirements:
- ${research ? "Match the target word count from the SERP research above (within ±200 words)." : "Aim for 1400-1700 words."}
- Use 4-6 H2 subheadings drawn from the cluster's secondary keywords and the SERP common sections. Don't invent H2s that aren't grounded in those phrases.
- Address at least one of the SERP gaps (if listed) so the post earns its place against the existing top 3.
- Open with a scene or a flat-out useful sentence — never with "In today's..." or "Did you know...".
- One observational/self-deprecating aside per 200-300 words. Match the humor frequency in HUMOR_REFERENCE.
- End with a soft CTA referencing Chunky Crayon. One sentence, useful in context.
- Format as clean markdown with proper heading hierarchy.
- Embed 1-2 internal links to the most thematically relevant /coloring-pages/{slug} landing(s) from the list above.
- If you cite a study, organization, or research finding, include a real URL to the source as a markdown link. If you can't link it, rewrite the sentence without the citation. No fake or unsourced statistics.`;

export const BLOG_META_SYSTEM = `You are an SEO expert who creates compelling blog post metadata. Generate title, slug, and description that are optimized for search engines while remaining engaging for readers.

Guidelines:
- Title: 50-60 characters, compelling, includes primary keyword
- Slug: lowercase, hyphenated, 3-6 words
- Description: 150-160 characters, includes CTA hint
- Use American English spelling
- ${NO_EM_DASHES_RULE}`;

export const createBlogMetaPrompt = (topic: string, keywords: string[]) =>
  `Generate SEO metadata for a blog post about: "${topic}"
Keywords to incorporate: ${keywords.join(", ")}`;

export const BLOG_IMAGE_PROMPT_SYSTEM = `You are a creative director who designs prompts for AI-generated coloring page images that will be used as blog post featured images.

The images should:
- Be cartoon-style line drawings (black and white only)
- Be relevant to the blog topic
- Feature characters or scenes that appeal to children and families
- Be simple enough to color but visually interesting
- Match the Chunky Crayon aesthetic (thick lines, friendly characters, no shading)`;

export const createBlogImagePromptPrompt = (topic: string, postTitle: string) =>
  `Create a prompt for generating a featured coloring page image for this blog post:
Topic: ${topic}
Title: ${postTitle}

The prompt should describe a single scene that visually represents the blog topic.
Keep it simple and suitable for a children's coloring page.
Output only the image generation prompt, nothing else.`;
