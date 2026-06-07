# Haptics (CC mobile)

Tactile feedback for the Chunky Crayon app. Kids (ages 3-8) respond to
multi-sensory feedback and parents read it as quality, so haptics are wired
across every meaningful interaction — but they stay **respectful**: one buzz per
discrete action, gated behind a user toggle, and never on passive events.

## The helpers

All helpers live in `apps/chunky-crayon-mobile/utils/haptics.ts` and wrap
`expo-haptics`. They are **fire-and-forget**: each one no-ops when the Vibration
setting is off, and swallows any platform error (a device with no haptic engine
must never crash a tap). Just call them — no guards needed at the call site.

| Helper                          | expo-haptics call      | Use for                                                                                               |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `tapLight()`                    | Impact `Light`         | Selection / light taps: tool, color swatch, list/gallery card, zoom step, back/close, scene picker    |
| `tapMedium()`                   | Impact `Medium`        | Significant taps: tab switch, primary CTA, undo/redo, profile switch, add-new, claim reward           |
| `tapHeavy()`                    | Impact `Heavy`         | Weighty actions: bucket fill, sticker stamp, destructive-confirm (delete)                             |
| `notifySuccess()`               | Notification `Success` | Completion / celebration: save, print, purchase, Magic reveal, correct parental-gate answer, confetti |
| `notifyWarning()`               | Notification `Warning` | Limit reached / wrong: undo-limit, wrong parental-gate answer, error toast                            |
| `selectionChanged()`            | Selection              | Discrete option changes: brush type, brush size, toggle switches                                      |
| `brushHaptics.start/stop/pulse` | continuous Impact      | Per-brush-type texture **during** a stroke (crayon 50ms/Light … marker 150ms/Medium)                  |

## Type-to-action conventions

Pick the **lightest** type that conveys the weight of the action. When unsure,
go lighter — over-buzzing reads as cheap, especially for kids.

- **Navigation into a thing** (open a coloring page, open a character) → `tapLight()`
- **Switching context** (tab, profile) → `tapMedium()`
- **Committing a creative action** (fill a region, stamp a sticker) → `tapHeavy()`
- **Finishing something rewarding** (save, purchase, evolve Colo) → `notifySuccess()`
- **Hitting a wall** (undo limit, wrong answer, error) → `notifyWarning()`
- **Changing a setting/option** (toggle, brush type, swatch) → `selectionChanged()`

## App-wide coverage points

Two places fire haptics for _every_ matching event, so you rarely need to add
them by hand:

- **Toasts** — `toast.success` buzzes `notifySuccess`, `toast.error` /
  `toast.warning` buzz `notifyWarning`, in the `Toaster` wrapper. Any
  `toast.*` call site gets feedback for free; do **not** also fire a haptic
  next to a toast.
- **The Vibration toggle** — `setHapticsEnabled()` (driven by the Settings
  toggle, persisted in `settingsStore`) gates every helper above _and_ the
  continuous `BrushHapticController`. The preference is mirrored into the
  haptics module on app start and on every toggle (see `app/_layout.tsx`).

## Don'ts

- **No haptics on passive/automatic events** — scroll, render, animation ticks,
  background work. Haptics acknowledge a _user_ action.
- **No double-buzzing** — if a toast fires, don't add a manual haptic too. If a
  handler already calls a helper, don't stack another.
- **No continuous haptics outside brush strokes** — only `brushHaptics` runs on
  an interval, and only while a stroke is active.
- **Don't gate at the call site** — the helpers self-gate on the Vibration
  setting; adding your own `if (enabled)` is redundant and drifts.

## Adding a haptic to a new surface

1. Import the helper(s) from `@/utils/haptics`.
2. Call the right type at the **start** of the `onPress` / handler (so it fires
   even if the action navigates away).
3. For success/failure results, fire `notifySuccess` / `notifyWarning` when the
   result resolves — unless it already surfaces a `toast.*`, which covers it.
