#!/usr/bin/env npx tsx

/**
 * Translation Audit Script
 *
 * Compares translation files across locales to find:
 * - Missing keys in non-English locales
 * - Extra keys in non-English locales (not in English)
 * - Untranslated values (still matching English)
 *
 * Usage: pnpm tsx scripts/audit-translations.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import locales from central config
import { ALL_LOCALE_CODES, SOURCE_LOCALE } from "../src/locales.js";

const SRC_DIR = path.join(__dirname, "..", "src");

type TranslationValue = string | Record<string, unknown>;
type TranslationObject = Record<string, TranslationValue>;

function loadTranslations(locale: string): TranslationObject {
  const filePath = path.join(SRC_DIR, `${locale}.json`);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

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

function compareTranslations(
  sourceKeys: Map<string, string>,
  targetKeys: Map<string, string>,
  locale: string,
): {
  missing: string[];
  extra: string[];
  untranslated: string[];
} {
  const missing: string[] = [];
  const extra: string[] = [];
  const untranslated: string[] = [];

  // Find missing keys
  for (const [key, sourceValue] of sourceKeys) {
    if (!targetKeys.has(key)) {
      missing.push(key);
    } else {
      // Check if value is untranslated (matches English exactly)
      const targetValue = targetKeys.get(key)!;
      // Skip if it's a technical value (URLs, numbers, etc.)
      if (
        sourceValue === targetValue &&
        !sourceValue.startsWith("http") &&
        !sourceValue.startsWith("/") &&
        !/^\d+$/.test(sourceValue) &&
        sourceValue.length > 3 // Skip short strings like "OK", "PDF"
      ) {
        untranslated.push(key);
      }
    }
  }

  // Find extra keys
  for (const key of targetKeys.keys()) {
    if (!sourceKeys.has(key)) {
      extra.push(key);
    }
  }

  return { missing, extra, untranslated };
}

function printResults(
  locale: string,
  results: {
    missing: string[];
    extra: string[];
    untranslated: string[];
  },
): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`LOCALE: ${locale.toUpperCase()}`);
  console.log("=".repeat(60));

  if (results.missing.length === 0 && results.extra.length === 0) {
    console.log("All keys are present.");
  }

  if (results.missing.length > 0) {
    console.log(`\nMISSING KEYS (${results.missing.length}):`);
    results.missing.slice(0, 20).forEach((key) => console.log(`  - ${key}`));
    if (results.missing.length > 20) {
      console.log(`  ... and ${results.missing.length - 20} more`);
    }
  }

  if (results.extra.length > 0) {
    console.log(`\nEXTRA KEYS (${results.extra.length}):`);
    results.extra.slice(0, 10).forEach((key) => console.log(`  - ${key}`));
    if (results.extra.length > 10) {
      console.log(`  ... and ${results.extra.length - 10} more`);
    }
  }

  if (results.untranslated.length > 0) {
    console.log(`\nPOTENTIALLY UNTRANSLATED (${results.untranslated.length}):`);
    console.log("  (These match English exactly - may need review)");
    results.untranslated
      .slice(0, 10)
      .forEach((key) => console.log(`  - ${key}`));
    if (results.untranslated.length > 10) {
      console.log(`  ... and ${results.untranslated.length - 10} more`);
    }
  }
}

function main(): void {
  console.log("Translation Audit Report");
  console.log("========================\n");
  console.log(`Source locale: ${SOURCE_LOCALE}`);
  console.log(
    `Target locales: ${ALL_LOCALE_CODES.filter((l) => l !== SOURCE_LOCALE).join(", ")}`,
  );

  const sourceTranslations = loadTranslations(SOURCE_LOCALE);
  const sourceKeys = flattenKeys(sourceTranslations);
  console.log(`\nTotal keys in source: ${sourceKeys.size}`);

  let totalMissing = 0;
  let totalExtra = 0;
  let totalUntranslated = 0;

  for (const locale of ALL_LOCALE_CODES) {
    if (locale === SOURCE_LOCALE) continue;

    try {
      const targetTranslations = loadTranslations(locale);
      const targetKeys = flattenKeys(targetTranslations);
      const results = compareTranslations(sourceKeys, targetKeys, locale);

      totalMissing += results.missing.length;
      totalExtra += results.extra.length;
      totalUntranslated += results.untranslated.length;

      printResults(locale, results);
    } catch (error) {
      console.error(`\nError loading ${locale}: ${error}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total missing keys across all locales: ${totalMissing}`);
  console.log(`Total extra keys across all locales: ${totalExtra}`);
  console.log(`Total potentially untranslated: ${totalUntranslated}`);

  if (totalMissing > 0) {
    console.log("\nAction required: Add missing translations.");
    process.exit(1);
  } else {
    console.log("\nAll translations are in sync!");
  }
}

main();
