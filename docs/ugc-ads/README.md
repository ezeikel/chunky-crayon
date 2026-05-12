# UGC Ads System

AI-generated UGC-style TikTok ads, posted from a small network of warmed creator accounts to drive cold traffic to Chunky Crayon. Each "persona" is a synthetic creator with a distinct face, voice, handle, posting plan, and per-creator landing-page funnel. The system handles creative generation + state tracking; the operator handles device/SIM/proxy infrastructure and the actual posting.

This doc is the system runbook. Read it before changing any UGC-ads code.

## Honest context — why the system is shaped this way

Three pieces of 2026 platform research drove the architecture:

1. **TikTok deployed C2PA detection in Jan 2025** and reports ~94.7% synthetic-face detection on upload (vendor stat, directional). Auto-detected unlabeled AI loses ~73% reach within 48h; properly labeled AI loses ~5-8%. 8,600 accounts permanently banned in H2 2025 for AI violations. Kids/family + synthetic + commerce is the exact enforcement target.
2. **ElevenLabs Voice Design** (`POST /v1/text-to-voice/design`) is the right voice path — unique per persona, commercial-licensed on any paid plan, no legal exposure from cloning a real human. Skip Voice Library (same Sarah/Rachel everyone uses).
3. **Device + IP + behavior fingerprinting is the dominant 2026 detection vector**, not just SIM. One real device or cloud phone, one residential mobile (4G/5G) proxy, anti-detect setup per persona. Shared IP across two personas = bulk-ban risk. The system **tracks** infrastructure state (Option B); operator manages it.

The realistic working window is 6-12 months before mass-ban catches up. V1 is optimized for **speed to first posted ad**, not for tooling perfection. Expect to throw away parts of this and rebuild as we learn from the first 1-2 personas.

## What a "persona" is end-to-end

A persona is:

1. A **`Persona` row** in the DB — handle, bio, display name, face brief, ElevenLabs voice ID, device/SIM/proxy fingerprint, status (`drafting` | `warming` | `active` | `banned` | `retired`), warm-up start date, account creation date.
2. A **face still** on R2 at `ugc-personas/{handle}/face.png` — the GPT Image 2 selfie used as the canonical persona look. Source of truth for identity locking later renders.
3. A **PFP still** on R2 at `ugc-personas/{handle}/pfp.png` — generated separately (different angle, outfit, lighting) via Nano Banana Pro with `face.png` as identity reference. Reverse-image-search safety: PFP and ad video are not the same image.
4. A **voice** on ElevenLabs — created via Voice Design, `voice_id` stored on the row. One voice per persona, used for every ad they post.
5. A **follow plan** in DB — Perplexity-researched accounts to follow during warm-up, by category (% niche / % adjacent / % big / % local / % unrelated, per the persona authenticity research).
6. A **warm-up schedule** — 7-14 days of daily actions (likes, comments, scroll time, follows, posts), each row a `UgcWarmUpAction` ticked off manually in the admin.
7. **Warm-up content** — 5-7 generated Seedance b-roll clips (hands-only POV, ambient, faceless) on R2 at `ugc-personas/{handle}/warmup/{n}.mp4`, plus captions.
8. A set of **ads** (`UgcAd` rows) — one or more talking-head videos with a hook, a coloring page, and a UTM-tagged link to `/start?coloring_image_id=<id>&utm_*`.
9. A **PostHog campaign tag** per persona — UTM campaign name = persona handle. PostHog rolls up clicks, prints, signups per persona.

## Where things live

| Thing                      | Path                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Persona DB schema          | `packages/db/prisma/schema.prisma` (`Persona`, `UgcAd`, `UgcWarmUpClip`, `UgcWarmUpAction`)            |
| Persona generator          | `apps/chunky-crayon-web/lib/ugc-ads/persona-generator.ts`                                              |
| Voice matcher / designer   | `apps/chunky-crayon-web/lib/ugc-ads/voice-design.ts`                                                   |
| Scene generator (no id)    | `apps/chunky-crayon-web/lib/ugc-ads/scene-generator.ts` (calls `coloring-core/scene`)                  |
| Still generator            | `apps/chunky-crayon-web/lib/ugc-ads/still-generator.ts` (Higgsfield GPT Image 2 / Nano Banana)         |
| Reverse image search       | `apps/chunky-crayon-web/lib/ugc-ads/reverse-image-check.ts` (PFP safety check)                         |
| Shared types (Zod)         | `apps/chunky-crayon-web/lib/ugc-ads/types.ts` (`FaceBrief`, `FollowList`, `WarmUpDay`)                 |
| Voice generator            | `apps/chunky-crayon-web/lib/ugc-ads/voice-generator.ts` (ElevenLabs TTS)                               |
| Video generator            | `apps/chunky-crayon-web/lib/ugc-ads/video-generator.ts` (Higgsfield Seedance 2.0)                      |
| Warm-up generator          | `apps/chunky-crayon-web/lib/ugc-ads/warmup-generator.ts` (Seedance b-roll, no identity)                |
| Hook copy writer           | `apps/chunky-crayon-web/lib/ugc-ads/hook-writer.ts` (Claude Opus 4.7)                                  |
| Frame-by-frame QC judge    | `apps/chunky-crayon-web/lib/ugc-ads/judge.ts`                                                          |
| Virality scorer            | `apps/chunky-crayon-web/lib/ugc-ads/virality.ts` (Higgsfield `brain_activity`)                         |
| R2 paths + dev/prod router | `apps/chunky-crayon-web/lib/ugc-ads/storage.ts`                                                        |
| UTM builder                | `apps/chunky-crayon-web/lib/ugc-ads/utm.ts`                                                            |
| Persona launch script      | `apps/chunky-crayon-web/scripts/launch-ugc-persona.ts`                                                 |
| Ad launch script           | `apps/chunky-crayon-web/scripts/launch-ugc-ad.ts`                                                      |
| Persona research script    | `apps/chunky-crayon-web/scripts/research-ugc-persona.ts` (Perplexity)                                  |
| Cold landing page (exists) | `apps/chunky-crayon-web/app/[locale]/start/page.tsx` (UGC plugs into existing `utm_campaign` resolver) |
| Admin UI                   | `apps/chunky-crayon-web/app/admin/ugc/page.tsx` (auth-gated)                                           |

## Architecture

```
launch-ugc-persona.ts --vibe "32yo Latina mom Austin"
       │
       │  ──► persona-generator (Claude + Perplexity)
       │       face brief, name, handle suggestions, bio, follow list,
       │       like/comment targets, warm-up day plan
       │
       │  ──► voice-design (ElevenLabs /text-to-voice/design)
       │       3 voice previews → admin picks one → /text-to-voice/:id (save)
       │
       │  ──► still-generator (Higgsfield GPT Image 2)
       │       canonical face still → R2 ugc-personas/{handle}/face.png
       │
       │  ──► still-generator (Higgsfield Nano Banana Pro, identity-locked)
       │       PFP still (different shot) → R2 ugc-personas/{handle}/pfp.png
       │
       │  ──► reverse-image-check (TinEye / Google Vision)
       │       fails loud if PFP returns >0 hits; regenerates if so
       │
       │  ──► warmup-generator (Seedance 2.0, no identity)
       │       5-7 abstract b-roll clips → R2 ugc-personas/{handle}/warmup/
       │
       │  ──► judge (frame extraction + Claude vision)
       │       reject any clip with weird artifacts / face appearance
       │
       │  ──► DB: Persona row (status='drafting'), UgcWarmUpAction rows
       │
       ▼
admin/ugc page: operator reviews + locks the persona (status='warming')
       │
       ▼
operator: provisions device + SIM + mobile proxy, creates TikTok account,
          fills in deviceId/simLast4/proxyEndpoint on Persona row
       │
       ▼
operator: works through UgcWarmUpAction rows day by day for 7-14 days,
          posting warm-up clips on the planned days
       │
       ▼
launch-ugc-ad.ts --persona <handle> [--coloringImageId <id>]
       │
       │  ──► [no id case] scene-generator → new persona-aware coloring page
       │       (existing coloring-core/scene pipeline, persona-themed prompt)
       │       saved as ColoringImage row with provenance='ugc'
       │
       │  ──► hook-writer (Claude Opus 4.7)
       │       3-5 hook variants, applying lib/ads/ copy rules
       │
       │  ──► still-generator (Nano Banana Pro identity-locked from face.png)
       │       per-hook still, persona in the right setting holding the page
       │
       │  ──► voice-generator (ElevenLabs, persona's locked voice_id)
       │       per-hook voiceover MP3
       │
       │  ──► video-generator (Seedance 2.0 audio-conditioned)
       │       --start-image=<still> --audio=<voiceover>
       │       prompt includes "don't flip the paper, only front face shown"
       │
       │  ──► judge (frame-by-frame)
       │       page integrity vs source PDF, face drift, hand anatomy
       │
       │  ──► virality (Higgsfield brain_activity)
       │       score each variant, reject below threshold
       │
       │  ──► R2 ugc-personas/{handle}/ads/{adId}/final.mp4 + stills + frames
       │
       │  ──► DB: UgcAd row (status='ready'), utm_campaign={handle},
       │       utm_content={adId}
       │
       ▼
admin/ugc page: operator downloads + posts manually,
                marks UgcAd.posted_at when uploaded
       │
       ▼
PostHog: rolls up /start?utm_campaign={handle} clicks → prints → signups
       per persona, surfaced in admin/ugc dashboard
```

## DB schema

```prisma
enum PersonaStatus {
  drafting   // generated, not yet warming
  warming    // account created, working through warm-up actions
  active     // first ad posted, ongoing
  banned     // TikTok terminated, do not reuse fingerprint
  retired    // operator-retired (burnout, drift)
}

enum PersonaPosture {
  stealth      // undisclosed AI creator, warmed account
  official     // posts via @chunkycrayon, AI labeled (reserved; v1 = stealth only)
}

model Persona {
  id                    String         @id @default(cuid())
  handle                String         @unique  // tiktok handle, no @
  displayName           String
  bio                   String         @db.Text
  status                PersonaStatus  @default(drafting)
  posture               PersonaPosture @default(stealth)

  // identity — faceBriefJson conforms to FaceBrief Zod schema in lib/ugc-ads/types.ts
  faceBriefJson         Json          // FaceBrief (see types.ts; Zod-validated on read/write)
  faceStillUrl          String         // R2 ugc-personas/{handle}/face.png
  pfpUrl                String         // R2 ugc-personas/{handle}/pfp.png
  voiceId               String         // ElevenLabs voice_id

  // research
  followListJson        Json          // {category: [{handle, why}, ...]}
  likeTargetsJson       Json
  commentTargetsJson    Json

  // infrastructure (operator-filled, tracked not automated)
  deviceLabel           String?       // "iPhone 12 Pro (UGC #1)"
  deviceFingerprint     String?       // freeform identifier
  simLast4              String?
  proxyEndpoint         String?
  proxyProvider         String?
  accountCreatedAt      DateTime?
  firstWarmupAt         DateTime?
  firstAdAt             DateTime?

  // tracking
  utmCampaign           String        @unique  // = handle, used in link in bio
  notes                 String?       @db.Text

  warmupClips           UgcWarmUpClip[]
  warmupActions         UgcWarmUpAction[]
  ads                   UgcAd[]

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model UgcWarmUpClip {
  id            String   @id @default(cuid())
  personaId     String
  persona       Persona  @relation(fields: [personaId], references: [id])
  sequence      Int      // 1..n, posting order
  prompt        String   @db.Text
  videoUrl      String   // R2
  caption       String   @db.Text
  scheduledDay  Int      // day N of warm-up
  posted        Boolean  @default(false)
  postedAt      DateTime?
  createdAt     DateTime @default(now())
}

enum WarmUpActionType {
  scroll_fyp
  follow_account
  like_video
  comment_video
  post_warmup_clip
  add_link_in_bio
}

model UgcWarmUpAction {
  id            String           @id @default(cuid())
  personaId     String
  persona       Persona          @relation(fields: [personaId], references: [id])
  day           Int              // day N of warm-up (1..14)
  type          WarmUpActionType
  target        String?          // handle/url/clip-id, depends on type
  description   String           @db.Text
  done          Boolean          @default(false)
  doneAt        DateTime?
  createdAt     DateTime         @default(now())
}

enum UgcAdStatus {
  drafting     // generation in progress
  ready        // generated, QC passed, awaiting manual post
  posted       // operator marked as live
  failed_qc    // judge or virality rejected
  killed       // pulled by operator
}

model UgcAd {
  id                  String      @id @default(cuid())
  personaId           String
  persona             Persona     @relation(fields: [personaId], references: [id])
  coloringImageId     String?     // ref to coloring_images row
  hookText            String      @db.Text
  scriptText          String      @db.Text
  stillUrl            String
  voiceoverUrl        String
  finalVideoUrl       String
  framesPrefix        String      // R2 prefix where judge frames live
  judgeReportJson     Json?
  viralityScore       Int?        // 0-100
  viralityReportUrl   String?
  status              UgcAdStatus @default(drafting)
  utmCampaign         String      // = persona.handle
  utmContent          String      // = this ad's id
  postedAt            DateTime?
  createdAt           DateTime    @default(now())
}

// UGC-generated coloring pages reuse the existing ad-campaign convention:
// `generationType = SYSTEM` + `purposeKey = 'ad:ugc-{personaHandle}'`.
// Hooks straight into the existing /start landing + getColoringImageForAdCampaign
// resolver. Campaign key = 'ugc-{handle}'. No new enum, no new resolver.
```

## R2 layout

```
ugc-personas/{handle}/
  face.png                    canonical persona face (GPT Image 2)
  pfp.png                     profile-picture variant (Nano Banana Pro)
  voice-preview.mp3           ElevenLabs voice sample for review
  warmup/
    1.mp4 2.mp4 ...           Seedance b-roll, posting order
    1-caption.txt 2-...
  ads/
    {adId}/
      still.png
      voiceover.mp3
      final.mp4
      frames/                 ffmpeg-extracted at 2fps for judge
        frame_001.jpg ...
      judge.json
      virality.json
```

Dev/prod routing via `lib/ugc-ads/storage.ts` — reads `NODE_ENV` and selects the correct R2 bucket (same pattern as bundle listings).

## Typed schemas (`lib/ugc-ads/types.ts`)

All `Json` columns on `Persona` and `UgcAd` conform to Zod schemas in `lib/ugc-ads/types.ts`. **Always parse on read AND write** — that's the only thing keeping the JSON columns honest. Drift here = silent breakage downstream.

```ts
// FaceBrief — what Claude generates and what the still-generator + judge use
export const FaceBriefSchema = z.object({
  ageRange: z.string(), // "30-34"
  ethnicity: z.string(), // "Latina (Mexican-American)"
  city: z.string(), // "Austin, TX"
  profession: z.string(), // "stay-at-home mom"
  vibe: z.string(), // "warm, slightly tired, real"
  hairDescription: z.string(),
  skinDescription: z.string(), // explicit imperfections — pores, blemishes
  clothing: z.string(), // typical outfit
  kitchenStyle: z.string(), // realistic apartment-kitchen brief
  lightingNotes: z.string(), // window direction, time-of-day default
  speechPatterns: z.string(), // for the voice-design prompt
  doNotInclude: z.array(z.string()), // explicit negatives ("no makeup", "no studio look")
});

export const FollowListSchema = z.object({
  niche: z.array(z.object({ handle: z.string(), why: z.string() })), // ~30-40%
  adjacent: z.array(z.object({ handle: z.string(), why: z.string() })), // ~15-25%
  big: z.array(z.object({ handle: z.string(), why: z.string() })), // ~10-20%
  local: z.array(z.object({ handle: z.string(), why: z.string() })), // ~10-15%
  unrelated: z.array(z.object({ handle: z.string(), why: z.string() })), // ~5-10%
});

export const WarmUpActionSchema = z.object({
  day: z.number().int().min(1).max(14),
  type: z.enum([
    "scroll_fyp",
    "follow_account",
    "like_video",
    "comment_video",
    "post_warmup_clip",
    "add_link_in_bio",
  ]),
  target: z.string().optional(),
  description: z.string(),
});
```

Persona-generator output is `FaceBrief + FollowList + WarmUpAction[]` all validated before any DB write. If Claude returns malformed JSON, the script fails loud and re-runs with a stricter prompt.

## PFP reverse image search

Generated PFPs can collide with real humans in training data. Anyone running OSINT on a flagged account reverse-image-searches the PFP — if it hits, the account is dead immediately and the cross-link risk goes up (the same generated face might be reused by another AI-creator builder).

Persona generator runs the PFP through reverse image search before saving the persona row. If hits > 0, regenerate. Hard fail after 3 regenerations (operator gets warned in the script output).

**Provider choice for v1: Google Vision Web Detection API**.

- ~$1.50 per 1,000 calls, pay-as-you-go, no monthly minimum.
- Returns `webDetection.fullMatchingImages` + `partialMatchingImages`. Treat any `fullMatchingImages` as a hard fail; `partialMatchingImages` as a warning logged for operator review.
- Alternative considered: TinEye Commercial API (~$300/mo entry) — better recall but the price doesn't justify it at 5-10 personas. SerpAPI Google Lens (~$50/mo for 5k calls) — viable fallback if Google Vision rate-limits.

Implementation in `lib/ugc-ads/reverse-image-check.ts`. Env var `GOOGLE_VISION_API_KEY`.

## Hook copy rules (from `MEMORY.md` feedback)

- Pain-point hook > value-prop hook
- Dual-path (parent win + kid win)
- US/UK-neutral spelling
- **No em dashes** (commas or fresh sentences instead)
- **No "AI"** in ad copy (parents are AI-skeptical; rewrite around outcomes)
- Accurate pricing language
- No stats

Claude Opus 4.7 system prompt for the hook writer must encode these rules verbatim.

## Frame-by-frame judge — what we actually check

The judge is failure-mode-specific, not "is this convincing." Concrete checks per ad:

1. **Page integrity over time**: extract frames at 0s, ~3s, ~6s, ~9s, ~end. Run each frame + the source coloring page PDF through Claude vision asking "does the page held in this frame match this reference, yes/no?" Reject if more than 2 frames mismatch.
2. **Face drift**: compare frame 0 and frame end. Vision: "are these the same person, yes/no?" Reject if no.
3. **Hand anatomy**: any frame with extra/missing fingers or merged hands. Vision: "any anatomically wrong hands here, yes/no?"
4. **Eye life sanity**: at least one blink between frame 0 and end (motion-vector test on eye region, or vision).
5. **Audio sync sanity**: ffprobe duration of audio vs video, must be within 0.5s.

Failures are _logged with reason, not deleted_ — we need to see the failure modes to improve prompts.

## Virality predictor threshold

Higgsfield `brain_activity` returns 0-100 overall score plus regional breakdowns. **V1 threshold: reject below 50**. This is a guess; recalibrate after the first 5 ads have known TikTok performance data to compare.

## Cost per persona (rough, May 2026 Higgsfield credits)

| Step                                 | Credits                   |
| ------------------------------------ | ------------------------- |
| Face still (GPT Image 2, 2k 9:16)    | ~15                       |
| PFP still (Nano Banana Pro)          | ~10                       |
| Warm-up clips × 5 (Seedance 2.0 12s) | ~150                      |
| Voice design (ElevenLabs)            | ~$0.10                    |
| **Persona subtotal**                 | ~175 credits + ElevenLabs |
| Hook writing (Claude Opus 4.7)       | ~$0.05                    |
| Per-ad still (Nano Banana Pro)       | ~10                       |
| Per-ad voiceover (ElevenLabs)        | ~$0.02                    |
| Per-ad video (Seedance 2.0 audio)    | ~30                       |
| Per-ad virality predictor            | ~5                        |
| **Per ad subtotal**                  | ~45 credits + ElevenLabs  |

Higgsfield Plus = 1010 credits/mo at current plan. Means roughly: 1 persona setup + ~18 ads/mo, OR 3 persona setups + ~9 ads/mo. Operator budget needs to plan for this.

## What this system does NOT do (explicit non-goals for v1)

- **Automate device/SIM/proxy provisioning** — operator does this manually. System tracks it for cross-link safety.
- **Automate posting to TikTok** — TikTok blocks API-posting for personal accounts, and headless automation is exactly what fingerprinting catches. Operator posts manually.
- **Automate warm-up actions** — same reason. System generates the plan and the assets, operator does the actions on the actual device.
- **Manage multiple postures** (stealth vs official) — v1 is stealth-only. The `posture` column exists so we can add `official` later without a migration.
- **Generate warm-up content with faces in it** — warm-up clips are faceless / abstract (hands, b-roll, ambient) on purpose. Avoids face-similarity flagging during warm-up.
- **Queue/retry/orchestration infrastructure** — 5-10 personas doesn't need it. CLI scripts are run by hand; failures get re-run by hand.

## Risks I want named in the doc, not buried

1. **C2PA detection on upload**. Higgsfield output likely carries Content Credentials. TikTok may auto-label or downrank regardless of operator intent. We have no way to strip these reliably without breaking the file. Operator should expect the AI label to appear sometimes.
2. **Mass ban wave**. The system encodes a working playbook as of May 2026. The playbook will be wrong in 6 months. Don't fight the platform; retire personas when they get throttled, build new ones.
3. **Cross-link disaster**. The whole network can be wiped if two personas share a device fingerprint or IP. The `deviceFingerprint` + `proxyEndpoint` uniqueness check in the admin is the only thing standing between us and that. **Do not bypass the warning.**
4. **Kids/family category exposure**. This is exactly what TikTok's 2025-2026 enforcement waves targeted. Operator should not run the same persona across both adult and kid niches.
5. **Coloring-page-as-product authenticity**. The unicorn PDF has a QR code that gets degraded by Seedance. Anyone who pauses the video sees the broken QR. V1 accepts this; v2 might composite the real PDF in post.

## v1 build order (speed-to-first-ad optimized)

1. **DB schema migration** (Persona, UgcAd, UgcWarmUpClip, UgcWarmUpAction) — `packages/db`. UGC coloring pages use `GenerationType.SYSTEM` + `purposeKey='ugc-{handle}'`, no new enum.
2. **R2 storage helpers** — `lib/ugc-ads/storage.ts`
3. **Persona generator end-to-end** — face brief (Claude+Perplexity), Voice Design, face still (GPT Image 2 via Higgsfield), PFP (Nano Banana Pro), warm-up clips (Seedance no identity), follow-list research (Perplexity). Outputs to DB + R2.
4. **Persona admin page** (`/admin/ugc`, auth-gated) — list personas, view each persona's assets + voice preview + warm-up plan, "lock for warming" button, infra fields editable inline. **This is required for v1 because reviewing assets in terminal is bad.**
5. **Ad generator end-to-end** — hook writer, persona-aware scene gen (when no coloringImageId), still, voiceover, video, judge, virality. Outputs to DB + R2.
6. **Cold landing page wiring** — `/start` already exists and resolves the campaign-specific coloring image via `utm_campaign`. UGC plugs in here: persona's coloring image is saved with `purposeKey = 'ad:ugc-{handle}'`, links carry `?utm_campaign=ugc-{handle}`, existing resolver finds the page. Per-UGC copy variants in `messages/en.json` under `start.hero.ugc-{handle}` (or fall back to default if not specified).
7. **Ad admin tab** — list ads per persona, watch the final video inline, download button, "mark posted" button, PostHog rollup (clicks/prints/signups per persona).
8. **Ship the first persona end-to-end manually** — through the system, end-to-end, all the way to posted on TikTok. Then iterate on what hurt.

V1 is done when step 8 is complete. Anything that didn't actively hurt during step 8 is yagni — don't build it.

## When to revisit the architecture

- After the first persona is banned: was it C2PA, was it cross-link, was it just bad content? Re-read this doc and update the relevant risk section.
- After the first persona converts: what about the funnel actually worked? `/start` page? Specific hook? Adjust the system to lean into it.
- If we cross 10 personas: revisit "no queueing/orchestration" — at that scale the admin UI starts breaking.
- If Higgsfield raises prices or pulls features: the `lib/ugc-ads/providers/` directory exists so we can swap. The voice generator already lives at ElevenLabs direct, not via Higgsfield, partly for this reason.
