# Demo Reels

Vertical (1080x1920) videos posted to Instagram, Facebook, TikTok, and Pinterest. Each reel records the actual Chunky Crayon create flow in a real browser, then composites the recording into a polished short with intro/outro cards, voiceover, and ambient music.

There are two variants. Both run on the same Hetzner worker; they differ only in how they create the source coloring image.

| Variant   | Worker route          | What it does                                                                                                              | Cron days (UTC)    |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **text**  | `/publish/reel`       | Types a generated scene prompt into the homepage textbox, submits, records the result.                                    | Mon, Wed, Fri, Sat |
| **image** | `/publish/image-reel` | Picks a kid-safe stock photo from `photo_library_entries`, uploads it via the photo-to-coloring flow, records the result. | Tue, Thu, Sun      |

All produce crons fire at **06:00 UTC**. Per-platform post crons read the resulting `demoReelUrl` from the `coloring_images` row and upload to each network.

## Architecture

```
Vercel cron (06:00 UTC, daily)
  └─► GET /api/social/demo-reel/produce?variant=text|image       (web app, prod)
        └─► POST http://157.90.168.197:3030/publish/{reel,image-reel}
                  Hetzner worker (chunky-crayon-worker.service)
                    1. Pick or generate the source                  (text: Perplexity scene; image: photo_library_entries)
                    2. Drive prod chunkycrayon.com via Playwright   (record/session.ts | record/image-session.ts)
                    3. Wait for region store to hydrate              (waitForRegionStoreReady, 15min timeout)
                    4. Generate voiceover via ElevenLabs             (kid + adult tracks)
                    5. Composite via Remotion                        (DemoReel.tsx | ImageDemoReel.tsx)
                    6. Upload mp4 + cover.jpg + story.mp4 to R2       (assets.chunkycrayon.com/reels/demo/<id>-<ts>.*)
                    7. Write demoReelUrl + demoCoverUrl + demoReelStoryUrl to coloring_images row

Vercel cron (later that day, per-platform)
  └─► GET /api/social/post?type=demo-reel&platform=instagram|facebook|tiktok|pinterest
        └─► reads demoReelUrl from latest row, posts to that network
```

## Where things live

| Concern                | Path                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Produce route (Vercel) | `apps/chunky-crayon-web/app/api/social/demo-reel/produce/route.ts`                          |
| Cron schedule          | `apps/chunky-crayon-web/vercel.json` (search `/demo-reel/produce`)                          |
| Worker entrypoint      | `apps/chunky-crayon-worker/src/index.ts` (`/publish/reel`, `/publish/image-reel`)           |
| Playwright recorders   | `apps/chunky-crayon-worker/src/record/session.ts` (text), `record/image-session.ts` (image) |
| Remotion compositions  | `apps/chunky-crayon-worker/src/video/compositions/DemoReel.tsx`, `ImageDemoReel.tsx`        |
| Photo library schema   | `packages/db/prisma/schema.prisma` (`PhotoLibraryEntry`)                                    |
| Photo seed script      | `apps/chunky-crayon-web/scripts/seed-photo-library.ts`                                      |
| Photo seed data        | `apps/chunky-crayon-web/scripts/data/photo-library-seed.json`                               |
| Per-platform post cron | `apps/chunky-crayon-web/app/api/social/post/route.ts`                                       |

## Photo library (image variant only)

The image variant needs an input photo. We keep a curated, kid-safe pool in `photo_library_entries` so the cron never has to think about which photo to use.

**Schema** (see `PhotoLibraryEntry` model):

- `url` — public R2 URL the worker uploads to the photo-to-coloring form
- `category` — `animal` | `nature` | `food` | `vehicle` | `object`
- `safe` — moderation flag (always `true` for current entries)
- `lastUsed` — bumped each time a reel uses the entry; `NULL` rows picked first
- `brand` — `CHUNKY_CRAYON` (CH would seed its own pool if it ever ships image reels)

**Worker query** (`apps/chunky-crayon-worker/src/index.ts:924`):

```ts
SELECT id, url
FROM photo_library_entries
WHERE brand = 'CHUNKY_CRAYON' AND safe = true
ORDER BY "lastUsed" ASC NULLS FIRST, random()
LIMIT 1
```

If the table is empty, the worker returns `500 photo_library_empty` and the image-reel cron silently fails for the day. **No image reel can run without seeded photos.**

### Seeding

Both dev and prod must be seeded. The script reads `scripts/data/photo-library-seed.json`, downloads each Unsplash URL, re-uploads to the active R2 bucket under `public/photo-library/<category>/<ts>-<rand>.jpg`, and inserts a row with the R2 URL.

```bash
cd apps/chunky-crayon-web

# Dev
set -a && source .env.local && set +a
pnpm tsx scripts/seed-photo-library.ts

# Prod (pull env first)
vercel env pull /tmp/cc-prod.env --environment=production --yes
set -a && source /tmp/cc-prod.env && set +a
pnpm tsx scripts/seed-photo-library.ts
```

Idempotent — dedupes by `alt` text. Re-running with a new seed entry inserts only the new one.

### Adding a new photo

1. Add an entry to `scripts/data/photo-library-seed.json` with a working Unsplash URL, kid-safe category, and short `alt` describing the image.
2. Run the seed against dev and prod (above).
3. Verify with `SELECT count(*) FROM photo_library_entries WHERE brand = 'CHUNKY_CRAYON' AND safe = true;` — should match the JSON length.

### Removing a bad photo

Delete the row from the DB and the matching object from R2:

```sql
DELETE FROM photo_library_entries WHERE alt = '<exact alt>';
```

The R2 object stays referenced from any reels that already used it (via `coloring_images.demoReelUrl` / source-photo card frames), so we don't bulk-delete the R2 bucket prefix. Manual cleanup only.

## The Hetzner worker

Lives at `157.90.168.197:3030`. Service: `chunky-crayon-worker.service`. SSH key: `~/.ssh/id_ed25519` (Ezeikel's laptop). See [`HETZNER_BOX.md`](../../HETZNER_BOX.md) for full ops docs.

Common commands:

```bash
# Health check
curl http://157.90.168.197:3030/health

# Tail logs
ssh root@157.90.168.197 'journalctl -u chunky-crayon-worker -f'

# Recent logs filtered to demo reels
ssh root@157.90.168.197 'journalctl -u chunky-crayon-worker --since "1 day ago" | grep -E "publish/reel|publish/image-reel"'

# Service status
ssh root@157.90.168.197 'systemctl status chunky-crayon-worker'

# Restart
ssh root@157.90.168.197 'systemctl restart chunky-crayon-worker'
```

The worker is deployed via GitHub Action on push to `main` — the workflow SSHes in and runs `git pull && bun install && systemctl restart chunky-crayon-worker`. Don't deploy by hand.

## Manual trigger

To run a reel outside the cron (testing, recovery):

```bash
# Get the worker secret
vercel env pull /tmp/cc-prod.env --environment=production --yes
WORKER_SECRET=$(grep WORKER_SECRET /tmp/cc-prod.env | cut -d= -f2 | tr -d '"')

# Text variant
curl -X POST http://157.90.168.197:3030/publish/reel \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Image variant
curl -X POST http://157.90.168.197:3030/publish/image-reel \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Image variant with a specific photo URL (skips library)
curl -X POST http://157.90.168.197:3030/publish/image-reel \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"photoUrl":"https://example.com/cat.jpg"}'
```

Each run takes 5-10 minutes. The HTTP request will likely time out before the worker finishes — that's expected, it writes back to the DB when done. Watch `demoReelUrl` on the latest `coloring_images` row to confirm completion.

## Failure modes (real ones we've hit)

### Empty `photo_library_entries`

**Symptom:** `--> POST /publish/image-reel 500 614ms` immediately, with `relation "photo_library_entries" does not exist` (table missing) or `photo_library_empty` (table empty) in the worker journal.

**Root cause we hit on Apr 26 2026:** the table was wrongly identified as "unused" in a prior debugging session and dropped from dev along with all 13 R2 photos. Migration was already in git, so the next `pnpm db:migrate` re-applied an empty schema; CI deployed the same empty schema to prod. Image reels broke for several days.

**Fix:** re-run `seed-photo-library.ts` against the affected env. The seed JSON is the source of truth.

**Prevention:** see [Investigation rules](#investigation-rules) below — anything referenced from `apps/chunky-crayon-worker/` or named in a `vercel.json` cron path is in use even if no app code calls it.

### Region store never lands

**Symptom:** worker log shows `error: Region store never landed after 15min wait — refusing to fall through to legacy reveal path`. POST returns `500 ~1200s`.

**Root cause:** the region-store generator (Bun + Sharp + Claude vision) didn't write `regionMapUrl` + `regionsJson` to the `coloring_images` row inside 15 minutes. Usually a transient R2 / Claude API issue, sometimes a malformed SVG that the labelling pass can't parse.

**Fix:** retry the next cron (most are transient). If repeated, check `[RegionStore] Labelling pass failed` in the journal for the specific image ID and regenerate via `POST /api/dev/regenerate-region-store/<id>`.

### Submit on prod homepage 500s

**Symptom:** worker log shows `[browser:error] Failed to load resource: the server responded with a status of 500` after submit click, then `TimeoutError: forURL: Timeout 180000ms exceeded`.

**Root cause:** prod web app threw an error on the create action. Usually a rate limit upstream (OpenAI / Perplexity) or a transient deploy hiccup.

**Fix:** check Vercel runtime logs for `/api/coloring-image/generate` errors at the same timestamp. Retry next cron.

### Service restarted mid-render

**Symptom:** worker logs show `Stopped chunky-crayon-worker.service` mid-flow, then a fresh `Started`. The reel that was rendering is lost; `demoReelUrl` never gets written.

**Root cause:** GitHub Actions deploy fired during the cron window, OR the systemd unit hit an OOM. The box has 4.8GB peak memory under load — not a lot of headroom.

**Fix:** stagger deploys away from 06:00 UTC if you're shipping changes. The cron will retry the next scheduled day.

### `[CANVAS_SYNC_WEB] Server error: 401`

**Symptom:** lots of these in the worker journal during recording.

**Root cause:** the worker's headless browser isn't logged in, so the canvas progress sync API rejects writes. Benign — recording doesn't depend on progress sync.

**Fix:** ignore.

## Investigation rules

We deleted the `photo_library_entries` data once because investigation grepped only `apps/chunky-crayon-web/` and concluded "nothing uses this table." The worker DOES use it. Don't make the same mistake.

**Before declaring an apparently-unused table, R2 prefix, env var, or migration "safe to drop":**

1. Grep the whole repo, including `apps/chunky-crayon-worker/`, `apps/chunky-crayon-mobile/`, `packages/`, and **all `scripts/` folders**. The worker is a separate Bun service that gets missed by default greps from app dirs.
2. Search `vercel.json` for cron paths that hit it.
3. Check `apps/*/src/app/api/` route handlers and `apps/*/app/actions/` server actions for raw SQL that mentions the table name.
4. If a seed script + JSON exists in git, the table is intentional even if currently empty. The seed is the spec.
5. Check the GitHub Action workflows in `.github/workflows/` — sometimes things are referenced only by CI.
6. If the migration is committed in git, the table is intentional. Empty data is not the same as unused.

When in doubt, leave it alone and ask. A dropped table costs hours of "why did demo reels stop?"; a kept-but-empty table costs nothing.
