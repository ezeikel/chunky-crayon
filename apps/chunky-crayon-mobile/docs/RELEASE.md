# Mobile release pipeline

How versions, build numbers, build variants, and store submissions work for the
iOS and Android apps.

## TL;DR

```bash
# from apps/chunky-crayon-mobile/
pnpm release patch          # 0.1.0 → 0.1.1, builds both platforms, auto-submits
pnpm release minor          # 0.1.0 → 0.2.0
pnpm release 1.2.3          # explicit version

# common flags
pnpm release patch --ios-only       # only build iOS
pnpm release patch --android-only   # only build Android
pnpm release patch --no-submit      # build but don't push to stores
pnpm release patch --dry-run        # show what would happen
```

The script handles everything: pre-flight checks → drift detection → version
bump → commit + tag → build iOS → build Android → submit.

## Build variants (3 side-by-side apps)

`EXPO_PUBLIC_ENVIRONMENT` (set per EAS profile in `eas.json`) drives
`app.config.ts` to produce three DIFFERENT bundle ids + names + icons, so all
three install side-by-side on one device:

| Variant       | Name            | iOS bundle id / Android package            |
| ------------- | --------------- | ------------------------------------------ |
| `production`  | `Chunky Crayon` | `com.chewybytes.chunkycrayon.app`          |
| `preview`     | `CC Internal`   | `com.chewybytes.chunkycrayon.app.internal` |
| `development` | `CC Dev`        | `com.chewybytes.chunkycrayon.app.dev`      |

Icons: drop `icon-preview.png` / `icon-dev.png` (+
`adaptive-icon-{preview,dev}.png`) into `assets/images/` to visually badge
dev/preview; until then they share the prod icon (the config falls back
automatically — no code change needed).

**External setup for the new dev/preview bundles** (one-time, mostly optional —
the bundles install fine without it, only Google-signin + IAP need it on those
variants): register the `.dev` / `.internal` bundle ids in Apple Developer (EAS
can auto-provision), add their reversed-client-id URL schemes to the Google
OAuth client, and add `.dev` / `.internal` apps in RevenueCat if you want to
test purchases on those variants. PROD is fully set up and untouched.

## How versioning works

Two numbers per platform:

| Number                                        | What it is                             | Where it's set                                                                                     |
| --------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `version` (e.g. `0.1.1`)                      | The marketing version users see        | `package.json` → read by `app.config.ts` (`version: pkg.version`)                                  |
| `buildNumber` (iOS) / `versionCode` (Android) | Internal counter, must always increase | Managed remotely by EAS (`appVersionSource: "remote"` + `autoIncrement` on the production profile) |

So `0.1.1 (12)` on iOS means version `0.1.1`, build `12`.

`pnpm release` keeps iOS and Android in lockstep by **always building both from
the same commit** with the same `package.json` version — EAS auto-assigns the
next build number per platform. (Without this, manually building one platform
and forgetting the other drifts the two stores onto different versions/commits.)

## What `pnpm release` does

1. **Pre-flight** — clean working tree, on `main` (override with `FORCE=1`),
   local `main` in sync with `origin/main`.
2. **Drift check** — fetches the last finished production build for iOS and
   Android from EAS; warns if they were built from different commits/versions.
   (Skip with `--skip-drift-check`.)
3. **Version bump** — `package.json` to the next `patch` / `minor` / `major` (or
   an explicit `X.Y.Z`).
4. **Commit and tag** — `chore(mobile): release vX.Y.Z` + git tag
   `mobile-vX.Y.Z`, pushed to origin.
5. **Build iOS** — `eas build --profile production --platform ios --auto-submit`
   (cloud build → App Store Connect).
6. **Build Android** —
   `eas build --profile production --platform android --auto-submit` (cloud
   build → Play Console).

Both builds are pinned to the just-pushed commit, so they share the same JS
bundle and native config.

> Note: CC uses **cloud** EAS builds here (not `--local` like PTP). Local builds
> are still available via the `eas:build:*:local` scripts, but a `pnpm release`
> goes through EAS cloud + auto-submit.

## Profiles

| Profile       | Where it lands                                                              | When                                             |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| `development` | Simulator / emulator dev client (`CC Dev` bundle)                           | Day-to-day dev — `pnpm prebuild:ios && pnpm ios` |
| `preview`     | Physical device (.ipa / .apk), `CC Internal` bundle, points at PROD backend | Testing on a real device before release          |
| `production`  | App Store + Play Store (`Chunky Crayon`)                                    | Real releases                                    |

Preview build for your own phone:

```bash
pnpm eas:build:preview:ios       # cloud .ipa
pnpm eas:build:preview:android   # cloud .apk
# or the :local variants for an on-machine build
```

## Checking what's live

```bash
eas build:list --status finished --limit 5          # both platforms
eas build:list --platform ios --status finished --limit 3
eas build:list --platform android --status finished --limit 3
```

## Manual recovery (avoid — use `pnpm release`)

1. Bump `version` in `apps/chunky-crayon-mobile/package.json`.
2. Commit + push.
3. `pnpm eas:build:production` (add `--platform ios|android` to scope).
4. `pnpm eas:submit:production`.

## OTA updates

`runtimeVersion: { policy: "appVersion" }` scopes OTA updates (`eas update`) per
app version. After `pnpm release patch` (0.1.0 → 0.1.1), pending OTA for 0.1.0
won't reach 0.1.1 users — they get the natively-bundled JS for 0.1.1. This is
the safe behaviour: OTAs can't push out-of-sync JS to a native shell that wasn't
built for it.
