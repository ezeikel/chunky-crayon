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
import {
  useCredits,
  useShouldShowPaywall,
  useRefreshEntitlements,
} from "@/hooks/useEntitlements";
import Paywall from "@/components/Paywall";
import CreditPackModal from "@/components/CreditPackModal";

type ColoringImage = {
  id: string;
  url: string;
  svgUrl: string;
  title: string;
};

const CREDITS_PER_GENERATION = 5;

const CreateColoringImageFormContent = () => {
  const { mode, description, isProcessing, reset } = useInputMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCreditPacks, setShowCreditPacks] = useState(false);

  // Entitlements
  const credits = useCredits();
  const { shouldShow, reason } = useShouldShowPaywall();
  const refreshEntitlements = useRefreshEntitlements();

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;

    // Check if user has enough credits (using CREDITS_PER_GENERATION threshold)
    if (credits < CREDITS_PER_GENERATION) {
      if (reason === "no_credits") {
        // Subscriber out of credits - show credit pack purchase modal
        setShowCreditPacks(true);
      } else {
        // No subscription - show paywall to subscribe
        setShowPaywall(true);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { coloringImage } = await createColoringImage(description);

      // Refresh entitlements to update credit count
      refreshEntitlements();

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
  }, [description, reset, credits, reason, refreshEntitlements]);

  const handleColoringImageCreated = useCallback(
    async (coloringImage: ColoringImage) => {
      // Photo was transformed directly to coloring page
      // Refresh entitlements to update credit count
      refreshEntitlements();
      reset();
      await queryClient.refetchQueries();
      router.push(`/coloring-image/${coloringImage.id}`);
    },
    [reset, refreshEntitlements],
  );

  const handlePaywallClose = useCallback(() => {
    setShowPaywall(false);
  }, []);

  const handlePaywallSuccess = useCallback(() => {
    setShowPaywall(false);
    // Refresh entitlements after successful purchase
    refreshEntitlements();
  }, [refreshEntitlements]);

  const handleCreditPacksClose = useCallback(() => {
    setShowCreditPacks(false);
  }, []);

  const handleCreditPacksSuccess = useCallback(() => {
    setShowCreditPacks(false);
    // Refresh entitlements after successful credit purchase
    refreshEntitlements();
  }, [refreshEntitlements]);

  // Callback for child components to show paywall/credit packs
  const handleShowPaywall = useCallback(() => {
    if (reason === "no_credits") {
      // Subscriber out of credits - show credit pack purchase modal
      setShowCreditPacks(true);
    } else {
      // No subscription - show paywall to subscribe
      setShowPaywall(true);
    }
  }, [reason]);

  const busy = isSubmitting || isProcessing;

  return (
    <>
      <View style={styles.container}>
        {/* Mode selector tabs */}
        <InputModeSelector disabled={busy} />

        {/* Active input panel */}
        <View style={styles.panelContainer}>
          {mode === "text" && (
            <TextInputPanel
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {mode === "voice" && (
            <VoiceInputPanel
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              credits={credits}
              onShowPaywall={handleShowPaywall}
            />
          )}
          {mode === "image" && (
            <ImageInputPanel
              onColoringImageCreated={handleColoringImageCreated}
              isSubmitting={isSubmitting}
              credits={credits}
              onShowPaywall={handleShowPaywall}
            />
          )}
        </View>
      </View>

      {/* Paywall modal */}
      <Paywall
        visible={showPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
      />

      {/* Credit pack modal (for subscribers out of credits) */}
      <CreditPackModal
        visible={showCreditPacks}
        onClose={handleCreditPacksClose}
        onSuccess={handleCreditPacksSuccess}
      />
    </>
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
