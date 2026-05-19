# Testing

How tests are wired across this monorepo: what runs where, the unit-test
philosophy, the pre-commit fast path, and CI.

## TL;DR

| Layer          | Tool                   | Where it runs                              |
| -------------- | ---------------------- | ------------------------------------------ |
| Unit           | Vitest 4 + Testing Lib | `pnpm test` (turbo), pre-commit, CI `unit` |
| E2E            | Playwright             | `pnpm test:e2e`, CI `e2e` (gated)          |
| Component (UI) | Storybook Vitest addon | `packages/coloring-ui` (separate, browser) |

We use **Vitest, not Jest**. The old Jest scaffolding in
`chunky-crayon-web` was removed (it was config-only, zero tests). Vitest is
the 2026 choice for Next 16 + React 19 + ESM, and `packages/coloring-ui`
already runs Vitest via the Storybook addon — one runner across the repo.

## What we unit-test (and what we don't)

The rule: **test extracted, deterministic logic where a silent bug costs
money or breaks the core experience.** Do NOT try to unit-render React
Server Components or exercise Next routing / Cache Components — that's
Playwright's job.

Concretely, the first suite covers the revenue/correctness core:

- `packages/stripe-shared` — credit proration, Stripe status mapping,
  price→plan resolution, credit-pack lookup. A bug here = wrong money.
- `packages/coloring-core/src/image-quality.ts` — quality tier defaults
  and the server-side clamp. A bug here = cold paid traffic gets the slow
  experience and bounces.
- `packages/coloring-core/src/utils/color.ts` — hex/RGB/Lab + CIEDE2000
  palette snapping. A bug here = auto-colour visibly wrong.
- `packages/coloring-core/src/utils/copy.ts` — em-dash sanitiser (hard
  brand-voice rule).
- `packages/coloring-core/src/scene/seasonal-calendar.ts` — drives daily
  scene generation; tricky year-boundary date maths.
- `apps/chunky-crayon-web/lib/{currency,coloring-image-purpose,bundle-download-token,unsubscribe}.ts`
  — currency resolution, ad attribution, and the two security-critical
  signing/verification paths (guest bundle-download JWT, HMAC unsubscribe).

### Known bug surfaced by this work

`deltaE2000` reproduces 9/10 canonical Sharma (2005) CIEDE2000 vectors
exactly but diverges on the one pair with ~180°-apart hues at near-zero
chroma (returns ~4.31, reference is 7.2195) — a bug in the mean-hue
(`hbarp`) branch. It mildly under-estimates perceptual distance for that
narrow colour class, so `nearestPaletteColor` can snap to a slightly
farther palette entry. It is pinned in `color.test.ts` as an `it.fails`
test: the suite is honest about current behaviour, and the day someone
fixes the hue-mean branch that test flips red and forces updating the
assertion. Not fixed here — it's a behaviour change to the colour
pipeline, out of scope for testing-infra, and the region-palette work is
actively tuning that area.

## The pre-commit fast path

`.husky/pre-commit` runs `pnpm lint-staged`. On staged `.{js,jsx,ts,tsx}`
files (excluding `e2e/`) it runs:

```
vitest related --run --passWithNoTests --config vitest.config.mts
```

`vitest related` is the Vitest equivalent of Jest's
`--findRelatedTests`: it walks the module graph and runs only the tests
that depend on the files you're committing. It is **blocking** — a failing
related test stops the commit. This is the deliberate posture: pushes go
straight to `main` with no branch protection, so the pre-commit hook is
the real safety net and CI is the backstop.

The root `vitest.config.mts` lists each package as an explicit project so
one `vitest related` invocation spans the whole repo's changed files.

## Running tests

```bash
pnpm test            # all unit tests via turbo (cached)
pnpm test:web        # just chunky-crayon-web
pnpm --filter @one-colored-pixel/stripe-shared test
pnpm test:e2e        # Playwright (needs seeded DB + running app)

# Per package, watch mode:
cd packages/stripe-shared && pnpm test:watch
```

`turbo run test` depends on `db:generate` AND `^build` (build the
workspace packages first). The `^build` is load-bearing: a test that
imports a package _subpath export_ (e.g. `@one-colored-pixel/db/types`,
resolved via the package `exports` map to `dist/types.js`, NOT `src/`)
cannot resolve until that package is built. Vitest resolves the package
root (`.`) from `src/` via tsconfig paths, but subpath exports go through
the `exports` map and need `dist/`. So in a clean checkout (CI, fresh
worktree) tests fail with `Failed to resolve import
"@one-colored-pixel/db/types"` until `^build` runs. Prisma generate still
needs only the schema, no live DB.

## E2E (Playwright)

Config: `apps/chunky-crayon-web/playwright.config.ts`. Projects:
`unauthenticated`, `authenticated` (+ `setup`), `mobile`. Auth is a seeded
session cookie, not real OAuth:

```bash
cd apps/chunky-crayon-web
pnpm tsx scripts/seed-test-user.ts   # creates test user + session row
pnpm test:e2e
```

### Crucial-path specs (what's covered)

All specs below were run green against a live dev server (CC on dev Neon
branch) before landing — unauthenticated 6/6 + bundle skipped (flag off),
authenticated 6/6 after the dev-compile flake fix.

| Spec                               | Path covered           | Assertion                                                                                                           |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `home.unauthenticated`             | public homepage        | loads, sign-in link present, create form visible to guests, pricing reachable                                       |
| `create-flow.authenticated`        | the core product       | prompt box editable, create CTA enabled, form posts the server action (request aborted — **no paid generation**)    |
| `pricing-checkout.unauthenticated` | subscription revenue   | three plans + price render; plan CTA **initiates Stripe checkout** (Stripe hop blocked — no real payment)           |
| `bundle-purchase.unauthenticated`  | one-off bundle revenue | storefront → product page → buy initiates checkout (blocked). Skips if `bundles-shop` flag off or no bundles seeded |
| `dashboard.authenticated`          | logged-in surfaces     | home/gallery/account-settings/billing reachable, no auth redirect                                                   |

Deliberate non-goals: these never complete a real payment or trigger a
real GPT Image generation (both cost money on every run). They assert the
revenue-breaking regressions that are visible _before_ the irreversible
step — a dead Subscribe button, a vanished create form, a broken prompt.
Deepen with a fully-mocked Stripe/worker harness if/when that's worth the
maintenance.

### Gotchas when running locally

- **Port**: `pnpm dev` uses 3000, but if another app/worktree already
  holds it, Next falls back to 3001. Playwright defaults to
  `localhost:3000`; pass `PLAYWRIGHT_BASE_URL=http://localhost:3001` (and
  `CI=true` so Playwright doesn't try to spawn its own dev server) to
  point at the running one.
- **Auth**: the seeded session cookie is `authjs.session-token` (Auth.js
  v5 on HTTP localhost). `seed-test-user.ts` must run against the **dev**
  Neon branch (`br-wandering-salad-a4a9ibmz`) — verify the `.env.local`
  `DATABASE_URL` host before seeding (a worktree can silently carry a
  prod-pointing env).
- **Playwright version**: `playwright` and `@playwright/test` must be the
  same version across the repo (`^1.59.1`, matching `coloring-ui`). A
  skew produces `test.describe() not expected here` / "two different
  versions of @playwright/test". Bumping the version invalidates the
  browser cache — re-run `pnpm exec playwright install chromium`.

## CI

`.github/workflows/tests.yml`:

- **`unit`** — every push to `main` + every PR + manual. Fast, no infra.
- **`e2e`** — gated behind an `e2e-precheck` job. Runs only if a
  `PLAYWRIGHT_DATABASE_URL` secret exists (point it at a throwaway Neon
  branch — never prod/dev, per the "branch Neon from dev" rule). Marked
  `continue-on-error` so it surfaces failures without blocking.

Neither job blocks a merge today (no branch protection, straight-to-main).
When PRs/branch protection are turned on, mark `unit` required.

## Adding tests as you go

Going forward, **a change to revenue/correctness-critical pure logic ships
with its test in the same commit.** Put `*.test.ts` next to the source
(`foo.ts` → `foo.test.ts`). If it imports `node:crypto` / `jose` / other
Node-only APIs, add `// @vitest-environment node` at the top of the test
file (jsdom's `Uint8Array` realm breaks `jose`). Widen the `coverage.include`
allowlist in the relevant `vitest.config.mts` as new areas get covered —
don't flip it to "everything" or the number becomes noise.
