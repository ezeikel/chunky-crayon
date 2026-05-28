#!/usr/bin/env node
// One-off strategy research: find PTP-style organic content veins for Chunky Crayon.
// Hits multiple Perplexity tiers across multiple strategic angles, in parallel.
// Output: scripts/research/cc-organic-content-research-output.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../apps/chunky-crayon-web/.env.local");
const env = fs.readFileSync(envPath, "utf8");
const KEY = env.match(/PERPLEXITY_API_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, "");

const today = new Date().toISOString().slice(0, 10);

async function ask(model, system, user) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { model, error: `${res.status} ${t.slice(0, 500)}` };
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "(no content)";
  const citations = json.citations ?? json.search_results?.map((s) => s.url) ?? [];
  return { model, content, citations };
}

const ANALYST_SYSTEM =
  `You are a sharp organic-social growth strategist. Today is ${today}. ` +
  `Be concrete, cite real sources, avoid generic advice. Prefer specific data sources, ` +
  `real news angles, and named datasets over platitudes. UK + US audiences.`;

// CONTEXT shared across every question so each model has the full picture.
const CONTEXT = `
CONTEXT FOR ALL ANSWERS:
A sister project "Parking Ticket Pal" (UK parking-appeals app) gets huge organic reach
(1,700 Facebook followers in 6 months, 40M+ views, near-zero ad spend, organic paid conversions)
by NEVER posting about its own product. Instead it posts:
 (1) Outrage-scored UK parking/driving NEWS discovered 4x/day via Perplexity (people get angry,
     argue in comments, share). Facebook especially loves this.
 (2) Stories built from SCRAPED UK parking-tribunal case data (real outcomes, "here's how someone
     beat / lost their ticket"), turned into short video reels.
The mechanism: a recurring news-discovery engine + a recyclable structured-dataset engine, both
turned into short-form content, distributed across IG/FB/TikTok/YouTube/Pinterest/LinkedIn.

THE NEW PROJECT: "Chunky Crayon" — a kids' coloring app (printable + in-app coloring, ages 3-8).
Buyers are PARENTS and TEACHERS. It currently only posts product-promo content and gets ~zero
engagement (~50 IG followers). We want to replicate PTP's organic flywheel: adjacent, emotionally
charged or genuinely useful content that appeals to parents/teachers, drives debate/saves/shares,
and is NOT an ad. Brand constraints: kids app, must stay brand-safe / parent-trust-safe; we avoid
saying "AI" in marketing copy; we want outrage/debate, useful/reassuring, nostalgia/identity, and
data-curiosity angles all on the table.
`;

const QUESTIONS = [
  {
    id: "01-news-veins",
    title: "News veins parents/teachers argue about",
    user:
      CONTEXT +
      `\nQUESTION: What recurring NEWS topics in the parenting/education/childhood space reliably ` +
      `drive high engagement (comments, debate, shares) on Facebook and Instagram among parents and ` +
      `teachers? I'm looking for the equivalent of "angry about a parking law change." ` +
      `For each topic give: the topic, WHY it triggers engagement, which platform it does best on, ` +
      `2-3 example real recent headlines/stories from the last few months, and a sample Perplexity ` +
      `search query I could run on a schedule to surface fresh stories in that vein. ` +
      `Rank by engagement potential. Include brand-safety risk notes for a kids-app brand.`,
  },
  {
    id: "02-scrapable-datasets",
    title: "Scrapable / structured datasets (tribunal-data analogue)",
    user:
      CONTEXT +
      `\nQUESTION: PTP turns a scraped tribunal dataset into endless content. What real, publicly ` +
      `accessible, structured datasets exist in the UK and US that a kids-coloring / parenting / ` +
      `education brand could legally scrape or pull via API and cycle through to generate endless ` +
      `non-promotional content (one row = one post)? Think: school/Ofsted data, child development ` +
      `milestones, screen-time research, school term dates, baby-name data, reading-level data, ` +
      `playground/safety data, museum/library events, public-domain children's literature, ` +
      `historical "this day in childhood/education history", etc. ` +
      `For each dataset give: the source + URL, access method (API / open data / scrape / public domain), ` +
      `update cadence, licensing/legal notes, and a concrete content format ("each row becomes a post ` +
      `that says X"). Rank by (engagement potential x feasibility x legal-safety).`,
  },
  {
    id: "03-formats-and-hooks",
    title: "Formats, hooks, and the engagement mechanics",
    user:
      CONTEXT +
      `\nQUESTION: For a parenting/childhood brand on Facebook + Instagram + TikTok + Pinterest in ${today.slice(0,4)}, ` +
      `what specific CONTENT FORMATS and HOOK patterns are actually driving organic reach right now ` +
      `(not generic advice)? Cover: which post types Facebook's algorithm currently favours for ` +
      `parenting pages, what makes parents comment vs just scroll, the role of "rage bait" vs ` +
      `"validation" vs "nostalgia", Pinterest's specific behaviour for printables/coloring/kids ` +
      `activities (this could be a sleeper channel for us), and how teachers discover/share resources. ` +
      `Give concrete hook templates and 2-3 real examples of accounts doing this well in the kids/parenting space.`,
  },
  {
    id: "04-competitive-and-risks",
    title: "Who's already winning, and the traps",
    user:
      CONTEXT +
      `\nQUESTION: Which parenting/kids/education brands or creators have grown large organic ` +
      `followings WITHOUT primarily promoting a product, and what exactly do they post? Name real ` +
      `accounts/pages and describe their content engine. Separately: what are the BRAND-SAFETY and ` +
      `reputational traps for a kids-app brand chasing engagement via outrage/news content ` +
      `(e.g. screen-time debate when we ARE a screen product, political/culture-war topics in ` +
      `education, child-safety panic content)? Where is the line between "drives debate" and ` +
      `"damages parent trust in a kids brand"? Give clear do/don't guidance.`,
  },
];

// Four tiers — the "different complexity models" sweep.
// We pair the harder questions with the heavier models.
const RUNS = [
  { model: "sonar", q: "01-news-veins" },
  { model: "sonar-pro", q: "01-news-veins" },
  { model: "sonar-pro", q: "02-scrapable-datasets" },
  { model: "sonar-deep-research", q: "02-scrapable-datasets" },
  { model: "sonar-pro", q: "03-formats-and-hooks" },
  { model: "sonar-reasoning-pro", q: "03-formats-and-hooks" },
  { model: "sonar-pro", q: "04-competitive-and-risks" },
  { model: "sonar-reasoning", q: "04-competitive-and-risks" },
];

const qById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

console.log(`Running ${RUNS.length} Perplexity queries across ${new Set(RUNS.map(r=>r.model)).size} model tiers...`);

const results = await Promise.all(
  RUNS.map(async (run) => {
    const q = qById[run.q];
    const started = Date.now();
    process.stdout.write(`  -> ${run.model} :: ${run.q}\n`);
    const r = await ask(run.model, ANALYST_SYSTEM, q.user);
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    process.stdout.write(`  <- ${run.model} :: ${run.q} (${secs}s)${r.error ? " ERROR" : ""}\n`);
    return { ...run, title: q.title, ...r, secs };
  }),
);

let md = `# Chunky Crayon — Organic Content Strategy Research\n\n`;
md += `Generated ${new Date().toISOString()} via multi-tier Perplexity sweep.\n\n`;
md += `Models used: ${[...new Set(RUNS.map((r) => r.model))].join(", ")}\n\n---\n\n`;

for (const q of QUESTIONS) {
  md += `# ${q.title}\n\n`;
  for (const r of results.filter((x) => x.q === q.id)) {
    md += `## [${r.model}] (${r.secs}s)\n\n`;
    if (r.error) {
      md += `> ERROR: ${r.error}\n\n`;
      continue;
    }
    md += r.content + "\n\n";
    if (r.citations?.length) {
      md += `**Sources:**\n` + r.citations.map((c, i) => `${i + 1}. ${c}`).join("\n") + "\n\n";
    }
    md += `---\n\n`;
  }
}

const outPath = path.resolve(__dirname, "cc-organic-content-research-output.md");
fs.writeFileSync(outPath, md);
console.log(`\nDone. Wrote ${md.length} chars to ${outPath}`);
