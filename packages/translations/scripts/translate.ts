#!/usr/bin/env npx tsx

/**
 * Translation Script for Chunky Crayon
 *
 * Uses AI SDK with GPT-5.2 to translate English strings to all supported languages.
 * Translates full files by namespace chunks for reliability.
 *
 * Usage:
 *   pnpm tsx scripts/translate.ts           # Translate all locales
 *   pnpm tsx scripts/translate.ts --locale=ja  # Single locale
 *   pnpm tsx scripts/translate.ts --dry-run    # Preview without saving
 *
 * Requires: OPENAI_API_KEY environment variable
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in apps/web
dotenv.config({ path: path.join(__dirname, '..', '..', '..', 'apps', 'web', '.env.local') });

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as fs from 'fs/promises';

// Translation target locales
const LOCALES = [
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
] as const;

type LocaleCode = (typeof LOCALES)[number]['code'];

// Path to translation files
const SRC_DIR = path.join(__dirname, '..', 'src');

const TRANSLATION_PROMPT = `You are a professional translator for a children's coloring app called "Chunky Crayon".

Context:
- Target audience: Parents of children aged 3-8
- Tone: Friendly, playful, encouraging, magical
- Brand voice: Creative, fun, child-safe
- App features: AI-generated coloring pages, digital coloring tools, sticker collection

Rules:
1. Maintain the EXACT JSON structure and keys - only translate the string values
2. NEVER translate or modify the keys, only the values
3. Use culturally appropriate language for {{TARGET_LANGUAGE}} speakers
4. Keep translations concise (UI space is limited)
5. Preserve any {placeholders} and {count, plural, ...} ICU syntax EXACTLY as-is
6. For children's app context, use warm and encouraging language
7. Maintain brand name "Chunky Crayon" without translation
8. For color names, use common {{TARGET_LANGUAGE}} equivalents that children would understand
9. Return ONLY valid JSON, no markdown code blocks or explanations

Target Language: {{TARGET_LANGUAGE}} ({{NATIVE_NAME}})

Translate the following JSON from English to {{TARGET_LANGUAGE}}:

{{JSON_CONTENT}}`;

/**
 * Validate that translated JSON has the same structure as the source
 */
function validateTranslationKeys(
  source: Record<string, unknown>,
  translated: Record<string, unknown>,
  locale: string,
  keyPath = '',
): string[] {
  const errors: string[] = [];

  const sourceKeys = Object.keys(source);
  const translatedKeys = Object.keys(translated);

  // Check for missing keys
  for (const key of sourceKeys) {
    if (!translatedKeys.includes(key)) {
      errors.push(`Missing key: ${keyPath}${key} in ${locale}`);
    }
  }

  // Check for extra keys
  for (const key of translatedKeys) {
    if (!sourceKeys.includes(key)) {
      errors.push(`Extra key: ${keyPath}${key} in ${locale}`);
    }
  }

  // Recursively check nested objects
  for (const key of sourceKeys) {
    if (translatedKeys.includes(key)) {
      const sourceValue = source[key];
      const translatedValue = translated[key];

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        typeof translatedValue === 'object' &&
        translatedValue !== null
      ) {
        errors.push(
          ...validateTranslationKeys(
            sourceValue as Record<string, unknown>,
            translatedValue as Record<string, unknown>,
            locale,
            `${keyPath}${key}.`,
          ),
        );
      }
    }
  }

  return errors;
}

/**
 * Translate a namespace chunk using structured JSON output
 * Uses AI SDK's generateObject with JSON mode for reliable parsing
 */
async function translateChunk(
  chunk: Record<string, unknown>,
  targetLanguage: string,
  nativeName: string,
  model: string,
): Promise<Record<string, unknown>> {
  const prompt = TRANSLATION_PROMPT.replace(/\{\{TARGET_LANGUAGE\}\}/g, targetLanguage)
    .replace(/\{\{NATIVE_NAME\}\}/g, nativeName)
    .replace('{{JSON_CONTENT}}', JSON.stringify(chunk, null, 2));

  // Use generateObject with 'json' output mode for structured JSON response
  // This ensures we always get valid JSON back without needing to parse text
  const { object } = await generateObject({
    model: openai(model, { structuredOutputs: true }),
    prompt,
    output: 'no-schema', // JSON mode without strict schema - mirrors input structure
    maxOutputTokens: 16000,
    temperature: 0.3, // Lower temperature for more consistent translations
  });

  return object as Record<string, unknown>;
}

/**
 * Translate all strings to a target locale
 */
async function translateToLocale(
  englishStrings: Record<string, unknown>,
  locale: LocaleCode,
  targetLanguage: string,
  nativeName: string,
  model: string,
): Promise<Record<string, unknown>> {
  console.log(`\n📝 Translating to ${targetLanguage} (${nativeName})...`);
  console.log(`   Using model: ${model}`);

  // For large translation files, we can split by top-level namespace
  // to stay within token limits
  const namespaces = Object.keys(englishStrings);
  const translated: Record<string, unknown> = {};

  for (let i = 0; i < namespaces.length; i++) {
    const namespace = namespaces[i];
    const chunk = { [namespace]: englishStrings[namespace] };

    process.stdout.write(
      `   Translating ${namespace}... (${i + 1}/${namespaces.length})\r`,
    );

    try {
      const translatedChunk = await translateChunk(
        chunk,
        targetLanguage,
        nativeName,
        model,
      );
      translated[namespace] = translatedChunk[namespace];
    } catch (error) {
      console.error(`\n   ❌ Error translating ${namespace}:`, error);
      throw error;
    }
  }

  console.log(`   ✅ Translation complete for ${targetLanguage}`);

  return translated;
}

/**
 * Main translation function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const singleLocale = args.find((a) => a.startsWith('--locale='))?.split('=')[1] as
    | LocaleCode
    | undefined;

  // Model selection - GPT-5.2 is the latest flagship model
  const model = process.env.TRANSLATION_MODEL || 'gpt-5.2';

  console.log('🖍️  Chunky Crayon Translation Script');
  console.log('=====================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - no files will be saved\n');
  }

  // Load English source
  const enPath = path.join(SRC_DIR, 'en.json');
  const enContent = await fs.readFile(enPath, 'utf-8');
  const enStrings = JSON.parse(enContent);

  console.log(`📖 Loaded English source: ${Object.keys(enStrings).length} namespaces`);

  // Filter locales if single locale specified
  const localesToTranslate = singleLocale
    ? LOCALES.filter((l) => l.code === singleLocale)
    : LOCALES;

  if (localesToTranslate.length === 0) {
    console.error(`❌ Unknown locale: ${singleLocale}`);
    process.exit(1);
  }

  // Translate each locale
  for (const locale of localesToTranslate) {
    try {
      const translated = await translateToLocale(
        enStrings,
        locale.code,
        locale.name,
        locale.nativeName,
        model,
      );

      // Validate structure
      const errors = validateTranslationKeys(enStrings, translated, locale.code);
      if (errors.length > 0) {
        console.warn(`   ⚠️  Validation warnings for ${locale.code}:`);
        errors.forEach((e) => console.warn(`      - ${e}`));
      }

      // Save translation
      if (!dryRun) {
        const outputPath = path.join(SRC_DIR, `${locale.code}.json`);
        await fs.writeFile(outputPath, JSON.stringify(translated, null, 2) + '\n');
        console.log(`   💾 Saved to ${outputPath}`);
      } else {
        console.log(`   📋 Would save to ${locale.code}.json (dry run)`);
      }
    } catch (error) {
      console.error(`\n❌ Failed to translate ${locale.name}:`, error);
      // Continue with other locales
    }
  }

  console.log('\n✨ Translation complete!');
  console.log('\nNext steps:');
  console.log('  1. Review translations for quality');
  console.log('  2. Run: pnpm tsx scripts/audit-translations.ts');
  console.log('  3. Commit the changes');
}

main().catch(console.error);
