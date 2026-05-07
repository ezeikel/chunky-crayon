/**
 * Run the bundle QA gate against the 3 spike test pages.
 *
 * Validates that the QA judge correctly:
 *   - Passes page 1 (Rex solo, all signature details present)
 *   - Passes page 7 (Rex + Zip duo, signatures present)
 *   - FAILS page 10 (Spike heart plates lost, Zip wrist bands lost,
 *     hallucinated 5th character) — proves the gate would have caught it
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/test-bundle-qa-gate.ts \
 *     dotenv_config_path=.env.local
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  qaBundlePage,
  DINO_DANCE_PARTY,
} from '@one-colored-pixel/coloring-core';

const SPIKE_DIR = join(__dirname, 'out', 'spike-bundle-consistency');

function loadPng(filename: string): Buffer {
  return readFileSync(join(SPIKE_DIR, filename));
}

const HERO_REFS = [
  { heroId: 'rex', image: loadPng('hero_rex.png') },
  { heroId: 'spike', image: loadPng('hero_spike.png') },
  { heroId: 'zip', image: loadPng('hero_zip_v2.png') },
  { heroId: 'dots', image: loadPng('hero_dots_v3.png') },
];

function heroRefsFor(pageNumber: number) {
  const cast = DINO_DANCE_PARTY.pageCast[pageNumber] ?? [];
  return HERO_REFS.filter((r) => cast.includes(r.heroId));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const cases = [
    { page: 1, file: 'TEST_page1_rex_solo.png', expected: 'PASS' },
    { page: 7, file: 'TEST_page7_rex_zip.png', expected: 'PASS or marginal' },
    { page: 10, file: 'TEST_page10_full_crew.png', expected: 'FAIL' },
  ];

  for (const { page, file, expected } of cases) {
    console.log(`\n=== Page ${page} (${file}) — expected: ${expected} ===`);
    const start = Date.now();
    const result = await qaBundlePage(
      loadPng(file),
      DINO_DANCE_PARTY,
      page,
      heroRefsFor(page),
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `Verdict (${elapsed}s):`,
      result.passed ? '✅ PASS' : '❌ FAIL',
    );
    if (result.topIssue) console.log(`Top issue: ${result.topIssue}`);
    console.log(
      `Cast: expected ${result.expectedCastCount}, detected ${result.detectedCastCount}`,
    );
    if (result.hallucinatedCharacters.length > 0) {
      console.log(`Hallucinated: ${result.hallucinatedCharacters.join(', ')}`);
    }
    for (const hc of result.heroChecks) {
      const missing = hc.signatureDetails.filter((d) => !d.present);
      console.log(
        `  ${hc.heroId}: detected=${hc.detected}, missing details: ${missing.length === 0 ? 'none' : missing.map((m) => m.detail).join('; ')}`,
      );
    }
    if (result.anatomyIssues.length > 0) {
      console.log(
        `Anatomy issues: ${result.anatomyIssues.map((a) => `${a.animal} — ${a.issue}`).join(' | ')}`,
      );
    }
  }
}

main().catch((err) => {
  console.error('[qa-test]', err);
  process.exit(1);
});
