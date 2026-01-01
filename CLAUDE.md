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

## Project Structure

- **Monorepo** using Turborepo + pnpm workspaces
- `apps/web` - Next.js 16 web application
- `apps/mobile` - React Native mobile app
- `packages/db` - Prisma database client
- `packages/translations` - i18n translations (next-intl)

## Translations

Only edit `packages/translations/src/en.json`. A GitHub Action automatically populates all other languages in CI.

## Commits

Use semantic commit style (`type(scope): message`). Keep messages as one-liners, succinct but covering work done. Do not attribute Claude in commit messages.

## Key Features

- Magic Brush/Auto-Color: Uses pre-computed `colorMapJson` for instant color mapping (no AI call at runtime)
- Ambient Sound: Generated via ElevenLabs, stored in `ambientSoundUrl` field
- Colo mascot: Evolving character that grows with user's coloring activity

## Mobile App Development

**Key constraints:**

- No Firebase Analytics or tracking SDKs (causes Kids Category rejection)
- Parental gates required for IAP, external links, permissions
- Local-first data storage (no PII collection)
- React version must match across monorepo (use root `resolutions`)
- Target: iPad-first, ages 3-8, COPPA/GDPR-K compliant

For detailed plans, see `apps/web/docs/MOBILE_APP_PLAN.md` (only read when needed).

### Running the Mobile App

From `apps/mobile`:

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
