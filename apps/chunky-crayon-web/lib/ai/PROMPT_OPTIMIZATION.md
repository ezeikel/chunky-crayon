# Prompt Optimization Research (Feb 2026)

Model-specific prompt engineering findings for each AI model in our pipeline.

## GPT Image 1.5 (Primary Image Generator)

**Current issue**: 24-rule numbered list with "no color" repeated ~10 times. GPT
image models largely ignore negative prompts.

### What works best

- **Positive framing**: "thick black outlines on white background" beats "no
  color, no shading, no gradients"
- **Layered structure**: scene/subject first, then style, then constraints
- **Key anchor phrases**: "coloring book page", "thick black outlines", "clean
  line art", "no fill, outlines only", "printable"
- **Concise style block** (~200 words max, not 24 rules):
  ```
  Style: children's coloring book, clean line art, black outlines on white background
  Medium: thick black ink outlines only, no fill, no shading
  Audience: simple enough for a 3-year-old to color with chunky crayons
  ```
- **Specify element counts**: "a single dragon in the center" not just "a
  dragon"
- **Add "My prompt has full detail so no need to add more"** to prevent internal
  prompt rewriting

### What to avoid

- Repetitive negative instructions (model ignores them)
- Overcrowded prompts (later rules get ignored)
- Not specifying element counts (model fills scene with too many objects)

### Sources

- [GPT Image 1.5 Prompting Guide (OpenAI Cookbook)](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide)
- [OpenAI Community Tips Thread](https://community.openai.com/t/dalle3-and-gpt-image-1-prompt-tips-and-tricks-thread/498040)

---

## Perplexity Sonar (Scene Description Generator)

**Current issue**: System prompt is ~3KB with massive character/setting/activity
lists. Search is triggered by user message only, not system prompt.

### What works best

- **Short system prompt** (<1KB) for persona, format, constraints only
- **Search-triggering instructions in user message** (already correct)
- **Style anchors at the very start** of system prompt
- **Higher temperature** (0.7+) for creative/diverse output
- **"Prioritize unexpected combinations"** directive helps avoid repetition
- **`search_recency_filter: "week"`** for current trending topics

### What to avoid

- XML-style meta-tokens (`<goal>`, `##system##`) — blocked by Sonar sanitization
- Telling Sonar how to search (use API params instead)
- Overly long system prompts (may truncate)
- More than 10-15 "recent prompts to avoid" (context window waste)

### Sources

- [Perplexity Prompt Engineering Techniques](https://www.datastudios.org/post/perplexity-ai-prompt-engineering-techniques-for-more-accurate-responses-in-2025)
- [Perplexity Search Context Size Guide](https://docs.perplexity.ai/guides/search-context-size-guide)

---

## Claude Sonnet 4.5 (Text Cleanup/Rewriting)

**Current issue**: Prose-based instructions. Claude 4.x takes you literally —
vague = minimal output.

### What works best

- **XML tags** for structure (`<input>`, `<constraints>`, `<output_format>`) —
  Claude was trained on these
- **Few-shot examples** (2-3 input/output pairs)
- **Explicit output contract**: "Output a single English sentence of 10-30
  words. No commentary."
- **Precise length targets**: "Write exactly 200-300 characters"
- **Success criteria**: Define what "done" looks like

### What to avoid

- The word "think" (triggers extended thinking sensitivity in Sonnet 4.5)
- "Be thorough" / "go above and beyond" (causes overtriggering in Claude 4.x)
- Vague instructions expecting rich output (Claude 4.x is more concise by
  default)
- Prefilled assistant responses (deprecated in Opus 4.6)

### Sources

- [Anthropic Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Claude Prompt Engineering Testing (DreamHost)](https://www.dreamhost.com/blog/claude-prompt-engineering/)

---

## Google Gemini (Fallback Image Generator)

**Current issue**: Mixes narrative and numbered rule lists. Reference image
instruction is far from the actual images.

### What works best

- **Narrative descriptions** over keyword lists — "In the style of a children's
  coloring book, thick clean black ink outlines..."
- **Material/medium descriptors**: "black ink on white paper", "thick
  marker-weight outlines"
- **Plain exclusion list at the end**: "Exclude: gradients, shadows, shading,
  textures, gray tones, fill, color"
- **Reference image instruction adjacent to images** (not at the end)
- **3-4 best reference images** (too many can confuse style matching)
- **Consistent aspect ratios** in reference images (Gemini adopts last image's
  dimensions)

### What to avoid

- Disconnected keyword lists (worse results than narrative)
- "Don't" / "No" phrasing (use plain exclusion lists instead)
- All 24 coloring rules (not all relevant to Gemini)
- Text in images (inconsistent rendering)

### Sources

- [Google: How to Prompt Gemini 2.5 Flash](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)
- [Google Vertex AI Image Prompt Guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide)

---

## Summary: Key Differences

| Aspect                | GPT Image 1.5                        | Perplexity Sonar               | Claude Sonnet 4.5             | Gemini Image                  |
| --------------------- | ------------------------------------ | ------------------------------ | ----------------------------- | ----------------------------- |
| Prompt style          | Layered: scene > style > constraints | Short system + search user msg | XML-tagged, contract-like     | Narrative descriptions        |
| Negative instructions | Use positive framing                 | N/A                            | Follows literally             | Plain exclusion lists         |
| Length                | ~200 words                           | <1KB system                    | Precise and bounded           | Medium with rich style        |
| Unique strength       | "coloring book" training data        | Web search for trends          | Literal instruction following | Reference image matching      |
| Biggest pitfall       | Ignores repeated negatives           | Long prompts truncated         | Vague = minimal output        | Keyword lists degrade quality |
