import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { queryClient } from "@/providers";
import { createColoringImage } from "@/api";
import {
  InputModeProvider,
  useInputMode,
  InputModeSelector,
  TextInputPanel,
  VoiceInputPanel,
  ImageInputPanel,
} from "./inputs";

type ColoringImage = {
  id: string;
  url: string;
  svgUrl: string;
  title: string;
};

const CreateColoringImageFormContent = () => {
  const { mode, description, isProcessing, reset } = useInputMode();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const { coloringImage } = await createColoringImage(description);

      // Reset the form
      reset();

      // Refetch queries
      await queryClient.refetchQueries();

      // Navigate to coloring image
      router.push(`/coloring-image/${coloringImage.id}`);
    } catch (error) {
      console.error("Failed to create coloring image:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [description, reset]);

  const handleColoringImageCreated = useCallback(
    async (coloringImage: ColoringImage) => {
      // Photo was transformed directly to coloring page
      reset();
      await queryClient.refetchQueries();
      router.push(`/coloring-image/${coloringImage.id}`);
    },
    [reset],
  );

  const busy = isSubmitting || isProcessing;

  return (
    <View style={styles.container}>
      {/* Mode selector tabs */}
      <InputModeSelector disabled={busy} />

      {/* Active input panel */}
      <View style={styles.panelContainer}>
        {mode === "text" && (
          <TextInputPanel onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
        {mode === "voice" && (
          <VoiceInputPanel
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
        {mode === "image" && (
          <ImageInputPanel
            onColoringImageCreated={handleColoringImageCreated}
            isSubmitting={isSubmitting}
          />
        )}
      </View>
    </View>
  );
};

const CreateColoringImageForm = () => (
  <InputModeProvider>
    <CreateColoringImageFormContent />
  </InputModeProvider>
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  panelContainer: {
    minHeight: 180,
  },
});

export default CreateColoringImageForm;
