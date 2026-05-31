import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { queryClient } from "@/providers";
import { createColoringImage, createColoringImageFromVoice } from "@/api";
import {
  InputModeProvider,
  useInputMode,
  InputModeSelector,
  SceneInput,
  TextInputPanel,
  VoiceInputPanel,
  ImageInputPanel,
} from "./inputs";
import { useCredits, useRefreshEntitlements } from "@/hooks/useEntitlements";
import PaywallRouter from "@/components/PaywallRouter";

type ColoringImage = {
  id: string;
  url: string;
  svgUrl: string;
  title: string;
};

// Text / image / scene generations cost 5 credits; voice costs 10 (TTS
// dominates the unit cost — mirrors web's VOICE_CREDIT_COST). The voice path
// gates + charges 10 separately via handleVoiceSubmit + /voice/create.
const CREDITS_PER_GENERATION = 5;
const VOICE_CREDIT_COST = 10;

const CreateColoringImageFormContent = () => {
  const { mode, description, isProcessing, reset } = useInputMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Single flag — PaywallRouter picks the right surface (top-up for
  // subscribers out of credits, subscription plans for non-subscribers)
  // from the entitlement state itself, so the call site no longer
  // branches on `reason` to choose a modal.
  const [showPaywall, setShowPaywall] = useState(false);

  // Entitlements. `credits` drives the threshold check below (whether to
  // open the paywall at all); the routing decision lives in PaywallRouter.
  const credits = useCredits();
  const refreshEntitlements = useRefreshEntitlements();

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;

    // Not enough credits — open the paywall. PaywallRouter decides
    // whether that's the subscription plans (non-subscriber) or a
    // credit top-up (subscriber out of credits).
    if (credits < CREDITS_PER_GENERATION) {
      setShowPaywall(true);
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
  }, [description, reset, credits, refreshEntitlements]);

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

  // Voice submit goes through the VOICE-specific create path — charges
  // VOICE_CREDIT_COST (10), anon-blocked + tagged purposeKey:'voice'
  // server-side — NOT the flat-5 text path. The panel has already gated on
  // 10 credits before calling this.
  const handleVoiceSubmit = useCallback(
    async (firstAnswer: string, secondAnswer: string) => {
      setIsSubmitting(true);
      try {
        const { coloringImage } = await createColoringImageFromVoice(
          firstAnswer,
          secondAnswer,
        );
        refreshEntitlements();
        reset();
        await queryClient.refetchQueries();
        router.push(`/coloring-image/${coloringImage.id}`);
      } catch (error) {
        console.error("Failed to create voice coloring image:", error);
      } finally {
        setIsSubmitting(false);
      }
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

  // Callback for child input panels to open the paywall. PaywallRouter
  // resolves which surface (subscription vs top-up) from entitlements.
  const handleShowPaywall = useCallback(() => {
    setShowPaywall(true);
  }, []);

  const busy = isSubmitting || isProcessing;

  return (
    <>
      <View style={styles.container}>
        {/* Mode selector tabs */}
        <InputModeSelector disabled={busy} />

        {/* Active input panel */}
        <View style={styles.panelContainer}>
          {mode === "scene" && (
            <SceneInput
              onCreate={handleSubmit}
              // Mirror web: when the kid can't generate (out of credits / no
              // sub), the Scene Create button stays inviting but opens the
              // paywall on tap — surfaced at Create, not after a built scene.
              createBlocked={credits < CREDITS_PER_GENERATION}
              onCreateBlockedTap={handleShowPaywall}
            />
          )}
          {mode === "text" && (
            <TextInputPanel
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          {mode === "voice" && (
            <VoiceInputPanel
              onVoiceSubmit={handleVoiceSubmit}
              isSubmitting={isSubmitting}
              credits={credits}
              voiceCreditCost={VOICE_CREDIT_COST}
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

      {/* PaywallRouter shows the right surface for the user's state:
          subscription plans for non-subscribers, a credit top-up for
          subscribers who've run out. */}
      <PaywallRouter
        visible={showPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
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
