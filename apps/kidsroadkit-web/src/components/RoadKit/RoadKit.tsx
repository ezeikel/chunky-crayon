import { useState } from "react";
import { trackEvent } from "@one-colored-pixel/satellite-shared/analytics";
import {
  AGE_BANDS,
  MAX_KIDS,
  MIN_KIDS,
  TRIP_LENGTHS,
  buildPack,
  type AgeBandKey,
  type RoadKitConfig,
  type TripLengthKey,
} from "./types";

// Shared mobile-first input styling. text-base (16px) prevents iOS zoom on
// focus; min-h-[44px] keeps every control above the 44px touch target.
const FIELD_CLASS =
  "w-full min-h-[44px] px-3 py-2.5 text-base bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block";

export const RoadKit = () => {
  const [config, setConfig] = useState<RoadKitConfig>({
    ageBand: "6-8",
    tripLength: "1-3h",
    kids: 2,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pack = buildPack(config.ageBand, config.tripLength);
  const ageLabel =
    AGE_BANDS.find((band) => band.key === config.ageBand)?.label ??
    config.ageBand;
  const tripLabel =
    TRIP_LENGTHS.find((trip) => trip.key === config.tripLength)?.label ??
    config.tripLength;

  const generatePdf = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-chart-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`PDF generation failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "road-trip-activity-pack.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackEvent("pdf_download", {
        ageBand: config.ageBand,
        tripLength: config.tripLength,
        kids: config.kids,
        pages: pack.length,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <span className={LABEL_CLASS}>Kid age</span>
        <div className="grid grid-cols-3 gap-2">
          {AGE_BANDS.map((band) => {
            const selected = band.key === config.ageBand;
            return (
              <button
                key={band.key}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    ageBand: band.key as AgeBandKey,
                  }))
                }
                className={`min-h-[44px] flex items-center justify-center px-2 py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors ${
                  selected
                    ? "border-brand bg-brand-tint text-brand-dark"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-tint-border"
                }`}
                aria-pressed={selected}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL_CLASS}>Trip length</span>
          <select
            value={config.tripLength}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                tripLength: event.target.value as TripLengthKey,
              }))
            }
            className={FIELD_CLASS}
          >
            {TRIP_LENGTHS.map((trip) => (
              <option key={trip.key} value={trip.key}>
                {trip.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>How many kids?</span>
          <select
            value={config.kids}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                kids: Number(event.target.value),
              }))
            }
            className={FIELD_CLASS}
          >
            {Array.from(
              { length: MAX_KIDS - MIN_KIDS + 1 },
              (_, index) => index + MIN_KIDS,
            ).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "kid" : "kids"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className={LABEL_CLASS}>Preview</span>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="text-center">
            <p className="text-base sm:text-lg font-bold text-slate-900">
              {tripLabel} activity pack
            </p>
            <p className="text-sm text-slate-500">
              Ages {ageLabel}, {pack.length}{" "}
              {pack.length === 1 ? "page" : "pages"} for {config.kids}{" "}
              {config.kids === 1 ? "kid" : "kids"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              In this pack
            </p>
            <ul className="space-y-2">
              {pack.map((game, index) => (
                <li
                  key={game.key}
                  className="flex items-start gap-2.5 text-sm text-slate-700"
                >
                  <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full bg-brand-tint text-brand-dark text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-slate-900">
                      {game.title}
                    </span>
                    <span className="block text-slate-500">{game.blurb}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-sm text-slate-600">
            Longer trips add more pages. The coloring and doodle page is always
            included.
          </p>
        </div>
      </div>

      <div className="pt-2">
        {error && (
          <p className="text-red-600 text-sm mb-3" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={generatePdf}
          disabled={isGenerating}
          className="w-full bg-brand hover:bg-brand-strong disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
        >
          {isGenerating ? "Generating PDF..." : "Download printable pack"}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Free forever. No signup. No email. Includes a coloring and doodle
          page.
        </p>
      </div>
    </div>
  );
};
