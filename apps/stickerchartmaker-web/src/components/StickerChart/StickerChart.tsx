import { useState } from "react";
import { trackEvent } from "@one-colored-pixel/satellite-shared/analytics";
import { SLOT_OPTIONS, type SlotCount, type StickerChartConfig } from "./types";

// Shared mobile-first input styling. text-base (16px) prevents iOS zoom on
// focus; min-h-[44px] keeps every control above the 44px touch target.
const FIELD_CLASS =
  "w-full min-h-[44px] px-3 py-2.5 text-base bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block";

export const StickerChart = () => {
  const [config, setConfig] = useState<StickerChartConfig>({
    childName: "",
    goal: "Stay in bed all night",
    slots: 10,
    reward: "Trip to the park",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const fileName = config.childName
        ? `${config.childName.toLowerCase().replace(/\s+/g, "-")}-sticker-chart.pdf`
        : "sticker-chart.pdf";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackEvent("pdf_download", { slots: config.slots });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL_CLASS}>Child's name</span>
          <input
            type="text"
            value={config.childName}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, childName: event.target.value }))
            }
            className={FIELD_CLASS}
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>How many stickers?</span>
          <select
            value={config.slots}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                slots: Number(event.target.value) as SlotCount,
              }))
            }
            className={FIELD_CLASS}
          >
            {SLOT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} stickers
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>The goal</span>
        <input
          type="text"
          value={config.goal}
          onChange={(event) =>
            setConfig((prev) => ({ ...prev, goal: event.target.value }))
          }
          className={FIELD_CLASS}
          placeholder="e.g. Stay in bed all night"
        />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>The reward</span>
        <input
          type="text"
          value={config.reward}
          onChange={(event) =>
            setConfig((prev) => ({ ...prev, reward: event.target.value }))
          }
          className={FIELD_CLASS}
          placeholder="e.g. Trip to the park"
        />
      </label>

      <div>
        <span className={LABEL_CLASS}>Preview</span>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <p className="text-center text-base sm:text-lg font-bold text-slate-900 mb-1">
            {config.goal || "Your goal goes here"}
          </p>
          {config.childName && (
            <p className="text-center text-sm text-slate-500 mb-4">
              {config.childName}'s chart
            </p>
          )}
          <div
            className="grid gap-2 sm:gap-2.5 mt-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
            }}
          >
            {Array.from({ length: config.slots }, (_, index) => (
              <div
                key={index}
                className="aspect-square flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-300 text-sm font-semibold"
              >
                {index + 1}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 mt-4">
            When the chart is full:{" "}
            <span className="font-semibold text-slate-900">
              {config.reward || "your reward"}
            </span>
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
          className="w-full bg-brand-tint0 hover:bg-brand-strong disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
        >
          {isGenerating ? "Generating PDF..." : "Download printable chart"}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Free forever. No signup. No email. Includes a coloring page reward.
        </p>
      </div>
    </div>
  );
};
