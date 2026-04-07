"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faCopy,
  faCheck,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  faXTwitter,
  faFacebookF,
  faPinterest,
  faTiktok,
} from "@fortawesome/free-brands-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createShare } from "@/app/actions/share";
import type { ShareExpiration } from "@/lib/share";
import { cn } from "@/lib/utils";
import TikTokPostComposer from "@/components/TikTokPostComposer";

type ShareArtworkModalProps = {
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  isOpen: boolean;
  onClose: () => void;
};

type ModalState = "options" | "generating" | "success" | "tiktok";

const EXPIRATION_OPTIONS: {
  value: ShareExpiration;
  labelKey: "7days" | "30days" | "never";
}[] = [
  { value: "7days", labelKey: "7days" },
  { value: "30days", labelKey: "30days" },
  { value: "never", labelKey: "never" },
];

const ShareArtworkModal = ({
  artworkId,
  artworkTitle,
  artworkImageUrl,
  isOpen,
  onClose,
}: ShareArtworkModalProps) => {
  const [state, setState] = useState<ModalState>("options");
  const [selectedExpiration, setSelectedExpiration] =
    useState<ShareExpiration>("30days");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTikTok, setHasTikTok] = useState<boolean | null>(null);
  const t = useTranslations("shareModal");
  const tCommon = useTranslations("common");

  // Check if user has TikTok connected
  useEffect(() => {
    if (!isOpen) return;
    const checkTikTok = async () => {
      try {
        const { getUserTikTokAccount } = await import(
          "@/app/actions/user-social"
        );
        const account = await getUserTikTokAccount();
        setHasTikTok(!!account);
      } catch {
        setHasTikTok(false);
      }
    };
    checkTikTok();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setState("options");
    setShareUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleCreateShare = useCallback(async () => {
    setState("generating");
    setError(null);

    const result = await createShare(artworkId, selectedExpiration);

    if (result.success && result.shareUrl) {
      setShareUrl(result.shareUrl);
      setState("success");
    } else {
      setError(result.error || t("error"));
      setState("options");
    }
  }, [artworkId, selectedExpiration]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleTikTokClick = () => {
    if (hasTikTok) {
      setState("tiktok");
    } else {
      // Start OAuth — redirect to TikTok connect
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/auth/tiktok?return_url=${returnUrl}`;
    }
  };

  const handleTikTokDisconnect = async () => {
    const { disconnectUserTikTok } = await import("@/app/actions/user-social");
    await disconnectUserTikTok();
    setHasTikTok(false);
    setState("success");
  };

  const getSocialShareUrl = (
    platform: "twitter" | "facebook" | "pinterest",
  ) => {
    if (!shareUrl) return "#";
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(
      `Check out my coloring artwork: ${artworkTitle}`,
    );

    switch (platform) {
      case "twitter":
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
      case "facebook":
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      case "pinterest":
        return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {state === "options" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription className="truncate">
                {artworkTitle}
              </DialogDescription>
            </DialogHeader>

            {/* Privacy note */}
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {t("privacyNote")}
            </p>

            {/* Expiration options */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                {t("expiresIn")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {EXPIRATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedExpiration(option.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      selectedExpiration === option.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {t(`expiration.${option.labelKey}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {/* Create button */}
            <button
              type="button"
              onClick={handleCreateShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              <FontAwesomeIcon icon={faLink} className="text-sm" />
              {t("createLink")}
            </button>
          </>
        )}

        {state === "generating" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("creating")}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-3xl text-primary animate-spin"
              />
            </div>
          </>
        )}

        {state === "success" && shareUrl && (
          <>
            <DialogHeader>
              <DialogTitle>{t("success.title")}</DialogTitle>
              <DialogDescription>{t("success.subtitle")}</DialogDescription>
            </DialogHeader>

            {/* Link display */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-foreground truncate outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-sm transition-all",
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                {copied ? tCommon("copied") : tCommon("copy")}
              </button>
            </div>

            {/* Social share buttons */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                {t("socialShare")}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTikTokClick}
                  className="flex items-center justify-center size-10 rounded-full bg-black text-white hover:opacity-90 transition-opacity"
                  aria-label="Share to TikTok"
                  title={
                    hasTikTok ? "Share to TikTok" : "Connect TikTok to share"
                  }
                >
                  <FontAwesomeIcon icon={faTiktok} />
                </button>
                <a
                  href={getSocialShareUrl("twitter")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-10 rounded-full bg-[#1DA1F2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Share on X (Twitter)"
                >
                  <FontAwesomeIcon icon={faXTwitter} />
                </a>
                <a
                  href={getSocialShareUrl("facebook")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-10 rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Share on Facebook"
                >
                  <FontAwesomeIcon icon={faFacebookF} />
                </a>
                <a
                  href={getSocialShareUrl("pinterest")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center size-10 rounded-full bg-[#E60023] text-white hover:opacity-90 transition-opacity"
                  aria-label="Share on Pinterest"
                >
                  <FontAwesomeIcon icon={faPinterest} />
                </a>
              </div>
            </div>
          </>
        )}

        {state === "tiktok" && (
          <>
            <DialogHeader>
              <DialogTitle>Share to TikTok</DialogTitle>
              <DialogDescription>
                Post your artwork to your TikTok account
              </DialogDescription>
            </DialogHeader>
            <TikTokPostComposer
              artworkId={artworkId}
              artworkTitle={artworkTitle}
              artworkImageUrl={artworkImageUrl}
              hasVideo={false}
              onClose={handleClose}
              onDisconnect={handleTikTokDisconnect}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareArtworkModal;
