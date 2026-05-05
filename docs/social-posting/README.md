# Social posting

Daily auto-posts to Instagram, Facebook, Pinterest, and TikTok. The social schedule lives in `vercel.json`; the unified handler at `apps/chunky-crayon-web/app/api/social/post/route.ts` does the platform-specific work; the morning brief at `/api/social/digest` summarises what's queued for the day with raw assets for manual posting.

## Moving parts

| Piece                   | Where                                                                                                   | What it does                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cron schedule           | `apps/chunky-crayon-web/vercel.json`                                                                    | Fires `/api/social/post?platform=...&type=...` paths at researched-optimum UTC times                                                                                                                                                                                                                                                                                              |
| Unified post handler    | `apps/chunky-crayon-web/app/api/social/post/route.ts`                                                   | Branches on `?type=` (carousel / demo-reel / colored-static) and `?platform=` (instagram / facebook / pinterest / tiktok). Picks today's daily image (carousel) or today's demo-reel row (demo-reel/colored-static), generates a platform-specific caption, posts via Graph API / Pinterest v5 / TikTok forwarder. Persists outcomes to `coloringImages.socialPostResults` JSONB. |
| TikTok forwarder        | `apps/chunky-crayon-web/app/api/social/tiktok/post/route.ts`                                            | The unified route forwards demo-reel TikTok posts here with `{ videoUrl, caption, coloringImageId }` body. Posts the video via TikTok Content Posting API; lands in user's Drafts (sandbox API). Has a legacy DB-lookup fallback for admin "post to TikTok" buttons that hit it without a body.                                                                                   |
| Pinterest video helper  | `apps/chunky-crayon-web/app/api/social/pinterest/video/route.ts`                                        | Used by the unified route's Pinterest video pin branch.                                                                                                                                                                                                                                                                                                                           |
| Demo-reel produce       | `apps/chunky-crayon-web/app/api/social/demo-reel/produce-v2/route.ts` (Vercel) → `/publish/v2` (worker) | Worker produces the daily demo reel + cover at 06:00 UTC. Creates a SYSTEM/`purposeKey='demo-reel'` row separate from the DAILY image row (see `docs/demo-reels/README.md`).                                                                                                                                                                                                      |
| Daily Posting Brief     | `apps/chunky-crayon-web/app/api/social/digest/route.ts`                                                 | Morning summary email (08:30 UTC) of what's queued today + assets. Renamed from "Social Digest" — it's forward-looking, fires _before_ posts go out. See [`docs/posting-brief/`](#) (covered inline in the route + memory `project_posting_brief_not_digest.md`).                                                                                                                 |
| Brief email template    | `apps/chunky-crayon-web/emails/SocialDigestEmail.tsx`                                                   | Renders the brief; sections: blog post → daily image → demo reel → stat reel (placeholder).                                                                                                                                                                                                                                                                                       |
| Engagement audit script | `apps/chunky-crayon-web/scripts/social-engagement-stats.ts`                                             | Pulls last 30d of IG + FB engagement via Graph API, aggregates by hour/day. Run periodically to validate the schedule.                                                                                                                                                                                                                                                            |

## Cron schedule (current — last tuned 2026-05-05)

All UTC. Audience-tuned for parents-of-3-8 / 70% US-East / 30% UK via Perplexity Sonar deep research.

### Weekday (Mon–Fri unless noted)

| UTC   | BST            | What                                           |
| ----- | -------------- | ---------------------------------------------- |
| 13:00 | 14:00          | FB Reel                                        |
| 13:02 | 14:02          | Pinterest video                                |
| 17:00 | 18:00          | IG Reel                                        |
| 18:00 | 19:00          | Pinterest static (line art)                    |
| 00:30 | 01:30 next day | IG Carousel (`* * * 2-6` — 8:30pm ET prev day) |
| 00:32 | 01:32 next day | TikTok (`* * * 2-6`)                           |

### Weekend (Sat + Sun)

All clustered at 17:00 UTC (1pm ET / 10am PT / 6pm BST — researched nap-time peak), spread to avoid concurrent rate limits:

| UTC   | What                        |
| ----- | --------------------------- |
| 17:00 | IG Reel                     |
| 17:02 | FB Reel                     |
| 17:04 | TikTok                      |
| 17:06 | Pinterest video             |
| 17:08 | IG Carousel                 |
| 17:10 | Pinterest static (line art) |

### Other

| UTC   | What                                             |
| ----- | ------------------------------------------------ |
| 08:30 | Daily Posting Brief email (`/api/social/digest`) |

## Paused features (handler intact, cron removed)

When you "pause" a posting type, **only the cron entry is removed from `vercel.json`**. The route handler, types, and platform-result keys all stay so the feature is a paste-the-cron-row job to re-enable.

If you find a handler that has no cron pointing at it, **don't assume it's dead — check this list first** before deleting.

### Facebook static line-art post (paused 2026-05-05)

- **Handler**: `app/api/social/post/route.ts` — `if (shouldPost('facebook')) { ... }` block (~line 1885) that calls `postToFacebookPage()` with the line-art JPEG.
- **Why paused**: 30-day engagement audit showed avg 0.05 likes / 0 comments across 17 posts.
- **Re-enable**: paste these into `vercel.json` `crons[]`:

```json
{ "path": "/api/social/post?platform=facebook", "schedule": "5 15 * * 1-5" },
{ "path": "/api/social/post?platform=facebook", "schedule": "5 14 * * 0,6" }
```

Then add to `POST_SCHEDULE` in `app/api/social/digest/route.ts` so the brief shows the scheduled time:

```ts
facebookImage: { utc: '15:05', days: 'weekday' },
// + matching entry in POST_SCHEDULE_WEEKEND
```

### Colored-static (paused 2026-05-05)

The "colored-static" slot reuses the demo-reel row's line-art SVG and posts it as a single still image ~30 min after the reel. Misleadingly named — it's the line art, not a coloured version. (See git log for `f0b11d3`.)

- **Handler**: `app/api/social/post/route.ts:1499` — entire `if (typeFilter === 'colored-static') { ... }` branch.
- **Types**: `instagramColoredStatic`, `facebookColoredStatic`, `instagramStoryColoredStatic`, `facebookStoryColoredStatic` in the `SocialPostResults` interface (~line 154).
- **Why paused**: avg 1.4 likes (IG) / 0.0 likes (FB), 0 comments. Probably siphoning engagement from the reel posted 30min earlier.
- **Re-enable**: paste these into `vercel.json` `crons[]`:

```json
{ "path": "/api/social/post?type=colored-static&platform=instagram", "schedule": "30 18 * * 1-5" },
{ "path": "/api/social/post?type=colored-static&platform=facebook", "schedule": "35 18 * * 1-5" },
{ "path": "/api/social/post?type=colored-static&platform=instagram", "schedule": "30 17 * * 0,6" },
{ "path": "/api/social/post?type=colored-static&platform=facebook", "schedule": "35 17 * * 0,6" }
```

Then add `instagramColoredStatic` and `facebookColoredStatic` rows to `POST_SCHEDULE` and `POST_SCHEDULE_WEEKEND` in the digest route so the brief shows scheduled times.

### TikTok GET cron (deleted 2026-05-05)

A separate dead path: `/api/social/tiktok/post` had its own direct cron entry (15:20 UTC weekdays / 14:20 UTC weekends) which 405'd on every fire because Vercel cron uses GET and the route only exported POST. The route serves the _unified_ social-post forwarder for TikTok demo reels — that path stayed and is the live one. The direct cron entries were truly dead. Don't bring those back.

### Animation cron / `animationUrl` flow

Daily images no longer get animated — replaced by demo reels. The `coloringImages.animationUrl` column still exists; the `/api/coloring-image/animate` route still exists; `app/api/social/tiktok/post/route.ts` has a legacy DB-lookup branch that posts `animationUrl` when called without a body (admin "post to TikTok" button). All dormant unless you decide to revive animation.

## When the schedule moves

Three things to update together. Skipping any of them creates a desync the brief will lie about.

1. **`vercel.json`** — change the cron entry.
2. **`POST_SCHEDULE` / `POST_SCHEDULE_WEEKEND`** in `app/api/social/digest/route.ts` — keep these in lockstep with `vercel.json` so the brief shows the right "scheduled HH:MM UTC" line per platform.
3. **This doc** — update the schedule table above.

If the cron path doesn't have a `socialPostResults` key (e.g. you're adding a new platform), that's also a code change — see how `instagramDemoReel` / `tiktokDemoReel` are wired in `app/api/social/post/route.ts` for the pattern.

## Failure modes (real ones we've hit)

### "Post fired, returned 200, but nothing landed on the platform"

**Symptom**: `socialPostResults` shows `success: true` for the platform but you don't see the post in your feed.
**Root cause**: TikTok specifically lands in your Drafts (sandbox API) — you have to manually publish from the TikTok app. This is by design, see the comment at `app/api/social/post/route.ts:1366`.
**Fix**: open TikTok app, hit publish on the queued draft. The brief at 08:30 UTC the next morning has the caption ready to paste if needed.

### "Demo-reel post used the wrong image"

**Symptom**: The reel posted to IG/FB/Pinterest is a different scene than today's daily image.
**Root cause**: Working as designed. Demo reel is a SEPARATE content track — see `reference_demo_reel_image_independence.md` memory + `docs/demo-reels/README.md`. The demo-reel row has its own image (typed/voice/photo variant chosen on rotation). Carousel slots use the DAILY row; reel/colored-static slots use the SYSTEM/demo-reel row.
**Fix**: nothing to fix. The brief at 08:30 UTC shows both rows so you know what's going out.

### "Brief lies about the scheduled time"

**Symptom**: Brief says "scheduled 17:00 UTC" but the cron fires at a different time, or shows "manual" for a platform that's actually scheduled.
**Root cause**: Schedule moved in `vercel.json` but `POST_SCHEDULE` / `POST_SCHEDULE_WEEKEND` in the digest route weren't updated.
**Fix**: keep both in sync — see "When the schedule moves" above.

### "FB / IG post failed with token error"

**Symptom**: `socialPostResults.facebookDemoReel.error` references an OAuthException.
**Root cause**: Meta page access tokens go stale, especially after a Facebook password change or security-session reset.
**Fix**: refresh tokens via `Personal/scripts/setup-meta-tokens.ts cc` (see top-level `~/Development/CLAUDE.md`). Needs a fresh short-lived user token from Graph API Explorer.

### "Pinterest static didn't post"

**Symptom**: `pinterest` key missing from `socialPostResults`.
**Root cause**: Usually `PINTEREST_BOARD_ID` env var missing or the board itself archived. Pinterest also requires the `Authorization: Bearer ${access_token}` from a fresh OAuth refresh.
**Fix**: check `vercel env ls production | grep PINTEREST` for `PINTEREST_BOARD_ID`. If the board exists, refresh the token via `/api/tokens/refresh` (cron at 07:00 UTC daily already does this).

## Engagement audit

Re-run periodically to validate the schedule (memory `project_social_schedule_review_cadence.md` flags every ~6 weeks):

```bash
cd apps/chunky-crayon-web
DOTENV_CONFIG_PATH=/tmp/cc-prod-env.local pnpm tsx -r dotenv/config scripts/social-engagement-stats.ts
```

(Pull prod env first via `vercel env pull --environment=production /tmp/cc-prod-env.local --cwd apps/chunky-crayon-web`.)

Outputs: per-post engagement, then aggregates by `(platform, post_type, hour_utc)` and `(platform, post_type, day_of_week)`.

Pinterest + TikTok engagement are NOT pulled — different APIs/scopes. Wire those in separately if needed.

## Manual run / debug

### Trigger a specific platform/type manually (production)

```bash
# Demo reel to Instagram
curl -X POST 'https://www.chunkycrayon.com/api/social/post?type=demo-reel&platform=instagram' \
  -H "Authorization: Bearer $CRON_SECRET"

# Static carousel to Instagram
curl -X POST 'https://www.chunkycrayon.com/api/social/post?type=carousel&platform=instagram' \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Re-send the morning brief

```bash
curl -X GET 'https://www.chunkycrayon.com/api/social/digest' \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Check what posted today

```sql
SELECT id, title, "generationType", "purposeKey", "socialPostResults"
FROM coloring_images
WHERE "createdAt" > NOW() - INTERVAL '1 day' AND brand = 'CHUNKY_CRAYON';
```

Run against prod Neon branch `br-morning-leaf-a4gj86x5`.
