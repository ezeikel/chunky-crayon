"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { createColoringImage } from "@/app/actions/coloring-image";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import { trackLead } from "@/utils/pixels";
import useUser from "@/hooks/useUser";
import { signalGalleryRefresh } from "@/utils/galleryRefresh";
import Loading from "@/components/Loading";
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

const FormLoadingOverlay = () => {
  const { pending } = useFormStatus();
  const t = useTranslations("createForm.loading");

  if (!pending) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm">
      <Loading size="lg" text={t("creating")} />
      <p className="text-sm text-muted-foreground animate-pulse">
        {t("readyIn")}
      </p>
    </div>
  );
};

const MultiModeForm = ({ className }: { className?: string }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { mode, description } = useInputMode();
  const { isGuest, remainingGenerations, recordGuestGeneration } = useUser();

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

        const coloringImage = await createColoringImage(formData);

        if ("error" in coloringImage) {
          console.error(coloringImage.error);
          return;
        }

        if (isGuest) {
          trackEvent(TRACKING_EVENTS.GUEST_GENERATION_USED, {
            generationsRemaining: remainingGenerations - 1,
            inputType: inputType || "text",
          });

          if (remainingGenerations - 1 === 0) {
            trackEvent(TRACKING_EVENTS.GUEST_LIMIT_REACHED, {
              lastInputType: inputType || "text",
            });
          }

          recordGuestGeneration();
        }

        trackLead({
          contentName: desc || "Coloring Page",
          contentCategory: "coloring_page_creation",
        });

        signalGalleryRefresh("image-created");

        if (coloringImage.id) {
          router.push(`/coloring-image/${coloringImage.id}`);
        }
      }}
      ref={formRef}
      className={cn("flex flex-col gap-y-4", className)}
    >
      <FormLoadingOverlay />

      <input type="hidden" name="inputType" value={mode} />
      <input type="hidden" name="description" value={description} />

      <InputModeSelector />

      <div className="p-5">
        {mode === "text" && <TextInput />}
        {mode === "voice" && <VoiceInput />}
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
