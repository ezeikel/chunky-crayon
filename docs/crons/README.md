# Daily content crons

The blog and daily-image crons are **fire-and-forget**: Vercel cron routes are thin triggers (return 202 in <1s) that hand off to the Hetzner worker, which owns the full pipeline (LLMs, image gen, persist). The worker has no timeout, the Vercel route exits before any long work runs.

This was a migration from "Vercel cron does everything in ≤300s" — that broke when gpt-image-1.5 → gpt-image-2 pushed image generation past Vercel's 300s function ceiling on April 28 2026.

## Moving parts

| Piece                          | Where                                                                                                                                                                                                            | What it does                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel cron schedule           | [`apps/chunky-crayon-web/vercel.json`](../../apps/chunky-crayon-web/vercel.json)                                                                                                                                 | Fires `/api/blog/generate` daily at 06:00 UTC, `/api/coloring-image/generate` daily at 08:00 UTC                                                                                                              |
| Vercel route — blog            | [`apps/chunky-crayon-web/app/api/blog/generate/route.ts`](../../apps/chunky-crayon-web/app/api/blog/generate/route.ts)                                                                                           | POSTs `${WORKER_URL}/generate/blog-post`, returns 202                                                                                                                                                         |
| Vercel route — daily image     | [`apps/chunky-crayon-web/app/api/coloring-image/generate/route.ts`](../../apps/chunky-crayon-web/app/api/coloring-image/generate/route.ts)                                                                       | POSTs `${WORKER_URL}/generate/daily-image`, returns 202                                                                                                                                                       |
| Worker route — blog            | [`apps/chunky-crayon-worker/src/index.ts`](../../apps/chunky-crayon-worker/src/index.ts) (`/generate/blog-post`)                                                                                                 | Bearer auth, fires pipeline in background, returns 202                                                                                                                                                        |
| Worker route — daily image     | same file (`/generate/daily-image`)                                                                                                                                                                              | Same shape; also installs Neon WebSocket keepalive scoped to the pipeline lifetime                                                                                                                            |
| Worker pipeline — blog         | [`apps/chunky-crayon-worker/src/blog/pipeline.ts`](../../apps/chunky-crayon-worker/src/blog/pipeline.ts)                                                                                                         | Sanity covered-topic fetch + idempotency check → Claude meta + content + image-prompt → gpt-image-2 → Sanity asset upload → post create                                                                       |
| Worker pipeline — daily image  | [`apps/chunky-crayon-worker/src/coloring-image/daily-pipeline.ts`](../../apps/chunky-crayon-worker/src/coloring-image/daily-pipeline.ts)                                                                         | Perplexity scene gen → Claude cleanup → gpt-image-2 → metadata vision + SVG trace + WebP encode (parallel) → Prisma row → R2 uploads → fire region-store / background-music / colored-reference / fill-points |
| Scene gen                      | [`apps/chunky-crayon-worker/src/coloring-image/daily-scene.ts`](../../apps/chunky-crayon-worker/src/coloring-image/daily-scene.ts)                                                                               | Perplexity Sonar w/ structured output, content blocklist, keyword-similarity dedup against last 30 days of DAILY rows. Static fallback list (~12 scenes) for the rare case Perplexity dies 3× in a row.       |
| Shared content (cross-runtime) | [`packages/coloring-core/src/blog/`](../../packages/coloring-core/src/blog/) (prompts + topics) and [`packages/coloring-core/src/scene/`](../../packages/coloring-core/src/scene/) (prompts + seasonal calendar) | Both web and worker import from here; web re-exports for back-compat                                                                                                                                          |

## Architecture

```
Vercel cron schedule (vercel.json)
    │  every day at 06:00 / 08:00 UTC
    ▼
Vercel route handler
  • /api/blog/generate            → POST worker /generate/blog-post
  • /api/coloring-image/generate  → POST worker /generate/daily-image
  • Auth: WORKER_SECRET bearer
  • Returns 202 in <1s, function exits
  │
  ▼ HTTP fire-and-forget
Worker route (Hono, bearerAuth middleware)
  • Returns 202 immediately
  • Spawns background pipeline via .catch(...)
  │   (daily-image route also installs a 60s SELECT 1 keepalive
  │    on the Neon WebSocket — see Failure modes below)
  ▼
Worker pipeline (no timeout)
  • blog: ~4-5min  (4 LLM calls + gpt-image-2 + Sanity work)
  • daily: ~5-6min (scene + clean + gpt-image-2 + meta + trace + R2 + DB + 4-way derived assets)
  ▼
On error at any step:
  sendAdminAlert (Resend) → SOCIAL_DIGEST_EMAIL
  Vercel never sees the failure — alerts are the only signal
```

## Where things live

- **Worker**: `/opt/chunky-crayon/apps/chunky-crayon-worker/` on Hetzner (`157.90.168.197`).
- **Worker env**: `/opt/chunky-crayon/apps/chunky-crayon-worker/.env` — must include all the keys in the table below.
- **Worker logs**: `journalctl -u chunky-crayon-worker --since '1 hour ago'` over SSH.
- **Worker deploy**: `.github/workflows/deploy-chunky-crayon-worker.yml` triggers on push to `main` that touches `apps/chunky-crayon-worker/**`. Hetzner pulls + restarts via SSH.

## Required env vars on the worker

| Key                                                                               | What it's for                                                        | Why it's needed                                                                        |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `WORKER_SECRET`                                                                   | Bearer auth on `/generate/*`, `/publish/*`                           | Vercel routes pass `Authorization: Bearer ${WORKER_SECRET}`; must match worker's value |
| `OPENAI_API_KEY`                                                                  | gpt-image-2 + GPT 5.2 vision (metadata)                              | Both pipelines                                                                         |
| `ANTHROPIC_API_KEY`                                                               | Claude Sonnet 4.5 (cleanup, meta, content, image prompt)             | Both pipelines                                                                         |
| `PERPLEXITY_API_KEY`                                                              | Sonar scene gen                                                      | daily-image only                                                                       |
| `GOOGLE_GENERATIVE_AI_API_KEY`                                                    | Gemini (colored reference, region store labelling)                   | daily-image derived assets                                                             |
| `DATABASE_URL` / `DATABASE_URL_DIRECT`                                            | Prisma + Neon (pooled and direct)                                    | daily-image (Prisma row + region store)                                                |
| `R2_*` (`ACCESS_KEY_ID`, `BUCKET`, `ENDPOINT`, `PUBLIC_URL`, `SECRET_ACCESS_KEY`) | Image / SVG / region map uploads                                     | daily-image                                                                            |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` (`oq2k3ewu`)                                      | Sanity client                                                        | blog only                                                                              |
| `NEXT_PUBLIC_SANITY_DATASET` (`production`)                                       | Sanity client                                                        | blog only                                                                              |
| `NEXT_PUBLIC_SANITY_API_VERSION` (`2025-02-19`)                                   | Sanity client                                                        | blog only                                                                              |
| `SANITY_API_TOKEN`                                                                | Write client (post + author + asset upload)                          | blog only                                                                              |
| `RESEND_API_KEY`                                                                  | Failure admin alerts                                                 | both pipelines                                                                         |
| `SOCIAL_DIGEST_EMAIL`                                                             | Recipient for failure alerts                                         | both pipelines                                                                         |
| `ELEVENLABS_API_KEY` + voice IDs                                                  | Background music for daily image                                     | daily-image derived assets                                                             |
| `REPLICATE_API_TOKEN`                                                             | FLUX (image quality fallback path, not currently fired in cron flow) | optional                                                                               |
| `CC_ORIGIN`                                                                       | Web origin for cache revalidation callbacks                          | both                                                                                   |

The `NEXT_PUBLIC_*` prefix on Sanity vars is harmless on the worker — they're public values and Hetzner doesn't have a build-time/runtime split, the prefix is purely a Next.js convention. Kept matching for parity with the web app's `lib/sanity/client.ts`.

## Failure modes (real ones we've hit)

### "Cron has gone silent for days, no admin alert"

**Symptom**: blog or daily image stops appearing, no Resend email arrives, Vercel logs show 504 on `/api/blog/generate`.
**Root cause**: pre-migration. Vercel function timed out at 300s; the action's `try/catch` never reached `sendAdminAlert` because the function was killed mid-execution.
**Fix**: this migration. Vercel exits in <1s now; failures land on the worker, where every error path goes through `sendAdminAlert` before the promise rejects.
**Test**: `curl -X POST https://www.chunkycrayon.com/api/blog/generate` → expect HTTP 202 in <2s.

### "Worker returned 202 but no Sanity post landed and no email"

**Symptom**: Vercel route fires fine, worker returns 202, but Sanity has no new post and no admin alert email.
**Root cause**: usually missing/wrong worker env var (see table above). The pipeline throws on the first call to a missing client, lands in the top-level `catch`, attempts `sendAdminAlert` — but if `RESEND_API_KEY` itself is missing, the alert silently logs `[admin-alert] RESEND_API_KEY not set, skipping alert` and you have no signal.
**Fix**: `ssh root@157.90.168.197 "journalctl -u chunky-crayon-worker --since '20 minutes ago' --no-pager | grep -E 'blog-cron|daily-cron|admin-alert'"` always shows what happened.

### "Daily image saved everything except `regionMapUrl`"

**Symptom**: Prisma row has `url`, `svgUrl`, `qrCodeUrl`, `backgroundMusicUrl`, `coloredReferenceUrl`, `fillPointsJson` populated — but `regionMapUrl` is null. Worker logs show `[region-store] DB write attempt 1/3 failed ... timed out after 30000ms`.
**Root cause**: when daily-cron and a manual `/generate/region-store` call run concurrently, both compete for CPU during the ~3-4min region computation phase. Event loop stalls starve the keepalive ping, Neon drops the WebSocket, and the next `db.coloringImage.update` hangs on a half-open socket. The retry-with-`$disconnect` logic in `apps/chunky-crayon-worker/src/record/region-store.ts` is supposed to handle this but `db.$disconnect()` itself can hang in this state.
**Workaround**: don't run the daily-image cron and a `/generate/region-store` backfill at the same time. If you've hit this state, restart the worker (`systemctl restart chunky-crayon-worker`) and re-trigger the region-store endpoint solo for the affected `imageId`.
**Real fix (not done)**: investigate why `db.$disconnect()` hangs and either give it a `withTimeout` wrapper or switch to a pool that handles half-open sockets without manual disconnect.

### "blog cron runs but says 'all topics covered'"

**Symptom**: admin alert email arrives saying all topics in `BLOG_TOPICS` have been covered.
**Root cause**: 270 topics in `packages/coloring-core/src/blog/topics.ts`, posted at 1/day = ~9 months runway. Eventually it runs out.
**Fix**: run the deep-research script to add more:

```
cd apps/chunky-crayon-web
pnpm tsx -r dotenv/config scripts/research-blog-topics.ts
```

Then merge `scripts/research-blog-topics.output.json` into `packages/coloring-core/src/blog/topics.ts` (`BLOG_TOPICS` array). Rebuild coloring-core, push, GHA redeploys both web and worker.

### "Vercel cron fired, worker returned 502"

**Symptom**: `/api/blog/generate` returns `{success: false, error: 'failed to reach worker'}` with HTTP 502.
**Root cause**: `CHUNKY_CRAYON_WORKER_URL` not set on Vercel, OR Hetzner box is down, OR the worker isn't running the new code (`/generate/blog-post` returns 404 on old deploys).
**Fix**: check `vercel env ls production --cwd apps/chunky-crayon-web | grep WORKER`, ping `curl http://157.90.168.197:3030/health`, check `systemctl status chunky-crayon-worker`.

## Manual run / debug

### Trigger blog cron manually (production)

```bash
curl -X POST https://www.chunkycrayon.com/api/blog/generate
# Expect: HTTP 202, body {"success":true,"accepted":true,"message":"blog cron handed off to worker"}
```

### Trigger daily-image cron manually (production)

```bash
curl -X POST https://www.chunkycrayon.com/api/coloring-image/generate
```

### Trigger worker pipeline directly (skip Vercel)

```bash
ssh root@157.90.168.197 'set -a; source /opt/chunky-crayon/apps/chunky-crayon-worker/.env; set +a; curl -sS -X POST http://localhost:3030/generate/blog-post -H "Content-Type: application/json" -H "Authorization: Bearer $WORKER_SECRET" -d "{}"'
```

### Watch a pipeline run

```bash
ssh root@157.90.168.197 "journalctl -u chunky-crayon-worker -f -n 0" | grep --line-buffered -E "blog-cron|daily-cron|daily-scene|admin-alert"
```

### Verify a run landed

- Blog: `*[_type == "post"] | order(_createdAt desc) [0...3]` in Sanity Vision
- Daily image: `SELECT id, title, "createdAt" FROM coloring_images WHERE "generationType" = 'DAILY' ORDER BY "createdAt" DESC LIMIT 3;` against the production Neon branch (`br-morning-leaf-a4gj86x5`)

## What's intentionally NOT here

- **User-facing photo / voice / text creation flows**: these stream gpt-image-2 partial frames via `/generate/coloring-image-stream` on the worker. Different shape (SSE, credit debit/refund), different file. Not covered here.
- **Demo reels**: see [`docs/demo-reels/`](../demo-reels/README.md). Demo reel image generation reuses parts of the daily-image pipeline but lives in its own routes (`/api/social/demo-reel/produce-v2`).
- **Coloring Habitat**: parity work is paused. CH still uses the on-Vercel pipeline; this migration covers CC only.

## History

- 2026-04-28: gpt-image-1.5 → gpt-image-2 swap deployed (commit `ca93798`). Image gen latency ~52s → ~215s.
- 2026-04-29 onward: blog cron starts 504-ing at 300s.
- 2026-05-02: this migration ships. Vercel routes shrink to 202-in-<1s thin triggers. Worker owns blog + daily-image pipelines end-to-end.
