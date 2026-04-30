"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createPendingColoringImage } from "@/app/actions/createPendingColoringImage";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import { trackLead } from "@/utils/pixels";
import useUser from "@/hooks/useUser";
import { signalGalleryRefresh } from "@/utils/galleryRefresh";
import {
  InputModeProvider,
  InputModeSelector,
  TextInput,
  VoiceInput,
  ImageInput,
  useInputMode,
  type InputMode,
} from "./inputs";

type CreateColoringPageFormProps = {
  className?: string;
};

const MultiModeForm = ({ className }: { className?: string }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const { mode, description, imageBase64 } = useInputMode();
  const { isGuest, remainingGenerations, recordGuestGeneration } = useUser();

  /**
   * Common post-success bookkeeping. Loading UX is now owned by the
   * destination page (StreamingCanvasView), so this just tracks +
   * navigates.
   */
  const onCreated = (
    id: string,
    desc: string,
    inputType: "text" | "voice" | "image",
  ) => {
    trackLead({
      contentName: desc || "Coloring Page",
      contentCategory: "coloring_page_creation",
    });
    signalGalleryRefresh("image-created");

    if (isGuest) {
      trackEvent(TRACKING_EVENTS.GUEST_GENERATION_USED, {
        generationsRemaining: remainingGenerations - 1,
        inputType,
      });
      if (remainingGenerations - 1 === 0) {
        trackEvent(TRACKING_EVENTS.GUEST_LIMIT_REACHED, {
          lastInputType: inputType,
        });
      }
      recordGuestGeneration();
    }

    router.push(`/coloring-image/${id}`);
  };

  return (
    <form
      action={async (formData) => {
        const inputType = formData.get("inputType") as InputMode;
        const desc = formData.get("description") as string;

        trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
          description: desc,
          inputType: inputType || "text",
          characterCount: desc?.length || 0,
        });

        if (inputType === "voice") return;
        if (inputType !== "image" && (!desc || desc.trim().length === 0))
          return;

        const result =
          inputType === "image" && imageBase64
            ? await createPendingColoringImage({
                mode: "photo",
                photoBase64: imageBase64,
                locale,
              })
            : await createPendingColoringImage({
                mode: "text",
                description: desc,
                locale,
              });

        if (!result.ok) {
          console.error("[CreateColoringPageForm] create failed:", result);
          return;
        }

        onCreated(result.id, desc, inputType === "image" ? "image" : "text");
      }}
      ref={formRef}
      className={cn("flex flex-col gap-y-4", className)}
    >
      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />

      <InputModeSelector />

      <div className="p-5">
        {mode === "text" && <TextInput />}
        {mode === "voice" && (
          <VoiceInput
            onComplete={async (firstAnswer, secondAnswer) => {
              const desc = `${firstAnswer} ${secondAnswer}`.trim();

              trackEvent(TRACKING_EVENTS.CREATION_SUBMITTED, {
                description: desc,
                inputType: "voice",
                characterCount: desc.length,
              });

              const result = await createPendingColoringImage({
                mode: "voice",
                firstAnswer,
                secondAnswer,
                locale,
              });

              if (!result.ok) {
                console.error(
                  "[CreateColoringPageForm] voice create failed:",
                  result,
                );
                return;
              }

              onCreated(result.id, desc, "voice");
            }}
          />
        )}
        {mode === "image" && <ImageInput />}
      </div>
    </form>
  );
};

const CreateColoringPageForm = ({ className }: CreateColoringPageFormProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-background shadow-lg",
        className,
      )}
    >
      <InputModeProvider>
        <MultiModeForm />
      </InputModeProvider>
    </div>
  );
};

export default CreateColoringPageForm;
