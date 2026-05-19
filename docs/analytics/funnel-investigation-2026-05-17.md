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
   Real journey is _create-as-guest → then sign in_ (confirmed: the 2026-05-17
   page was created with `userId: null`). Signin-first ordered funnels
   mis-sequence this and falsely read 0%. Unordered: 291 people
   created-or-signed-in, 132 (45%) did both — the product _is_ used; the
   funnels just measured it wrong.

4. **🟡 Email → app re-activation path is dead.** Only ~6 `utm_source=daily-email`
   click-throughs in 90 days vs ~100 email-list signups in the same window.
   Subscribers get the free image and never return. The lever is the email CTA
   - a re-engagement sequence, not the in-app funnel. (Independent of event
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
- `coloring-image.ts:405-406` — explicit comment: _"Tolerate the after() drop
  rate (small impact: tracking + retrace)."_ This is a known, accepted trade-off,
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

(The 215s latency figure in memory is the daily _scene_ pipeline, a different
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

---

# Addendum — first real customer, 2026-05-18

The first ever real production subscription happened on 2026-05-18, the day
after this investigation. It both validates and sharpens the findings above.

## What happened

A real UK user (Kent) clicked a Meta paid ad (`utm_campaign=dragon`,
`utm_content=v1`), went landing → pricing → Stripe checkout, and started a
**Sparkle annual 7-day trial (£249.99/yr)**. Single PostHog person
(`person_id de44e4ef-…`, distinct_id `019e3a59-795c-…`); journey:

```
10:10 lands /en/start (dragon ad)
10:10 CTA → /en/pricing
10:12 pricing_plan_clicked → checkout_started → leaves for Stripe
10:13 returns /account/billing/success?session_id=cs_live_b137T… → checkout_completed
10:14 creates a coloring page AS GUEST, colours it, prints it
10:28 back on /start, opens FAQ, submits feedback asking how to cancel
```

Stripe + DB verified clean end to end: `sub_1TYNEcK6qKjkWA8MOYhWt5AS`
(SPARKLE / ANNUAL / TRIALING), `User` row created with `1015` credits
(`FREE_CREDITS 15` + SPARKLE `1000`), `CreditTransaction` PURCHASE row,
idempotency row `evt_1TYNEeK6qKjkWA8Mcl6MOtkB` present, **zero** Stripe/
webhook/Sentry errors. The pipeline is mechanically proven.

## The incident: guest-checkout sign-in dead end (CONFIRMED, was a hypothesis)

The customer's own words via the in-app feedback widget:

> "I followed the link and signed up for 7 day trial and top package for my
> workplace but have just been told my boss already has subscription **how do I
> cancel as I wasn't asked to sign in?**"

This is finding #3 above (create/buy-as-guest, sign-in is a separate
disconnected step) escalating from "funnel measurement artifact" to a
**production incident that cost a support contact and a near-certain
cancellation**. Root cause, verified in code (not inferred):

- `components/BillingSuccess/BillingSuccess.tsx` has zero auth logic. After
  checkout it shows "You're all set" + a "Go to Billing" link that bounces a
  guest because they have no session.
- `auth.ts` uses `session.strategy: 'database'` (PrismaAdapter). A session is
  only ever minted via the `signIn` callback (google/apple/facebook/resend). A
  Stripe webhook is none of those, so a guest buyer is **never logged in**.
- `app/api/payment/webhook/route.ts` creates the `User` row server-side but no
  session.
- `app/actions/settings.ts` exposes only `updateShowCommunityImages` +
  `getUserSettings`. **There is no email-change action and no self-serve
  cancel.** A guest who pays under the "wrong" email has no path to anything:
  not login, not email correction, not cancellation.

Identity note for support tooling: the customer typed
`carisbaba@yahoo.co.uk` into feedback but paid under
`communityhawkhurst@outlook.com` (workplace mailbox; Cranbrook vs Hawkhurst,
~4mi apart — corroborated same person). Support/feedback email will routinely
differ from billing email; matching on email alone fails.

GDPR note: confirming "this person == that person" required joining Stripe +
prod DB + PostHog + IP geo. That cross-system linkage is itself personal data /
profiling (lawful as legitimate interest for duplicate-account/support
handling) and is in scope of any future DSAR. Do not disclose one data
subject's account email/name to an unverified requester — verify by asking the
requester to produce their sign-up email, never by stating it to them.

## What this validates / sharpens vs the original findings

- Finding #2 ("nobody reaches /pricing") still stands as the volume problem —
  this is **one** conversion, not product-market fit, and it's being
  cancelled. Do not over-fit: not a pricing signal, not a winning-creative
  signal yet. Watch the dragon cohort over the next 10–20 clicks.
- Finding #3 is now an incident, not an artifact. The fix is the
  post-checkout sign-in handoff + self-serve billing, planned in
  `~/.claude/plans/cc-first-customer-guest-checkout-gap.md`.
- Positive: the core product experience landed (paid → created → coloured →
  printed within a minute). Value delivery is intact; the gap is purely
  post-purchase account/identity/self-serve.

## Remediation

Tracked in `~/.claude/plans/cc-first-customer-guest-checkout-gap.md`:
auto-create a verified NextAuth session on the success page + magic-link
backup, Stripe Billing Portal self-serve cancel/manage, an email-change action
with new-address verification, and feedback-widget identity capture. The
session-from-`session_id` path carries an account-hijack risk (the redirect URL
is the only trust bearer) and gets a mandatory security review before merge.

(Shipped 2026-05-18. Magic-link-only option chosen, no session minted from
the URL. Also discovered the live Stripe account had NO Billing Portal config
at all, so self-serve cancel had never worked in prod; created
`bpc_1TYYY8K6qKjkWA8MqNwTzy9D`.)

---

# Addendum 2 — trial-abuse loophole (2026-05-19)

The first customer also exposed a money leak: a 7-day trial grants the FULL
plan credit allotment up front (SPARKLE = 1000). Nothing reclaimed on cancel,
no cap on spend during the trial. So anyone can start a trial, burn ~1000 real
gpt-image-2 generations (each a real API bill) in 7 days, cancel, pay £0, and
repeat with a fresh email. Lisa herself was low-risk (gone, won't sign in) but
the class is live now that paid ads drive real cold signups.

Fix shipped (plan: `~/.claude/plans/cc-trial-abuse-cap-and-reclaim.md`):

1. Unpaid-trial spend cap = 10 credit-debiting actions until first successful
   payment. Full credits still granted at trial start (keeps trial UX simple);
   the cap is an independent gate on spend. The cap, not the reclaim, is what
   actually closes the loophole, an abuser cannot spend past 10 even though
   the balance reads 1000.
2. Reclaim on cancel/lapse-without-payment: a still-TRIALING (never converted)
   subscription being deleted resets `user.credits` to `FREE_CREDITS` (15),
   never below, with an `ADJUSTMENT` audit row. Paying (ACTIVE) customers who
   cancel are untouched.

Where it lives: pure policy in `lib/trial-policy.ts` (unit-tested); DB
enforcement in `lib/trial-spend-guard.ts` (`assertTrialSpendAllowed`) called
inside the `$transaction` at all 5 credit-debit sites (`coloring-image.ts` x2,
`photo-to-coloring.ts`, `character-actions.ts`, `createPendingColoringImage.ts`
, the last two were made transactional in the process, fixing a latent
decrement-without-audit-row bug); reclaim in the `customer.subscription.deleted`
handler in `app/api/payment/webhook/route.ts`.

Concurrency: the guard takes `SELECT ... FOR UPDATE` on the user row at the top
of the transaction, serializing all credit-affecting txns per user. This closes
the cap race AND the pre-existing credit-balance overspend race for the trial
path (the `user.credits < N` precheck is outside the tx).

Known NOT closed (logged, out of scope): re-registering with a fresh email
gets another 10-action trial. True one-trial-per-person (card fingerprint /
Stripe trial eligibility) is a separate, larger piece. The loophole is now
~10 API calls per throwaway email, not ~1000.
