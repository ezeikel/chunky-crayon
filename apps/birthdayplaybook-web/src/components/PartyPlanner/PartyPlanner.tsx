import { useState } from "react";
import { trackEvent } from "@one-colored-pixel/satellite-shared/analytics";
import {
  PARTY_LENGTHS,
  PARTY_THEMES,
  buildInviteWording,
  getTheme,
  type PartyLength,
  type PartyPlanConfig,
} from "./types";

// Shared mobile-first input styling. text-base (16px) prevents iOS zoom on
// focus; min-h-[44px] keeps every control above the 44px touch target.
const FIELD_CLASS =
  "w-full min-h-[44px] px-3 py-2.5 text-base bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block";

export const PartyPlanner = () => {
  const [config, setConfig] = useState<PartyPlanConfig>({
    childName: "",
    age: 5,
    themeKey: "dinosaurs",
    partyLength: "2h",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = getTheme(config.themeKey);
  const checklist = [...theme.decor, ...theme.food, ...theme.activities];
  const invite = buildInviteWording(config.childName, config.age, theme.label);

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
        ? `${config.childName.toLowerCase().replace(/\s+/g, "-")}-party-plan.pdf`
        : "party-plan.pdf";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackEvent("pdf_download", {
        theme: config.themeKey,
        partyLength: config.partyLength,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const partyTitle = config.childName
    ? `${config.childName}'s ${theme.label} party`
    : `${theme.label} party`;

  return (
    <div className="space-y-5">
      <div>
        <span className={LABEL_CLASS}>Pick a theme</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PARTY_THEMES.map((option) => {
            const selected = option.key === config.themeKey;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, themeKey: option.key }))
                }
                className={`min-h-[44px] flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors ${
                  selected
                    ? "border-brand bg-brand-tint text-brand-strong"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-tint-border"
                }`}
                aria-pressed={selected}
              >
                <span aria-hidden="true">{option.emoji}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
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
          <span className={LABEL_CLASS}>Age turning</span>
          <select
            value={config.age}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                age: Number(event.target.value),
              }))
            }
            className={FIELD_CLASS}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Party length</span>
          <select
            value={config.partyLength}
            onChange={(event) =>
              setConfig((prev) => ({
                ...prev,
                partyLength: event.target.value as PartyLength,
              }))
            }
            className={FIELD_CLASS}
          >
            {PARTY_LENGTHS.map((length) => (
              <option key={length} value={length}>
                {length}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className={LABEL_CLASS}>Preview</span>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5">
          <div className="text-center">
            <p className="text-base sm:text-lg font-bold text-slate-900">
              {partyTitle}
            </p>
            <p className="text-sm text-slate-500">
              Turning {config.age}, {config.partyLength} party
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Party checklist
            </p>
            <ul className="space-y-1.5">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span
                    className="mt-0.5 inline-block w-3.5 h-3.5 rounded border-2 border-slate-300 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Invite wording
            </p>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">
              {invite}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Activity stations
            </p>
            <ol className="space-y-1.5">
              {theme.stations.map((station, index) => (
                <li
                  key={station}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span className="font-semibold text-brand shrink-0">
                    {index + 1}.
                  </span>
                  <span>{station}</span>
                </li>
              ))}
            </ol>
          </div>
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
          {isGenerating ? "Generating PDF..." : "Download printable party plan"}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Free forever. No signup. No email. Includes a coloring activity for
          the party.
        </p>
      </div>
    </div>
  );
};
