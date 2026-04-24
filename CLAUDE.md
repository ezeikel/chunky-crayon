# Claude Code Context

## Database (Neon)

This project uses Neon PostgreSQL with branch-based development:

- **Project ID**: `black-voice-61962689`
- **Organization**: Chewy Bytes (`org-fragrant-frog-77141390`)

### Branches

| Branch          | ID                            | Usage                              |
| --------------- | ----------------------------- | ---------------------------------- |
| **production**  | `br-morning-leaf-a4gj86x5`    | Production data (deployed site)    |
| **development** | `br-wandering-salad-a4a9ibmz` | Local development data (localhost) |

**Important**: When the user is testing on `localhost`, always query the **development** branch. The production branch has different data.

### Common Tables

- `coloring_images` - Main coloring page content (uses snake_case)
- `users`, `profiles`, `saved_artworks`, etc.

### Migrations

**CRITICAL rules — violating either causes dev↔prod drift:**

1. **Never use `prisma db push`** — bypasses the migration history entirely.
2. **Never hand-write migration files.** Always run `pnpm db:migrate` from `packages/db`. The CLI is the only thing that writes a row to dev's `_prisma_migrations` _and_ generates the correctly-hashed migration folder. Hand-writing the `migration.sql` file looks equivalent but leaves dev's `_prisma_migrations` empty for that migration — so when CI applies it to prod on merge, prod gets the row but dev never does. Result: same table exists on both, but `prisma migrate status` thinks dev is behind, and the next `pnpm db:migrate` on dev will fail with "drift detected."
3. **Never run raw `ALTER TABLE` / `CREATE TABLE` directly on Neon** (via MCP, psql, Neon console, etc.) to change schema. Any schema change must start as a `schema.prisma` edit.

#### Workflow

1. **Make schema changes** in `packages/db/prisma/schema.prisma`
2. **Create migration locally**: `cd packages/db && pnpm db:migrate` — this generates the migration folder AND applies it to the dev Neon branch AND writes to dev's `_prisma_migrations`. Do not skip this step by writing the SQL file yourself.
3. **Build the db package**: `pnpm build` (compiles TypeScript after Prisma generates client)
4. **Commit & push** migration files to `main` branch
5. **Auto-deploy**: GitHub Action runs `prisma migrate deploy` on production

#### Commands (run from `packages/db`)

| Command            | Purpose                   | When to Use                     |
| ------------------ | ------------------------- | ------------------------------- |
| `pnpm db:migrate`  | Create + apply migration  | After schema changes            |
| `pnpm build`       | Compile TypeScript        | After db:migrate or db:generate |
| `pnpm db:deploy`   | Apply existing migrations | CI/CD only                      |
| `pnpm db:generate` | Regenerate Prisma client  | After pulling changes           |
| `pnpm db:push`     | ⛔ **NEVER USE**          | Causes drift                    |
| `pnpm db:studio`   | Database GUI              | Debugging                       |

**Important**: Always run `pnpm build` after `db:migrate` or `db:generate` to compile the updated Prisma client.

#### Detecting drift

To confirm dev and prod are in sync:

```bash
# From packages/db — compares local migrations folder with target DB:
pnpm exec prisma migrate status
```

A CI check (the `check-drift` job in `.github/workflows/database-migrations.yml`) runs `prisma migrate diff --exit-code` on every push to `main` and blocks the prod deploy if `schema.prisma` and `migrations/` have diverged.

## Project Structure

- **Monorepo** using Turborepo + pnpm workspaces (parent brand: One Colored Pixel)
- `apps/chunky-crayon-web` - Next.js 16 web application (Chunky Crayon - kids coloring)
- `apps/chunky-crayon-mobile` - React Native mobile app (Chunky Crayon)
- `apps/coloring-habitat-web` - Next.js 16 web application (Coloring Habitat - adult coloring)
- `packages/db` - Prisma database client (`@one-colored-pixel/db`)
- `packages/storage` - R2 storage client (`@one-colored-pixel/storage`)
- `packages/canvas` - Canvas algorithms: floodFill, brushTextures, fillPatterns, regionDetection (`@one-colored-pixel/canvas`)
- `packages/stripe-shared` - Configurable Stripe utilities (`@one-colored-pixel/stripe-shared`)
- `packages/coloring-core` - AI models and tracing (`@one-colored-pixel/coloring-core`)
- `packages/coloring-ui` - Full coloring experience: ImageCanvas, palettes, toolbars, sound, context (`@one-colored-pixel/coloring-ui`) — has Storybook
- `packages/translations` - Shared i18n translations (`@one-colored-pixel/translations`)

## Keeping CC and CH in Sync

**CRITICAL**: Chunky Crayon (CC) and Coloring Habitat (CH) are the same app for different audiences (kids vs adults). They share 7 packages and must use identical patterns.

### Rules

1. **CC is the reference**. If CH has a bug, check how CC handles the same thing first. CC has solved every problem CH encounters.
2. **Parity is bidirectional**. Any feature, fix, or UI state added to one app must immediately be added to the other. Don't wait to be asked — if you add a disabled button state to CH, add it to CC in the same change.
3. **Shared packages first**. When adding/modifying coloring experience code (canvas, palette, toolbar, sound), change the shared package — never add code to only one app.
4. **Same Next.js patterns**. Both apps must use:
   - `cacheComponents: true` in next.config
   - `'use cache'` with `cacheLife` for data functions
   - Suspense boundaries around dynamic content (static shell pattern)
   - Header/Footer in the layout, not in individual pages
   - Granular `cacheLife` profiles per content type
5. **No `connection()` for DB reads**. Prisma/Neon WebSocket works with prerender. Only use `connection()` when explicitly opting into dynamic rendering.
6. **Run local build before pushing**. Run `pnpm build` in the app directory to catch Cache Components / prerender errors before Vercel.
7. **Feature changes go to both apps** unless they're brand-specific (e.g. Colo mascot = CC only, wellness theming = CH only).

### What differs between apps (by design)

| Aspect         | CC (kids)                            | CH (adults)                          |
| -------------- | ------------------------------------ | ------------------------------------ |
| Prompts        | `lib/ai/prompts.ts` — child-friendly | `lib/ai/prompts.ts` — adult/wellness |
| Pricing        | Splash/Rainbow/Sparkle               | Grove/Sanctuary/Oasis                |
| Theme          | crayon-orange, crayon-purple         | green primary, nature tones          |
| Routing        | `[locale]/...` (i18n)                | `[locale]/...` (i18n)                |
| Stickers       | Yes (kid-focused)                    | No                                   |
| Colo mascot    | Yes                                  | No                                   |
| TikTok sharing | Feature-flagged (admin only)         | Always on                            |
| PostHog        | Project 110135                       | Project 149826                       |
| Stripe         | Existing account                     | acct_1TGNOxPVKi0lifb0                |

## Vercel Deployment

Each app has its own Vercel project. **Important**: Run Vercel CLI from the app directory, not the repo root.

- **Chunky Crayon**: `chunky-crayon-web` — linked in `apps/chunky-crayon-web`
- **Coloring Habitat**: `coloring-habitat-web` — linked in `apps/coloring-habitat-web` (also linked at repo root)
- **Env vars**: `cd apps/<app-name> && vercel env ls`

### Monorepo Constraints

**React version must stay in sync** across all apps and packages. pnpm's strict dependency isolation means version mismatches cause multiple React instances, leading to "Invalid hook call" errors. When upgrading React, update all workspaces together.

## Next.js 16 Specifics

### Middleware → Proxy

In Next.js 16, `middleware.ts` was renamed to `proxy.ts`. The middleware file is located at `apps/chunky-crayon-web/proxy.ts`.

## Translations

Three translation sources, each with a different tone for AI translation:

| Source                                       | Tone             | What goes here                                      |
| -------------------------------------------- | ---------------- | --------------------------------------------------- |
| `packages/translations/src/en.json`          | Neutral          | Shared UI: nav, tools, colors, common               |
| `apps/chunky-crayon-web/messages/en.json`    | Kids (playful)   | CC brand: homepage, footer, pricing, Colo, stickers |
| `apps/coloring-habitat-web/messages/en.json` | Adults (mindful) | CH brand: homepage, footer, pricing, create form    |

A GitHub Action auto-translates all three when any `en.json` changes on main. The script `packages/translations/scripts/translate-app-overrides.ts` handles per-app translations with tone-specific prompts.

## Commits

Use semantic commit style (`type(scope): message`). Keep messages as one-liners, succinct but covering work done. Do not attribute Claude in commit messages. Never include Co-Authored-By lines.

## Key Features

- Magic Brush/Auto-Color: Uses pre-computed region store (`regionMapUrl` + `regionsJson`) with 4 palette variants (realistic/pastel/cute/surprise). Source-in compositing for per-pixel region-accurate brush reveal. Falls back to legacy `colorMapJson`/`fillPointsJson` for unbackfilled images.
- Ambient Sound: Generated via ElevenLabs, stored in `ambientSoundUrl` field
- Colo mascot: Evolving character that grows with user's coloring activity
- Daily Scene Generation: Perplexity Sonar generates seasonal/trending scene descriptions for daily coloring images, with content safety blocklist and dedup

## Dev-Only Debug Tools

**Do NOT delete these pages** — they are permanent dev tools for debugging and improving the coloring experience:

- **Region Store Debug Viewer**: `/en/dev/region-store/[id]` on both CC (port 3000) and CH (port 3001). Shows region fills, palette variants, hover labels, stats, and has a "Regenerate" button. Gated by `NODE_ENV=development`.
- **Region Store Regenerate API**: `POST /api/dev/regenerate-region-store/[id]` on both apps. Callable via curl for scripted regeneration.

## AI Prompt Optimization

Model-specific prompt engineering research is documented in `apps/chunky-crayon-web/lib/ai/PROMPT_OPTIMIZATION.md`. Read this before modifying any AI prompts — each model (GPT Image 1.5, Perplexity Sonar, Claude Sonnet 4.5, Gemini) has different optimal patterns.

## Mobile App Development

**Key constraints:**

- No Firebase Analytics or tracking SDKs (causes Kids Category rejection)
- Parental gates required for IAP, external links, permissions
- Local-first data storage (no PII collection)
- Target: iPad-first, ages 3-8, COPPA/GDPR-K compliant

For detailed plans, see `docs/plans/active/MOBILE_APP_PLAN.md` (only read when needed).

### Running the Mobile App

From `apps/chunky-crayon-mobile`:

**iOS:**

```bash
pnpm prebuild:ios  # Only when native dependencies change (non-JS packages installed)
pnpm ios           # Build and run on iOS simulator
```

**Android:**

```bash
pnpm prebuild:android  # Only when native dependencies change
pnpm android           # Build and run on Android emulator
```

**Development server only:**

```bash
pnpm start         # Start Metro bundler
pnpm dev:ios       # Start with iOS simulator
pnpm dev:android   # Start with Android emulator
```

Note: Prebuild regenerates native `ios/` and `android/` folders. Only run when adding native dependencies.

## GitHub CLI

Use `gh` CLI when referencing GitHub repos that I own or public repos (e.g., `gh repo view`, `gh issue list`, `gh pr list`).
