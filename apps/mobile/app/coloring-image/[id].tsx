import { useState, useEffect, useCallback } from "react";
import { Text, View, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft, faStar } from "@fortawesome/pro-solid-svg-icons";
import ImageCanvas from "@/components/ImageCanvas/ImageCanvas";
import MobileColoringToolbar from "@/components/MobileColoringToolbar/MobileColoringToolbar";
import ActionModal from "@/components/ActionModal/ActionModal";
import ZoomControls from "@/components/ZoomControls/ZoomControls";
import MuteToggle from "@/components/MuteToggle/MuteToggle";
import ProgressIndicator from "@/components/ProgressIndicator/ProgressIndicator";
import useColoringImage from "@/hooks/api/useColoringImage";
import Loading from "@/components/Loading/Loading";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight } from "@/utils/haptics";

const ColoringImage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, isLoading } = useColoringImage(id as string);
  const [scroll, setScroll] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const { reset } = useCanvasStore();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  const handleDone = useCallback(() => {
    tapLight();
    setShowActionModal(true);
  }, []);

  // Reset canvas state when entering a new coloring image
  useEffect(() => {
    reset();
  }, [id, reset]);

  if (isLoading) {
    return <Loading />;
  }

  if (!data) {
    return <Text>No data</Text>;
  }

  const { coloringImage } = data;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: coloringImage.title,
          headerShown: false,
        }}
      />
      <LinearGradient colors={["#FDFAF5", "#F5EEE5"]} style={styles.gradient}>
        {/* Header Area */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {/* Back button */}
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleBack}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={18} color="#374151" />
          </Pressable>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {coloringImage.title}
            </Text>
          </View>

          {/* Done button */}
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              styles.doneButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={handleDone}
          >
            <FontAwesomeIcon icon={faStar} size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Canvas Controls - above canvas like web */}
        <View style={styles.canvasControls}>
          <ProgressIndicator />
          <MuteToggle />
          <ZoomControls />
        </View>

        {/* Canvas Area */}
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
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Modal */}
        <ActionModal
          visible={showActionModal}
          onClose={() => setShowActionModal(false)}
        />

        {/* Fixed Bottom Toolbar */}
        <MobileColoringToolbar />
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
    // No padding needed - Done button on right balances Back button on left
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    fontFamily: "TondoTrial-Bold",
    lineHeight: 28,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 180,
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
