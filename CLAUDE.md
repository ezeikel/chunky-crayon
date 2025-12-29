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

## Key Features

- Magic Brush/Auto-Color: Uses pre-computed `colorMapJson` for instant color mapping (no AI call at runtime)
- Ambient Sound: Generated via ElevenLabs, stored in `ambientSoundUrl` field
- Colo mascot: Evolving character that grows with user's coloring activity
