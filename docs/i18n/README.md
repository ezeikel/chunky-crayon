# Internationalization (i18n)

How translations work across the monorepo — web (CC + CH), mobile (CC), the
shared package, the auto-translation CI, and the autonomous merge agent.

## The model: shared neutral package + per-app brand overrides

There is **one** source of locale truth and **one** shared neutral string set.
Each app layers its own brand-tone overrides on top via a deep merge.

```
packages/translations              ← @one-colored-pixel/translations
  src/locales.ts                   ← SINGLE SOURCE OF TRUTH for supported locales
  src/{en,ja,ko,de,fr,es,
       zh-Hans,zh-Hant}.json       ← shared NEUTRAL strings (no brand voice)
  src/index.ts                     ← exports translations, supportedLocales, mergeMessages

apps/chunky-crayon-web/messages/<locale>.json     ← CC kids-tone overrides   (next-intl)
apps/coloring-habitat-web/messages/<locale>.json  ← CH adult-tone overrides  (next-intl)
apps/chunky-crayon-mobile/messages/<locale>.json  ← CC mobile kids-tone      (react-i18next)
```

`mergeMessages(shared, overrides)` (in `src/index.ts`) deep-merges them; override
values win. The shared `en.json` is deliberately brand-free, so splitting the
package per brand would only **duplicate** the neutral strings — keep it shared.

- **Web** consumes it through **next-intl**: `i18n/routing.ts` lists the locales,
  `i18n/request.ts` merges shared + that app's overrides per request. URLs are
  locale-prefixed (`/zh-Hans/...`). hreflang lives in `app/[locale]/layout.tsx`
  and `lib/seo.ts`. The language switcher components hold their own
  `Record<Locale, …>` label/flag maps (TypeScript forces every one to stay in
  sync with `routing.locales`).
- **Mobile** consumes it through **react-i18next** (`lib/i18n/index.ts`) with a
  `useT()` wrapper that mirrors next-intl's `useTranslations('ns')` call shape so
  components port over cleanly. There is no in-app switcher — the locale follows
  the device language.

## Supported locales

`en` (source), `ja`, `ko`, `de`, `fr`, `es`, `zh-Hans`, `zh-Hant`.

**To add a locale:** add one entry to `packages/translations/src/locales.ts`,
then follow the steps in that file's header comment (package.json export,
`index.ts` map/exports, the review workflow's matrix + locale-name case, each
app's `routing.ts`/`request.ts`/switcher/`seo.ts`, and — on web — the CC
`proxy.ts` bot-prefix allowlist). TypeScript's exhaustive `Record<Locale, …>`
maps will flag most missed sites for you; the CC `proxy.ts` allowlist is the one
hand-maintained spot that won't, so update it explicitly. Finally generate the
JSON with the translate scripts (below) — never hand-write locale files.

### Chinese: Simplified vs Traditional

Codes are BCP-47 **script subtags**: `zh-Hans` (Simplified, 简体中文, the larger
audience — Mainland + Singapore) and `zh-Hant` (Traditional, 繁體中文 — Taiwan /
Hong Kong / Macau). On mobile, `resolveDeviceLocale()` disambiguates a `zh`
device by `languageScriptCode` (`Hans`/`Hant`), falling back to `regionCode`
(TW/HK/MO → Traditional), defaulting to Simplified.

## Translation scripts (`packages/translations/scripts/`)

All are locale-driven off `locales.ts` and need `OPENAI_API_KEY` (translate) or
`ANTHROPIC_API_KEY` (review).

| Script | Run | What it does |
| --- | --- | --- |
| `translate.ts` | `pnpm translate [--locale=<code>]` | Full translate of shared `src/*.json` from `en.json` (GPT). |
| `translate-diff.ts` | `pnpm translate:diff` | Shared, missing-keys only (cheaper). |
| `translate-app-overrides.ts` | `pnpm tsx scripts/translate-app-overrides.ts --app=<app> --tone=<kids\|adults>` | Per-app override translate, missing-keys only. App-name-driven (`--app=chunky-crayon-web` / `coloring-habitat-web` / `chunky-crayon-mobile`). |
| `audit-translations.ts` | `pnpm audit` | Report missing/extra keys. |
| `review-translations.ts` | `pnpm review --locale=<code> --source=<shared\|cc\|ch\|cm>` | Claude quality review; auto-applies warning/suggestion fixes, flags 🔴 critical for humans. |

After generating shared JSON, run `pnpm build` in `packages/translations` (the
apps import from the gitignored `dist/`).

## CI: two producers + one merger

### `translate.yml` — auto-translate on `en.json` change (direct to main)

Triggers when any `messages/en.json` (shared, CC, CH, **CC mobile**) changes on
main. Translates the missing keys for every locale and commits straight to main
with `[skip ci]`. No PR.

### `translation-review.yml` — weekly quality review (opens PRs)

Monday 09:00 UTC. Matrix = 7 locales × 4 sources (`shared`, `cc`, `ch`, `cm`) =
28 jobs, `max-parallel: 1` (serialized so each job branches off fresh main —
this prevents the "Base branch was modified" race). Each job runs the Claude
review, and if it changed the file opens **one PR** touching exactly one locale
JSON:

- branch `i18n/review-<locale>-<source>-<YYYY-MM-DD>`
- title `🌍 <Source> · <Locale> Translation Fixes - <date>`
- labels `i18n quality automated lang:<locale> source:<source>`

It does **not** merge (see below). Critical 🔴 issues additionally open a
`needs-review` issue.

### `i18n-merge-agent.yml` — the autonomous merger

The producer used to call `gh pr merge --auto`, which **never worked** here: the
matrix raced main, and with no required status checks on main, `--auto` is inert
(it 422s / waits for a check that never runs). So merging was moved to a single,
serial agent.

`i18n-merge-agent.yml` runs Monday 10:00 UTC (after the producer) plus a daily
safety-net, and on `workflow_dispatch` (with a `dry_run` input). It drives
`.github/scripts/i18n-merge-agent.mjs`, which for each open `i18n/review-*` PR,
**serially**:

1. disables any abandoned auto-merge;
2. re-checks mergeability (polling while `UNKNOWN`);
3. runs a strict **guardrail gate** — the diff must be exactly one file, the
   expected locale JSON for the branch, valid JSON, key-structure identical to
   English, with no `critical`/`needs-review` label, no matching open
   needs-review issue, no 🔴 in the body, and no locale-aware AI-word or em-dash
   reintroduced in a value;
4. gates on the **Vercel `*-web` deploy checks** not being FAILURE/ERROR (a
   shared-locale edit can break a sibling app's prod build — this is the key
   launch-safety guard);
5. **squash-merges** CLEAN PRs that pass (re-evaluating after each, since each
   merge can flip a sibling to CONFLICTING), and **closes** CONFLICTING ones
   (the next producer run recreates them clean off main — we never force-push
   regenerate, because the review script is non-deterministic and exits non-zero
   on any 🔴).

It posts a per-run summary issue (merged / closed / bailed-with-reason), has a
**no-progress detector** (pings a human if a run merges 0 and the bailed/closed
set is unchanged), a **runaway tripwire** (drains nothing and pings a human if >
40 open review PRs), and a **kill-switch**: set the repo variable
`MERGE_AGENT_PAUSED=true` to freeze it (e.g. during an app-store launch window)
without editing the workflow.

## Gotchas worth knowing

- **`dist/` is gitignored.** EAS builds turbo-build `@one-colored-pixel/translations`
  via `eas-build-post-install`; a new mobile workspace dep must be added there.
- **CC `proxy.ts` bot-prefix allowlist** is hand-maintained — add new locale
  prefixes when you add a locale, or bots get misrouted to `/en/...`.
- **`UNSTABLE` ≠ safe to merge.** It usually means a Vercel deploy check is
  failing. The merge agent gates on the actual check states, not just
  `mergeable`.
- **`gh pr merge --auto` does not work on this repo** (no required checks). The
  merge agent uses direct `gh pr merge --squash`.
