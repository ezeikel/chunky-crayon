# Funnel investigation — 2026-05-17

Triggered by a PostHog Max conversation ("any funnel improvements after my recent
tweaks?") that concluded the signup → pricing step was a 0% drop-off. This
investigation re-ran the analysis against the real event schema and the
production DB.

> **Correction history:** an earlier draft of this doc claimed creation was
> broken in production (a timeout regression). That was wrong — disproved by the
> user reporting working daily images AND by a prod DB lookup of a page created
> via the user flow on 2026-05-17 (`cmpa79871000004l183hnyf5h`, status `READY`,
> ~70s create-to-ready). Generation and the user create path are healthy. The
> real issue is an unreliable analytics event, documented below. Lesson: verify
> against the DB / a real artifact before calling something a production
> regression off a single analytics signal.

## TL;DR — ranked by leverage

1. **🟠 `creation_completed` is a lossy event — funnels using it undercount
   badly.** It fires inside Next.js `after()` (post-response, best-effort);
   `coloring-image.ts:405` literally comments "Tolerate the after() drop rate."
   The drop got much worse from ~Apr 28 (correlates with the gpt-image-2 switch
   making the request longer-lived, so the function is more likely to be reaped
   before the `after()` block runs). **Generation is fine; the metric is not.**
   Any funnel with `creation_completed` as a step is currently untrustworthy.
   Fix = move the capture before the response, or fire it client-side / on a
   non-`after()` path.

2. **🔴 Nobody reaches `/pricing`.** Across every segment (email subscribers,
   non-subscribers, product users) `pricing_page_viewed` ≈ 0 over 90 days. This
   is the genuine revenue choke point and does NOT depend on event reliability
   (pricing pageview is a normal client event). Pricing copy/CRO work is moot
   until users actually get there.

3. **🟡 The signup → pricing "0% drop-off" was largely a funnel artifact.**
   Real journey is *create-as-guest → then sign in* (confirmed: the 2026-05-17
   page was created with `userId: null`). Signin-first ordered funnels
   mis-sequence this and falsely read 0%. Unordered: 291 people
   created-or-signed-in, 132 (45%) did both — the product *is* used; the
   funnels just measured it wrong.

4. **🟡 Email → app re-activation path is dead.** Only ~6 `utm_source=daily-email`
   click-throughs in 90 days vs ~100 email-list signups in the same window.
   Subscribers get the free image and never return. The lever is the email CTA
   + a re-engagement sequence, not the in-app funnel. (Independent of event
   reliability — based on pageviews + email_signup_completed, both reliable.)

## Evidence

### Why `creation_completed` is lossy (finding #1)

Weekly, test accounts filtered:

| Week   | image_generation_completed | creation_completed |
| ------ | -------------------------- | ------------------ |
| Apr 12 | 76                         | 75                 |
| Apr 19 | 34                         | 32                 |
| Apr 26 | 28                         | 21                 |
| May 3  | 17                         | 1                  |
| May 10 | 8                          | 0                  |
| May 17 | 1                          | 0                  |

`creation_failed` = 0, `image_generation_failed` = 1 over the period — not
errors. The completion event simply isn't landing.

**Root cause (code, not infra):**

- `apps/chunky-crayon-web/app/actions/coloring-image.ts:392` — `creation_completed`
  is captured inside an `after()` block (runs after the HTTP response).
- `coloring-image.ts:405-406` — explicit comment: *"Tolerate the after() drop
  rate (small impact: tracking + retrace)."* This is a known, accepted trade-off,
  not a new bug.
- `after()` callbacks are best-effort on serverless; when the function freezes /
  recycles post-response the block is dropped. The gpt-image-2 switch
  (2026-04-28) lengthened the request, increasing the chance the function is
  reaped before `after()` runs — which is why the drop worsened then.

**Proof generation is NOT broken:** prod DB row for the page the user created on
2026-05-17 via the user flow:

```
id cmpa79871000004l183hnyf5h | status READY | generationType USER
userId null | has_svg true | has_regionmap true
createdAt 20:00:18 → updatedAt 20:01:28  (~70s, well under maxDuration=150)
```

(The 215s latency figure in memory is the daily *scene* pipeline, a different
heavier path — not the user create path, which completes in ~70s.)

### Segmentation (findings #3, #4)

Post-signup funnel split by the `email_subscriber` person property (90d):

- `email_subscriber = true` (55): 0% enter the app funnel.
- `(not set)` (142): ~0.7%.

Unordered {create, sign in, pricing} over 90d: 291 did ≥1, **132 (45%) did
both create and sign in**, **0** ever viewed pricing.

Email re-activation funnel (`utm_source=daily-email`, person-level, 90d): 6
people landed, 0 progressed. Email-list signups same window ≈ 100.

## Segmentation property: `email_subscriber` vs `has_account`

`email_subscriber: true` is set via `posthog.identify()` when someone joins the
daily-image list (`JoinColoringPageEmailListForm.tsx:71`). Has historical data.
There was **no positive counterpart** for real app accounts — authenticated
identify (`UserIdentify.tsx:33`) set no flag.

Fix shipped in this branch: `UserIdentify.tsx` now sets `has_account: true` +
`account_identified_at` on authenticated identify. **No historical data** —
populates going forward only. Use `email_subscriber = true` for historical
email-subscriber cuts; `has_account = true` for true product users from here on.

## Saved PostHog insights

- **Email re-activation funnel** — `5fKZ1fr5`
  https://eu.posthog.com/project/110135/insights/5fKZ1fr5
- **Signup segmentation by email_subscriber** — `C9qxpHd7`
  https://eu.posthog.com/project/110135/insights/C9qxpHd7

The segmentation one uses **unordered** ordering deliberately — see finding #3.
Both descriptions still reference the old "essentially dead" framing for the
email path (finding #4) which stands; ignore any implication that creation
itself is broken.

## Note on the guest limit

The Max conversation referenced a "15-generation cap." Wrong: guest free limit
is `MAX_GUEST_GENERATIONS = 2`
(`components/forms/CreateColoringPageForm/hooks/useGuestMode.ts:10`).
`FREE_CREDITS = 15` (`constants.ts:572`) is the signed-up credit grant — a
different gate. The guest cap → signup path is well-instrumented
(`guest_limit_reached` → `guest_signup_clicked` → auth). Not a problem.
