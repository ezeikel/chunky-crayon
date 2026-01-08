import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft, faStar } from "@fortawesome/pro-solid-svg-icons";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import MobileColoringToolbar from "@/components/MobileColoringToolbar/MobileColoringToolbar";
import ColorPaletteSidebar from "@/components/ColorPaletteSidebar/ColorPaletteSidebar";
import ToolsSidebar from "@/components/ToolsSidebar/ToolsSidebar";
import ActionModal from "@/components/ActionModal/ActionModal";
import ZoomControls from "@/components/ZoomControls/ZoomControls";
import MuteToggle from "@/components/MuteToggle/MuteToggle";
import ProgressIndicator from "@/components/ProgressIndicator/ProgressIndicator";
import useColoringImage from "@/hooks/api/useColoringImage";
import Loading from "@/components/Loading/Loading";
import { tapLight } from "@/utils/haptics";
import { debugCanvasStorage } from "@/utils/canvasPersistence";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useCanvasStore } from "@/stores/canvasStore";

const ColoringImage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading } = useColoringImage(id as string);
  const [scroll, setScroll] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const insets = useSafeAreaInsets();

  // Responsive layout hook
  const {
    layoutMode,
    useSideToolbar,
    useCompactHeader,
    canvasArea,
    landscapeLayout,
  } = useResponsiveLayout();

  // Get zoom state and actions from canvas store
  const { scale, setScale, resetTransform } = useCanvasStore();

  const handleZoomIn = useCallback(() => {
    setScale(scale * 1.2);
  }, [scale, setScale]);

  const handleZoomOut = useCallback(() => {
    setScale(scale / 1.2);
  }, [scale, setScale]);

  const handleResetZoom = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

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

  const handleDone = useCallback(() => {
    tapLight();
    setShowActionModal(true);
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <Text>No data</Text>;
  }

  const { coloringImage } = data;

  // Determine if we're in a landscape layout
  const isLandscapeLayout = useSideToolbar;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: coloringImage.title,
          headerShown: false,
        }}
      />
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        {/* Header Area - Compact in phone landscape */}
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

          {/* Title - Hidden in compact mode */}
          {!useCompactHeader && (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {coloringImage.title}
              </Text>
            </View>
          )}

          {/* Spacer for landscape - controls go in middle, done button at end */}
          {isLandscapeLayout && (
            <>
              <View style={{ flex: 1 }} />
              {/* Controls in header for landscape */}
              <View style={styles.landscapeHeaderControls}>
                <ProgressIndicator />
                <MuteToggle />
              </View>
              <View style={{ flex: 1 }} />
            </>
          )}

          {/* Done button */}
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              styles.doneButton,
              useCompactHeader && styles.headerButtonCompact,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleDone}
          >
            <FontAwesomeIcon
              icon={faStar}
              size={useCompactHeader ? 16 : 18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Canvas Controls - separate row in portrait mode */}
        {!isLandscapeLayout && (
          <View style={styles.canvasControls}>
            <ProgressIndicator />
            <MuteToggle />
            <ZoomControls />
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Three-panel landscape layout: Colors | Canvas | Tools */}
          {isLandscapeLayout && landscapeLayout ? (
            <>
              {/* Left Sidebar - Color Palette */}
              <ColorPaletteSidebar width={landscapeLayout.leftSidebarWidth} />

              {/* Center - Canvas */}
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

              {/* Right Sidebar - Tools */}
              <ToolsSidebar
                width={landscapeLayout.rightSidebarWidth}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                zoom={scale}
              />
            </>
          ) : (
            /* Portrait layout - Canvas with bottom toolbar */
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
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Action Modal */}
        <ActionModal
          visible={showActionModal}
          onClose={() => setShowActionModal(false)}
        />

        {/* Bottom Toolbar for portrait modes only */}
        {!useSideToolbar && <MobileColoringToolbar />}
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
  doneButton: {
    backgroundColor: "#E46444", // Coral - brand color
    shadowColor: "#E46444",
    shadowOpacity: 0.25,
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
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  canvasCardLandscape: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#E46444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  canvasControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

export default ColoringImage;
