import { useMemo, useRef, useState } from "react";
import {
  AGE_BANDS,
  DEFAULT_ACTIVITIES,
  filterActivities,
  type Activity,
  type AgeBand,
} from "./activities";

// Mobile-first input styling. text-base (16px) prevents iOS zoom on
// focus; min-h-[44px] keeps every control above the 44px touch target.
const FIELD_CLASS =
  "w-full min-h-[44px] px-3 py-2.5 text-base bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400";

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block";

// Wheel segment colors. Cyan-led palette, repeated around the wheel.
const SEGMENT_COLORS = [
  "#06b6d4",
  "#0e7490",
  "#22d3ee",
  "#0891b2",
  "#67e8f9",
  "#155e75",
];

const TAU = Math.PI * 2;

const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

export const BoredomWheel = () => {
  const [band, setBand] = useState<AgeBand>("all");
  const [noSuppliesOnly, setNoSuppliesOnly] = useState(false);
  const [custom, setCustom] = useState<Activity[]>([]);
  const [draft, setDraft] = useState("");
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [picked, setPicked] = useState<Activity | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(
    () =>
      filterActivities(
        [...DEFAULT_ACTIVITIES, ...custom],
        band,
        noSuppliesOnly,
      ),
    [band, noSuppliesOnly, custom],
  );

  const addCustom = () => {
    const label = draft.trim();
    if (!label) return;
    setCustom((prev) => [...prev, { label, minAge: 3, needsSupplies: false }]);
    setDraft("");
  };

  const removeCustom = (label: string) => {
    setCustom((prev) => prev.filter((a) => a.label !== label));
  };

  const spin = () => {
    if (isSpinning || active.length === 0) return;
    setIsSpinning(true);
    setPicked(null);

    const targetIndex = Math.floor(Math.random() * active.length);
    const slice = 360 / active.length;
    // Land the chosen slice's center under the top pointer. The pointer
    // sits at -90deg; segments are drawn starting from -90deg too.
    const sliceCenter = targetIndex * slice + slice / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const next =
      rotation - (rotation % 360) + fullSpins * 360 + (360 - sliceCenter);

    setRotation(next);

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => {
      setPicked(active[targetIndex] ?? null);
      setIsSpinning(false);
      // No custom "spin" analytics event: the shared SatelliteEvent
      // union has no fitting member and it is a strict typed union, so
      // we rely on the automatic pageview. The CC funnel conversion
      // still fires via cc-link-tracking when the result links out.
    }, 4200);
  };

  const size = 320;
  const center = size / 2;
  const radius = center - 6;
  const sliceAngle = active.length > 0 ? TAU / active.length : TAU;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL_CLASS}>Age</span>
          <select
            value={band}
            onChange={(event) => setBand(event.target.value as AgeBand)}
            className={FIELD_CLASS}
          >
            {AGE_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 sm:mt-6 min-h-[44px] px-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noSuppliesOnly}
            onChange={(event) => setNoSuppliesOnly(event.target.checked)}
            className="w-5 h-5 accent-cyan-500"
          />
          <span className="text-base text-slate-700">No supplies needed</span>
        </label>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="relative w-full max-w-[min(90vw,360px)]"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Top pointer */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-1 z-10"
            style={{
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "22px solid #0e7490",
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
            }}
            aria-hidden="true"
          />
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? "transform 4.2s cubic-bezier(0.16, 1, 0.3, 1)"
                : "none",
            }}
            role="img"
            aria-label="Spinning wheel of screen-free activities"
          >
            {active.length === 0 ? (
              <circle cx={center} cy={center} r={radius} fill="#e2e8f0" />
            ) : (
              active.map((activity, index) => {
                const start = -Math.PI / 2 + index * sliceAngle;
                const end = start + sliceAngle;
                const p1 = polar(center, center, radius, start);
                const p2 = polar(center, center, radius, end);
                const large = sliceAngle > Math.PI ? 1 : 0;
                const mid = start + sliceAngle / 2;
                const tp = polar(center, center, radius * 0.62, mid);
                const deg = (mid * 180) / Math.PI;
                const flip = deg > 90 || deg < -90;
                return (
                  <g key={`${activity.label}-${index}`}>
                    <path
                      d={
                        active.length === 1
                          ? `M ${center} ${center} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
                          : `M ${center} ${center} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${large} 1 ${p2.x} ${p2.y} Z`
                      }
                      fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x={tp.x}
                      y={tp.y}
                      fill="#fff"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${flip ? deg + 180 : deg} ${tp.x} ${tp.y})`}
                    >
                      {activity.label.length > 22
                        ? `${activity.label.slice(0, 21)}…`
                        : activity.label}
                    </text>
                  </g>
                );
              })
            )}
            <circle
              cx={center}
              cy={center}
              r="20"
              fill="#fff"
              stroke="#0e7490"
              strokeWidth="3"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={isSpinning || active.length === 0}
          className="mt-6 w-full max-w-xs bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg min-h-[52px] px-8 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
        >
          {isSpinning
            ? "Spinning..."
            : picked
              ? "Spin again"
              : "Spin the wheel"}
        </button>

        {active.length === 0 && (
          <p className="text-sm text-slate-500 text-center mt-3">
            No activities match those filters. Loosen them or add your own.
          </p>
        )}
      </div>

      {picked && !isSpinning && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-6 text-center">
          <p className="text-xs uppercase tracking-wide font-semibold text-cyan-700 mb-2">
            Your activity
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {picked.label}
          </p>
          {picked.href && (
            <a
              href={picked.href}
              className="inline-block mt-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-5 py-2.5 rounded-lg"
              data-cc-cta-location="wheel-result"
            >
              Get a free coloring page →
            </a>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-5">
        <span className={LABEL_CLASS}>Add your own activity</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            className={FIELD_CLASS}
            placeholder="e.g. Bake cookies together"
            maxLength={40}
          />
          <button
            type="button"
            onClick={addCustom}
            className="shrink-0 min-h-[44px] px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg"
          >
            Add
          </button>
        </div>
        {custom.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {custom.map((activity) => (
              <li
                key={activity.label}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 text-sm rounded-full pl-3 pr-2 py-1.5"
              >
                <span>{activity.label}</span>
                <button
                  type="button"
                  onClick={() => removeCustom(activity.label)}
                  className="text-slate-400 hover:text-slate-700 leading-none text-lg"
                  aria-label={`Remove ${activity.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Free forever. No signup. No email. {active.length} screen-free ideas
        ready to spin.
      </p>
    </div>
  );
};
