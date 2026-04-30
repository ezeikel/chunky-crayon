"use client";
/**
 * Canvas-as-loader streaming view (Coloring Habitat).
 *
 * Mirrors the CC version structurally but lighter: no Colo mascot, no
 * voiceover (CH is adult-themed, no kid mascot). Renders the partial
 * image as it lands behind a centered "Creating your coloring page…"
 * panel, swaps to the cached canvas on READY via `router.refresh()`.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateRight,
  faFaceDizzy,
  faSpinnerThird,
} from "@fortawesome/pro-duotone-svg-icons";

type StreamingStatus = "GENERATING" | "READY" | "FAILED";

type StreamingCanvasViewProps = {
  coloringImageId: string;
  initialStatus: StreamingStatus;
  initialPartialUrl: string | null;
  initialProgress: number;
  initialFailureReason: string | null;
  fallbackTitle: string;
};

type StateEvent = {
  type: "state";
  status: StreamingStatus;
  streamingPartialUrl: string | null;
  streamingProgress: number;
  url: string | null;
  svgUrl: string | null;
  failureReason: string | null;
};

const StreamingCanvasView = ({
  coloringImageId,
  initialStatus,
  initialPartialUrl,
  initialProgress,
  initialFailureReason,
  fallbackTitle,
}: StreamingCanvasViewProps) => {
  const router = useRouter();
  const [status, setStatus] = useState<StreamingStatus>(initialStatus);
  const [partialUrl, setPartialUrl] = useState<string | null>(
    initialPartialUrl,
  );
  const [, setProgress] = useState<number>(initialProgress);
  const [failureReason, setFailureReason] = useState<string | null>(
    initialFailureReason,
  );

  useEffect(() => {
    if (initialStatus === "READY" || initialStatus === "FAILED") return;

    const url = `/api/coloring-image/${encodeURIComponent(coloringImageId)}/events`;
    const es = new EventSource(url);

    es.addEventListener("state", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as StateEvent;
        setStatus(data.status);
        setPartialUrl(data.streamingPartialUrl);
        setProgress(data.streamingProgress);
        if (data.failureReason) setFailureReason(data.failureReason);

        if (data.status === "READY") {
          es.close();
          router.refresh();
        } else if (data.status === "FAILED") {
          es.close();
        }
      } catch (err) {
        console.error("[StreamingCanvasView] failed to parse event:", err);
      }
    });

    es.addEventListener("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("[StreamingCanvasView] SSE error", e);
    });

    return () => {
      es.close();
    };
  }, [coloringImageId, initialStatus, router]);

  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <FontAwesomeIcon icon={faFaceDizzy} className="text-6xl text-primary" />
        <h2 className="font-tondo font-bold text-2xl text-foreground text-center">
          Something went wrong while creating your page.
        </h2>
        {failureReason && (
          <p className="font-tondo text-sm text-muted-foreground text-center max-w-md italic">
            {failureReason}
          </p>
        )}
        <p className="font-tondo text-base text-foreground text-center max-w-md">
          Your credits have been refunded. Want to try again?
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="font-tondo font-bold text-base md:text-lg text-white bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 rounded-full px-8 py-4"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 min-h-[60vh]">
      {partialUrl ? (
        // Partial image arrived — render it as the focal point with a soft
        // spinner overlay so the user knows it's still finishing.
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={partialUrl}
            alt={fallbackTitle}
            className="w-[min(80vw,640px)] h-auto rounded-2xl shadow-xl border-2 border-border"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-2xl">
            <FontAwesomeIcon
              icon={faSpinnerThird}
              className="text-6xl animate-spin text-primary"
            />
          </div>
        </div>
      ) : (
        // No partial yet — clean spinner panel.
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon
            icon={faSpinnerThird}
            className="text-6xl animate-spin text-primary"
          />
          <p className="font-tondo text-lg text-foreground">
            Creating your coloring page…
          </p>
          <p className="font-tondo text-sm text-muted-foreground">
            This usually takes about a minute.
          </p>
        </div>
      )}
    </div>
  );
};

export default StreamingCanvasView;
