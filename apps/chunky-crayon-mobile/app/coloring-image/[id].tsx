import { useState, useCallback, useEffect } from "react";
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
  faArrowsRotate,
} from "@fortawesome/pro-solid-svg-icons";
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
import { toast } from "@/components/Toaster";
import { tapLight, tapMedium, tapHeavy, notifySuccess } from "@/utils/haptics";
import { COLORS } from "@/lib/design";
import { debugCanvasStorage } from "@/utils/canvasPersistence";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useCanvasStore } from "@/stores/canvasStore";
import { useArtworkStore, genArtworkId } from "@/stores/artworkStore";
import { writeArtworkPng } from "@/lib/artwork/files";
import { useUserContext } from "@/contexts/UserContext";
import {
  useFocusMode,
  FocusModeStatusBar,
  FocusModeToggleButton,
  FocusModeFloatingExit,
} from "@/components/FocusMode";

const ColoringImage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading } = useColoringImage(id as string);
  const [scroll, setScroll] = useState(true);
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

  // Responsive layout hook
  const { layoutMode, coloringTier, useCompactHeader, canvasArea, deviceInfo } =
    useResponsiveLayout();

  // Get zoom state and actions from canvas store
  const {
    scale,
    setScale,
    resetTransform,
    reset,
    setTool,
    setBrushType,
    captureCanvas,
  } = useCanvasStore();

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
    setTool("brush");
    setBrushType("crayon");
    notifySuccess();
  }, [reset, setTool, setBrushType]);

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
  }, [captureCanvas, id]);

  // Add to My Artwork — save into the kid's LOCAL-FIRST collection (MMKV store
  // + PNG on disk), NOT the photo library. Works offline / logged-out / with no
  // permission prompt; a later phase syncs these to the DB. "Save to Photos"
  // (handleSaveToPhotos) stays the explicit photo-library export — the two
  // buttons now do genuinely different jobs (collection vs. camera-roll export).
  const handleMyArtwork = useCallback(async () => {
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
  }, [captureCanvas, id, activeProfile?.id, data?.coloringImage?.title]);

  // Print — build a PDF (line art + QR) and open the system print/share sheet.
  const handlePrint = useCallback(async () => {
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
  }, [data?.coloringImage]);

  // Debug storage on mount
  useEffect(() => {
    console.log(
      `[COLORING_PAGE] Mounted for image ID: ${id}, Layout: ${layoutMode}`,
    );
    debugCanvasStorage();
  }, [id, layoutMode]);

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

  // Layout is fit-based (coloringTier), not orientation. The non-phone
  // tiers (three-column rails / middle toolbar-on-top) are rendered by the
  // shared ColoringLayout component, which decides between them by what
  // fits — so the screen and the Storybook layout story stay identical.
  // The phone tier keeps its bottom-sheet drawer here.
  // `isLandscapeLayout` = "not phone": the compact header + in-header
  // controls apply to both non-phone tiers.
  const isLandscapeLayout = coloringTier !== "phone";

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

        {/* Header Area - Compact in phone landscape. Hidden in focus mode. */}
        {!isFocusMode && (
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
              <ZoomControls />
              <FocusModeToggleButton />
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
              <View style={styles.canvasCenter}>
                <View style={styles.canvasCardLandscape}>
                  <ImageCanvas
                    coloringImage={coloringImage}
                    setScroll={setScroll}
                    canvasArea={canvasArea}
                    layoutMode={layoutMode}
                  />
                </View>
              </View>
            ) : isThreeColumnPortrait ? (
              /* Portrait three-column: scroll the rails+canvas as one block,
                 then a "More Coloring Pages" grid fills the dead space below.
                 scrollEnabled={scroll} mirrors the phone tier — the canvas
                 toggles it off mid-stroke so drawing doesn't scroll the page.
                 `scrollable` drops ColoringLayout's row flex:1 so it takes its
                 intrinsic height inside the (unbounded) scroll content. */
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.threeColScrollContent}
                scrollEnabled={scroll}
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
                        canvasArea={area}
                        layoutMode={layoutMode}
                      />
                    </View>
                  )}
                />
                <MoreColoringPages
                  currentId={coloringImage.id}
                  containerWidth={deviceInfo.screenWidth}
                />
              </ScrollView>
            ) : (
              <ColoringLayout
                width={deviceInfo.screenWidth}
                height={deviceInfo.screenHeight}
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
                      canvasArea={area}
                      layoutMode={layoutMode}
                    />
                  </View>
                )}
              />
            )
          ) : (
            /* Phone layout - Canvas with bottom toolbar */
            <View style={styles.canvasWrapper}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={scroll}
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
                      onPress={handleStartOver}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Start Over"
                    >
                      <FontAwesomeIcon
                        icon={faArrowsRotate}
                        size={22}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setShowPrintSheet(true)}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Print"
                    >
                      <FontAwesomeIcon
                        icon={faPrint}
                        size={22}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setShowSaveSheet(true)}
                      style={styles.canvasActionTile}
                      accessibilityLabel="Save"
                    >
                      <FontAwesomeIcon
                        icon={faFloppyDisk}
                        size={20}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setShowMyArtworkSheet(true)}
                      style={styles.canvasActionTile}
                      accessibilityLabel="My Artwork"
                    >
                      <FontAwesomeIcon
                        icon={faHeart}
                        size={20}
                        color={COLORS.textPrimary}
                      />
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
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

        {/* Bottom drawer only in the phone tier. Hidden in focus mode. Web
            parity: the sheet is tools / colors / brush / undo-redo ONLY.
            Zoom lives in the top chrome (canvasControls Row 2) and the actions
            (Start Over / Print / Save / My Artwork) live UNDER the canvas — so
            the sheet takes no zoom or action props. */}
        {!isLandscapeLayout && !isFocusMode && <MobileColoringToolbar />}

        {/* Floating exit X — only renders while focus mode is active. */}
        <FocusModeFloatingExit />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    width: "100%",
    maxWidth: "100%",
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
  // Actions under the canvas (web parity): Start Over / Print / Save / Heart,
  // centered, round white tiles with a soft border.
  canvasActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
  },
  canvasActionTile: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    backgroundColor: COLORS.white,
  },
});

export default ColoringImage;
