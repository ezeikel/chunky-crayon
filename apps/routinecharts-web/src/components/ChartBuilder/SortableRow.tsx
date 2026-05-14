import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconPicker } from "./IconPicker";
import type { ChartRow } from "./types";

type Props = {
  row: ChartRow;
  onChange: (id: string, patch: Partial<ChartRow>) => void;
  onRemove: (id: string) => void;
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
      className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 py-2 -ml-1"
        aria-label="Drag to reorder"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      <IconPicker
        value={row.icon}
        onChange={(icon) => onChange(row.id, { icon })}
      />

      <input
        type="text"
        value={row.label}
        onChange={(event) => onChange(row.id, { label: event.target.value })}
        className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded-lg font-medium"
        placeholder="What's the activity?"
      />

      <input
        type="text"
        value={row.time}
        onChange={(event) => onChange(row.id, { time: event.target.value })}
        className="w-24 px-3 py-2 text-sm text-slate-600 bg-slate-50 border-0 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded-lg text-center"
        placeholder="Time"
      />

      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="text-slate-300 hover:text-red-500 px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove row"
      >
        <svg
          width="16"
          height="16"
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
    </div>
  );
};
