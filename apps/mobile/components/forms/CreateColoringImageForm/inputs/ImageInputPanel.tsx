import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCameraRetro, faImages } from "@fortawesome/pro-duotone-svg-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useInputMode } from "./InputModeContext";
import Spinner from "@/components/Spinner/Spinner";

// =============================================================================
// Design Tokens (matching web tailwind config)
// =============================================================================

const COLORS = {
  // Primary - Coral: hsl(12, 75%, 58%)
  crayonOrange: "#E46444",
  // Secondary - Peach: hsl(25, 80%, 72%) - web calls this "teal"
  crayonPeach: "#F1AE7E",
  // Background cream dark: hsl(35, 40%, 93%)
  bgCreamDark: "#F0E9E0",
  // Text primary: hsl(20, 20%, 22%)
  textPrimary: "#443832",
  // Text muted: hsl(20, 10%, 50%)
  textMuted: "#8B7E78",
  // White
  white: "#FFFFFF",
};

type ColoringImage = {
  id: string;
  url: string;
  svgUrl: string;
  title: string;
};

type ImageInputPanelProps = {
  onColoringImageCreated: (coloringImage: ColoringImage) => void;
  isSubmitting: boolean;
};

const ImageInputPanel = ({
  onColoringImageCreated,
  isSubmitting,
}: ImageInputPanelProps) => {
  const { setIsProcessing, setError, isProcessing } = useInputMode();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission",
          "We need camera access to take photos!",
        );
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photo Library Permission",
          "We need access to your photos!",
        );
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Failed to pick image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  }, []);

  const processImage = useCallback(async () => {
    if (!base64Image) return;

    setIsProcessing(true);
    try {
      const { generateFromPhoto } = await import("@/api");
      const response = await generateFromPhoto(base64Image);

      if (response.coloringImage) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onColoringImageCreated(response.coloringImage);
      } else if (response.error) {
        setError(response.error);
        Alert.alert("Generation Failed", response.error);
      } else {
        setError("Failed to create coloring page from photo.");
        Alert.alert(
          "Generation Failed",
          "We couldn't create a coloring page from your photo. Please try again!",
        );
      }
    } catch (error) {
      console.error("Failed to generate coloring page:", error);
      setError("Something went wrong. Please try again.");
      Alert.alert(
        "Processing Error",
        "Something went wrong while creating your coloring page. Please try again!",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [base64Image, onColoringImageCreated, setIsProcessing, setError]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setBase64Image(null);
  }, []);

  const busy = isSubmitting || isProcessing;

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <Text style={styles.instructions}>
        {selectedImage
          ? "Great picture! Is this the one you want?"
          : "Take a photo or upload a picture!"}
      </Text>

      {/* Image preview or capture buttons */}
      {selectedImage ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.previewImage}
            resizeMode="cover"
          />

          {/* Processing overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <Spinner color="#FFF" size={32} />
              <Text style={styles.processingText}>
                Creating your coloring page...
              </Text>
            </View>
          )}

          {/* Action buttons */}
          {!isProcessing && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={clearImage}
                disabled={busy}
              >
                <Text style={styles.changeButtonText}>Pick another</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit button */}
          {!isProcessing && (
            <TouchableOpacity
              style={[styles.submitButton, busy && styles.submitButtonDisabled]}
              onPress={processImage}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Create coloring page</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.captureContainer}>
          {/* Take Photo button */}
          <TouchableOpacity
            style={[styles.captureButton, styles.cameraButton]}
            onPress={takePhoto}
            disabled={busy}
            activeOpacity={0.8}
          >
            <FontAwesomeIcon
              icon={faCameraRetro}
              size={40}
              color={COLORS.white}
              secondaryColor={COLORS.crayonPeach}
              secondaryOpacity={1}
            />
            <Text style={styles.captureButtonText}>Camera</Text>
          </TouchableOpacity>

          {/* Choose from Gallery button */}
          <TouchableOpacity
            style={[styles.captureButton, styles.galleryButton]}
            onPress={pickImage}
            disabled={busy}
            activeOpacity={0.8}
          >
            <FontAwesomeIcon
              icon={faImages}
              size={40}
              color={COLORS.white}
              secondaryColor="rgba(255, 255, 255, 0.8)"
              secondaryOpacity={1}
            />
            <Text style={styles.captureButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  instructions: {
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  captureContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  captureButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: 112,
    height: 112,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  cameraButton: {
    backgroundColor: COLORS.crayonOrange,
    shadowColor: COLORS.crayonOrange,
  },
  galleryButton: {
    backgroundColor: COLORS.crayonPeach,
    shadowColor: COLORS.crayonPeach,
  },
  captureButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: "TondoTrial-Bold",
  },
  previewContainer: {
    width: "100%",
    alignItems: "center",
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    color: COLORS.white,
    marginTop: 12,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    textAlign: "center",
  },
  actionRow: {
    marginBottom: 16,
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: "TondoTrial-Regular",
    textDecorationLine: "underline",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.crayonOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    shadowColor: COLORS.crayonOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: "TondoTrial-Bold",
  },
});

export default ImageInputPanel;
