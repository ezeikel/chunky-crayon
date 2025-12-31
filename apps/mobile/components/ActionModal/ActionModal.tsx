import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faImage,
  faShare,
  faHeart,
  faBroomWide,
  faXmark,
} from "@fortawesome/pro-solid-svg-icons";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { useCanvasStore } from "@/stores/canvasStore";
import ParentalGate from "@/components/ParentalGate";
import { tapLight, tapMedium, tapHeavy, notifySuccess } from "@/utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ActionModalProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Kid-friendly action modal for Save, Share, and Start Over.
 * Designed for ages 3-8 with large touch targets (48pt+) and
 * colorful, icon-based buttons.
 *
 * Features:
 * - Save to Photos (primary action, large)
 * - Share (primary action, large)
 * - Keep Coloring (dismiss, prominent)
 * - Start Over (destructive, smaller, at bottom)
 */
const ActionModal = ({ visible, onClose }: ActionModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareGate, setShowShareGate] = useState(false);

  const { captureCanvas, reset, setTool, setBrushType } = useCanvasStore();

  // Save to Photos handler
  const handleSaveToPhotos = useCallback(async () => {
    if (!captureCanvas) {
      Alert.alert("Oops!", "Unable to save your artwork. Please try again.");
      return;
    }

    tapLight();
    setIsSaving(true);
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Please allow access to your photo library to save your artwork.",
        );
        return;
      }

      const dataUrl = captureCanvas();
      if (!dataUrl) {
        Alert.alert("Oops!", "Failed to capture artwork.");
        return;
      }

      // Convert base64 to file
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const filename = `chunky-crayon-${Date.now()}.png`;
      const filePath = `${cacheDirectory}${filename}`;

      await writeAsStringAsync(filePath, base64Data, {
        encoding: EncodingType.Base64,
      });

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(filePath);

      tapHeavy();
      notifySuccess();
      Alert.alert("Saved!", "Your artwork is in your photo library!");
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Oops!", "Failed to save artwork. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [captureCanvas, onClose]);

  // Share button handler - opens parental gate first
  const handleSharePress = useCallback(() => {
    if (!captureCanvas) {
      Alert.alert("Oops!", "Unable to share your artwork. Please try again.");
      return;
    }
    tapLight();
    setShowShareGate(true);
  }, [captureCanvas]);

  // Actual share handler - called after parental gate is passed
  const handleShareConfirmed = useCallback(async () => {
    setShowShareGate(false);

    if (!captureCanvas) {
      Alert.alert("Oops!", "Unable to share your artwork. Please try again.");
      return;
    }

    setIsSharing(true);
    try {
      const dataUrl = captureCanvas();
      if (!dataUrl) {
        Alert.alert("Oops!", "Failed to capture artwork.");
        return;
      }

      // Convert base64 to file
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const filename = `chunky-crayon-${Date.now()}.png`;
      const filePath = `${cacheDirectory}${filename}`;

      await writeAsStringAsync(filePath, base64Data, {
        encoding: EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        tapMedium();
        await Sharing.shareAsync(filePath, {
          mimeType: "image/png",
          dialogTitle: "Share your artwork",
        });
        onClose();
      } else {
        Alert.alert("Oops!", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Oops!", "Failed to share artwork. Please try again.");
    } finally {
      setIsSharing(false);
    }
  }, [captureCanvas, onClose]);

  // My Artwork handler - saves to local gallery
  const handleMyArtwork = useCallback(async () => {
    if (!captureCanvas) {
      Alert.alert("Oops!", "Unable to save your artwork. Please try again.");
      return;
    }

    tapLight();
    setIsSaving(true);
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Please allow access to your photo library to save your artwork.",
        );
        return;
      }

      const dataUrl = captureCanvas();
      if (!dataUrl) {
        Alert.alert("Oops!", "Failed to capture artwork.");
        return;
      }

      // Convert base64 to file
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const filename = `chunky-crayon-${Date.now()}.png`;
      const filePath = `${cacheDirectory}${filename}`;

      await writeAsStringAsync(filePath, base64Data, {
        encoding: EncodingType.Base64,
      });

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(filePath);

      tapHeavy();
      notifySuccess();
      Alert.alert(
        "Added to My Artwork!",
        "Your masterpiece is saved to your collection!",
      );
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Oops!", "Failed to save artwork. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [captureCanvas, onClose]);

  // Start Over handler
  const handleStartOver = useCallback(() => {
    tapLight();
    Alert.alert(
      "Start Over?",
      "Are you sure? This will erase all your coloring!",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Start Over",
          style: "destructive",
          onPress: () => {
            tapHeavy();
            reset();
            setTool("brush");
            setBrushType("crayon");
            notifySuccess();
            onClose();
          },
        },
      ],
    );
  }, [reset, setTool, setBrushType, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="light" style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <View />
        </Pressable>

        <View style={styles.modalContainer}>
          {/* Close button */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onClose}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color="#E46444" />
          </Pressable>

          {/* Modal title */}
          <Text style={styles.title}>What would you like to do?</Text>

          {/* Actions grid - 2x2 layout */}
          <View style={styles.actionsGrid}>
            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
                (isSaving || !captureCanvas) && styles.buttonDisabled,
              ]}
              onPress={handleSaveToPhotos}
              disabled={isSaving || !captureCanvas}
            >
              <FontAwesomeIcon icon={faImage} size={32} color="#E46444" />
              <Text style={styles.actionButtonText}>Save</Text>
            </Pressable>

            {/* Share Button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
                (isSharing || !captureCanvas) && styles.buttonDisabled,
              ]}
              onPress={handleSharePress}
              disabled={isSharing || !captureCanvas}
            >
              <FontAwesomeIcon icon={faShare} size={32} color="#E46444" />
              <Text style={styles.actionButtonText}>Share</Text>
            </Pressable>

            {/* My Artwork button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
                isSaving && styles.buttonDisabled,
              ]}
              onPress={handleMyArtwork}
              disabled={isSaving}
            >
              <FontAwesomeIcon icon={faHeart} size={32} color="#E46444" />
              <Text style={styles.actionButtonText}>My Artwork</Text>
            </Pressable>

            {/* Start Over */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.startOverButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleStartOver}
            >
              <FontAwesomeIcon icon={faBroomWide} size={32} color="#9CA3AF" />
              <Text style={styles.startOverText}>Start Over</Text>
            </Pressable>
          </View>
        </View>
      </BlurView>

      {/* Parental Gate for Share */}
      <ParentalGate
        visible={showShareGate}
        onClose={() => setShowShareGate(false)}
        onSuccess={handleShareConfirmed}
        title="Share Artwork"
        subtitle="A parent or guardian needs to verify before sharing"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#374151",
    fontFamily: "TondoTrial-Bold",
    marginBottom: 24,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 48, // Avoid overlap with close button
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  actionButton: {
    width: 140,
    height: 100,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF5F3", // Light coral tint
    borderWidth: 2,
    borderColor: "#E46444",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E46444",
    fontFamily: "TondoTrial-Bold",
  },
  startOverButton: {
    backgroundColor: "#F9FAFB", // Light gray
    borderColor: "#D1D5DB",
  },
  startOverText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#9CA3AF",
    fontFamily: "TondoTrial-Bold",
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ActionModal;
