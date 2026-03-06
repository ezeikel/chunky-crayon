# React Native Best Practices Audit Plan

Audit date: 2026-03-06 Overall grade: B+

## Tasks

### Critical

- [x] **1. Memoize context provider values** (3 files)
  - [x] `contexts/AuthContext.tsx` — wrapped `value` in `useMemo`
  - [x] `contexts/SubscriptionContext.tsx` — wrapped `value` in `useMemo`
  - [x] `contexts/UserContext.tsx` — wrapped `value` in `useMemo` + stabilized
        `refetch` with `useCallback`

- [x] **2. Fix PaginationDot width animation**
  - [x] `components/Onboarding/OnboardingCarousel.tsx` — replaced `width`
        animation with `transform: [{ scaleX }]`

### High

- [x] **3. Replace TouchableOpacity with Pressable** (5 instances)
  - [x] `components/ColoAvatar/ColoAvatar.tsx`
  - [x] `components/forms/CreateColoringImageForm/inputs/TextInputPanel.tsx`
  - [x] `components/forms/CreateColoringImageForm/inputs/InputModeSelector.tsx`
  - [x] `components/forms/CreateColoringImageForm/inputs/VoiceInputPanel.tsx`
        (both instances)

- [x] **4. ~~Add estimatedItemSize to FlashList~~**
  - [x] N/A — FlashList v2 removed `estimatedItemSize` prop (auto-calculated)

- [ ] **5. Switch Image to expo-image**
  - [ ] `components/ColoAvatar/ColoAvatar.tsx:269` — replace `Image` from
        react-native with `Image` from expo-image

### Medium

- [x] **6. Consolidate duplicated color tokens** (2 files)
  - [x] Added `crayonOrange`, `secondaryOrange`, `textGray`, `textWarmMuted` to
        `lib/design/colors.ts`
  - [x] `components/ColoringImages/ColoringImages.tsx` — removed local COLORS,
        imports from `@/lib/design`
  - [x] `components/Feed/Feed.tsx` — removed local COLORS, imports from
        `@/lib/design`

- [x] **7. ~~Add safe area insets to SubscriptionManager ScrollView~~**
  - [x] N/A — Uses `pageSheet` modal which handles bottom safe area natively;
        existing `paddingBottom: 40` is sufficient

- [x] **8. Zustand selector usage** (5 leaf components converted)
  - [x] `components/BrushSizeSelector/BrushSizeSelector.tsx` — individual
        selectors
  - [x] `components/MuteToggle/MuteToggle.tsx` — individual selectors
  - [x] `components/ColorPalette/ColorPalette.tsx` — individual selectors
  - [x] `components/ProgressIndicator/ProgressIndicator.tsx` — individual
        selector
  - [x] `components/ColorPaletteBar/ColorPaletteBar.tsx` — individual selectors
  - Note: Larger components (ImageCanvas, ToolsSidebar, etc.) left as-is — they
    destructure many fields and benefit less from selectors
  - Note: `useOnboardingStore` already uses selectors in `_layout.tsx` and
    `onboarding.tsx`
