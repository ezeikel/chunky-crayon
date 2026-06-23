# App Review reply — resubmission after build 33 rejection

Submission ID rejected: `a9c05c2c-385b-4fba-8de3-7d2e58c937ac` (build 33,
version 1.0) Rejected under: Guideline 1.3 (Kids), 2.5.4 (background audio),
2.1(b) (IAP).

---

## Resolution Center reply (paste into "Reply to App Review")

> Hello, and thank you for the detailed review. We have addressed all three
> issues in a new build. Here is what changed:
>
> **Guideline 1.3 — Safety, Kids Category** We have completely removed all
> third-party analytics from the iOS app. The PostHog SDK (product analytics and
> session replay) is no longer initialized, mounted, or able to run on iOS — no
> events, no session recordings, and no device or user identifier are collected
> or transmitted to any third-party analytics or advertising service. The app
> contains no advertising SDKs and uses no IDFA / advertising identifier and no
> ATT. The only remaining third-party SDK is Sentry, used solely for crash
> diagnostics. On iOS it attaches only our own app-generated account id to a
> crash report (no email, no name, no IP) so we can diagnose a crash; it
> performs no tracking, no advertising, and no cross-app or cross-company data
> use. We have also updated our App Privacy information in App Store Connect to
> match: "Data Used to Track You" is None, and no data type lists Analytics as a
> purpose.
>
> **Guideline 2.5.4 — Software Requirements (background audio)** The app has no
> background-audio feature. The "audio" UIBackgroundMode was being added
> automatically by an audio library default; we have disabled that, so the new
> build's Info.plist no longer declares the audio background mode.
>
> **Guideline 2.1(b) — App Completeness (In-App Purchase)** We found and fixed
> the cause. Our subscription products were left in a "Developer Action Needed"
> state after the previous review, so a purchase attempt could fail; we have
> re-submitted all subscriptions with this build so they are reviewable again.
> We also hardened the app's purchase flow: the in-app purchase SDK is now
> guaranteed to be fully configured before any "buy" action runs (previously, on
> a fresh install with a slow network, tapping a plan before initialization
> completed could surface a generic "couldn't process your purchase" error). The
> Paid Apps Agreement is in effect and the products carry the advertised 7-day
> free trial. Please retry on the new build; if anything still errors, share the
> on-screen message and we'll resolve it immediately.
>
> Thank you again — we are happy to provide any further detail.

---

## App Review Information → Notes (set on the version before resubmitting)

> This is a Kids Category app. No third-party analytics or advertising SDKs run
> on iOS (PostHog is fully disabled on this platform). Sentry is used for crash
> diagnostics only and receives no email, name, or advertising identifier on
> iOS. No IDFA, no ATT, no tracking.
>
> In-App Purchases: subscriptions (Splash / Rainbow / Sparkle, monthly + yearly)
> are available from the paywall. A parental gate (a math question — Kids
> Category requirement) is shown before the StoreKit purchase sheet; solve it to
> reach the purchase. The Paid Apps Agreement is signed and all products are
> attached to the live offering.

---

## Code changes shipped in build 34 (all iOS-scoped; Android unchanged)

- **1.3** — PostHog disabled on iOS (`lib/posthog.ts` null client,
  `providers.tsx` no provider, `utils/analytics.ts` no-op). Sentry sends `id`
  only on iOS (`contexts/AuthContext.tsx`).
- **2.5.4** — `app.config.ts` expo-audio `enableBackgroundPlayback: false` →
  `UIBackgroundModes:["audio"]` no longer in Info.plist (verified via prebuild).
- **2.1(b) code** — `lib/revenuecat.ts` now self-heals: every RC accessor calls
  `ensureConfigured()` before any `Purchases.*` call (ports the live PTP
  `PurchaseService` pattern), plus anon→user aliasing so a fast purchase before
  init can't orphan to `$RCAnonymousID`. Removes the "no singleton instance" →
  generic error race.

## Why this didn't happen on PTP / TFC Calculator (for reference)

1. **Code:** PTP's `PurchaseService` guards every RevenueCat call with
   `if (!isInitialized) await initialize()`. CC's `lib/revenuecat.ts` called
   `Purchases.*` directly — the regression that produced the race. Now ported.
2. **ASC:** PTP/TFC subscriptions are already Approved (live). CC's were
   first-time and got REJECTED _alongside_ the app, dropping to
   DEVELOPER_ACTION_NEEDED. They clear by re-submitting with the next build
   (below).

## Resubmit sequence (you trigger the build)

1. [ ] **Build + submit:**
       `cd apps/chunky-crayon-mobile && pnpm eas:release:ios` (build profile
       production → builds 34, auto-submits to ASC). Version stays `1.0`; build
       auto-increments 33→34.
2. [ ] **App Privacy** (ASC web UI — needs Account Holder/Admin, API can't write
       it): update per `ASO_SUBMISSION_PACK.md` §3 (revised) — **Used to track
       you = None**, **no Analytics purpose on any data type**, PostHog removed
       as a partner, Sentry = **User ID only**. Then **Publish** it (not just
       save) — the version can't ship until published.
3. [ ] **Subscriptions:** in the version's submission, ensure all 6
       subscriptions are **attached / included** so the REJECTED ones get
       re-reviewed with the build. (They can't be edited via API while REJECTED;
       attaching them to the new submission re-opens them. Optional cleanup once
       editable: the two "Splash" names have a trailing space, and the
       Rainbow/Sparkle **Yearly** descriptions say "credits/month" — fix in the
       web UI if desired.)
4. [ ] **Version review notes:** set to the "App Review Information → Notes"
       text above (mentions the parental gate before purchase).
5. [ ] **Reply in Resolution Center** with the message above.
6. [ ] Confirm build 34 processed VALID before the submission completes —
       `store chunky-crayon apple builds list --app 6757487905`.
