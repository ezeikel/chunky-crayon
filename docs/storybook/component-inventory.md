# Storybook Component Inventory + Gap List

Audit of every Chunky Crayon component vs Storybook coverage, done as
part of the Storybook consolidation. Drives the story-writing work.

There is **one CC Storybook**: `apps/chunky-crayon-web/.storybook`
(the `coloring-ui` instance was deleted). All stories live in
`apps/chunky-crayon-web/stories/`, organised by section. Coloring
Habitat has its own separate Storybook — out of scope here.

## Coverage bar

Every component that renders DOM and a developer would want to
tweak/review gets a story showing its meaningful states — not just one
happy-path render. **Excluded** (justified): pure trackers
(`PixelTracker`, `*ViewTracker`, `LandingPageViewTracker`,
`UserIdentify`), context providers (`*Provider`, `*Context`),
server-only `*Wrapper` shells, react-pdf documents under
`components/pdfs/**` (they render to PDF, not DOM), and `motion/*`
primitives (thin framer-motion wrappers).

## Existing coverage (7 story files, ~40 components)

- `design-system.stories.tsx` — ui/button, ui/badge, ui/input,
  ui/textarea, ui/card, Loading, ui/sonner. Colors/typography.
- `forms-and-inputs.stories.tsx` — CreateColoringPageForm, FormCTA,
  QualityPicker, JoinColoringPageEmailListForm, SubmitButton,
  ShareButton, StartOverButton, SignInOptions, ParentalGate.
- `gallery-and-content.stories.tsx` — AllColoringPageImagesShell,
  GalleryImageWithPreview, InfiniteScrollGallery, ImageFilterToggle,
  Pagination, DifficultyFilter, DifficultySlider, TodaysDate, blog/*,
  Breadcrumbs.
- `homepage-sections.stories.tsx` — HomePageContent, DashboardHeader,
  IntroClient, LandingDemoClient, PricingTeaser, Testimonials, FAQ,
  MeetYourCharactersSection.
- `modals.stories.tsx` — ParentalGateModal, FeedbackDialog.
- `navigation.stories.tsx` — ScrollHeader, MobileMenu, Header*Indicator,
  LanguageSwitcher, MobileLanguageSelector.
- `coloring-tools.stories.tsx` — palette/drawer compositions.

## Gap list — by section

### Section: Design System
Largely covered. Verify complete: spacing scale, shadows, radii,
the full crayon colour palette, typography (all heading levels +
body). Add what's missing.

### Section: Atoms — GAPS
`ui/` primitives not yet storied: `avatar`, `select`, `switch`,
`dropdown-menu`, `skeleton`. No dedicated Heading component exists —
headings are raw Tailwind; the Design System typography story is the
canonical "headings" reference (note this, don't invent a component).

### Section: Buttons — PARTIAL
Covered: SubmitButton, ShareButton, StartOverButton, SignInOptions.
GAPS: `ManageSubscriptionButton`, `PrintButton`, `SaveButton`,
`SaveToGalleryButton`, `GalleryCardDownloadButton`, `PackDownloadButton`,
`buttons/...` — every component in `components/buttons/` + the
download buttons elsewhere.

### Section: Modals — BIGGEST GAP
Covered: ParentalGateModal, FeedbackDialog.
GAPS (every modal must be here):
- `PaywallModal` ⚠️ — all three states: guest_limit, no_subscription,
  subscriber_no_credits
- `CreateProfileModal`
- `EmailCaptureModal`
- `CreateCharacterModal` (the Character Builder — 5-step wizard)
- `ShareArtworkModal`
- `AdultGate`
- `AutoColorModal` (coloring-ui)
- `StickerDetailModal`
- `TikTokPostComposer` (admin modal — confirm if modal-shaped)
"A Modals section must not be missing a modal that exists in the app."

### Section: Tiles & Cards — NO COVERAGE
GAPS: `CharacterTile` (states: READY / GENERATING / FAILED),
`ProfileCard`, `AddProfileCard`, `ChallengeCard`, `ChallengeWidget`,
`LatestComicStripCard`, `StickerCard`, `FactCard`, `FeaturedBundles`,
`RecentCreations`, `ColoringImage` card, `GalleryPreview` cards,
`SceneTile` (coloring-ui — exported standalone).

### Section: Characters — NO COVERAGE
GAPS: `CharacterCockpit`, `CharacterGrid`, `CharacterRetry`,
`AddCharacterButton`, `OutfitPicker`, `VoicePad`, `ColoAvatar`,
`ColoEvolutionCelebration`.

### Section: Forms — PARTIAL
Covered: CreateColoringPageForm, FormCTA, QualityPicker, email form.
GAPS: `BlockReasonPill`, `CharacterPicker`, `InputModeSelector` +
the inputs (`TextInput`, `VoiceInput`, `ImageInput`, `SceneInput`,
`ExamplePrompts`), `InputOptions`.

### Section: Navigation — PARTIAL
Covered: ScrollHeader, MobileMenu, Header indicators, LanguageSwitcher.
GAPS: `Header` (full), `Footer`, `BasicHeader`, `HeaderDropdown`,
`HeaderFeedbackTrigger`, `JumpToNav`, `PageWrap`.

### Section: Canvas / Coloring — REBUILD (stories were deleted)
All `coloring-ui` components lost their stories. Rebuild fresh:
`ImageCanvas`, `ColoringToolbar`, `ColorPalette`, `ColorStrip`,
`DesktopColorPalette`, `DesktopToolsSidebar`, `MobileColoringDrawer`,
`BrushSizeSelector`, `PatternSelector`, `ToolSelector`,
`UndoRedoButtons`, `ZoomControls`, `ActionButton`, `MuteToggle`,
`ProgressIndicator`, `AutoColorPreview`, `MagicColorOverlay`,
`CompletionCelebration`, `Toaster`, `SceneBuilder`, `InputModeSelector`.
App-side canvas: `ColoringArea`, `ColoringPageContent`,
`EmbeddedColoringCanvas`, `SlimColorPalette`, `StreamingCanvasView`,
`FocusMode*`, `TapPromptOverlay`.

### Section: Gallery / Blog / Home — PARTIAL
Covered by `gallery-and-content` + `homepage-sections`. GAPS:
`AnimatedGalleryGrid/Header`, `DailyImageHeading`, `SocialProofStats` +
`AnimatedStatCard`, `StartPostEngagementBridge`, `ColoringHabitatCallout`,
`AppStoreSection` / `AppStoreButtons`, `SocialShare`.

### Section: Stickers — NO COVERAGE
GAPS: `StickerBook`, `StickerCard`, `StickerSelector`, `StickerReward`,
`StickerBook/ProgressBar`.

### Section: Profiles — NO COVERAGE
GAPS: `ProfileUI`, `ProfileAvatar`, `ProfileIndicator`,
`ProfileSwitcher`, `ProfileCard`, `AddProfileCard`.

### Section: Feedback / Loading / Misc
GAPS: `Loading/ColoLoading`, `PixelLoaders`, `Confetti`,
`UnsubscribeToast`, `TypedText`, `CrayonScribble`, `CachedLastUpdateDate`.

## Excluded (not storied — justified)
`PixelTracker`, `UserIdentify`, `*ViewTracker` (SeoLanding, TeacherHub,
LandingPageViewTracker), `experiment/Experiment`, all `*Provider` /
`*Context`, all `*Wrapper` server shells, `components/pdfs/**`,
`SvgToReactPdf`, `Portal`, `motion/*`.

## Approach

Stories written section by section, each section a tracked sub-task.
Reuse the `preview.tsx` harness (ColoringContextProvider,
NextIntlClientProvider, SessionProvider, the authState global toolbar)
and `.storybook/mocks/`. New mocks added as needed, same pattern.
