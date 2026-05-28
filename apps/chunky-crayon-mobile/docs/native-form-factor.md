# Native form-factor: when to use a bottom sheet vs a full-screen modal

CC web renders almost everything overlay-ish as a centered Dialog. On mobile
that's often the wrong idiom — native users expect bottom sheets for contextual
choices and full-screen for blocking flows. This doc is the rule we apply when
porting a web Dialog to mobile, so the decision is consistent and not
re-litigated every time.

## The rule

**Bottom sheet** (`@gorhom/bottom-sheet`) when the surface is:

- short / scannable (fits in the lower half of the screen)
- contextual — it's about the thing the user just tapped
- easily dismissible — swipe-down to cancel is a fine outcome
- non-destructive, or a destructive _confirm_ (not a destructive _flow_)

**Full-screen modal** (RN `Modal`, `presentationStyle="overFullScreen"`, slide
animation) when the surface is:

- a blocking flow the user must finish or explicitly exit
- a purchase / paywall (needs full attention, legal text, no accidental
  swipe-away mid-transaction)
- tall / multi-section content that would feel cramped in a sheet
- full attention required (e.g. a parental gate — the kid shouldn't be able to
  peek past it)

## Current mapping (kept in sync as we port)

| Surface                                          | Mobile idiom                       | Why                                                   |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------------------------- |
| Parental gate                                    | full modal                         | full attention, no peek-past                          |
| Confirm destructive (delete/sign-out/start-over) | **bottom sheet** (ConfirmSheet)    | short confirm, swipe-to-cancel is fine                |
| Colo detail                                      | **bottom sheet** (ColoBottomSheet) | contextual to the mascot tap                          |
| Profile switcher                                 | **bottom sheet**                   | short list, contextual                                |
| Subscription paywall                             | full modal                         | purchase, attention, legal                            |
| Top-up packs                                     | full modal                         | purchase                                              |
| Color-as-you-go                                  | full modal                         | purchase                                              |
| Sticker detail                                   | **bottom sheet** (planned M3)      | contextual to the sticker tap                         |
| Create-character                                 | TBD (M4)                           | depends on builder height                             |
| AutoColor picker                                 | **bottom sheet** (planned M2)      | contextual to the magic tool; mirrors ColoBottomSheet |
| Feedback                                         | **bottom sheet** (planned M6)      | short form, dismissible                               |
| Toast feedback                                   | sonner-native top-center           | transient, non-blocking                               |

## Implementation notes

- Bottom sheets: use `@gorhom/bottom-sheet` (already wired via
  BottomSheetModalProvider in providers.tsx + the SB preview). Snap points sized
  to content; `enablePanDownToClose`; backdrop with `appearsOnIndex` /
  `disappearsOnIndex`.
- Full modals: RN `Modal` with `animationType="slide"` +
  `presentationStyle="overFullScreen"`, safe-area top padding.
- **Portrait-phone check**: bottom sheets are mostly verified on iPad. Before
  shipping any sheet, confirm it behaves in phone portrait (snap points don't
  exceed the shorter viewport, content scrolls). Tracked as an M6 QA item.
- Animations inside either idiom are Reanimated, never RN Animated (see
  feedback_use_reanimated_not_animated).
