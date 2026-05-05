#!/usr/bin/env npx tsx

/**
 * Incremental Translation Script for Chunky Crayon
 *
 * Translates only missing or changed keys instead of the entire file.
 * Much faster and cheaper than full translation.
 *
 * Usage:
 *   pnpm tsx scripts/translate-diff.ts           # Translate missing keys
 *   pnpm tsx scripts/translate-diff.ts --dry-run # Preview without saving
 *
 * Requires: OPENAI_API_KEY environment variable
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in apps/web
dotenv.config({
  path: path.join(
    __dirname,
    "..",
    "..",
    "..",
    "apps",
    "chunky-crayon-web",
    ".env.local",
  ),
});

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import * as fs from "fs/promises";

// Import locales from central config
import { LOCALES } from "../src/locales.js";

// Path to translation files
const SRC_DIR = path.join(__dirname, "..", "src");

const TRANSLATION_PROMPT = `You are a professional translator for a digital coloring application.

Context:
- These are shared UI strings used across multiple coloring apps
- Tone: Clear, neutral, professional
- Content includes: navigation labels, tool names, color names, common UI elements

You are translating specific keys that are missing from the {{TARGET_LANGUAGE}} translation.
Each key is provided with its namespace context to help you understand where it's used.

Rules:
1. Return a JSON object with the EXACT same keys, translated values
2. NEVER translate or modify the keys, only the values
3. Use culturally appropriate language for {{TARGET_LANGUAGE}} speakers
4. Keep translations concise (UI space is limited)
5. Preserve any {placeholders} and {count, plural, ...} ICU syntax EXACTLY as-is
6. Use clear, universally understood language suitable for all ages
7. For color names, use common {{TARGET_LANGUAGE}} equivalents
8. NEVER introduce "AI", "artificial intelligence", or their {{TARGET_LANGUAGE}} equivalents (e.g. "IA" in French/Spanish, "KI" in German, "AI"/"人工知能" in Japanese, "AI"/"인공지능" in Korean) into the translated value, even if the key name suggests AI (e.g. "aiCreation"). Key names are internal identifiers — translate the English value as-is, describing the outcome rather than the technology. Parents are AI-skeptical; we lead with what the product does, not how.
9. Return ONLY valid JSON, no markdown code blocks or explanations

Target Language: {{TARGET_LANGUAGE}} ({{NATIVE_NAME}})

Translate these keys:
{{JSON_CONTENT}}`;

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
 * Find missing keys in target locale compared to source
 */
function findMissingKeys(
  sourceKeys: Map<string, string>,
  targetKeys: Map<string, string>,
): Map<string, string> {
  const missing = new Map<string, string>();

  for (const [key, value] of sourceKeys) {
    if (!targetKeys.has(key)) {
      missing.set(key, value);
    }
  }

  return missing;
}

/**
 * Group keys by their top-level namespace for better context
 */
function groupByNamespace(
  keys: Map<string, string>,
): Map<string, Record<string, string>> {
  const grouped = new Map<string, Record<string, string>>();

  for (const [key, value] of keys) {
    const namespace = key.split(".")[0];
    if (!grouped.has(namespace)) {
      grouped.set(namespace, {});
    }
    grouped.get(namespace)![key] = value;
  }

  return grouped;
}

/**
 * Translate a batch of missing keys
 */
async function translateMissingKeys(
  keys: Record<string, string>,
  targetLanguage: string,
  nativeName: string,
  model: string,
): Promise<Record<string, string>> {
  const prompt = TRANSLATION_PROMPT.replace(
    /\{\{TARGET_LANGUAGE\}\}/g,
    targetLanguage,
  )
    .replace(/\{\{NATIVE_NAME\}\}/g, nativeName)
    .replace("{{JSON_CONTENT}}", JSON.stringify(keys, null, 2));

  const { object } = await generateObject({
    model: openai(model, { structuredOutputs: true }),
    prompt,
    output: "no-schema",
    maxOutputTokens: 8000,
    temperature: 0.3,
  });

  return object as Record<string, string>;
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
 * Merge translated keys into existing translation object
 */
function mergeTranslations(
  existing: TranslationObject,
  translated: Record<string, string>,
): TranslationObject {
  const result = JSON.parse(JSON.stringify(existing)); // Deep clone

  for (const [key, value] of Object.entries(translated)) {
    setNestedValue(result, key, value);
  }

  return result;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const model = process.env.TRANSLATION_MODEL || "gpt-5.2";

  console.log("🖍️  Chunky Crayon Incremental Translation");
  console.log("==========================================\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - no files will be saved\n");
  }

  // Load English source
  const enPath = path.join(SRC_DIR, "en.json");
  const enContent = await fs.readFile(enPath, "utf-8");
  const enStrings: TranslationObject = JSON.parse(enContent);
  const enKeys = flattenKeys(enStrings);

  console.log(`📖 English source: ${enKeys.size} total keys\n`);

  let totalTranslated = 0;

  for (const locale of LOCALES) {
    const localePath = path.join(SRC_DIR, `${locale.code}.json`);

    let existingStrings: TranslationObject = {};
    try {
      const content = await fs.readFile(localePath, "utf-8");
      existingStrings = JSON.parse(content);
    } catch {
      console.log(`📝 ${locale.name}: No existing file, will create new`);
    }

    const existingKeys = flattenKeys(existingStrings);
    const missingKeys = findMissingKeys(enKeys, existingKeys);

    if (missingKeys.size === 0) {
      console.log(
        `✅ ${locale.name}: All keys present (${existingKeys.size}/${enKeys.size})`,
      );
      continue;
    }

    console.log(`\n📝 ${locale.name}: ${missingKeys.size} missing keys`);

    // Group by namespace for better context in translation
    const grouped = groupByNamespace(missingKeys);
    const allTranslated: Record<string, string> = {};

    for (const [namespace, keys] of grouped) {
      const keyCount = Object.keys(keys).length;
      process.stdout.write(`   Translating ${namespace} (${keyCount} keys)...`);

      try {
        const translated = await translateMissingKeys(
          keys,
          locale.name,
          locale.nativeName,
          model,
        );

        Object.assign(allTranslated, translated);
        console.log(" ✅");
      } catch (error) {
        console.log(" ❌");
        console.error(`   Error: ${error}`);
      }
    }

    if (Object.keys(allTranslated).length > 0) {
      const merged = mergeTranslations(existingStrings, allTranslated);
      totalTranslated += Object.keys(allTranslated).length;

      if (!dryRun) {
        await fs.writeFile(localePath, JSON.stringify(merged, null, 2) + "\n");
        console.log(
          `   💾 Saved ${Object.keys(allTranslated).length} translations to ${locale.code}.json`,
        );
      } else {
        console.log(
          `   📋 Would save ${Object.keys(allTranslated).length} translations (dry run)`,
        );
      }
    }
  }

  console.log("\n==========================================");
  if (totalTranslated > 0) {
    console.log(`✨ Translated ${totalTranslated} keys across all locales`);
  } else {
    console.log("✨ All translations are up to date!");
  }
}

main().catch(console.error);
