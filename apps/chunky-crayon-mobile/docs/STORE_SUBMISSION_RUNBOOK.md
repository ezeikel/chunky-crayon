# Chunky Crayon — store submission runbook (lockstep iOS + Android)

The manual, console-side steps to get CC into review on **both** stores, in
critical-path order. Code/config is done (see "Already done" below). Copy-paste
values are inline. The long pole is the Google Play service-account validation
(~36h), so **start the Android track first/in parallel** with iOS.

Generated 2026-06-13. Companion docs: `ASO_SUBMISSION_PACK.md` (all listing
copy), `PLAY_DATA_SAFETY_ANSWERS.md` (Data Safety answer key), `RELEASE.md` (the
release script). Reusable cross-app version: the `expo-store-submit` skill.

## Already done (this session + prior)

- ASO copy for both stores, App Privacy label, Play Data Safety answer key,
  age/content-rating answers (→ 4+ / Everyone). Account deletion shipped (web
  `/en/delete-account` + mobile Settings). `react-native-fbsdk-next` removed (no
  AD_ID-injecting SDK remains).
- `eas.json`: iOS submit (`ascAppId 6757487905`) + **Android submit block
  added** (`./google-service-account.json`, track `internal`). SA key filename
  gitignored.
- Mobile Settings legal links → canonical `www.../en/...`; Rate-App store URLs
  corrected.
- `lib/revenuecat.ts`: prod build with a `test_` key now fails loudly.
- Web `/en/support` page created (Apple Support URL) + sitemap + footer link.
- **RevenueCat `color_as_you_go` offering created** (`ofrngca0bb507a6`) with 3
  packs `cayg_credits_50/200/500` (products `cayg_credits_50/200/500_v1`, App
  Store + Test Store). Fixes the previously-empty Color-As-You-Go modal.

## Key facts (copy-paste)

|                                    |                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------- |
| iOS bundle / Android package       | `com.chewybytes.chunkycrayon.app`                                           |
| Apple Team id                      | `HGX827L49J` · Apple ID `developer@chewybytes.com`                          |
| ASC app id (`ascAppId`)            | `6757487905`                                                                |
| Play Console app id                | `4973325891628482765` (app already CREATED, Draft)                          |
| EAS projectId                      | `7cae64a2-e46f-4be2-880b-4e51c4f33036`                                      |
| RevenueCat project                 | `projfdef8714` · App Store app `app4c0ed4f718` · Test Store `appb0b8421e7c` |
| GCP project (for Play SA)          | `chunkycrayon`                                                              |
| Privacy / Terms / Support / Delete | `https://www.chunkycrayon.com/en/{privacy,terms,support,delete-account}`    |
| Copyright legal entity             | **Chewy Bytes Limited** (confirm exact registered name)                     |
| Primary category                   | Apple: **Education** (Entertainment secondary), Made-for-Kids band **6-8**  |

## ANDROID TRACK (start first — has the ~36h long pole)

1. **Upload the first AAB by hand.** Build a fresh production AAB
   (`pnpm eas:build:production:android` or
   `pnpm release patch --android-only --no-submit`). In Play Console → Internal
   testing → upload the AAB **manually** (Google blocks the Play Developer API
   on a new app's first upload).
   - **Before upload, verify no AD_ID:**
     `bundletool dump manifest --bundle=<app>.aab | grep -i AD_ID` → must be
     empty. (iOS #29 / Android #3 from earlier still contain AD_ID — they
     predate the fbsdk removal, so this fresh build is required.)
2. **Google Play credentials (RevenueCat Cloud Shell):** Cloud Shell → project
   `chunkycrayon` → run RevenueCat's `credentials.sh` (set
   `PROJECT_ID="chunkycrayon"`) → produces `google-service-account.json` + a SA
   email.
3. **Invite the SA** in Play Console → Users & Permissions, granting: _view app
   information_, _view financial data_, _manage orders and subscriptions_.
4. **Drop `google-service-account.json`** into `apps/chunky-crayon-mobile/`
   (gitignored) so `eas submit -p android` / `pnpm release` Android works.
5. **RevenueCat → add the Play Store app** + upload the SA credential (**~36h to
   validate**; nudge by editing any product's description). Create/link Android
   products for all 3 offerings (`default` subs, `credits`, `color_as_you_go`).
   **Play one-time/consumable products must be created BY HAND in Play Console**
   — the RC MCP can't.
6. **Play App content** (transcribe from `PLAY_DATA_SAFETY_ANSWERS.md`): Data
   Safety, IARC content rating (Everyone; Brazil 14+ is normal for IAP), Target
   Audience + Designed for Families, Advertising ID = **No**, Ads = No, Sign-in
   = no restrictions. Data-deletion URL = `…/en/delete-account`.
7. **Listing visuals** (see A5 below — being generated): feature graphic
   1024×500 (no alpha), 512 icon, ≥2 phone screenshots 1080×1920. Upload by
   hand.
8. **Create a Production release** (Add-from-library, promote the internal AAB)
   → **"Send app for review"**.

## iOS TRACK (run in parallel)

1. **Confirm Paid Apps agreement active** (App Store Connect → Agreements, Tax,
   Banking) — no IAPs serve without it.
2. **Push the iOS IAPs to App Store Connect.** RevenueCat product records exist;
   the underlying ASC IAPs (subs
   `{splash,rainbow,sparkle}_sub_{monthly,yearly}_v1`, credits
   `credits_100/500/1000_v1`, CAYG `cayg_credits_50/200/500_v1`) must be
   created/submitted. Either via the RC MCP (`set-product-store-state` → poll →
   `submit-products-to-store`) or by hand. **The first IAP must ship + review
   with v1.** Also set each product's `metadata.credits` in the RC dashboard.
3. **Build + submit:** `pnpm release patch --ios-only` (or
   `eas build -p ios --profile production` then `eas submit -p ios`) →
   TestFlight.
4. **Listing:** paste metadata from `ASO_SUBMISSION_PACK.md`. Upload screenshots
   — **iPhone 6.9-inch is required** (1320×2868), plus iPad 13 (2064×2752,
   already generated). Upload icon.
5. **App Privacy** questionnaire (`ASO_SUBMISSION_PACK.md` §3) + age-rating
   questionnaire (→ 4+). Set **Made for Kids** + band 6-8 (band LOCKS after
   approval).
6. **Pricing/regions** (≈175 = all storefronts), primary category Education,
   Support URL `…/en/support`, copyright entity.
7. **"Submit for Review"** — note: "Add for Review" only stages a draft; the
   real action is **Submit for Review**.

## Verify a real purchase before/while in review

- iOS: TestFlight build + a **Sandbox Apple ID** completes a real subscription +
  a CAYG purchase (Simulator can't do StoreKit).
- Android: internal-testing build completes a real purchase once the RC Play
  creds validate.

## Known follow-up (not a submission blocker)

- Recon flagged that paid/entitlement state can briefly read stale on a cold
  launch (gate paid behavior on a _resolved, persisted_ entitlement). Worth
  hardening but not required for review.
