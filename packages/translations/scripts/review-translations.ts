#!/usr/bin/env npx tsx

/**
 * Agentic Translation Quality Review Script
 *
 * Uses Claude to review translations and AUTO-FIX issues:
 * - Reviews for fluency, tone, UI fit, consistency, accuracy
 * - Auto-fixes warnings and suggestions (safe changes)
 * - Flags critical issues for human review
 *
 * Cross-model review: GPT-5.2 translated, Claude reviews and fixes.
 *
 * Usage:
 *   pnpm review                    # Review all locales, auto-fix
 *   pnpm review --locale=ja        # Single locale
 *   pnpm review --dry-run          # Review only, don't save fixes
 *   pnpm review --fix-critical     # Also auto-fix critical (risky!)
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: path.join(__dirname, "..", "..", "..", "apps", "web", ".env.local"),
});

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";

const anthropic = new Anthropic();

// Locales to review
const LOCALES = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

const SRC_DIR = path.join(__dirname, "..", "src");

// Issue severity levels
type Severity = "critical" | "warning" | "suggestion";

interface ReviewIssue {
  severity: Severity;
  key: string;
  english: string;
  current: string;
  issue: string;
  suggested?: string;
  category: "fluency" | "tone" | "ui" | "consistency" | "accuracy";
}

interface LocaleReview {
  locale: LocaleCode;
  localeName: string;
  reviewedAt: string;
  totalKeys: number;
  sampledKeys: number;
  issues: ReviewIssue[];
  fixed: ReviewIssue[];
  flaggedForHuman: ReviewIssue[];
  scores: {
    fluency: number;
    tone: number;
    consistency: number;
    overall: number;
  };
}

type TranslationValue = string | Record<string, unknown>;
type TranslationObject = Record<string, TranslationValue>;

/**
 * Flatten nested object to dot-notation keys
 */
function flattenKeys(obj: TranslationObject, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.set(fullKey, value);
    } else if (typeof value === "object" && value !== null) {
      const nested = flattenKeys(value as TranslationObject, fullKey);
      for (const [nestedKey, nestedValue] of nested) {
        result.set(nestedKey, nestedValue);
      }
    }
  }

  return result;
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(
  obj: TranslationObject,
  path: string,
  value: string,
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Sample keys for review (prioritize UI-facing strings)
 */
function sampleKeysForReview(
  keys: Map<string, string>,
  maxSamples: number = 200,
): Map<string, string> {
  const entries = Array.from(keys.entries());

  // Priority namespaces (user-facing)
  const priorityPrefixes = [
    "home.",
    "gallery.",
    "coloringPage.",
    "pricing.",
    "common.",
    "errors.",
    "auth.",
  ];

  // Sort by priority
  const prioritized = entries.sort((a, b) => {
    const aPriority = priorityPrefixes.findIndex((p) => a[0].startsWith(p));
    const bPriority = priorityPrefixes.findIndex((p) => b[0].startsWith(p));

    if (aPriority !== -1 && bPriority === -1) return -1;
    if (aPriority === -1 && bPriority !== -1) return 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a[0].localeCompare(b[0]);
  });

  const sampled = new Map<string, string>();
  for (const [key, value] of prioritized.slice(0, maxSamples)) {
    sampled.set(key, value);
  }

  return sampled;
}

/**
 * Build review prompt for Claude
 */
function buildReviewPrompt(
  locale: { code: string; name: string; nativeName: string },
  translations: Record<string, { en: string; translated: string }>,
): string {
  return `You are a native ${locale.name} (${locale.nativeName}) speaker and professional translator reviewing translations for a children's coloring app called "Chunky Crayon".

## App Context
- Target audience: Parents of children aged 3-8
- Tone should be: Friendly, playful, encouraging, magical
- Brand voice: Creative, fun, child-safe
- "Chunky Crayon" is the brand name and should NOT be translated

## Your Review Task
Review each translation for:

1. **Fluency** - Does it sound natural to a native ${locale.name} speaker? Would a real person say this?
2. **Tone** - Is it appropriate for a children's app? Is it warm and encouraging, not cold or formal?
3. **UI Fit** - Is the text concise enough for buttons, labels, and mobile UI? (max ~40 chars for buttons)
4. **Consistency** - Are similar concepts translated the same way throughout?
5. **Accuracy** - Does it convey the same meaning as the English?

## IMPORTANT: Provide Fixes
For EVERY issue you find, you MUST provide a "suggested" fix. The system will automatically apply your suggestions for warnings and minor issues.

## IMPORTANT: Write Issues in English
The "issue" field MUST be in English so developers can understand the reasoning. Only the "suggested" fix should be in ${locale.name}.

## Translations to Review
${JSON.stringify(translations, null, 2)}

## Response Format
Return a JSON object with this exact structure:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "key": "the.translation.key",
      "english": "original English text",
      "current": "current translation",
      "issue": "description of the problem IN ENGLISH (so developers can understand)",
      "suggested": "the corrected translation - REQUIRED for all issues",
      "category": "fluency" | "tone" | "ui" | "consistency" | "accuracy"
    }
  ],
  "scores": {
    "fluency": 0-100,
    "tone": 0-100,
    "consistency": 0-100,
    "overall": 0-100
  },
  "summary": "Brief overall assessment in 1-2 sentences"
}

Severity guidelines:
- **critical**: Wrong meaning, offensive, or completely unnatural - needs human review
- **warning**: Awkward phrasing, tone issues, or too long for UI - safe to auto-fix
- **suggestion**: Minor improvements for polish - safe to auto-fix

Be thorough but fair. Not every translation needs an issue. Focus on real problems.

Return ONLY valid JSON, no markdown code blocks.`;
}

/**
 * Review translations for a single locale using Claude
 */
async function reviewLocale(
  enKeys: Map<string, string>,
  targetKeys: Map<string, string>,
  locale: (typeof LOCALES)[number],
): Promise<{
  issues: ReviewIssue[];
  scores: {
    fluency: number;
    tone: number;
    consistency: number;
    overall: number;
  };
}> {
  console.log(`\n📝 Reviewing ${locale.name} (${locale.nativeName})...`);

  const sampledEnKeys = sampleKeysForReview(enKeys);
  console.log(`   Sampling ${sampledEnKeys.size} of ${enKeys.size} keys`);

  const translations: Record<string, { en: string; translated: string }> = {};
  for (const [key, enValue] of sampledEnKeys) {
    const translatedValue = targetKeys.get(key);
    if (translatedValue) {
      translations[key] = {
        en: enValue,
        translated: translatedValue,
      };
    }
  }

  const prompt = buildReviewPrompt(locale, translations);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  const result = JSON.parse(content.text);
  console.log(
    `   ✅ Review complete: ${result.issues?.length || 0} issues found`,
  );

  return {
    issues: result.issues || [],
    scores: result.scores || {
      fluency: 0,
      tone: 0,
      consistency: 0,
      overall: 0,
    },
  };
}

/**
 * Apply fixes to translation object
 */
function applyFixes(
  translations: TranslationObject,
  issues: ReviewIssue[],
  fixCritical: boolean,
): { fixed: ReviewIssue[]; flagged: ReviewIssue[] } {
  const fixed: ReviewIssue[] = [];
  const flagged: ReviewIssue[] = [];

  for (const issue of issues) {
    // Skip if no suggested fix
    if (!issue.suggested) {
      flagged.push(issue);
      continue;
    }

    // Critical issues need human review unless --fix-critical
    if (issue.severity === "critical" && !fixCritical) {
      flagged.push(issue);
      continue;
    }

    // Apply the fix
    try {
      setNestedValue(translations, issue.key, issue.suggested);
      fixed.push(issue);
    } catch (error) {
      console.error(`   ⚠️ Failed to apply fix for ${issue.key}:`, error);
      flagged.push(issue);
    }
  }

  return { fixed, flagged };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(
  reviews: LocaleReview[],
  dryRun: boolean,
): string {
  const date = new Date().toISOString().split("T")[0];

  let report = `# Translation Quality Review - ${date}\n\n`;
  report += dryRun
    ? `**DRY RUN** - No changes were saved.\n\n`
    : `Auto-fixed issues have been applied to translation files.\n\n`;

  // Summary table
  report += `## Summary\n\n`;
  report += `| Language | Overall | Fixed | Needs Human Review |\n`;
  report += `|----------|---------|-------|--------------------|\n`;

  for (const review of reviews) {
    const needsHuman = review.flaggedForHuman.length;
    const statusEmoji =
      needsHuman > 0 ? "🔴" : review.fixed.length > 0 ? "🟡" : "🟢";
    report += `| ${review.localeName} | ${review.scores.overall}% | ✅ ${review.fixed.length} | ${statusEmoji} ${needsHuman} |\n`;
  }

  // Details per locale
  for (const review of reviews) {
    report += `\n---\n\n## ${review.localeName} (${review.locale})\n\n`;

    if (review.fixed.length > 0) {
      report += `### ✅ Auto-Fixed (${review.fixed.length})\n\n`;
      report += `| Key | Before | After | Why |\n`;
      report += `|-----|--------|-------|-----|\n`;
      for (const issue of review.fixed.slice(0, 20)) {
        const before = issue.current.replace(/\|/g, "\\|").substring(0, 30);
        const after = (issue.suggested || "")
          .replace(/\|/g, "\\|")
          .substring(0, 30);
        report += `| \`${issue.key}\` | ${before} | ${after} | ${issue.issue} |\n`;
      }
      if (review.fixed.length > 20) {
        report += `\n*...and ${review.fixed.length - 20} more fixes*\n`;
      }
      report += `\n`;
    }

    if (review.flaggedForHuman.length > 0) {
      report += `### 🔴 Needs Human Review (${review.flaggedForHuman.length})\n\n`;
      report += `These issues are critical or couldn't be auto-fixed:\n\n`;
      report += `| Key | Current | Issue | Suggested |\n`;
      report += `|-----|---------|-------|----------|\n`;
      for (const issue of review.flaggedForHuman) {
        const current = issue.current.replace(/\|/g, "\\|").substring(0, 30);
        const suggested = (issue.suggested || "-")
          .replace(/\|/g, "\\|")
          .substring(0, 30);
        report += `| \`${issue.key}\` | ${current} | ${issue.issue} | ${suggested} |\n`;
      }
      report += `\n`;
    }

    if (review.fixed.length === 0 && review.flaggedForHuman.length === 0) {
      report += `✨ No issues found! Translations look great.\n\n`;
    }
  }

  report += `---\n*Generated by agentic translation review using Claude Sonnet*\n`;
  return report;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const singleLocale = args
    .find((a) => a.startsWith("--locale="))
    ?.split("=")[1] as LocaleCode | undefined;
  const dryRun = args.includes("--dry-run");
  const fixCritical = args.includes("--fix-critical");

  console.log("🖍️  Chunky Crayon Agentic Translation Review");
  console.log("============================================\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - no files will be saved\n");
  } else {
    console.log("🤖 AGENTIC MODE - will auto-fix warnings and suggestions\n");
  }

  if (fixCritical) {
    console.log(
      "⚠️  --fix-critical enabled - critical issues will also be auto-fixed\n",
    );
  }

  // Load English source
  const enPath = path.join(SRC_DIR, "en.json");
  const enContent = await fs.readFile(enPath, "utf-8");
  const enStrings: TranslationObject = JSON.parse(enContent);
  const enKeys = flattenKeys(enStrings);

  console.log(`📖 English source: ${enKeys.size} total keys`);

  const localesToReview = singleLocale
    ? LOCALES.filter((l) => l.code === singleLocale)
    : LOCALES;

  if (localesToReview.length === 0) {
    console.error(`❌ Unknown locale: ${singleLocale}`);
    process.exit(1);
  }

  const reviews: LocaleReview[] = [];
  let totalFixed = 0;
  let totalFlagged = 0;

  for (const locale of localesToReview) {
    try {
      const localePath = path.join(SRC_DIR, `${locale.code}.json`);
      const content = await fs.readFile(localePath, "utf-8");
      const targetStrings: TranslationObject = JSON.parse(content);
      const targetKeys = flattenKeys(targetStrings);

      // Review with Claude
      const { issues, scores } = await reviewLocale(enKeys, targetKeys, locale);

      // Apply fixes
      const { fixed, flagged } = applyFixes(targetStrings, issues, fixCritical);

      console.log(
        `   🔧 Auto-fixed: ${fixed.length}, Needs human: ${flagged.length}`,
      );

      // Save if not dry run and there are fixes
      if (!dryRun && fixed.length > 0) {
        await fs.writeFile(
          localePath,
          JSON.stringify(targetStrings, null, 2) + "\n",
        );
        console.log(`   💾 Saved fixes to ${locale.code}.json`);
      }

      totalFixed += fixed.length;
      totalFlagged += flagged.length;

      reviews.push({
        locale: locale.code,
        localeName: locale.name,
        reviewedAt: new Date().toISOString(),
        totalKeys: enKeys.size,
        sampledKeys: 200,
        issues,
        fixed,
        flaggedForHuman: flagged,
        scores,
      });
    } catch (error) {
      console.error(`\n❌ Failed to review ${locale.name}:`, error);
    }
  }

  // Generate report
  const report = generateMarkdownReport(reviews, dryRun);
  const reportDir = path.join(__dirname, "..", "reports");
  await fs.mkdir(reportDir, { recursive: true });

  const date = new Date().toISOString().split("T")[0];
  const reportPath = path.join(reportDir, `review-${date}.md`);
  await fs.writeFile(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Summary
  console.log("\n============================================");
  console.log("Review Complete:");
  console.log(`  ✅ Auto-fixed: ${totalFixed} issues`);
  console.log(`  🔴 Needs human review: ${totalFlagged} issues`);

  for (const review of reviews) {
    const emoji = review.flaggedForHuman.length > 0 ? "🔴" : "🟢";
    console.log(
      `  ${emoji} ${review.localeName}: ${review.scores.overall}% overall`,
    );
  }

  // Exit with error if there are issues needing human review
  if (totalFlagged > 0) {
    console.log("\n⚠️  Some issues need human review - check the report!");
    process.exit(1);
  }

  console.log("\n✨ All issues auto-fixed!");
}

main().catch(console.error);
