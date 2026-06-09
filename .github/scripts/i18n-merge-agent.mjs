// @ts-check
/**
 * i18n Merge Agent — autonomous, deterministic drain of the translation-review
 * PR backlog (branches `i18n/review-<locale>-<source>-<date>`).
 *
 * Invoked by .github/workflows/i18n-merge-agent.yml. Uses the `gh` CLI (present
 * on GitHub Actions runners, authed via GH_TOKEN) for every GitHub interaction —
 * no extra deps.
 *
 * For each open review PR, SERIALLY (each merge advances main and can flip a
 * sibling that touches the same file to CONFLICTING):
 *   1. Disable any abandoned auto-merge the producer may have armed.
 *   2. Re-fetch mergeable state (poll while UNKNOWN — GitHub computes it async).
 *   3. Guardrail gate — BAIL (skip + flag) unless ALL hold:
 *        - PR touches exactly ONE file
 *        - that file is the expected locale JSON for the branch's {locale,source}
 *        - JSON parses
 *        - its flattened key-set is IDENTICAL to the matching English source
 *        - no `critical`/`needs-review` label, no matching open needs-review
 *          issue, no 🔴 in the body
 *        - no locale-aware AI-word or em-dash reintroduced in an ADDED JSON value
 *   4. Vercel gate — BAIL if any `Vercel – *-web` check is FAILURE/ERROR
 *      (a shared-locale edit can break a sibling app's prod build).
 *   5. CONFLICTING  -> close + delete branch (next producer run recreates clean).
 *      CLEAN + gates -> squash-merge + delete branch, then re-loop.
 *
 * Runaway tripwire: if > 40 open review PRs, drain nothing and ping a human.
 * No-progress detector: if a run merges 0 and the conflicting set is unchanged
 * from last run, ping a human instead of silently re-looping.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_OPEN_PRS = 40;
const STATE_ISSUE_TITLE = 'i18n-merge-agent: state';

/** Branches look like i18n/review-<locale>-<source>-<YYYY-MM-DD>. */
export const BRANCH_RE = /^i18n\/review-(.+)-(shared|cc|ch|cm)-(\d{4}-\d{2}-\d{2})$/;

/** Per-source English reference file for the structure check. */
const EN_SOURCE = {
  shared: 'packages/translations/src/en.json',
  cc: 'apps/chunky-crayon-web/messages/en.json',
  ch: 'apps/coloring-habitat-web/messages/en.json',
  cm: 'apps/chunky-crayon-mobile/messages/en.json',
};

/** Expected changed-file path for a given (source, locale). */
export function expectedFile(source, locale) {
  if (source === 'shared') return `packages/translations/src/${locale}.json`;
  if (source === 'cc') return `apps/chunky-crayon-web/messages/${locale}.json`;
  if (source === 'ch') return `apps/coloring-habitat-web/messages/${locale}.json`;
  if (source === 'cm') return `apps/chunky-crayon-mobile/messages/${locale}.json`;
  return null;
}

/**
 * Locale-aware AI-term detector. The review pass STRIPS AI mentions; their
 * reintroduction is a regression. This is delicate because short Latin acronyms
 * collide with ordinary words: French "ai" (have), "essaie", "vrai" all contain
 * "ai"; German "KI" appears inside words too. So:
 *   - Latin acronyms (AI, A.I., IA, KI) match ONLY as a CASE-SENSITIVE,
 *     standalone, uppercase token (real acronym usage), never lowercased.
 *   - Multi-word phrases and CJK forms match case-insensitively as substrings.
 * Returns the offending term, or null if the value is clean.
 */
export function findAiTerm(value, locale) {
  // [pattern, caseSensitiveStandalone?]
  const acronyms = ['AI', 'A.I.'];
  const phrases = ['artificial intelligence'];
  const byLang = {
    de: { acronyms: ['KI'], phrases: ['künstliche Intelligenz'] },
    fr: { acronyms: ['IA'], phrases: ['intelligence artificielle'] },
    es: { acronyms: ['IA'], phrases: ['inteligencia artificial'] },
    ja: { acronyms: [], phrases: ['人工知能'] },
    ko: { acronyms: [], phrases: ['인공지능'] },
    'zh-Hans': { acronyms: [], phrases: ['人工智能', '人工智慧'] },
    'zh-Hant': { acronyms: [], phrases: ['人工智慧', '人工智能'] },
  };
  const extra = byLang[locale] || { acronyms: [], phrases: [] };
  const allAcronyms = [...acronyms, ...extra.acronyms];
  const allPhrases = [...phrases, ...extra.phrases];

  // Case-sensitive, whitespace/punctuation-bounded acronym match (not lowered).
  for (const a of allAcronyms) {
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Bound by start/end or a non-letter on both sides; case-sensitive so
    // French "ai"/"essaie" and German "Kind" don't trip "AI"/"KI".
    const re = new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, 'u');
    if (re.test(value)) return a;
  }
  // Case-insensitive substring for full phrases and CJK forms.
  const lower = value.toLowerCase();
  for (const p of allPhrases) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

function gh(args, opts = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', ...opts });
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

/**
 * Flatten a nested translation object to a Set of dot-path leaf keys. Arrays and
 * objects are treated IDENTICALLY (recurse via Object.entries, which yields
 * numeric string keys "0","1",… for arrays). This matters because the translate
 * script converts en.json arrays (e.g. pricing `features: [...]`) into objects
 * (`features: {"0":...}`) in the target locale — so en's array `features` and the
 * translated object `features` both flatten to `features.0, features.1, …` and
 * compare equal. Without this, the structure check would wrongly see `features`
 * as a missing key on every pricing PR.
 */
export function flattenKeys(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      flattenKeys(v, key, out);
    } else {
      out.add(key);
    }
  }
  return out;
}

/**
 * Collect every leaf string VALUE for the AI-term scan. Recurses into arrays too
 * (their string elements — e.g. pricing `features` — are user-facing copy).
 */
export function collectValues(obj, out = []) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') collectValues(v, out);
    else if (typeof v === 'string') out.push(v);
  }
  return out;
}

/**
 * Decide whether a single PR is safe to merge. Returns { ok, reason }.
 * `ok:false` means BAIL (skip + flag), never merge.
 */
function gate(pr, files, headJson) {
  const m = pr.headRefName.match(BRANCH_RE);
  if (!m) return { ok: false, reason: `branch name doesn't match review pattern` };
  const [, locale, source] = m;

  // --- structure of the diff -------------------------------------------------
  if (files.length !== 1) {
    return { ok: false, reason: `touches ${files.length} files (expected exactly 1)` };
  }
  const changed = files[0].path;
  const want = expectedFile(source, locale);
  if (changed !== want) {
    return { ok: false, reason: `changes ${changed}, expected ${want}` };
  }

  // --- label / issue / body gate (human-review signals) ----------------------
  const labels = (pr.labels || []).map((l) => l.name);
  if (labels.includes('critical') || labels.includes('needs-review')) {
    return { ok: false, reason: `carries a ${labels.includes('critical') ? 'critical' : 'needs-review'} label` };
  }
  if ((pr.body || '').includes('🔴')) {
    return { ok: false, reason: `body flags 🔴 Needs Human Review` };
  }
  // An open needs-review issue for this (locale, source) means the producer
  // already decided a human must look.
  const openIssues = ghJson([
    'issue', 'list',
    '--state', 'open',
    '--label', 'needs-review',
    '--label', `lang:${locale}`,
    '--label', `source:${source}`,
    '--json', 'number',
  ]);
  if (openIssues.length > 0) {
    return { ok: false, reason: `open needs-review issue exists (#${openIssues[0].number})` };
  }

  // --- JSON validity + structure parity vs English ---------------------------
  if (!headJson) return { ok: false, reason: `could not read changed file at PR head` };
  let target;
  try {
    target = JSON.parse(headJson);
  } catch (e) {
    return { ok: false, reason: `changed file is not valid JSON: ${e.message}` };
  }
  const enPath = EN_SOURCE[source];
  if (!existsSync(enPath)) {
    return { ok: false, reason: `English source ${enPath} not found in checkout` };
  }
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const enKeys = flattenKeys(en);
  const targetKeys = flattenKeys(target);
  // Fail closed on MISSING keys (a translation that dropped an English key
  // would break a runtime lookup). TOLERATE extra keys — the producer's own
  // validate step does (translation-review.yml: "Don't fail on extras — they
  // may be intentional overrides"), and brand override files legitimately carry
  // keys not present in the current en.json (e.g. adultGate.*).
  const missing = [...enKeys].filter((k) => !targetKeys.has(k));
  if (missing.length) {
    return {
      ok: false,
      reason: `missing ${missing.length} key(s) present in English (e.g. ${missing.slice(0, 3).join(', ')})`,
    };
  }

  // --- AI-term regression scan on values -------------------------------------
  // The producer's review pass is supposed to STRIP AI mentions (a parent-trust
  // concern); their reintroduction is the one content regression worth blocking
  // a merge over. The detector is case-sensitive for Latin acronyms so it doesn't
  // false-positive on ordinary words (French "ai"/"essaie", German "Kind").
  //
  // We deliberately do NOT scan for em-dashes here: the "no em-dash" rule is a
  // house preference for NEW English copy, but (a) em-dashes are standard
  // punctuation in fr/de/es/ja and pervade the existing translated corpus, and
  // (b) without a real added-lines diff we'd flag pre-existing em-dashes the PR
  // never touched — which false-positives on essentially every PR.
  for (const v of collectValues(target)) {
    const term = findAiTerm(v, locale);
    if (term) {
      return { ok: false, reason: `reintroduces banned AI term "${term}" in a value: "${v.slice(0, 50)}"` };
    }
  }

  return { ok: true, reason: 'clean' };
}

/**
 * Vercel deploy gate. BAIL if any Vercel *-web check is failing.
 * Uses `gh pr checks --json bucket,name` — `bucket` normalizes state into
 * pass/fail/pending/skipping/cancel. A shared-locale edit can break a sibling
 * app's prod build (e.g. a ja-shared PR whose `Vercel – coloring-habitat-web`
 * deploy is red), so a failing Vercel *-web check must block the merge.
 * Note: `gh pr checks` exits non-zero when any check is failing — capture that
 * exit code rather than letting it throw.
 */
function vercelGate(prNumber) {
  let raw;
  try {
    raw = gh(['pr', 'checks', String(prNumber), '--json', 'bucket,name,state']);
  } catch (e) {
    // Non-zero exit just means some check isn't passing; stdout still holds JSON.
    raw = e.stdout ? e.stdout.toString() : '[]';
  }
  let checks;
  try { checks = JSON.parse(raw || '[]'); } catch { checks = []; }
  for (const c of checks) {
    const name = c.name || '';
    if (/Vercel.*-web/i.test(name) && c.bucket === 'fail') {
      return { ok: false, reason: `Vercel check "${name}" failed (${c.state || c.bucket})` };
    }
  }
  return { ok: true, reason: 'vercel green' };
}

/** Poll mergeable state until it resolves (GitHub computes it asynchronously). */
function resolveMergeable(prNumber) {
  for (let i = 0; i < 8; i++) {
    const v = ghJson([
      'pr', 'view', String(prNumber),
      '--json', 'mergeable,mergeStateStatus',
    ]);
    if (v.mergeable && v.mergeable !== 'UNKNOWN') return v;
    execFileSync('sleep', ['3']);
  }
  return ghJson(['pr', 'view', String(prNumber), '--json', 'mergeable,mergeStateStatus']);
}

function listOpenReviewPRs() {
  return ghJson([
    'pr', 'list',
    '--search', 'head:i18n/review-',
    '--state', 'open',
    '--limit', '100',
    '--json', 'number,headRefName,labels,body,createdAt',
  ]).filter((pr) => BRANCH_RE.test(pr.headRefName));
}

function main() {
  const summary = { merged: [], closed: [], bailed: [], dryRun: DRY_RUN };
  const prs = listOpenReviewPRs();

  console.log(`Found ${prs.length} open i18n/review-* PR(s)${DRY_RUN ? ' (DRY RUN)' : ''}.`);

  if (prs.length > MAX_OPEN_PRS) {
    pingHuman(
      `i18n-merge-agent: ${prs.length} open review PRs exceeds the ${MAX_OPEN_PRS} tripwire — draining nothing. ` +
      `Likely a runaway producer or misconfig; please investigate.`,
    );
    console.log('::error::Open PR count over tripwire — bailing the whole run.');
    return;
  }

  // Oldest first so the backlog drains FIFO and dated branches resolve in order.
  prs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const pr of prs) {
    const tag = `#${pr.number} (${pr.headRefName})`;
    try {
      if (!DRY_RUN) {
        // Clear any abandoned producer auto-merge so it can't fire mid-drain.
        try { gh(['pr', 'merge', String(pr.number), '--disable-auto']); } catch { /* none set */ }
      }

      const state = resolveMergeable(pr.number);
      const files = ghJson(['pr', 'view', String(pr.number), '--json', 'files']).files;

      // Read the changed file at PR head for the JSON/structure/value checks.
      const m = pr.headRefName.match(BRANCH_RE);
      const headFile = m ? expectedFile(m[2], m[1]) : null;
      let headJson = null;
      if (headFile) {
        try {
          // Contents API returns base64 wrapped at 60 chars; strip all whitespace
          // before decoding.
          const b64 = gh(['api', `repos/{owner}/{repo}/contents/${headFile}?ref=${pr.headRefName}`,
            '--jq', '.content']).replace(/\s/g, '');
          headJson = Buffer.from(b64, 'base64').toString('utf8');
        } catch { headJson = null; }
      }

      const g = gate(pr, files, headJson);
      if (!g.ok) {
        summary.bailed.push({ pr: pr.number, reason: g.reason });
        console.log(`BAIL ${tag}: ${g.reason}`);
        continue;
      }

      if (state.mergeable === 'CONFLICTING') {
        console.log(`CONFLICT ${tag}: closing (next review run recreates clean off main).`);
        if (!DRY_RUN) {
          gh(['pr', 'close', String(pr.number),
            '--comment', 'superseded: conflicts with main; the next scheduled review run will regenerate this off current main.',
            '--delete-branch']);
        }
        summary.closed.push({ pr: pr.number, reason: 'conflicting' });
        continue;
      }

      // Mergeable — final Vercel gate before merging.
      const vg = vercelGate(pr.number);
      if (!vg.ok) {
        summary.bailed.push({ pr: pr.number, reason: vg.reason });
        console.log(`BAIL ${tag}: ${vg.reason}`);
        continue;
      }

      console.log(`MERGE ${tag}: clean + gates green -> squash.`);
      if (!DRY_RUN) {
        gh(['pr', 'merge', String(pr.number), '--squash', '--delete-branch']);
      }
      summary.merged.push({ pr: pr.number });
    } catch (e) {
      summary.bailed.push({ pr: pr.number, reason: `agent error: ${e.message}` });
      console.log(`ERROR ${tag}: ${e.message}`);
    }
  }

  report(summary, prs);
}

/** Post a single run summary + run the no-progress detector. */
function report(summary, prs) {
  const lines = [
    `**i18n-merge-agent run**${summary.dryRun ? ' _(dry run)_' : ''}`,
    '',
    `- merged: ${summary.merged.length}${summary.merged.length ? ' (' + summary.merged.map((m) => '#' + m.pr).join(', ') + ')' : ''}`,
    `- closed (conflicting): ${summary.closed.length}${summary.closed.length ? ' (' + summary.closed.map((c) => '#' + c.pr).join(', ') + ')' : ''}`,
    `- bailed (needs attention): ${summary.bailed.length}`,
    ...summary.bailed.map((b) => `  - #${b.pr}: ${b.reason}`),
  ];
  const body = lines.join('\n');
  console.log('\n' + body);

  // No-progress detector: if we merged 0 and the conflicting set is identical to
  // last run, something is stuck — ping a human rather than re-looping forever.
  const conflictingNow = summary.closed.map((c) => c.pr).sort().join(',');
  const stateIssue = findStateIssue();
  const lastConflicting = stateIssue ? extractState(stateIssue.body) : '';
  if (!summary.dryRun && summary.merged.length === 0 && summary.bailed.length > 0 &&
      conflictingNow === lastConflicting && lastConflicting !== '') {
    pingHuman(
      `i18n-merge-agent made NO progress two runs running (0 merged, same bailed/closed set). ` +
      `Manual attention needed:\n\n${body}`,
    );
  }
  upsertStateIssue(conflictingNow, body);
}

function findStateIssue() {
  const issues = ghJson([
    'issue', 'list', '--state', 'open',
    '--search', `"${STATE_ISSUE_TITLE}" in:title`,
    '--json', 'number,body,title',
  ]);
  return issues.find((i) => i.title === STATE_ISSUE_TITLE) || null;
}

function extractState(body) {
  const m = (body || '').match(/<!--state:(.*?)-->/);
  return m ? m[1] : '';
}

function upsertStateIssue(conflictingNow, body) {
  if (DRY_RUN) return;
  const marker = `<!--state:${conflictingNow}-->`;
  const full = `${body}\n\n${marker}`;
  const existing = findStateIssue();
  if (existing) {
    gh(['issue', 'comment', String(existing.number), '--body', body]);
    gh(['issue', 'edit', String(existing.number), '--body', full]);
  } else {
    gh(['issue', 'create', '--title', STATE_ISSUE_TITLE, '--body', full, '--label', 'i18n']);
  }
}

function pingHuman(message) {
  if (DRY_RUN) { console.log(`[dry-run] would ping human: ${message}`); return; }
  gh([
    'issue', 'create',
    '--title', `🔔 i18n-merge-agent needs attention`,
    '--body', message,
    '--label', 'i18n', '--label', 'needs-review',
  ]);
}

// Only drain when run directly (the test file imports the pure helpers above).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
