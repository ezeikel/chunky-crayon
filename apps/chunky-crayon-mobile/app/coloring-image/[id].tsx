import {
  useState,
  useCallback,
  useEffect,
  useContext,
  createContext,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { Text, View, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faChevronLeft,
  faFloppyDisk,
  faPrint,
  faHeart,
} from "@fortawesome/pro-solid-svg-icons";
// The under-canvas action tiles use DUOTONE icons to match web exactly
// (web's ActionButton renders pro-duotone) and the middle/three-column
// ColoringToolbar tiles. The solid variants above stay for the ActionSheet
// headers + the back chevron.
import {
  faArrowsRotate as faArrowsRotateDuotone,
  faPrint as faPrintDuotone,
  faFloppyDisk as faFloppyDiskDuotone,
  faHeart as faHeartDuotone,
} from "@fortawesome/pro-duotone-svg-icons";
// SDK 56: the root expo-media-library save/permission methods throw a
// deprecation error at call time — the working API is the legacy subpath
// (same pattern as expo-file-system/legacy below).
import * as MediaLibrary from "expo-media-library/legacy";
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import * as Print from "expo-print";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import MobileColoringToolbar from "@/components/MobileColoringToolbar/MobileColoringToolbar";
import ColoringLayout from "@/components/ColoringLayout/ColoringLayout";
import CanvasTopBar from "@/components/CanvasTopBar/CanvasTopBar";
import ZoomControls from "@/components/ZoomControls/ZoomControls";
import MoreColoringPages from "@/components/MoreColoringPages";
import ActionSheet from "@/components/ActionSheet";
import ConfirmSheet from "@/components/ConfirmSheet";
import useColoringImage from "@/hooks/api/useColoringImage";
import Loading from "@/components/Loading/Loading";
import GeneratingScreen from "@/components/GeneratingScreen";
import { toast } from "@/components/Toaster";
import { tapLight, tapMedium, tapHeavy, notifySuccess } from "@/utils/haptics";
import { COLORS } from "@/lib/design";
import {
  debugCanvasStorage,
  deleteCanvasState,
} from "@/utils/canvasPersistence";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useCanvasStore } from "@/stores/canvasStore";
import type { DrawingAction } from "@/stores/canvasStore";
import { useArtworkStore, genArtworkId } from "@/stores/artworkStore";
import { writeArtworkPng } from "@/lib/artwork/files";
import { useUserContext } from "@/contexts/UserContext";
import {
  useFocusMode,
  FocusModeStatusBar,
  FocusModeToggleButton,
  FocusModeFloatingExit,
} from "@/components/FocusMode";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";

// ── Draw-scroll arbitration, isolated from the route's render ────────────────
// The canvas toggles page-scroll OFF while you draw (ImageCanvas calls
// setScroll(false) on draw-start, true on draw-end) so a stroke doesn't scroll
// the page. This used to be `useState` ON the route — so EVERY stroke flipped it
// (false→true) and re-rendered the WHOLE ColoringImage route + chrome (~110ms
// dev / ~35ms prod JS-thread block per stroke, measured + pinpointed via a
// per-render diagnostic: the route's only per-stroke-changing input was
// `scroll`). It was THE cause of the canvas flash/jank.
//
// Fix: own the `scroll` state in a PROVIDER that wraps the route, and split it
// across TWO contexts. React Context has NO field-level subscription — ANY
// component that calls useContext(C) re-renders when C's Provider value changes
// identity, regardless of which field it destructures. So a single context
// holding { scrollEnabled, setScroll } would STILL re-render the route on every
// stroke (the route reads setScroll → subscribes to the whole value → the
// scrollEnabled flip recreates the value → route re-renders). Measured: that was
// exactly the residual flash — the profiler flagged "ColoringImage … context
// changed", 109-134ms per stroke.
//
// Two contexts:
//   • SetScrollContext — value is the stable setter, set ONCE, identity NEVER
//     changes. Consuming it (the route) therefore NEVER re-renders.
//   • ScrollEnabledContext — the reactive boolean; ONLY DrawScrollView consumes
//     it, so a stroke re-renders just the cheap ScrollView wrapper, not the route.
const SetScrollContext = createContext<Dispatch<SetStateAction<boolean>>>(
  () => {},
);
const ScrollEnabledContext = createContext<boolean>(true);

const DrawScrollProvider = ({ children }: { children: ReactNode }) => {
  const [scrollEnabled, setScroll] = useState(true);
  // setScroll is referentially stable (useState guarantee), so SetScrollContext's
  // value never changes identity → its consumers (the route) never re-render.
  return (
    <SetScrollContext.Provider value={setScroll}>
      <ScrollEnabledContext.Provider value={scrollEnabled}>
        {children}
      </ScrollEnabledContext.Provider>
    </SetScrollContext.Provider>
  );
};

// The route uses this — the setter context value is referentially stable for the
// provider's lifetime, so reading it never re-renders the route on a scroll flip.
const useSetScroll = () => useContext(SetScrollContext);

// A ScrollView that reads the reactive scrollEnabled from its OWN context. This
// (not the route) is the only thing that re-renders when a stroke toggles scroll.
const DrawScrollView = ({
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) => {
  const scrollEnabled = useContext(ScrollEnabledContext);
  return (
    <ScrollView {...props} scrollEnabled={scrollEnabled}>
      {children}
    </ScrollView>
  );
};

const ColoringImage = () => {
  const { id, source } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading } = useColoringImage(id as string);
  // scroll state lives in DrawScrollProvider (see above) so a stroke's
  // setScroll toggle does NOT re-render this route. Read only the stable setter.
  const setScroll = useSetScroll();
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  // One sheet per rail action (web parity: Save / Print / My Artwork are
  // separate buttons, each its own bottom sheet — no combined menu).
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);
  const [showMyArtworkSheet, setShowMyArtworkSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const insets = useSafeAreaInsets();
  const { isFocusMode } = useFocusMode();

  // Landscape: the coloring block must be exactly the ScrollView's VISIBLE
  // viewport height (NOT the full screenHeight — that ignores the header +
  // safe-area and made the canvas overflow again). Measure the ScrollView's
  // own layout height and pin the block to it so the canvas measure-fits the
  // visible area and MoreColoringPages flows below it (scroll to reach).
  const [landscapeViewportH, setLandscapeViewportH] = useState(0);

  // Responsive layout hook
  const { layoutMode, coloringTier, useCompactHeader, canvasArea, deviceInfo } =
    useResponsiveLayout();

  // The route subscribes ONLY to `scale` (for the ColoringLayout zoom-% readout
  // — `zoom={scale}`). It previously did `useCanvasStore()` (whole store) →
  // re-rendered the entire route + chrome on every stroke (~110ms dev / ~35ms
  // prod JS block, measured — the flash/jank). Narrowing to `scale` is correct
  // PROVIDED `scale` only changes on a real zoom: the spurious per-stroke `scale`
  // write from the pan gesture is suppressed at its source in ImageCanvas (a
  // no-op guard when the value is unchanged), so a plain stroke no longer writes
  // `scale` → this subscription no longer fires on draw. Actions are stable
  // (read once via getState).
  const scale = useCanvasStore((s) => s.scale);
  const {
    setScale,
    resetTransform,
    reset,
    setTool,
    setBrushType,
    addAction,
    setImageId,
  } = useCanvasStore.getState();

  // Active profile to stamp on locally-saved artwork (null = logged-out bucket).
  const { activeProfile } = useUserContext();

  const handleZoomIn = useCallback(() => {
    setScale(scale * 1.2);
  }, [scale, setScale]);

  const handleZoomOut = useCallback(() => {
    setScale(scale / 1.2);
  }, [scale, setScale]);

  const handleResetZoom = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  // Start Over — the rail's refresh tile opens this confirm directly (web
  // parity: one confirm, no "what would you like to do?" menu). Confirming
  // clears the canvas and snaps back to the default crayon brush.
  const handleStartOver = useCallback(() => {
    setShowStartOverConfirm(true);
  }, []);

  const confirmStartOver = useCallback(() => {
    tapHeavy();
    reset();
    // Restore the image identity IMMEDIATELY: reset() spreads initialState,
    // which sets imageId back to null. The ImageCanvas init effect subscribes to
    // store imageId AND has it in its dep array, so leaving it null re-fires the
    // effect (real→null), which re-runs the full new-image load branch and
    // re-restores the actions we're trying to clear (the magic-reveal flash on
    // Start Over). Setting it back to the real id before anything else means the
    // dep never actually changes value, so the effect doesn't re-fire — and the
    // `clear` terminal below stamps under the correct imageId, not null.
    setImageId(id as string);
    setTool("brush");
    setBrushType("crayon");
    // Record a `clear` terminal action (web parity): a reset that syncs as a
    // terminal so a stale offline peer's strokes collapse under it during a
    // merge, instead of the union resurrecting them. addAction stamps its
    // id/createdAt/seq/originDeviceId.
    addAction({ type: "clear", color: "" } as DrawingAction);
    // Also delete the local MMKV + server progress row for an immediate
    // same-account reset; the clear terminal handles cross-device durability.
    void deleteCanvasState(id as string);
    notifySuccess();
  }, [reset, setImageId, setTool, setBrushType, addAction, id]);

  // ── Per-action sheet handlers ──────────────────────────────────────────
  // Each rail tile opens its own ActionSheet; the sheet's green ✓ fires the
  // handler, which does its async work and closes its own sheet on success.
  // Transient feedback goes to sonner toasts (never inline blocks). Ported
  // from the retired combined ActionModal + the legacy SaveButton PDF flow.
  const SAVE_FAIL_MSG = "Couldn't save your artwork. Please try again.";
  const PRINT_FAIL_MSG = "Couldn't make a PDF to print. Please try again.";
  const CAPTURE_FAIL_MSG = "Couldn't capture your artwork.";

  // Save to Photos — capture the canvas, write a PNG, save to the library.
  const handleSaveToPhotos = useCallback(async () => {
    track(ANALYTICS_EVENTS.SAVE_TO_GALLERY_CLICKED, {
      coloringImageId: id as string,
    });
    // Read captureCanvas non-reactively (it's set by the canvas on mount). This
    // avoids subscribing the route to it, keeping the route's only reactive
    // store dep `scale` (see the selector note above).
    const captureCanvas = useCanvasStore.getState().captureCanvas;
    if (!captureCanvas) {
      toast.error(SAVE_FAIL_MSG);
      return;
    }
    tapLight();
    setIsSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        toast.error(
          "Please allow access to your photo library to save your artwork.",
        );
        return;
      }
      const dataUrl = captureCanvas();
      if (!dataUrl) {
        toast.error(CAPTURE_FAIL_MSG);
        return;
      }
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const filePath = `${cacheDirectory}chunky-crayon-${id}.png`;
      await writeAsStringAsync(filePath, base64Data, {
        encoding: EncodingType.Base64,
      });
      await MediaLibrary.saveToLibraryAsync(filePath);
      tapHeavy();
      notifySuccess();
      toast.success("Saved to your photo library!");
      setShowSaveSheet(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(SAVE_FAIL_MSG);
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Add to My Artwork — save into the kid's LOCAL-FIRST collection (MMKV store
  // + PNG on disk), NOT the photo library. Works offline / logged-out / with no
  // permission prompt; a later phase syncs these to the DB. "Save to Photos"
  // (handleSaveToPhotos) stays the explicit photo-library export — the two
  // buttons now do genuinely different jobs (collection vs. camera-roll export).
  const handleMyArtwork = useCallback(async () => {
    const captureCanvas = useCanvasStore.getState().captureCanvas;
    if (!captureCanvas) {
      toast.error(SAVE_FAIL_MSG);
      return;
    }
    tapLight();
    setIsSaving(true);
    try {
      const dataUrl = captureCanvas();
      if (!dataUrl) {
        toast.error(CAPTURE_FAIL_MSG);
        return;
      }
      const artworkId = genArtworkId();
      const fileUri = await writeArtworkPng(artworkId, dataUrl);
      useArtworkStore.getState().addArtwork({
        id: artworkId,
        coloringImageId: id as string,
        profileId: activeProfile?.id ?? null,
        title: data?.coloringImage?.title ?? "My artwork",
        fileUri,
        createdAt: Date.now(),
      });
      tapHeavy();
      notifySuccess();
      toast.success("Added to your collection!");
      setShowMyArtworkSheet(false);
    } catch (error) {
      console.error("My Artwork save error:", error);
      toast.error(SAVE_FAIL_MSG);
    } finally {
      setIsSaving(false);
    }
  }, [id, activeProfile?.id, data?.coloringImage?.title]);

  // Print — build a PDF (line art + QR) and open the system print/share sheet.
  const handlePrint = useCallback(async () => {
    track(ANALYTICS_EVENTS.PRINT_CLICKED, {
      coloringImageId: id as string,
    });
    const image = data?.coloringImage;
    if (!image?.svgUrl) {
      toast.error(PRINT_FAIL_MSG);
      return;
    }
    tapLight();
    setIsPrinting(true);
    try {
      const html = `
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:24px;">
            <img src="${image.svgUrl}" style="width:100%;height:auto;" />
            ${
              image.qrCodeUrl
                ? `<div style="margin-top:16px;text-align:center;"><img src="${image.qrCodeUrl}" width="120" height="120" /></div>`
                : ""
            }
          </body>
        </html>`;
      // Open iOS's native AirPrint dialog directly (printAsync) — NOT the
      // share sheet. A kids app shouldn't route to "share to other apps";
      // printing to paper is fine, sharing the file out is not.
      tapMedium();
      await Print.printAsync({ html });
      notifySuccess();
      setShowPrintSheet(false);
    } catch (error) {
      console.error("Print error:", error);
      toast.error(PRINT_FAIL_MSG);
    } finally {
      setIsPrinting(false);
    }
  }, [data?.coloringImage, id]);

  // Debug storage on mount
  useEffect(() => {
    console.log(
      `[COLORING_PAGE] Mounted for image ID: ${id}, Layout: ${layoutMode}`,
    );
    debugCanvasStorage();
  }, [id, layoutMode]);

  // Lifecycle analytics. PAGE_VIEWED fires once on mount (per coloring image).
  // PAGE_COLORED fires on unmount/session-end with how long the page was open
  // and how many stroke actions were committed — the session-level "colored"
  // signal, distinct from the per-stroke PAGE_FIRST_STROKE fired in the store.
  // strokeCount is read non-reactively from the canvas store at teardown so the
  // effect stays mount/unmount-only (no per-stroke re-subscribe).
  useEffect(() => {
    const coloringImageId = id as string;
    const sessionStartedAt = Date.now();
    track(ANALYTICS_EVENTS.PAGE_VIEWED, {
      coloringImageId,
      source: typeof source === "string" ? source : undefined,
    });
    return () => {
      const { history } = useCanvasStore.getState();
      const strokeCount = history.filter(
        (a) => a.type === "stroke" && a.undone !== true,
      ).length;
      track(ANALYTICS_EVENTS.PAGE_COLORED, {
        coloringImageId,
        sessionDurationMs: Date.now() - sessionStartedAt,
        strokeCount,
      });
    };
    // Keyed by id so navigating between coloring pages closes one session and
    // opens the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <Text>No data</Text>;
  }

  const { coloringImage } = data;

  // A page created via the worker/pending flow lands here as GENERATING with
  // no svgUrl. The canvas needs the line-art svg, so show the friendly
  // "making your page" screen until the worker flips the row to READY
  // (useColoringImage polls every 4s while GENERATING). FAILED falls through
  // to the same screen with a back affordance rather than a broken canvas —
  // the worker rarely fails text generation; a retry path can come later.
  const isGenerating =
    coloringImage.status === "GENERATING" || !coloringImage.svgUrl;
  if (isGenerating || coloringImage.status === "FAILED") {
    return (
      <View style={styles.generatingRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <GeneratingScreen />
        <Pressable
          onPress={handleBack}
          style={[styles.generatingBack, { top: insets.top + 12 }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <FontAwesomeIcon
            icon={faChevronLeft}
            size={18}
            color={COLORS.textPrimary}
          />
        </Pressable>
      </View>
    );
  }

  // Layout is fit-based (coloringTier), not orientation. The non-phone
  // tiers (three-column rails / middle toolbar-on-top) are rendered by the
  // shared ColoringLayout component, which decides between them by what
  // fits — so the screen and the Storybook layout story stay identical.
  // The phone tier keeps its bottom-sheet drawer here.
  // `isLandscapeLayout` = "not phone": the compact header + in-header
  // controls apply to both non-phone tiers.
  const isLandscapeLayout = coloringTier !== "phone";

  // iPhone-landscape three-column: same rails+canvas as iPad, but NO header band
  // — the back button floats as a small chip top-left over the cream bg, and
  // progress/sound sit above the canvas (CanvasTopBar in the center column).
  // iPad three-column keeps its normal header (it has the vertical room).
  const isPhoneLandscapeThreeColumn =
    coloringTier === "three-column" &&
    deviceInfo.isLandscape &&
    !deviceInfo.isTablet;

  // Portrait three-column (iPad held upright): the canvas is width-bound, so
  // ~half the screen height below it is empty. Make this tier scroll and hang
  // a "More Coloring Pages" grid in that dead space (web parity). Landscape
  // three-column is height-bound with no dead space — left fixed/untouched.
  const isThreeColumnPortrait =
    coloringTier === "three-column" &&
    layoutMode === "tablet-portrait" &&
    !isFocusMode;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: coloringImage.title,
          headerShown: false,
        }}
      />
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        {/* Focus-mode status bar binding — declarative hide. */}
        <FocusModeStatusBar />

        {/* Header Area - Compact in phone landscape. Hidden in focus mode AND
            in iPhone-landscape three-column (there the back button floats as a
            chip, no header band — see the absolute back chip near the bottom). */}
        {!isFocusMode && !isPhoneLandscapeThreeColumn && (
          <View
            style={[
              styles.header,
              useCompactHeader && styles.headerCompact,
              {
                paddingTop: insets.top + (useCompactHeader ? 4 : 8),
                paddingLeft: insets.left + 8,
                paddingRight: insets.right + 8,
              },
            ]}
          >
            {/* Back button */}
            <Pressable
              style={({ pressed }) => [
                styles.headerButton,
                useCompactHeader && styles.headerButtonCompact,
                pressed && styles.headerButtonPressed,
              ]}
              onPress={handleBack}
            >
              <FontAwesomeIcon
                icon={faChevronLeft}
                size={useCompactHeader ? 16 : 18}
                color="#374151"
              />
            </Pressable>

            {/* Title — centered across the header (web centers the title).
                flex:1 between the back button and an equal-width spacer keeps
                it centered. Progress + sound/music no longer live here; they
                sit on the CanvasTopBar above the canvas (web parity). */}
            {!useCompactHeader && (
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2}>
                  {coloringImage.title}
                </Text>
              </View>
            )}
            {useCompactHeader && <View style={{ flex: 1 }} />}

            {/* Right spacer = back-button width, so the centered title stays
                centered. Web has no Done/star button here — the terminal
                actions (Start Over / Print / Save) live in the tools rail. */}
            <View
              style={[
                styles.headerButton,
                useCompactHeader && styles.headerButtonCompact,
                styles.headerSpacer,
              ]}
            />
          </View>
        )}

        {/* Canvas chrome (phone tier). Web parity (ColoringArea md:hidden top
            bar, two rows ABOVE the canvas):
              Row 1 — progress bar + sound/music (shared CanvasTopBar).
              Row 2 — the zoom pill + focus toggle, centered.
            Zoom lives HERE in the top chrome, NOT in the bottom sheet (the
            sheet is tools/colors/brush/undo-redo only, matching web's
            MobileColoringDrawer). */}
        {!isLandscapeLayout && !isFocusMode && (
          <View style={styles.canvasControls}>
            <CanvasTopBar />
            <View style={styles.canvasZoomRow}>
              {/* Focus toggle is grouped INSIDE the zoom pill (web's `trailing`
                  slot) so the whole control reads as one unit, not a separate
                  floating button beside the pill. */}
              <ZoomControls trailing={<FocusModeToggleButton />} />
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {isLandscapeLayout ? (
            /* Non-phone tiers (three-column rails / middle toolbar-on-top)
               are laid out by the shared ColoringLayout, which decides
               between them by what fits. Hidden chrome in focus mode →
               render just the canvas full-bleed. */
            isFocusMode ? (
              /* Focus mode (iPad/landscape): the EXACT same three-column
                 ColoringLayout as the non-focus landscape path — same width/height
                 so the canvas measure-fits identically — just rendered straight in
                 the flex:1 mainContent with NO ScrollView, NO header above, NO
                 "More Coloring Pages" below. So the colouring area is unchanged;
                 focus only strips the surrounding chrome (web parity: hides chrome,
                 not the toolbars). The exit X is the global FocusModeFloatingExit,
                 absolutely positioned (modal vibe) and offset to clear the right
                 rail — NOT a layout header row (that stole space + pushed the
                 canvas down).
                 Wrapped in a flex:1 column View so ColoringLayout gets a
                 FULL-HEIGHT bounded box (mirrors the non-focus path's
                 landscapeColoringBlock) — without it, ColoringLayout sits bare in
                 the flexDirection:row mainContent and its canvas measure-fit
                 collapsed/dropped to the bottom. */
              <View style={styles.focusColumn}>
                <ColoringLayout
                  width={deviceInfo.screenWidth}
                  height={deviceInfo.screenHeight}
                  hideTopBar
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                  zoom={scale}
                  onStartOver={handleStartOver}
                  onPrint={() => setShowPrintSheet(true)}
                  onSave={() => setShowSaveSheet(true)}
                  onMyArtwork={() => setShowMyArtworkSheet(true)}
                  renderCanvas={(area) => (
                    <View style={styles.canvasCardLandscape}>
                      <ImageCanvas
                        coloringImage={coloringImage}
                        setScroll={setScroll}
                        canvasArea={{
                          width: Math.max(
                            1,
                            area.width - CANVAS_CARD_PADDING * 2,
                          ),
                          height: Math.max(
                            1,
                            area.height - CANVAS_CARD_PADDING * 2,
                          ),
                        }}
                        layoutMode={layoutMode}
                      />
                    </View>
                  )}
                />
              </View>
            ) : isThreeColumnPortrait ? (
              /* Portrait three-column: scroll the rails+canvas as one block,
                 then a "More Coloring Pages" grid fills the dead space below.
                 scrollEnabled={scroll} mirrors the phone tier — the canvas
                 toggles it off mid-stroke so drawing doesn't scroll the page.
                 `scrollable` drops ColoringLayout's row flex:1 so it takes its
                 intrinsic height inside the (unbounded) scroll content. */
              <DrawScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.threeColScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <ColoringLayout
                  width={deviceInfo.screenWidth}
                  height={deviceInfo.screenHeight}
                  scrollable
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                  zoom={scale}
                  onStartOver={handleStartOver}
                  onPrint={() => setShowPrintSheet(true)}
                  onSave={() => setShowSaveSheet(true)}
                  onMyArtwork={() => setShowMyArtworkSheet(true)}
                  renderCanvas={(area) => (
                    <View style={styles.canvasCardLandscape}>
                      <ImageCanvas
                        coloringImage={coloringImage}
                        setScroll={setScroll}
                        // Fit inside the card content box (deflate by the card
                        // padding). Portrait three-column is scrollable so the
                        // height passed here is the full screen height — the
                        // canvas fits to WIDTH and the column scrolls.
                        canvasArea={{
                          width: Math.max(
                            1,
                            area.width - CANVAS_CARD_PADDING * 2,
                          ),
                          height: Math.max(
                            1,
                            area.height - CANVAS_CARD_PADDING * 2,
                          ),
                        }}
                        layoutMode={layoutMode}
                      />
                    </View>
                  )}
                />
                <MoreColoringPages
                  currentId={coloringImage.id}
                  containerWidth={deviceInfo.screenWidth}
                />
              </DrawScrollView>
            ) : (
              /* Landscape three-column / middle. Like portrait, the coloring
                 block fills the FIRST screenful (canvas fully visible, no scroll
                 needed) and a "More Coloring Pages" grid hangs below — scroll
                 down to reach it. The three-column block is pinned to one
                 viewport height (canvasFillRowLandscape minHeight) so the canvas
                 measure-fits the visible screen, then the strip flows below.
                 scrollEnabled={scroll} reuses the canvas's draw-disables-scroll
                 arbitration (ImageCanvas setScroll(false) on draw-start) — the
                 SAME proven pattern as the portrait + phone paths, no new
                 gesture conflict. */
              <DrawScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.threeColScrollContent}
                showsVerticalScrollIndicator={false}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  setLandscapeViewportH((prev) => (prev === h ? prev : h));
                }}
              >
                <View
                  style={[
                    styles.landscapeColoringBlock,
                    // Pin to the measured viewport (fallback to screenHeight
                    // pre-measure) so the canvas fits the VISIBLE area, not the
                    // full window. MoreColoringPages flows below.
                    { height: landscapeViewportH || deviceInfo.screenHeight },
                    // iPhone-landscape: reserve a top band for the floating back
                    // chip so the rails start below it (no overlap). The reduced
                    // height passed to ColoringLayout keeps the rails fitting.
                    isPhoneLandscapeThreeColumn && {
                      paddingTop: Math.max(insets.top, 12) + 44,
                    },
                  ]}
                >
                  <ColoringLayout
                    width={deviceInfo.screenWidth}
                    height={deviceInfo.screenHeight}
                    // iPhone-landscape reserves a top band for the back chip via
                    // the block's paddingTop; tell ColoringLayout so the rails fit
                    // the REDUCED height WITHOUT changing the tier (passing a
                    // smaller height prop would drop it below the three-column
                    // floor → middle tier, the bug).
                    reservedTop={
                      isPhoneLandscapeThreeColumn
                        ? Math.max(insets.top, 12) + 44
                        : 0
                    }
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onResetZoom={handleResetZoom}
                    zoom={scale}
                    onStartOver={handleStartOver}
                    onPrint={() => setShowPrintSheet(true)}
                    onSave={() => setShowSaveSheet(true)}
                    onMyArtwork={() => setShowMyArtworkSheet(true)}
                    renderCanvas={(area) => (
                      <View style={styles.canvasCardLandscape}>
                        <ImageCanvas
                          coloringImage={coloringImage}
                          setScroll={setScroll}
                          // The card adds CANVAS_CARD_PADDING all round; the canvas
                          // must fit inside the card's CONTENT box, not the slot, or
                          // it overflows the card by 2×padding. Deflate the measured
                          // area accordingly (clamped >=1 so it never feeds a 0-dim
                          // Skia snapshot).
                          canvasArea={{
                            width: Math.max(
                              1,
                              area.width - CANVAS_CARD_PADDING * 2,
                            ),
                            height: Math.max(
                              1,
                              area.height - CANVAS_CARD_PADDING * 2,
                            ),
                          }}
                          layoutMode={layoutMode}
                        />
                      </View>
                    )}
                  />
                </View>
                <MoreColoringPages
                  currentId={coloringImage.id}
                  containerWidth={deviceInfo.screenWidth}
                />
              </DrawScrollView>
            )
          ) : (
            /* Phone layout - Canvas with bottom toolbar */
            <View style={styles.canvasWrapper}>
              <DrawScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.canvasContainer}>
                  <View style={styles.canvasCard}>
                    <ImageCanvas
                      coloringImage={coloringImage}
                      setScroll={setScroll}
                      canvasArea={canvasArea}
                      layoutMode={layoutMode}
                    />
                  </View>
                  {/* Actions UNDER the canvas (web parity: Start Over / Print /
                      Save / My Artwork sit below the canvas, NOT in the bottom
                      sheet). Each opens its own sheet. */}
                  <View style={styles.canvasActionRow}>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        handleStartOver();
                      }}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Start Over"
                    >
                      <FontAwesomeIcon
                        icon={faArrowsRotateDuotone}
                        size={24}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        setShowPrintSheet(true);
                      }}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Print"
                    >
                      <FontAwesomeIcon
                        icon={faPrintDuotone}
                        size={24}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        setShowSaveSheet(true);
                      }}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Save"
                    >
                      <FontAwesomeIcon
                        icon={faFloppyDiskDuotone}
                        size={24}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        setShowMyArtworkSheet(true);
                      }}
                      style={styles.canvasActionTile}
                      accessibilityLabel="My Artwork"
                    >
                      <FontAwesomeIcon
                        icon={faHeartDuotone}
                        size={24}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                  </View>
                </View>
              </DrawScrollView>
            </View>
          )}
        </View>

        {/* Per-action bottom sheets — one per rail tile, all matching the
            Start Over confirm style (icon-led, round ✕/✓ on SquishyPressable). */}

        {/* Save to device — capture the canvas, save a PNG to Photos. Also
            offers Share (gated) as the secondary green button. */}
        <ActionSheet
          isOpen={showSaveSheet}
          onClose={() => setShowSaveSheet(false)}
          icon={faFloppyDisk}
          title="Save your picture?"
          confirmLabel="Save to photos"
          onConfirm={handleSaveToPhotos}
          loading={isSaving}
        />

        {/* Print — build a PDF (line art + QR) and open the print/share sheet. */}
        <ActionSheet
          isOpen={showPrintSheet}
          onClose={() => setShowPrintSheet(false)}
          icon={faPrint}
          title="Print this page?"
          confirmLabel="Make a PDF to print"
          onConfirm={handlePrint}
          loading={isPrinting}
        />

        {/* My Artwork — save a copy into the kid's collection (heart). */}
        <ActionSheet
          isOpen={showMyArtworkSheet}
          onClose={() => setShowMyArtworkSheet(false)}
          icon={faHeart}
          iconTint={COLORS.coral}
          iconCircleColor="rgba(230, 137, 145, 0.12)"
          title="Add to My Artwork?"
          confirmLabel="Add to my collection"
          onConfirm={handleMyArtwork}
          loading={isSaving}
        />

        {/* Start Over confirm — opened DIRECTLY by the rail's refresh tile
            (web parity: one confirm, no actions menu in the restart path). */}
        <ConfirmSheet
          isOpen={showStartOverConfirm}
          onClose={() => setShowStartOverConfirm(false)}
          title="Start over?"
          confirmLabel="Yes, start over"
          cancelLabel="No, keep my coloring"
          onConfirm={confirmStartOver}
          tone="destructive"
        />

        {/* Bottom drawer in the phone tier. STAYS in focus mode — web only
            gates its MobileColoringDrawer on canvas-in-viewport, NOT focus
            mode, so users can keep colouring with the tools while the top
            chrome is hidden (the floating X is the exit). Web parity: the sheet
            is tools / colors / brush / undo-redo ONLY — zoom lives in the top
            chrome and the actions live under the canvas, so no zoom/action
            props. */}
        {!isLandscapeLayout && <MobileColoringToolbar />}

        {/* Floating exit X — modal-style, pinned to the true top-right SCREEN
            corner (only renders in focus mode). Offsetting it left by the rail
            width put it on top of the progress/sound bar (CanvasTopBar) instead;
            the rail's top-right corner is empty (zoom controls sit lower), so a
            plain corner X is clean on both iPad and phone. */}
        <FocusModeFloatingExit />

        {/* Floating back chip — iPhone-landscape three-column only (non-focus).
            Replaces the header band: a small white round chip top-left on the
            cream bg, clear of the left rail (which starts below it). */}
        {isPhoneLandscapeThreeColumn && !isFocusMode && (
          <Pressable
            style={({ pressed }) => [
              styles.floatingBack,
              {
                top: Math.max(insets.top, 12),
                left: Math.max(insets.left, 12),
              },
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleBack}
            accessibilityLabel="Back"
          >
            <FontAwesomeIcon icon={faChevronLeft} size={18} color="#374151" />
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
};

// Inner padding of canvasCardLandscape. The canvas must fit inside the card's
// CONTENT box, so the renderCanvas call sites deflate the measured slot by
// 2× this. Keep tied to the style below so they never drift.
const CANVAS_CARD_PADDING = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Generating state (worker still drawing the page): full-screen loader +
  // a floating back chip so the user is never trapped on a blank canvas.
  generatingRoot: {
    flex: 1,
  },
  generatingBack: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCompact: {
    paddingBottom: 8,
    alignItems: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Floating back chip for iPhone-landscape three-column (no header band).
  // Absolute, top-left on the cream bg — same white-round look as headerButton.
  floatingBack: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E8DFD6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  headerButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  // Invisible right-side spacer (matches back-button width) so the centered
  // title stays optically centered now that the Done/star button is gone.
  headerSpacer: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    fontFamily: "TondoTrial-Bold",
    lineHeight: 28,
  },
  headerControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  landscapeHeaderControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  // iPad/landscape focus mode: a flex:1 column wrapper so the three-column
  // ColoringLayout gets a full-height bounded box (mirrors the non-focus
  // landscapeColoringBlock). paddingTop reserves a band at the top for the
  // absolutely-positioned exit X (FocusModeFloatingExit, ~44px at top≈16-24) so
  // the X sits in clear space ABOVE the three columns — never over the right rail
  // or the progress/sound bar. The columns (rails + canvas) start below it.
  focusColumn: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 72,
  },
  middleColumn: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 8,
    gap: 8,
  },
  middleCanvasWrapper: {
    flex: 1,
  },
  canvasWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 180,
  },
  // Portrait three-column scroll content. NO flexGrow:1 — let the content
  // (rails+canvas block, then the More-pages grid) take its natural height so
  // it can exceed the viewport and scroll. Bottom pad clears the home bar.
  threeColScrollContent: {
    paddingBottom: 32,
  },
  // Landscape: the coloring block is pinned to one viewport height so the
  // canvas measure-fits the visible screen (ColoringLayout's row is flex:1, so
  // this column container with a viewport minHeight gives it that full height),
  // then MoreColoringPages flows below it inside the ScrollView. The minHeight
  // is applied inline (= deviceInfo.screenHeight).
  landscapeColoringBlock: {
    flexDirection: "column",
  },
  scrollContentLandscape: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  canvasContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasCard: {
    width: "100%",
    // Clip the canvas to the card's rounded bounds — without this the image
    // (esp. when zoomed/panned) breaks out the top/edges of the card. Matches
    // canvasCardLandscape + web's `overflow-hidden` on the canvas wrapper.
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  canvasCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    alignItems: "stretch",
    paddingVertical: 8,
  },
  canvasCardLandscape: {
    // Hug the (letterboxed) canvas and center within the column rather than
    // span full width — so a height-bound square sits centered, not pinned to
    // the left with dead space beside it. maxWidth keeps it from exceeding the
    // column on a wide image. alignSelf centers it horizontally; the parent
    // (canvasFillFixed) centers it vertically.
    alignSelf: "center",
    maxWidth: "100%",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: CANVAS_CARD_PADDING,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  // Two-row top chrome (web ColoringArea md:hidden): Row 1 = CanvasTopBar
  // (progress + sound/music), Row 2 = the centered zoom pill + focus toggle.
  canvasControls: {
    flexDirection: "column",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  canvasZoomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  // Actions under the canvas (web parity): Start Over / Print / Save / Heart.
  // Web renders these as ActionButton size="tile" tone="tool": a ROUNDED-CARD
  // (not circular) white tile, 1px surface-dark border, neutral icon — same as
  // the middle/three-column ColoringToolbar action tiles. Centered row, py-2.
  canvasActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
  },
  canvasActionTile: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    // Rounded card, NOT a circle (web: rounded-coloring-button ≈ 24).
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
});

// Wrap the route in DrawScrollProvider so the per-stroke `scroll` toggle
// re-renders only the provider + the ScrollView consumers, not the route body.
const ColoringImageRoute = () => (
  <DrawScrollProvider>
    <ColoringImage />
  </DrawScrollProvider>
);

export default ColoringImageRoute;
