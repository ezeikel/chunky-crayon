import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { toast } from "@/components/Toaster";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCameraRetro, faImages } from "@fortawesome/pro-duotone-svg-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useInputMode } from "./InputModeContext";
import Spinner from "@/components/Spinner/Spinner";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";
import { useT } from "@/lib/i18n/useT";

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

const CREDITS_PER_GENERATION = 5;

type ImageInputPanelProps = {
  onColoringImageCreated: (coloringImage: ColoringImage) => void;
  isSubmitting: boolean;
  credits: number;
  onShowPaywall: () => void;
};

const ImageInputPanel = ({
  onColoringImageCreated,
  isSubmitting,
  credits,
  onShowPaywall,
}: ImageInputPanelProps) => {
  const t = useT("createForm.image");
  const tButton = useT("mobile.button");
  const tError = useT("createForm.error");
  const { setIsProcessing, setError, isProcessing } = useInputMode();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // Check if user has enough credits to generate
  const hasEnoughCredits = credits >= CREDITS_PER_GENERATION;

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        toast.error(t("cameraPermissionDenied"));
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
        track(ANALYTICS_EVENTS.IMAGE_INPUT_CAPTURED, { source: "camera" });
        setSelectedImage(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      toast.error(t("takePhotoFailed"));
    }
  }, [t]);

  const pickImage = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.error(t("libraryPermissionDenied"));
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
        track(ANALYTICS_EVENTS.IMAGE_INPUT_UPLOADED, { source: "file_picker" });
        setSelectedImage(result.assets[0].uri);
        setBase64Image(result.assets[0].base64 || null);
      }
    } catch (error) {
      console.error("Failed to pick image:", error);
      toast.error(t("pickImageFailed"));
    }
  }, [t]);

  const processImage = useCallback(async () => {
    if (!base64Image) return;

    // Funnel-top: kid tapped "Create coloring page" from a photo. No text
    // description in image mode, so descriptionLength is 0.
    track(ANALYTICS_EVENTS.CREATION_SUBMITTED, {
      inputType: "image",
      descriptionLength: 0,
    });

    // Check credits before processing
    if (!hasEnoughCredits) {
      onShowPaywall();
      return;
    }

    setIsProcessing(true);
    // Generation actually kicks off here (past the credit gate).
    track(ANALYTICS_EVENTS.CREATION_STARTED, { mode: "image" });
    const startedAt = Date.now();
    try {
      const { generateFromPhoto } = await import("@/api");
      const response = await generateFromPhoto(base64Image);

      if (response.coloringImage) {
        track(ANALYTICS_EVENTS.CREATION_COMPLETED, {
          coloringImageId: response.coloringImage.id,
          durationMs: Date.now() - startedAt,
        });
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onColoringImageCreated(response.coloringImage);
      } else if (response.error) {
        track(ANALYTICS_EVENTS.CREATION_FAILED, { error: response.error });
        setError(response.error);
        toast.error(response.error);
      } else {
        track(ANALYTICS_EVENTS.CREATION_FAILED, {
          error: "no_coloring_image_returned",
        });
        setError(t("createFailed"));
        toast.error(t("createFailedToast"));
      }
    } catch (error) {
      track(ANALYTICS_EVENTS.CREATION_FAILED, { error: String(error) });
      console.error("Failed to generate coloring page:", error);
      setError(tError("generic"));
      toast.error(tError("generic"));
    } finally {
      setIsProcessing(false);
    }
  }, [
    base64Image,
    onColoringImageCreated,
    setIsProcessing,
    setError,
    hasEnoughCredits,
    onShowPaywall,
    t,
    tError,
  ]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setBase64Image(null);
  }, []);

  const busy = isSubmitting || isProcessing;

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <Text style={styles.instructions}>
        {selectedImage ? t("confirmInstructions") : t("instructions")}
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
              <Text style={styles.processingText}>{t("processing")}</Text>
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
                <Text style={styles.changeButtonText}>{t("pickAnother")}</Text>
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
              <Text style={styles.buttonText}>
                {tButton("createColoringPage")}
              </Text>
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
            <Text style={styles.captureButtonText}>{t("camera")}</Text>
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
            <Text style={styles.captureButtonText}>{t("upload")}</Text>
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
