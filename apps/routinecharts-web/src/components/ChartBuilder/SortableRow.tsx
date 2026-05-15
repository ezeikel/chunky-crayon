import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconPicker } from "./IconPicker";
import type { ChartRow } from "./types";

type Props = {
  row: ChartRow;
  onChange: (id: string, patch: Partial<ChartRow>) => void;
  onRemove: (id: string) => void;
};

// "7:00am" (stored) <-> "07:00" (native input value, 24h HH:mm).
const to24h = (s: string): string => {
  const m = s
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3] === "pm") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};

const to12h = (v: string): string => {
  if (!v) return "";
  const [hRaw, min] = v.split(":");
  const h = Number(hRaw);
  const ap = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return `${h12}:${min}${ap}`;
};

export const SortableRow = ({ row, onChange, onRemove }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-stretch bg-white border border-slate-200 rounded-2xl overflow-hidden touch-manipulation"
    >
      {/* Content: stacks on mobile, inline on sm+ */}
      <div className="flex-1 min-w-0 p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <IconPicker
            value={row.icon}
            onChange={(icon) => onChange(row.id, { icon })}
          />
          <input
            type="text"
            value={row.label}
            onChange={(event) =>
              onChange(row.id, { label: event.target.value })
            }
            className="flex-1 min-w-0 px-3 py-2.5 text-base bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded-lg font-medium"
            placeholder="What's the activity?"
          />
        </div>
        <input
          type="time"
          value={to24h(row.time)}
          onChange={(event) =>
            onChange(row.id, { time: to12h(event.target.value) })
          }
          step={300}
          aria-label="Time"
          className="w-full sm:w-32 min-h-[44px] px-3 py-2.5 text-base text-slate-700 bg-slate-50 border-0 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded-lg"
        />
      </div>

      {/* Remove — always visible (no hover on touch), full-height tap zone */}
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="flex items-center justify-center w-11 shrink-0 text-slate-300 hover:text-red-500 active:bg-red-50 border-l border-slate-100"
        aria-label="Remove row"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>

      {/* Drag handle — large right-side hit area (Mobbin pattern: Yazio/TIDE) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-12 shrink-0 cursor-grab active:cursor-grabbing touch-none text-slate-400 hover:text-slate-600 bg-slate-50 active:bg-slate-100 border-l border-slate-100"
        aria-label="Drag to reorder"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="3" r="1.6" />
          <circle cx="5" cy="8" r="1.6" />
          <circle cx="5" cy="13" r="1.6" />
          <circle cx="11" cy="3" r="1.6" />
          <circle cx="11" cy="8" r="1.6" />
          <circle cx="11" cy="13" r="1.6" />
        </svg>
      </button>
    </div>
  );
};
