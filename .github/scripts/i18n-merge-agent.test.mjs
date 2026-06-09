// @ts-check
/**
 * Tests for the i18n-merge-agent's pure decision logic. Run with:
 *   node --test .github/scripts/i18n-merge-agent.test.mjs
 *
 * These guard the gate logic that decides whether a translation PR is safe to
 * merge unattended — each case below corresponds to a real bug found while
 * testing the agent against the live backlog (over-strict key parity,
 * false-positive AI scan on French "ai"/"essaie", false-positive em-dash scan,
 * and the array→object flatten mismatch on pricing `features`). The agent is
 * structured so these can be imported and exercised in isolation.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenKeys,
  collectValues,
  findAiTerm,
  expectedFile,
  BRANCH_RE,
} from './i18n-merge-agent.mjs';

test('BRANCH_RE parses real review branch names', () => {
  for (const [branch, locale, source] of [
    ['i18n/review-ja-shared-2026-06-08', 'ja', 'shared'],
    ['i18n/review-fr-cc-2026-06-08', 'fr', 'cc'],
    ['i18n/review-zh-Hans-cm-2026-06-09', 'zh-Hans', 'cm'],
    ['i18n/review-zh-Hant-ch-2026-06-09', 'zh-Hant', 'ch'],
  ]) {
    const m = branch.match(BRANCH_RE);
    assert.ok(m, `${branch} should match`);
    assert.equal(m[1], locale);
    assert.equal(m[2], source);
  }
  assert.equal('i18n/review-fr-bogus-2026-06-08'.match(BRANCH_RE), null);
  assert.equal('feature/whatever'.match(BRANCH_RE), null);
});

test('expectedFile maps source+locale to the right path', () => {
  assert.equal(expectedFile('shared', 'zh-Hans'), 'packages/translations/src/zh-Hans.json');
  assert.equal(expectedFile('cc', 'fr'), 'apps/chunky-crayon-web/messages/fr.json');
  assert.equal(expectedFile('ch', 'zh-Hant'), 'apps/coloring-habitat-web/messages/zh-Hant.json');
  assert.equal(expectedFile('cm', 'ja'), 'apps/chunky-crayon-mobile/messages/ja.json');
});

test('flattenKeys treats arrays and objects identically (features array→object)', () => {
  // en uses an array; the translate script emits an object — they must compare equal.
  const en = { pricing: { plan: { features: ['a', 'b', 'c'] } } };
  const translated = { pricing: { plan: { features: { 0: 'x', 1: 'y', 2: 'z' } } } };
  const enKeys = flattenKeys(en);
  const tKeys = flattenKeys(translated);
  const missing = [...enKeys].filter((k) => !tKeys.has(k));
  assert.deepEqual(missing, [], 'array vs object should not produce missing keys');
  assert.ok(enKeys.has('pricing.plan.features.0'));
});

test('flattenKeys catches a genuinely missing key', () => {
  const en = flattenKeys({ a: '1', b: { c: '2' } });
  const t = flattenKeys({ a: '1', b: {} });
  const missing = [...en].filter((k) => !t.has(k));
  assert.deepEqual(missing, ['b.c']);
});

test('collectValues recurses into arrays', () => {
  const vals = collectValues({ a: 'one', b: { c: 'two' }, d: ['three', 'four'] });
  assert.deepEqual(vals.sort(), ['four', 'one', 'three', 'two']);
});

test('findAiTerm does NOT false-positive on ordinary French words', () => {
  // "ai" (have), "essaie", "vrai" all contain the substring "ai".
  for (const v of [
    "On essaie de ne pas dépasser",
    "j'ai créé un dessin",
    "C'est vraiment magique",
    "On taille les crayons",
  ]) {
    assert.equal(findAiTerm(v, 'fr'), null, `should be clean: ${v}`);
  }
});

test('findAiTerm catches real AI acronym usage (case-sensitive, standalone)', () => {
  assert.equal(findAiTerm('Made with AI magic', 'en'), 'AI');
  assert.equal(findAiTerm('Propulsé par IA', 'fr'), 'IA');
  assert.equal(findAiTerm('Mit KI erstellt', 'de'), 'KI');
  assert.equal(findAiTerm('artificial intelligence inside', 'en'), 'artificial intelligence');
});

test('findAiTerm catches CJK AI forms', () => {
  assert.equal(findAiTerm('使用人工智能生成', 'zh-Hans'), '人工智能');
  assert.equal(findAiTerm('使用人工智慧生成', 'zh-Hant'), '人工智慧');
  assert.equal(findAiTerm('人工知能で作成', 'ja'), '人工知能');
  assert.equal(findAiTerm('인공지능으로 제작', 'ko'), '인공지능');
});

test('findAiTerm does NOT match KI inside a German word', () => {
  // "Kind" (child), "Kreativ" — must not trip the "KI" acronym.
  assert.equal(findAiTerm('Ein Kind malt gerne', 'de'), null);
  assert.equal(findAiTerm('Kreativer Spaß', 'de'), null);
});
