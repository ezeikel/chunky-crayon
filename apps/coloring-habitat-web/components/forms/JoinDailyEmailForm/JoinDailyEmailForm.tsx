"use client";

import { useEffect, useRef, useActionState, useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faEnvelopeOpenText,
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { joinColoringPageEmailList } from "@/app/actions/email";
import { trackEvent } from "@/utils/analytics-client";
import { TRACKING_EVENTS } from "@/constants";
import cn from "@/utils/cn";

type JoinDailyEmailFormProps = {
  className?: string;
  variant?: "card" | "inline";
  location?: "hero" | "footer" | "modal" | "other";
};

const JoinDailyEmailForm = ({
  className,
  variant = "card",
  location = "hero",
}: JoinDailyEmailFormProps) => {
  const t = useTranslations("email");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [state, joinEmailListAction, isPending] = useActionState(
    joinColoringPageEmailList,
    {
      success: false,
    },
  );

  useEffect(() => {
    if (state.success) {
      toast(t("signup.success"), {
        description: t("signup.successDescription"),
      });

      if (state.email) {
        posthog.identify(state.email, {
          email: state.email,
          email_subscriber: true,
          email_signup_location: location,
          email_signup_date: new Date().toISOString(),
        });
      }

      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_COMPLETED, { location });

      if (emailInputRef.current) {
        emailInputRef.current.value = "";
      }

      setHasTrackedStart(false);
    } else if (state.error) {
      toast.error(t("signup.error"), {
        description: t("signup.errorDescription"),
      });

      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_FAILED, {
        location,
        errorMessage:
          typeof state.error === "string"
            ? state.error
            : "Unknown error occurred",
      });

      console.error({ error: state.error });
    }
  }, [state.success, state.error, state.email, location, t]);

  const handleInputFocus = () => {
    if (!hasTrackedStart) {
      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_STARTED, { location });
      setHasTrackedStart(true);
    }
  };

  if (variant === "inline") {
    return (
      <form
        action={joinEmailListAction}
        className={cn(
          "flex w-full max-w-md flex-col gap-3 sm:flex-row",
          className,
        )}
      >
        <Input
          type="email"
          name="email"
          ref={emailInputRef}
          onFocus={handleInputFocus}
          placeholder={t("signup.placeholder")}
          required
          aria-label="Email address"
          className="flex-1 rounded-full border-border bg-background py-3 pl-5 pr-4 text-sm focus-visible:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-70"
        >
          {isPending ? "..." : t("signup.join")}
          {!isPending && <FontAwesomeIcon icon={faArrowRight} size="sm" />}
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={faEnvelopeOpenText}
          className="text-lg text-primary"
        />
        <h3 className="text-base font-bold text-foreground">
          {t("signup.title")}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t.rich("signup.subtitle", {
          free: (chunks) => (
            <span className="font-semibold text-primary">{chunks}</span>
          ),
        })}
      </p>

      <form
        action={joinEmailListAction}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Input
          type="email"
          name="email"
          ref={emailInputRef}
          onFocus={handleInputFocus}
          placeholder={t("signup.placeholder")}
          required
          aria-label="Email address"
          className="flex-1 rounded-full border-border bg-background py-3 pl-5 pr-4 text-sm focus-visible:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-70"
        >
          {isPending ? "..." : t("signup.join")}
          {!isPending && <FontAwesomeIcon icon={faArrowRight} size="sm" />}
        </button>
      </form>
    </div>
  );
};

export default JoinDailyEmailForm;
