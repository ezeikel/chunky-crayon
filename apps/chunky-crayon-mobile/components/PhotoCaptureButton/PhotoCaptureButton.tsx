import { useState, useCallback } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Modal,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faCamera,
  faImages,
  faTimes,
  faSpinner,
} from "@fortawesome/pro-solid-svg-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { perfect } from "@/styles";
import { generateFromPhoto } from "@/api";

type ColoringImage = {
  id: string;
  url: string;
  svgUrl: string;
  title: string;
};

type PhotoCaptureButtonProps = {
  onColoringImageCreated: (coloringImage: ColoringImage) => void;
  disabled?: boolean;
};

const PhotoCaptureButton = ({
  onColoringImageCreated,
  disabled = false,
}: PhotoCaptureButtonProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openModal = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedImage(null);
    setIsProcessing(false);
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      // Request camera permissions
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
        await processImage(result.assets[0].base64!);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      // Request media library permissions
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
        await processImage(result.assets[0].base64!);
      }
    } catch (error) {
      console.error("Failed to pick image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  }, []);

  const processImage = useCallback(
    async (base64Image: string) => {
      setIsProcessing(true);
      try {
        // Call API to generate coloring page from photo
        const response = await generateFromPhoto(base64Image);

        if (response.coloringImage) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          onColoringImageCreated(response.coloringImage);
          closeModal();
        } else if (response.error) {
          Alert.alert("Generation Failed", response.error);
        } else {
          Alert.alert(
            "Generation Failed",
            "We couldn't create a coloring page from your photo. Please try again!",
          );
        }
      } catch (error) {
        console.error("Failed to generate coloring page:", error);
        Alert.alert(
          "Processing Error",
          "Something went wrong while creating your coloring page. Please try again!",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onColoringImageCreated, closeModal],
  );

  return (
    <>
      <TouchableOpacity
        onPress={openModal}
        disabled={disabled}
        accessibilityLabel="Take a photo to create a coloring page"
        accessibilityRole="button"
      >
        <View
          className={`w-14 h-14 rounded-full items-center justify-center ${disabled ? "opacity-50" : ""}`}
          style={[styles.cameraButton, perfect.boxShadow]}
        >
          <FontAwesomeIcon icon={faCamera} size={24} color="white" />
        </View>
      </TouchableOpacity>

      {/* Modal for image source selection */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text style={styles.modalTitle}>Photo to Coloring Page</Text>
              <TouchableOpacity onPress={closeModal}>
                <FontAwesomeIcon icon={faTimes} size={24} color="#9E9E9E" />
              </TouchableOpacity>
            </View>

            {/* Preview image if selected */}
            {selectedImage && (
              <View className="items-center mb-6">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-48 h-48 rounded-xl"
                  resizeMode="cover"
                />
                {isProcessing && (
                  <View className="absolute inset-0 items-center justify-center bg-black/30 rounded-xl w-48 h-48">
                    <FontAwesomeIcon icon={faSpinner} size={32} color="white" />
                    <Text style={styles.processingText}>
                      Creating your coloring page...
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Instructions */}
            {!selectedImage && (
              <Text style={styles.instructionText}>
                Take a photo of anything - a toy, a flower, a pet - and
                we&apos;ll turn it into a coloring page!
              </Text>
            )}

            {/* Action buttons */}
            {!isProcessing && !selectedImage && (
              <View className="gap-y-3">
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-x-3 p-4 rounded-xl"
                  style={[styles.takePhotoButton, perfect.boxShadow]}
                  onPress={takePhoto}
                >
                  <FontAwesomeIcon icon={faCamera} size={20} color="white" />
                  <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center justify-center gap-x-3 p-4 rounded-xl"
                  style={[styles.galleryButton, perfect.boxShadow]}
                  onPress={pickImage}
                >
                  <FontAwesomeIcon icon={faImages} size={20} color="white" />
                  <Text style={styles.buttonText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  cameraButton: {
    backgroundColor: "#9575CD",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "TondoTrial-Bold",
    color: "#4B4B4B",
  },
  instructionText: {
    textAlign: "center",
    color: "#757575",
    marginBottom: 24,
    fontFamily: "TondoTrial-Regular",
  },
  processingText: {
    color: "#FFF",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
    fontFamily: "TondoTrial-Regular",
  },
  takePhotoButton: {
    backgroundColor: "#9575CD",
  },
  galleryButton: {
    backgroundColor: "#7986CB",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "TondoTrial-Bold",
  },
});

export default PhotoCaptureButton;
