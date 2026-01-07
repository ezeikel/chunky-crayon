import { useState, useCallback, useEffect } from "react";
import { Text, View, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft, faStar } from "@fortawesome/pro-solid-svg-icons";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import MobileColoringToolbar from "@/components/MobileColoringToolbar/MobileColoringToolbar";
import SideToolbar from "@/components/MobileColoringToolbar/SideToolbar";
import ActionModal from "@/components/ActionModal/ActionModal";
import ZoomControls from "@/components/ZoomControls/ZoomControls";
import MuteToggle from "@/components/MuteToggle/MuteToggle";
import ProgressIndicator from "@/components/ProgressIndicator/ProgressIndicator";
import ColorPaletteBar from "@/components/ColorPaletteBar/ColorPaletteBar";
import useColoringImage from "@/hooks/api/useColoringImage";
import Loading from "@/components/Loading/Loading";
import { tapLight } from "@/utils/haptics";
import { debugCanvasStorage } from "@/utils/canvasPersistence";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { HEADER } from "@/constants/Sizes";

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
    toolbarCollapsible,
    sideToolbarExpanded,
    headerHeight,
    touchTargetSize,
    canvasArea,
  } = useResponsiveLayout();

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
            { paddingTop: insets.top + (useCompactHeader ? 4 : 8) },
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

          {/* Canvas Controls - In header for landscape, separate row for portrait */}
          {isLandscapeLayout && (
            <View style={styles.headerControls}>
              <ProgressIndicator />
              <MuteToggle />
              <ZoomControls />
            </View>
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
          {/* Side Toolbar for landscape modes */}
          {useSideToolbar && (
            <SideToolbar
              collapsible={toolbarCollapsible}
              buttonSize={touchTargetSize.medium}
            />
          )}

          {/* Canvas Area */}
          <View style={styles.canvasWrapper}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isLandscapeLayout && styles.scrollContentLandscape,
              ]}
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

            {/* Color Palette Bar for landscape modes */}
            {isLandscapeLayout && <ColorPaletteBar />}
          </View>
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
    paddingHorizontal: 16,
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
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  canvasContainer: {
    flex: 1,
    alignItems: "center",
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
