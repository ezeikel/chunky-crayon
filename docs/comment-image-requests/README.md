# Comment → image requests (`#drawthis`)

User comments `#drawthis a unicorn cake` on an IG or FB post; Chunky Crayon generates a coloring page and delivers it back via DM (IG) or as a nested comment reply with a link (FB). Doubles as our IG/FB **AI auto-reply** system for all other comments.

This system spans:

- Meta webhook (Facebook + Instagram subscriptions, one shared receiver)
- Vercel route handler at `/api/facebook/webhook`
- Three-vendor LLM moderation triad with Opus 4.7 tie-break
- DB queue table `social_comment_queue`
- Hetzner worker (existing image-gen pipeline; reused via `createColoringImageForCommentRequest`)
- Two Vercel crons (process every 2min, catch-up daily)
- Slack Block Kit moderation messages with Approve/Reject buttons

Easy to miss in greps: `apps/chunky-crayon-worker/` runs the gen pipeline asynchronously after the action dispatches.

## End-to-end flow (#drawthis)

```
IG/FB user comments "#drawthis a unicorn cake"
        │
        ▼  webhook POST
/api/facebook/webhook  ── verifies X-Hub-Signature-256
        │
        ▼  extractImageRequestPrompt() matches
INSERT social_comment_queue { commentType: IMAGE_REQUEST, extractedPrompt: "a unicorn cake" }
        │
        ▼  handleImageRequest()
moderatePrompt()  ── 3-tier kid-safety gate (see below)
        │
   ┌────┴────┐──────────────┐
   ▼         ▼              ▼
 SAFE     BORDERLINE     BLOCKED
   │         │              │
   │         ▼              ▼
   │  Slack message    Reply "couldn't make"
   │   to #cc-mod      + IG sorry DM
   │         │         row → SKIPPED
   │   ┌─────┴─────┐
   │   ▼           ▼
   │ Approve     Reject
   │   │           │
   │   └─→ same    └─→ same as BLOCKED
   │       as SAFE
   ▼
"on it ✨" reply posted to comment
createColoringImageForCommentRequest()
        │
        ▼  POST worker /jobs/coloring-image/start
Hetzner worker generates ~3min
ColoringImage row flips GENERATING → READY
        │
        ▼  every 2 minutes
/api/cron/social-comments/process
   poll AWAITING_GENERATION rows
        │
   ┌────┴────┐
   ▼         ▼
   IG       FB
   │         │
   │   sendImageDM(authorId, img.url, caption)
   │   row → DM_SENT
   │
   FB: replyToFacebookComment(commentId, "done! ✨ <canonical-url>")
   row → DM_SENT
```

## Auto-reply flow (everything else)

Same webhook path, but `extractImageRequestPrompt` returns null:

```
INSERT social_comment_queue { commentType: null, status: PENDING, processAfter: now+2-5min jitter }
        │
        ▼  every 2 minutes
/api/cron/social-comments/process
   classifyComment() → Gemini Flash → { commentType, shouldReply }
   if shouldReply: generateCommentReply() → Sonnet 4.5 → reply text
   replyToComment() / replyToFacebookComment()
   row → REPLIED
   like the original comment (best-effort)
```

## Three-tier kid-safety moderation

For `#drawthis` only (auto-reply path doesn't moderate prompts — there's no prompt to moderate). Lives in `apps/chunky-crayon-web/lib/image-request.ts → moderatePrompt`.

| Gate                   | What                                                                             | Latency | On hit                                           |
| ---------------------- | -------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1. Blocklist           | `findBlockedContent` from `lib/scene-generation.ts`                              | <1ms    | Route to triad (not auto-block — too aggressive) |
| 2. OpenAI moderation   | `moderateVoiceText`                                                              | ~200ms  | `!ok` → **blocked** (no triad)                   |
| 3a. Triad parallel     | Haiku 4.5 + Gemini 3 Flash + GPT-5.4 mini                                        | ~700ms  | Unanimous decision applied                       |
| 3b. Opus 4.7 tie-break | Adaptive thinking, only fires on triad disagreement or any `clearly_unsafe` vote | ~3-4s   | Final verdict                                    |

Decision-to-status mapping:

| Final decision | Queue row status                        | User visibility                                 |
| -------------- | --------------------------------------- | ----------------------------------------------- |
| **safe**       | AWAITING_GENERATION → DM_SENT           | "on it ✨" → image DM (IG) / link reply (FB)    |
| **borderline** | PENDING (parked) + Slack moderation msg | Nothing visible until approved/rejected         |
| **blocked**    | SKIPPED                                 | "Sorry, couldn't make that" reply + IG sorry DM |

Fail-safe: any error in the moderation pipeline routes to **borderline** (not safe). Better to miss a magic moment than auto-fire something unsafe.

## Slack moderation

Channel: `#cc-moderation` in the Chewy Bytes Slack workspace.

Bot app: **Chewy Bytes Ops** (Slack app), interactivity request URL `https://chunkycrayon.com/api/admin/slack/interact`.

`action_id` format: `cc:image-request:<approve|reject>:<queueRowId>`. The `cc:` prefix is reserved so PTP / AM can share the same bot + dispatch endpoint in future without action_id collisions.

When **borderline** fires:

1. `lib/slack.ts → buildModerationMessage` constructs a Block Kit message with Approve / Reject buttons
2. `postBlockKitMessage` sends it; `chat.postMessage` returns `{ channel, ts }`
3. Row is updated with `slackChannelId` + `slackMessageTs`, status stays `PENDING`

When a button is tapped:

1. Slack POSTs `application/x-www-form-urlencoded` to `/api/admin/slack/interact` with the JSON in a `payload` field
2. We verify `X-Slack-Signature` over the raw body using `SLACK_SIGNING_SECRET`
3. Parse `action_id`, branch on `approve` vs `reject`
4. Run the work in the background (`void`) — Slack needs 200 within 3s
5. `chat.update` the original message to `✅ Approved by @user` / `❌ Rejected by @user`

If Slack is down when borderline fires, we fail safe by treating it as blocked (sorry reply + IG sorry DM). The row's `errorMessage` records `borderline-slack-failed:…` for later debugging.

## Database

Table: `social_comment_queue` (migration `20260513071143_add_social_comment_queue`).

Key statuses:

| Status              | Meaning                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| PENDING             | Just queued (AI-reply flow waiting for jitter, or borderline parked in Slack)        |
| PROCESSING          | Cron is mid-flight on this row (AI-reply only)                                       |
| AWAITING_GENERATION | `#drawthis` approved, worker dispatched, cron polling for READY                      |
| DM_SENT             | Image DM delivered (IG) or link reply posted (FB) — terminal success for `#drawthis` |
| REPLIED             | AI auto-reply posted — terminal success for the auto-reply flow                      |
| LIKED               | Liked instead of replied — terminal success (thread-reply path, dormant in v1)       |
| SKIPPED             | Classifier or moderation decided not to engage                                       |
| FAILED              | Retries exhausted                                                                    |

Key indexes:

- `(status, processAfter)` — process cron's main query
- `(postId, authorId, isThreadReply, status)` — thread-reply loop prevention on FB
- `(commentType, status)` — image-request poll

## Endpoints

| Path                                          | Caller                        | Purpose                                                                      |
| --------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `GET /api/facebook/webhook`                   | Meta subscription handshake   | Verify `hub.verify_token` against `FACEBOOK_WEBHOOK_VERIFY_TOKEN`            |
| `POST /api/facebook/webhook`                  | Meta (per comment)            | Receive comment events, signature-verify, queue + maybe `handleImageRequest` |
| `GET /POST /api/cron/social-comments/process` | Vercel cron (every 2min)      | Drive PENDING + AWAITING_GENERATION rows to terminal states                  |
| `GET/POST /api/cron/social-comments/catch-up` | Vercel cron (daily 04:00 UTC) | FB-only: scan 7-day post window for webhook-missed comments                  |
| `POST /api/admin/slack/interact`              | Slack interactivity           | Approve/Reject buttons → run gen or send sorry                               |

## Required environment variables

All on Vercel (CC project) + local `.env.local` for dev.

| Var                              | Purpose                                                                                                                | How to source                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN`  | GET handshake check — Meta calls once on subscription. Replaces the hardcoded value that used to be in the stub route. | Generate a random string (e.g. `openssl rand -hex 16`). Paste into Meta App Dashboard → Webhooks → "Verify Token" when subscribing. |
| `FACEBOOK_BUSINESS_APP_SECRET`   | POST signature verification — HMAC SHA256 over the raw body.                                                           | Meta App Dashboard → Settings → Basic → "App Secret"                                                                                |
| `FACEBOOK_PAGE_ACCESS_TOKEN`     | Graph API calls (already in env for other CC features)                                                                 | Token refresh cron                                                                                                                  |
| `INSTAGRAM_ACCOUNT_ID`           | Identify our own IG comments to skip them. Already in env.                                                             | Meta dashboard                                                                                                                      |
| `FACEBOOK_PAGE_ID`               | Identify our own FB comments to skip them. Already in env.                                                             | Meta dashboard                                                                                                                      |
| `CRON_SECRET`                    | Bearer auth for crons. Already in env.                                                                                 | Existing                                                                                                                            |
| `SLACK_BOT_TOKEN`                | `xoxb-…`, used by `chat.postMessage` and `chat.update`                                                                 | Slack app → OAuth & Permissions, after installing                                                                                   |
| `SLACK_SIGNING_SECRET`           | Verify interactivity payload signatures                                                                                | Slack app → Basic Information                                                                                                       |
| `SLACK_CC_MODERATION_CHANNEL_ID` | Where borderline messages go                                                                                           | Slack: right-click `#cc-moderation` channel → View channel details → Channel ID at bottom                                           |
| `SOCIAL_COMMENT_BATCH_SIZE`      | Optional — defaults to 10                                                                                              | Override to throttle process-cron volume                                                                                            |

## One-time setup checklist

### Meta App (Facebook Developer Console)

1. **Generate `FACEBOOK_WEBHOOK_VERIFY_TOKEN`** — `openssl rand -hex 16` and add to Vercel env.
2. **Subscribe webhook** — Meta App Dashboard → Webhooks → Add subscription:
   - **Object**: `Page`. **Callback URL**: `https://chunkycrayon.com/api/facebook/webhook`. **Verify Token**: the value above. **Fields**: `feed` (catches comment add/edit/remove on Page posts).
   - **Object**: `Instagram`. Same Callback URL + Verify Token. **Fields**: `comments`.
3. **Copy `FACEBOOK_BUSINESS_APP_SECRET`** from Settings → Basic → App Secret. Add to Vercel env.
4. **Subscribe the Page to your IG account** (one-time per FB Page / IG Business account pairing) using the Graph API Explorer: `POST /{page-id}/subscribed_apps?subscribed_fields=feed`.

### Slack (Chewy Bytes workspace)

1. **Create app** — https://api.slack.com/apps → Create New App → From scratch → "Chewy Bytes Ops" in workspace `chewybytes`.
2. **OAuth & Permissions** → Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `files:write` (reserved for future "post the generated image into the moderation thread")
3. **Install to workspace** → copy `xoxb-…` token. Add as `SLACK_BOT_TOKEN` in Vercel env.
4. **Basic Information** → Signing Secret → add as `SLACK_SIGNING_SECRET` in Vercel env.
5. **Interactivity & Shortcuts** → Enable → Request URL = `https://chunkycrayon.com/api/admin/slack/interact`.
6. **Create channel `#cc-moderation`** in Slack. Invite the bot: `/invite @chewy-bytes-ops`. Copy channel ID (right-click channel → View channel details → ID at bottom). Add as `SLACK_CC_MODERATION_CHANNEL_ID` in Vercel env.
7. Note: free tier hides messages older than 90 days. The DB row is the source of truth — don't rely on Slack scrollback for audit. Keep the channel for live decisions only.

### Vercel

After Meta + Slack are set up, push each new env var via the CC app dir:

```bash
cd apps/chunky-crayon-web
vercel env add FACEBOOK_WEBHOOK_VERIFY_TOKEN
vercel env add FACEBOOK_BUSINESS_APP_SECRET
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_SIGNING_SECRET
vercel env add SLACK_CC_MODERATION_CHANNEL_ID
# Choose Production + Preview + Development for each (space to multi-select).
```

## Failure modes + recovery

| Symptom                                      | Likely cause                                                                                             | Fix                                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook returns 403 "Invalid signature"      | `FACEBOOK_BUSINESS_APP_SECRET` missing or wrong in Vercel                                                | Re-pull `Settings → Basic → App Secret`, update env var, redeploy                                                                                                                  |
| Webhook returns 403 on subscription verify   | `FACEBOOK_WEBHOOK_VERIFY_TOKEN` doesn't match what was set in Meta Dashboard                             | Re-set both ends to the same value                                                                                                                                                 |
| Webhook returns 200 but no rows inserted     | Likely IG `comments` or FB `feed` subscription missing on the Page                                       | Re-subscribe via Graph API Explorer (see setup step 4)                                                                                                                             |
| `#drawthis` reply posts but DM never arrives | Outside the 7-day IG comment window (shouldn't happen — comment IS the trigger), or `sendImageDM` failed | Check Vercel logs for `image-request` action. Often falls back to text-DM with the R2 URL.                                                                                         |
| Borderline never gets to Slack               | `SLACK_CC_MODERATION_CHANNEL_ID` missing, or bot not invited to channel                                  | Re-invite bot to channel; re-set env var. Failed Slack posts log `Slack postMessage failed` and fall through to blocked-fail-safe.                                                 |
| Slack button click 404s                      | Interactivity Request URL misconfigured in Slack app                                                     | Set to `https://chunkycrayon.com/api/admin/slack/interact`                                                                                                                         |
| Many rows stuck in `AWAITING_GENERATION`     | Worker is down / stuck                                                                                   | Check `apps/chunky-crayon-worker/` logs on Hetzner. Worker's own 15-min stale-cleanup flips the linked `ColoringImage` to FAILED, and the next process-cron tick sends a sorry DM. |
| All `#drawthis` rows landing in SKIPPED      | OpenAI moderation API down (gate 2 blocks everything)                                                    | Check OpenAI status. Triad still functions but gate 2 is sequential before it.                                                                                                     |

## Testing locally

The webhook signature check fails open in dev (no `FACEBOOK_BUSINESS_APP_SECRET` set), so curl probes work:

```bash
curl -X POST http://localhost:3000/api/facebook/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "object": "instagram",
    "entry": [{
      "changes": [{
        "field": "comments",
        "value": {
          "id": "test-comment-1",
          "text": "#drawthis a unicorn cake",
          "from": { "id": "test-user-1", "username": "testkid" },
          "media": { "id": "test-media-1" }
        }
      }]
    }]
  }'
```

This will: insert a queue row, run the moderation triad (real LLM calls!), and attempt to reply to a non-existent comment via Graph API (which will 400 and surface in logs but not break the test).

To test without burning LLM credits, comment out the moderation triad call in `lib/image-request.ts → moderatePrompt` and hardcode `{ decision: 'safe' }`.
